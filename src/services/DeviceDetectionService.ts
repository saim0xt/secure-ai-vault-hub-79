
import { Device } from '@capacitor/device';

export interface DeviceCapabilities {
  platform: 'web' | 'android' | 'ios';
  supportsNativeFileHiding: boolean;
  supportsRealStorage: boolean;
  supportsLANDiscovery: boolean;
  supportsNativeSecurity: boolean;
}

export class DeviceDetectionService {
  private static instance: DeviceDetectionService;
  private capabilities: DeviceCapabilities | null = null;

  static getInstance(): DeviceDetectionService {
    if (!DeviceDetectionService.instance) {
      DeviceDetectionService.instance = new DeviceDetectionService();
    }
    return DeviceDetectionService.instance;
  }

  async getCapabilities(): Promise<DeviceCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    try {
      const deviceInfo = await Device.getInfo();
      
      this.capabilities = {
        platform: deviceInfo.platform as 'web' | 'android' | 'ios',
        supportsNativeFileHiding: deviceInfo.platform === 'android',
        supportsRealStorage: deviceInfo.platform !== 'web',
        supportsLANDiscovery: true, // Both web and native can do network discovery
        supportsNativeSecurity: deviceInfo.platform === 'android'
      };
    } catch (error) {
      console.error('Failed to detect device capabilities:', error);
      // Fallback to web capabilities
      this.capabilities = {
        platform: 'web',
        supportsNativeFileHiding: false,
        supportsRealStorage: false,
        supportsLANDiscovery: true,
        supportsNativeSecurity: false
      };
    }

    return this.capabilities;
  }

  async isWebPlatform(): Promise<boolean> {
    const capabilities = await this.getCapabilities();
    return capabilities.platform === 'web';
  }

  async isNativePlatform(): Promise<boolean> {
    const capabilities = await this.getCapabilities();
    return capabilities.platform !== 'web';
  }
}
