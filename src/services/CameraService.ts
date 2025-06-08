
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { VaultFile } from '@/contexts/VaultContext';

export interface CameraSettings {
  quality: number;
  allowEditing: boolean;
  saveToGallery: boolean;
  resultType: CameraResultType;
}

export interface PhotoMetadata {
  width: number;
  height: number;
  size: number;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export class CameraService {
  private static instance: CameraService;
  
  static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  async capturePhoto(settings?: Partial<CameraSettings>): Promise<VaultFile> {
    try {
      const defaultSettings: CameraSettings = {
        quality: 90,
        allowEditing: false,
        saveToGallery: false,
        resultType: CameraResultType.DataUrl
      };

      const cameraSettings = { ...defaultSettings, ...settings };

      const image = await Camera.getPhoto({
        quality: cameraSettings.quality,
        allowEditing: cameraSettings.allowEditing,
        resultType: cameraSettings.resultType,
        source: CameraSource.Camera,
        saveToGallery: cameraSettings.saveToGallery
      });

      return await this.processPhoto(image);
    } catch (error) {
      console.error('Camera capture failed:', error);
      throw new Error('Failed to capture photo');
    }
  }

  async selectFromGallery(): Promise<VaultFile> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      return await this.processPhoto(image);
    } catch (error) {
      console.error('Gallery selection failed:', error);
      throw new Error('Failed to select photo from gallery');
    }
  }

  private async processPhoto(photo: Photo): Promise<VaultFile> {
    const timestamp = new Date().toISOString();
    const fileName = `photo_${Date.now()}.jpg`;
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create metadata with fallback values
    const metadata: PhotoMetadata = {
      width: 0, // Photo interface doesn't have width/height
      height: 0,
      size: photo.dataUrl ? new Blob([photo.dataUrl]).size : 0,
      timestamp
    };

    // Save photo to secure directory
    if (photo.dataUrl) {
      await Filesystem.writeFile({
        path: `secure_photos/${fileName}`,
        data: photo.dataUrl,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
    }

    return {
      id: fileId,
      name: fileName,
      type: 'image' as const,
      size: metadata.size,
      dateAdded: timestamp,
      encrypted: true,
      category: 'images',
      tags: ['camera', 'photo'],
      data: photo.dataUrl || '',
      metadata,
      thumbnail: await this.generateThumbnail(photo.dataUrl || ''),
      path: `secure_photos/${fileName}`
    };
  }

  private async generateThumbnail(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxSize = 150;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      
      img.src = dataUrl;
    });
  }

  async getStoredPhotos(): Promise<VaultFile[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_camera_photos' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get stored photos:', error);
      return [];
    }
  }

  async savePhoto(photo: VaultFile): Promise<void> {
    try {
      const photos = await this.getStoredPhotos();
      photos.push(photo);
      
      await Preferences.set({
        key: 'vaultix_camera_photos',
        value: JSON.stringify(photos)
      });
    } catch (error) {
      console.error('Failed to save photo:', error);
      throw new Error('Failed to save photo');
    }
  }

  async deletePhoto(photoId: string): Promise<void> {
    try {
      const photos = await this.getStoredPhotos();
      const updatedPhotos = photos.filter(p => p.id !== photoId);
      
      await Preferences.set({
        key: 'vaultix_camera_photos',
        value: JSON.stringify(updatedPhotos)
      });
    } catch (error) {
      console.error('Failed to delete photo:', error);
      throw new Error('Failed to delete photo');
    }
  }
}
