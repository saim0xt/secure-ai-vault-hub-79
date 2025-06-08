
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Bell, Cloud, Smartphone, Brain, Wifi, Key, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Preferences } from '@capacitor/preferences';
import { PermissionsService } from '../../services/PermissionsService';
import { BiometricService } from '../../services/BiometricService';
import { GoogleDriveService } from '../../services/GoogleDriveService';
import { AIAPIService } from '../../services/AIAPIService';

interface SettingsData {
  biometricEnabled: boolean;
  autoBackup: boolean;
  cloudSync: boolean;
  notifications: boolean;
  stealthMode: boolean;
  breakInDetection: boolean;
  volumeKeyPattern: boolean;
  screenshotPrevention: boolean;
  openAIKey: string;
  googleCloudKey: string;
  elevenLabsKey: string;
  googleDriveClientId: string;
  googleDriveAPIKey: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsData>({
    biometricEnabled: false,
    autoBackup: false,
    cloudSync: false,
    notifications: true,
    stealthMode: false,
    breakInDetection: true,
    volumeKeyPattern: false,
    screenshotPrevention: true,
    openAIKey: '',
    googleCloudKey: '',
    elevenLabsKey: '',
    googleDriveClientId: '',
    googleDriveAPIKey: ''
  });
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    loadSettings();
    checkBiometricAvailability();
  }, []);

  const loadSettings = async () => {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_settings' });
      if (value) {
        const savedSettings = JSON.parse(value);
        setSettings(prev => ({ ...prev, ...savedSettings }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const capabilities = await BiometricService.getInstance().checkCapabilities();
      setBiometricAvailable(capabilities.isAvailable);
    } catch (error) {
      console.error('Failed to check biometric capabilities:', error);
    }
  };

  const saveSettings = async (newSettings: Partial<SettingsData>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await Preferences.set({ 
        key: 'vaultix_settings', 
        value: JSON.stringify(updatedSettings) 
      });
      
      // Save API keys to AI service
      if (newSettings.openAIKey || newSettings.googleCloudKey || newSettings.elevenLabsKey) {
        await AIAPIService.getInstance().configure({
          openAIKey: updatedSettings.openAIKey,
          googleCloudKey: updatedSettings.googleCloudKey,
          elevenLabsKey: updatedSettings.elevenLabsKey
        });
      }

      // Configure Google Drive if keys provided
      if (newSettings.googleDriveClientId || newSettings.googleDriveAPIKey) {
        await GoogleDriveService.getInstance().initialize({
          clientId: updatedSettings.googleDriveClientId,
          apiKey: updatedSettings.googleDriveAPIKey
        });
      }

      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggle = (key: keyof SettingsData, value: boolean) => {
    saveSettings({ [key]: value });
  };

  const handleInputChange = (key: keyof SettingsData, value: string) => {
    saveSettings({ [key]: value });
  };

  const requestPermissions = async () => {
    try {
      const success = await PermissionsService.getInstance().requestAllPermissions();
      if (success) {
        toast({
          title: "Permissions granted",
          description: "All required permissions have been granted.",
        });
      } else {
        toast({
          title: "Permissions needed",
          description: "Some permissions were not granted. Please check permission settings.",
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
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Configure your vault security and features</p>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Quick Setup
            </CardTitle>
            <CardDescription>
              Essential security configurations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/permissions')} 
              className="w-full justify-start"
              variant="outline"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Manage Android Permissions
            </Button>
            <Button 
              onClick={() => navigate('/biometric-settings')} 
              className="w-full justify-start"
              variant="outline"
            >
              <Key className="h-4 w-4 mr-2" />
              Setup Biometric Authentication
            </Button>
            <Button 
              onClick={requestPermissions}
              className="w-full justify-start"
            >
              <Shield className="h-4 w-4 mr-2" />
              Grant All Permissions
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Features
            </CardTitle>
            <CardDescription>
              Configure vault protection and monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Biometric Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Use fingerprint or face unlock
                  {!biometricAvailable && (
                    <Badge variant="secondary" className="ml-2">Not Available</Badge>
                  )}
                </p>
              </div>
              <Switch
                checked={settings.biometricEnabled && biometricAvailable}
                onCheckedChange={(checked) => handleToggle('biometricEnabled', checked)}
                disabled={!biometricAvailable}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Break-in Detection</Label>
                <p className="text-sm text-muted-foreground">
                  Capture photos of unauthorized access attempts
                </p>
              </div>
              <Switch
                checked={settings.breakInDetection}
                onCheckedChange={(checked) => handleToggle('breakInDetection', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Volume Key Unlock</Label>
                <p className="text-sm text-muted-foreground">
                  Use volume button pattern to unlock
                </p>
              </div>
              <Switch
                checked={settings.volumeKeyPattern}
                onCheckedChange={(checked) => handleToggle('volumeKeyPattern', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Screenshot Prevention</Label>
                <p className="text-sm text-muted-foreground">
                  Block screenshots and screen recording
                </p>
              </div>
              <Switch
                checked={settings.screenshotPrevention}
                onCheckedChange={(checked) => handleToggle('screenshotPrevention', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Stealth Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Hide app as calculator
                </p>
              </div>
              <Switch
                checked={settings.stealthMode}
                onCheckedChange={(checked) => handleToggle('stealthMode', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Features
            </CardTitle>
            <CardDescription>
              Configure AI processing capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={settings.openAIKey}
                onChange={(e) => handleInputChange('openAIKey', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for image analysis, NSFW detection, and AI insights
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-cloud-key">Google Cloud API Key</Label>
              <Input
                id="google-cloud-key"
                type="password"
                placeholder="AIza..."
                value={settings.googleCloudKey}
                onChange={(e) => handleInputChange('googleCloudKey', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for voice transcription and advanced image processing
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="elevenlabs-key">ElevenLabs API Key</Label>
              <Input
                id="elevenlabs-key"
                type="password"
                placeholder="..."
                value={settings.elevenLabsKey}
                onChange={(e) => handleInputChange('elevenLabsKey', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for text-to-speech generation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cloud Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Cloud Services
            </CardTitle>
            <CardDescription>
              Configure cloud backup and synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto Backup</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically backup vault data
                </p>
              </div>
              <Switch
                checked={settings.autoBackup}
                onCheckedChange={(checked) => handleToggle('autoBackup', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="drive-client-id">Google Drive Client ID</Label>
              <Input
                id="drive-client-id"
                placeholder="123456789-..."
                value={settings.googleDriveClientId}
                onChange={(e) => handleInputChange('googleDriveClientId', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drive-api-key">Google Drive API Key</Label>
              <Input
                id="drive-api-key"
                type="password"
                placeholder="AIza..."
                value={settings.googleDriveAPIKey}
                onChange={(e) => handleInputChange('googleDriveAPIKey', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for Google Drive backup and sync
              </p>
            </div>
          </CardContent>
        </Card>

        {/* LAN Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Local Network Sync
            </CardTitle>
            <CardDescription>
              Sync with other devices on your local network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/lan-sync')} 
              className="w-full justify-start"
              variant="outline"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Manage LAN Sync
            </Button>
            <p className="text-xs text-muted-foreground">
              Discover and sync with other Vaultix devices on your WiFi network
            </p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure security alerts and reminders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Local Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Security alerts and backup reminders
                </p>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => handleToggle('notifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced</CardTitle>
            <CardDescription>
              Additional configuration options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/breakin-logs')} 
              variant="outline" 
              className="w-full justify-start"
            >
              <Shield className="h-4 w-4 mr-2" />
              View Security Logs
            </Button>
            <Button 
              onClick={() => navigate('/testing')} 
              variant="outline" 
              className="w-full justify-start"
            >
              <Database className="h-4 w-4 mr-2" />
              Testing Suite
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
