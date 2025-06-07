
import { registerPlugin } from '@capacitor/core';

export interface PermissionsPlugin {
  requestAllPermissions(): Promise<{ success: boolean; granted: string[]; denied: string[] }>;
  checkPermissions(): Promise<{ permissions: { [key: string]: boolean } }>;
  requestSpecificPermission(options: { permission: string }): Promise<{ granted: boolean }>;
  openAppSettings(): Promise<{ success: boolean }>;
}

const Permissions = registerPlugin<PermissionsPlugin>('NativeSecurity');

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
  private permissionStatus: PermissionStatus = {
    camera: false,
    microphone: false,
    location: false,
    storage: false,
    phone: false,
    overlay: false,
    deviceAdmin: false,
    usageStats: false
  };

  static getInstance(): PermissionsService {
    if (!PermissionsService.instance) {
      PermissionsService.instance = new PermissionsService();
    }
    return PermissionsService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.checkAllPermissions();
      console.log('Permissions service initialized');
    } catch (error) {
      console.error('Failed to initialize permissions service:', error);
    }
  }

  async requestAllPermissions(): Promise<boolean> {
    try {
      const result = await Permissions.requestAllPermissions();
      await this.checkAllPermissions();
      
      // Show permission status dialog
      this.showPermissionStatusDialog(result);
      
      return result.success;
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }

  async requestSpecificPermission(permission: keyof PermissionStatus): Promise<boolean> {
    try {
      const permissionMap = {
        camera: 'android.permission.CAMERA',
        microphone: 'android.permission.RECORD_AUDIO',
        location: 'android.permission.ACCESS_FINE_LOCATION',
        storage: 'android.permission.WRITE_EXTERNAL_STORAGE',
        phone: 'android.permission.READ_PHONE_STATE',
        overlay: 'android.permission.SYSTEM_ALERT_WINDOW',
        deviceAdmin: 'android.permission.BIND_DEVICE_ADMIN',
        usageStats: 'android.permission.PACKAGE_USAGE_STATS'
      };

      const result = await Permissions.requestSpecificPermission({
        permission: permissionMap[permission]
      });

      await this.checkAllPermissions();
      return result.granted;
    } catch (error) {
      console.error(`Failed to request ${permission} permission:`, error);
      return false;
    }
  }

  async checkAllPermissions(): Promise<PermissionStatus> {
    try {
      const result = await Permissions.checkPermissions();
      this.permissionStatus = {
        camera: result.permissions['android.permission.CAMERA'] || false,
        microphone: result.permissions['android.permission.RECORD_AUDIO'] || false,
        location: result.permissions['android.permission.ACCESS_FINE_LOCATION'] || false,
        storage: result.permissions['android.permission.WRITE_EXTERNAL_STORAGE'] || false,
        phone: result.permissions['android.permission.READ_PHONE_STATE'] || false,
        overlay: result.permissions['android.permission.SYSTEM_ALERT_WINDOW'] || false,
        deviceAdmin: result.permissions['android.permission.BIND_DEVICE_ADMIN'] || false,
        usageStats: result.permissions['android.permission.PACKAGE_USAGE_STATS'] || false
      };
      
      return this.permissionStatus;
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return this.permissionStatus;
    }
  }

  getPermissionStatus(): PermissionStatus {
    return { ...this.permissionStatus };
  }

  async openAppSettings(): Promise<void> {
    try {
      await Permissions.openAppSettings();
    } catch (error) {
      console.error('Failed to open app settings:', error);
    }
  }

  private showPermissionStatusDialog(result: any): void {
    const granted = result.granted || [];
    const denied = result.denied || [];
    
    let message = 'Permission Status:\n\n';
    
    if (granted.length > 0) {
      message += `✅ Granted (${granted.length}):\n`;
      granted.forEach((perm: string) => {
        message += `• ${this.getPermissionDisplayName(perm)}\n`;
      });
      message += '\n';
    }
    
    if (denied.length > 0) {
      message += `❌ Denied (${denied.length}):\n`;
      denied.forEach((perm: string) => {
        message += `• ${this.getPermissionDisplayName(perm)}\n`;
      });
      message += '\nSome features may not work properly.';
    }
    
    // Create and show a custom permission dialog
    this.createPermissionDialog(message, denied.length > 0);
  }

  private createPermissionDialog(message: string, hasRejected: boolean): void {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    
    dialog.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-semibold mb-4">Permissions Status</h3>
        <div class="text-sm text-gray-600 whitespace-pre-line mb-6">${message}</div>
        <div class="flex gap-3">
          <button id="permission-ok" class="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            OK
          </button>
          ${hasRejected ? `
            <button id="permission-settings" class="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
              Settings
            </button>
          ` : ''}
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    const okButton = dialog.querySelector('#permission-ok');
    const settingsButton = dialog.querySelector('#permission-settings');
    
    okButton?.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    settingsButton?.addEventListener('click', () => {
      this.openAppSettings();
      document.body.removeChild(dialog);
    });
  }

  private getPermissionDisplayName(permission: string): string {
    const displayNames: { [key: string]: string } = {
      'android.permission.CAMERA': 'Camera',
      'android.permission.RECORD_AUDIO': 'Microphone',
      'android.permission.ACCESS_FINE_LOCATION': 'Location',
      'android.permission.WRITE_EXTERNAL_STORAGE': 'Storage',
      'android.permission.READ_PHONE_STATE': 'Phone State',
      'android.permission.SYSTEM_ALERT_WINDOW': 'Overlay',
      'android.permission.BIND_DEVICE_ADMIN': 'Device Admin',
      'android.permission.PACKAGE_USAGE_STATS': 'Usage Stats'
    };
    
    return displayNames[permission] || permission;
  }

  async ensurePermissionForFeature(feature: keyof PermissionStatus): Promise<boolean> {
    const currentStatus = await this.checkAllPermissions();
    
    if (!currentStatus[feature]) {
      const granted = await this.requestSpecificPermission(feature);
      if (!granted) {
        this.showFeatureUnavailableDialog(feature);
        return false;
      }
    }
    
    return true;
  }

  private showFeatureUnavailableDialog(feature: keyof PermissionStatus): void {
    const featureNames = {
      camera: 'Camera features',
      microphone: 'Audio recording',
      location: 'Location-based security',
      storage: 'File management',
      phone: 'Dialer codes',
      overlay: 'Security monitoring',
      deviceAdmin: 'Self-destruct feature',
      usageStats: 'App monitoring'
    };
    
    const message = `${featureNames[feature]} cannot be used without the required permission. Please grant the permission in Settings to use this feature.`;
    
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    
    dialog.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-semibold mb-4">Permission Required</h3>
        <p class="text-sm text-gray-600 mb-6">${message}</p>
        <div class="flex gap-3">
          <button id="feature-cancel" class="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
            Cancel
          </button>
          <button id="feature-settings" class="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Open Settings
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    const cancelButton = dialog.querySelector('#feature-cancel');
    const settingsButton = dialog.querySelector('#feature-settings');
    
    cancelButton?.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    settingsButton?.addEventListener('click', () => {
      this.openAppSettings();
      document.body.removeChild(dialog);
    });
  }
}
