import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import CryptoJS from 'crypto-js';
import { GoogleDriveService } from './GoogleDriveService';

export interface BackupMetadata {
  id: string;
  timestamp: string;
  fileCount: number;
  totalSize: number;
  type: 'full' | 'incremental' | 'cloud';
  encrypted: boolean;
  version: string;
  checksum: string;
}

export interface RestoreProgress {
  stage: 'preparing' | 'extracting' | 'decrypting' | 'restoring' | 'finalizing';
  progress: number;
  currentFile?: string;
  totalFiles?: number;
  processedFiles?: number;
}

export interface BackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  includeSettings: boolean;
  cloudSync: boolean;
  maxBackups: number;
}

export class EnhancedBackupService {
  private static instance: EnhancedBackupService;
  private googleDriveService = GoogleDriveService.getInstance();

  static getInstance(): EnhancedBackupService {
    if (!EnhancedBackupService.instance) {
      EnhancedBackupService.instance = new EnhancedBackupService();
    }
    return EnhancedBackupService.instance;
  }

  async createFullBackup(password: string, includeSettings: boolean = true): Promise<BackupMetadata> {
    try {
      const backupId = `backup_${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      // Get all vault data
      const vaultData = await this.collectVaultData(includeSettings);
      const jsonData = JSON.stringify(vaultData);
      
      // Encrypt data
      const encryptedData = this.encryptData(jsonData, password);
      
      // Create backup file
      const backupFileName = `${backupId}.vbak`;
      await Filesystem.writeFile({
        path: `backups/${backupFileName}`,
        data: encryptedData,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      // Calculate checksum
      const checksum = CryptoJS.SHA256(encryptedData).toString();
      
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        fileCount: vaultData.files?.length || 0,
        totalSize: new Blob([encryptedData]).size,
        type: 'full',
        encrypted: true,
        version: '1.0',
        checksum
      };

      await this.saveBackupMetadata(metadata);
      
      // Cleanup old backups
      await this.cleanupOldBackups();
      
      return metadata;
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error('Failed to create backup');
    }
  }

  async createCloudBackup(password: string): Promise<BackupMetadata> {
    try {
      const metadata = await this.createFullBackup(password, true);
      
      // Upload to Google Drive
      const backupFileName = `${metadata.id}.vbak`;
      const backupPath = `backups/${backupFileName}`;
      
      const fileData = await Filesystem.readFile({
        path: backupPath,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      await this.googleDriveService.uploadFile(
        backupFileName,
        fileData.data as string,
        'application/octet-stream'
      );

      metadata.type = 'cloud';
      await this.saveBackupMetadata(metadata);
      
      return metadata;
    } catch (error) {
      console.error('Cloud backup failed:', error);
      throw new Error('Failed to create cloud backup');
    }
  }

  async restoreBackup(backupId: string, password: string, progressCallback?: (progress: RestoreProgress) => void): Promise<void> {
    try {
      progressCallback?.({ stage: 'preparing', progress: 10 });
      
      // Load backup file
      const backupFileName = `${backupId}.vbak`;
      const backupPath = `backups/${backupFileName}`;
      
      let encryptedData: string;
      try {
        const fileData = await Filesystem.readFile({
          path: backupPath,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        encryptedData = fileData.data as string;
      } catch (error) {
        // Try cloud backup
        encryptedData = await this.googleDriveService.downloadFile(backupId);
      }

      progressCallback?.({ stage: 'decrypting', progress: 30 });
      
      // Decrypt data
      const decryptedData = this.decryptData(encryptedData, password);
      const vaultData = JSON.parse(decryptedData);
      
      progressCallback?.({ stage: 'restoring', progress: 50 });
      
      // Restore vault data
      await this.restoreVaultData(vaultData, progressCallback);
      
      progressCallback?.({ stage: 'finalizing', progress: 100 });
      
    } catch (error) {
      console.error('Restore failed:', error);
      throw new Error('Failed to restore backup');
    }
  }

  async scheduleAutomaticBackups(schedule: BackupSchedule): Promise<void> {
    try {
      await Preferences.set({
        key: 'vaultix_backup_schedule',
        value: JSON.stringify(schedule)
      });

      if (schedule.enabled) {
        // Calculate next backup time
        const nextBackup = this.calculateNextBackupTime(schedule);
        await Preferences.set({
          key: 'vaultix_next_backup',
          value: nextBackup.toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to schedule automatic backups:', error);
    }
  }

  async checkAndPerformScheduledBackup(): Promise<void> {
    try {
      const scheduleData = await Preferences.get({ key: 'vaultix_backup_schedule' });
      const nextBackupData = await Preferences.get({ key: 'vaultix_next_backup' });
      
      if (!scheduleData.value || !nextBackupData.value) return;
      
      const schedule: BackupSchedule = JSON.parse(scheduleData.value);
      const nextBackup = new Date(nextBackupData.value);
      
      if (!schedule.enabled || new Date() < nextBackup) return;
      
      // Perform backup with a default password (would be user's vault password)
      const defaultPassword = await this.getVaultPassword();
      if (defaultPassword) {
        if (schedule.cloudSync) {
          await this.createCloudBackup(defaultPassword);
        } else {
          await this.createFullBackup(defaultPassword, schedule.includeSettings);
        }
        
        // Schedule next backup
        const nextTime = this.calculateNextBackupTime(schedule);
        await Preferences.set({
          key: 'vaultix_next_backup',
          value: nextTime.toISOString()
        });
      }
    } catch (error) {
      console.error('Scheduled backup failed:', error);
    }
  }

  async getBackupHistory(): Promise<BackupMetadata[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_backup_history' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get backup history:', error);
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    try {
      // Delete local backup file
      const backupFileName = `${backupId}.vbak`;
      await Filesystem.deleteFile({
        path: `backups/${backupFileName}`,
        directory: Directory.Documents
      });

      // Remove from history
      const history = await this.getBackupHistory();
      const updatedHistory = history.filter(b => b.id !== backupId);
      await Preferences.set({
        key: 'vaultix_backup_history',
        value: JSON.stringify(updatedHistory)
      });
    } catch (error) {
      console.error('Failed to delete backup:', error);
    }
  }

  private async collectVaultData(includeSettings: boolean): Promise<any> {
    const data: any = {};
    
    // Get files
    const filesData = await Preferences.get({ key: 'vaultix_files' });
    if (filesData.value) {
      data.files = JSON.parse(filesData.value);
    }
    
    // Get folders
    const foldersData = await Preferences.get({ key: 'vaultix_folders' });
    if (foldersData.value) {
      data.folders = JSON.parse(foldersData.value);
    }
    
    if (includeSettings) {
      // Get all settings
      const settingsKeys = [
        'vaultix_security_settings',
        'vaultix_app_settings',
        'vaultix_theme_settings',
        'vaultix_user_coins',
        'vaultix_premium_features'
      ];
      
      for (const key of settingsKeys) {
        const settingData = await Preferences.get({ key });
        if (settingData.value) {
          data[key] = JSON.parse(settingData.value);
        }
      }
    }
    
    return data;
  }

  private async restoreVaultData(data: any, progressCallback?: (progress: RestoreProgress) => void): Promise<void> {
    const totalItems = Object.keys(data).length;
    let processedItems = 0;
    
    for (const [key, value] of Object.entries(data)) {
      if (key === 'files' || key === 'folders' || key.startsWith('vaultix_')) {
        await Preferences.set({
          key: key === 'files' ? 'vaultix_files' : key === 'folders' ? 'vaultix_folders' : key,
          value: JSON.stringify(value)
        });
      }
      
      processedItems++;
      const progress = 50 + (processedItems / totalItems) * 40;
      progressCallback?.({ 
        stage: 'restoring', 
        progress, 
        currentFile: key,
        totalFiles: totalItems,
        processedFiles: processedItems
      });
    }
  }

  private encryptData(data: string, password: string): string {
    return CryptoJS.AES.encrypt(data, password).toString();
  }

  private decryptData(encryptedData: string, password: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, password);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error('Invalid password');
      }
      return decrypted;
    } catch (error) {
      throw new Error('Invalid password or corrupted backup');
    }
  }

  private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const history = await this.getBackupHistory();
    history.unshift(metadata);
    
    await Preferences.set({
      key: 'vaultix_backup_history',
      value: JSON.stringify(history)
    });
  }

  private async cleanupOldBackups(): Promise<void> {
    const history = await this.getBackupHistory();
    const maxBackups = 10; // Keep last 10 backups
    
    if (history.length > maxBackups) {
      const toDelete = history.slice(maxBackups);
      for (const backup of toDelete) {
        await this.deleteBackup(backup.id);
      }
    }
  }

  private calculateNextBackupTime(schedule: BackupSchedule): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    const nextBackup = new Date(now);
    nextBackup.setHours(hours, minutes, 0, 0);
    
    switch (schedule.frequency) {
      case 'daily':
        if (nextBackup <= now) {
          nextBackup.setDate(nextBackup.getDate() + 1);
        }
        break;
      case 'weekly':
        if (nextBackup <= now) {
          nextBackup.setDate(nextBackup.getDate() + 7);
        }
        break;
      case 'monthly':
        if (nextBackup <= now) {
          nextBackup.setMonth(nextBackup.getMonth() + 1);
        }
        break;
    }
    
    return nextBackup;
  }

  private async getVaultPassword(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_vault_password' });
      return value;
    } catch (error) {
      return null;
    }
  }
}
