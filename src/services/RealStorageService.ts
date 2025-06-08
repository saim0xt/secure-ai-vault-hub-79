
import { Device } from '@capacitor/device';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { DeviceDetectionService } from './DeviceDetectionService';

export interface RealStorageInfo {
  used: number;
  available: number;
  total: number;
  percentage: number;
  formattedUsed: string;
  formattedTotal: string;
  formattedAvailable: string;
}

export class RealStorageService {
  private static instance: RealStorageService;

  static getInstance(): RealStorageService {
    if (!RealStorageService.instance) {
      RealStorageService.instance = new RealStorageService();
    }
    return RealStorageService.instance;
  }

  async getDeviceStorage(): Promise<RealStorageInfo> {
    const deviceDetection = DeviceDetectionService.getInstance();
    const isWeb = await deviceDetection.isWebPlatform();

    if (isWeb) {
      return this.getWebStorage();
    } else {
      return this.getNativeStorage();
    }
  }

  private async getWebStorage(): Promise<RealStorageInfo> {
    try {
      if ('navigator' in globalThis && 'storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const total = estimate.quota || 0;
        const available = Math.max(0, total - used);
        const percentage = total > 0 ? (used / total) * 100 : 0;

        return {
          used,
          available,
          total,
          percentage,
          formattedUsed: this.formatBytes(used),
          formattedTotal: this.formatBytes(total),
          formattedAvailable: this.formatBytes(available)
        };
      } else {
        throw new Error('Storage API not available');
      }
    } catch (error) {
      console.warn('Web storage API unavailable, using fallback');
      // Fallback for web without storage API
      const used = 100 * 1024 * 1024; // 100MB
      const total = 5 * 1024 * 1024 * 1024; // 5GB typical web quota
      return {
        used,
        available: total - used,
        total,
        percentage: (used / total) * 100,
        formattedUsed: this.formatBytes(used),
        formattedTotal: this.formatBytes(total),
        formattedAvailable: this.formatBytes(total - used)
      };
    }
  }

  private async getNativeStorage(): Promise<RealStorageInfo> {
    try {
      // For native platforms, we need to use platform-specific APIs
      // This is a simplified version - in production you'd use native plugins
      const deviceInfo = await Device.getInfo();
      
      // Calculate app storage usage
      let appUsage = 0;
      try {
        const files = await Filesystem.readdir({
          path: '.vaultix_secure/files',
          directory: Directory.Data
        });
        
        for (const file of files.files) {
          try {
            const stat = await Filesystem.stat({
              path: `.vaultix_secure/files/${file.name}`,
              directory: Directory.Data
            });
            appUsage += stat.size;
          } catch (statError) {
            console.warn('Could not stat file:', file.name);
          }
        }
      } catch (dirError) {
        console.warn('Could not read secure directory');
      }

      // Get real device storage (this would require native implementation)
      // For now, we'll use realistic estimates based on device type
      let deviceStorage = this.estimateDeviceStorage(deviceInfo.platform);
      
      // In production, you'd call a native plugin here to get actual storage
      // const realStorage = await NativeStoragePlugin.getDeviceStorage();
      
      const used = appUsage;
      const total = deviceStorage;
      const available = Math.max(0, total - used);
      const percentage = total > 0 ? (used / total) * 100 : 0;

      return {
        used,
        available,
        total,
        percentage,
        formattedUsed: this.formatBytes(used),
        formattedTotal: this.formatBytes(total),
        formattedAvailable: this.formatBytes(available)
      };
    } catch (error) {
      console.error('Failed to get native storage:', error);
      return this.getFallbackStorage();
    }
  }

  private estimateDeviceStorage(platform: string): number {
    // These are realistic storage sizes for modern devices
    switch (platform) {
      case 'android':
        return 128 * 1024 * 1024 * 1024; // 128GB - modern Android average
      case 'ios':
        return 256 * 1024 * 1024 * 1024; // 256GB - modern iPhone average
      default:
        return 64 * 1024 * 1024 * 1024; // 64GB fallback
    }
  }

  private getFallbackStorage(): RealStorageInfo {
    const used = 500 * 1024 * 1024; // 500MB
    const total = 128 * 1024 * 1024 * 1024; // 128GB
    return {
      used,
      available: total - used,
      total,
      percentage: (used / total) * 100,
      formattedUsed: this.formatBytes(used),
      formattedTotal: this.formatBytes(total),
      formattedAvailable: this.formatBytes(total - used)
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
