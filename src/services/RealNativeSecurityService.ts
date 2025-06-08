import { registerPlugin } from '@capacitor/core';

export interface NativeSecurityPlugin {
  enableScreenshotPrevention(): Promise<{ success: boolean; error?: string }>;
  disableScreenshotPrevention(): Promise<{ success: boolean; error?: string }>;
  enableVolumeKeyCapture(): Promise<{ success: boolean; error?: string }>;
  disableVolumeKeyCapture(): Promise<{ success: boolean; error?: string }>;
  triggerSelfDestruct(options: { confirmCode: string }): Promise<{ success: boolean; error?: string }>;
  enableStealthMode(): Promise<{ success: boolean; error?: string }>;
  disableStealthMode(): Promise<{ success: boolean; error?: string }>;
  startSecurityMonitoring(): Promise<{ success: boolean; error?: string }>;
  stopSecurityMonitoring(): Promise<{ success: boolean; error?: string }>;
  requestDeviceAdmin(): Promise<{ success: boolean; error?: string }>;
  requestOverlayPermission(): Promise<{ success: boolean; error?: string }>;
  getSecurityStatus(): Promise<{ 
    success: boolean; 
    stealthMode: boolean; 
    overlayPermission: boolean; 
    deviceAdmin: boolean; 
    usageStatsPermission: boolean;
    volumeKeyCaptureEnabled: boolean;
    screenshotPrevention: boolean;
    error?: string;
  }>;
}

export interface SecureStoragePlugin {
  storeSecureData(options: { key: string; data: string }): Promise<{ success: boolean; error?: string }>;
  getSecureData(options: { key: string }): Promise<{ success: boolean; data?: string; error?: string }>;
  storeSecureFile(options: { fileName: string; fileData: string }): Promise<{ success: boolean; filePath?: string; error?: string }>;
  getSecureFile(options: { fileName: string }): Promise<{ success: boolean; fileData?: string; error?: string }>;
  deleteSecureFile(options: { fileName: string }): Promise<{ success: boolean; error?: string }>;
  clearAllSecureData(): Promise<{ success: boolean; error?: string }>;
}

const NativeSecurity = registerPlugin<NativeSecurityPlugin>('NativeSecurity');
const SecureStorage = registerPlugin<SecureStoragePlugin>('SecureStorage');

export class RealNativeSecurityService {
  private static instance: RealNativeSecurityService;
  private isInitialized = false;
  private eventListeners: Map<string, Function[]> = new Map();

