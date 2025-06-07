
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { NativeSecurityService } from './NativeSecurityService';

export interface BackupSchedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  enabled: boolean;
  includeSettings: boolean;
  includeFiles: boolean;
  includeSecurityLogs: boolean;
  cloudSync: boolean;
  encryption: boolean;
  lastBackup?: string;
  nextBackup?: string;
}

export interface BackupJob {
  id: string;
  scheduleId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: string;
  endTime?: string;
  error?: string;
  backupPath?: string;
  size?: number;
}

export class AutoBackupService {
  private static instance: AutoBackupService;
  private schedules: BackupSchedule[] = [];
  private runningJobs: Map<string, BackupJob> = new Map();
  private nativeSecurity = NativeSecurityService.getInstance();

  static getInstance(): AutoBackupService {
    if (!AutoBackupService.instance) {
      AutoBackupService.instance = new AutoBackupService();
    }
    return AutoBackupService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadSchedules();
      await this.setupDefaultSchedules();
      await this.scheduleNextBackups();
      console.log('Auto backup service initialized');
    } catch (error) {
      console.error('Failed to initialize auto backup service:', error);
    }
  }

  private async setupDefaultSchedules(): Promise<void> {
    if (this.schedules.length === 0) {
      const defaultSchedules: BackupSchedule[] = [
        {
          id: 'daily_auto',
          name: 'Daily Auto Backup',
          frequency: 'daily',
          time: '02:00',
          enabled: true,
          includeSettings: true,
          includeFiles: true,
          includeSecurityLogs: true,
          cloudSync: false,
          encryption: true
        },
        {
          id: 'weekly_full',
          name: 'Weekly Full Backup',
          frequency: 'weekly',
          time: '03:00',
          enabled: true,
          includeSettings: true,
          includeFiles: true,
          includeSecurityLogs: true,
          cloudSync: true,
          encryption: true
        }
      ];

      this.schedules = defaultSchedules;
      await this.saveSchedules();
    }
  }

  async createSchedule(schedule: Omit<BackupSchedule, 'id'>): Promise<string> {
    const id = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSchedule: BackupSchedule = {
      ...schedule,
      id,
      nextBackup: this.calculateNextBackup(schedule.frequency, schedule.time)
    };

    this.schedules.push(newSchedule);
    await this.saveSchedules();
    await this.scheduleNotification(newSchedule);

    return id;
  }

  async updateSchedule(id: string, updates: Partial<BackupSchedule>): Promise<boolean> {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.schedules[index] = { 
      ...this.schedules[index], 
      ...updates,
      nextBackup: updates.frequency || updates.time 
        ? this.calculateNextBackup(
            updates.frequency || this.schedules[index].frequency,
            updates.time || this.schedules[index].time
          )
        : this.schedules[index].nextBackup
    };

    await this.saveSchedules();
    await this.scheduleNotification(this.schedules[index]);

    return true;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.schedules.splice(index, 1);
    await this.saveSchedules();
    await this.cancelNotification(id);

    return true;
  }

  private calculateNextBackup(frequency: string, time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const next = new Date();
    
    next.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, move to next occurrence
    if (next <= now) {
      switch (frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
      }
    }

    return next.toISOString();
  }

  async executeBackup(scheduleId: string): Promise<boolean> {
    const schedule = this.schedules.find(s => s.id === scheduleId);
    if (!schedule || !schedule.enabled) return false;

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job: BackupJob = {
      id: jobId,
      scheduleId,
      status: 'running',
      progress: 0,
      startTime: new Date().toISOString()
    };

    this.runningJobs.set(jobId, job);

    try {
      // Create backup data
      const backupData: any = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        schedule: schedule.name
      };

      job.progress = 10;
      this.runningJobs.set(jobId, { ...job });

      // Include settings
      if (schedule.includeSettings) {
        const settings = await this.exportSettings();
        backupData.settings = settings;
        job.progress = 30;
        this.runningJobs.set(jobId, { ...job });
      }

      // Include files
      if (schedule.includeFiles) {
        const files = await this.exportFiles();
        backupData.files = files;
        job.progress = 60;
        this.runningJobs.set(jobId, { ...job });
      }

      // Include security logs
      if (schedule.includeSecurityLogs) {
        const securityLogs = await this.exportSecurityLogs();
        backupData.securityLogs = securityLogs;
        job.progress = 80;
        this.runningJobs.set(jobId, { ...job });
      }

      // Encrypt if required
      let finalData = JSON.stringify(backupData);
      if (schedule.encryption) {
        finalData = await this.encryptBackup(finalData);
      }

      // Save backup
      const fileName = `backup_${schedule.name.replace(/\s+/g, '_')}_${Date.now()}.vbak`;
      const backupPath = `backups/${fileName}`;

      await Filesystem.writeFile({
        path: backupPath,
        data: finalData,
        directory: Directory.Documents
      });

      job.progress = 90;
      this.runningJobs.set(jobId, { ...job });

      // Cloud sync if enabled
      if (schedule.cloudSync) {
        await this.uploadToCloud(backupPath, finalData);
      }

      // Complete job
      job.status = 'completed';
      job.progress = 100;
      job.endTime = new Date().toISOString();
      job.backupPath = backupPath;
      job.size = finalData.length;
      this.runningJobs.set(jobId, { ...job });

      // Update schedule
      schedule.lastBackup = new Date().toISOString();
      schedule.nextBackup = this.calculateNextBackup(schedule.frequency, schedule.time);
      await this.saveSchedules();

      // Schedule next notification
      await this.scheduleNotification(schedule);

      console.log(`Backup completed: ${fileName}`);
      return true;

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date().toISOString();
      this.runningJobs.set(jobId, { ...job });

      console.error('Backup failed:', error);
      return false;
    }
  }

  private async exportSettings(): Promise<any> {
    const keys = [
      'vaultix_security_settings',
      'vaultix_theme_settings',
      'vaultix_notification_settings',
      'vaultix_volume_patterns'
    ];

    const settings: any = {};
    for (const key of keys) {
      try {
        const { value } = await Preferences.get({ key });
        if (value) {
          settings[key] = JSON.parse(value);
        }
      } catch (error) {
        console.error(`Failed to export setting ${key}:`, error);
      }
    }

    return settings;
  }

  private async exportFiles(): Promise<any> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_files' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to export files:', error);
      return [];
    }
  }

  private async exportSecurityLogs(): Promise<any> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_security_events' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to export security logs:', error);
      return [];
    }
  }

  private async encryptBackup(data: string): Promise<string> {
    // Simple encryption for demo - use proper encryption in production
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const encoded = encoder.encode(data);
    const encrypted = btoa(String.fromCharCode(...encoded));
    return encrypted;
  }

  private async uploadToCloud(path: string, data: string): Promise<void> {
    // Placeholder for cloud upload implementation
    console.log('Uploading backup to cloud:', path);
    // This would integrate with Google Drive, Dropbox, etc.
  }

  private async scheduleNotification(schedule: BackupSchedule): Promise<void> {
    if (!schedule.enabled || !schedule.nextBackup) return;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Backup Scheduled',
            body: `${schedule.name} will run soon`,
            id: parseInt(schedule.id.replace(/\D/g, '').slice(-8)) || Date.now(),
            schedule: {
              at: new Date(schedule.nextBackup)
            }
          }
        ]
      });
    } catch (error) {
      console.error('Failed to schedule backup notification:', error);
    }
  }

  private async cancelNotification(scheduleId: string): Promise<void> {
    try {
      const notificationId = parseInt(scheduleId.replace(/\D/g, '').slice(-8)) || 0;
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }]
      });
    } catch (error) {
      console.error('Failed to cancel backup notification:', error);
    }
  }

  private async scheduleNextBackups(): Promise<void> {
    for (const schedule of this.schedules) {
      if (schedule.enabled) {
        await this.scheduleNotification(schedule);
      }
    }
  }

  getSchedules(): BackupSchedule[] {
    return [...this.schedules];
  }

  getRunningJobs(): BackupJob[] {
    return Array.from(this.runningJobs.values());
  }

  private async loadSchedules(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_backup_schedules' });
      if (value) {
        this.schedules = JSON.parse(value);
      }
    } catch (error) {
      console.error('Failed to load backup schedules:', error);
    }
  }

  private async saveSchedules(): Promise<void> {
    try {
      await Preferences.set({
        key: 'vaultix_backup_schedules',
        value: JSON.stringify(this.schedules)
      });
    } catch (error) {
      console.error('Failed to save backup schedules:', error);
    }
  }
}
