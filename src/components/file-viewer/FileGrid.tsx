
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import FileViewer from './FileViewer';
import {
  Eye,
  Star,
  Trash,
  Download,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  File,
  Play
} from 'lucide-react';

interface FileGridProps {
  files: any[];
  selectedFiles: string[];
  onFileSelect: (fileId: string) => void;
  onToggleFavorite: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onExportFile: (fileId: string) => void;
}

const FileGrid: React.FC<FileGridProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onToggleFavorite,
  onDeleteFile,
  onExportFile
}) => {
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return ImageIcon;
      case 'video': return Video;
      case 'audio': return Music;
      case 'document': return FileText;
      default: return File;
    }
  };

  const getThumbnail = (file: any) => {
    if (file.thumbnail) {
      return file.thumbnail;
    }
    
    // Generate simple thumbnail based on file type
    if (file.type === 'image' && file.encryptedData) {
      return file.encryptedData;
    }
    
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {files.map((file, index) => {
          const FileIcon = getFileIcon(file.type);
          const isSelected = selectedFiles.includes(file.id);
          const thumbnail = getThumbnail(file);

          return (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative group"
            >
              <Card className={`
                relative overflow-hidden cursor-pointer transition-all duration-200
                hover:shadow-lg hover:scale-105
                ${isSelected ? 'ring-2 ring-primary shadow-lg' : ''}
              `}>
                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onFileSelect(file.id)}
                    className="bg-white/90 border-white"
                  />
                </div>

                {/* File Thumbnail/Preview */}
                <div 
                  className="aspect-square relative bg-muted flex items-center justify-center overflow-hidden"
                  onClick={() => setViewingFile(file.id)}
                >
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileIcon className="w-12 h-12 text-muted-foreground" />
                  )}
                  
                  {/* Play button for videos */}
                  {file.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="bg-white/90 rounded-full p-2">
                        <Play className="w-6 h-6 text-black" />
                      </div>
                    </div>
                  )}

                  {/* View overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* File Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-foreground truncate flex-1">
                      {file.name}
                    </h3>
                    {file.isFavorite && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 ml-1 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(file.dateAdded).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Tags */}
                  {file.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {file.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {file.tags.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{file.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex flex-col space-y-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-8 h-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(file.id);
                      }}
                    >
                      <Star className={`w-3 h-3 ${file.isFavorite ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-8 h-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExportFile(file.id);
                      }}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-8 h-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(file.id);
                      }}
                    >
                      <Trash className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* File Viewer Modal */}
      {viewingFile && (
        <FileViewer
          fileId={viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}
    </>
  );
};

export default FileGrid;
