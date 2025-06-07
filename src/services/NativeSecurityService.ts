
import { registerPlugin } from '@capacitor/core';

export interface NativeSecurityPlugin {
  enableScreenshotPrevention(): Promise<{ success: boolean }>;
  disableScreenshotPrevention(): Promise<{ success: boolean }>;
  enableVolumeKeyCapture(): Promise<{ success: boolean }>;
  disableVolumeKeyCapture(): Promise<{ success: boolean }>;
  triggerSelfDestruct(options: { confirmCode: string }): Promise<{ success: boolean }>;
  changeAppIcon(options: { iconName: string }): Promise<{ success: boolean }>;
  enableStealthMode(): Promise<{ success: boolean }>;
  disableStealthMode(): Promise<{ success: boolean }>;
  startSecurityMonitoring(): Promise<{ success: boolean }>;
  stopSecurityMonitoring(): Promise<{ success: boolean }>;
  executeDialerCode(options: { code: string }): Promise<{ success: boolean }>;
}

const NativeSecurity = registerPlugin<NativeSecurityPlugin>('NativeSecurity');

export class NativeSecurityService {
  private static instance: NativeSecurityService;
  private isInitialized = false;
  private securityEnabled = false;

  static getInstance(): NativeSecurityService {
    if (!NativeSecurityService.instance) {
      NativeSecurityService.instance = new NativeSecurityService();
    }
    return NativeSecurityService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize native security features
      await this.startSecurityMonitoring();
      
      this.isInitialized = true;
      console.log('Native security service initialized');
    } catch (error) {
      console.log('Native security not available (web mode):', error);
    }
  }

  async enableScreenshotPrevention(): Promise<boolean> {
    try {
      const result = await NativeSecurity.enableScreenshotPrevention();
      console.log('Screenshot prevention enabled:', result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to enable screenshot prevention:', error);
      return false;
    }
  }

  async disableScreenshotPrevention(): Promise<boolean> {
    try {
      const result = await NativeSecurity.disableScreenshotPrevention();
      console.log('Screenshot prevention disabled:', result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to disable screenshot prevention:', error);
      return false;
    }
  }

  async enableVolumeKeyCapture(): Promise<boolean> {
    try {
      const result = await NativeSecurity.enableVolumeKeyCapture();
      console.log('Volume key capture enabled:', result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to enable volume key capture:', error);
      return false;
    }
  }

  async changeAppIcon(iconName: string): Promise<boolean> {
    try {
      const result = await NativeSecurity.changeAppIcon({ iconName });
      console.log('App icon changed:', result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to change app icon:', error);
      return false;
    }
  }

  async enableStealthMode(): Promise<boolean> {
    try {
      // Change icon to calculator
      await this.changeAppIcon('calculator');
      const result = await NativeSecurity.enableStealthMode();
      console.log('Stealth mode enabled:', result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to enable stealth mode:', error);
      return false;
    }
  }

  async disableStealthMode(): Promise<boolean> {
    try {
      // Change icon back to vault
      await this.changeAppIcon('vault');
      const result = await NativeSecurity.disableStealthMode();
      console.log('Stealth mode disabled:', result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to disable stealth mode:', error);
      return false;
    }
  }

  async startSecurityMonitoring(): Promise<boolean> {
    try {
      const result = await NativeSecurity.startSecurityMonitoring();
      this.securityEnabled = result.success;
      console.log('Security monitoring started:', result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to start security monitoring:', error);
      return false;
    }
  }

  async triggerSelfDestruct(confirmCode: string): Promise<boolean> {
    try {
      const result = await NativeSecurity.triggerSelfDestruct({ confirmCode });
      console.log('Self-destruct triggered:', result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to trigger self-destruct:', error);
      return false;
    }
  }

  async executeDialerCode(code: string): Promise<boolean> {
    try {
      const result = await NativeSecurity.executeDialerCode({ code });
      console.log('Dialer code executed:', result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to execute dialer code:', error);
      return false;
    }
  }

  isSecurityActive(): boolean {
    return this.securityEnabled;
  }
}
