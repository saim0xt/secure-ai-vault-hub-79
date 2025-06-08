
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';

export interface StorageInfo {
  used: number;
  total: number;
  available: number;
}

export interface FileInfo {
  name: string;
  size: number;
  path: string;
  modifiedTime: number;
}

export class StorageService {
  private static instance: StorageService;

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async getRealStorageInfo(): Promise<StorageInfo> {
    try {
      const info = await Device.getInfo();
      const platform = info.platform;

      if (platform === 'android' || platform === 'ios') {
        // Get real device storage info
        const diskSpace = await this.getDiskSpace();
        return diskSpace;
      } else {
        // For web, use localStorage estimation
        return await this.getWebStorageInfo();
      }
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { used: 0, total: 1024 * 1024 * 1024, available: 1024 * 1024 * 1024 }; // 1GB fallback
    }
  }

  private async getDiskSpace(): Promise<StorageInfo> {
    try {
      // Use Filesystem API to get actual storage
      const documentsDir = await Filesystem.readdir({
        path: '',
        directory: Directory.Documents
      });

      const dataDir = await Filesystem.readdir({
        path: '',
        directory: Directory.Data
      });

      // Calculate used space by scanning files
      let usedSpace = 0;
      for (const file of [...documentsDir.files, ...dataDir.files]) {
        try {
          const stat = await Filesystem.stat({
            path: file.name,
            directory: Directory.Documents
          });
          usedSpace += stat.size || 0;
        } catch (error) {
          // File might not exist or be accessible
        }
      }

      // Estimate total available space (this would ideally come from native code)
      const totalSpace = 8 * 1024 * 1024 * 1024; // 8GB estimate
      const availableSpace = totalSpace - usedSpace;

      return {
        used: usedSpace,
        total: totalSpace,
        available: availableSpace
      };
    } catch (error) {
      console.error('Error getting disk space:', error);
      return { used: 0, total: 8 * 1024 * 1024 * 1024, available: 8 * 1024 * 1024 * 1024 };
    }
  }

  private async getWebStorageInfo(): Promise<StorageInfo> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const total = estimate.quota || 1024 * 1024 * 1024; // 1GB default
        const available = total - used;

        return { used, total, available };
      }
    } catch (error) {
      console.error('Error getting web storage info:', error);
    }

    // Fallback for older browsers
    return { used: 0, total: 1024 * 1024 * 1024, available: 1024 * 1024 * 1024 };
  }

  async getVaultFiles(): Promise<FileInfo[]> {
    try {
      const files = await Filesystem.readdir({
        path: 'vault',
        directory: Directory.Documents
      });

      const fileInfos: FileInfo[] = [];
      for (const file of files.files) {
        try {
          const stat = await Filesystem.stat({
            path: `vault/${file.name}`,
            directory: Directory.Documents
          });

          fileInfos.push({
            name: file.name,
            size: stat.size || 0,
            path: `vault/${file.name}`,
            modifiedTime: stat.mtime || Date.now()
          });
        } catch (error) {
          console.error(`Error getting file info for ${file.name}:`, error);
        }
      }

      return fileInfos;
    } catch (error) {
      console.error('Error getting vault files:', error);
      return [];
    }
  }

  async cleanupTempFiles(): Promise<number> {
    try {
      const tempFiles = await Filesystem.readdir({
        path: 'temp',
        directory: Directory.Cache
      });

      let cleanedSpace = 0;
      for (const file of tempFiles.files) {
        try {
          const stat = await Filesystem.stat({
            path: `temp/${file.name}`,
            directory: Directory.Cache
          });

          await Filesystem.deleteFile({
            path: `temp/${file.name}`,
            directory: Directory.Cache
          });

          cleanedSpace += stat.size || 0;
        } catch (error) {
          console.error(`Error cleaning temp file ${file.name}:`, error);
        }
      }

      return cleanedSpace;
    } catch (error) {
      console.error('Error cleaning temp files:', error);
      return 0;
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
