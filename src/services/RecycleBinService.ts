
import { Preferences } from '@capacitor/preferences';
import { VaultFile } from '@/contexts/VaultContext';

export interface DeletedFile extends VaultFile {
  deletedAt: string;
  originalFolderId?: string;
}

export class RecycleBinService {
  private static readonly RECYCLE_BIN_KEY = 'vaultix_recycle_bin';
  private static readonly RETENTION_DAYS = 7;

  static async addToRecycleBin(file: VaultFile): Promise<void> {
    try {
      const deletedFile: DeletedFile = {
        ...file,
        deletedAt: new Date().toISOString(),
        originalFolderId: file.folderId
      };

      const recycleBin = await this.getRecycleBin();
      recycleBin.push(deletedFile);
      
      await this.saveRecycleBin(recycleBin);
    } catch (error) {
      console.error('Failed to add file to recycle bin:', error);
      throw error;
    }
  }

  static async getRecycleBin(): Promise<DeletedFile[]> {
    try {
      const { value } = await Preferences.get({ key: this.RECYCLE_BIN_KEY });
      if (!value) return [];

      const recycleBin: DeletedFile[] = JSON.parse(value);
      
      // Clean up expired files
      const validFiles = recycleBin.filter(file => {
        const deletedDate = new Date(file.deletedAt);
        const expiryDate = new Date(deletedDate.getTime() + (this.RETENTION_DAYS * 24 * 60 * 60 * 1000));
        return new Date() < expiryDate;
      });

      if (validFiles.length !== recycleBin.length) {
        await this.saveRecycleBin(validFiles);
      }

      return validFiles;
    } catch (error) {
      console.error('Failed to get recycle bin:', error);
      return [];
    }
  }

  static async restoreFile(fileId: string): Promise<DeletedFile | null> {
    try {
      const recycleBin = await this.getRecycleBin();
      const fileIndex = recycleBin.findIndex(f => f.id === fileId);
      
      if (fileIndex === -1) return null;

      const [restoredFile] = recycleBin.splice(fileIndex, 1);
      await this.saveRecycleBin(recycleBin);
      
      return restoredFile;
    } catch (error) {
      console.error('Failed to restore file:', error);
      throw error;
    }
  }

  static async permanentlyDelete(fileId: string): Promise<boolean> {
    try {
      const recycleBin = await this.getRecycleBin();
      const filteredBin = recycleBin.filter(f => f.id !== fileId);
      
      if (filteredBin.length === recycleBin.length) return false;
      
      await this.saveRecycleBin(filteredBin);
      return true;
    } catch (error) {
      console.error('Failed to permanently delete file:', error);
      return false;
    }
  }

  static async emptyRecycleBin(): Promise<void> {
    try {
      await Preferences.remove({ key: this.RECYCLE_BIN_KEY });
    } catch (error) {
      console.error('Failed to empty recycle bin:', error);
      throw error;
    }
  }

  private static async saveRecycleBin(recycleBin: DeletedFile[]): Promise<void> {
    await Preferences.set({
      key: this.RECYCLE_BIN_KEY,
      value: JSON.stringify(recycleBin)
    });
  }

  static async getRecycleBinStats(): Promise<{ count: number; totalSize: number }> {
    const recycleBin = await this.getRecycleBin();
    const totalSize = recycleBin.reduce((sum, file) => sum + file.size, 0);
    
    return {
      count: recycleBin.length,
      totalSize
    };
  }
}
