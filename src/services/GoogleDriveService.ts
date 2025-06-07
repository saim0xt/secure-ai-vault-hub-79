
import { Preferences } from '@capacitor/preferences';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
}

export interface SyncStatus {
  isSync: boolean;
  lastSync: string;
  pendingUploads: number;
  pendingDownloads: number;
  totalFiles: number;
  syncedFiles: number;
}

export interface DriveConfig {
  clientId: string;
  apiKey: string;
  enabled: boolean;
}

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private accessToken: string = '';
  private refreshToken: string = '';
  private config: DriveConfig = { clientId: '', apiKey: '', enabled: false };
  private readonly SCOPES = 'https://www.googleapis.com/auth/drive.file';
  private readonly DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

  static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  async initialize(): Promise<void> {
    await this.loadConfiguration();
    await this.loadStoredTokens();
  }

  async configure(clientId: string, apiKey: string): Promise<void> {
    this.config = { clientId, apiKey, enabled: true };
    
    await Preferences.set({
      key: 'google_drive_config',
      value: JSON.stringify(this.config)
    });
  }

  async loadConfiguration(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'google_drive_config' });
      if (value) {
        this.config = JSON.parse(value);
      }
    } catch (error) {
      console.error('Failed to load Google Drive configuration:', error);
    }
  }

  async loadStoredTokens(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: 'google_drive_tokens' });
      if (value) {
        const tokenData = JSON.parse(value);
        this.accessToken = tokenData.accessToken;
        this.refreshToken = tokenData.refreshToken;
        
        // Verify token is still valid
        if (await this.verifyToken()) {
          return true;
        } else {
          // Try to refresh token
          return await this.refreshAccessToken();
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
      return false;
    }
  }

  async authenticate(): Promise<boolean> {
    if (!this.config.clientId) {
      throw new Error('Google Drive client ID not configured');
    }

    try {
      // Create OAuth URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${this.config.clientId}&` +
        `redirect_uri=http://localhost:8080/auth/callback&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(this.SCOPES)}&` +
        `access_type=offline&` +
        `prompt=consent`;

      // Open browser for authentication
      await Browser.open({ url: authUrl });

      // Listen for app URL scheme callback
      return new Promise((resolve) => {
        const listener = App.addListener('appUrlOpen', async (data) => {
          const url = new URL(data.url);
          const code = url.searchParams.get('code');
          
          if (code) {
            try {
              await this.exchangeCodeForTokens(code);
              listener.remove();
              resolve(true);
            } catch (error) {
              console.error('Token exchange failed:', error);
              listener.remove();
              resolve(false);
            }
          }
        });

        // Timeout after 5 minutes
        setTimeout(() => {
          listener.remove();
          resolve(false);
        }, 300000);
      });
    } catch (error) {
      console.error('Google Drive authentication failed:', error);
      return false;
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        code,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:8080/auth/callback'
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    
    await this.saveTokens();
  }

  private async verifyToken(): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${this.accessToken}`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async uploadFile(fileName: string, content: string, mimeType: string = 'application/octet-stream'): Promise<DriveFile> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      // Create file metadata
      const metadata = {
        name: fileName,
        parents: ['appDataFolder']
      };

      // Upload file using multipart upload
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const body = 
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        content +
        close_delim;

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`
        },
        body
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          if (await this.refreshAccessToken()) {
            return this.uploadFile(fileName, content, mimeType);
          }
        }
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      return this.mapDriveFile(result);
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error('Failed to upload file to Google Drive');
    }
  }

  async downloadFile(fileId: string): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          if (await this.refreshAccessToken()) {
            return this.downloadFile(fileId);
          }
        }
        throw new Error(`Download failed: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error('File download failed:', error);
      throw new Error('Failed to download file from Google Drive');
    }
  }

  async listFiles(): Promise<DriveFile[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
        `q=parents in 'appDataFolder'&` +
        `fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&` +
        `orderBy=modifiedTime desc`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          if (await this.refreshAccessToken()) {
            return this.listFiles();
          }
        }
        throw new Error(`List files failed: ${response.status}`);
      }

      const result = await response.json();
      return result.files.map((file: any) => this.mapDriveFile(file));
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          if (await this.refreshAccessToken()) {
            return this.deleteFile(fileId);
          }
        }
        throw new Error(`Delete failed: ${response.status}`);
      }
    } catch (error) {
      console.error('File deletion failed:', error);
      throw new Error('Failed to delete file from Google Drive');
    }
  }

  async syncVaultData(vaultData: any): Promise<void> {
    try {
      const dataString = JSON.stringify(vaultData);
      const fileName = `vault_sync_${new Date().toISOString().split('T')[0]}.json`;
      
      await this.uploadFile(fileName, dataString, 'application/json');
      
      await Preferences.set({
        key: 'last_drive_sync',
        value: new Date().toISOString()
      });

      // Update sync status
      await this.updateSyncStatus();
    } catch (error) {
      console.error('Vault sync failed:', error);
      throw new Error('Failed to sync vault data');
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const { value } = await Preferences.get({ key: 'last_drive_sync' });
      const lastSync = value || 'Never';
      
      const files = await this.listFiles();
      const vaultFiles = files.filter(f => f.name.includes('vault_sync'));
      
      return {
        isSync: this.accessToken !== '',
        lastSync,
        pendingUploads: 0,
        pendingDownloads: 0,
        totalFiles: files.length,
        syncedFiles: vaultFiles.length
      };
    } catch (error) {
      return {
        isSync: false,
        lastSync: 'Never',
        pendingUploads: 0,
        pendingDownloads: 0,
        totalFiles: 0,
        syncedFiles: 0
      };
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken || !this.config.clientId) {
      return false;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }
      
      await this.saveTokens();
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear invalid tokens
      this.accessToken = '';
      this.refreshToken = '';
      await this.clearTokens();
      return false;
    }
  }

  private async saveTokens(): Promise<void> {
    await Preferences.set({
      key: 'google_drive_tokens',
      value: JSON.stringify({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken
      })
    });
  }

  private async clearTokens(): Promise<void> {
    await Preferences.remove({ key: 'google_drive_tokens' });
  }

  private async updateSyncStatus(): Promise<void> {
    const status = await this.getSyncStatus();
    await Preferences.set({
      key: 'google_drive_sync_status',
      value: JSON.stringify(status)
    });
  }

  private mapDriveFile(file: any): DriveFile {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: parseInt(file.size || '0'),
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink
    };
  }

  isAuthenticated(): boolean {
    return this.accessToken !== '';
  }

  getConfig(): DriveConfig {
    return { ...this.config };
  }
}
