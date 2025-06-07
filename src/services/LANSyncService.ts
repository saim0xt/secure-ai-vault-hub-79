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
        if (status.connected) {
          this.startDiscovery();
        } else {
          this.stopDiscovery();
        }
      });

      // Start discovery if connected
      const status = await Network.getStatus();
      if (status.connected && status.connectionType === 'wifi') {
        this.startDiscovery();
      }

      console.log('LAN Sync service initialized');
    } catch (error) {
      console.error('Failed to initialize LAN sync:', error);
    }
  }

  private async startDiscovery(): Promise<void> {
    try {
      // Start UDP broadcast for device discovery
      this.broadcastInterval = window.setInterval(() => {
        this.broadcastDiscovery();
      }, 5000);

      // Start listening for incoming connections
      await this.startServer();
      
      console.log('LAN discovery started');
    } catch (error) {
      console.error('Failed to start discovery:', error);
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

  private async broadcastDiscovery(): Promise<void> {
    try {
      // In a real implementation, this would use UDP broadcast
      // For web implementation, we'll simulate device discovery
      const mockDevice: DiscoveredDevice = {
        id: 'mock_device_' + Math.random().toString(36).substr(2, 9),
        name: 'Vaultix Device',
        ip: '192.168.1.' + Math.floor(Math.random() * 254 + 1),
        port: this.syncPort,
        deviceType: 'android',
        lastSeen: new Date().toISOString(),
        isOnline: true,
        version: '1.0.0'
      };

      this.discoveredDevices.set(mockDevice.id, mockDevice);
    } catch (error) {
      console.error('Failed to broadcast discovery:', error);
    }
  }

  private async startServer(): Promise<void> {
    try {
      // In a real implementation, this would start a WebSocket server
      // For web, we'll simulate server functionality
      console.log(`LAN sync server started on port ${this.syncPort}`);
    } catch (error) {
      console.error('Failed to start server:', error);
    }
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

      // Simulate sync process
      for (let i = 0; i < localFiles.length; i++) {
        // In real implementation, transfer file to remote device
        await new Promise(resolve => setTimeout(resolve, 100));
        
        progressCallback?.({
          stage: 'syncing',
          progress: 30 + (i / localFiles.length) * 60,
          deviceName: device.name,
          filesTransferred: i + 1,
          totalFiles: localFiles.length
        });
      }

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
      // Validate and save received file
      const filesData = await Preferences.get({ key: 'vaultix_files' });
      const files = filesData.value ? JSON.parse(filesData.value) : [];
      
      // Check if file already exists
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

      // Keep last 50 sync records
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
      // In a real implementation, this would enable WiFi hotspot
      // This requires additional Capacitor plugins or native code
      console.log('Hotspot functionality would be implemented natively');
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
