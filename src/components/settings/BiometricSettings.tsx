
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, Shield, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { BiometricService, BiometricCapabilities, BiometricConfig } from '@/services/BiometricService';
import { useToast } from '@/hooks/use-toast';

export default function BiometricSettings() {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [config, setConfig] = useState<BiometricConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingAuth, setIsTestingAuth] = useState(false);

  const biometricService = BiometricService.getInstance();
  const { toast } = useToast();

  useEffect(() => {
    loadBiometricData();
  }, []);

  const loadBiometricData = async () => {
    try {
      setIsLoading(true);
      const [caps, conf] = await Promise.all([
        biometricService.checkCapabilities(),
        biometricService.getConfig()
      ]);
      setCapabilities(caps);
      setConfig(conf);
    } catch (error) {
      console.error('Failed to load biometric data:', error);
      toast({
        title: "Error",
        description: "Failed to load biometric settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBiometric = async (enabled: boolean) => {
    if (!capabilities?.isAvailable) {
      toast({
        title: "Not Available",
        description: "Biometric authentication is not available on this device",
        variant: "destructive",
      });
      return;
    }

    if (enabled) {
      // Test biometric authentication before enabling
      setIsTestingAuth(true);
      try {
        const result = await biometricService.authenticate(
          "Verify your identity to enable biometric authentication"
        );

        if (result.success) {
          await biometricService.setBiometricEnabled(true);
          setConfig(prev => prev ? { ...prev, enabled: true } : null);
          toast({
            title: "Success",
            description: "Biometric authentication enabled",
          });
        } else {
          toast({
            title: "Authentication Failed",
            description: result.error || "Biometric verification failed",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Biometric test failed:', error);
        toast({
          title: "Error",
          description: "Failed to verify biometric authentication",
          variant: "destructive",
        });
      } finally {
        setIsTestingAuth(false);
      }
    } else {
      await biometricService.setBiometricEnabled(false);
      setConfig(prev => prev ? { ...prev, enabled: false } : null);
      toast({
        title: "Disabled",
        description: "Biometric authentication disabled",
      });
    }
  };

  const updateConfig = async (updates: Partial<BiometricConfig>) => {
    if (!config) return;

    const newConfig = { ...config, ...updates };
    await biometricService.saveConfig(newConfig);
    setConfig(newConfig);
    
    toast({
      title: "Settings Updated",
      description: "Biometric configuration saved",
    });
  };

  const testBiometric = async () => {
    if (!capabilities?.isAvailable || !config?.enabled) return;

    setIsTestingAuth(true);
    try {
      const result = await biometricService.authenticateWithPrompt(
        "Test Authentication",
        "Verify your biometric",
        "This is a test of your biometric authentication setup"
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Biometric authentication test passed!",
        });
      } else {
        toast({
          title: "Test Failed",
          description: result.error || "Biometric test failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Biometric test error:', error);
      toast({
        title: "Error",
        description: "Biometric test error occurred",
        variant: "destructive",
      });
    } finally {
      setIsTestingAuth(false);
    }
  };

  const viewAuthHistory = async () => {
    try {
      const history = await biometricService.getAuthenticationHistory();
      
      toast({
        title: "Authentication History",
        description: `Total attempts: ${history.length}. Last 10 shown in logs.`,
      });

      console.log('Recent biometric authentication history:', history.slice(0, 10));
    } catch (error) {
      console.error('Failed to get auth history:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center">Loading biometric settings...</div>
      </div>
    );
  }

  if (!capabilities) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load biometric capabilities. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Biometric Authentication</h1>
          <p className="text-muted-foreground">
            Configure fingerprint and face unlock
          </p>
        </div>
        <Badge variant={capabilities.isAvailable ? "default" : "destructive"}>
          {capabilities.isAvailable ? "Available" : "Not Available"}
        </Badge>
      </div>

      {/* Device Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Device Capabilities
          </CardTitle>
          <CardDescription>
            Biometric authentication support on this device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Available Biometric Types</span>
            <div className="flex gap-2">
              {capabilities.biometryTypes.length > 0 ? (
                capabilities.biometryTypes.map((type, index) => (
                  <Badge key={index} variant="outline">{type}</Badge>
                ))
              ) : (
                <Badge variant="destructive">None</Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Strong Biometry Available</span>
            <Badge variant={capabilities.strongBiometryIsAvailable ? "default" : "secondary"}>
              {capabilities.strongBiometryIsAvailable ? "Yes" : "No"}
            </Badge>
          </div>

          {!capabilities.isAvailable && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Biometric authentication is not available on this device. Please check device settings.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      {capabilities.isAvailable && config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Biometric Settings
            </CardTitle>
            <CardDescription>
              Configure how biometric authentication works
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Enable Biometric Authentication</label>
                <p className="text-xs text-muted-foreground">
                  Use biometric unlock for vault access
                </p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={toggleBiometric}
                disabled={isTestingAuth}
              />
            </div>

            {config.enabled && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Allow Device Credential</label>
                    <p className="text-xs text-muted-foreground">
                      Fall back to PIN/password if biometric fails
                    </p>
                  </div>
                  <Switch
                    checked={config.allowDeviceCredential}
                    onCheckedChange={(checked) => updateConfig({ allowDeviceCredential: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Fallback to Device Credentials</label>
                    <p className="text-xs text-muted-foreground">
                      Show device unlock options when biometric fails
                    </p>
                  </div>
                  <Switch
                    checked={config.fallbackToDeviceCredentials}
                    onCheckedChange={(checked) => updateConfig({ fallbackToDeviceCredentials: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Require Confirmation</label>
                    <p className="text-xs text-muted-foreground">
                      Require user confirmation after biometric recognition
                    </p>
                  </div>
                  <Switch
                    checked={config.requireConfirmation}
                    onCheckedChange={(checked) => updateConfig({ requireConfirmation: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Invalidate on Biometry Change</label>
                    <p className="text-xs text-muted-foreground">
                      Disable biometric auth when device biometrics change
                    </p>
                  </div>
                  <Switch
                    checked={config.invalidateOnBiometryChange}
                    onCheckedChange={(checked) => updateConfig({ invalidateOnBiometryChange: checked })}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button 
                    onClick={testBiometric} 
                    disabled={isTestingAuth}
                    className="flex-1"
                  >
                    {isTestingAuth ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Test Authentication
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={viewAuthHistory}
                    className="flex-1"
                  >
                    View History
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {capabilities.isAvailable ? "✓" : "✗"}
              </div>
              <p className="text-sm text-muted-foreground">Device Support</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {config?.enabled ? "✓" : "✗"}
              </div>
              <p className="text-sm text-muted-foreground">Authentication Enabled</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
