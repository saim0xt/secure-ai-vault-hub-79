
import { useState } from 'react';
import { PermissionsService } from '@/services/PermissionsService';

interface PermissionDialogState {
  isOpen: boolean;
  permissionType: string | null;
  onAllow: () => void;
  onDeny: () => void;
}

export const usePermissionDialog = () => {
  const [dialogState, setDialogState] = useState<PermissionDialogState>({
    isOpen: false,
    permissionType: null,
    onAllow: () => {},
    onDeny: () => {}
  });

  const permissionsService = PermissionsService.getInstance();

  const requestPermission = async (
    permissionType: string,
    onSuccess?: () => void,
    onFailure?: () => void
  ) => {
    // Check if user previously said "don't ask again"
    const dontAsk = localStorage.getItem(`permission_${permissionType}_dont_ask`);
    if (dontAsk === 'true') {
      // Directly try to request permission without showing dialog
      try {
        const granted = await permissionsService.requestSpecificPermission(permissionType as any);
        if (granted) {
          onSuccess?.();
        } else {
          onFailure?.();
        }
      } catch (error) {
        console.error('Permission request failed:', error);
        onFailure?.();
      }
      return;
    }

    // Show permission dialog
    setDialogState({
      isOpen: true,
      permissionType,
      onAllow: async () => {
        try {
          const granted = await permissionsService.requestSpecificPermission(permissionType as any);
          if (granted) {
            onSuccess?.();
          } else {
            onFailure?.();
          }
        } catch (error) {
          console.error('Permission request failed:', error);
          onFailure?.();
        }
      },
      onDeny: () => {
        onFailure?.();
      }
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  return {
    dialogState,
    requestPermission,
    closeDialog
  };
};
