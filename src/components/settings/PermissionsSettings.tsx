
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Camera, Mic, MapPin, HardDrive, Phone, Eye, Settings as SettingsIcon, Smartphone } from 'lucide-react';
import { PermissionsService, PermissionStatus } from '@/services/PermissionsService';

export default function PermissionsSettings() {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: false,
    microphone: false,
    location: false,
    storage: false,
    phone: false,
    overlay: false,
    deviceAdmin: false,
    usageStats: false
  });
  const [isLoading, setIsLoading] = useState(true);

  const permissionsService = PermissionsService.getInstance();

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const status = await permissionsService.checkAllPermissions();
      setPermissions(status);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestAllPermissions = async () => {
    setIsLoading(true);
    try {
      await permissionsService.requestAllPermissions();
      await loadPermissions();
    } catch (error) {
      console.error('Failed to request permissions:', error);
    }
    setIsLoading(false);
  };

  const requestSpecificPermission = async (permission: keyof PermissionStatus) => {
    try {
      await permissionsService.requestSpecificPermission(permission);
      await loadPermissions();
    } catch (error) {
      console.error(`Failed to request ${permission} permission:`, error);
    }
  };

  const openAppSettings = () => {
    permissionsService.openAppSettings();
  };

  const permissionItems = [
    {
      key: 'camera' as keyof PermissionStatus,
      icon: Camera,
      title: 'Camera',
      description: 'Required for taking photos of intruders and secure image capture',
      critical: true
    },
    {
      key: 'microphone' as keyof PermissionStatus,
      icon: Mic,
      title: 'Microphone',
      description: 'Needed for voice recording and audio security features',
      critical: false
    },
    {
      key: 'location' as keyof PermissionStatus,
      icon: MapPin,
      title: 'Location',
      description: 'Used for location-based security logging and break-in detection',
      critical: false
    },
    {
      key: 'storage' as keyof PermissionStatus,
      icon: HardDrive,
      title: 'Storage',
      description: 'Essential for file management and secure data storage',
      critical: true
    },
    {
      key: 'phone' as keyof PermissionStatus,
      icon: Phone,
      title: 'Phone State',
      description: 'Required for dialer code detection and stealth features',
      critical: true
    },
    {
      key: 'overlay' as keyof PermissionStatus,
      icon: Eye,
      title: 'Display Over Apps',
      description: 'Enables security monitoring overlays and anti-tampering protection',
      critical: true
    },
    {
      key: 'deviceAdmin' as keyof PermissionStatus,
      icon: Shield,
      title: 'Device Administrator',
      description: 'Allows self-destruct functionality and advanced security features',
      critical: false
    },
    {
      key: 'usageStats' as keyof PermissionStatus,
      icon: Smartphone,
      title: 'Usage Access',
      description: 'Monitors app usage for suspicious activity detection',
      critical: false
    }
  ];

  const grantedCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissions).length;
  const criticalGranted = permissionItems
    .filter(item => item.critical)
    .every(item => permissions[item.key]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center">Loading permissions...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Permissions</h1>
          <p className="text-muted-foreground">
            Manage app permissions for security features
          </p>
        </div>
        <Badge variant={criticalGranted ? "default" : "destructive"}>
          {grantedCount}/{totalCount} Granted
        </Badge>
      </div>

      {!criticalGranted && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Some critical permissions are missing. Certain security features may not work properly.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Permission Status</CardTitle>
          <CardDescription>
            Grant permissions to enable full security functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={requestAllPermissions}
              className="flex-1"
              disabled={isLoading}
            >
              Request All Permissions
            </Button>
            <Button 
              variant="outline" 
              onClick={openAppSettings}
              className="flex-1"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              App Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {permissionItems.map((item) => {
          const Icon = item.icon;
          const isGranted = permissions[item.key];
          
          return (
            <Card key={item.key}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{item.title}</h3>
                        {item.critical && (
                          <Badge variant="outline" className="text-xs">
                            Critical
                          </Badge>
                        )}
                        <Badge 
                          variant={isGranted ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {isGranted ? "Granted" : "Not Granted"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={isGranted}
                      onCheckedChange={() => {
                        if (!isGranted) {
                          requestSpecificPermission(item.key);
                        } else {
                          openAppSettings();
                        }
                      }}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Note:</strong> Some permissions require manual approval in Android settings.
            </p>
            <p>
              If a permission shows as "Not Granted" after requesting, use the "App Settings" 
              button to manually enable it in your device settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
