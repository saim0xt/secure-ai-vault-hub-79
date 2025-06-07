
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { PermissionsService } from '@/services/PermissionsService';
import { useToast } from '@/hooks/use-toast';

interface PermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PermissionDialog: React.FC<PermissionDialogProps> = ({ isOpen, onClose }) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      checkPermissions();
    }
  }, [isOpen]);

  const checkPermissions = async () => {
    try {
      const status = await PermissionsService.getInstance().checkAllPermissions();
      setPermissionStatus(status);
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
  };

  const requestPermissions = async () => {
    setIsRequesting(true);
    try {
      const success = await PermissionsService.getInstance().requestAllPermissions();
      await checkPermissions();
      
      if (success) {
        toast({
          title: "Permissions Granted",
          description: "Essential permissions have been granted successfully.",
        });
        setTimeout(() => onClose(), 1500);
      } else {
        toast({
          title: "Some Permissions Denied",
          description: "Some permissions were not granted. You can manage them in settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to request permissions:', error);
      toast({
        title: "Error",
        description: "Failed to request permissions.",
        variant: "destructive",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const essentialPermissions = [
    { key: 'camera', label: 'Camera', description: 'Required for intruder detection' },
    { key: 'storage', label: 'Storage', description: 'Required for file management' },
    { key: 'overlay', label: 'Display Over Apps', description: 'Required for security features' },
    { key: 'phone', label: 'Phone State', description: 'Required for dialer codes' }
  ];

  const grantedCount = essentialPermissions.filter(p => permissionStatus[p.key]).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Allow Permissions to access photos, media, and files on your device?
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
            Vaultix needs these permissions to protect your files and provide security features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {essentialPermissions.map((permission) => (
            <div key={permission.key} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">{permission.label}</span>
                  {permissionStatus[permission.key] ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{permission.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mb-4">
          <Badge variant={grantedCount === essentialPermissions.length ? "default" : "destructive"}>
            {grantedCount}/{essentialPermissions.length} granted
          </Badge>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
          >
            Don't ask again
          </Button>
          <Button 
            onClick={requestPermissions}
            disabled={isRequesting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isRequesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Requesting...
              </>
            ) : (
              'ALLOW'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionDialog;
