import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import CryptoJS from 'crypto-js';
import { RecycleBinService, DeletedFile } from '@/services/RecycleBinService';
import { FileViewerService } from '@/services/FileViewerService';
import { DuplicateDetectionService, DuplicateGroup } from '@/services/DuplicateDetectionService';

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
  getStorageUsage: () => { used: number; total: number };
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

  useEffect(() => {
    loadVaultData();
  }, []);

  const loadVaultData = async () => {
    try {
      setLoading(true);
      
      const [filesResult, foldersResult] = await Promise.all([
        Preferences.get({ key: 'vaultix_files' }),
        Preferences.get({ key: 'vaultix_folders' })
      ]);

      if (filesResult.value) {
        setFiles(JSON.parse(filesResult.value));
      }
      
      if (foldersResult.value) {
        setFolders(JSON.parse(foldersResult.value));
      }
    } catch (error) {
      console.error('Error loading vault data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFiles = async (newFiles: VaultFile[]) => {
    try {
      await Preferences.set({ key: 'vaultix_files', value: JSON.stringify(newFiles) });
      setFiles(newFiles);
    } catch (error) {
      console.error('Error saving files:', error);
    }
  };

  const saveFolders = async (newFolders: VaultFolder[]) => {
    try {
      await Preferences.set({ key: 'vaultix_folders', value: JSON.stringify(newFolders) });
      setFolders(newFolders);
    } catch (error) {
      console.error('Error saving folders:', error);
    }
  };

  const encryptFileData = (data: string): string => {
    return CryptoJS.AES.encrypt(data, 'vaultix_secret_key').toString();
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

  const addFile = async (file: File, folderId?: string) => {
    try {
      const base64Data = await fileToBase64(file);
      const encryptedData = encryptFileData(base64Data);
      
      const newFile: VaultFile = {
        id: Date.now().toString(),
        name: file.name,
        type: getFileType(file),
        size: file.size,
        dateAdded: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        encryptedData,
        folderId,
        tags: [],
        isFavorite: false,
      };

      const updatedFiles = [...files, newFile];
      await saveFiles(updatedFiles);
    } catch (error) {
      console.error('Error adding file:', error);
      throw error;
    }
  };

  const deleteFile = async (fileId: string, permanent: boolean = false) => {
    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) return;

    if (permanent) {
      const updatedFiles = files.filter(file => file.id !== fileId);
      await saveFiles(updatedFiles);
    } else {
      // Move to recycle bin
      await RecycleBinService.addToRecycleBin(fileToDelete);
      const updatedFiles = files.filter(file => file.id !== fileId);
      await saveFiles(updatedFiles);
    }
  };

  const addFolder = async (name: string, parentId?: string) => {
    const newFolder: VaultFolder = {
      id: Date.now().toString(),
      name,
      dateCreated: new Date().toISOString(),
      parentId,
      fileCount: 0,
    };

    const updatedFolders = [...folders, newFolder];
    await saveFolders(updatedFolders);
  };

  const deleteFolder = async (folderId: string) => {
    // Delete all files in the folder
    const updatedFiles = files.filter(file => file.folderId !== folderId);
    await saveFiles(updatedFiles);
    
    // Delete the folder
    const updatedFolders = folders.filter(folder => folder.id !== folderId);
    await saveFolders(updatedFolders);
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

  const getStorageUsage = () => {
    const used = files.reduce((total, file) => total + file.size, 0);
    const total = 100 * 1024 * 1024; // 100MB limit for demo
    return { used, total };
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
      
      // Share the file
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
      // Remove deletion metadata and restore to vault
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
      // Keep the first file, delete the rest
      const [keepFile, ...deleteFiles] = group.files;
      for (const file of deleteFiles) {
        await deleteFile(file.id, false); // Move to recycle bin
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
    }}>
      {children}
    </VaultContext.Provider>
  );
};
