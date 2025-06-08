import { registerPlugin } from '@capacitor/core';
import { ProductionBiometricService } from './ProductionBiometricService';
import { ProductionEncryptionService } from './ProductionEncryptionService';

export interface ProductionSecurityPlugin {
  enableRealScreenshotPrevention(): Promise<{ success: boolean; error?: string }>;
  disableRealScreenshotPrevention(): Promise<{ success: boolean; error?: string }>;
  enableAppHiding(options: { calculatorMode: boolean }): Promise<{ success: boolean; error?: string }>;
  disableAppHiding(): Promise<{ success: boolean; error?: string }>;
  startRealTimeMonitoring(): Promise<{ success: boolean; error?: string }>;
  stopRealTimeMonitoring(): Promise<{ success: boolean; error?: string }>;
  captureIntruderPhoto(): Promise<{ success: boolean; photoPath?: string; error?: string }>;
  detectTamperAttempts(): Promise<{ success: boolean; tampering?: boolean; details?: any; error?: string }>;
  enableSecureMode(): Promise<{ success: boolean; error?: string }>;
  disableSecureMode(): Promise<{ success: boolean; error?: string }>;
  wipeSecureData(): Promise<{ success: boolean; error?: string }>;
}

const ProductionSecurity = registerPlugin<ProductionSecurityPlugin>('ProductionSecurity');

export interface SecurityEvent {
  id: string;
  type: 'screenshot_attempt' | 'tamper_detected' | 'intruder_detected' | 'unauthorized_access' | 'app_hidden' | 'security_breach';
  timestamp: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
}

export interface SecurityStatus {
  screenshotPrevention: boolean;
  appHidden: boolean;
  realTimeMonitoring: boolean;
  secureMode: boolean;
  intruderDetection: boolean;
  tamperDetection: boolean;
}

export class ProductionSecurityService {
  private static instance: ProductionSecurityService;
  private isInitialized = false;
  private currentStatus: SecurityStatus = {
    screenshotPrevention: false,
    appHidden: false,
    realTimeMonitoring: false,
    secureMode: false,
    intruderDetection: false,
    tamperDetection: false
  };
  private eventListeners: Map<string, Function[]> = new Map();
  private biometricService = ProductionBiometricService.getInstance();
  private encryptionService = ProductionEncryptionService.getInstance();

