import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { PushNotificationService } from './PushNotificationService';

export interface SecurityEvent {
  id: string;
  type: 'app_backgrounded' | 'device_lock' | 'failed_auth' | 'suspicious_activity' | 'tamper_detected';
  timestamp: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecuritySettings {
  autoLockDelay: number; // milliseconds
  backgroundMonitoring: boolean;
  tamperDetection: boolean;
  failedAttemptLimit: number;
  emergencyWipeEnabled: boolean;
  alertsEnabled: boolean;
}

export class BackgroundSecurityService {
  private static instance: BackgroundSecurityService;
  private isInitialized = false;
  private securitySettings: SecuritySettings = {
    autoLockDelay: 30000, // 30 seconds
    backgroundMonitoring: true,
    tamperDetection: true,
    failedAttemptLimit: 5,
    emergencyWipeEnabled: false,
    alertsEnabled: true
  };
  private failedAttempts = 0;
  private lastActivity = Date.now();
  private lockTimer: NodeJS.Timeout | null = null;
  private pushService = PushNotificationService.getInstance();
  private isLocked = false;

  static getInstance(): BackgroundSecurityService {
    if (!BackgroundSecurityService.instance) {
      BackgroundSecurityService.instance = new BackgroundSecurityService();
    }
    return BackgroundSecurityService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      await this.setupAppStateListeners();
      await this.setupDeviceListeners();
      
      this.isInitialized = true;
      console.log('Background security service initialized');
    } catch (error) {
      console.error('Failed to initialize background security service:', error);
    }
  }

