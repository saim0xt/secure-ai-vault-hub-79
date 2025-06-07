
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';

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
  currentFolder: string | null;
  addFile: (file: File, folderId?: string) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  addFolder: (name: string, parentId?: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  moveFile: (fileId: string, targetFolderId?: string) => Promise<void>;
  renameFile: (fileId: string, newName: string) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  searchFiles: (query: string) => VaultFile[];
  toggleFavorite: (fileId: string) => Promise<void>;
  addTag: (fileId: string, tag: string) => Promise<void>;
  removeTag: (fileId: string, tag: string) => Promise<void>;
  getStorageUsage: () => { used: number; total: number };
  setCurrentFolder: (folderId: string | null) => void;
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

  const deleteFile = async (fileId: string) => {
    const updatedFiles = files.filter(file => file.id !== fileId);
    await saveFiles(updatedFiles);
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

  return (
    <VaultContext.Provider value={{
      files,
      folders,
      currentFolder,
      addFile,
      deleteFile,
      addFolder,
      deleteFolder,
      moveFile,
      renameFile,
      renameFolder,
      searchFiles,
      toggleFavorite,
      addTag,
      removeTag,
      getStorageUsage,
      setCurrentFolder,
      loading,
    }}>
      {children}
    </VaultContext.Provider>
  );
};
