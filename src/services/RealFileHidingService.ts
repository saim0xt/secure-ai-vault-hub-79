
import { registerPlugin } from '@capacitor/core';

export interface FileHidingPlugin {
  hideFile(options: { fileName: string }): Promise<{ success: boolean; fileName: string }>;
  showFile(options: { fileName: string }): Promise<{ success: boolean; fileName: string }>;
  isFileHidden(options: { fileName: string }): Promise<{ isHidden: boolean; fileName: string }>;
  getHiddenFiles(): Promise<{ files: string[] }>;
  getVisibleFiles(): Promise<{ files: string[] }>;
}

const RealFileHiding = registerPlugin<FileHidingPlugin>('RealFileHiding', {
  web: {
    hideFile: async () => ({ success: false, fileName: '' }),
    showFile: async () => ({ success: false, fileName: '' }),
    isFileHidden: async () => ({ isHidden: false, fileName: '' }),
    getHiddenFiles: async () => ({ files: [] }),
    getVisibleFiles: async () => ({ files: [] })
  }
});

export class RealFileHidingService {
  private static instance: RealFileHidingService;

  static getInstance(): RealFileHidingService {
    if (!RealFileHidingService.instance) {
      RealFileHidingService.instance = new RealFileHidingService();
    }
    return RealFileHidingService.instance;
  }

  async hideFile(fileName: string): Promise<boolean> {
    try {
      const result = await RealFileHiding.hideFile({ fileName });
      return result.success;
    } catch (error) {
      console.error('Failed to hide file:', error);
      return false;
    }
  }

  async showFile(fileName: string): Promise<boolean> {
    try {
      const result = await RealFileHiding.showFile({ fileName });
      return result.success;
    } catch (error) {
      console.error('Failed to show file:', error);
      return false;
    }
  }

  async isFileHidden(fileName: string): Promise<boolean> {
    try {
      const result = await RealFileHiding.isFileHidden({ fileName });
      return result.isHidden;
    } catch (error) {
      console.error('Failed to check file visibility:', error);
      return false;
    }
  }

  async getHiddenFiles(): Promise<string[]> {
    try {
      const result = await RealFileHiding.getHiddenFiles();
      return result.files;
    } catch (error) {
      console.error('Failed to get hidden files:', error);
      return [];
    }
  }

  async getVisibleFiles(): Promise<string[]> {
    try {
      const result = await RealFileHiding.getVisibleFiles();
      return result.files;
    } catch (error) {
      console.error('Failed to get visible files:', error);
      return [];
    }
  }
}
