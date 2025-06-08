
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Shield, Camera, Mic, MapPin, HardDrive, Phone, Eye, Settings as SettingsIcon, Smartphone, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { PermissionsService, PermissionStatus } from '@/services/PermissionsService';
import { useToast } from '@/hooks/use-toast';
import { usePermissionDialog } from '@/hooks/usePermissionDialog';
import PermissionDialog from '@/components/common/PermissionDialog';

export default function PermissionsManager() {
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
  const [isRequesting, setIsRequesting] = useState<string | null>(null);

  const permissionsService = PermissionsService.getInstance();
  const { toast } = useToast();
  const { dialogState, requestPermission, closeDialog } = usePermissionDialog();

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const status = await permissionsService.checkAllPermissions();
      setPermissions(status);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      toast({
        title: "Error",
        description: "Failed to load permission status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const requestAllPermissions = async () => {
    setIsRequesting('all');
    try {
      const success = await permissionsService.requestAllPermissions();
      await loadPermissions();
      
      if (success) {
        toast({
          title: "Permissions Granted",
          description: "All permissions have been granted successfully",
        });
      } else {
        toast({
          title: "Some Permissions Denied",
          description: "Some permissions were not granted. Check individual permissions below.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to request permissions:', error);
      toast({
        title: "Error",
        description: "Failed to request permissions",
        variant: "destructive",
      });
    } finally {
      setIsRequesting(null);
    }
  };

  const requestSpecificPermission = async (permission: keyof PermissionStatus) => {
    setIsRequesting(permission);
    try {
      const granted = await requestPermission(permission);
      await loadPermissions();
      
      toast({
        title: granted ? "Permission Granted" : "Permission Denied",
        description: `${permission} permission has been ${granted ? 'granted' : 'denied'}`,
        variant: granted ? "default" : "destructive",
      });
    } catch (error) {
      console.error(`Failed to request ${permission} permission:`, error);
      toast({
        title: "Error",
        description: `Failed to request ${permission} permission`,
        variant: "destructive",
      });
    } finally {
      setIsRequesting(null);
    }
  };

  const openAppSettings = () => {
    permissionsService.openAppSettings();
    toast({
      title: "Opening Settings",
      description: "Please grant the required permissions in the app settings",
    });
  };

  const permissionItems = [
    {
      key: 'camera' as keyof PermissionStatus,
      icon: Camera,
      title: 'Camera',
      description: 'Required for taking photos of intruders and secure image capture',
      critical: true,
      features: ['Intruder Detection', 'Secure Camera', 'Break-in Photos']
    },
    {
      key: 'microphone' as keyof PermissionStatus,
      icon: Mic,
      title: 'Microphone',
      description: 'Needed for voice recording and audio security features',
      critical: false,
      features: ['Voice Recording', 'Audio Notes', 'Voice Commands']
    },
    {
      key: 'location' as keyof PermissionStatus,
      icon: MapPin,
      title: 'Location',
      description: 'Used for location-based security logging and break-in detection',
      critical: false,
      features: ['Location Logging', 'Geofencing', 'Security Alerts']
    },
    {
      key: 'storage' as keyof PermissionStatus,
      icon: HardDrive,
      title: 'Storage',
      description: 'Essential for file management and secure data storage',
      critical: true,
      features: ['File Storage', 'Backup/Restore', 'Data Management']
    },
    {
      key: 'phone' as keyof PermissionStatus,
      icon: Phone,
      title: 'Phone State',
      description: 'Required for dialer code detection and stealth features',
      critical: true,
      features: ['Dialer Codes', 'Stealth Mode', 'Call Detection']
    },
    {
      key: 'overlay' as keyof PermissionStatus,
      icon: Eye,
      title: 'Display Over Apps',
      description: 'Enables security monitoring overlays and anti-tampering protection',
      critical: true,
      features: ['Screenshot Prevention', 'Security Overlays', 'Anti-Tampering']
    },
    {
      key: 'deviceAdmin' as keyof PermissionStatus,
      icon: Shield,
      title: 'Device Administrator',
      description: 'Allows self-destruct functionality and advanced security features',
      critical: false,
      features: ['Self-Destruct', 'Device Lock', 'Factory Reset']
    },
    {
      key: 'usageStats' as keyof PermissionStatus,
      icon: Smartphone,
      title: 'Usage Access',
      description: 'Monitors app usage for suspicious activity detection',
      critical: false,
      features: ['Usage Monitoring', 'Activity Detection', 'Security Analytics']
    }
  ];

  const grantedCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissions).length;
  const criticalGranted = permissionItems
    .filter(item => item.critical)
    .every(item => permissions[item.key]);
  const progressPercentage = (grantedCount / totalCount) * 100;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center">Loading permissions...</div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Permissions Manager</h1>
            <p className="text-muted-foreground">
              Manage app permissions for security features
            </p>
          </div>
          <Badge variant={criticalGranted ? "default" : "destructive"}>
            {grantedCount}/{totalCount} Granted
          </Badge>
        </div>

        {/* Permission Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permission Status
            </CardTitle>
            <CardDescription>
              Overall permission status and security readiness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{grantedCount}/{totalCount} permissions granted</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {!criticalGranted && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some critical permissions are missing. Certain security features may not work properly.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button 
                onClick={requestAllPermissions}
                disabled={isRequesting === 'all'}
                className="flex-1"
              >
                {isRequesting === 'all' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Requesting...
                  </>
                ) : (
                  'Request All Permissions'
                )}
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

        {/* Individual Permissions */}
        <div className="space-y-4">
          {permissionItems.map((item) => {
            const Icon = item.icon;
            const isGranted = permissions[item.key];
            const isRequestingThis = isRequesting === item.key;
            
            return (
              <Card key={item.key}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`p-3 rounded-lg ${isGranted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{item.title}</h3>
                          {item.critical && (
                            <Badge variant="outline" className="text-xs">
                              Critical
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-muted-foreground mb-3">
                          {item.description}
                        </p>
                        
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Features enabled:</p>
                          <div className="flex flex-wrap gap-2">
                            {item.features.map((feature, index) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className={`text-xs ${isGranted ? 'border-green-200 text-green-700' : 'border-gray-200 text-gray-500'}`}
                              >
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1">
                        {isGranted ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge 
                          variant={isGranted ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {isGranted ? "Granted" : "Not Granted"}
                        </Badge>
                      </div>
                      <Button
                        variant={isGranted ? "outline" : "default"}
                        size="sm"
                        onClick={() => requestSpecificPermission(item.key)}
                        disabled={isRequestingThis}
                      >
                        {isRequestingThis ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Requesting...
                          </>
                        ) : isGranted ? (
                          'Check Again'
                        ) : (
                          'Grant Permission'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Permission Dialog */}
      {dialogState.permission && (
        <PermissionDialog
          open={dialogState.isOpen}
          onOpenChange={closeDialog}
          permission={dialogState.permission}
          onAllow={(dialogState as any).onAllow || (() => {})}
          onDeny={(dialogState as any).onDeny || (() => {})}
        />
      )}
    </>
  );
}
