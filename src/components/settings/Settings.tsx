import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSecurity } from '@/contexts/SecurityContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Shield, Palette, Bell, Cloud, Info, Gift } from 'lucide-react';

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
    setStealthMode
  } = useSecurity();

  const [adSettings, setAdSettings] = useState({
    bannerAds: true,
    rewardedAds: true,
    interstitialAds: true
  });

  const settingsSections = [
    {
      title: 'Security',
      icon: Shield,
      items: [
        {
          label: 'Biometric Authentication',
          description: 'Use fingerprint or face unlock',
          type: 'switch',
          value: biometricEnabled,
          onChange: setBiometricEnabled,
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
          action: () => console.log('Change PIN'),
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
          label: 'Rewards Center',
          description: 'Earn coins and unlock features',
          type: 'button',
          action: () => navigate('/rewards'),
        },
        {
          label: 'Banner Ads',
          description: 'Show banner advertisements',
          type: 'switch',
          value: adSettings.bannerAds,
          onChange: (value: boolean) => setAdSettings(prev => ({ ...prev, bannerAds: value })),
        },
        {
          label: 'Rewarded Ads',
          description: 'Watch ads to earn coins',
          type: 'switch',
          value: adSettings.rewardedAds,
          onChange: (value: boolean) => setAdSettings(prev => ({ ...prev, rewardedAds: value })),
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
          action: () => console.log('Cloud sync'),
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
          value: true,
          onChange: () => console.log('Toggle security alerts'),
        },
        {
          label: 'Daily Tips',
          description: 'Receive daily security tips',
          type: 'switch',
          value: true,
          onChange: () => console.log('Toggle daily tips'),
        },
        {
          label: 'Reward Notifications',
          description: 'Get notified about new rewards',
          type: 'switch',
          value: true,
          onChange: () => console.log('Toggle reward notifications'),
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
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
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
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  
                  <div className="ml-4">
                    {item.type === 'switch' && (
                      <Switch
                        checked={item.value as boolean}
                        onCheckedChange={item.onChange}
                      />
                    )}
                    
                    {item.type === 'button' && (
                      <Button variant="outline" size="sm" onClick={item.action}>
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
              onClick={() => console.log('Reset vault')}
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
