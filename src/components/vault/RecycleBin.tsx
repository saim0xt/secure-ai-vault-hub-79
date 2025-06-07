
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useVault } from '@/contexts/VaultContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DeletedFile } from '@/services/RecycleBinService';
import {
  ArrowLeft,
  Trash,
  RotateCcw,
  Image,
  Video,
  Folder,
  AlertTriangle
} from 'lucide-react';

const RecycleBin = () => {
  const navigate = useNavigate();
  const { getRecycleBin, restoreFromRecycleBin, emptyRecycleBin } = useVault();
  const { toast } = useToast();
  const [deletedFiles, setDeletedFiles] = useState<DeletedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecycleBin();
  }, []);

  const loadRecycleBin = async () => {
    try {
      setLoading(true);
      const files = await getRecycleBin();
      setDeletedFiles(files);
    } catch (error) {
      console.error('Failed to load recycle bin:', error);
      toast({
        title: "Error",
        description: "Failed to load recycle bin",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (fileId: string) => {
    try {
      await restoreFromRecycleBin(fileId);
      await loadRecycleBin(); // Refresh the list
      toast({
        title: "Success",
        description: "File restored successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore file",
        variant: "destructive",
      });
    }
  };

  const handleEmptyBin = async () => {
    try {
      await emptyRecycleBin();
      setDeletedFiles([]);
      toast({
        title: "Success",
        description: "Recycle bin emptied",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to empty recycle bin",
        variant: "destructive",
      });
    }
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDaysRemaining = (deletedAt: string): number => {
    const deletedDate = new Date(deletedAt);
    const expiryDate = new Date(deletedDate.getTime() + (7 * 24 * 60 * 60 * 1000));
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading recycle bin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Recycle Bin</h1>
              <p className="text-sm text-muted-foreground">
                {deletedFiles.length} deleted file{deletedFiles.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {deletedFiles.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleEmptyBin}
            >
              <Trash className="w-4 h-4 mr-2" />
              Empty Bin
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        {deletedFiles.length === 0 ? (
          <div className="text-center py-12">
            <Trash className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Recycle bin is empty
            </h3>
            <p className="text-muted-foreground">
              Deleted files will appear here and be kept for 7 days
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {deletedFiles.map((file, index) => {
              const FileIcon = getFileIcon(file.type);
              const daysRemaining = getDaysRemaining(file.deletedAt);
              
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-4 group">
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
                            onClick={() => handleRestore(file.id)}
                          >
                            <RotateCcw className="w-3 h-3 text-green-500" />
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
                        Deleted {new Date(file.deletedAt).toLocaleDateString()}
                      </p>
                      <div className={`text-xs mt-1 flex items-center ${
                        daysRemaining <= 1 ? 'text-red-500' : 'text-orange-500'
                      }`}>
                        {daysRemaining <= 1 && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecycleBin;
