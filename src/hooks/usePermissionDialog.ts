
import { useState, useCallback } from 'react';
import { PermissionsService } from '@/services/PermissionsService';

export interface PermissionDialogState {
  isOpen: boolean;
  permission: {
    type: 'camera' | 'microphone' | 'location' | 'storage' | 'phone' | 'overlay' | 'deviceAdmin' | 'usageStats';
    title: string;
    description: string;
    reason: string;
  } | null;
}

export const usePermissionDialog = () => {
  const [dialogState, setDialogState] = useState<PermissionDialogState>({
    isOpen: false,
    permission: null
  });

  const permissionsService = PermissionsService.getInstance();

  const requestPermission = useCallback(async (
    permissionType: 'camera' | 'microphone' | 'location' | 'storage' | 'phone' | 'overlay' | 'deviceAdmin' | 'usageStats'
  ): Promise<boolean> => {
    const permissionInfo = getPermissionInfo(permissionType);
    
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        permission: permissionInfo
      });

      const handleAllow = async () => {
        try {
          const granted = await permissionsService.requestSpecificPermission(permissionType);
          setDialogState({ isOpen: false, permission: null });
          resolve(granted);
        } catch (error) {
          console.error(`Error requesting ${permissionType} permission:`, error);
          setDialogState({ isOpen: false, permission: null });
          resolve(false);
        }
      };

      const handleDeny = () => {
        setDialogState({ isOpen: false, permission: null });
        resolve(false);
      };

      // Store handlers for the dialog component
      (dialogState as any).onAllow = handleAllow;
      (dialogState as any).onDeny = handleDeny;
    });
  }, [permissionsService]);

  const closeDialog = useCallback(() => {
    setDialogState({ isOpen: false, permission: null });
  }, []);

  return {
    dialogState,
    requestPermission,
    closeDialog
  };
};

const getPermissionInfo = (type: string) => {
  const permissionMap = {
    camera: {
      type: 'camera' as const,
      title: 'Camera',
      description: 'Allow Vaultix to access photos, media, and files on your device?',
      reason: 'Required for taking photos of intruders and secure image capture. This enables Intruder Detection, Secure Camera, and Break-in Photos features.'
    },
    microphone: {
      type: 'microphone' as const,
      title: 'Microphone',
      description: 'Allow Vaultix to record audio?',
      reason: 'Needed for voice recording and audio security features including Voice Recording, Audio Notes, and Voice Commands.'
    },
    location: {
      type: 'location' as const,
      title: 'Location',
      description: 'Allow Vaultix to access this device\'s location?',
      reason: 'Used for location-based security logging and break-in detection. Enables Location Logging, Geofencing, and Security Alerts.'
    },
    storage: {
      type: 'storage' as const,
      title: 'Storage',
      description: 'Allow Vaultix to access files and media?',
      reason: 'Essential for file management and secure data storage. Required for File Storage, Backup/Restore, and Data Management.'
    },
    phone: {
      type: 'phone' as const,
      title: 'Phone',
      description: 'Allow Vaultix to access phone state?',
      reason: 'Required for dialer code detection and stealth features. Enables Dialer Codes, Stealth Mode, and Call Detection.'
    },
    overlay: {
      type: 'overlay' as const,
      title: 'Display over other apps',
      description: 'Allow Vaultix to display over other apps?',
      reason: 'Enables security monitoring overlays and anti-tampering protection. Required for Screenshot Prevention, Security Overlays, and Anti-Tampering.'
    },
    deviceAdmin: {
      type: 'deviceAdmin' as const,
      title: 'Device Administrator',
      description: 'Allow Vaultix to be a device administrator?',
      reason: 'Allows self-destruct functionality and advanced security features including Self-Destruct, Device Lock, and Factory Reset.'
    },
    usageStats: {
      type: 'usageStats' as const,
      title: 'Usage Access',
      description: 'Allow Vaultix to access usage statistics?',
      reason: 'Monitors app usage for suspicious activity detection. Enables Usage Monitoring, Activity Detection, and Security Analytics.'
    }
  };

  return permissionMap[type as keyof typeof permissionMap] || permissionMap.storage;
};
