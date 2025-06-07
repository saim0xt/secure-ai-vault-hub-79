
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { VaultFile } from '@/contexts/VaultContext';
import CryptoJS from 'crypto-js';

export interface ViewableFile {
  id: string;
  name: string;
  type: string;
  data: string;
  mimeType: string;
}

export class FileViewerService {
  private static readonly ENCRYPTION_KEY = 'vaultix_file_key';

  static async decryptFileData(encryptedData: string): Promise<string> {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Failed to decrypt file data:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  static async prepareFileForViewing(file: VaultFile): Promise<ViewableFile> {
    try {
      const decryptedData = await this.decryptFileData(file.encryptedData);
      
      return {
        id: file.id,
        name: file.name,
        type: file.type,
        data: decryptedData,
        mimeType: this.getMimeType(file.name, file.type)
      };
    } catch (error) {
      console.error('Failed to prepare file for viewing:', error);
      throw error;
    }
  }

  static getMimeType(filename: string, type: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'mp3':
        return 'audio/mp3';
      case 'wav':
        return 'audio/wav';
      case 'ogg':
        return 'audio/ogg';
      case 'pdf':
        return 'application/pdf';
      case 'txt':
        return 'text/plain';
      case 'doc':
      case 'docx':
        return 'application/msword';
      default:
        return 'application/octet-stream';
    }
  }

  static canViewInApp(file: VaultFile): boolean {
    const viewableTypes = ['image', 'video', 'audio', 'document'];
    return viewableTypes.includes(file.type);
  }

  static async exportFile(file: VaultFile, targetPath?: string): Promise<string> {
    try {
      const decryptedData = await this.decryptFileData(file.encryptedData);
      const fileName = targetPath || `vaultix_export_${file.name}`;
      
      await Filesystem.writeFile({
        path: fileName,
        data: decryptedData,
        directory: Directory.Documents,
        encoding: file.type === 'image' || file.type === 'video' ? undefined : Encoding.UTF8
      });

      return fileName;
    } catch (error) {
      console.error('Failed to export file:', error);
      throw error;
    }
  }
}
