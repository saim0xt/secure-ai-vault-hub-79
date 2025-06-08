
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';

export interface NotificationData {
  id: number;
  title: string;
  body: string;
  type: string;
  timestamp: Date;
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
      await LocalNotifications.requestPermissions();
      console.log('Local notifications initialized');
    } catch (error) {
      console.error('Failed to initialize local notifications:', error);
    }
  }

  async scheduleSecurityReminders(): Promise<void> {
    try {
      const notifications: LocalNotificationSchema[] = [
        {
          title: 'Vault Security Check',
          body: 'Review your vault security settings and update if needed',
          id: 1,
          schedule: { at: new Date(Date.now() + 24 * 60 * 60 * 1000) },
          extra: { type: 'security_reminder' }
        },
        {
          title: 'Backup Reminder',
          body: 'Remember to backup your vault data regularly',
          id: 2,
          schedule: { at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          extra: { type: 'backup_reminder' }
        }
      ];

      await LocalNotifications.schedule({ notifications });
      console.log('Security reminders scheduled');
    } catch (error) {
      console.error('Failed to schedule security reminders:', error);
    }
  }

  async sendBreakInAlert(location?: string): Promise<void> {
    try {
      const notification: LocalNotificationSchema = {
        title: 'Security Alert: Unauthorized Access Detected',
        body: location ? `Break-in attempt detected at ${location}` : 'Break-in attempt detected',
        id: Date.now(),
        extra: { type: 'break_in_alert' }
      };

      await LocalNotifications.schedule({ notifications: [notification] });
      console.log('Break-in alert sent');
    } catch (error) {
      console.error('Failed to send break-in alert:', error);
    }
  }

  async sendLockAlert(): Promise<void> {
    try {
      const notification: LocalNotificationSchema = {
        title: 'Vault Locked',
        body: 'Your vault has been locked due to multiple failed access attempts',
        id: Date.now(),
        extra: { type: 'lock_alert' }
      };

      await LocalNotifications.schedule({ notifications: [notification] });
      console.log('Lock alert sent');
    } catch (error) {
      console.error('Failed to send lock alert:', error);
    }
  }

  async sendBackupCompleteAlert(): Promise<void> {
    try {
      const notification: LocalNotificationSchema = {
        title: 'Backup Complete',
        body: 'Your vault data has been successfully backed up',
        id: Date.now(),
        extra: { type: 'backup_complete' }
      };

      await LocalNotifications.schedule({ notifications: [notification] });
      console.log('Backup complete alert sent');
    } catch (error) {
      console.error('Failed to send backup complete alert:', error);
    }
  }

  async clearAllNotifications(): Promise<void> {
    try {
      await LocalNotifications.cancel({ notifications: [] });
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }
}
