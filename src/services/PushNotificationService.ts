import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
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

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Request permission for local notifications
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display !== 'granted') {
        console.warn('Local notification permission not granted');
        return;
      }
      
      // Listen for notification actions
      LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        this.handleNotificationAction(notification);
      });

      // Schedule default notifications
      await this.scheduleSecurityTips();
      await this.scheduleReminders();
      
      console.log('Local notification service initialized');
    } catch (error) {
      console.error('Failed to initialize local notifications:', error);
    }
  }

  private async handleNotificationAction(notification: any): Promise<void> {
    const data = notification.notification.extra;
    
    // Handle different notification types
    switch (data?.type) {
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

    try {
      // Schedule one tip per day at random times
      const notifications: LocalNotificationSchema[] = tips.map((tip, index) => {
        const scheduleDate = new Date();
        scheduleDate.setDate(scheduleDate.getDate() + index);
        scheduleDate.setHours(Math.floor(Math.random() * 12) + 9, Math.floor(Math.random() * 60), 0, 0);

        return {
          title: "Daily Security Tip",
          body: tip,
          id: 1000 + index,
          schedule: { at: scheduleDate, repeats: false },
          extra: { type: 'security_tip' }
        };
      });

      await LocalNotifications.schedule({ notifications });
      console.log('Security tips scheduled');
    } catch (error) {
      console.error('Failed to schedule security tips:', error);
    }
  }

  async scheduleReminders(): Promise<void> {
    try {
      const notifications: LocalNotificationSchema[] = [
        {
          title: "Don't forget your vault!",
          body: "Check your secure files and organize your vault",
          id: 2001,
          schedule: { 
            on: { hour: 18, minute: 0 },
            repeats: true 
          },
          extra: { type: 'reminder' }
        },
        {
          title: "Weekly Backup Reminder",
          body: "It's time to backup your vault data",
          id: 2002,
          schedule: { 
            on: { weekday: 1, hour: 10, minute: 0 },
            repeats: true 
          },
          extra: { type: 'reminder' }
        },
        {
          title: "Spin Wheel Available!",
          body: "Your daily spin wheel is ready. Earn coins now!",
          id: 2003,
          schedule: { 
            on: { hour: 12, minute: 0 },
            repeats: true 
          },
          extra: { type: 'reward' }
        }
      ];

      await LocalNotifications.schedule({ notifications });
      console.log('Reminders scheduled');
    } catch (error) {
      console.error('Failed to schedule reminders:', error);
    }
  }

  async sendSecurityAlert(title: string, body: string): Promise<void> {
    try {
      const notification: LocalNotificationSchema = {
        title,
        body,
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 1000) },
        extra: { type: 'security_alert' }
      };

      await LocalNotifications.schedule({ notifications: [notification] });
      
      // Also store it for history
      await this.storeNotification({
        id: notification.id!.toString(),
        title,
        body,
        data: { type: 'security_alert' },
        receivedAt: new Date().toISOString(),
        read: false
      });
      
      console.log('Security alert sent:', title);
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  private async storeNotification(notification: any): Promise<void> {
    try {
      const stored = await Preferences.get({ key: 'vaultix_notifications' });
      const notifications = stored.value ? JSON.parse(stored.value) : [];
      
      notifications.unshift(notification);
      notifications.splice(50); // Keep only last 50
      
      await Preferences.set({ 
        key: 'vaultix_notifications', 
        value: JSON.stringify(notifications) 
      });
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  async getStoredNotifications(): Promise<any[]> {
    try {
      const stored = await Preferences.get({ key: 'vaultix_notifications' });
      return stored.value ? JSON.parse(stored.value) : [];
    } catch (error) {
      console.error('Failed to get stored notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(id: string): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updated = notifications.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      );
      
      await Preferences.set({ 
        key: 'vaultix_notifications', 
        value: JSON.stringify(updated) 
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async cancelScheduledNotifications(type?: string): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending();
      
      if (type) {
        // Cancel specific type
        const toCancel = pending.notifications.filter(n => n.extra?.type === type);
        if (toCancel.length > 0) {
          await LocalNotifications.cancel({ 
            notifications: toCancel.map(n => ({ id: n.id }))
          });
        }
      } else {
        // Cancel all
        await LocalNotifications.cancel({ 
          notifications: pending.notifications.map(n => ({ id: n.id }))
        });
      }
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  async rescheduleNotifications(): Promise<void> {
    try {
      // Cancel existing and reschedule
      await this.cancelScheduledNotifications();
      await this.scheduleSecurityTips();
      await this.scheduleReminders();
    } catch (error) {
      console.error('Failed to reschedule notifications:', error);
    }
  }
}
