
import { registerPlugin } from '@capacitor/core';

export interface NativeSecurityPlugin {
  initialize(): Promise<{ success: boolean }>;
  checkPermissions(): Promise<{ 
    camera: boolean; 
    microphone: boolean; 
    location: boolean; 
    storage: boolean; 
    phone: boolean; 
    overlay: boolean; 
    deviceAdmin: boolean; 
    usageStats: boolean; 
  }>;
  requestAllPermissions(): Promise<{ success: boolean }>;
  requestSpecificPermission(options: { permission: string }): Promise<{ success: boolean }>;
  openAppSettings(): Promise<{ success: boolean }>;
  enableScreenshotPrevention(): Promise<{ success: boolean }>;
  disableScreenshotPrevention(): Promise<{ success: boolean }>;
  enableAppHiding(options: { calculatorMode: boolean }): Promise<{ success: boolean }>;
  disableAppHiding(): Promise<{ success: boolean }>;
  startRealTimeMonitoring(): Promise<{ success: boolean }>;
  stopRealTimeMonitoring(): Promise<{ success: boolean }>;
  captureIntruderPhoto(): Promise<{ success: boolean; photoPath?: string }>;
  detectTamperAttempts(): Promise<{ success: boolean; tampering: boolean; details: any }>;
  enableSecureMode(): Promise<{ success: boolean }>;
  disableSecureMode(): Promise<{ success: boolean }>;
  wipeSecureData(): Promise<{ success: boolean }>;
}

export interface SecureStoragePlugin {
  store(options: { key: string; value: string; encrypted: boolean }): Promise<{ success: boolean }>;
  retrieve(options: { key: string; encrypted: boolean }): Promise<{ success: boolean; value?: string }>;
  remove(options: { key: string }): Promise<{ success: boolean }>;
  clear(): Promise<{ success: boolean }>;
}

const RealNativeSecurity = registerPlugin<NativeSecurityPlugin>('ProductionSecurity', {
  web: {
    initialize: async () => ({ success: true }),
    checkPermissions: async () => ({
      camera: false,
      microphone: false,
      location: false,
      storage: false,
      phone: false,
      overlay: false,
      deviceAdmin: false,
      usageStats: false
    }),
    requestAllPermissions: async () => ({ success: false }),
    requestSpecificPermission: async () => ({ success: false }),
    openAppSettings: async () => ({ success: false }),
    enableScreenshotPrevention: async () => ({ success: false }),
    disableScreenshotPrevention: async () => ({ success: false }),
    enableAppHiding: async () => ({ success: false }),
    disableAppHiding: async () => ({ success: false }),
    startRealTimeMonitoring: async () => ({ success: false }),
    stopRealTimeMonitoring: async () => ({ success: false }),
    captureIntruderPhoto: async () => ({ success: false }),
    detectTamperAttempts: async () => ({ success: false, tampering: false, details: {} }),
    enableSecureMode: async () => ({ success: false }),
    disableSecureMode: async () => ({ success: false }),
    wipeSecureData: async () => ({ success: false })
  }
});

export class RealNativeSecurityService {
  private static instance: RealNativeSecurityService;

  static getInstance(): RealNativeSecurityService {
    if (!RealNativeSecurityService.instance) {
      RealNativeSecurityService.instance = new RealNativeSecurityService();
    }
    return RealNativeSecurityService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const result = await RealNativeSecurity.initialize();
      if (!result.success) {
        throw new Error('Failed to initialize native security');
      }
      console.log('Real native security service initialized');
    } catch (error) {
      console.error('Failed to initialize native security service:', error);
    }
  }

  async checkPermissions(): Promise<any> {
    try {
      return await RealNativeSecurity.checkPermissions();
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
      const result = await RealNativeSecurity.requestAllPermissions();
      return result.success;
    } catch (error) {
      console.error('Failed to request all permissions:', error);
      return false;
    }
  }

  async requestSpecificPermission(permission: string): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.requestSpecificPermission({ permission });
      return result.success;
    } catch (error) {
      console.error(`Failed to request ${permission} permission:`, error);
      return false;
    }
  }

  async openAppSettings(): Promise<void> {
    try {
      await RealNativeSecurity.openAppSettings();
    } catch (error) {
      console.error('Failed to open app settings:', error);
    }
  }

  async enableScreenshotPrevention(): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.enableScreenshotPrevention();
      return result.success;
    } catch (error) {
      console.error('Failed to enable screenshot prevention:', error);
      return false;
    }
  }

  async disableScreenshotPrevention(): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.disableScreenshotPrevention();
      return result.success;
    } catch (error) {
      console.error('Failed to disable screenshot prevention:', error);
      return false;
    }
  }

  async enableAppHiding(calculatorMode: boolean = true): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.enableAppHiding({ calculatorMode });
      return result.success;
    } catch (error) {
      console.error('Failed to enable app hiding:', error);
      return false;
    }
  }

  async disableAppHiding(): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.disableAppHiding();
      return result.success;
    } catch (error) {
      console.error('Failed to disable app hiding:', error);
      return false;
    }
  }

  async startRealTimeMonitoring(): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.startRealTimeMonitoring();
      return result.success;
    } catch (error) {
      console.error('Failed to start real-time monitoring:', error);
      return false;
    }
  }

  async stopRealTimeMonitoring(): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.stopRealTimeMonitoring();
      return result.success;
    } catch (error) {
      console.error('Failed to stop real-time monitoring:', error);
      return false;
    }
  }

  async captureIntruderPhoto(): Promise<string | null> {
    try {
      const result = await RealNativeSecurity.captureIntruderPhoto();
      return result.success ? result.photoPath || null : null;
    } catch (error) {
      console.error('Failed to capture intruder photo:', error);
      return null;
    }
  }

  async detectTamperAttempts(): Promise<{ tampering: boolean; details: any }> {
    try {
      const result = await RealNativeSecurity.detectTamperAttempts();
      return {
        tampering: result.tampering,
        details: result.details
      };
    } catch (error) {
      console.error('Failed to detect tamper attempts:', error);
      return { tampering: false, details: {} };
    }
  }

  async enableSecureMode(): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.enableSecureMode();
      return result.success;
    } catch (error) {
      console.error('Failed to enable secure mode:', error);
      return false;
    }
  }

  async disableSecureMode(): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.disableSecureMode();
      return result.success;
    } catch (error) {
      console.error('Failed to disable secure mode:', error);
      return false;
    }
  }

  async wipeSecureData(): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.wipeSecureData();
      return result.success;
    } catch (error) {
      console.error('Failed to wipe secure data:', error);
      return false;
    }
  }
}
