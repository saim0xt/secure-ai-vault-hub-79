
import { useState } from 'react';
import { RealPermissionsService } from '@/services/RealPermissionsService';
import { RealNativeNotificationService } from '@/services/RealNativeNotificationService';

interface PermissionDialogState {
  isOpen: boolean;
  permissionType: string | null;
  onAllow: (() => void) | null;
  onDeny: (() => void) | null;
}

export function usePermissionDialog() {
  const [dialogState, setDialogState] = useState<PermissionDialogState>({
    isOpen: false,
    permissionType: null,
    onAllow: null,
    onDeny: null,
  });

  const permissionsService = RealPermissionsService.getInstance();
  const notificationService = RealNativeNotificationService.getInstance();

  const requestPermission = async (
    permissionType: string,
    onAllow: () => void,
    onDeny: () => void
  ) => {
    try {
      // Show native Android permission dialog first
      const granted = await permissionsService.requestSpecificPermission(permissionType as any);
      
      if (granted) {
        onAllow();
        await notificationService.showSecurityAlert(
          'Permission Granted',
          `${permissionType} permission has been granted`,
          'permission_granted'
        );
      } else {
        // Show custom dialog as fallback
        setDialogState({
          isOpen: true,
          permissionType,
          onAllow: async () => {
            const retryGranted = await permissionsService.requestSpecificPermission(permissionType as any);
            if (retryGranted) {
              onAllow();
            } else {
              await notificationService.showPermissionRequest(
                permissionType,
                'This permission is required for security features to work properly'
              );
              onDeny();
            }
          },
          onDeny: () => {
            onDeny();
            notificationService.showPermissionRequest(
              permissionType,
              'Permission denied. Some features may not work correctly.'
            );
          },
        });
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      onDeny();
    }
  };

  const closeDialog = () => {
    setDialogState({
      isOpen: false,
      permissionType: null,
      onAllow: null,
      onDeny: null,
    });
  };

  return {
    dialogState,
    requestPermission,
    closeDialog,
  };
}
