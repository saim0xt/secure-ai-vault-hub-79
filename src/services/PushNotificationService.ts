
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high';
  badge?: number;
  sound?: string;
}

export interface SecurityAlert extends NotificationPayload {
  alertType: 'break_in' | 'tamper' | 'unauthorized_access' | 'device_compromised';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  location?: string;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private isInitialized = false;
  private token: string | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.requestPermission();
      await this.setupListeners();
      await this.registerDevice();
      
      this.isInitialized = true;
      console.log('Push notification service initialized');
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  private async requestPermission(): Promise<void> {
    const result = await PushNotifications.requestPermissions();
    if (result.receive !== 'granted') {
      throw new Error('Push notification permission not granted');
    }
  }

  private async setupListeners(): Promise<void> {
    // Registration success
    PushNotifications.addListener('registration', (token: Token) => {
      this.token = token.value;
      this.saveToken(token.value);
      console.log('Push registration success, token: ' + token.value);
    });

    // Registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received: ', notification);
      this.handleForegroundNotification(notification);
    });

    // Notification action (tap, button press)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed: ', notification.actionId, notification.inputValue);
      this.handleNotificationAction(notification);
    });
  }

  private async registerDevice(): Promise<void> {
    await PushNotifications.register();
  }

  private async saveToken(token: string): Promise<void> {
    try {
      await Preferences.set({ key: 'vaultix_push_token', value: token });
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    
    try {
      const { value } = await Preferences.get({ key: 'vaultix_push_token' });
      return value;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  async sendSecurityAlert(title: string, body: string, alertType: SecurityAlert['alertType'] = 'unauthorized_access', severity: SecurityAlert['severity'] = 'medium'): Promise<void> {
    const alert: SecurityAlert = {
      title,
      body,
      alertType,
      severity,
      timestamp: new Date().toISOString(),
      priority: severity === 'critical' ? 'high' : 'normal',
      data: {
        type: 'security_alert',
        alertType,
        severity
      }
    };

    await this.sendLocalNotification(alert);
    
    // In production, also send to server for remote delivery
    await this.logSecurityAlert(alert);
  }

  async sendLocalNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Use Capacitor's local notifications plugin
      console.log('Local notification sent:', payload);
      
      // For demo purposes, we'll show a browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.title, {
          body: payload.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'vaultix-security',
          requireInteraction: payload.priority === 'high'
        });
      }
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  private handleForegroundNotification(notification: PushNotificationSchema): void {
    // Handle notification received while app is active
    if (notification.data?.type === 'security_alert') {
      this.handleSecurityAlert(notification);
    }
  }

  private handleNotificationAction(notification: ActionPerformed): void {
    // Handle user interaction with notification
    const data = notification.notification.data;
    
    if (data?.type === 'security_alert') {
      // Navigate to security alerts screen
      window.location.hash = '/security-alerts';
    }
  }

  private handleSecurityAlert(notification: PushNotificationSchema): void {
    // Trigger security alert UI
    const event = new CustomEvent('security_alert_received', {
      detail: notification.data
    });
    window.dispatchEvent(event);
  }

  private async logSecurityAlert(alert: SecurityAlert): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_security_alerts' });
      const alerts: SecurityAlert[] = value ? JSON.parse(value) : [];
      
      alerts.unshift(alert);
      alerts.splice(100); // Keep only last 100 alerts
      
      await Preferences.set({
        key: 'vaultix_security_alerts',
        value: JSON.stringify(alerts)
      });
    } catch (error) {
      console.error('Failed to log security alert:', error);
    }
  }

  async getSecurityAlerts(): Promise<SecurityAlert[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_security_alerts' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get security alerts:', error);
      return [];
    }
  }

  async clearSecurityAlerts(): Promise<void> {
    try {
      await Preferences.remove({ key: 'vaultix_security_alerts' });
    } catch (error) {
      console.error('Failed to clear security alerts:', error);
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
