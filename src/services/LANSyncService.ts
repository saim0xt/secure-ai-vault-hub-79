
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';

export interface LANDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  lastSeen: string;
  deviceType: 'android' | 'ios' | 'desktop';
  vaultVersion: string;
}

export interface LANSyncConfig {
  enabled: boolean;
  deviceName: string;
  port: number;
  discoveryInterval: number;
  autoSync: boolean;
}

export class LANSyncService {
  private static instance: LANSyncService;
  private config: LANSyncConfig;
  private discoveredDevices: Map<string, LANDevice> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private discoveryInterval: NodeJS.Timeout | null = null;

  static getInstance(): LANSyncService {
    if (!LANSyncService.instance) {
      LANSyncService.instance = new LANSyncService();
    }
    return LANSyncService.instance;
  }

  constructor() {
    this.config = {
      enabled: false,
      deviceName: 'Vaultix Device',
      port: 8765,
      discoveryInterval: 30000,
      autoSync: true
    };
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
    if (this.config.enabled) {
      await this.startDiscovery();
    }
  }

  async loadConfig(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_lan_config' });
      if (value) {
        this.config = { ...this.config, ...JSON.parse(value) };
      }
    } catch (error) {
      console.error('Failed to load LAN config:', error);
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await Preferences.set({
        key: 'vaultix_lan_config',
        value: JSON.stringify(this.config)
      });
    } catch (error) {
      console.error('Failed to save LAN config:', error);
    }
  }

  async enableLANSync(enabled: boolean): Promise<void> {
    this.config.enabled = enabled;
    await this.saveConfig();

    if (enabled) {
      await this.startDiscovery();
      await this.startSyncService();
    } else {
      this.stopDiscovery();
      this.stopSyncService();
    }
  }

  private async startDiscovery(): Promise<void> {
    // Check network status
    const status = await Network.getStatus();
    if (!status.connected || status.connectionType === 'cellular') {
      console.log('LAN sync requires WiFi connection');
      return;
    }

    this.discoveryInterval = setInterval(async () => {
      await this.discoverDevices();
    }, this.config.discoveryInterval);

    // Initial discovery
    await this.discoverDevices();
  }

  private stopDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
  }

  private async discoverDevices(): Promise<void> {
    try {
      // Get local network info
      const networkInfo = await this.getNetworkInfo();
      const baseIP = networkInfo.baseIP;
      
      // Scan for devices on ports 8765-8770
      const promises: Promise<void>[] = [];
      
      for (let i = 1; i <= 254; i++) {
        const ip = `${baseIP}.${i}`;
        for (let port = 8765; port <= 8770; port++) {
          promises.push(this.checkDevice(ip, port));
        }
      }

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Device discovery failed:', error);
    }
  }

  private async getNetworkInfo(): Promise<{ baseIP: string; localIP: string }> {
    // This would typically use native network APIs
    // For now, we'll simulate network discovery
    return {
      baseIP: '192.168.1',
      localIP: '192.168.1.100'
    };
  }

  private async checkDevice(ip: string, port: number): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://${ip}:${port}/vaultix/ping`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Vaultix-LAN-Discovery/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const deviceInfo = await response.json();
        
        const device: LANDevice = {
          id: deviceInfo.deviceId,
          name: deviceInfo.deviceName,
          ip: ip,
          port: port,
          lastSeen: new Date().toISOString(),
          deviceType: deviceInfo.deviceType,
          vaultVersion: deviceInfo.version
        };

        this.discoveredDevices.set(device.id, device);
        console.log('Discovered Vaultix device:', device);
      }
    } catch (error) {
      // Device not reachable or not a Vaultix device
    }
  }

  private async startSyncService(): Promise<void> {
    if (this.config.autoSync) {
      this.syncInterval = setInterval(async () => {
        await this.syncWithDevices();
      }, 60000); // Sync every minute
    }
  }

  private stopSyncService(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncWithDevices(): Promise<void> {
    for (const device of this.discoveredDevices.values()) {
      try {
        await this.syncWithDevice(device);
      } catch (error) {
        console.error(`Sync failed with device ${device.name}:`, error);
      }
    }
  }

  private async syncWithDevice(device: LANDevice): Promise<void> {
    try {
      // Get local files
      const { value: localFilesData } = await Preferences.get({ key: 'vaultix_files' });
      const localFiles = localFilesData ? JSON.parse(localFilesData) : [];

      // Get remote files
      const response = await fetch(`http://${device.ip}:${device.port}/vaultix/files`, {
        method: 'GET',
        headers: {
          'Authorization': await this.generateAuthToken(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const remoteFiles = await response.json();

      // Merge files (conflict resolution: newest wins)
      const mergedFiles = this.mergeFileCollections(localFiles, remoteFiles);

      // Update local storage
      await Preferences.set({ key: 'vaultix_files', value: JSON.stringify(mergedFiles) });

      // Send updated files back to remote device
      await fetch(`http://${device.ip}:${device.port}/vaultix/sync`, {
        method: 'POST',
        headers: {
          'Authorization': await this.generateAuthToken(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files: mergedFiles })
      });

      console.log(`Successfully synced with ${device.name}`);
    } catch (error) {
      console.error(`Failed to sync with ${device.name}:`, error);
      throw error;
    }
  }

  private mergeFileCollections(localFiles: any[], remoteFiles: any[]): any[] {
    const fileMap = new Map();

    // Add local files
    localFiles.forEach(file => {
      fileMap.set(file.id, file);
    });

    // Merge remote files (newer versions override)
    remoteFiles.forEach(remoteFile => {
      const localFile = fileMap.get(remoteFile.id);
      
      if (!localFile || new Date(remoteFile.dateModified) > new Date(localFile.dateModified)) {
        fileMap.set(remoteFile.id, remoteFile);
      }
    });

    return Array.from(fileMap.values());
  }

  private async generateAuthToken(): Promise<string> {
    // Generate a simple authentication token based on device ID and timestamp
    const { value: deviceId } = await Preferences.get({ key: 'vaultix_device_id' });
    const timestamp = Date.now();
    return btoa(`${deviceId}:${timestamp}`);
  }

  getDiscoveredDevices(): LANDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  getConfig(): LANSyncConfig {
    return { ...this.config };
  }

  async updateConfig(updates: Partial<LANSyncConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
  }
}