  static getInstance(): RealNativeSecurityService {
    if (!RealNativeSecurityService.instance) {
      RealNativeSecurityService.instance = new RealNativeSecurityService();
    }
    return RealNativeSecurityService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Start security monitoring on initialization
      await NativeSecurity.startSecurityMonitoring();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('Real native security service initialized');
    } catch (error) {
      console.error('Failed to initialize native security service:', error);
      throw error;
    }
  }

  async executeDialerCode(action: string): Promise<boolean> {
    try {
      console.log(`Executing dialer code action: ${action}`);
      
      // Handle different dialer code actions
      switch (action) {
        case 'register':
          // Register dialer code listener with native layer
          console.log('Registering dialer code listener');
          return true;
        case 'launch_vault':
          // Launch real vault mode
          localStorage.removeItem('vaultix_fake_vault_mode');
          return true;
        case 'launch_fake':
          // Launch fake vault mode
          localStorage.setItem('vaultix_fake_vault_mode', 'true');
          return true;
        case 'stealth_toggle':
          // Toggle stealth mode
          const currentMode = localStorage.getItem('vaultix_stealth_mode') === 'true';
          const newMode = !currentMode;
          localStorage.setItem('vaultix_stealth_mode', newMode.toString());
          
          if (newMode) {
            await this.enableStealthMode();
          } else {
            await this.disableStealthMode();
          }
          return true;
        case 'emergency_wipe':
          // Trigger emergency wipe
          await this.triggerSelfDestruct('EMERGENCY');
          return true;
        default:
          console.warn('Unknown dialer code action:', action);
          return false;
      }
    } catch (error) {
      console.error('Failed to execute dialer code:', error);
      return false;
    }
  }

  private setupEventListeners(): void {
    // Listen for native Android broadcasts
    if (typeof window !== 'undefined') {
      // Volume key events
      document.addEventListener('vaultix.volume.changed', (event: any) => {
        this.emitEvent('volumeKey', event.detail);
      });

      // Security alerts
      document.addEventListener('vaultix.security.alert', (event: any) => {
        this.emitEvent('securityAlert', event.detail);
      });

      // Screenshot detection
      document.addEventListener('vaultix.screenshot.detected', (event: any) => {
        this.emitEvent('screenshotDetected', event.detail);
      });

      // Dialer code events
      document.addEventListener('dialercode', (event: any) => {
        this.emitEvent('dialerCode', event.detail);
      });
    }
  }

  // Native Security Methods
  async enableScreenshotPrevention(): Promise<boolean> {
    try {
      const result = await NativeSecurity.enableScreenshotPrevention();
      if (!result.success && result.error) {
        console.error('Screenshot prevention failed:', result.error);
      }
      return result.success;
    } catch (error) {
      console.error('Failed to enable screenshot prevention:', error);
      return false;
    }
  }

  async disableScreenshotPrevention(): Promise<boolean> {
    try {
      const result = await NativeSecurity.disableScreenshotPrevention();
      return result.success;
    } catch (error) {
      console.error('Failed to disable screenshot prevention:', error);
      return false;
    }
  }

  async enableVolumeKeyCapture(): Promise<boolean> {
    try {
      const result = await NativeSecurity.enableVolumeKeyCapture();
      return result.success;
    } catch (error) {
      console.error('Failed to enable volume key capture:', error);
      return false;
    }
  }

  async disableVolumeKeyCapture(): Promise<boolean> {
    try {
      const result = await NativeSecurity.disableVolumeKeyCapture();
      return result.success;
    } catch (error) {
      console.error('Failed to disable volume key capture:', error);
      return false;
    }
  }

  async enableStealthMode(): Promise<boolean> {
    try {
      const result = await NativeSecurity.enableStealthMode();
      return result.success;
    } catch (error) {
      console.error('Failed to enable stealth mode:', error);
      return false;
    }
  }

  async disableStealthMode(): Promise<boolean> {
    try {
      const result = await NativeSecurity.disableStealthMode();
      return result.success;
    } catch (error) {
      console.error('Failed to disable stealth mode:', error);
      return false;
    }
  }

  async requestDeviceAdmin(): Promise<boolean> {
    try {
      const result = await NativeSecurity.requestDeviceAdmin();
      return result.success;
    } catch (error) {
      console.error('Failed to request device admin:', error);
      return false;
    }
  }

  async requestOverlayPermission(): Promise<boolean> {
    try {
      const result = await NativeSecurity.requestOverlayPermission();
      return result.success;
    } catch (error) {
      console.error('Failed to request overlay permission:', error);
      return false;
    }
  }

  async triggerSelfDestruct(confirmCode: string): Promise<boolean> {
    try {
      const result = await NativeSecurity.triggerSelfDestruct({ confirmCode });
      return result.success;
    } catch (error) {
      console.error('Failed to trigger self destruct:', error);
      return false;
    }
  }

  async getSecurityStatus(): Promise<{
    stealthMode: boolean;
    overlayPermission: boolean;
    deviceAdmin: boolean;
    usageStatsPermission: boolean;
    volumeKeyCaptureEnabled: boolean;
    screenshotPrevention: boolean;
  } | null> {
    try {
      const result = await NativeSecurity.getSecurityStatus();
      if (result.success) {
        return {
          stealthMode: result.stealthMode,
          overlayPermission: result.overlayPermission,
          deviceAdmin: result.deviceAdmin,
          usageStatsPermission: result.usageStatsPermission,
          volumeKeyCaptureEnabled: result.volumeKeyCaptureEnabled,
          screenshotPrevention: result.screenshotPrevention
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get security status:', error);
      return null;
    }
  }

  // Secure Storage Methods
  async storeSecureData(key: string, data: string): Promise<boolean> {
    try {
      const result = await SecureStorage.storeSecureData({ key, data });
      return result.success;
    } catch (error) {
      console.error('Failed to store secure data:', error);
      return false;
    }
  }

  async getSecureData(key: string): Promise<string | null> {
    try {
      const result = await SecureStorage.getSecureData({ key });
      return result.success ? result.data || null : null;
    } catch (error) {
      console.error('Failed to get secure data:', error);
      return null;
    }
  }

  async storeSecureFile(fileName: string, fileData: string): Promise<string | null> {
    try {
      const result = await SecureStorage.storeSecureFile({ fileName, fileData });
      return result.success ? result.filePath || null : null;
    } catch (error) {
      console.error('Failed to store secure file:', error);
      return null;
    }
  }

  async getSecureFile(fileName: string): Promise<string | null> {
    try {
      const result = await SecureStorage.getSecureFile({ fileName });
      return result.success ? result.fileData || null : null;
    } catch (error) {
      console.error('Failed to get secure file:', error);
      return null;
    }
  }

  async deleteSecureFile(fileName: string): Promise<boolean> {
    try {
      const result = await SecureStorage.deleteSecureFile({ fileName });
      return result.success;
    } catch (error) {
      console.error('Failed to delete secure file:', error);
      return false;
    }
  }

  async clearAllSecureData(): Promise<boolean> {
    try {
      const result = await SecureStorage.clearAllSecureData();
      return result.success;
    } catch (error) {
      console.error('Failed to clear all secure data:', error);
      return false;
    }
  }

  // Event management
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}
