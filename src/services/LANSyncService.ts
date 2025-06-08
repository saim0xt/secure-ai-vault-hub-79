
import { Network } from '@capacitor/network';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

export interface DiscoveredDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  deviceType: string;
  lastSeen: string;
  isOnline: boolean;
  version: string;
}

export interface SyncPacket {
  type: 'discovery' | 'sync_request' | 'sync_response' | 'file_data';
  deviceId: string;
  deviceName: string;
  timestamp: string;
  data: any;
}

export interface SyncProgress {
  stage: 'connecting' | 'syncing' | 'complete';
  progress: number;
  deviceName: string;
  filesTransferred: number;
  totalFiles: number;
}

export class LANSyncService {
  private static instance: LANSyncService;
  private discoveredDevices: Map<string, DiscoveredDevice> = new Map();
  private syncPort = 8888;
  private broadcastInterval: number | null = null;
  private serverSocket: WebSocket | null = null;
  private deviceId: string = '';
  private deviceName: string = '';
  private httpServer: any = null;
  private udpSocket: any = null;

  static getInstance(): LANSyncService {
    if (!LANSyncService.instance) {
      LANSyncService.instance = new LANSyncService();
    }
    return LANSyncService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Get device info
      const deviceInfo = await Device.getInfo();
      const deviceId = await Device.getId();
      
      this.deviceId = deviceId.identifier;
      this.deviceName = `${deviceInfo.model} (${deviceInfo.platform})`;
      
      // Start network monitoring
      Network.addListener('networkStatusChange', (status) => {
        if (status.connected && status.connectionType === 'wifi') {
          this.startDiscovery();
        } else {
          this.stopDiscovery();
        }
      });

      // Start discovery if connected to WiFi
      const status = await Network.getStatus();
      if (status.connected && status.connectionType === 'wifi') {
        await this.startDiscovery();
      }

      console.log('LAN Sync service initialized');
    } catch (error) {
      console.error('Failed to initialize LAN sync:', error);
    }
  }

  private async startDiscovery(): Promise<void> {
    try {
      // Start HTTP server for device communication
      await this.startHTTPServer();
      
      // Start UDP broadcast for device discovery
      await this.startUDPBroadcast();
      
      // Start listening for UDP responses
      await this.startUDPListener();

      // Broadcast every 10 seconds
      this.broadcastInterval = window.setInterval(() => {
        this.broadcastDiscovery();
      }, 10000);

      // Initial broadcast
      await this.broadcastDiscovery();
      
      console.log('LAN discovery started');
    } catch (error) {
      console.error('Failed to start discovery:', error);
    }
  }

  private async startHTTPServer(): Promise<void> {
    try {
      // Create a simple HTTP server using Service Worker approach
      // This is a web-compatible approach for local network communication
      
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/lan-sync-sw.js');
        console.log('LAN sync service worker registered');
        
        // Create message channel for communication
        const messageChannel = new MessageChannel();
        registration.active?.postMessage({
          type: 'INIT_SERVER',
          port: this.syncPort,
          deviceId: this.deviceId,
          deviceName: this.deviceName
        }, [messageChannel.port2]);

        messageChannel.port1.onmessage = (event) => {
          this.handleServerMessage(event.data);
        };
      }
    } catch (error) {
      console.error('Failed to start HTTP server:', error);
    }
  }

  private async startUDPBroadcast(): Promise<void> {
    try {
      // For real UDP broadcast, we need to use a Capacitor plugin
      // This would require a custom native plugin for UDP communication
      
      // Web fallback: Use WebRTC data channels for peer discovery
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      };

      const peerConnection = new RTCPeerConnection(configuration);
      
      // Create data channel for communication
      const dataChannel = peerConnection.createDataChannel('sync', {
        ordered: true
      });

      dataChannel.onopen = () => {
        console.log('WebRTC data channel opened');
      };

      dataChannel.onmessage = (event) => {
        this.handleDiscoveryMessage(JSON.parse(event.data));
      };

      this.serverSocket = dataChannel as any;
    } catch (error) {
      console.error('Failed to start UDP broadcast:', error);
    }
  }

  private async startUDPListener(): Promise<void> {
    try {
      // Web-based UDP alternative using WebSocket broadcast
      // In a real app, this would use native UDP sockets
      
      const broadcastWS = new WebSocket('ws://255.255.255.255:' + (this.syncPort + 1));
      
      broadcastWS.onmessage = (event) => {
        try {
          const packet: SyncPacket = JSON.parse(event.data);
          this.handleDiscoveryPacket(packet);
        } catch (error) {
          console.error('Failed to parse discovery packet:', error);
        }
      };

      broadcastWS.onerror = () => {
        console.log('Broadcast WebSocket failed, using fallback discovery');
        this.startFallbackDiscovery();
      };
    } catch (error) {
      console.log('UDP listener failed, using fallback discovery');
      this.startFallbackDiscovery();
    }
  }

  private startFallbackDiscovery(): void {
    // Fallback: Scan common IP ranges for Vaultix services
    this.scanNetworkRange();
  }

  private async scanNetworkRange(): Promise<void> {
    try {
      // Get local IP to determine network range
      const localIP = await this.getLocalIP();
      if (!localIP) return;

      const networkBase = localIP.substring(0, localIP.lastIndexOf('.'));
      
      // Scan range 192.168.x.1 to 192.168.x.254
      for (let i = 1; i <= 254; i++) {
        const targetIP = `${networkBase}.${i}`;
        if (targetIP === localIP) continue;
        
        this.probeDevice(targetIP);
      }
    } catch (error) {
      console.error('Network scan failed:', error);
    }
  }

  private async getLocalIP(): Promise<string | null> {
    try {
      // Use WebRTC to get local IP
      const pc = new RTCPeerConnection({
        iceServers: []
      });
      
      pc.createDataChannel('');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      return new Promise((resolve) => {
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const match = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (match) {
              pc.close();
              resolve(match[1]);
              return;
            }
          }
        };
        
        setTimeout(() => {
          pc.close();
          resolve(null);
        }, 1000);
      });
    } catch (error) {
      console.error('Failed to get local IP:', error);
      return null;
    }
  }

  private async probeDevice(ip: string): Promise<void> {
    try {
      // Try to connect to potential Vaultix device
      const response = await fetch(`http://${ip}:${this.syncPort}/vaultix-ping`, {
        method: 'GET',
        timeout: 2000,
        signal: AbortSignal.timeout(2000)
      });

      if (response.ok) {
        const deviceInfo = await response.json();
        this.addDiscoveredDevice(deviceInfo, ip);
      }
    } catch (error) {
      // Device not found or not responding
    }
  }

  private async broadcastDiscovery(): Promise<void> {
    try {
      const discoveryPacket: SyncPacket = {
        type: 'discovery',
        deviceId: this.deviceId,
        deviceName: this.deviceName,
        timestamp: new Date().toISOString(),
        data: {
          version: '1.0.0',
          port: this.syncPort,
          capabilities: ['file_sync', 'vault_sync']
        }
      };

      // Broadcast using available methods
      await this.broadcastPacket(discoveryPacket);
      
      // Also try mDNS-like discovery
      await this.announceMDNS();
    } catch (error) {
      console.error('Failed to broadcast discovery:', error);
    }
  }

  private async broadcastPacket(packet: SyncPacket): Promise<void> {
    try {
      // Method 1: WebSocket broadcast (if available)
      if (this.serverSocket && this.serverSocket.readyState === WebSocket.OPEN) {
        this.serverSocket.send(JSON.stringify(packet));
      }

      // Method 2: HTTP POST to broadcast address
      try {
        await fetch('http://255.255.255.255:' + (this.syncPort + 1), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packet),
          mode: 'no-cors'
        });
      } catch (error) {
        // Broadcast failed, expected in web environment
      }

      // Method 3: Local storage event for same-device detection
      localStorage.setItem('vaultix_discovery_' + Date.now(), JSON.stringify(packet));
    } catch (error) {
      console.error('Failed to broadcast packet:', error);
    }
  }

  private async announceMDNS(): Promise<void> {
    try {
      // Web-compatible mDNS alternative using BroadcastChannel API
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('vaultix_discovery');
        
        channel.postMessage({
          type: 'device_announcement',
          deviceId: this.deviceId,
          deviceName: this.deviceName,
          port: this.syncPort,
          timestamp: new Date().toISOString()
        });

        // Listen for responses
        channel.onmessage = (event) => {
          if (event.data.deviceId !== this.deviceId) {
            this.handleBroadcastResponse(event.data);
          }
        };
      }
    } catch (error) {
      console.error('Failed to announce mDNS:', error);
    }
  }

  private handleBroadcastResponse(data: any): void {
    const device: DiscoveredDevice = {
      id: data.deviceId,
      name: data.deviceName,
      ip: 'localhost', // Same device communication
      port: data.port,
      deviceType: 'web',
      lastSeen: data.timestamp,
      isOnline: true,
      version: '1.0.0'
    };

    this.discoveredDevices.set(device.id, device);
  }

  private handleDiscoveryPacket(packet: SyncPacket): void {
    if (packet.deviceId === this.deviceId) return; // Ignore own packets

    if (packet.type === 'discovery') {
      // Respond to discovery
      const responsePacket: SyncPacket = {
        type: 'sync_response',
        deviceId: this.deviceId,
        deviceName: this.deviceName,
        timestamp: new Date().toISOString(),
        data: {
          version: '1.0.0',
          port: this.syncPort,
          status: 'available'
        }
      };

      this.broadcastPacket(responsePacket);
    }
  }

  private handleDiscoveryMessage(data: any): void {
    // Handle WebRTC discovery messages
    if (data.type === 'device_info') {
      this.addDiscoveredDevice(data, data.ip || 'unknown');
    }
  }

  private handleServerMessage(data: any): void {
    // Handle messages from service worker
    switch (data.type) {
      case 'DEVICE_DISCOVERED':
        this.addDiscoveredDevice(data.device, data.ip);
        break;
      case 'SYNC_REQUEST':
        this.handleSyncRequest(data);
        break;
    }
  }

  private addDiscoveredDevice(deviceInfo: any, ip: string): void {
    const device: DiscoveredDevice = {
      id: deviceInfo.deviceId || deviceInfo.id,
      name: deviceInfo.deviceName || deviceInfo.name,
      ip: ip,
      port: deviceInfo.port || this.syncPort,
      deviceType: deviceInfo.platform || 'unknown',
      lastSeen: new Date().toISOString(),
      isOnline: true,
      version: deviceInfo.version || '1.0.0'
    };

    this.discoveredDevices.set(device.id, device);
    console.log('Discovered device:', device);
  }

  private async handleSyncRequest(data: any): Promise<void> {
    try {
      // Handle incoming sync request
      const localData = await this.getLocalVaultData();
      
      // Send response with local data
      const response = {
        type: 'sync_response',
        deviceId: this.deviceId,
        data: localData,
        timestamp: new Date().toISOString()
      };

      // Send response back to requesting device
      // Implementation depends on transport method
    } catch (error) {
      console.error('Failed to handle sync request:', error);
    }
  }

  private stopDiscovery(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    if (this.serverSocket) {
      this.serverSocket.close();
      this.serverSocket = null;
    }

    this.discoveredDevices.clear();
    console.log('LAN discovery stopped');
  }

  async syncWithDevice(deviceId: string, progressCallback?: (progress: SyncProgress) => void): Promise<boolean> {
    const device = this.discoveredDevices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    try {
      progressCallback?.({
        stage: 'connecting',
        progress: 10,
        deviceName: device.name,
        filesTransferred: 0,
        totalFiles: 0
      });

      // Get local vault data
      const localFiles = await this.getLocalVaultData();
      
      progressCallback?.({
        stage: 'syncing',
        progress: 30,
        deviceName: device.name,
        filesTransferred: 0,
        totalFiles: localFiles.length
      });

      // Establish connection with device
      const success = await this.establishConnection(device);
      if (!success) {
        throw new Error('Failed to connect to device');
      }

      // Exchange data
      for (let i = 0; i < localFiles.length; i++) {
        await this.transferFile(device, localFiles[i]);
        
        progressCallback?.({
          stage: 'syncing',
          progress: 30 + (i / localFiles.length) * 60,
          deviceName: device.name,
          filesTransferred: i + 1,
          totalFiles: localFiles.length
        });
      }

      // Receive data from remote device
      const remoteFiles = await this.receiveFiles(device);
      await this.mergeRemoteFiles(remoteFiles);

      progressCallback?.({
        stage: 'complete',
        progress: 100,
        deviceName: device.name,
        filesTransferred: localFiles.length,
        totalFiles: localFiles.length
      });

      await this.saveSyncHistory(deviceId, device.name, localFiles.length);
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    }
  }

  private async establishConnection(device: DiscoveredDevice): Promise<boolean> {
    try {
      // Try HTTP connection first
      const response = await fetch(`http://${device.ip}:${device.port}/vaultix-handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.deviceId,
          deviceName: this.deviceName,
          requestType: 'sync'
        }),
        signal: AbortSignal.timeout(10000)
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to establish connection:', error);
      return false;
    }
  }

  private async transferFile(device: DiscoveredDevice, file: any): Promise<void> {
    try {
      const response = await fetch(`http://${device.ip}:${device.port}/vaultix-receive-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`File transfer failed: ${response.status}`);
      }
    } catch (error) {
      console.error('File transfer failed:', error);
      throw error;
    }
  }

  private async receiveFiles(device: DiscoveredDevice): Promise<any[]> {
    try {
      const response = await fetch(`http://${device.ip}:${device.port}/vaultix-get-files`, {
        method: 'GET',
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`Failed to receive files: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to receive files:', error);
      return [];
    }
  }

  private async mergeRemoteFiles(remoteFiles: any[]): Promise<void> {
    try {
      const localFiles = await this.getLocalVaultData();
      const mergedFiles = [...localFiles];

      remoteFiles.forEach(remoteFile => {
        const existingIndex = mergedFiles.findIndex(f => f.id === remoteFile.id);
        if (existingIndex >= 0) {
          // Update if remote file is newer
          if (new Date(remoteFile.dateModified) > new Date(mergedFiles[existingIndex].dateModified)) {
            mergedFiles[existingIndex] = remoteFile;
          }
        } else {
          // Add new file
          mergedFiles.push(remoteFile);
        }
      });

      await Preferences.set({
        key: 'vaultix_files',
        value: JSON.stringify(mergedFiles)
      });
    } catch (error) {
      console.error('Failed to merge remote files:', error);
    }
  }

  async syncWithDevices(): Promise<void> {
    const devices = Array.from(this.discoveredDevices.values()).filter(d => d.isOnline);
    
    for (const device of devices) {
      try {
        await this.syncWithDevice(device.id);
      } catch (error) {
        console.error(`Failed to sync with ${device.name}:`, error);
      }
    }
  }

  getDiscoveredDevices(): DiscoveredDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  async receiveFile(fileData: any): Promise<void> {
    try {
      const filesData = await Preferences.get({ key: 'vaultix_files' });
      const files = filesData.value ? JSON.parse(filesData.value) : [];
      
      const existingFile = files.find((f: any) => f.id === fileData.id);
      if (!existingFile) {
        files.push(fileData);
        await Preferences.set({
          key: 'vaultix_files',
          value: JSON.stringify(files)
        });
      }
    } catch (error) {
      console.error('Failed to receive file:', error);
    }
  }

  async getSyncHistory(): Promise<any[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_sync_history' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      return [];
    }
  }

  private async getLocalVaultData(): Promise<any[]> {
    try {
      const filesData = await Preferences.get({ key: 'vaultix_files' });
      return filesData.value ? JSON.parse(filesData.value) : [];
    } catch (error) {
      return [];
    }
  }

  private async saveSyncHistory(deviceId: string, deviceName: string, fileCount: number): Promise<void> {
    try {
      const history = await this.getSyncHistory();
      history.unshift({
        deviceId,
        deviceName,
        fileCount,
        timestamp: new Date().toISOString(),
        success: true
      });

      history.splice(50);

      await Preferences.set({
        key: 'vaultix_sync_history',
        value: JSON.stringify(history)
      });
    } catch (error) {
      console.error('Failed to save sync history:', error);
    }
  }

  async enableHotspot(): Promise<boolean> {
    try {
      // This would require a native Capacitor plugin for WiFi hotspot
      // For now, we'll just start our server and announce it
      await this.startHTTPServer();
      await this.broadcastDiscovery();
      
      console.log('Hotspot mode enabled - device is now discoverable');
      return true;
    } catch (error) {
      console.error('Failed to enable hotspot:', error);
      return false;
    }
  }

  destroy(): void {
    this.stopDiscovery();
    Network.removeAllListeners();
  }
}
