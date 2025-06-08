
import React, { useState, useEffect } from 'react';
import { X, Download, Share2, Eye, FileText, Image, Video, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface RealFileViewerProps {
  fileId: string;
  onClose: () => void;
}

interface FileData {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string | ArrayBuffer;
  mimeType: string;
}

const RealFileViewer: React.FC<RealFileViewerProps> = ({ fileId, onClose }) => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFileData();
  }, [fileId]);

  const loadFileData = async () => {
    try {
      setLoading(true);
      // Load file from secure storage
      const stored = localStorage.getItem(`vaultix_file_${fileId}`);
      if (!stored) {
        throw new Error('File not found');
      }

      const fileData = JSON.parse(stored);
      setFileData(fileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!fileData) return;

    try {
      const blob = new Blob([fileData.content], { type: fileData.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `${fileData.name} is being downloaded`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (!fileData) return;

    try {
      if (navigator.share) {
        const blob = new Blob([fileData.content], { type: fileData.mimeType });
        const file = new File([blob], fileData.name, { type: fileData.mimeType });
        
        await navigator.share({
          title: fileData.name,
          files: [file]
        });
      } else {
        // Fallback to copying file URL
        await navigator.clipboard.writeText(fileData.name);
        toast({
          title: "File Name Copied",
          description: "File name copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (mimeType.startsWith('video/')) return <Video className="w-6 h-6" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-6 h-6" />;
    return <FileText className="w-6 h-6" />;
  };

  const renderFileContent = () => {
    if (!fileData) return null;

    if (fileData.mimeType.startsWith('image/')) {
      const imageUrl = typeof fileData.content === 'string' 
        ? fileData.content 
        : URL.createObjectURL(new Blob([fileData.content]));
      
      return (
        <div className="flex justify-center">
          <img 
            src={imageUrl} 
            alt={fileData.name}
            className="max-w-full max-h-96 object-contain rounded-lg"
          />
        </div>
      );
    }

    if (fileData.mimeType.startsWith('video/')) {
      const videoUrl = typeof fileData.content === 'string' 
        ? fileData.content 
        : URL.createObjectURL(new Blob([fileData.content]));
      
      return (
        <video controls className="w-full max-h-96 rounded-lg">
          <source src={videoUrl} type={fileData.mimeType} />
          Your browser does not support the video tag.
        </video>
      );
    }

    if (fileData.mimeType.startsWith('audio/')) {
      const audioUrl = typeof fileData.content === 'string' 
        ? fileData.content 
        : URL.createObjectURL(new Blob([fileData.content]));
      
      return (
        <audio controls className="w-full">
          <source src={audioUrl} type={fileData.mimeType} />
          Your browser does not support the audio tag.
        </audio>
      );
    }

    if (fileData.mimeType === 'text/plain' || fileData.mimeType.includes('text')) {
      return (
        <div className="bg-muted p-4 rounded-lg">
          <pre className="whitespace-pre-wrap text-sm">
            {typeof fileData.content === 'string' ? fileData.content : 'Binary content'}
          </pre>
        </div>
      );
    }

    return (
      <div className="text-center text-muted-foreground p-8">
        <div className="flex justify-center mb-4">
          {getFileIcon(fileData.mimeType)}
        </div>
        <p>Preview not available for this file type</p>
        <p className="text-sm mt-2">Use the download button to view the file</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-4xl h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading file...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md p-6">
          <div className="text-center text-destructive">
            <p className="mb-4">{error}</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            {fileData && getFileIcon(fileData.mimeType)}
            <div>
              <h2 className="text-lg font-semibold">{fileData?.name}</h2>
              <p className="text-sm text-muted-foreground">
                {fileData?.mimeType} • {fileData && (fileData.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-auto">
          {renderFileContent()}
        </div>
      </Card>
    </div>
  );
};

export default RealFileViewer;
