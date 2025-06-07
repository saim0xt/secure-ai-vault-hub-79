import { PushNotifications, PushNotificationSchema, ActionPerformed, PushNotificationToken, PermissionStatus } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';

export interface NotificationSchedule {
  id: string;
  title: string;
  body: string;
  type: 'security_tip' | 'reminder' | 'security_alert' | 'reward';
  scheduledTime: string;
  recurring: boolean;
  enabled: boolean;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private token: string = '';

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      
      if (permStatus.receive !== 'granted') {
        throw new Error('Push notification permission denied');
      }
      
      // Register for push notifications
      await PushNotifications.register();
      
      // Listen for token registration
      PushNotifications.addListener('registration', (token: PushNotificationToken) => {
        this.token = token.value;
        console.log('Push registration success, token:', token.value);
        this.saveToken(token.value);
      });
      
      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Registration error:', error);
      });
      
      // Listen for push notifications
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push received:', notification);
        this.handleNotificationReceived(notification);
      });
      
      // Listen for notification actions
      PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
        console.log('Push action performed:', notification);
        this.handleNotificationAction(notification);
      });
      
      console.log('Push notification service initialized');
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  private async saveToken(token: string): Promise<void> {
    try {
      await Preferences.set({ key: 'vaultix_push_token', value: token });
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  private async handleNotificationReceived(notification: PushNotificationSchema): Promise<void> {
    // Handle notification when app is in foreground
    console.log('Notification received in foreground:', notification);
    
    // Store notification for later viewing
    await this.storeNotification(notification);
  }

  private async handleNotificationAction(action: ActionPerformed): Promise<void> {
    const notification = action.notification;
    
    // Handle different notification types
    switch (notification.data?.type) {
      case 'security_alert':
        // Navigate to security logs
        window.location.href = '/breakin-logs';
        break;
      case 'reward':
        // Navigate to rewards
        window.location.href = '/rewards';
        break;
      case 'reminder':
        // Open vault
        window.location.href = '/';
        break;
      default:
        console.log('Unknown notification type');
    }
  }

  private async storeNotification(notification: PushNotificationSchema): Promise<void> {
    try {
      const stored = await Preferences.get({ key: 'vaultix_notifications' });
      const notifications = stored.value ? JSON.parse(stored.value) : [];
      
      notifications.unshift({
        id: notification.id || Date.now().toString(),
        title: notification.title,
        body: notification.body,
        data: notification.data,
        receivedAt: new Date().toISOString(),
        read: false
      });
      
      // Keep only last 50 notifications
      notifications.splice(50);
      
      await Preferences.set({ 
        key: 'vaultix_notifications', 
        value: JSON.stringify(notifications) 
      });
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  async scheduleSecurityTips(): Promise<void> {
    const tips = [
      "Remember to use strong, unique passwords for all your accounts",
      "Enable two-factor authentication whenever possible",
      "Regularly update your apps and operating system",
      "Be cautious when clicking links in emails or messages",
      "Use secure Wi-Fi networks and avoid public Wi-Fi for sensitive activities",
      "Regularly backup your important data",
      "Review your app permissions and remove unnecessary access",
      "Keep your Vaultix app updated for the latest security features"
    ];
    
    const schedules: NotificationSchedule[] = tips.map((tip, index) => ({
      id: `security_tip_${index}`,
      title: "Daily Security Tip",
      body: tip,
      type: 'security_tip',
      scheduledTime: this.getRandomDailyTime(),
      recurring: true,
      enabled: true
    }));
    
    await this.saveSchedules(schedules);
  }

  async scheduleReminders(): Promise<void> {
    const reminders: NotificationSchedule[] = [
      {
        id: 'daily_vault_check',
        title: "Don't forget your vault!",
        body: "Check your secure files and organize your vault",
        type: 'reminder',
        scheduledTime: '18:00', // 6 PM daily
        recurring: true,
        enabled: true
      },
      {
        id: 'weekly_backup',
        title: "Weekly Backup Reminder",
        body: "It's time to backup your vault data",
        type: 'reminder',
        scheduledTime: 'Sunday 10:00',
        recurring: true,
        enabled: true
      },
      {
        id: 'spin_wheel_available',
        title: "Spin Wheel Available!",
        body: "Your daily spin wheel is ready. Earn coins now!",
        type: 'reward',
        scheduledTime: '12:00', // Noon daily
        recurring: true,
        enabled: true
      }
    ];
    
    await this.saveSchedules(reminders);
  }

  private getRandomDailyTime(): string {
    const hours = Math.floor(
