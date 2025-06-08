
import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FolderOpen } from 'lucide-react';

interface NativePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissionType: string;
  onAllow: () => void;
  onDeny: () => void;
}

const NativePermissionDialog: React.FC<NativePermissionDialogProps> = ({
  open,
  onOpenChange,
  permissionType,
  onAllow,
  onDeny
}) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const getPermissionMessage = () => {
    switch (permissionType) {
      case 'storage':
        return 'Allow Permissions to access photos, media, and files on your device?';
      case 'camera':
        return 'Allow Permissions to take pictures and record video?';
      case 'microphone':
        return 'Allow Permissions to record audio?';
      case 'location':
        return 'Allow Permissions to access this device\'s location?';
      default:
        return `Allow Permissions to access ${permissionType}?`;
    }
  };

  const handleAllow = async () => {
    setIsProcessing(true);
    try {
      await onAllow();
      if (dontAskAgain) {
        // Store the "don't ask again" preference
        localStorage.setItem(`permission_${permissionType}_dont_ask`, 'true');
      }
    } finally {
      setIsProcessing(false);
      onOpenChange(false);
    }
  };

  const handleDeny = () => {
    if (dontAskAgain) {
      localStorage.setItem(`permission_${permissionType}_dont_ask`, 'true');
    }
    onDeny();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-white border-none shadow-2xl rounded-lg p-0 overflow-hidden">
        <div className="p-6 space-y-4">
          {/* Icon */}
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <p className="text-gray-900 text-base leading-relaxed">
              {getPermissionMessage()}
            </p>
          </div>

          {/* Don't ask again checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="dont-ask-again"
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked as boolean)}
              className="w-4 h-4"
            />
            <label 
              htmlFor="dont-ask-again" 
              className="text-sm text-gray-700 cursor-pointer"
            >
              Don't ask again
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="ghost"
              onClick={handleDeny}
              disabled={isProcessing}
              className="text-blue-600 hover:bg-blue-50 font-medium px-4 py-2 rounded"
            >
              DENY
            </Button>
            <Button
              onClick={handleAllow}
              disabled={isProcessing}
              className="text-blue-600 hover:bg-blue-50 font-medium px-4 py-2 rounded bg-transparent border-none shadow-none"
            >
              {isProcessing ? 'ALLOWING...' : 'ALLOW'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NativePermissionDialog;
