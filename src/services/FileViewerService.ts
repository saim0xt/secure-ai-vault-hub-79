
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import CryptoJS from 'crypto-js';

interface ViewerConfig {
  enableThumbnails: boolean;
  maxPreviewSize: number;
  supportedFormats: string[];
}

export interface FilePreview {
  type: 'image' | 'video' | 'audio' | 'text' | 'pdf' | 'unsupported';
  preview: string | null;
  metadata: any;
  canEdit: boolean;
}

export interface FileMetadata {
  size: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  duration?: number;
  encoding?: string;
  lines?: number;
  pages?: number;
}

export class FileViewerService {
  private static instance: FileViewerService;
  private config: ViewerConfig = {
    enableThumbnails: true,
    maxPreviewSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'mp4', 'mp3']
  };

  static getInstance(): FileViewerService {
    if (!FileViewerService.instance) {
      FileViewerService.instance = new FileViewerService();
    }
    return FileViewerService.instance;
  }

  static async exportFile(file: any): Promise<string> {
    const instance = FileViewerService.getInstance();
    return instance.exportFileInternal(file);
  }

  private async exportFileInternal(file: any): Promise<string> {
    try {
      // Decrypt file data
      const decryptedData = this.decryptFileData(file.encryptedData);
      
      // Create temporary file for export
      const tempFileName = `export_${Date.now()}_${file.name}`;
      const tempPath = `exports/${tempFileName}`;
      
      await Filesystem.writeFile({
        path: tempPath,
        data: decryptedData,
        directory: Directory.Documents,
        encoding: file.type.startsWith('text/') ? Encoding.UTF8 : undefined
      });

      // Get the file URI
      const fileInfo = await Filesystem.getUri({
        directory: Directory.Documents,
        path: tempPath
      });

      return fileInfo.uri;
    } catch (error) {
      console.error('Failed to export file:', error);
      throw new Error('Failed to export file');
    }
  }

  async generatePreview(file: any): Promise<FilePreview> {
    try {
      const decryptedData = this.decryptFileData(file.encryptedData);
      const blob = this.dataUrlToBlob(decryptedData);
      
      switch (file.type) {
        case 'image':
          return await this.generateImagePreview(decryptedData, blob);
        case 'video':
          return await this.generateVideoPreview(blob);
        case 'audio':
          return await this.generateAudioPreview(blob);
        case 'document':
          return await this.generateDocumentPreview(decryptedData, blob);
        default:
          return this.generateUnsupportedPreview();
      }
    } catch (error) {
      console.error('Failed to generate preview:', error);
      return this.generateUnsupportedPreview();
    }
  }

  private async generateImagePreview(dataUrl: string, blob: Blob): Promise<FilePreview> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Create thumbnail
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const maxSize = 300;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        resolve({
          type: 'image',
          preview: canvas.toDataURL(),
          metadata: {
            dimensions: { width: img.width, height: img.height },
            size: blob.size,
            aspectRatio: img.width / img.height
          },
          canEdit: true
        });
      };
      
      img.onerror = () => resolve(this.generateUnsupportedPreview());
      img.src = dataUrl;
    });
  }

  private async generateVideoPreview(blob: Blob): Promise<FilePreview> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        // Create video thumbnail
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 300;
        canvas.height = (video.videoHeight / video.videoWidth) * 300;
        
        video.currentTime = Math.min(video.duration * 0.1, 5); // 10% in or 5 seconds
        
        video.onseeked = () => {
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          resolve({
            type: 'video',
            preview: canvas.toDataURL(),
            metadata: {
              dimensions: { width: video.videoWidth, height: video.videoHeight },
              duration: video.duration,
              size: blob.size
            },
            canEdit: false
          });
        };
      };
      
      video.onerror = () => resolve(this.generateUnsupportedPreview());
      video.src = URL.createObjectURL(blob);
    });
  }

  private async generateAudioPreview(blob: Blob): Promise<FilePreview> {
    return new Promise((resolve) => {
      const audio = new Audio();
      
      audio.onloadedmetadata = () => {
        // Generate audio waveform visualization
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 300;
        canvas.height = 100;
        
        if (ctx) {
          // Simple waveform visualization
          ctx.fillStyle = '#4F46E5';
          const bars = 50;
          const barWidth = canvas.width / bars;
          
          for (let i = 0; i < bars; i++) {
            const height = Math.random() * canvas.height * 0.8;
            ctx.fillRect(i * barWidth, canvas.height - height, barWidth - 1, height);
          }
        }
        
        resolve({
          type: 'audio',
          preview: canvas.toDataURL(),
          metadata: {
            duration: audio.duration,
            size: blob.size
          },
          canEdit: false
        });
      };
      
      audio.onerror = () => resolve(this.generateUnsupportedPreview());
      audio.src = URL.createObjectURL(blob);
    });
  }

  private async generateDocumentPreview(dataUrl: string, blob: Blob): Promise<FilePreview> {
    try {
      // For text files, extract first few lines
      if (blob.type.startsWith('text/')) {
        const text = await blob.text();
        const preview = text.substring(0, 500);
        
        return {
          type: 'text',
          preview: preview,
          metadata: {
            size: blob.size,
            encoding: 'UTF-8',
            lines: text.split('\n').length
          },
          canEdit: true
        };
      }
      
      // For PDFs, would need PDF.js integration
      if (blob.type === 'application/pdf') {
        return {
          type: 'pdf',
          preview: null,
          metadata: {
            size: blob.size,
            pages: 1 // Would need PDF parsing
          },
          canEdit: false
        };
      }
      
      return this.generateUnsupportedPreview();
    } catch (error) {
      return this.generateUnsupportedPreview();
    }
  }

  private generateUnsupportedPreview(): FilePreview {
    return {
      type: 'unsupported',
      preview: null,
      metadata: {},
      canEdit: false
    };
  }

  async openFile(file: any): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Export file to temp directory and open with native app
        const tempPath = await this.exportToTemp(file);
        await FileOpener.open({
          filePath: tempPath,
          contentType: this.getMimeType(file.type)
        });
      } else {
        // Web: Open in new tab
        const decryptedData = this.decryptFileData(file.encryptedData);
        const blob = this.dataUrlToBlob(decryptedData);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      throw new Error('Unable to open file');
    }
  }

  async exportFile(file: any): Promise<string> {
    try {
      const decryptedData = this.decryptFileData(file.encryptedData);
      
      if (Capacitor.isNativePlatform()) {
        // Save to Downloads directory
        const fileName = `vaultix_${file.name}`;
        const path = `Download/${fileName}`;
        
        await Filesystem.writeFile({
          path,
          data: decryptedData.split(',')[1], // Remove data URL prefix
          directory: Directory.External
        });
        
        return path;
      } else {
        // Web: Trigger download
        const blob = this.dataUrlToBlob(decryptedData);
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return url;
      }
    } catch (error) {
      console.error('Failed to export file:', error);
      throw new Error('Failed to export file');
    }
  }

  private async exportToTemp(file: any): Promise<string> {
    const decryptedData = this.decryptFileData(file.encryptedData);
    const fileName = `temp_${Date.now()}_${file.name}`;
    const path = `cache/${fileName}`;
    
    await Filesystem.writeFile({
      path,
      data: decryptedData.split(',')[1],
      directory: Directory.Cache
    });
    
    const fileUri = await Filesystem.getUri({
      directory: Directory.Cache,
      path
    });
    
    return fileUri.uri;
  }

  private decryptFileData(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, 'vaultix_secret_key');
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('Failed to decrypt file data');
    }
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }

  private getMimeType(fileType: string): string {
    const mimeTypes: Record<string, string> = {
      'image': 'image/*',
      'video': 'video/*',
      'audio': 'audio/*',
      'document': 'application/pdf',
      'other': 'application/octet-stream'
    };
    
    return mimeTypes[fileType] || 'application/octet-stream';
  }

  async getFileMetadata(file: any): Promise<FileMetadata> {
    try {
      const decryptedData = this.decryptFileData(file.encryptedData);
      const blob = this.dataUrlToBlob(decryptedData);
      
      const metadata: FileMetadata = {
        size: blob.size,
        mimeType: blob.type
      };
      
      // Add type-specific metadata
      if (file.type === 'image') {
        const dimensions = await this.getImageDimensions(decryptedData);
        metadata.dimensions = dimensions;
      } else if (file.type === 'video' || file.type === 'audio') {
        const duration = await this.getMediaDuration(blob);
        metadata.duration = duration;
      }
      
      return metadata;
    } catch (error) {
      return {
        size: file.size || 0,
        mimeType: 'application/octet-stream'
      };
    }
  }

  private getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = dataUrl;
    });
  }

  private getMediaDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const media = blob.type.startsWith('video/') ? document.createElement('video') : new Audio();
      media.onloadedmetadata = () => resolve(media.duration || 0);
      media.onerror = () => resolve(0);
      media.src = URL.createObjectURL(blob);
    });
  }
}
