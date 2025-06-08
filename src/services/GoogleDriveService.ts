
import { Preferences } from '@capacitor/preferences';

export interface GoogleDriveConfig {
  clientId: string;
  apiKey: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
}

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private config: GoogleDriveConfig | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  async setConfig(config: GoogleDriveConfig): Promise<void> {
    this.config = config;
    await this.saveConfig();
  }

  private async saveConfig(): Promise<void> {
    if (this.config) {
      await Preferences.set({
        key: 'google_drive_config',
        value: JSON.stringify(this.config)
      });
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'google_drive_config' });
      if (value) {
        this.config = JSON.parse(value);
      }
    } catch (error) {
      console.error('Failed to load Google Drive config:', error);
    }
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
    await this.loadStoredTokens();
  }

  private async loadStoredTokens(): Promise<void> {
    try {
      const { value: accessToken } = await Preferences.get({ key: 'google_drive_access_token' });
      const { value: refreshToken } = await Preferences.get({ key: 'google_drive_refresh_token' });
      
      if (accessToken) this.accessToken = accessToken;
      if (refreshToken) this.refreshToken = refreshToken;
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
    }
  }

  private async saveTokens(): Promise<void> {
    try {
      if (this.accessToken) {
        await Preferences.set({
          key: 'google_drive_access_token',
          value: this.accessToken
        });
      }
      if (this.refreshToken) {
        await Preferences.set({
          key: 'google_drive_refresh_token',
          value: this.refreshToken
        });
      }
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  async authenticate(): Promise<boolean> {
    if (!this.config) {
      throw new Error('Google Drive not configured');
    }

    try {
      // Create OAuth2 URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${this.config.clientId}&` +
        `redirect_uri=${encodeURIComponent('urn:ietf:wg:oauth:2.0:oob')}&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent`;

      // Open authentication window (in a real app, this would be handled differently)
      window.open(authUrl, '_blank');
      
      // For demo purposes, return true
      // In a real implementation, you'd handle the OAuth flow properly
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  async exchangeCodeForTokens(code: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('Google Drive not configured');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
        })
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const tokens = await response.json();
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
      
      await this.saveTokens();
      return true;
    } catch (error) {
      console.error('Token exchange failed:', error);
      return false;
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken || !this.config) {
      return false;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
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

      const tokens = await response.json();
      this.accessToken = tokens.access_token;
      
      await this.saveTokens();
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  private async ensureValidToken(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    // Try to make a simple API call to test token validity
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.ok) {
        return true;
      }

      if (response.status === 401) {
        // Token expired, try to refresh
        return await this.refreshAccessToken();
      }

      return false;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  async uploadFile(fileName: string, content: string, mimeType: string = 'application/octet-stream'): Promise<string | null> {
    const isValid = await this.ensureValidToken();
    if (!isValid) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      // Convert content to blob
      const blob = new Blob([content], { type: mimeType });
      
      // Create form data for multipart upload
      const metadata = {
        name: fileName
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

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
      return result.id;
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error('Failed to upload file to Google Drive');
    }
  }

  async downloadFile(fileId: string): Promise<string> {
    const isValid = await this.ensureValidToken();
    if (!isValid) {
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

  async listFiles(query?: string): Promise<GoogleDriveFile[]> {
    const isValid = await this.ensureValidToken();
    if (!isValid) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      let url = 'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,size,createdTime,modifiedTime)';
      if (query) {
        url += `&q=${encodeURIComponent(query)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`List files failed: ${response.status}`);
      }

      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error('List files failed:', error);
      throw new Error('Failed to list files from Google Drive');
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const isValid = await this.ensureValidToken();
    if (!isValid) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('File deletion failed:', error);
      return false;
    }
  }

  async signOut(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    
    await Preferences.remove({ key: 'google_drive_access_token' });
    await Preferences.remove({ key: 'google_drive_refresh_token' });
  }
}
