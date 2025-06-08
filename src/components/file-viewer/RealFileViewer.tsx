
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface RealFileViewerProps {
  fileId: string;
  onClose: () => void;
}

const RealFileViewer: React.FC<RealFileViewerProps> = ({ fileId, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">File Viewer</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>File viewer for ID: {fileId}</p>
            <p className="text-sm mt-2">File viewer implementation pending</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RealFileViewer;
