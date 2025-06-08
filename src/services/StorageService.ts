
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';

export interface StorageInfo {
  used: number;
  available: number;
  total: number;
  percentage: number;
}

export class StorageService {
  private static instance: StorageService;

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async getStorageInfo(): Promise<StorageInfo> {
    try {
      // Get device info for platform detection
      const deviceInfo = await Device.getInfo();
      
      if (deviceInfo.platform === 'web') {
        // For web platform, use navigator.storage API if available
        if ('navigator' in globalThis && 'storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          const used = estimate.usage || 0;
          const total = estimate.quota || 5 * 1024 * 1024 * 1024; // Default 5GB for web
          const available = total - used;
          const percentage = total > 0 ? (used / total) * 100 : 0;
          
          return {
            used,
            available,
            total,
            percentage
          };
        } else {
          // Fallback for web without storage API
          return {
            used: 50 * 1024 * 1024, // 50MB demo
            available: 950 * 1024 * 1024, // 950MB demo
            total: 1024 * 1024 * 1024, // 1GB demo
            percentage: 5
          };
        }
      } else {
        // For mobile platforms, we'll need to estimate based on file usage
        // Since Capacitor doesn't provide direct storage APIs, we'll calculate based on our files
        const vaultFiles = await this.getVaultFilesSize();
        const estimated = await this.estimateDeviceStorage();
        
        return {
          used: vaultFiles,
          available: estimated.total - vaultFiles,
          total: estimated.total,
          percentage: estimated.total > 0 ? (vaultFiles / estimated.total) * 100 : 0
        };
      }
    } catch (error) {
      console.error('Error getting storage info:', error);
      // Fallback values
      return {
        used: 100 * 1024 * 1024, // 100MB
        available: 900 * 1024 * 1024, // 900MB
        total: 1024 * 1024 * 1024, // 1GB
        percentage: 10
      };
    }
  }

  private async getVaultFilesSize(): Promise<number> {
    try {
      // Get the size of all files in our vault directory
      const files = await Filesystem.readdir({
        path: 'vault',
        directory: Directory.Data
      });

      let totalSize = 0;
      for (const file of files.files) {
        try {
          const stat = await Filesystem.stat({
            path: `vault/${file.name}`,
            directory: Directory.Data
          });
          totalSize += stat.size;
        } catch (error) {
          console.warn(`Could not get size for file ${file.name}:`, error);
        }
      }

      return totalSize;
    } catch (error) {
      console.warn('Could not read vault directory:', error);
      return 0;
    }
  }

  private async estimateDeviceStorage(): Promise<{ total: number }> {
    try {
      const deviceInfo = await Device.getInfo();
      
      // Estimate based on device type and platform
      if (deviceInfo.platform === 'android') {
        // Modern Android devices typically have 32GB-256GB
        return { total: 64 * 1024 * 1024 * 1024 }; // 64GB estimate
      } else if (deviceInfo.platform === 'ios') {
        // iOS devices typically have 64GB-1TB
        return { total: 128 * 1024 * 1024 * 1024 }; // 128GB estimate
      } else {
        // Web or other platforms
        return { total: 10 * 1024 * 1024 * 1024 }; // 10GB estimate
      }
    } catch (error) {
      console.error('Error estimating device storage:', error);
      return { total: 32 * 1024 * 1024 * 1024 }; // 32GB fallback
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async createVaultDirectory(): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: 'vault',
        directory: Directory.Data,
        recursive: true
      });
    } catch (error) {
      console.warn('Vault directory might already exist:', error);
    }
  }
}
