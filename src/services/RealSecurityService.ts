import { registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { RealIntruderDetection } from '@/components/security/RealIntruderDetection';
import { AndroidPermissionsService } from './AndroidPermissionsService';

export interface SecurityEventData {
  type: 'screenshot_attempt' | 'app_hidden' | 'unauthorized_access' | 'tamper_detected' | 'volume_pattern';
  timestamp: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityPlugin {
  startSecurityMonitoring(): Promise<{ success: boolean }>;
  stopSecurityMonitoring(): Promise<{ success: boolean }>;
  enableScreenshotPrevention(): Promise<{ success: boolean }>;
  disableScreenshotPrevention(): Promise<{ success: boolean }>;
  setSecureFlags(): Promise<{ success: boolean }>;
  clearSecureFlags(): Promise<{ success: boolean }>;
  detectTampering(): Promise<{ tampered: boolean; details?: any }>;
  enableStealthMode(): Promise<{ success: boolean }>;
  disableStealthMode(): Promise<{ success: boolean }>;
  getSecurityStatus(): Promise<{ 
    monitoring: boolean; 
    screenshotPrevention: boolean; 
    stealthMode: boolean;
    lastTamperCheck: string;
  }>;
}

const SecurityPlugin = registerPlugin<SecurityPlugin>('Security');

export class RealSecurityService {
  private static instance: RealSecurityService;
  private permissionsService = AndroidPermissionsService.getInstance();
  private isMonitoring = false;
  private securityEventListeners: Map<string, Function[]> = new Map();
  
  static getInstance(): RealSecurityService {
    if (!RealSecurityService.instance) {
      RealSecurityService.instance = new RealSecurityService();
    }
    return RealSecurityService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize intruder detection
      await RealIntruderDetection.initialize();
      
      // Setup security event listeners
      await this.setupNativeEventListeners();
      
      // Start basic security monitoring
      await this.startSecurityMonitoring();
      
      console.log('Real security service initialized');
    } catch (error) {
      console.error('Failed to initialize security service:', error);
    }
  }

  private async setupNativeEventListeners(): Promise<void> {
    try {
      // Listen for native security events
      document.addEventListener('vaultix.security.alert', (event: any) => {
        this.handleSecurityAlert(event.detail);
      });

      document.addEventListener('vaultix.volume.changed', (event: any) => {
        this.handleVolumeEvent(event.detail);
      });

      document.addEventListener('vaultix.screen.state', (event: any) => {
        this.handleScreenStateChange(event.detail);
      });

      document.addEventListener('vaultix.network.changed', (event: any) => {
        this.handleNetworkChange(event.detail);
      });

      // Listen for app state changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.handleAppHidden();
        } else {
          this.handleAppVisible();
        }
      });

      console.log('Native security event listeners setup');
    } catch (error) {
      console.error('Failed to setup security event listeners:', error);
    }
  }

  async startSecurityMonitoring(): Promise<boolean> {
    try {
      // Request necessary permissions first
      const permissions = await Promise.all([
        this.permissionsService.requestOverlayPermission(),
        this.permissionsService.requestUsageStatsPermission()
      ]);

      // Start native security monitoring
      const result = await SecurityPlugin.startSecurityMonitoring();
      
      if (result.success) {
        this.isMonitoring = true;
        await this.recordSecurityEvent({
          type: 'screenshot_attempt',
          details: { action: 'monitoring_started' },
          severity: 'low'
        });
      }

      return result.success;
    } catch (error) {
      console.error('Failed to start security monitoring:', error);
      return false;
    }
  }

  async stopSecurityMonitoring(): Promise<boolean> {
    try {
      const result = await SecurityPlugin.stopSecurityMonitoring();
      
      if (result.success) {
        this.isMonitoring = false;
        await this.recordSecurityEvent({
          type: 'screenshot_attempt',
          details: { action: 'monitoring_stopped' },
          severity: 'low'
        });
      }

      return result.success;
    } catch (error) {
      console.error('Failed to stop security monitoring:', error);
      return false;
    }
  }

  async enableScreenshotPrevention(): Promise<boolean> {
    try {
      // First set secure flags on current activity
      await SecurityPlugin.setSecureFlags();
      
      // Then enable system-wide screenshot prevention
      const result = await SecurityPlugin.enableScreenshotPrevention();
      
      if (result.success) {
        await this.recordSecurityEvent({
          type: 'screenshot_attempt',
          details: { action: 'prevention_enabled' },
          severity: 'medium'
        });
      }

      return result.success;
    } catch (error) {
      console.error('Failed to enable screenshot prevention:', error);
      return false;
    }
  }

  async disableScreenshotPrevention(): Promise<boolean> {
    try {
      // Clear secure flags
      await SecurityPlugin.clearSecureFlags();
      
      // Disable system-wide screenshot prevention
      const result = await SecurityPlugin.disableScreenshotPrevention();
      
      if (result.success) {
        await this.recordSecurityEvent({
          type: 'screenshot_attempt',
          details: { action: 'prevention_disabled' },
          severity: 'low'
        });
      }

      return result.success;
    } catch (error) {
      console.error('Failed to disable screenshot prevention:', error);
      return false;
    }
  }

  async enableStealthMode(): Promise<boolean> {
    try {
      const result = await SecurityPlugin.enableStealthMode();
      
      if (result.success) {
        await this.recordSecurityEvent({
          type: 'app_hidden',
          details: { action: 'stealth_enabled' },
          severity: 'high'
        });
      }

      return result.success;
    } catch (error) {
      console.error('Failed to enable stealth mode:', error);
      return false;
    }
  }

  async disableStealthMode(): Promise<boolean> {
    try {
      const result = await SecurityPlugin.disableStealthMode();
      
      if (result.success) {
        await this.recordSecurityEvent({
          type: 'app_hidden',
          details: { action: 'stealth_disabled' },
          severity: 'medium'
        });
      }

      return result.success;
    } catch (error) {
      console.error('Failed to disable stealth mode:', error);
      return false;
    }
  }

  async detectTampering(): Promise<boolean> {
    try {
      const result = await SecurityPlugin.detectTampering();
      
      if (result.tampered) {
        await this.recordSecurityEvent({
          type: 'tamper_detected',
          details: result.details || {},
          severity: 'critical'
        });
        
        // Trigger additional security measures
        await RealIntruderDetection.recordFailedAttempt('tamper_detected', result.details);
      }

      return result.tampered;
    } catch (error) {
      console.error('Failed to detect tampering:', error);
      return false;
    }
  }

  async getSecurityStatus(): Promise<{
    monitoring: boolean;
    screenshotPrevention: boolean;
    stealthMode: boolean;
    tamperDetection: boolean;
  }> {
    try {
      const result = await SecurityPlugin.getSecurityStatus();
      return {
        monitoring: result.monitoring,
        screenshotPrevention: result.screenshotPrevention,
        stealthMode: result.stealthMode,
        tamperDetection: true // Always enabled
      };
    } catch (error) {
      console.error('Failed to get security status:', error);
      return {
        monitoring: false,
        screenshotPrevention: false,
        stealthMode: false,
        tamperDetection: false
      };
    }
  }

  private async handleSecurityAlert(data: any): Promise<void> {
    await this.recordSecurityEvent({
      type: 'unauthorized_access',
      details: data,
      severity: 'high'
    });

    // Emit security alert event
    this.emitSecurityEvent('security_alert', data);
  }

  private async handleVolumeEvent(data: any): Promise<void> {
    // Check for emergency volume pattern (5 quick presses)
    if (data.count >= 5) {
      await this.recordSecurityEvent({
        type: 'volume_pattern',
        details: { pattern: 'emergency_5x', count: data.count },
        severity: 'critical'
      });

      // Trigger emergency protocol
      this.emitSecurityEvent('emergency_pattern', { type: 'volume', count: data.count });
    }
  }

  private async handleScreenStateChange(data: any): Promise<void> {
    if (data.event === 'screen_off') {
      // Enable additional security when screen is off
      await this.enableScreenshotPrevention();
    }
  }

  private async handleNetworkChange(data: any): Promise<void> {
    await this.recordSecurityEvent({
      type: 'tamper_detected',
      details: { type: 'network_change', ...data },
      severity: 'low'
    });
  }

  private async handleAppHidden(): Promise<void> {
    // App went to background - enable additional security
    await this.enableScreenshotPrevention();
    
    await this.recordSecurityEvent({
      type: 'app_hidden',
      details: { reason: 'backgrounded' },
      severity: 'medium'
    });
  }

  private async handleAppVisible(): Promise<void> {
    // App came to foreground - perform security check
    await this.detectTampering();
  }

  private async recordSecurityEvent(event: Omit<SecurityEventData, 'timestamp'>): Promise<void> {
    try {
      const securityEvent: SecurityEventData = {
        ...event,
        timestamp: new Date().toISOString()
      };

      // Store event
      const { value: existingEvents } = await Preferences.get({ key: 'vaultix_security_events' });
      const events: SecurityEventData[] = existingEvents ? JSON.parse(existingEvents) : [];
      
      events.unshift(securityEvent);
      
      // Keep only last 500 events
      if (events.length > 500) {
        events.splice(500);
      }
      
      await Preferences.set({ 
        key: 'vaultix_security_events', 
        value: JSON.stringify(events) 
      });

      console.log('Security event recorded:', securityEvent);
    } catch (error) {
      console.error('Failed to record security event:', error);
    }
  }

  addEventListener(event: string, callback: Function): void {
    if (!this.securityEventListeners.has(event)) {
      this.securityEventListeners.set(event, []);
    }
    this.securityEventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const listeners = this.securityEventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitSecurityEvent(event: string, data: any): void {
    const listeners = this.securityEventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }

    // Also emit as DOM event
    const customEvent = new CustomEvent(`vaultix_${event}`, { detail: data });
    window.dispatchEvent(customEvent);
  }

  async getSecurityEvents(): Promise<SecurityEventData[]> {
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

  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}
