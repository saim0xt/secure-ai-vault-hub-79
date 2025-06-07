
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Copy, Trash2, File, Image, Video, Music, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVault } from '@/contexts/VaultContext';

interface DuplicateGroup {
  id: string;
  hash: string;
  files: VaultFile[];
  totalSize: number;
  potentialSavings: number;
}

interface VaultFile {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  lastModified: Date;
  hash: string;
}

const DuplicateManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { files } = useVault();
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [totalPotentialSavings, setTotalPotentialSavings] = useState(0);

  useEffect(() => {
    scanForDuplicates();
  }, [files]);

  const calculateFileHash = async (file: File): Promise<string> => {
    // Simple hash calculation based on size and name for demo
    // In production, use actual file content hashing
    const content = `${file.size}-${file.name}-${file.lastModified}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const scanForDuplicates = async () => {
    setIsScanning(true);
    
    try {
      // Group files by hash
      const hashGroups: Record<string, VaultFile[]> = {};
      
      for (const file of files) {
        // Calculate hash (simplified for demo)
        const hash = `${file.size}-${file.type}`;
        
        if (!hashGroups[hash]) {
          hashGroups[hash] = [];
        }
        
        hashGroups[hash].push({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          path: file.path || '',
          lastModified: new Date(file.lastModified || Date.now()),
          hash
        });
      }

      // Filter groups with duplicates
      const duplicates: DuplicateGroup[] = [];
      let totalSavings = 0;

      Object.entries(hashGroups).forEach(([hash, groupFiles]) => {
        if (groupFiles.length > 1) {
          const totalSize = groupFiles.reduce((sum, file) => sum + file.size, 0);
          const potentialSavings = totalSize - groupFiles[0].size; // Keep one file
          
          duplicates.push({
            id: hash,
            hash,
            files: groupFiles.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()),
            totalSize,
            potentialSavings
          });
          
          totalSavings += potentialSavings;
        }
      });

      setDuplicateGroups(duplicates);
      setTotalPotentialSavings(totalSavings);
      
      toast({
        title: "Scan Complete",
        description: `Found ${duplicates.length} duplicate groups`,
      });
    } catch (error) {
      console.error('Error scanning for duplicates:', error);
      toast({
        title: "Scan Failed",
        description: "Failed to scan for duplicate files",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('audio/')) return Music;
    if (type.includes('text') || type.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const selectAllInGroup = (group: DuplicateGroup, keepNewest: boolean = true) => {
    const newSelected = new Set(selectedFiles);
    const sortedFiles = [...group.files].sort((a, b) => 
      b.lastModified.getTime() - a.lastModified.getTime()
    );
    
    if (keepNewest) {
      // Select all except the newest
      sortedFiles.slice(1).forEach(file => newSelected.add(file.id));
    } else {
      // Select all files in group
      group.files.forEach(file => newSelected.add(file.id));
    }
    
    setSelectedFiles(newSelected);
  };

  const deleteSelectedFiles = async () => {
    if (selectedFiles.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select files to delete",
        variant: "destructive",
      });
      return;
    }

    try {
      // Here you would implement actual file deletion
      console.log('Deleting files:', Array.from(selectedFiles));
      
      toast({
        title: "Files Deleted",
        description: `${selectedFiles.size} duplicate files removed`,
      });
      
      setSelectedFiles(new Set());
      await scanForDuplicates(); // Rescan after deletion
    } catch (error) {
      console.error('Error deleting files:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete selected files",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/files')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <Copy className="w-6 h-6 text-orange-500" />
              <h1 className="text-xl font-bold text-foreground">Duplicate Files</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={scanForDuplicates}
              disabled={isScanning}
              variant="outline"
            >
              {isScanning ? "Scanning..." : "Rescan"}
            </Button>
            {selectedFiles.size > 0 && (
              <Button
                onClick={deleteSelectedFiles}
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedFiles.size})
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Summary */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{duplicateGroups.length}</div>
              <div className="text-sm text-muted-foreground">Duplicate Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                {duplicateGroups.reduce((sum, group) => sum + group.files.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Duplicate Files</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {formatFileSize(totalPotentialSavings)}
              </div>
              <div className="text-sm text-muted-foreground">Potential Savings</div>
            </div>
          </div>
        </Card>

        {/* Duplicate Groups */}
        {duplicateGroups.length === 0 ? (
          <Card className="p-8 text-center">
            <Copy className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Duplicates Found
            </h3>
            <p className="text-muted-foreground">
              Your vault is clean! No duplicate files were detected.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {duplicateGroups.map((group) => (
              <Card key={group.id} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold text-foreground">
                      Duplicate Group - {group.files.length} files
                    </h3>
                    <Badge variant="outline">
                      Save {formatFileSize(group.potentialSavings)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => selectAllInGroup(group, true)}
                      variant="outline"
                      size="sm"
                    >
                      Keep Newest
                    </Button>
                    <Button
                      onClick={() => selectAllInGroup(group, false)}
                      variant="outline"
                      size="sm"
                    >
                      Select All
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {group.files.map((file, index) => {
                    const FileIcon = getFileIcon(file.type);
                    const isSelected = selectedFiles.has(file.id);
                    const isNewest = index === 0;

                    return (
                      <div
                        key={file.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                          isSelected ? 'border-red-500 bg-red-500/10' : 'border-border'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleFileSelection(file.id)}
                        />
                        
                        <FileIcon className="w-8 h-8 text-muted-foreground" />
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-foreground">{file.name}</span>
                            {isNewest && (
                              <Badge variant="default" className="text-xs">
                                Newest
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)} • {file.lastModified.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DuplicateManager;
