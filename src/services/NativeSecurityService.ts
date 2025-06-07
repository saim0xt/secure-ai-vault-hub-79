
import { registerPlugin } from '@capacitor/core';

export interface NativeSecurityPlugin {
  enableScreenshotPrevention(): Promise<{ success: boolean }>;
  disableScreenshotPrevention(): Promise<{ success: boolean }>;
  enableVolumeKeyCapture(): Promise<{ success: boolean }>;
  disableVolumeKeyCapture(): Promise<{ success: boolean }>;
  triggerSelfDestruct(options: { confirmCode: string }): Promise<{ success: boolean }>;
  changeAppIcon(options: { iconName: string }): Promise<{ success: boolean; stealth?: boolean }>;
  enableStealthMode(): Promise<{ success: boolean }>;
  disableStealthMode(): Promise<{ success: boolean }>;
  startSecurityMonitoring(): Promise<{ success: boolean }>;
  stopSecurityMonitoring(): Promise<{ success: boolean }>;
  executeDialerCode(options: { code: string }): Promise<{ success: boolean }>;
  startAutoBackup(): Promise<{ success: boolean }>;
  getSecurityStatus(): Promise<{ 
    success: boolean; 
    stealthMode: boolean; 
    overlayPermission: boolean; 
    deviceAdmin: boolean; 
    usageStatsPermission: boolean; 
  }>;
}

const NativeSecurity = registerPlugin<NativeSecurityPlugin>('NativeSecurity');

export class NativeSecurityService {
  private static instance: NativeSecurityService;
  private isInitialized = false;
  private securityEnabled = false;
  private stealthMode = false;
  private eventListeners: Map<string, Function[]> = new Map();

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
      await this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('Native security service initialized');
    } catch (error) {
      console.log('Native security not available (web mode):', error);
    }
  }

  private async setupEventListeners(): Promise<void> {
    // Setup broadcast receivers for Android events
    if (typeof window !== 'undefined') {
      // Listen for security alerts
      document.addEventListener('vaultix.security.alert', (event: any) => {
        this.handleSecurityAlert(event.detail);
      });

      // Listen for volume key events
      document.addEventListener('vaultix.volume.changed', (event: any) => {
        this.handleVolumeKeyEvent(event.detail);
      });

      // Listen for emergency patterns
      document.addEventListener('vaultix.emergency.pattern', (event: any) => {
        this.handleEmergencyPattern(event.detail);
      });

      // Listen for network changes
      document.addEventListener('vaultix.network.changed', (event: any) => {
        this.handleNetworkChange(event.detail);
      });

      // Listen for screen state changes
      document.addEventListener('vaultix.screen.state', (event: any) => {
        this.handleScreenStateChange(event.detail);
      });

      // Listen for secret dialer access
      document.addEventListener('vaultix.secret.access', (event: any) => {
        this.handleSecretAccess(event.detail);
      });
    }
  }

  private handleSecurityAlert(data: any): void {
    console.warn('Security Alert:', data);
    this.emitEvent('securityAlert', data);
  }

  private handleVolumeKeyEvent(data: any): void {
    console.log('Volume key event:', data);
    this.emitEvent('volumeKey', data);
  }

  private handleEmergencyPattern(data: any): void {
    console.warn('Emergency pattern detected:', data);
    this.emitEvent('emergencyPattern', data);
  }

  private handleNetworkChange(data: any): void {
    console.log('Network changed:', data);
    this.emitEvent('networkChange', data);
  }

  private handleScreenStateChange(data: any): void {
    console.log('Screen state changed:', data);
    this.emitEvent('screenState', data);
  }

  private handleSecretAccess(data: any): void {
    console.log('Secret access detected:', data);
    this.emitEvent('secretAccess', data);
  }

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
      if (result.stealth !== undefined) {
        this.stealthMode = result.stealth;
      }
      console.log('App icon changed:', result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to change app icon:', error);
      return false;
    }
  }

  async enableStealthMode(): Promise<boolean> {
    try {
      const result = await NativeSecurity.enableStealthMode();
      if (result.success) {
        this.stealthMode = true;
      }
      console.log('Stealth mode enabled:', result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to enable stealth mode:', error);
      return false;
    }
  }

  async disableStealthMode(): Promise<boolean> {
    try {
      const result = await NativeSecurity.disableStealthMode();
      if (result.success) {
        this.stealthMode = false;
      }
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

  async startAutoBackup(): Promise<boolean> {
    try {
      const result = await NativeSecurity.startAutoBackup();
      console.log('Auto backup started:', result.success);
      return result.success;
    } catch (error) {
      console.error('Failed to start auto backup:', error);
      return false;
    }
  }

  async getSecurityStatus(): Promise<{
    stealthMode: boolean;
    overlayPermission: boolean;
    deviceAdmin: boolean;
    usageStatsPermission: boolean;
  } | null> {
    try {
      const result = await NativeSecurity.getSecurityStatus();
      if (result.success) {
        this.stealthMode = result.stealthMode;
        return {
          stealthMode: result.stealthMode,
          overlayPermission: result.overlayPermission,
          deviceAdmin: result.deviceAdmin,
          usageStatsPermission: result.usageStatsPermission
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get security status:', error);
      return null;
    }
  }

  isSecurityActive(): boolean {
    return this.securityEnabled;
  }

  isStealthModeActive(): boolean {
    return this.stealthMode;
  }
}
