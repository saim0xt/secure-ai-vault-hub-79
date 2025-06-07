
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FileEncryption } from '@/utils/encryption';

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  modifiedTime: string;
  mimeType: string;
}

export interface SyncStatus {
  isEnabled: boolean;
  lastSync: string;
  pendingUploads: number;
  pendingDownloads: number;
  totalSynced: number;
}

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private accessToken: string = '';
  private refreshToken: string = '';
  private readonly CLIENT_ID = 'your-google-client-id';
  private readonly CLIENT_SECRET = 'your-google-client-secret';
  private readonly SCOPE = 'https://www.googleapis.com/auth/drive.file';
  private readonly FOLDER_NAME = 'Vaultix_Backup';

  static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  async authenticate(): Promise<boolean> {
    try {
      // Initialize OAuth flow
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${this.CLIENT_ID}&` +
        `redirect_uri=http://localhost:8100&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(this.SCOPE)}&` +
        `access_type=offline&` +
        `prompt=consent`;

      // Open authentication window
      window.open(authUrl, '_blank');
      
      // Listen for the callback (simplified - in real app use proper OAuth handling)
      return new Promise((resolve) => {
        const checkAuth = setInterval(async () => {
          const { value } = await Preferences.get({ key: 'google_oauth_code' });
          if (value) {
            clearInterval(checkAuth);
            const success = await this.exchangeCodeForTokens(value);
            await Preferences.remove({ key: 'google_oauth_code' });
            resolve(success);
          }
        }, 1000);
      });
    } catch (error) {
      console.error('Google Drive authentication failed:', error);
      return false;
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<boolean> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:8100'
        })
      });

      const tokens = await response.json();
      
      if (tokens.access_token) {
        this.accessToken = tokens.access_token;
        this.refreshToken = tokens.refresh_token;
        
        await Preferences.set({
          key: 'google_drive_tokens',
          value: JSON.stringify(tokens)
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token exchange failed:', error);
      return false;
    }
  }

  async loadStoredTokens(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: 'google_drive_tokens' });
      if (value) {
        const tokens = JSON.parse(value);
        this.accessToken = tokens.access_token;
        this.refreshToken = tokens.refresh_token;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
      return false;
    }
  }

  async createBackupFolder(): Promise<string> {
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: this.FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder'
        })
      });

      const folder = await response.json();
      return folder.id;
    } catch (error) {
      console.error('Failed to create backup folder:', error);
      throw new Error('Failed to create backup folder');
    }
  }

  async uploadFile(fileName: string, fileData: string, folderId?: string): Promise<string> {
    try {
      const encryptedData = FileEncryption.encryptFile(fileData);
      
      // Create file metadata
      const metadata = {
        name: fileName,
        parents: folderId ? [folderId] : undefined
      };

      // Upload file
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([encryptedData], { type: 'application/octet-stream' }));

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: form
      });

      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error('Failed to upload file');
    }
  }

  async downloadFile(fileId: string): Promise<string> {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const encryptedData = await response.text();
      return FileEncryption.decryptFile(encryptedData);
    } catch (error) {
      console.error('File download failed:', error);
      throw new Error('Failed to download file');
    }
  }

  async listFiles(folderId?: string): Promise<DriveFile[]> {
    try {
      let query = folderId ? `'${folderId}' in parents` : '';
      
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  async syncVault(): Promise<SyncStatus> {
    try {
      // Get local files
      const { value: localFilesData } = await Preferences.get({ key: 'vaultix_files' });
      const localFiles = localFilesData ? JSON.parse(localFilesData) : [];
      
      // Get backup folder
      let folderId = await this.getBackupFolderId();
      if (!folderId) {
        folderId = await this.createBackupFolder();
      }

      // Get remote files
      const remoteFiles = await this.listFiles(folderId);
      
      let pendingUploads = 0;
      let pendingDownloads = 0;
      let totalSynced = 0;

      // Upload new/modified local files
      for (const localFile of localFiles) {
        const remoteFile = remoteFiles.find(rf => rf.name === localFile.name);
        
        if (!remoteFile || new Date(localFile.dateModified) > new Date(remoteFile.modifiedTime)) {
          await this.uploadFile(localFile.name, JSON.stringify(localFile), folderId);
          pendingUploads++;
          totalSynced++;
        }
      }

      // Download new/modified remote files
      for (const remoteFile of remoteFiles) {
        const localFile = localFiles.find(lf => lf.name === remoteFile.name);
        
        if (!localFile || new Date(remoteFile.modifiedTime) > new Date(localFile.dateModified)) {
          const fileData = await this.downloadFile(remoteFile.id);
          const parsedFile = JSON.parse(fileData);
          
          // Update local storage
          const index = localFiles.findIndex(lf => lf.id === parsedFile.id);
          if (index >= 0) {
            localFiles[index] = parsedFile;
          } else {
            localFiles.push(parsedFile);
          }
          
          pendingDownloads++;
          totalSynced++;
        }
      }

      // Save updated local files
      await Preferences.set({ key: 'vaultix_files', value: JSON.stringify(localFiles) });
      
      // Update sync status
      const syncStatus: SyncStatus = {
        isEnabled: true,
        lastSync: new Date().toISOString(),
        pendingUploads,
        pendingDownloads,
        totalSynced
      };

      await Preferences.set({ key: 'vaultix_sync_status', value: JSON.stringify(syncStatus) });
      return syncStatus;
    } catch (error) {
      console.error('Vault sync failed:', error);
      throw new Error('Failed to sync vault');
    }
  }

  private async getBackupFolderId(): Promise<string | null> {
    try {
      const files = await this.listFiles();
      const folder = files.find(f => f.name === this.FOLDER_NAME && f.mimeType === 'application/vnd.google-apps.folder');
      return folder?.id || null;
    } catch (error) {
      console.error('Failed to get backup folder ID:', error);
      return null;
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_sync_status' });
      if (value) {
        return JSON.parse(value);
      }
    } catch (error) {
      console.error('Failed to get sync status:', error);
    }
    
    return {
      isEnabled: false,
      lastSync: '',
      pendingUploads: 0,
      pendingDownloads: 0,
      totalSynced: 0
    };
  }
}
