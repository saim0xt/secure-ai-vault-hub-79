
import { Preferences } from '@capacitor/preferences';

export interface GoogleDriveConfig {
  clientId: string;
  apiKey: string;
  accessToken?: string;
  refreshToken?: string;
  enabled: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
}

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private config: GoogleDriveConfig = {
    clientId: '',
    apiKey: '',
    enabled: false
  };
  private isAuthenticated = false;

  static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_google_drive_config' });
      if (value) {
        this.config = { ...this.config, ...JSON.parse(value) };
        this.isAuthenticated = !!this.config.accessToken;
      }
    } catch (error) {
      console.error('Failed to load Google Drive config:', error);
    }
  }

  async saveConfig(config: Partial<GoogleDriveConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    try {
      await Preferences.set({
        key: 'vaultix_google_drive_config',
        value: JSON.stringify(this.config)
      });
    } catch (error) {
      console.error('Failed to save Google Drive config:', error);
    }
  }

  async authenticate(): Promise<boolean> {
    if (!this.config.clientId || !this.config.apiKey) {
      throw new Error('Google Drive API credentials not configured');
    }

    try {
      // Implement OAuth2 flow for web
      const authUrl = `https://accounts.google.com/oauth2/auth?` +
        `client_id=${this.config.clientId}&` +
        `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}&` +
        `response_type=code&` +
        `access_type=offline`;

      // Open auth window
      const authWindow = window.open(authUrl, '_blank', 'width=500,height=600');
      
      return new Promise((resolve, reject) => {
        const checkAuth = setInterval(() => {
          try {
            if (authWindow?.closed) {
              clearInterval(checkAuth);
              reject(new Error('Authentication cancelled'));
            }
            
            // Check for auth code in URL
            const url = authWindow?.location.href;
            if (url?.includes('code=')) {
              const code = new URL(url).searchParams.get('code');
              if (code) {
                authWindow.close();
                clearInterval(checkAuth);
                this.exchangeCodeForTokens(code).then(resolve).catch(reject);
              }
            }
          } catch (error) {
            // Cross-origin error is expected during auth flow
          }
        }, 1000);
      });
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<boolean> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: '', // This should be handled server-side in production
          code,
          grant_type: 'authorization_code',
          redirect_uri: window.location.origin
        })
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const tokens = await response.json();
      
      await this.saveConfig({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      });

      this.isAuthenticated = true;
      return true;
    } catch (error) {
      console.error('Token exchange failed:', error);
      return false;
    }
  }

  async uploadFile(fileName: string, content: string, mimeType: string = 'application/octet-stream'): Promise<string> {
    if (!this.isAuthenticated || !this.config.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      // Create file metadata
      const metadata = {
        name: fileName,
        parents: ['appDataFolder'] // Store in app data folder for security
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([content], { type: mimeType }));

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        },
        body: form
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.refreshAccessToken();
          return this.uploadFile(fileName, content, mimeType); // Retry
        }
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error('Failed to upload file to Google Drive');
    }
  }

  async downloadFile(fileId: string): Promise<string> {
    if (!this.isAuthenticated || !this.config.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.refreshAccessToken();
          return this.downloadFile(fileId); // Retry
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
    if (!this.isAuthenticated || !this.config.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,mimeType,size,createdTime,modifiedTime)', {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.refreshAccessToken();
          return this.listFiles(); // Retry
        }
        throw new Error(`List files failed: ${response.status}`);
      }

      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error('List files failed:', error);
      throw new Error('Failed to list files from Google Drive');
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.isAuthenticated || !this.config.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.refreshAccessToken();
          return this.deleteFile(fileId); // Retry
        }
        throw new Error(`Delete failed: ${response.status}`);
      }
    } catch (error) {
      console.error('File deletion failed:', error);
      throw new Error('Failed to delete file from Google Drive');
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.config.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          refresh_token: this.config.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokens = await response.json();
      
      await this.saveConfig({
        accessToken: tokens.access_token
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.isAuthenticated = false;
      throw new Error('Authentication expired, please re-authenticate');
    }
  }

  isAuthenticated(): boolean {
    return this.isAuthenticated && !!this.config.accessToken;
  }

  getConfig(): GoogleDriveConfig {
    return { ...this.config };
  }
}