  static getInstance(): ProductionSecurityService {
    if (!ProductionSecurityService.instance) {
      ProductionSecurityService.instance = new ProductionSecurityService();
    }
    return ProductionSecurityService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.biometricService.initialize();
      await this.encryptionService.initializeEncryption();
      await this.setupSecurityListeners();
      await this.loadSecurityStatus();
      
      this.isInitialized = true;
      console.log('Production security service initialized');
    } catch (error) {
      console.error('Failed to initialize production security service:', error);
      throw error;
    }
  }

  private async setupSecurityListeners(): Promise<void> {
    try {
      // Listen for Android security events
      if (typeof window !== 'undefined') {
        // Screenshot detection
        document.addEventListener('vaultix.screenshot.detected', async (event: any) => {
          await this.handleScreenshotAttempt(event.detail);
        });

        // Tamper detection
        document.addEventListener('vaultix.tamper.detected', async (event: any) => {
          await this.handleTamperAttempt(event.detail);
        });

        // Intruder detection
        document.addEventListener('vaultix.intruder.detected', async (event: any) => {
          await this.handleIntruderDetection(event.detail);
        });

        // App visibility changes
        document.addEventListener('visibilitychange', async () => {
          if (document.hidden) {
            await this.handleAppHidden();
          } else {
            await this.handleAppVisible();
          }
        });
      }

      console.log('Security listeners setup complete');
    } catch (error) {
      console.error('Failed to setup security listeners:', error);
    }
  }

  async enableScreenshotPrevention(): Promise<boolean> {
    try {
      const result = await ProductionSecurity.enableRealScreenshotPrevention();
      if (result.success) {
        this.currentStatus.screenshotPrevention = true;
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
      const result = await ProductionSecurity.disableRealScreenshotPrevention();
      if (result.success) {
        this.currentStatus.screenshotPrevention = false;
      }
      return result.success;
    } catch (error) {
      console.error('Failed to disable screenshot prevention:', error);
      return false;
    }
  }

  async enableAppHiding(calculatorMode: boolean = true): Promise<boolean> {
    try {
      const result = await ProductionSecurity.enableAppHiding({ calculatorMode });
      if (result.success) {
        this.currentStatus.appHidden = true;
        await this.recordSecurityEvent({
          type: 'app_hidden',
          details: { calculatorMode },
          severity: 'high'
        });
      }
      return result.success;
    } catch (error) {
      console.error('Failed to enable app hiding:', error);
      return false;
    }
  }

  async disableAppHiding(): Promise<boolean> {
    try {
      const result = await ProductionSecurity.disableAppHiding();
      if (result.success) {
        this.currentStatus.appHidden = false;
      }
      return result.success;
    } catch (error) {
      console.error('Failed to disable app hiding:', error);
      return false;
    }
  }

  async startRealTimeMonitoring(): Promise<boolean> {
    try {
      const result = await ProductionSecurity.startRealTimeMonitoring();
      if (result.success) {
        this.currentStatus.realTimeMonitoring = true;
        this.currentStatus.intruderDetection = true;
        this.currentStatus.tamperDetection = true;
      }
      return result.success;
    } catch (error) {
      console.error('Failed to start real-time monitoring:', error);
      return false;
    }
  }

  async stopRealTimeMonitoring(): Promise<boolean> {
    try {
      const result = await ProductionSecurity.stopRealTimeMonitoring();
      if (result.success) {
        this.currentStatus.realTimeMonitoring = false;
        this.currentStatus.intruderDetection = false;
        this.currentStatus.tamperDetection = false;
      }
      return result.success;
    } catch (error) {
      console.error('Failed to stop real-time monitoring:', error);
      return false;
    }
  }

  async enableSecureMode(): Promise<boolean> {
    try {
      const result = await ProductionSecurity.enableSecureMode();
      if (result.success) {
        this.currentStatus.secureMode = true;
        // Enable all security features in secure mode
        await this.enableScreenshotPrevention();
        await this.startRealTimeMonitoring();
      }
      return result.success;
    } catch (error) {
      console.error('Failed to enable secure mode:', error);
      return false;
    }
  }

  async disableSecureMode(): Promise<boolean> {
    try {
      const result = await ProductionSecurity.disableSecureMode();
      if (result.success) {
        this.currentStatus.secureMode = false;
      }
      return result.success;
    } catch (error) {
      console.error('Failed to disable secure mode:', error);
      return false;
    }
  }

  private async handleScreenshotAttempt(details: any): Promise<void> {
    try {
      await this.recordSecurityEvent({
        type: 'screenshot_attempt',
        details,
        severity: 'high'
      });

      // Capture intruder photo
      const photoResult = await ProductionSecurity.captureIntruderPhoto();
      if (photoResult.success && photoResult.photoPath) {
        await this.recordSecurityEvent({
          type: 'intruder_detected',
          details: { photoPath: photoResult.photoPath, trigger: 'screenshot_attempt' },
          severity: 'critical'
        });
      }

      this.emitEvent('screenshotAttempt', details);
    } catch (error) {
      console.error('Failed to handle screenshot attempt:', error);
    }
  }

  private async handleTamperAttempt(details: any): Promise<void> {
    try {
      await this.recordSecurityEvent({
        type: 'tamper_detected',
        details,
        severity: 'critical'
      });

      // Verify device integrity
      const tamperResult = await ProductionSecurity.detectTamperAttempts();
      if (tamperResult.success && tamperResult.tampering) {
        // Handle critical security breach
        await this.handleSecurityBreach('tamper_detected', tamperResult.details);
      }

      this.emitEvent('tamperDetected', details);
    } catch (error) {
      console.error('Failed to handle tamper attempt:', error);
    }
  }

  private async handleIntruderDetection(details: any): Promise<void> {
    try {
      await this.recordSecurityEvent({
        type: 'intruder_detected',
        details,
        severity: 'critical'
      });

      // Capture photo evidence
      const photoResult = await ProductionSecurity.captureIntruderPhoto();
      if (photoResult.success && photoResult.photoPath) {
        details.photoPath = photoResult.photoPath;
      }

      this.emitEvent('intruderDetected', details);
    } catch (error) {
      console.error('Failed to handle intruder detection:', error);
    }
  }

  private async handleAppHidden(): Promise<void> {
    try {
      if (this.currentStatus.secureMode) {
        // Lock the app when hidden in secure mode
        await this.encryptionService.secureWipeMemory();
      }
    } catch (error) {
      console.error('Failed to handle app hidden:', error);
    }
  }

  private async handleAppVisible(): Promise<void> {
    try {
      if (this.currentStatus.secureMode) {
        // Require authentication when app becomes visible
        this.emitEvent('authenticationRequired', { reason: 'app_visible' });
      }
    } catch (error) {
      console.error('Failed to handle app visible:', error);
    }
  }

  private async handleSecurityBreach(type: string, details: any): Promise<void> {
    try {
      await this.recordSecurityEvent({
        type: 'security_breach',
        details: { breachType: type, ...details },
        severity: 'critical'
      });

      // Trigger emergency protocols
      if (this.currentStatus.secureMode) {
        await this.triggerEmergencyWipe();
      }

      this.emitEvent('securityBreach', { type, details });
    } catch (error) {
      console.error('Failed to handle security breach:', error);
    }
  }

  private async triggerEmergencyWipe(): Promise<void> {
    try {
      console.log('EMERGENCY WIPE TRIGGERED');
      const result = await ProductionSecurity.wipeSecureData();
      if (result.success) {
        await this.encryptionService.deleteAllKeys();
        await this.encryptionService.secureWipeMemory();
      }
    } catch (error) {
      console.error('Emergency wipe failed:', error);
    }
  }

  async recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'handled'>): Promise<void> {
    try {
      const securityEvent: SecurityEvent = {
        id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        handled: false,
        ...event
      };

      // Encrypt and store event
      const encryptedEvent = await this.encryptionService.encryptText(JSON.stringify(securityEvent));
      const events = await this.getSecurityEvents();
      events.unshift(encryptedEvent);
      
      // Keep only last 500 events
      events.splice(500);
      
      localStorage.setItem('vaultix_security_events_encrypted', JSON.stringify(events));
      
      console.log('Security event recorded:', securityEvent.type, securityEvent.severity);
    } catch (error) {
      console.error('Failed to record security event:', error);
    }
  }

  async getSecurityEvents(): Promise<string[]> {
    try {
      const stored = localStorage.getItem('vaultix_security_events_encrypted');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }

  async getDecryptedSecurityEvents(): Promise<SecurityEvent[]> {
    try {
      const encryptedEvents = await this.getSecurityEvents();
      const decryptedEvents = [];
      
      for (const encryptedEvent of encryptedEvents) {
        try {
          const decryptedText = await this.encryptionService.decryptText(encryptedEvent);
          const event = JSON.parse(decryptedText);
          decryptedEvents.push(event);
        } catch (decryptError) {
          console.error('Failed to decrypt security event:', decryptError);
        }
      }
      
      return decryptedEvents;
    } catch (error) {
      console.error('Failed to get decrypted security events:', error);
      return [];
    }
  }

  getSecurityStatus(): SecurityStatus {
    return { ...this.currentStatus };
  }

  private async loadSecurityStatus(): Promise<void> {
    try {
      const stored = localStorage.getItem('vaultix_security_status');
      if (stored) {
        this.currentStatus = { ...this.currentStatus, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load security status:', error);
    }
  }

  private async saveSecurityStatus(): Promise<void> {
    try {
      localStorage.setItem('vaultix_security_status', JSON.stringify(this.currentStatus));
    } catch (error) {
      console.error('Failed to save security status:', error);
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
