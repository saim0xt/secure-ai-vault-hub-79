import { Preferences } from '@capacitor/preferences';

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
}

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private accessToken: string = '';
  private refreshToken: string = '';
  private clientId: string = '';
  private clientSecret: string = '';

  static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  async configure(clientId: string, clientSecret: string): Promise<void> {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    
    await Preferences.set({
      key: 'google_drive_config',
      value: JSON.stringify({ clientId, clientSecret })
    });
  }

  async loadConfiguration(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'google_drive_config' });
      if (value) {
        const config = JSON.parse(value);
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
      }

      const { value: tokens } = await Preferences.get({ key: 'google_drive_tokens' });
      if (tokens) {
        const tokenData = JSON.parse(tokens);
        this.accessToken = tokenData.accessToken;
        this.refreshToken = tokenData.refreshToken;
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
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
      return false;
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      // In a real app, this would use OAuth2 flow
      // For now, we'll simulate the authentication process
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${this.clientId}&` +
        `redirect_uri=http://localhost:8080/auth/callback&` +
        `response_type=code&` +
        `scope=https://www.googleapis.com/auth/drive.file&` +
        `access_type=offline`;

      console.log('Google Drive authentication URL:', authUrl);
      
      // In a real implementation, this would open a browser and handle the OAuth flow
      // For demo purposes, we'll simulate a successful authentication
      this.accessToken = 'demo_access_token';
      this.refreshToken = 'demo_refresh_token';
      
      await this.saveTokens();
      return true;
    } catch (error) {
      console.error('Google Drive authentication failed:', error);
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

  async uploadFile(fileName: string, content: string, mimeType: string = 'application/octet-stream'): Promise<DriveFile> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const metadata = {
        name: fileName,
        parents: ['appDataFolder'] // Store in app data folder for privacy
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([content], { type: mimeType }));

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        id: result.id,
        name: result.name,
        mimeType: result.mimeType,
        size: parseInt(result.size || '0'),
        modifiedTime: result.modifiedTime,
        webViewLink: result.webViewLink
      };
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
        `fields=files(id,name,mimeType,size,modifiedTime,webViewLink)`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`List files failed: ${response.status}`);
      }

      const result = await response.json();
      return result.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: parseInt(file.size || '0'),
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink
      }));
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
      const fileName = `vault_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      await this.uploadFile(fileName, dataString, 'application/json');
      
      await Preferences.set({
        key: 'last_drive_sync',
        value: new Date().toISOString()
      });
    } catch (error) {
      console.error('Vault sync failed:', error);
      throw new Error('Failed to sync vault data');
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const { value } = await Preferences.get({ key: 'last_drive_sync' });
      const lastSync = value || 'Never';
      
      return {
        isSync: this.accessToken !== '',
        lastSync,
        pendingUploads: 0,
        pendingDownloads: 0
      };
    } catch (error) {
      return {
        isSync: false,
        lastSync: 'Never',
        pendingUploads: 0,
        pendingDownloads: 0
      };
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken || !this.clientId || !this.clientSecret) {
      return false;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
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
      return false;
    }
  }

  isAuthenticated(): boolean {
    return this.accessToken !== '';
  }
}
