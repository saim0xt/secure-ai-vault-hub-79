
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useVault } from '@/contexts/VaultContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Search,
  Folder,
  Image,
  Video,
  Upload,
  Plus,
  MoreVertical,
  Star,
  Trash
} from 'lucide-react';

const FileManager = () => {
  const navigate = useNavigate();
  const { folderId } = useParams();
  const { 
    files, 
    folders, 
    currentFolder, 
    setCurrentFolder, 
    addFile, 
    addFolder,
    deleteFile,
    toggleFavorite 
  } = useVault();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Filter files and folders based on current location
  const currentFiles = files.filter(file => file.folderId === currentFolder);
  const currentFolders = folders.filter(folder => folder.parentId === currentFolder);

  // Search functionality
  const filteredFiles = searchQuery
    ? currentFiles.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : currentFiles;

  const filteredFolders = searchQuery
    ? currentFolders.filter(folder =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentFolders;

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList) {
      try {
        for (let i = 0; i < fileList.length; i++) {
          await addFile(fileList[i], currentFolder || undefined);
        }
        toast({
          title: "Success",
          description: `${fileList.length} file(s) imported successfully`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to import files",
          variant: "destructive",
        });
      }
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
        description: "Folder created successfully",
      });
    } catch (error) {
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
        description: "File deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return Image;
      case 'video':
        return Video;
      default:
        return Folder;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={currentFolder ? handleBackClick : () => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">
              {currentFolder ? 'Folder' : 'File Manager'}
            </h1>
          </div>
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
          >
            <Upload className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="p-4">
        {/* Folders */}
        {filteredFolders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Folders</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredFolders.map((folder, index) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="p-4 cursor-pointer hover:shadow-lg transition-all"
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
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Files</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredFiles.map((file, index) => {
                const FileIcon = getFileIcon(file.type);
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-4 cursor-pointer hover:shadow-lg transition-all group">
                      <div className="relative">
                        <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                          <FileIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                        
                        {/* File Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex space-x-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-6 h-6 bg-background/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(file.id);
                              }}
                            >
                              <Star className={`w-3 h-3 ${file.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-6 h-6 bg-background/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFile(file.id);
                              }}
                            >
                              <Trash className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <p className="font-medium text-foreground text-sm truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.dateAdded).toLocaleDateString()}
                        </p>
                        {file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {file.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-primary/20 text-primary px-1 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredFiles.length === 0 && filteredFolders.length === 0 && (
          <div className="text-center py-12">
            <Folder className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchQuery ? 'No results found' : 'No files yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Start by importing files or creating folders'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => document.getElementById('file-input')?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Import Files
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
