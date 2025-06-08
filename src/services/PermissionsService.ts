
import { Camera } from '@capacitor/camera';
import { Device } from '@capacitor/device';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';

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

export class PermissionsService {
  private static instance: PermissionsService;

  static getInstance(): PermissionsService {
    if (!PermissionsService.instance) {
      PermissionsService.instance = new PermissionsService();
    }
    return PermissionsService.instance;
  }

  async initialize(): Promise<void> {
    try {
      console.log('Permissions service initialized');
    } catch (error) {
      console.error('Failed to initialize permissions service:', error);
    }
  }

  async checkAllPermissions(): Promise<PermissionStatus> {
    try {
      const [
        camera,
        microphone, 
        location,
        storage,
        phone,
        overlay,
        deviceAdmin,
        usageStats
      ] = await Promise.all([
        this.checkCameraPermission(),
        this.checkMicrophonePermission(),
        this.checkLocationPermission(),
        this.checkStoragePermission(),
        this.checkPhonePermission(),
        this.checkOverlayPermission(),
        this.checkDeviceAdminPermission(),
        this.checkUsageStatsPermission()
      ]);

      return {
        camera,
        microphone,
        location,
        storage,
        phone,
        overlay,
        deviceAdmin,
        usageStats
      };
    } catch (error) {
      console.error('Failed to check permissions:', error);
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

  async requestAllPermissions(): Promise<boolean> {
    try {
      const permissions = await Promise.allSettled([
        this.requestCameraPermission(),
        this.requestMicrophonePermission(),
        this.requestLocationPermission(),
        this.requestStoragePermission(),
        this.requestPhonePermission(),
        this.requestOverlayPermission(),
        this.requestDeviceAdminPermission(),
        this.requestUsageStatsPermission()
      ]);

      const successful = permissions.filter(p => p.status === 'fulfilled' && p.value).length;
      const total = permissions.length;
      
      console.log(`Permissions granted: ${successful}/${total}`);
      return successful >= 4; // At least half granted
    } catch (error) {
      console.error('Failed to request all permissions:', error);
      return false;
    }
  }

  async requestSpecificPermission(permission: keyof PermissionStatus): Promise<boolean> {
    try {
      switch (permission) {
        case 'camera':
          return await this.requestCameraPermission();
        case 'microphone':
          return await this.requestMicrophonePermission();
        case 'location':
          return await this.requestLocationPermission();
        case 'storage':
          return await this.requestStoragePermission();
        case 'phone':
          return await this.requestPhonePermission();
        case 'overlay':
          return await this.requestOverlayPermission();
        case 'deviceAdmin':
          return await this.requestDeviceAdminPermission();
        case 'usageStats':
          return await this.requestUsageStatsPermission();
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to request ${permission} permission:`, error);
      return false;
    }
  }

  async ensurePermissionForFeature(feature: string): Promise<boolean> {
    const permissionMap: Record<string, keyof PermissionStatus> = {
      'camera': 'camera',
      'microphone': 'microphone',
      'location': 'location',
      'storage': 'storage',
      'phone': 'phone',
      'overlay': 'overlay',
      'deviceAdmin': 'deviceAdmin',
      'usageStats': 'usageStats'
    };

    const permissionKey = permissionMap[feature];
    if (!permissionKey) return false;

    const status = await this.checkAllPermissions();
    if (status[permissionKey]) return true;

    return await this.requestSpecificPermission(permissionKey);
  }

  private async checkCameraPermission(): Promise<boolean> {
    try {
      const permissions = await Camera.checkPermissions();
      return permissions.camera === 'granted';
    } catch (error) {
      console.error('Camera permission check failed:', error);
      return false;
    }
  }

  private async requestCameraPermission(): Promise<boolean> {
    try {
      const permissions = await Camera.requestPermissions({
        permissions: ['camera']
      });
      return permissions.camera === 'granted';
    } catch (error) {
      console.error('Camera permission request failed:', error);
      return false;
    }
  }

  private async checkMicrophonePermission(): Promise<boolean> {
    try {
      // Check if microphone permission is available
      if ('navigator' in globalThis && 'permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return result.state === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Microphone permission check failed:', error);
      return false;
    }
  }

  private async requestMicrophonePermission(): Promise<boolean> {
    try {
      if ('navigator' in globalThis && 'mediaDevices' in navigator) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Microphone permission request failed:', error);
      return false;
    }
  }

  private async checkLocationPermission(): Promise<boolean> {
    try {
      const permissions = await Geolocation.checkPermissions();
      return permissions.location === 'granted';
    } catch (error) {
      console.error('Location permission check failed:', error);
      return false;
    }
  }

  private async requestLocationPermission(): Promise<boolean> {
    try {
      const permissions = await Geolocation.requestPermissions();
      return permissions.location === 'granted';
    } catch (error) {
      console.error('Location permission request failed:', error);
      return false;
    }
  }

  private async checkStoragePermission(): Promise<boolean> {
    try {
      // Storage permissions are typically granted by default on modern Android
      // We'll assume granted for now, but this can be enhanced with native checks
      return true;
    } catch (error) {
      console.error('Storage permission check failed:', error);
      return false;
    }
  }

  private async requestStoragePermission(): Promise<boolean> {
    try {
      // Storage permissions are typically granted by default
      return true;
    } catch (error) {
      console.error('Storage permission request failed:', error);
      return false;
    }
  }

  private async checkPhonePermission(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_phone_permission_granted' });
      return value === 'true';
    } catch (error) {
      console.error('Phone permission check failed:', error);
      return false;
    }
  }

  private async requestPhonePermission(): Promise<boolean> {
    try {
      // This would typically involve native Android permission request
      // For now, we'll simulate user granting permission
      await Preferences.set({ key: 'vaultix_phone_permission_granted', value: 'true' });
      return true;
    } catch (error) {
      console.error('Phone permission request failed:', error);
      return false;
    }
  }

  private async checkOverlayPermission(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_overlay_permission_granted' });
      return value === 'true';
    } catch (error) {
      console.error('Overlay permission check failed:', error);
      return false;
    }
  }

  private async requestOverlayPermission(): Promise<boolean> {
    try {
      // This would typically open Android settings for overlay permission
      // For now, we'll simulate user granting permission
      await Preferences.set({ key: 'vaultix_overlay_permission_granted', value: 'true' });
      return true;
    } catch (error) {
      console.error('Overlay permission request failed:', error);
      return false;
    }
  }

  private async checkDeviceAdminPermission(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_device_admin_granted' });
      return value === 'true';
    } catch (error) {
      console.error('Device admin permission check failed:', error);
      return false;
    }
  }

  private async requestDeviceAdminPermission(): Promise<boolean> {
    try {
      // This would typically request device admin privileges
      // For now, we'll simulate user granting permission
      await Preferences.set({ key: 'vaultix_device_admin_granted', value: 'true' });
      return true;
    } catch (error) {
      console.error('Device admin permission request failed:', error);
      return false;
    }
  }

  private async checkUsageStatsPermission(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_usage_stats_granted' });
      return value === 'true';
    } catch (error) {
      console.error('Usage stats permission check failed:', error);
      return false;
    }
  }

  private async requestUsageStatsPermission(): Promise<boolean> {
    try {
      // This would typically open Android settings for usage access
      // For now, we'll simulate user granting permission
      await Preferences.set({ key: 'vaultix_usage_stats_granted', value: 'true' });
      return true;
    } catch (error) {
      console.error('Usage stats permission request failed:', error);
      return false;
    }
  }

  async openAppSettings(): Promise<void> {
    try {
      // This would typically open the app's settings page
      // For web/testing, we'll just log the action
      console.log('Opening app settings...');
      
      // In a real Android app, this would use:
      // import { NativeSettings } from 'capacitor-native-settings';
      // await NativeSettings.openAndroid();
    } catch (error) {
      console.error('Failed to open app settings:', error);
    }
  }
}
