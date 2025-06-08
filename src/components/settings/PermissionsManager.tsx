import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Shield, Camera, Mic, MapPin, HardDrive, Phone, Eye, Settings as SettingsIcon, Smartphone, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { PermissionsService, PermissionStatus } from '@/services/PermissionsService';
import { useToast } from '@/hooks/use-toast';
import NativePermissionDialog from '@/components/common/NativePermissionDialog';
import { usePermissionDialog } from '@/hooks/usePermissionDialog';

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
    requestPermission(
      permission,
      () => {
        loadPermissions();
        toast({
          title: "Permission Granted",
          description: `${permission} permission has been granted`,
        });
      },
      () => {
        toast({
          title: "Permission Denied",
          description: `${permission} permission was denied`,
          variant: "destructive",
        });
      }
    );
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Permissions Manager</h1>
              <p className="text-muted-foreground text-sm">
                Manage app permissions for security features
              </p>
            </div>
            <Badge 
              variant={criticalGranted ? "default" : "destructive"}
              className="px-3 py-1 text-sm font-medium"
            >
              {grantedCount}/{totalCount} Granted
            </Badge>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress Overview */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Permission Status
              </CardTitle>
              <CardDescription className="text-sm">
                Overall permission status and security readiness
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{grantedCount}/{totalCount} permissions granted</span>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className="h-3 bg-muted" 
                />
              </div>

              {!criticalGranted && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    Some critical permissions are missing. Certain security features may not work properly.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  onClick={requestAllPermissions}
                  disabled={isRequesting === 'all'}
                  className="h-11 font-medium"
                  size="lg"
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
                  className="h-11 font-medium border-border"
                  size="lg"
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  App Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Individual Permissions */}
          <div className="space-y-3">
            {permissionItems.map((item) => {
              const Icon = item.icon;
              const isGranted = permissions[item.key];
              const isRequestingThis = isRequesting === item.key;
              
              return (
                <Card key={item.key} className="border-border/50 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-3 rounded-xl shrink-0 ${
                        isGranted 
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg text-foreground">{item.title}</h3>
                              {item.critical && (
                                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400">
                                  Critical
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isGranted ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <Badge 
                                variant={isGranted ? "default" : "destructive"}
                                className="text-xs font-medium"
                              >
                                {isGranted ? "Granted" : "Not Granted"}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Action Button */}
                          <Button
                            variant={isGranted ? "outline" : "default"}
                            size="sm"
                            onClick={() => requestSpecificPermission(item.key)}
                            disabled={isRequestingThis}
                            className="shrink-0 font-medium"
                          >
                            {isRequestingThis ? (
                              <>
                                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                                Requesting...
                              </>
                            ) : isGranted ? (
                              'Check Again'
                            ) : (
                              'Grant Permission'
                            )}
                          </Button>
                        </div>
                        
                        {/* Description */}
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {item.description}
                        </p>
                        
                        {/* Features */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">Features enabled:</p>
                          <div className="flex flex-wrap gap-2">
                            {item.features.map((feature, index) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className={`text-xs ${
                                  isGranted 
                                    ? 'border-green-200 text-green-700 bg-green-50 dark:border-green-600 dark:text-green-400 dark:bg-green-900/20' 
                                    : 'border-border text-muted-foreground bg-muted/50'
                                }`}
                              >
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Help Section */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
              <CardDescription>
                Common permission issues and solutions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">If permissions are denied:</h4>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground leading-relaxed">
                  <li>Go to your device Settings → Apps → Vaultix → Permissions</li>
                  <li>Enable each required permission manually</li>
                  <li>Restart the app for changes to take effect</li>
                  <li>Some permissions require special setup (Device Admin, Overlay)</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Critical permissions explained:</h4>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground leading-relaxed">
                  <li><strong>Camera:</strong> Required for intruder detection and secure photos</li>
                  <li><strong>Storage:</strong> Essential for all file operations</li>
                  <li><strong>Phone State:</strong> Needed for dialer codes and stealth mode</li>
                  <li><strong>Display Over Apps:</strong> Prevents screenshots and tampering</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Native Permission Dialog */}
      <NativePermissionDialog
        open={dialogState.isOpen}
        onOpenChange={closeDialog}
        permissionType={dialogState.permissionType || ''}
        onAllow={dialogState.onAllow}
        onDeny={dialogState.onDeny}
      />
    </>
  );
}
