import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { GoogleDriveService } from './GoogleDriveService';
import { FileEncryption } from '@/utils/encryption';

export interface BackupMetadata {
  id: string;
  timestamp: string;
  version: string;
  fileCount: number;
  totalSize: number;
  type: 'local' | 'cloud' | 'manual';
  encrypted: boolean;
  checksum: string;
}

export interface RestoreProgress {
  stage: 'preparing' | 'downloading' | 'decrypting' | 'restoring' | 'complete';
  progress: number;
  currentFile?: string;
  error?: string;
}

export class EnhancedBackupService {
  private static instance: EnhancedBackupService;
  private googleDrive: GoogleDriveService;
  
  static getInstance(): EnhancedBackupService {
    if (!EnhancedBackupService.instance) {
      EnhancedBackupService.instance = new EnhancedBackupService();
    }
    return EnhancedBackupService.instance;
  }

  constructor() {
    this.googleDrive = GoogleDriveService.getInstance();
  }

  async createFullBackup(password: string, includeSettings: boolean = true): Promise<BackupMetadata> {
    try {
      // Gather all vault data
      const vaultData = await this.gatherVaultData(includeSettings);
      
      // Create backup metadata
      const metadata: BackupMetadata = {
        id: this.generateBackupId(),
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        fileCount: vaultData.files.length,
        totalSize: this.calculateTotalSize(vaultData),
        type: 'manual',
        encrypted: true,
        checksum: ''
      };

      // Encrypt backup data
      const encryptedData = await this.encryptBackupData(vaultData, password);
      metadata.checksum = await this.calculateChecksum(encryptedData);

      // Save to local storage
      const fileName = `vaultix_backup_${metadata.id}.vbk`;
      await Filesystem.writeFile({
        path: fileName,
        data: encryptedData,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      // Update backup history
      await this.updateBackupHistory(metadata);

      return metadata;
    } catch (error) {
      console.error('Full backup creation failed:', error);
      throw new Error('Failed to create backup');
    }
  }

  async createCloudBackup(password: string): Promise<BackupMetadata> {
    try {
      // Create local backup first
      const metadata = await this.createFullBackup(password);
      
      // Upload to Google Drive
      const fileName = `vaultix_backup_${metadata.id}.vbk`;
      const fileData = await Filesystem.readFile({
        path: fileName,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      await this.googleDrive.uploadFile(fileName, fileData.data as string);
      
      // Update metadata
      metadata.type = 'cloud';
      await this.updateBackupHistory(metadata);

      return metadata;
    } catch (error) {
      console.error('Cloud backup creation failed:', error);
      throw new Error('Failed to create cloud backup');
    }
  }

  async restoreBackup(
    backupId: string, 
    password: string, 
    onProgress?: (progress: RestoreProgress) => void
  ): Promise<void> {
    try {
      onProgress?.({ stage: 'preparing', progress: 0 });

      // Get backup metadata
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        throw new Error('Backup not found');
      }

      onProgress?.({ stage: 'downloading', progress: 20 });

      // Read backup file
      const fileName = `vaultix_backup_${backupId}.vbk`;
      let fileData: string;

      if (metadata.type === 'cloud') {
        // Download from cloud
        const files = await this.googleDrive.listFiles();
        const backupFile = files.find(f => f.name === fileName);
        if (!backupFile) {
          throw new Error('Cloud backup file not found');
        }
        fileData = await this.googleDrive.downloadFile(backupFile.id);
      } else {
        // Read from local storage
        const result = await Filesystem.readFile({
          path: fileName,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        fileData = result.data as string;
      }

      onProgress?.({ stage: 'decrypting', progress: 50 });

      // Decrypt backup data
      const decryptedData = await this.decryptBackupData(fileData, password);
      
      // Verify checksum
      const calculatedChecksum = await this.calculateChecksum(fileData);
      if (calculatedChecksum !== metadata.checksum) {
        throw new Error('Backup file integrity check failed');
      }

      onProgress?.({ stage: 'restoring', progress: 75 });

      // Restore vault data
      await this.restoreVaultData(decryptedData, onProgress);

      onProgress?.({ stage: 'complete', progress: 100 });
    } catch (error) {
      console.error('Backup restoration failed:', error);
      onProgress?.({ 
        stage: 'complete', 
        progress: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async getBackupHistory(): Promise<BackupMetadata[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_backup_history_v2' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get backup history:', error);
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    try {
      const fileName = `vaultix_backup_${backupId}.vbk`;
      
      // Delete local file
      try {
        await Filesystem.deleteFile({
          path: fileName,
          directory: Directory.Documents
        });
      } catch (error) {
        console.log('Local backup file not found');
      }

      // Delete from cloud if exists
      try {
        const files = await this.googleDrive.listFiles();
        const backupFile = files.find(f => f.name === fileName);
        if (backupFile) {
          await this.googleDrive.deleteFile(backupFile.id);
        }
      } catch (error) {
        console.log('Cloud backup file not found');
      }

      // Remove from history
      const history = await this.getBackupHistory();
      const updatedHistory = history.filter(b => b.id !== backupId);
      await Preferences.set({
        key: 'vaultix_backup_history_v2',
        value: JSON.stringify(updatedHistory)
      });
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw new Error('Failed to delete backup');
    }
  }

  async exportBackup(backupId: string): Promise<void> {
    try {
      const fileName = `vaultix_backup_${backupId}.vbk`;
      
      await Share.share({
        title: 'Export Vaultix Backup',
        text: 'Encrypted Vaultix backup file',
        files: [fileName]
      });
    } catch (error) {
      console.error('Failed to export backup:', error);
      throw new Error('Failed to export backup');
    }
  }

  private async gatherVaultData(includeSettings: boolean): Promise<any> {
    const [filesResult, foldersResult, settingsResult] = await Promise.all([
      Preferences.get({ key: 'vaultix_files' }),
      Preferences.get({ key: 'vaultix_folders' }),
      includeSettings ? Preferences.get({ key: 'vaultix_settings' }) : { value: null }
    ]);

    return {
      files: filesResult.value ? JSON.parse(filesResult.value) : [],
      folders: foldersResult.value ? JSON.parse(foldersResult.value) : [],
      settings: settingsResult.value ? JSON.parse(settingsResult.value) : {},
      metadata: {
        exportDate: new Date().toISOString(),
        appVersion: '2.0.0',
        platform: 'android'
      }
    };
  }

  private calculateTotalSize(vaultData: any): number {
    return vaultData.files.reduce((total: number, file: any) => total + (file.size || 0), 0);
  }

  private async encryptBackupData(data: any, password: string): Promise<string> {
    const jsonData = JSON.stringify(data);
    return FileEncryption.encryptFile(jsonData, password);
  }

  private async decryptBackupData(encryptedData: string, password: string): Promise<any> {
    const decryptedJson = FileEncryption.decryptFile(encryptedData, password);
    return JSON.parse(decryptedJson);
  }

  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private generateBackupId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    const history = await this.getBackupHistory();
    return history.find(b => b.id === backupId) || null;
  }

  private async updateBackupHistory(metadata: BackupMetadata): Promise<void> {
    const history = await this.getBackupHistory();
    history.push(metadata);
    
    // Keep only last 20 backups
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    await Preferences.set({
      key: 'vaultix_backup_history_v2',
      value: JSON.stringify(history)
    });
  }

  private async restoreVaultData(
    vaultData: any, 
    onProgress?: (progress: RestoreProgress) => void
  ): Promise<void> {
    const total = vaultData.files.length + vaultData.folders.length + 1;
    let current = 0;

    // Restore files
    for (const file of vaultData.files) {
      onProgress?.({
        stage: 'restoring',
        progress: 75 + (current / total) * 20,
        currentFile: file.name
      });
      current++;
    }

    // Save data to preferences
    await Promise.all([
      Preferences.set({ key: 'vaultix_files', value: JSON.stringify(vaultData.files) }),
      Preferences.set({ key: 'vaultix_folders', value: JSON.stringify(vaultData.folders) }),
      vaultData.settings ? 
        Preferences.set({ key: 'vaultix_settings', value: JSON.stringify(vaultData.settings) }) :
        Promise.resolve()
    ]);
  }
}