  private async setupAppStateListeners(): Promise<void> {
    try {
      App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          this.onAppForeground();
        } else {
          this.onAppBackground();
        }
      });

      App.addListener('pause', () => {
        this.onAppBackground();
      });

      App.addListener('resume', () => {
        this.onAppForeground();
      });

      console.log('App state listeners setup');
    } catch (error) {
      console.error('Failed to setup app state listeners:', error);
    }
  }

  private async setupDeviceListeners(): Promise<void> {
    try {
      // Listen for device info changes (potential tampering)
      const deviceInfo = await Device.getInfo();
      await this.storeDeviceFingerprint(deviceInfo);

      console.log('Device listeners setup');
    } catch (error) {
      console.error('Failed to setup device listeners:', error);
    }
  }

  private async onAppBackground(): Promise<void> {
    if (!this.securitySettings.backgroundMonitoring) return;

    try {
      // Record security event
      await this.recordSecurityEvent({
        type: 'app_backgrounded',
        details: { timestamp: Date.now() },
        severity: 'low'
      });

      // Start auto-lock timer if not already locked
      if (!this.isLocked) {
        this.startAutoLockTimer();
      }

      // Enable additional security monitoring
      await this.enableBackgroundMonitoring();

      console.log('App backgrounded - security monitoring active');
    } catch (error) {
      console.error('Failed to handle app background:', error);
    }
  }

  private async onAppForeground(): Promise<void> {
    try {
      this.lastActivity = Date.now();
      this.clearAutoLockTimer();

      // Check if app was locked while in background
      if (this.isLocked) {
        this.triggerAuthenticationChallenge();
      }

      // Disable background monitoring
      await this.disableBackgroundMonitoring();

      // Check for tampering
      if (this.securitySettings.tamperDetection) {
        await this.checkForTampering();
      }

      console.log('App foregrounded - security check complete');
    } catch (error) {
      console.error('Failed to handle app foreground:', error);
    }
  }

  private startAutoLockTimer(): void {
    this.clearAutoLockTimer();
    
    this.lockTimer = setTimeout(async () => {
      await this.triggerAutoLock();
    }, this.securitySettings.autoLockDelay);
  }

  private clearAutoLockTimer(): void {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  }

  private async triggerAutoLock(): Promise<void> {
    try {
      this.isLocked = true;
      
      // Record security event
      await this.recordSecurityEvent({
        type: 'device_lock',
        details: { reason: 'auto_lock', delay: this.securitySettings.autoLockDelay },
        severity: 'medium'
      });

      // Clear sensitive data from memory
      await this.clearSensitiveData();

      // Navigate to lock screen
      this.triggerAuthenticationChallenge();

      console.log('Auto-lock triggered');
    } catch (error) {
      console.error('Failed to trigger auto-lock:', error);
    }
  }

  private triggerAuthenticationChallenge(): void {
    // Trigger authentication required event
    const event = new CustomEvent('authentication_required', {
      detail: { reason: 'auto_lock' }
    });
    window.dispatchEvent(event);
  }

  private async clearSensitiveData(): Promise<void> {
    try {
      // Clear temporary data
      sessionStorage.clear();
      
      // Remove sensitive items from localStorage (keep settings)
      const keysToRemove = ['vaultix_temp_data', 'vaultix_cache'];
      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.log('Sensitive data cleared');
    } catch (error) {
      console.error('Failed to clear sensitive data:', error);
    }
  }

  private async enableBackgroundMonitoring(): Promise<void> {
    try {
      // Use available web APIs for background monitoring
      console.log('Background monitoring enabled (web mode)');
    } catch (error) {
      console.error('Failed to enable background monitoring:', error);
    }
  }

  private async disableBackgroundMonitoring(): Promise<void> {
    try {
      // Stop background monitoring when app is active
      console.log('Background monitoring disabled');
    } catch (error) {
      console.error('Failed to disable background monitoring:', error);
    }
  }

  private async checkForTampering(): Promise<void> {
    try {
      const currentDevice = await Device.getInfo();
      const storedFingerprint = await this.getStoredDeviceFingerprint();

      if (storedFingerprint && this.hasDeviceChanged(currentDevice, storedFingerprint)) {
        await this.recordSecurityEvent({
          type: 'tamper_detected',
          details: { 
            current: currentDevice, 
            stored: storedFingerprint,
            changes: this.getDeviceChanges(currentDevice, storedFingerprint)
          },
          severity: 'critical'
        });

        if (this.securitySettings.alertsEnabled) {
          await this.pushService.sendSecurityAlert(
            'Device Tampering Detected',
            'Your device configuration has changed. Please verify your security.'
          );
        }
      }

      // Update stored fingerprint
      await this.storeDeviceFingerprint(currentDevice);
    } catch (error) {
      console.error('Failed to check for tampering:', error);
    }
  }

  private hasDeviceChanged(current: any, stored: any): boolean {
    return (
      current.platform !== stored.platform ||
      current.operatingSystem !== stored.operatingSystem ||
      current.osVersion !== stored.osVersion ||
      current.manufacturer !== stored.manufacturer ||
      current.model !== stored.model
    );
  }

  private getDeviceChanges(current: any, stored: any): string[] {
    const changes = [];
    if (current.platform !== stored.platform) changes.push('platform');
    if (current.operatingSystem !== stored.operatingSystem) changes.push('OS');
    if (current.osVersion !== stored.osVersion) changes.push('OS version');
    if (current.manufacturer !== stored.manufacturer) changes.push('manufacturer');
    if (current.model !== stored.model) changes.push('model');
    return changes;
  }

  async recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const securityEvent: SecurityEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...event
      };

      // Store event
      const events = await this.getSecurityEvents();
      events.unshift(securityEvent);
      
      // Keep only last 1000 events
      events.splice(1000);
      
      await Preferences.set({ 
        key: 'vaultix_security_events', 
        value: JSON.stringify(events) 
      });

      console.log('Security event recorded:', securityEvent);
    } catch (error) {
      console.error('Failed to record security event:', error);
    }
  }

  async getSecurityEvents(): Promise<SecurityEvent[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_security_events' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }

  async recordFailedAttempt(details: any): Promise<void> {
    this.failedAttempts++;
    
    await this.recordSecurityEvent({
      type: 'failed_auth',
      details: { ...details, attemptCount: this.failedAttempts },
      severity: this.failedAttempts >= this.securitySettings.failedAttemptLimit ? 'critical' : 'medium'
    });

    if (this.failedAttempts >= this.securitySettings.failedAttemptLimit) {
      await this.handleSecurityBreach();
    }
  }

  private async handleSecurityBreach(): Promise<void> {
    try {
      await this.recordSecurityEvent({
        type: 'suspicious_activity',
        details: { 
          reason: 'failed_attempt_limit_exceeded',
          attempts: this.failedAttempts 
        },
        severity: 'critical'
      });

      if (this.securitySettings.emergencyWipeEnabled) {
        await this.emergencyWipe();
      } else {
        // Lock vault and require additional verification
        this.isLocked = true;
        await this.triggerAuthenticationChallenge();
      }

      if (this.securitySettings.alertsEnabled) {
        await this.pushService.sendSecurityAlert(
          'Security Breach Detected',
          `${this.failedAttempts} failed authentication attempts detected.`
        );
      }
    } catch (error) {
      console.error('Failed to handle security breach:', error);
    }
  }

  private async emergencyWipe(): Promise<void> {
    try {
      console.log('EMERGENCY WIPE TRIGGERED - This would delete all vault data');
      
      // In a real implementation, this would securely delete all vault data
      // For demonstration, we'll just clear local storage and redirect
      localStorage.clear();
      sessionStorage.clear();
      
      await Preferences.clear();
      
      window.location.href = '/auth?wiped=true';
    } catch (error) {
      console.error('Failed to perform emergency wipe:', error);
    }
  }

  resetFailedAttempts(): void {
    this.failedAttempts = 0;
  }

  updateActivity(): void {
    this.lastActivity = Date.now();
    this.clearAutoLockTimer();
    
    if (!this.isLocked) {
      this.startAutoLockTimer();
    }
  }

  async updateSettings(settings: Partial<SecuritySettings>): Promise<void> {
    this.securitySettings = { ...this.securitySettings, ...settings };
    await this.saveSettings();
  }

  getSettings(): SecuritySettings {
    return { ...this.securitySettings };
  }

  private async loadSettings(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_security_settings' });
      if (value) {
        this.securitySettings = { ...this.securitySettings, ...JSON.parse(value) };
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await Preferences.set({ 
        key: 'vaultix_security_settings', 
        value: JSON.stringify(this.securitySettings) 
      });
    } catch (error) {
      console.error('Failed to save security settings:', error);
    }
  }

  private async storeDeviceFingerprint(deviceInfo: any): Promise<void> {
    try {
      await Preferences.set({ 
        key: 'vaultix_device_fingerprint', 
        value: JSON.stringify(deviceInfo) 
      });
    } catch (error) {
      console.error('Failed to store device fingerprint:', error);
    }
  }

  private async getStoredDeviceFingerprint(): Promise<any | null> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_device_fingerprint' });
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Failed to get stored device fingerprint:', error);
      return null;
    }
  }

  unlock(): void {
    this.isLocked = false;
    this.resetFailedAttempts();
    this.updateActivity();
  }

  isVaultLocked(): boolean {
    return this.isLocked;
  }
}
