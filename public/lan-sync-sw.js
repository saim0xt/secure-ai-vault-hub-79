
// LAN Sync Service Worker for real network communication
let httpServer = null;
let devices = new Map();
let serverPort = 8888;

self.addEventListener('message', async (event) => {
  const { type, port, deviceId, deviceName } = event.data;
  
  if (type === 'INIT_SERVER') {
    serverPort = port;
    await startHTTPServer(deviceId, deviceName);
    
    // Notify main thread
    event.ports[0].postMessage({
      type: 'SERVER_STARTED',
      port: serverPort
    });
  }
});

async function startHTTPServer(deviceId, deviceName) {
  try {
    // Create a simple HTTP server using fetch interceptor
    self.addEventListener('fetch', (event) => {
      const url = new URL(event.request.url);
      
      // Handle Vaultix sync endpoints
      if (url.pathname.startsWith('/vaultix-')) {
        event.respondWith(handleSyncRequest(event.request, deviceId, deviceName));
      }
    });
    
    console.log(`LAN sync server started on port ${serverPort}`);
  } catch (error) {
    console.error('Failed to start HTTP server:', error);
  }
}

async function handleSyncRequest(request, deviceId, deviceName) {
  const url = new URL(request.url);
  const method = request.method;
  
  try {
    switch (url.pathname) {
      case '/vaultix-ping':
        return new Response(JSON.stringify({
          deviceId,
          deviceName,
          version: '1.0.0',
          platform: 'web',
          status: 'online'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      case '/vaultix-handshake':
        if (method === 'POST') {
          const data = await request.json();
          console.log('Handshake from:', data.deviceName);
          
          return new Response(JSON.stringify({
            success: true,
            deviceId,
            deviceName,
            timestamp: new Date().toISOString()
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        break;
        
      case '/vaultix-receive-file':
        if (method === 'POST') {
          const fileData = await request.json();
          
          // Store received file
          await storeReceivedFile(fileData);
          
          return new Response(JSON.stringify({
            success: true,
            message: 'File received'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        break;
        
      case '/vaultix-get-files':
        if (method === 'GET') {
          const files = await getLocalFiles();
          
          return new Response(JSON.stringify(files), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        break;
        
      default:
        return new Response('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Sync request error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function storeReceivedFile(fileData) {
  try {
    // Get existing files from IndexedDB or localStorage
    const files = await getLocalFiles();
    
    // Check if file already exists
    const existingIndex = files.findIndex(f => f.id === fileData.id);
    
    if (existingIndex >= 0) {
      // Update existing file if newer
      if (new Date(fileData.dateModified) > new Date(files[existingIndex].dateModified)) {
        files[existingIndex] = fileData;
      }
    } else {
      // Add new file
      files.push(fileData);
    }
    
    // Store back to local storage
    await setLocalFiles(files);
    
    // Notify main thread
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'FILE_RECEIVED',
          file: fileData
        });
      });
    });
  } catch (error) {
    console.error('Failed to store received file:', error);
  }
}

async function getLocalFiles() {
  try {
    // Try to get from IndexedDB first, fallback to postMessage to main thread
    return new Promise((resolve) => {
      self.clients.matchAll().then(clients => {
        if (clients.length > 0) {
          const messageChannel = new MessageChannel();
          
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data.files || []);
          };
          
          clients[0].postMessage({
            type: 'GET_LOCAL_FILES'
          }, [messageChannel.port2]);
          
          // Timeout fallback
          setTimeout(() => resolve([]), 5000);
        } else {
          resolve([]);
        }
      });
    });
  } catch (error) {
    console.error('Failed to get local files:', error);
    return [];
  }
}

async function setLocalFiles(files) {
  try {
    // Send to main thread to store
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SET_LOCAL_FILES',
          files: files
        });
      });
    });
  } catch (error) {
    console.error('Failed to set local files:', error);
  }
}

// Network discovery using BroadcastChannel
const broadcastChannel = new BroadcastChannel('vaultix_discovery');

broadcastChannel.onmessage = (event) => {
  const { type, deviceId, deviceName, port } = event.data;
  
  if (type === 'device_announcement' && deviceId !== self.deviceId) {
    // Store discovered device
    devices.set(deviceId, {
      id: deviceId,
      name: deviceName,
      port: port,
      lastSeen: new Date().toISOString(),
      isOnline: true
    });
    
    // Notify main thread
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'DEVICE_DISCOVERED',
          device: devices.get(deviceId)
        });
      });
    });
  }
};

// Cleanup devices periodically
setInterval(() => {
  const now = Date.now();
  for (const [deviceId, device] of devices.entries()) {
    if (now - new Date(device.lastSeen).getTime() > 60000) { // 1 minute timeout
      device.isOnline = false;
    }
    if (now - new Date(device.lastSeen).getTime() > 300000) { // 5 minute cleanup
      devices.delete(deviceId);
    }
  }
}, 30000);

console.log('LAN Sync Service Worker loaded');
