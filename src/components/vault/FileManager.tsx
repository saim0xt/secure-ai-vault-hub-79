
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useVault } from '@/contexts/VaultContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import FileGrid from '@/components/file-viewer/FileGrid';
import RealFileViewer from '@/components/file-viewer/RealFileViewer';
import {
  ArrowLeft,
  Search,
  Folder,
  Upload,
  Plus,
  RefreshCw,
  Loader2,
  Grid3X3,
  List,
  Shield,
  HardDrive
} from 'lucide-react';

interface StorageInfo {
  formattedUsed: string;
  formattedTotal: string;
  percentage: number;
}

const FileManager = () => {
  const navigate = useNavigate();
  const { folderId } = useParams<{ folderId?: string }>();
  const { 
    files, 
    folders, 
    currentFolder, 
    setCurrentFolder, 
    selectedFiles,
    addFile, 
    addFolder,
    deleteFile,
    toggleFavorite,
    exportFile,
    toggleFileSelection,
    clearSelection,
    getStorageUsage,
    loading,
    refreshFiles
  } = useVault();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'audio' | 'document'>('all');
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  useEffect(() => {
    if (folderId && folderId !== currentFolder) {
      setCurrentFolder(folderId);
    }
    loadStorageInfo();
  }, [folderId, currentFolder, setCurrentFolder]);

  const loadStorageInfo = async () => {
    try {
      console.log('Loading real Android storage info...');
      const storage = await getStorageUsage();
      setStorageInfo(storage);
      console.log('Real storage info loaded:', storage);
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

  // FIXED: Proper file filtering logic
  const currentFiles = files.filter(file => {
    // If no current folder, show files without folderId (root level)
    if (!currentFolder) {
      return !file.folderId || file.folderId === null || file.folderId === undefined;
    }
    // If in a folder, show files with matching folderId
    return file.folderId === currentFolder;
  });
  
  const currentFolders = folders.filter(folder => {
    // If no current folder, show folders without parentId (root level)
    if (!currentFolder) {
      return !folder.parentId || folder.parentId === null || folder.parentId === undefined;
    }
    // If in a folder, show subfolders with matching parentId
    return folder.parentId === currentFolder;
  });

  console.log('FIXED - Current files count:', currentFiles.length);
  console.log('FIXED - Current folders count:', currentFolders.length);
  console.log('FIXED - Total files in vault:', files.length);
  console.log('FIXED - Current folder:', currentFolder);

  const filteredFiles = currentFiles
    .filter(file => {
      const matchesSearch = searchQuery === '' || 
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = filterType === 'all' || file.type === filterType;
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        case 'type':
          return a.type.localeCompare(b.type);
        case 'date':
        default:
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      }
    });

  const filteredFolders = searchQuery
    ? currentFolders.filter(folder =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentFolders;

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      setImporting(true);
      console.log('Starting real Android file import:', fileList.length, 'files');
      
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        console.log('Importing file to real Android storage:', file.name, 'Size:', file.size);
        await addFile(file, currentFolder || undefined);
      }
      
      await loadStorageInfo();
      
      toast({
        title: "Success",
        description: `${fileList.length} file(s) secured and hidden from device`,
      });
      
      event.target.value = '';
    } catch (error) {
      console.error('Real Android file import error:', error);
      toast({
        title: "Error",
        description: "Failed to secure files",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshFiles();
      toast({
        title: "Success",
        description: "Files refreshed successfully",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Error",
        description: "Failed to refresh files",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      await addFolder(newFolderName, currentFolder || undefined);
      setNewFolderName('');
      setShowNewFolderDialog(false);
      toast({
        title: "Success",
        description: "Secure folder created",
      });
    } catch (error) {
      console.error('Create folder error:', error);
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentFolder(folderId);
    navigate(`/files/${folderId}`);
  };

  const handleBackClick = () => {
    setCurrentFolder(null);
    navigate('/files');
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      toast({
        title: "Success",
        description: "File moved to recycle bin",
      });
    } catch (error) {
      console.error('Delete file error:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleExportFile = async (fileId: string) => {
    try {
      await exportFile(fileId);
      toast({
        title: "Success",
        description: "File exported successfully",
      });
    } catch (error) {
      console.error('Export file error:', error);
      toast({
        title: "Error",
        description: "Failed to export file",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-foreground">Loading secure vault...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={currentFolder ? handleBackClick : () => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center">
              <Shield className="w-5 h-5 mr-2 text-green-600" />
              File Manager
            </h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{filteredFiles.length} files • {filteredFolders.length} folders</span>
              {selectedFiles.length > 0 && <span>• {selectedFiles.length} selected</span>}
              {storageInfo && (
                <span className="flex items-center">
                  <HardDrive className="w-3 h-3 mr-1" />
                  {storageInfo.formattedUsed} / {storageInfo.formattedTotal} used
                </span>
              )}
            </div>
          </div>
          
          {/* View Controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNewFolderDialog(true)}
          >
            <Plus className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => document.getElementById('file-input')?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size' | 'type')}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
            <option value="type">Sort by Type</option>
          </select>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'image' | 'video' | 'audio' | 'document')}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Files</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="document">Documents</option>
          </select>
        </div>

        {/* Storage Info Bar */}
        {storageInfo && (
          <div className="mt-3 p-2 bg-muted rounded-lg">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Device Storage: {storageInfo.formattedUsed} used of {storageInfo.formattedTotal}</span>
              <span>{storageInfo.percentage.toFixed(1)}% full</span>
            </div>
            <div className="w-full bg-background rounded-full h-1.5 mt-1">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Debug Info */}
        <div className="mb-2 text-xs text-muted-foreground">
          Debug: Total files: {files.length}, Current files: {currentFiles.length}, Filtered: {filteredFiles.length}
        </div>

        {/* Folders */}
        {filteredFolders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Folders</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredFolders.map((folder, index) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="p-4 cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                    onClick={() => handleFolderClick(folder.id)}
                  >
                    <div className="flex flex-col items-center text-center">
                      <Folder className="w-12 h-12 text-blue-500 mb-2" />
                      <p className="font-medium text-foreground text-sm truncate w-full">
                        {folder.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {folder.fileCount} files
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {filteredFiles.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Files ({filteredFiles.length})
            </h3>
            <FileGrid
              files={filteredFiles}
              selectedFiles={selectedFiles}
              onFileSelect={toggleFileSelection}
              onToggleFavorite={toggleFavorite}
              onDeleteFile={handleDeleteFile}
              onExportFile={handleExportFile}
              onFileView={(fileId) => setViewingFile(fileId)}
            />
          </div>
        )}

        {/* Empty State - FIXED condition */}
        {filteredFiles.length === 0 && filteredFolders.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-16 h-16 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchQuery || filterType !== 'all' ? 'No results found' : 'No files yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search terms or filters'
                : 'Start by importing files or creating folders'
              }
            </p>
            {!searchQuery && filterType === 'all' && (
              <Button 
                onClick={() => document.getElementById('file-input')?.click()}
                disabled={importing}
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Files
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Create New Folder</h3>
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                }
              }}
            />
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowNewFolderDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                Create
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Real File Viewer */}
      {viewingFile && (
        <RealFileViewer
          fileId={viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}

      {/* Hidden File Input */}
      <input
        id="file-input"
        type="file"
        multiple
        accept="*/*"
        onChange={handleFileImport}
        className="hidden"
      />
    </div>
  );
};

export default FileManager;
