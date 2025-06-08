
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Camera, Lock, Eye, Smartphone, AlertTriangle, CheckCircle } from 'lucide-react';
import { RealSecurityService, SecurityEventData } from '@/services/RealSecurityService';
import { IntruderDetectionComponent } from '@/components/security/RealIntruderDetection';
import { AndroidPermissionsService } from '@/services/AndroidPermissionsService';
import { useToast } from '@/hooks/use-toast';

export default function SecurityCenterPage() {
  const [securityStatus, setSecurityStatus] = useState({
    monitoring: false,
    screenshotPrevention: false,
    stealthMode: false,
    tamperDetection: false
  });
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
    location: false,
    storage: false,
    overlay: false,
    usageStats: false,
    deviceAdmin: false
  });
  const [securityEvents, setSecurityEvents] = useState<SecurityEventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const securityService = RealSecurityService.getInstance();
  const permissionsService = AndroidPermissionsService.getInstance();
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setIsLoading(true);
      
      const [status, perms, events] = await Promise.all([
        securityService.getSecurityStatus(),
        permissionsService.checkAllPermissions(),
        securityService.getSecurityEvents()
      ]);

      setSecurityStatus(status);
      setPermissions(perms);
      setSecurityEvents(events.slice(0, 20)); // Show last 20 events
    } catch (error) {
      console.error('Failed to load security data:', error);
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleScreenshotPrevention = async () => {
    try {
      const success = securityStatus.screenshotPrevention
        ? await securityService.disableScreenshotPrevention()
        : await securityService.enableScreenshotPrevention();

      if (success) {
        setSecurityStatus(prev => ({
          ...prev,
          screenshotPrevention: !prev.screenshotPrevention
        }));
        
        toast({
          title: "Screenshot Prevention",
          description: `Screenshot prevention ${securityStatus.screenshotPrevention ? 'disabled' : 'enabled'}`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to toggle screenshot prevention",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to toggle screenshot prevention:', error);
    }
  };

  const toggleStealthMode = async () => {
    try {
      const success = securityStatus.stealthMode
        ? await securityService.disableStealthMode()
        : await securityService.enableStealthMode();

      if (success) {
        setSecurityStatus(prev => ({
          ...prev,
          stealthMode: !prev.stealthMode
        }));
        
        toast({
          title: "Stealth Mode",
          description: `Stealth mode ${securityStatus.stealthMode ? 'disabled' : 'enabled'}`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to toggle stealth mode",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to toggle stealth mode:', error);
    }
  };

  const toggleSecurityMonitoring = async () => {
    try {
      const success = securityStatus.monitoring
        ? await securityService.stopSecurityMonitoring()
        : await securityService.startSecurityMonitoring();

      if (success) {
        setSecurityStatus(prev => ({
          ...prev,
          monitoring: !prev.monitoring
        }));
        
        toast({
          title: "Security Monitoring",
          description: `Security monitoring ${securityStatus.monitoring ? 'stopped' : 'started'}`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to toggle security monitoring",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to toggle security monitoring:', error);
    }
  };

  const requestPermission = async (permissionType: keyof typeof permissions) => {
    try {
      let success = false;
      
      switch (permissionType) {
        case 'camera':
          success = await permissionsService.requestCameraPermission();
          break;
        case 'microphone':
          success = await permissionsService.requestMicrophonePermission();
          break;
        case 'location':
          success = await permissionsService.requestLocationPermission();
          break;
        case 'storage':
          success = await permissionsService.requestStoragePermissions();
          break;
        case 'overlay':
          success = await permissionsService.requestOverlayPermission();
          break;
        case 'usageStats':
          success = await permissionsService.requestUsageStatsPermission();
          break;
        case 'deviceAdmin':
          success = await permissionsService.requestDeviceAdminPermission();
          break;
      }

      if (success) {
        setPermissions(prev => ({ ...prev, [permissionType]: true }));
        toast({
          title: "Permission Granted",
          description: `${permissionType} permission has been granted`,
        });
      } else {
        toast({
          title: "Permission Denied",
          description: `${permissionType} permission was denied`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(`Failed to request ${permissionType} permission:`, error);
    }
  };

  const clearSecurityEvents = async () => {
    try {
      await securityService.clearSecurityEvents();
      setSecurityEvents([]);
      toast({
        title: "Cleared",
        description: "All security events have been cleared"
      });
    } catch (error) {
      console.error('Failed to clear security events:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading security center...</p>
        </div>
      </div>
    );
  }

  const securityScore = Object.values(permissions).filter(Boolean).length + 
                       Object.values(securityStatus).filter(Boolean).length;
  const maxScore = Object.keys(permissions).length + Object.keys(securityStatus).length;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Security Center</h1>
            <p className="text-muted-foreground">Manage your vault security settings</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">{securityScore}/{maxScore}</div>
            <div className="text-sm text-muted-foreground">Security Score</div>
          </div>
        </div>

        {/* Security Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">Monitoring</div>
                  <div className="text-sm text-muted-foreground">System monitoring</div>
                </div>
                {securityStatus.monitoring ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">Screenshot Protection</div>
                  <div className="text-sm text-muted-foreground">Prevent screenshots</div>
                </div>
                {securityStatus.screenshotPrevention ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">Stealth Mode</div>
                  <div className="text-sm text-muted-foreground">Hidden app icon</div>
                </div>
                {securityStatus.stealthMode ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">Tamper Detection</div>
                  <div className="text-sm text-muted-foreground">Device monitoring</div>
                </div>
                {securityStatus.tamperDetection ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="intruder">Intruder Detection</TabsTrigger>
            <TabsTrigger value="events">Security Events</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Features</CardTitle>
                <CardDescription>Configure advanced security features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Security Monitoring</div>
                    <div className="text-sm text-muted-foreground">Monitor device for security threats</div>
                  </div>
                  <Switch 
                    checked={securityStatus.monitoring} 
                    onCheckedChange={toggleSecurityMonitoring}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Screenshot Prevention</div>
                    <div className="text-sm text-muted-foreground">Prevent unauthorized screenshots</div>
                  </div>
                  <Switch 
                    checked={securityStatus.screenshotPrevention} 
                    onCheckedChange={toggleScreenshotPrevention}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Stealth Mode</div>
                    <div className="text-sm text-muted-foreground">Hide app icon (appears as calculator)</div>
                  </div>
                  <Switch 
                    checked={securityStatus.stealthMode} 
                    onCheckedChange={toggleStealthMode}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Required Permissions</CardTitle>
                <CardDescription>Grant permissions for security features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(permissions).map(([key, granted]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                      <div className="text-sm text-muted-foreground">
                        {key === 'camera' && 'Required for intruder detection'}
                        {key === 'microphone' && 'Required for voice recording'}
                        {key === 'location' && 'Required for security tracking'}
                        {key === 'storage' && 'Required for file management'}
                        {key === 'overlay' && 'Required for screenshot prevention'}
                        {key === 'usageStats' && 'Required for app monitoring'}
                        {key === 'deviceAdmin' && 'Required for self-destruct'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {granted ? (
                        <Badge variant="default" className="bg-green-500">Granted</Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => requestPermission(key as keyof typeof permissions)}
                        >
                          Grant
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="intruder">
            <Card>
              <CardHeader>
                <CardTitle>Intruder Detection</CardTitle>
                <CardDescription>Monitor and log unauthorized access attempts</CardDescription>
              </CardHeader>
              <CardContent>
                <IntruderDetectionComponent />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Security Events
                  <Button variant="outline" size="sm" onClick={clearSecurityEvents}>
                    Clear All
                  </Button>
                </CardTitle>
                <CardDescription>Recent security events and alerts</CardDescription>
              </CardHeader>
              <CardContent>
                {securityEvents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No security events recorded</p>
                ) : (
                  <div className="space-y-2">
                    {securityEvents.map((event, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{event.type.replace(/_/g, ' ').toUpperCase()}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                          {event.details && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {JSON.stringify(event.details, null, 2).substring(0, 100)}...
                            </div>
                          )}
                        </div>
                        <Badge 
                          variant={
                            event.severity === 'critical' ? 'destructive' :
                            event.severity === 'high' ? 'default' :
                            'secondary'
                          }
                        >
                          {event.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
