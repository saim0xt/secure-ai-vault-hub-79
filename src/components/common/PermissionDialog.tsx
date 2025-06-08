
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Camera, Mic, MapPin, HardDrive, Phone, Eye, Smartphone } from 'lucide-react';

interface PermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: {
    type: 'camera' | 'microphone' | 'location' | 'storage' | 'phone' | 'overlay' | 'deviceAdmin' | 'usageStats';
    title: string;
    description: string;
    reason: string;
  };
  onAllow: () => void;
  onDeny: () => void;
}

const PermissionDialog: React.FC<PermissionDialogProps> = ({
  open,
  onOpenChange,
  permission,
  onAllow,
  onDeny
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const getPermissionIcon = () => {
    switch (permission.type) {
      case 'camera':
        return <Camera className="h-12 w-12 text-blue-500" />;
      case 'microphone':
        return <Mic className="h-12 w-12 text-green-500" />;
      case 'location':
        return <MapPin className="h-12 w-12 text-red-500" />;
      case 'storage':
        return <HardDrive className="h-12 w-12 text-orange-500" />;
      case 'phone':
        return <Phone className="h-12 w-12 text-purple-500" />;
      case 'overlay':
        return <Eye className="h-12 w-12 text-yellow-500" />;
      case 'deviceAdmin':
        return <Shield className="h-12 w-12 text-red-600" />;
      case 'usageStats':
        return <Smartphone className="h-12 w-12 text-indigo-500" />;
      default:
        return <Shield className="h-12 w-12 text-gray-500" />;
    }
  };

  const handleAllow = async () => {
    setIsProcessing(true);
    try {
      await onAllow();
    } finally {
      setIsProcessing(false);
      onOpenChange(false);
    }
  };

  const handleDeny = () => {
    onDeny();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            {getPermissionIcon()}
          </div>
          <div>
            <DialogTitle className="text-xl font-semibold text-foreground">
              Allow Vaultix to access {permission.title.toLowerCase()}?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              {permission.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium text-foreground mb-2">Why this permission is needed:</h4>
            <p className="text-sm text-muted-foreground">{permission.reason}</p>
          </div>

          <div className="flex items-center justify-center">
            <Badge variant="outline" className="text-xs">
              Required for security features
            </Badge>
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button
            variant="outline"
            onClick={handleDeny}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Deny
          </Button>
          <Button
            onClick={handleAllow}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Granting...
              </div>
            ) : (
              'Allow'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionDialog;
