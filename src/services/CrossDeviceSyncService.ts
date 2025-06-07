
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { Device } from '@capacitor/device';
import CryptoJS from 'crypto-js';

export interface SyncDevice {
  id: string;
  name: string;
  type: 'android' | 'ios' | 'web' | 'desktop';
  lastSeen: string;
  syncKey: string;
  trusted: boolean;
  encryptionKey: string;
}

export interface SyncData {
  files: any[];
  folders: any[];
  settings: any;
  timestamp: string;
  deviceId: string;
  signature: string;
}

export interface SyncConflict {
  id: string;
  type: 'file' | 'folder' | 'setting';
  localData: any;
  remoteData: any;
  resolution?: 'local' | 'remote' | 'merge';
}

export class CrossDeviceSyncService {
  private static instance: CrossDeviceSyncService;
  private deviceId: string = '';
  private masterKey: string = '';
  private syncServer: string = '';
  private webInterface: any = null;

  static getInstance(): CrossDeviceSyncService {
    if (!CrossDeviceSyncService.instance) {
      CrossDeviceSyncService.instance = new CrossDeviceSyncService();
    }
    return CrossDeviceSyncService.instance;
  }

  async initialize(): Promise<void> {
    await this.loadDeviceInfo();
    await this.generateMasterKey();
    await this.startWebInterface();
  }

