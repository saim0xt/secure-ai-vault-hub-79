
import { registerPlugin } from '@capacitor/core';

export interface NativeNotificationPlugin {
  showSecurityAlert(options: { title: string; message: string; alertType: string }): Promise<{ success: boolean }>;
  showPermissionRequest(options: { permission: string; reason: string }): Promise<{ success: boolean }>;
  clearAllNotifications(): Promise<{ success: boolean }>;
  areNotificationsEnabled(): Promise<{ enabled: boolean }>;
}

const RealNativeNotification = registerPlugin<NativeNotificationPlugin>('RealNativeNotification', {
  web: {
    showSecurityAlert: async () => ({ success: true }),
    showPermissionRequest: async () => ({ success: true }),
    clearAllNotifications: async () => ({ success: true }),
    areNotificationsEnabled: async () => ({ enabled: true })
  }
});

export class RealNativeNotificationService {
  private static instance: RealNativeNotificationService;

  static getInstance(): RealNativeNotificationService {
    if (!RealNativeNotificationService.instance) {
      RealNativeNotificationService.instance = new RealNativeNotificationService();
    }
    return RealNativeNotificationService.instance;
  }

  async showSecurityAlert(title: string, message: string, alertType: string = 'security'): Promise<boolean> {
    try {
      const result = await RealNativeNotification.showSecurityAlert({ title, message, alertType });
      return result.success;
    } catch (error) {
      console.error('Failed to show security alert:', error);
      return false;
    }
  }

  async showPermissionRequest(permission: string, reason: string): Promise<boolean> {
    try {
      const result = await RealNativeNotification.showPermissionRequest({ permission, reason });
      return result.success;
    } catch (error) {
      console.error('Failed to show permission request:', error);
      return false;
    }
  }

  async clearAllNotifications(): Promise<boolean> {
    try {
      const result = await RealNativeNotification.clearAllNotifications();
      return result.success;
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      return false;
    }
  }

  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const result = await RealNativeNotification.areNotificationsEnabled();
      return result.enabled;
    } catch (error) {
      console.error('Failed to check notification status:', error);
      return false;
    }
  }
}
