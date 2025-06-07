import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FileEncryption } from './encryption';
import { VaultFile, VaultFolder } from '@/contexts/VaultContext';

export interface BackupData {
  version: string;
  timestamp: string;
  files: VaultFile[];
  folders: VaultFolder[];
  settings: any;
}

export class BackupManager {
  private static readonly BACKUP_VERSION = '1.0.0';
  
  static async createBackup(password: string): Promise<string> {
    try {
      // Get all vault data
      const [filesResult, foldersResult, settingsResult] = await Promise.all([
        Preferences.get({ key: 'vaultix_files' }),
        Preferences.get({ key: 'vaultix_folders' }),
        Preferences.get({ key: 'vaultix_settings' })
      ]);
      
      const backupData: BackupData = {
        version: this.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        files: filesResult.value ? JSON.parse(filesResult.value) : [],
        folders: foldersResult.value ? JSON.parse(foldersResult.value) : [],
        settings: settingsResult.value ? JSON.parse(settingsResult.value) : {}
      };
      
      // Convert to JSON and encrypt
      const jsonData = JSON.stringify(backupData);
      const encryptedData = FileEncryption.encryptFile(jsonData);
      
      // Create backup file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `vaultix_backup_${timestamp}.vbk`;
      
      // Save to device storage
      await Filesystem.writeFile({
        path: fileName,
        data: encryptedData,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      
      // Store backup metadata
      const backupMeta = {
        fileName,
        timestamp: backupData.timestamp,
        fileCount: backupData.files.length,
        size: new Blob([encryptedData]).size
      };
      
      const { value: existingBackups } = await Preferences.get({ key: 'vaultix_backup_history' });
      const backups = existingBackups ? JSON.parse(existingBackups) : [];
      backups.push(backupMeta);
      
      // Keep only last 10 backups
      if (backups.length > 10) {
        backups.splice(0, backups.length - 10);
      }
      
      await Preferences.set({ key: 'vaultix_backup_history', value: JSON.stringify(backups) });
      
      return fileName;
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error('Failed to create backup');
    }
  }
  
  static async restoreBackup(fileName: string, password: string): Promise<void> {
    try {
      // Read backup file
      const result = await Filesystem.readFile({
        path: fileName,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      
      // Decrypt data
      const decryptedData = FileEncryption.decryptFile(result.data as string);
      const backupData: BackupData = JSON.parse(decryptedData);
      
      // Validate backup version
      if (backupData.version !== this.BACKUP_VERSION) {
        throw new Error('Incompatible backup version');
      }
      
      // Restore data
      await Promise.all([
        Preferences.set({ key: 'vaultix_files', value: JSON.stringify(backupData.files) }),
        Preferences.set({ key: 'vaultix_folders', value: JSON.stringify(backupData.folders) }),
        Preferences.set({ key: 'vaultix_settings', value: JSON.stringify(backupData.settings) })
      ]);
      
    } catch (error) {
      console.error('Backup restoration failed:', error);
      throw new Error('Failed to restore backup');
    }
  }
  
  static async getBackupHistory(): Promise<any[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_backup_history' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get backup history:', error);
      return [];
    }
  }
  
  static async deleteBackup(fileName: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Documents
      });
      
      // Remove from history
      const { value } = await Preferences.get({ key: 'vaultix_backup_history' });
      if (value) {
        const backups = JSON.parse(value);
        const updatedBackups = backups.filter((b: any) => b.fileName !== fileName);
        await Preferences.set({ key: 'vaultix_backup_history', value: JSON.stringify(updatedBackups) });
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw new Error('Failed to delete backup');
    }
  }
}
