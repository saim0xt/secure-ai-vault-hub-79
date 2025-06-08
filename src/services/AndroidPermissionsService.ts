
import { registerPlugin } from '@capacitor/core';

export interface AndroidPermissionsPlugin {
  requestPermission(options: { permission: string; rationale?: string }): Promise<{ granted: boolean; shouldShowRationale: boolean }>;
  checkPermission(options: { permission: string }): Promise<{ granted: boolean }>;
  requestMultiplePermissions(options: { permissions: string[] }): Promise<{ results: Record<string, boolean> }>;
  openAppSettings(): Promise<void>;
  requestOverlayPermission(): Promise<{ granted: boolean }>;
  requestUsageStatsPermission(): Promise<{ granted: boolean }>;
  requestDeviceAdminPermission(): Promise<{ granted: boolean }>;
}

const AndroidPermissions = registerPlugin<AndroidPermissionsPlugin>('AndroidPermissions');

export class AndroidPermissionsService {
  private static instance: AndroidPermissionsService;

  static getInstance(): AndroidPermissionsService {
    if (!AndroidPermissionsService.instance) {
      AndroidPermissionsService.instance = new AndroidPermissionsService();
    }
    return AndroidPermissionsService.instance;
  }

  async requestCameraPermission(): Promise<boolean> {
    try {
      const result = await AndroidPermissions.requestPermission({
        permission: 'android.permission.CAMERA',
        rationale: 'Camera access is required for taking secure photos and intruder detection.'
      });
      return result.granted;
    } catch (error) {
      console.error('Failed to request camera permission:', error);
      return false;
    }
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const result = await AndroidPermissions.requestPermission({
        permission: 'android.permission.RECORD_AUDIO',
        rationale: 'Microphone access is required for voice recording and security alerts.'
      });
      return result.granted;
    } catch (error) {
      console.error('Failed to request microphone permission:', error);
      return false;
    }
  }

  async requestLocationPermission(): Promise<boolean> {
    try {
      const result = await AndroidPermissions.requestMultiplePermissions({
        permissions: [
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.ACCESS_COARSE_LOCATION'
        ]
      });
      return result.results['android.permission.ACCESS_FINE_LOCATION'] || 
             result.results['android.permission.ACCESS_COARSE_LOCATION'];
    } catch (error) {
      console.error('Failed to request location permission:', error);
      return false;
    }
  }

  async requestStoragePermissions(): Promise<boolean> {
    try {
      const result = await AndroidPermissions.requestMultiplePermissions({
        permissions: [
          'android.permission.READ_EXTERNAL_STORAGE',
          'android.permission.WRITE_EXTERNAL_STORAGE',
          'android.permission.READ_MEDIA_IMAGES',
          'android.permission.READ_MEDIA_VIDEO',
          'android.permission.READ_MEDIA_AUDIO'
        ]
      });
      
      // Return true if any storage permission is granted
      return Object.values(result.results).some(granted => granted);
    } catch (error) {
      console.error('Failed to request storage permissions:', error);
      return false;
    }
  }

  async requestOverlayPermission(): Promise<boolean> {
    try {
      const result = await AndroidPermissions.requestOverlayPermission();
      return result.granted;
    } catch (error) {
      console.error('Failed to request overlay permission:', error);
      return false;
    }
  }

  async requestUsageStatsPermission(): Promise<boolean> {
    try {
      const result = await AndroidPermissions.requestUsageStatsPermission();
      return result.granted;
    } catch (error) {
      console.error('Failed to request usage stats permission:', error);
      return false;
    }
  }

  async requestDeviceAdminPermission(): Promise<boolean> {
    try {
      const result = await AndroidPermissions.requestDeviceAdminPermission();
      return result.granted;
    } catch (error) {
      console.error('Failed to request device admin permission:', error);
      return false;
    }
  }

  async checkAllPermissions(): Promise<{
    camera: boolean;
    microphone: boolean;
    location: boolean;
    storage: boolean;
    overlay: boolean;
    usageStats: boolean;
    deviceAdmin: boolean;
  }> {
    try {
      const permissions = [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.READ_EXTERNAL_STORAGE'
      ];

      const results = await Promise.all(
        permissions.map(permission => 
          AndroidPermissions.checkPermission({ permission })
        )
      );

      return {
        camera: results[0].granted,
        microphone: results[1].granted,
        location: results[2].granted,
        storage: results[3].granted,
        overlay: false, // Will be checked separately
        usageStats: false, // Will be checked separately
        deviceAdmin: false // Will be checked separately
      };
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return {
        camera: false,
        microphone: false,
        location: false,
        storage: false,
        overlay: false,
        usageStats: false,
        deviceAdmin: false
      };
    }
  }

  async openAppSettings(): Promise<void> {
    try {
      await AndroidPermissions.openAppSettings();
    } catch (error) {
      console.error('Failed to open app settings:', error);
    }
  }
}
