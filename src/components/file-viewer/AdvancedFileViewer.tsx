
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, FileText, Image, Video, Music, File, Download } from 'lucide-react';
import { RealNativeSecurityService } from '@/services/RealNativeSecurityService';
import { useToast } from '@/hooks/use-toast';

interface FileInfo {
  name: string;
  size: number;
  mimeType: string;
  isHidden: boolean;
  thumbnail?: string;
  metadata?: any;
}

export default function AdvancedFileViewer() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [hiddenFiles, setHiddenFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);

  const securityService = RealNativeSecurityService.getInstance();
  const { toast } = useToast();

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      
      // Get both visible and hidden files
      const [visibleFiles, hiddenFileNames] = await Promise.all([
        securityService.getVisibleFiles(),
        securityService.getHiddenFiles()
      ]);

      setHiddenFiles(hiddenFileNames);

      // Combine and process all files
      const allFiles: FileInfo[] = [
        ...visibleFiles.map(name => ({ name, isHidden: false })),
        ...hiddenFileNames.map(name => ({ name, isHidden: true }))
      ].map(file => ({
        name: file.name,
        size: 0, // Will be populated by real analysis
        mimeType: getMimeTypeFromExtension(file.name),
        isHidden: file.isHidden,
        metadata: {}
      }));

      setFiles(allFiles);
    } catch (error) {
      console.error('Failed to load files:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFileVisibility = async (fileName: string, isCurrentlyHidden: boolean) => {
    try {
      let success = false;
      
      if (isCurrentlyHidden) {
        success = await securityService.showFile(fileName);
        if (success) {
          toast({
            title: "File Revealed",
            description: `${fileName} is now visible`,
          });
        }
      } else {
        success = await securityService.hideFile(fileName);
        if (success) {
          toast({
            title: "File Hidden",
            description: `${fileName} has been securely hidden`,
          });
        }
      }

      if (success) {
        await loadFiles();
      } else {
        toast({
          title: "Error",
          description: `Failed to ${isCurrentlyHidden ? 'show' : 'hide'} file`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to toggle file visibility:', error);
      toast({
        title: "Error",
        description: "Operation failed",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (mimeType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5" />;
    if (mimeType === 'application/pdf') return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const getMimeTypeFromExtension = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      avi: 'video/avi',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      pdf: 'application/pdf',
      txt: 'text/plain',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Advanced File Viewer</h1>
            <p className="text-muted-foreground text-sm">
              Manage and view files with advanced security features
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-sm">
              {files.filter(f => !f.isHidden).length} Visible
            </Badge>
            <Badge variant="destructive" className="text-sm">
              {files.filter(f => f.isHidden).length} Hidden
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* File Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <Card 
              key={index} 
              className={`border-border/50 shadow-sm transition-all hover:shadow-md cursor-pointer ${
                file.isHidden ? 'opacity-60 border-red-200 dark:border-red-800' : ''
              }`}
              onClick={() => setSelectedFile(file)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      file.isHidden 
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {getFileIcon(file.mimeType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-medium truncate">
                        {file.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {file.mimeType.split('/')[1].toUpperCase()}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFileVisibility(file.name, file.isHidden);
                    }}
                    className="shrink-0 h-8 w-8 p-0"
                  >
                    {file.isHidden ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Size:</span>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant={file.isHidden ? "destructive" : "default"} 
                      className="text-xs"
                    >
                      {file.isHidden ? "Hidden" : "Visible"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {files.length === 0 && (
          <div className="text-center py-12">
            <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Files Found</h3>
            <p className="text-muted-foreground">
              No files are currently available to display
            </p>
          </div>
        )}
      </div>

      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full bg-background border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getFileIcon(selectedFile.mimeType)}
                {selectedFile.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{selectedFile.mimeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span>{formatFileSize(selectedFile.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={selectedFile.isHidden ? "destructive" : "default"}>
                    {selectedFile.isHidden ? "Hidden" : "Visible"}
                  </Badge>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => toggleFileVisibility(selectedFile.name, selectedFile.isHidden)}
                  className="flex-1"
                >
                  {selectedFile.isHidden ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show File
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide File
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setSelectedFile(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
