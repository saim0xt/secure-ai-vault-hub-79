
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSecurity } from '@/contexts/SecurityContext';
import { BiometricService } from '@/services/BiometricService';
import { AdMobService } from '@/services/AdMobService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, Palette, Bell, Cloud, Info, Gift, Settings as SettingsIcon, Fingerprint, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const navigate = useNavigate();
  const { logout, biometricEnabled, setBiometricEnabled } = useAuth();
  const { theme, setTheme } = useTheme();
  const { 
    preventScreenshots, 
    setPreventScreenshots,
    shakeToLock,
    setShakeToLock,
    stealthMode,
    setStealthMode,
    permissionsGranted,
    requestAllPermissions
  } = useSecurity();
  const { toast } = useToast();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [adMobEnabled, setAdMobEnabled] = useState(false);
  const [notifications, setNotifications] = useState({
    securityAlerts: true,
    dailyTips: true,
    rewardNotifications: true
  });

  const biometricService = BiometricService.getInstance();
  const adMobService = AdMobService.getInstance();

  useEffect(() => {
    checkBiometricAvailability();
    checkAdMobStatus();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const capabilities = await biometricService.checkCapabilities();
      setBiometricAvailable(capabilities.isAvailable);
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
    }
  };

  const checkAdMobStatus = async () => {
    try {
      const config = adMobService.getConfig();
      setAdMobEnabled(config.enabled);
    } catch (error) {
      console.error('Failed to check AdMob status:', error);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (!biometricAvailable) {
      toast({
        title: "Not Available",
        description: "Biometric authentication is not available on this device",
        variant: "destructive",
      });
      return;
    }

    if (enabled) {
      try {
        const result = await biometricService.authenticate("Enable biometric authentication");
        if (result.success) {
          setBiometricEnabled(enabled);
          toast({
            title: "Success",
            description: "Biometric authentication enabled",
          });
        } else {
          toast({
            title: "Failed",
            description: result.error || "Biometric verification failed",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Biometric toggle error:', error);
        toast({
          title: "Error",
          description: "Failed to verify biometric authentication",
          variant: "destructive",
        });
      }
    } else {
      setBiometricEnabled(enabled);
      toast({
        title: "Disabled",
        description: "Biometric authentication disabled",
      });
    }
  };

  const handlePermissionsRequest = async () => {
    try {
      const success = await requestAllPermissions();
      if (success) {
        toast({
          title: "Permissions Granted",
          description: "Security permissions have been updated",
        });
      } else {
        toast({
          title: "Permissions Needed",
          description: "Some permissions were not granted. Please check settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      toast({
        title: "Error",
        description: "Failed to request permissions",
        variant: "destructive",
      });
    }
  };

  const handleNotificationToggle = (type: string, enabled: boolean) => {
    setNotifications(prev => ({ ...prev, [type]: enabled }));
    toast({
      title: "Notification Settings",
      description: `${type} notifications ${enabled ? 'enabled' : 'disabled'}`,
    });
  };

  const settingsSections = [
    {
      title: 'Security',
      icon: Shield,
      items: [
        {
          label: 'Permissions Manager',
          description: 'Manage app permissions for security features',
          type: 'button',
          action: () => navigate('/permissions'),
          badge: permissionsGranted ? 'Granted' : 'Needed',
          badgeVariant: permissionsGranted ? 'default' : 'destructive'
        },
        {
          label: 'Biometric Authentication',
          description: biometricAvailable ? 'Use fingerprint or face unlock' : 'Not available on this device',
          type: 'switch',
          value: biometricEnabled && biometricAvailable,
          onChange: handleBiometricToggle,
          disabled: !biometricAvailable,
          badge: biometricAvailable ? 'Available' : 'Unavailable',
          badgeVariant: biometricAvailable ? 'default' : 'secondary'
        },
        {
          label: 'Biometric Settings',
          description: 'Configure biometric authentication options',
          type: 'button',
          action: () => navigate('/biometric-settings'),
          disabled: !biometricAvailable
        },
        {
          label: 'Prevent Screenshots',
          description: 'Block screenshots and screen recording',
          type: 'switch',
          value: preventScreenshots,
          onChange: setPreventScreenshots,
        },
        {
          label: 'Shake to Lock',
          description: 'Lock vault when device is shaken',
          type: 'switch',
          value: shakeToLock,
          onChange: setShakeToLock,
        },
        {
          label: 'Stealth Mode',
          description: 'Disguise app as calculator',
          type: 'switch',
          value: stealthMode,
          onChange: setStealthMode,
        },
        {
          label: 'Volume Key Patterns',
          description: 'Configure volume button sequences',
          type: 'button',
          action: () => navigate('/volume-patterns'),
        },
        {
          label: 'Background Security',
          description: 'Configure auto-lock and monitoring',
          type: 'button',
          action: () => navigate('/security-settings'),
        },
        {
          label: 'Change PIN',
          description: 'Update your vault PIN',
          type: 'button',
          action: () => navigate('/change-pin'),
        },
        {
          label: 'Break-in Logs',
          description: 'View unauthorized access attempts',
          type: 'button',
          action: () => navigate('/breakin-logs'),
        },
      ],
    },
    {
      title: 'Appearance',
      icon: Palette,
      items: [
        {
          label: 'Theme',
          description: `Current: ${theme}`,
          type: 'select',
          value: theme,
          options: [
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'amoled', label: 'AMOLED Black' },
            { value: 'custom', label: 'Custom' },
          ],
          onChange: setTheme,
        },
      ],
    },
    {
      title: 'Rewards & Ads',
      icon: Gift,
      items: [
        {
          label: 'AdMob Configuration',
          description: 'Configure advertising and monetization',
          type: 'button',
          action: () => navigate('/admob-settings'),
          badge: adMobEnabled ? 'Active' : 'Inactive',
          badgeVariant: adMobEnabled ? 'default' : 'secondary'
        },
        {
          label: 'Rewards Center',
          description: 'Earn coins and unlock features',
          type: 'button',
          action: () => navigate('/rewards'),
        },
      ],
    },
    {
      title: 'AI Features',
      icon: Eye,
      items: [
        {
          label: 'AI Configuration',
          description: 'Setup AI services and API keys',
          type: 'button',
          action: () => navigate('/ai-config'),
        },
        {
          label: 'Enhanced AI Features',
          description: 'Advanced AI capabilities',
          type: 'button',
          action: () => navigate('/enhanced-ai'),
        },
      ],
    },
    {
      title: 'Backup & Sync',
      icon: Cloud,
      items: [
        {
          label: 'Backup Manager',
          description: 'Create and restore backups',
          type: 'button',
          action: () => navigate('/backup'),
        },
        {
          label: 'Cloud Sync',
          description: 'Sync with Google Drive',
          type: 'button',
          action: () => navigate('/cloud-sync'),
        },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          label: 'Security Alerts',
          description: 'Get notified of security events',
          type: 'switch',
          value: notifications.securityAlerts,
          onChange: (value: boolean) => handleNotificationToggle('securityAlerts', value),
        },
        {
          label: 'Daily Tips',
          description: 'Receive daily security tips',
          type: 'switch',
          value: notifications.dailyTips,
          onChange: (value: boolean) => handleNotificationToggle('dailyTips', value),
        },
        {
          label: 'Reward Notifications',
          description: 'Get notified about new rewards',
          type: 'switch',
          value: notifications.rewardNotifications,
          onChange: (value: boolean) => handleNotificationToggle('rewardNotifications', value),
        },
      ],
    },
    {
      title: 'About',
      icon: Info,
      items: [
        {
          label: 'App Version',
          description: 'Vaultix v1.0.0',
          type: 'info',
        },
        {
          label: 'Testing Suite',
          description: 'Test app features and functionality',
          type: 'button',
          action: () => navigate('/testing'),
        },
        {
          label: 'Privacy Policy',
          description: 'View our privacy policy',
          type: 'button',
          action: () => console.log('Privacy policy'),
        },
        {
          label: 'Rate App',
          description: 'Rate us in the Play Store',
          type: 'button',
          action: () => console.log('Rate app'),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure security, appearance, and features
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePermissionsRequest}
            className="flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Permissions
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {settingsSections.map((section) => (
          <Card key={section.title} className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <section.icon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            </div>
            
            <div className="space-y-4">
              {section.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{item.label}</p>
                      {item.badge && (
                        <Badge variant={item.badgeVariant as any || 'default'} className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  
                  <div className="ml-4">
                    {item.type === 'switch' && (
                      <Switch
                        checked={item.value as boolean}
                        onCheckedChange={item.onChange}
                        disabled={item.disabled}
                      />
                    )}
                    
                    {item.type === 'button' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={item.action}
                        disabled={item.disabled}
                      >
                        <SettingsIcon className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    )}
                    
                    {item.type === 'select' && (
                      <select
                        value={item.value as string}
                        onChange={(e) => item.onChange?.(e.target.value)}
                        className="bg-background border border-border rounded px-3 py-1 text-foreground"
                      >
                        {item.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        {/* Danger Zone */}
        <Card className="p-4 border-red-500/20">
          <h2 className="text-lg font-semibold text-red-500 mb-4">Danger Zone</h2>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10"
              onClick={() => navigate('/reset-vault')}
            >
              Reset Vault
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10"
              onClick={logout}
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
