
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useVault } from '@/contexts/VaultContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileViewerService } from '@/services/FileViewerService';
import {
  ArrowLeft,
  Download,
  Share,
  Trash,
  Star,
  Edit,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FileX
} from 'lucide-react';

interface FileViewerProps {
  fileId: string;
  onClose: () => void;
}

const FileViewer: React.FC<FileViewerProps> = ({ fileId, onClose }) => {
  const navigate = useNavigate();
  const { files, toggleFavorite, deleteFile, exportFile } = useVault();
  const { toast } = useToast();
  
  const [file, setFile] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    loadFile();
  }, [fileId]);

  const loadFile = async () => {
    try {
      setLoading(true);
      const foundFile = files.find(f => f.id === fileId);
      
      if (!foundFile) {
        toast({
          title: "Error",
          description: "File not found",
          variant: "destructive",
        });
        onClose();
        return;
      }

      setFile(foundFile);
      
      // Generate preview using FileViewerService
      const filePreview = await FileViewerService.getInstance().generatePreview(foundFile);
      setPreview(filePreview);
      
    } catch (error) {
      console.error('Error loading file:', error);
      toast({
        title: "Error",
        description: "Failed to load file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportFile(fileId);
      toast({
        title: "Success",
        description: "File exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFile(fileId);
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(fileId);
      setFile({ ...file, isFavorite: !file.isFavorite });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return ImageIcon;
      case 'video': return Video;
      case 'audio': return Music;
      case 'document': return FileText;
      default: return FileX;
    }
  };

  const renderPreview = () => {
    if (!preview) return null;

    switch (preview.type) {
      case 'image':
        return (
          <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
            <img
              src={preview.preview}
              alt={file.name}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`
              }}
            />
          </div>
        );

      case 'video':
        return (
          <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
            <video
              controls
              className="max-w-full max-h-full"
              poster={preview.preview}
            >
              <source src={file.encryptedData} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg p-8">
            <div className="mb-8">
              <img
                src={preview.preview}
                alt="Audio waveform"
                className="w-80 h-32 object-contain"
              />
            </div>
            <audio
              controls
              className="w-full max-w-md"
            >
              <source src={file.encryptedData} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        );

      case 'text':
        return (
          <div className="flex-1 bg-white text-black rounded-lg p-6 overflow-auto">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {preview.preview}
            </pre>
          </div>
        );

      case 'pdf':
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600">PDF Preview</p>
              <p className="text-sm text-gray-500 mt-2">
                Click Export to view in external app
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg">
            <div className="text-center">
              <FileX className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600">Preview not available</p>
              <p className="text-sm text-gray-500 mt-2">
                Click Export to view in external app
              </p>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p>Loading file...</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return null;
  }

  const FileIcon = getFileIcon(file.type);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-3">
            <FileIcon className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold text-foreground truncate">
                {file.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)} • {new Date(file.dateAdded).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Image Controls */}
          {preview?.type === 'image' && (
            <>
              <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(3, zoom + 0.1))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setRotation((rotation + 90) % 360)}>
                <RotateCw className="w-4 h-4" />
              </Button>
            </>
          )}

          <Button variant="ghost" size="icon" onClick={handleToggleFavorite}>
            <Star className={`w-4 h-4 ${file.isFavorite ? 'text-yellow-500 fill-yellow-500' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleExport}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4">
        {renderPreview()}
      </div>

      {/* File Info Footer */}
      <div className="bg-card border-t border-border p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-6">
            <span>Type: {file.type}</span>
            <span>Size: {formatFileSize(file.size)}</span>
            {preview?.metadata?.dimensions && (
              <span>
                Dimensions: {preview.metadata.dimensions.width} × {preview.metadata.dimensions.height}
              </span>
            )}
            {preview?.metadata?.duration && (
              <span>Duration: {formatDuration(preview.metadata.duration)}</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {file.tags.map((tag) => (
              <span key={tag} className="bg-primary/20 text-primary px-2 py-1 rounded text-xs">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default FileViewer;
