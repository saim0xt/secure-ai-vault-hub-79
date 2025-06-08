import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { PushNotificationService } from './PushNotificationService';
import { RealNativeSecurityService } from './RealNativeSecurityService';
import { RealNativeNotificationService } from './RealNativeNotificationService';

export interface SecurityEvent {
  id: string;
  type: 'app_backgrounded' | 'device_lock' | 'failed_auth' | 'suspicious_activity' | 'tamper_detected';
  timestamp: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecuritySettings {
  autoLockDelay: number;
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
    autoLockDelay: 300000, // 5 minutes
    backgroundMonitoring: true,
    tamperDetection: true,
    failedAttemptLimit: 3,
    emergencyWipeEnabled: false,
    alertsEnabled: true
  };
  private monitoringInterval: NodeJS.Timeout | null = null;
  private securityService = RealNativeSecurityService.getInstance();
  private notificationService = RealNativeNotificationService.getInstance();

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
      await this.securityService.initialize();
      
      if (this.securitySettings.backgroundMonitoring) {
        await this.startMonitoring();
      }

      this.isInitialized = true;
      console.log('Background security service initialized');
    } catch (error) {
      console.error('Failed to initialize background security service:', error);
      throw error;
    }
  }

  private async setupAppStateListeners(): Promise<void> {
    // Listen for app state changes
    App.addListener('appStateChange', async (state) => {
      if (state.isActive === false) {
        await this.handleAppBackgrounded();
      } else {
        await this.handleAppForegrounded();
      }
    });

    // Setup device ready listener differently - Device doesn't have addListener
    try {
      const deviceInfo = await Device.getInfo();
      console.log('Device ready:', deviceInfo);
      await this.handleDeviceReady();
    } catch (error) {
      console.error('Failed to get device info:', error);
    }
  }

  private async handleAppBackgrounded(): Promise<void> {
    const event: SecurityEvent = {
      id: `bg_${Date.now()}`,
      type: 'app_backgrounded',
      timestamp: new Date().toISOString(),
      details: { reason: 'app_backgrounded' },
      severity: 'low'
    };

    await this.logSecurityEvent(event);

    // Enable screenshot prevention when app is backgrounded
    if (this.securitySettings.backgroundMonitoring) {
      await this.securityService.enableScreenshotPrevention();
    }
  }

  private async handleAppForegrounded(): Promise<void> {
    // Verify app integrity when returning to foreground
    if (this.securitySettings.tamperDetection) {
      const tamperResult = await this.securityService.detectTamperAttempts();
      
      if (tamperResult.tampering) {
        const event: SecurityEvent = {
          id: `tamper_${Date.now()}`,
          type: 'tamper_detected',
          timestamp: new Date().toISOString(),
          details: tamperResult.details,
          severity: 'critical'
        };

        await this.logSecurityEvent(event);
        await this.handleSecurityThreat(event);
      }
    }
  }

  private async handleDeviceReady(): Promise<void> {
    // Device is ready, start monitoring
    if (this.securitySettings.backgroundMonitoring) {
      await this.startMonitoring();
    }
  }

  private async startMonitoring(): Promise<void> {
    if (this.monitoringInterval) return;

    await this.securityService.startRealTimeMonitoring();

    this.monitoringInterval = setInterval(async () => {
      await this.performSecurityCheck();
    }, 30000); // Check every 30 seconds

    console.log('Background security monitoring started');
  }

  private async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    await this.securityService.stopRealTimeMonitoring();
    console.log('Background security monitoring stopped');
  }

  private async performSecurityCheck(): Promise<void> {
    try {
      if (!this.securitySettings.tamperDetection) return;

      const tamperResult = await this.securityService.detectTamperAttempts();
      
      if (tamperResult.tampering) {
        const event: SecurityEvent = {
          id: `check_${Date.now()}`,
          type: 'tamper_detected',
          timestamp: new Date().toISOString(),
          details: tamperResult.details,
          severity: 'high'
        };

        await this.logSecurityEvent(event);
        await this.handleSecurityThreat(event);
      }
    } catch (error) {
      console.error('Security check failed:', error);
    }
  }

  private async handleSecurityThreat(event: SecurityEvent): Promise<void> {
    console.warn('Security threat detected:', event);

    if (this.securitySettings.alertsEnabled) {
      // Send notification
      await this.notificationService.showSecurityAlert(
        'Security Threat Detected',
        `${event.type}: ${event.details.reason || 'Unknown threat'}`,
        'threat_detected'
      );

      // Capture intruder photo if available
      try {
        const photoPath = await this.securityService.captureIntruderPhoto();
        if (photoPath) {
          await this.notificationService.showSecurityAlert(
            'Intruder Photo Captured',
            'Security breach documented with photo evidence',
            'photo_captured'
          );
        }
      } catch (error) {
        console.error('Failed to capture intruder photo:', error);
      }
    }

    // Handle based on severity
    switch (event.severity) {
      case 'critical':
        if (this.securitySettings.emergencyWipeEnabled) {
          await this.triggerEmergencyWipe();
        }
        break;
      case 'high':
        await this.securityService.enableSecureMode();
        break;
      case 'medium':
        // Increase monitoring frequency temporarily
        break;
    }
  }

  private async triggerEmergencyWipe(): Promise<void> {
    console.warn('Emergency wipe triggered');
    
    try {
      await this.notificationService.showSecurityAlert(
        'EMERGENCY WIPE INITIATED',
        'Critical security threat detected. Data wipe in progress.',
        'emergency_wipe'
      );

      await this.securityService.wipeSecureData();
      
      // Clear all app data
      await Preferences.clear();
      
      // Redirect to auth screen
      window.location.href = '/auth';
    } catch (error) {
      console.error('Emergency wipe failed:', error);
    }
  }

  async updateSettings(newSettings: Partial<SecuritySettings>): Promise<void> {
    this.securitySettings = { ...this.securitySettings, ...newSettings };
    await this.saveSettings();

    // Restart monitoring if settings changed
    if (newSettings.backgroundMonitoring !== undefined) {
      if (newSettings.backgroundMonitoring) {
        await this.startMonitoring();
      } else {
        await this.stopMonitoring();
      }
    }
  }

  async getSettings(): Promise<SecuritySettings> {
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

  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_security_events' });
      const events: SecurityEvent[] = value ? JSON.parse(value) : [];
      
      events.unshift(event);
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(100);
      }
      
      await Preferences.set({
        key: 'vaultix_security_events',
        value: JSON.stringify(events)
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
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

  async clearSecurityEvents(): Promise<void> {
    try {
      await Preferences.remove({ key: 'vaultix_security_events' });
    } catch (error) {
      console.error('Failed to clear security events:', error);
    }
  }
}
