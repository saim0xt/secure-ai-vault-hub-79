
import { DeviceDetectionService } from './DeviceDetectionService';
import { RealFileHidingService } from './RealFileHidingService';

export interface FileOperationResult {
  success: boolean;
  message: string;
  requiresNative?: boolean;
}

export class RealFileManagementService {
  private static instance: RealFileManagementService;
  private fileHidingService = RealFileHidingService.getInstance();

  static getInstance(): RealFileManagementService {
    if (!RealFileManagementService.instance) {
      RealFileManagementService.instance = new RealFileManagementService();
    }
    return RealFileManagementService.instance;
  }

  async hideFile(fileName: string): Promise<FileOperationResult> {
    try {
      const deviceDetection = DeviceDetectionService.getInstance();
      const capabilities = await deviceDetection.getCapabilities();

      if (!capabilities.supportsNativeFileHiding) {
        return {
          success: false,
          message: 'File hiding requires native Android app. Files are securely stored but not hidden from device.',
          requiresNative: true
        };
      }

      const success = await this.fileHidingService.hideFile(fileName);
      
      return {
        success,
        message: success 
          ? 'File successfully hidden from device' 
          : 'Failed to hide file - ensure file exists and permissions are granted'
      };
    } catch (error) {
      console.error('Hide file error:', error);
      return {
        success: false,
        message: 'File hiding operation failed'
      };
    }
  }

  async showFile(fileName: string): Promise<FileOperationResult> {
    try {
      const deviceDetection = DeviceDetectionService.getInstance();
      const capabilities = await deviceDetection.getCapabilities();

      if (!capabilities.supportsNativeFileHiding) {
        return {
          success: false,
          message: 'File showing requires native Android app.',
          requiresNative: true
        };
      }

      const success = await this.fileHidingService.showFile(fileName);
      
      return {
        success,
        message: success 
          ? 'File successfully made visible on device' 
          : 'Failed to show file - ensure file exists in hidden storage'
      };
    } catch (error) {
      console.error('Show file error:', error);
      return {
        success: false,
        message: 'File showing operation failed'
      };
    }
  }

  async getVisibleFiles(): Promise<string[]> {
    try {
      const deviceDetection = DeviceDetectionService.getInstance();
      const capabilities = await deviceDetection.getCapabilities();

      if (!capabilities.supportsNativeFileHiding) {
        console.log('File listing not available on web platform');
        return [];
      }

      return await this.fileHidingService.getVisibleFiles();
    } catch (error) {
      console.error('Get visible files error:', error);
      return [];
    }
  }

  async getHiddenFiles(): Promise<string[]> {
    try {
      const deviceDetection = DeviceDetectionService.getInstance();
      const capabilities = await deviceDetection.getCapabilities();

      if (!capabilities.supportsNativeFileHiding) {
        console.log('Hidden file listing not available on web platform');
        return [];
      }

      return await this.fileHidingService.getHiddenFiles();
    } catch (error) {
      console.error('Get hidden files error:', error);
      return [];
    }
  }
}