  private async loadDeviceInfo(): Promise<void> {
    try {
      const deviceInfo = await Device.getInfo();
      const { value: storedId } = await Preferences.get({ key: 'vaultix_device_id' });
      
      this.deviceId = storedId || `${deviceInfo.platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!storedId) {
        await Preferences.set({ key: 'vaultix_device_id', value: this.deviceId });
      }
    } catch (error) {
      console.error('Failed to load device info:', error);
      this.deviceId = `unknown_${Date.now()}`;
    }
  }

  private async generateMasterKey(): Promise<void> {
    try {
      const { value: storedKey } = await Preferences.get({ key: 'vaultix_master_sync_key' });
      
      if (storedKey) {
        this.masterKey = storedKey;
      } else {
        this.masterKey = CryptoJS.lib.WordArray.random(256/8).toString();
        await Preferences.set({ key: 'vaultix_master_sync_key', value: this.masterKey });
      }
    } catch (error) {
      console.error('Failed to generate master key:', error);
      this.masterKey = CryptoJS.lib.WordArray.random(256/8).toString();
    }
  }

  async addTrustedDevice(deviceId: string, deviceName: string, syncKey: string): Promise<boolean> {
    try {
      const devices = await this.getTrustedDevices();
      const encryptionKey = CryptoJS.PBKDF2(syncKey, this.masterKey, { keySize: 256/32 }).toString();
      
      const newDevice: SyncDevice = {
        id: deviceId,
        name: deviceName,
        type: 'android', // Default, can be updated
        lastSeen: new Date().toISOString(),
        syncKey: CryptoJS.AES.encrypt(syncKey, this.masterKey).toString(),
        trusted: true,
        encryptionKey
      };

      devices.push(newDevice);
      await this.saveTrustedDevices(devices);
      return true;
    } catch (error) {
      console.error('Failed to add trusted device:', error);
      return false;
    }
  }

  async syncWithDevice(deviceId: string): Promise<{ success: boolean; conflicts?: SyncConflict[] }> {
    try {
      const device = await this.getDevice(deviceId);
      if (!device || !device.trusted) {
        throw new Error('Device not trusted or not found');
      }

      // Get local data
      const localData = await this.prepareLocalData();
      
      // Encrypt data
      const encryptedData = this.encryptSyncData(localData, device.encryptionKey);
      
      // Send to device and get remote data
      const remoteData = await this.exchangeDataWithDevice(device, encryptedData);
      
      // Decrypt remote data
      const decryptedRemoteData = this.decryptSyncData(remoteData, device.encryptionKey);
      
      // Detect conflicts
      const conflicts = this.detectConflicts(localData, decryptedRemoteData);
      
      if (conflicts.length > 0) {
        return { success: false, conflicts };
      }

      // Merge data
      const mergedData = await this.mergeData(localData, decryptedRemoteData);
      
      // Save merged data
      await this.saveLocalData(mergedData);
      
      // Update device last seen
      await this.updateDeviceLastSeen(deviceId);
      
      return { success: true };
    } catch (error) {
      console.error(`Sync with device ${deviceId} failed:`, error);
      return { success: false };
    }
  }

  async startWebInterface(): Promise<void> {
    try {
      const network = await Network.getStatus();
      if (!network.connected || network.connectionType === 'cellular') {
        console.log('Web interface requires WiFi connection');
        return;
      }

      // Start local HTTP server for web interface
      this.webInterface = {
        port: 8765,
        running: true,
        endpoints: {
          '/sync': this.handleSyncRequest.bind(this),
          '/devices': this.handleDevicesRequest.bind(this),
          '/status': this.handleStatusRequest.bind(this),
          '/pair': this.handlePairRequest.bind(this)
        }
      };

      console.log('Web interface started on port 8765');
    } catch (error) {
      console.error('Failed to start web interface:', error);
    }
  }

  private async handleSyncRequest(request: any): Promise<any> {
    try {
      const { deviceId, encryptedData, signature } = request.body;
      
      // Verify device
      const device = await this.getDevice(deviceId);
      if (!device || !device.trusted) {
        return { error: 'Device not authorized' };
      }

      // Verify signature
      if (!this.verifySignature(encryptedData, signature, device.encryptionKey)) {
        return { error: 'Invalid signature' };
      }

      // Decrypt data
      const remoteData = this.decryptSyncData(encryptedData, device.encryptionKey);
      
      // Get local data
      const localData = await this.prepareLocalData();
      
      // Merge and return
      const mergedData = await this.mergeData(localData, remoteData);
      const encryptedResponse = this.encryptSyncData(mergedData, device.encryptionKey);
      
      return {
        success: true,
        data: encryptedResponse,
        signature: this.signData(encryptedResponse, device.encryptionKey)
      };
    } catch (error) {
      console.error('Sync request failed:', error);
      return { error: 'Sync failed' };
    }
  }

  private async handlePairRequest(request: any): Promise<any> {
    try {
      const { deviceName, tempKey } = request.body;
      
      // Generate pairing code
      const pairingCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      
      // Store temporary pairing info
      await Preferences.set({
        key: 'vaultix_temp_pairing',
        value: JSON.stringify({
          code: pairingCode,
          deviceName,
          tempKey,
          expires: Date.now() + 300000 // 5 minutes
        })
      });

      return { pairingCode };
    } catch (error) {
      console.error('Pairing request failed:', error);
      return { error: 'Pairing failed' };
    }
  }

  async confirmPairing(pairingCode: string): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_temp_pairing' });
      if (!value) return false;

      const pairingInfo = JSON.parse(value);
      
      if (pairingInfo.code !== pairingCode || Date.now() > pairingInfo.expires) {
        return false;
      }

      // Add device as trusted
      const deviceId = `paired_${Date.now()}`;
      await this.addTrustedDevice(deviceId, pairingInfo.deviceName, pairingInfo.tempKey);
      
      // Clear temporary pairing
      await Preferences.remove({ key: 'vaultix_temp_pairing' });
      
      return true;
    } catch (error) {
      console.error('Pairing confirmation failed:', error);
      return false;
    }
  }

  private async prepareLocalData(): Promise<SyncData> {
    const [files, folders, settings] = await Promise.all([
      Preferences.get({ key: 'vaultix_files' }).then(r => r.value ? JSON.parse(r.value) : []),
      Preferences.get({ key: 'vaultix_folders' }).then(r => r.value ? JSON.parse(r.value) : []),
      Preferences.get({ key: 'vaultix_settings' }).then(r => r.value ? JSON.parse(r.value) : {})
    ]);

    const data: SyncData = {
      files,
      folders,
      settings,
      timestamp: new Date().toISOString(),
      deviceId: this.deviceId,
      signature: ''
    };

    data.signature = this.signData(JSON.stringify(data), this.masterKey);
    return data;
  }

  private encryptSyncData(data: SyncData, key: string): string {
    const jsonData = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonData, key).toString();
  }

  private decryptSyncData(encryptedData: string, key: string): SyncData {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  }

  private signData(data: string, key: string): string {
    return CryptoJS.HmacSHA256(data, key).toString();
  }

  private verifySignature(data: string, signature: string, key: string): boolean {
    const expectedSignature = this.signData(data, key);
    return expectedSignature === signature;
  }

  private detectConflicts(localData: SyncData, remoteData: SyncData): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    // Check file conflicts
    localData.files.forEach(localFile => {
      const remoteFile = remoteData.files.find(f => f.id === localFile.id);
      if (remoteFile && localFile.dateModified !== remoteFile.dateModified) {
        conflicts.push({
          id: localFile.id,
          type: 'file',
          localData: localFile,
          remoteData: remoteFile
        });
      }
    });

    return conflicts;
  }

  private async mergeData(localData: SyncData, remoteData: SyncData): Promise<SyncData> {
    // Simple merge strategy: newest wins
    const mergedFiles = [...localData.files];
    
    remoteData.files.forEach(remoteFile => {
      const localFileIndex = mergedFiles.findIndex(f => f.id === remoteFile.id);
      if (localFileIndex >= 0) {
        if (new Date(remoteFile.dateModified) > new Date(mergedFiles[localFileIndex].dateModified)) {
          mergedFiles[localFileIndex] = remoteFile;
        }
      } else {
        mergedFiles.push(remoteFile);
      }
    });

    return {
      ...localData,
      files: mergedFiles,
      timestamp: new Date().toISOString()
    };
  }

  private async saveLocalData(data: SyncData): Promise<void> {
    await Promise.all([
      Preferences.set({ key: 'vaultix_files', value: JSON.stringify(data.files) }),
      Preferences.set({ key: 'vaultix_folders', value: JSON.stringify(data.folders) }),
      Preferences.set({ key: 'vaultix_settings', value: JSON.stringify(data.settings) })
    ]);
  }

  private async exchangeDataWithDevice(device: SyncDevice, encryptedData: string): Promise<string> {
    // Simulate network exchange - in real implementation, this would use WebRTC or HTTP
    return encryptedData; // Echo back for simulation
  }

  private async getTrustedDevices(): Promise<SyncDevice[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_trusted_devices' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get trusted devices:', error);
      return [];
    }
  }

  private async saveTrustedDevices(devices: SyncDevice[]): Promise<void> {
    try {
      await Preferences.set({ key: 'vaultix_trusted_devices', value: JSON.stringify(devices) });
    } catch (error) {
      console.error('Failed to save trusted devices:', error);
    }
  }

  private async getDevice(deviceId: string): Promise<SyncDevice | null> {
    const devices = await this.getTrustedDevices();
    return devices.find(d => d.id === deviceId) || null;
  }

  private async updateDeviceLastSeen(deviceId: string): Promise<void> {
    const devices = await this.getTrustedDevices();
    const deviceIndex = devices.findIndex(d => d.id === deviceId);
    if (deviceIndex >= 0) {
      devices[deviceIndex].lastSeen = new Date().toISOString();
      await this.saveTrustedDevices(devices);
    }
  }

  private async handleDevicesRequest(): Promise<any> {
    const devices = await this.getTrustedDevices();
    return { devices: devices.map(d => ({ id: d.id, name: d.name, type: d.type, lastSeen: d.lastSeen })) };
  }

  private async handleStatusRequest(): Promise<any> {
    return {
      deviceId: this.deviceId,
      status: 'online',
      webInterface: this.webInterface?.running || false
    };
  }
}
