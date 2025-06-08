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
  enableStealthMode(): Promise<{ success: boolean }>;
  disableStealthMode(): Promise<{ success: boolean }>;
  executeDialerCode(options: { code: string }): Promise<{ success: boolean }>;
  triggerSelfDestruct(options: { confirmation: string }): Promise<{ success: boolean }>;
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
    wipeSecureData: async () => ({ success: false }),
    enableStealthMode: async () => ({ success: false }),
    disableStealthMode: async () => ({ success: false }),
    executeDialerCode: async () => ({ success: false }),
    triggerSelfDestruct: async () => ({ success: false })
  }
});

export class RealNativeSecurityService {
  private static instance: RealNativeSecurityService;
  private fileHidingService: any;

  static getInstance(): RealNativeSecurityService {
    if (!RealNativeSecurityService.instance) {
      RealNativeSecurityService.instance = new RealNativeSecurityService();
    }
    return RealNativeSecurityService.instance;
  }

  constructor() {
    // Import file hiding service dynamically to avoid circular dependencies
    this.initializeFileHiding();
  }

  private async initializeFileHiding() {
    try {
      const { RealFileHidingService } = await import('./RealFileHidingService');
      this.fileHidingService = RealFileHidingService.getInstance();
    } catch (error) {
      console.error('Failed to initialize file hiding service:', error);
    }
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

  async enableStealthMode(): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.enableStealthMode();
      return result.success;
    } catch (error) {
      console.error('Failed to enable stealth mode:', error);
      return false;
    }
  }

  async disableStealthMode(): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.disableStealthMode();
      return result.success;
    } catch (error) {
      console.error('Failed to disable stealth mode:', error);
      return false;
    }
  }

  async executeDialerCode(code: string): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.executeDialerCode({ code });
      return result.success;
    } catch (error) {
      console.error('Failed to execute dialer code:', error);
      return false;
    }
  }

  async triggerSelfDestruct(confirmation: string): Promise<boolean> {
    try {
      const result = await RealNativeSecurity.triggerSelfDestruct({ confirmation });
      return result.success;
    } catch (error) {
      console.error('Failed to trigger self destruct:', error);
      return false;
    }
  }

  async getVisibleFiles(): Promise<string[]> {
    try {
      if (!this.fileHidingService) {
        await this.initializeFileHiding();
      }
      return this.fileHidingService ? await this.fileHidingService.getVisibleFiles() : [];
    } catch (error) {
      console.error('Failed to get visible files:', error);
      return [];
    }
  }

  async getHiddenFiles(): Promise<string[]> {
    try {
      if (!this.fileHidingService) {
        await this.initializeFileHiding();
      }
      return this.fileHidingService ? await this.fileHidingService.getHiddenFiles() : [];
    } catch (error) {
      console.error('Failed to get hidden files:', error);
      return [];
    }
  }

  async hideFile(fileName: string): Promise<boolean> {
    try {
      if (!this.fileHidingService) {
        await this.initializeFileHiding();
      }
      return this.fileHidingService ? await this.fileHidingService.hideFile(fileName) : false;
    } catch (error) {
      console.error('Failed to hide file:', error);
      return false;
    }
  }

  async showFile(fileName: string): Promise<boolean> {
    try {
      if (!this.fileHidingService) {
        await this.initializeFileHiding();
      }
      return this.fileHidingService ? await this.fileHidingService.showFile(fileName) : false;
    } catch (error) {
      console.error('Failed to show file:', error);
      return false;
    }
  }
}
