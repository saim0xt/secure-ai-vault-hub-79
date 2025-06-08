import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { Device } from '@capacitor/device';
import { Filesystem, Directory } from '@capacitor/filesystem';
import CryptoJS from 'crypto-js';
import { RecycleBinService, DeletedFile } from '@/services/RecycleBinService';
import { FileViewerService } from '@/services/FileViewerService';
import { DuplicateDetectionService, DuplicateGroup } from '@/services/DuplicateDetectionService';
import { AndroidStorageService, SecureFileMetadata } from '@/services/AndroidStorageService';

export interface VaultFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  size: number;
  dateAdded: string;
  dateModified: string;
  encryptedData: string;
  thumbnail?: string;
  folderId?: string;
  tags: string[];
  isFavorite: boolean;
}

export interface VaultFolder {
  id: string;
  name: string;
  dateCreated: string;
  parentId?: string;
  fileCount: number;
}

interface VaultContextType {
  files: VaultFile[];
  folders: VaultFolder[];
  selectedFiles: string[];
  currentFolder: string | null;
  addFile: (file: File, folderId?: string) => Promise<void>;
  deleteFile: (fileId: string, permanent?: boolean) => Promise<void>;
  addFolder: (name: string, parentId?: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  moveFile: (fileId: string, targetFolderId?: string) => Promise<void>;
  moveFiles: (fileIds: string[], targetFolderId?: string) => Promise<void>;
  renameFile: (fileId: string, newName: string) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  searchFiles: (query: string) => VaultFile[];
  toggleFavorite: (fileId: string) => Promise<void>;
  addTag: (fileId: string, tag: string) => Promise<void>;
  removeTag: (fileId: string, tag: string) => Promise<void>;
  getStorageUsage: () => Promise<{ used: number; total: number; available: number; percentage: number; formattedUsed: string; formattedTotal: string; formattedAvailable: string }>;
  setCurrentFolder: (folderId: string | null) => void;
  toggleFileSelection: (fileId: string) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;
  bulkDelete: (fileIds: string[], permanent?: boolean) => Promise<void>;
  bulkMove: (fileIds: string[], targetFolderId?: string) => Promise<void>;
  exportFile: (fileId: string) => Promise<void>;
  exportFiles: (fileIds: string[]) => Promise<void>;
  getRecycleBin: () => Promise<DeletedFile[]>;
  restoreFromRecycleBin: (fileId: string) => Promise<void>;
  emptyRecycleBin: () => Promise<void>;
  findDuplicates: () => Promise<DuplicateGroup[]>;
  cleanupDuplicates: (duplicateGroups: DuplicateGroup[]) => Promise<void>;
  loading: boolean;
  refreshFiles: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const androidStorage = AndroidStorageService.getInstance();

  useEffect(() => {
    initializeVault();
  }, []);

  const initializeVault = async () => {
    try {
      setLoading(true);
      console.log('Initializing real Android vault...');
      
      await createSecureStorage();
      await loadVaultData();
      
      console.log('Real Android vault initialized successfully');
    } catch (error) {
      console.error('Failed to initialize real Android vault:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSecureStorage = async () => {
    try {
      await Filesystem.mkdir({
        path: '.vaultix_secure',
        directory: Directory.Data,
        recursive: true
      });
      
      await Filesystem.mkdir({
        path: '.vaultix_secure/files',
        directory: Directory.Data,
        recursive: true
      });
      
      console.log('Secure storage directories created');
    } catch (error) {
      console.log('Secure storage directories already exist or error:', error);
    }
  };

  const loadVaultData = async () => {
    try {
      console.log('Loading vault data from real Android storage...');
      
      const [filesResult, foldersResult] = await Promise.all([
        Preferences.get({ key: 'vaultix_files_android' }),
        Preferences.get({ key: 'vaultix_folders_android' })
      ]);

      if (filesResult.value) {
        const loadedFiles = JSON.parse(filesResult.value);
        console.log('Loaded files from real Android storage:', loadedFiles.length);
        setFiles(loadedFiles);
      } else {
        console.log('No files found in real Android storage');
        setFiles([]);
      }
      
      if (foldersResult.value) {
        const loadedFolders = JSON.parse(foldersResult.value);
        console.log('Loaded folders from real Android storage:', loadedFolders.length);
        setFolders(loadedFolders);
      } else {
        console.log('No folders found in real Android storage');
        setFolders([]);
      }
    } catch (error) {
      console.error('Error loading vault data from real Android storage:', error);
      setFiles([]);
      setFolders([]);
    }
  };

  const refreshFiles = async () => {
    console.log('Refreshing files from real Android storage...');
    await loadVaultData();
  };

  const saveFiles = async (newFiles: VaultFile[]) => {
    try {
      console.log('Saving files to real Android storage:', newFiles.length);
      await Preferences.set({ key: 'vaultix_files_android', value: JSON.stringify(newFiles) });
      setFiles(newFiles);
      console.log('Files saved successfully to real Android storage');
    } catch (error) {
      console.error('Error saving files to real Android storage:', error);
      throw error;
    }
  };

  const saveFolders = async (newFolders: VaultFolder[]) => {
    try {
      console.log('Saving folders to real Android storage:', newFolders.length);
      await Preferences.set({ key: 'vaultix_folders_android', value: JSON.stringify(newFolders) });
      setFolders(newFolders);
      console.log('Folders saved successfully to real Android storage');
    } catch (error) {
      console.error('Error saving folders to real Android storage:', error);
      throw error;
    }
  };

  // Real Android file operations
  const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const getFileType = (file: File): VaultFile['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.includes('pdf') || file.type.includes('document')) return 'document';
    return 'other';
  };

  const generateChecksum = (data: ArrayBuffer): string => {
    const wordArray = CryptoJS.lib.WordArray.create(data);
    return CryptoJS.SHA256(wordArray).toString();
  };

  const addFile = async (file: File, folderId?: string) => {
    try {
      console.log('Adding file to real Android vault:', file.name, 'Size:', file.size);
      setLoading(true);

      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileData = await fileToArrayBuffer(file);
      const base64Data = await fileToBase64(file);
      const checksum = generateChecksum(fileData);

      // Create secure file metadata for Android storage
      const metadata: SecureFileMetadata = {
        id: fileId,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        checksum
      };

      // Store file securely using Android storage
      await androidStorage.storeSecureFile(fileData, metadata);

      // Create vault file entry
      const newFile: VaultFile = {
        id: fileId,
        name: file.name,
        type: getFileType(file),
        size: file.size,
        dateAdded: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        encryptedData: base64Data,
        folderId,
        tags: [],
        isFavorite: false,
      };

      const updatedFiles = [...files, newFile];
      await saveFiles(updatedFiles);
      
      console.log('File added successfully to real Android vault:', fileId);
    } catch (error) {
      console.error('Error adding file to real Android vault:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getStorageUsage = async () => {
    try {
      console.log('Getting real Android device storage...');
      
      const deviceInfo = await Device.getInfo();
      console.log('Device platform:', deviceInfo.platform);
      
      // Calculate actual app storage usage
      let appUsage = 0;
      try {
        const files = await Filesystem.readdir({
          path: '.vaultix_secure/files',
          directory: Directory.Data
        });
        
        for (const file of files.files) {
          try {
            const stat = await Filesystem.stat({
              path: `.vaultix_secure/files/${file.name}`,
              directory: Directory.Data
            });
            appUsage += stat.size;
          } catch (statError) {
            console.warn('Could not stat file:', file.name);
          }
        }
      } catch (dirError) {
        console.warn('Could not read secure directory:', dirError);
      }
      
      // Realistic device storage estimates based on platform
      let totalStorage = 64 * 1024 * 1024 * 1024; // 64GB default
      
      if (deviceInfo.platform === 'android') {
        totalStorage = 128 * 1024 * 1024 * 1024; // 128GB for Android
      } else if (deviceInfo.platform === 'ios') {
        totalStorage = 256 * 1024 * 1024 * 1024; // 256GB for iOS
      }
      
      const used = appUsage;
      const available = totalStorage - used;
      const percentage = totalStorage > 0 ? (used / totalStorage) * 100 : 0;
      
      console.log('Real Android storage calculated:', {
        used: formatBytes(used),
        total: formatBytes(totalStorage),
        percentage: percentage.toFixed(1) + '%'
      });
      
      return {
        used,
        total: totalStorage,
        available,
        percentage,
        formattedUsed: formatBytes(used),
        formattedTotal: formatBytes(totalStorage),
        formattedAvailable: formatBytes(available)
      };
    } catch (error) {
      console.error('Error getting real Android storage:', error);
      // Fallback values
      const used = files.reduce((total, file) => total + file.size, 0);
      const total = 64 * 1024 * 1024 * 1024; // 64GB fallback
      return {
        used,
        total,
        available: total - used,
        percentage: total > 0 ? (used / total) * 100 : 0,
        formattedUsed: formatBytes(used),
        formattedTotal: formatBytes(total),
        formattedAvailable: formatBytes(total - used)
      };
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const deleteFile = async (fileId: string, permanent: boolean = false) => {
    try {
      const fileToDelete = files.find(f => f.id === fileId);
      if (!fileToDelete) {
        console.warn('File not found for deletion:', fileId);
        return;
      }

      if (permanent) {
        // Delete from Android secure storage
        await androidStorage.deleteSecureFile(fileId);
        
        const updatedFiles = files.filter(file => file.id !== fileId);
        await saveFiles(updatedFiles);
      } else {
        // Move to recycle bin
        await RecycleBinService.addToRecycleBin(fileToDelete);
        const updatedFiles = files.filter(file => file.id !== fileId);
        await saveFiles(updatedFiles);
      }
      
      console.log('File deleted:', fileId, 'Permanent:', permanent);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  };

  const addFolder = async (name: string, parentId?: string) => {
    try {
      const newFolder: VaultFolder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        dateCreated: new Date().toISOString(),
        parentId,
        fileCount: 0,
      };

      const updatedFolders = [...folders, newFolder];
      await saveFolders(updatedFolders);
      console.log('Folder added to real Android storage:', name);
    } catch (error) {
      console.error('Error adding folder:', error);
      throw error;
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      // Delete all files in the folder
      const folderFiles = files.filter(file => file.folderId === folderId);
      for (const file of folderFiles) {
        await deleteFile(file.id, true); // Permanent delete
      }
      
      // Delete the folder
      const updatedFolders = folders.filter(folder => folder.id !== folderId);
      await saveFolders(updatedFolders);
      
      console.log('Folder deleted:', folderId);
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  };

  const moveFile = async (fileId: string, targetFolderId?: string) => {
    const updatedFiles = files.map(file =>
      file.id === fileId ? { ...file, folderId: targetFolderId } : file
    );
    await saveFiles(updatedFiles);
  };

  const moveFiles = async (fileIds: string[], targetFolderId?: string) => {
    const updatedFiles = files.map(file =>
      fileIds.includes(file.id) ? { ...file, folderId: targetFolderId } : file
    );
    await saveFiles(updatedFiles);
  };

  const renameFile = async (fileId: string, newName: string) => {
    const updatedFiles = files.map(file =>
      file.id === fileId ? { ...file, name: newName, dateModified: new Date().toISOString() } : file
    );
    await saveFiles(updatedFiles);
  };

  const renameFolder = async (folderId: string, newName: string) => {
    const updatedFolders = folders.map(folder =>
      folder.id === folderId ? { ...folder, name: newName } : folder
    );
    await saveFolders(updatedFolders);
  };

  const searchFiles = (query: string): VaultFile[] => {
    return files.filter(file =>
      file.name.toLowerCase().includes(query.toLowerCase()) ||
      file.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
  };

  const toggleFavorite = async (fileId: string) => {
    const updatedFiles = files.map(file =>
      file.id === fileId ? { ...file, isFavorite: !file.isFavorite } : file
    );
    await saveFiles(updatedFiles);
  };

  const addTag = async (fileId: string, tag: string) => {
    const updatedFiles = files.map(file =>
      file.id === fileId ? { ...file, tags: [...file.tags, tag] } : file
    );
    await saveFiles(updatedFiles);
  };

  const removeTag = async (fileId: string, tag: string) => {
    const updatedFiles = files.map(file =>
      file.id === fileId ? { ...file, tags: file.tags.filter(t => t !== tag) } : file
    );
    await saveFiles(updatedFiles);
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const selectAllFiles = () => {
    const currentFiles = files.filter(file => file.folderId === currentFolder);
    setSelectedFiles(currentFiles.map(f => f.id));
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const bulkDelete = async (fileIds: string[], permanent: boolean = false) => {
    for (const fileId of fileIds) {
      await deleteFile(fileId, permanent);
    }
    clearSelection();
  };

  const bulkMove = async (fileIds: string[], targetFolderId?: string) => {
    await moveFiles(fileIds, targetFolderId);
    clearSelection();
  };

  const exportFile = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) throw new Error('File not found');

      const exportedPath = await FileViewerService.exportFile(file);
      
      await Share.share({
        title: `Export ${file.name}`,
        text: `Exported from Vaultix: ${file.name}`,
        url: exportedPath,
        dialogTitle: 'Export File'
      });
    } catch (error) {
      console.error('Error exporting file:', error);
      throw error;
    }
  };

  const exportFiles = async (fileIds: string[]) => {
    try {
      for (const fileId of fileIds) {
        await exportFile(fileId);
      }
    } catch (error) {
      console.error('Error exporting files:', error);
      throw error;
    }
  };

  const getRecycleBin = async (): Promise<DeletedFile[]> => {
    return await RecycleBinService.getRecycleBin();
  };

  const restoreFromRecycleBin = async (fileId: string) => {
    const restoredFile = await RecycleBinService.restoreFile(fileId);
    if (restoredFile) {
      const { deletedAt, originalFolderId, ...fileData } = restoredFile;
      const restoredVaultFile: VaultFile = {
        ...fileData,
        folderId: originalFolderId
      };
      
      const updatedFiles = [...files, restoredVaultFile];
      await saveFiles(updatedFiles);
    }
  };

  const emptyRecycleBin = async () => {
    await RecycleBinService.emptyRecycleBin();
  };

  const findDuplicates = async (): Promise<DuplicateGroup[]> => {
    return await DuplicateDetectionService.findDuplicates(files);
  };

  const cleanupDuplicates = async (duplicateGroups: DuplicateGroup[]) => {
    for (const group of duplicateGroups) {
      const [keepFile, ...deleteFiles] = group.files;
      for (const file of deleteFiles) {
        await deleteFile(file.id, false);
      }
    }
  };

  return (
    <VaultContext.Provider value={{
      files,
      folders,
      selectedFiles,
      currentFolder,
      addFile,
      deleteFile,
      addFolder,
      deleteFolder,
      moveFile,
      moveFiles,
      renameFile,
      renameFolder,
      searchFiles,
      toggleFavorite,
      addTag,
      removeTag,
      getStorageUsage,
      setCurrentFolder,
      toggleFileSelection,
      selectAllFiles,
      clearSelection,
      bulkDelete,
      bulkMove,
      exportFile,
      exportFiles,
      getRecycleBin,
      restoreFromRecycleBin,
      emptyRecycleBin,
      findDuplicates,
      cleanupDuplicates,
      loading,
      refreshFiles,
    }}>
      {children}
    </VaultContext.Provider>
  );
};
