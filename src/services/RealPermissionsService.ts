
import { RealNativeSecurityService } from './RealNativeSecurityService';

export interface PermissionStatus {
  camera: boolean;
  microphone: boolean;
  location: boolean;
  storage: boolean;
  phone: boolean;
  overlay: boolean;
  deviceAdmin: boolean;
  usageStats: boolean;
}

export class RealPermissionsService {
  private static instance: RealPermissionsService;
  private nativeService = RealNativeSecurityService.getInstance();

  static getInstance(): RealPermissionsService {
    if (!RealPermissionsService.instance) {
      RealPermissionsService.instance = new RealPermissionsService();
    }
    return RealPermissionsService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.nativeService.initialize();
      console.log('Real permissions service initialized');
    } catch (error) {
      console.error('Failed to initialize permissions service:', error);
    }
  }

  async ensurePermissionForFeature(feature: string): Promise<boolean> {
    try {
      return await this.nativeService.requestSpecificPermission(feature);
    } catch (error) {
      console.error(`Failed to ensure permission for ${feature}:`, error);
      return false;
    }
  }

  async checkAllPermissions(): Promise<PermissionStatus> {
    try {
      const permissions = await this.nativeService.checkPermissions();
      return {
        camera: permissions.camera,
        microphone: permissions.microphone,
        location: permissions.location,
        storage: permissions.storage,
        phone: permissions.phone,
        overlay: permissions.overlay,
        deviceAdmin: permissions.deviceAdmin,
        usageStats: permissions.usageStats
      };
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return this.getDefaultPermissions();
    }
  }

  async requestAllPermissions(): Promise<boolean> {
    try {
      return await this.nativeService.requestAllPermissions();
    } catch (error) {
      console.error('Failed to request all permissions:', error);
      return false;
    }
  }

  async requestSpecificPermission(permission: keyof PermissionStatus): Promise<boolean> {
    try {
      return await this.nativeService.requestSpecificPermission(permission);
    } catch (error) {
      console.error(`Failed to request ${permission} permission:`, error);
      return false;
    }
  }

  async openAppSettings(): Promise<void> {
    try {
      await this.nativeService.openAppSettings();
    } catch (error) {
      console.error('Failed to open app settings:', error);
    }
  }

  private getDefaultPermissions(): PermissionStatus {
    return {
      camera: false,
      microphone: false,
      location: false,
      storage: false,
      phone: false,
      overlay: false,
      deviceAdmin: false,
      usageStats: false
    };
  }
}
