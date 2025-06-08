
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';

export interface SecureFileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  created: string;
  modified: string;
  checksum: string;
}

export class AndroidStorageService {
  private static instance: AndroidStorageService;
  private encryptionKey: string;

  static getInstance(): AndroidStorageService {
    if (!AndroidStorageService.instance) {
      AndroidStorageService.instance = new AndroidStorageService();
    }
    return AndroidStorageService.instance;
  }

  constructor() {
    this.encryptionKey = 'vaultix_secure_key_2024'; // In production, derive from user credentials
  }

  async initializeSecureStorage(): Promise<void> {
    try {
      // Create secure directories
      await this.ensureDirectoryExists('vaultix_secure');
      await this.ensureDirectoryExists('vaultix_secure/files');
      await this.ensureDirectoryExists('vaultix_secure/thumbnails');
      await this.ensureDirectoryExists('vaultix_secure/backups');
      
      console.log('Secure storage initialized');
    } catch (error) {
      console.error('Failed to initialize secure storage:', error);
      throw error;
    }
  }

  private async ensureDirectoryExists(path: string): Promise<void> {
    try {
      await Filesystem.mkdir({
        path,
        directory: Directory.Documents,
        recursive: true
      });
    } catch (error) {
      // Directory might already exist, which is fine
      console.log(`Directory ${path} check:`, error);
    }
  }

  async storeSecureFile(fileData: ArrayBuffer, metadata: SecureFileMetadata): Promise<string> {
    try {
      // Encrypt file data
      const encryptedData = this.encryptData(fileData);
      const fileName = `${metadata.id}.enc`;
      const filePath = `vaultix_secure/files/${fileName}`;

      // Store encrypted file
      await Filesystem.writeFile({
        path: filePath,
        data: encryptedData,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      // Store metadata
      await this.storeFileMetadata(metadata);

      console.log(`Secure file stored: ${fileName}`);
      return filePath;
    } catch (error) {
      console.error('Failed to store secure file:', error);
      throw error;
    }
  }

  async retrieveSecureFile(fileId: string): Promise<ArrayBuffer | null> {
    try {
      const fileName = `${fileId}.enc`;
      const filePath = `vaultix_secure/files/${fileName}`;

      const result = await Filesystem.readFile({
        path: filePath,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      // Decrypt file data
      const decryptedData = this.decryptData(result.data as string);
      return decryptedData;
    } catch (error) {
      console.error('Failed to retrieve secure file:', error);
      return null;
    }
  }

  async deleteSecureFile(fileId: string): Promise<boolean> {
    try {
      const fileName = `${fileId}.enc`;
      const filePath = `vaultix_secure/files/${fileName}`;

      await Filesystem.deleteFile({
        path: filePath,
        directory: Directory.Documents
      });

      // Remove metadata
      await this.removeFileMetadata(fileId);

      console.log(`Secure file deleted: ${fileName}`);
      return true;
    } catch (error) {
      console.error('Failed to delete secure file:', error);
      return false;
    }
  }

  private async storeFileMetadata(metadata: SecureFileMetadata): Promise<void> {
    try {
      const metadataKey = `vaultix_file_meta_${metadata.id}`;
      await Preferences.set({
        key: metadataKey,
        value: JSON.stringify(metadata)
      });
    } catch (error) {
      console.error('Failed to store file metadata:', error);
      throw error;
    }
  }

  async getFileMetadata(fileId: string): Promise<SecureFileMetadata | null> {
    try {
      const metadataKey = `vaultix_file_meta_${fileId}`;
      const { value } = await Preferences.get({ key: metadataKey });
      
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      return null;
    }
  }

  private async removeFileMetadata(fileId: string): Promise<void> {
    try {
      const metadataKey = `vaultix_file_meta_${fileId}`;
      await Preferences.remove({ key: metadataKey });
    } catch (error) {
      console.error('Failed to remove file metadata:', error);
    }
  }

  async getAllFileMetadata(): Promise<SecureFileMetadata[]> {
    try {
      const { keys } = await Preferences.keys();
      const metadataKeys = keys.filter(key => key.startsWith('vaultix_file_meta_'));
      
      const metadataPromises = metadataKeys.map(async (key) => {
        const { value } = await Preferences.get({ key });
        return value ? JSON.parse(value) : null;
      });

      const metadataArray = await Promise.all(metadataPromises);
      return metadataArray.filter(metadata => metadata !== null);
    } catch (error) {
      console.error('Failed to get all file metadata:', error);
      return [];
    }
  }

  private encryptData(data: ArrayBuffer): string {
    try {
      const dataView = new Uint8Array(data);
      const dataString = Array.from(dataView).map(byte => String.fromCharCode(byte)).join('');
      const encrypted = CryptoJS.AES.encrypt(dataString, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  private decryptData(encryptedData: string): ArrayBuffer {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      const bytes = new Uint8Array(decryptedString.length);
      for (let i = 0; i < decryptedString.length; i++) {
        bytes[i] = decryptedString.charCodeAt(i);
      }
      
      return bytes.buffer;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  async getStorageInfo(): Promise<{
    totalFiles: number;
    totalSize: number;
    availableSpace: number;
  }> {
    try {
      const metadata = await this.getAllFileMetadata();
      const totalFiles = metadata.length;
      const totalSize = metadata.reduce((sum, meta) => sum + meta.size, 0);
      
      // Get available space (simplified for demo)
      const availableSpace = 1024 * 1024 * 1024; // 1GB placeholder
      
      return {
        totalFiles,
        totalSize,
        availableSpace
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        availableSpace: 0
      };
    }
  }

  async clearAllSecureData(): Promise<void> {
    try {
      // Get all file metadata
      const metadata = await this.getAllFileMetadata();
      
      // Delete all files
      const deletePromises = metadata.map(meta => this.deleteSecureFile(meta.id));
      await Promise.all(deletePromises);
      
      // Clear all vault-related preferences
      const { keys } = await Preferences.keys();
      const vaultKeys = keys.filter(key => key.startsWith('vaultix_'));
      
      const clearPromises = vaultKeys.map(key => Preferences.remove({ key }));
      await Promise.all(clearPromises);
      
      console.log('All secure data cleared');
    } catch (error) {
      console.error('Failed to clear secure data:', error);
      throw error;
    }
  }
}
