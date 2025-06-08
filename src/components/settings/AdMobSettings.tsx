import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, DollarSign, Eye, Settings, AlertTriangle, TrendingUp } from 'lucide-react';
import { AdMobService, AdMobConfig, AdRevenue } from '@/services/AdMobService';
import { useToast } from '@/hooks/use-toast';

export default function AdMobSettings() {
  const [config, setConfig] = useState<AdMobConfig>({
    appId: '',
    bannerAdUnitId: '',
    interstitialAdUnitId: '',
    rewardedAdUnitId: '',
    testDeviceIds: [],
    enabled: false
  });
  const [revenue, setRevenue] = useState<AdRevenue>({
    totalRevenue: 0,
    impressions: 0,
    clicks: 0,
    lastUpdated: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [newTestDeviceId, setNewTestDeviceId] = useState('');

  const adMobService = AdMobService.getInstance();
  const { toast } = useToast();

  useEffect(() => {
    loadAdMobData();
  }, []);

  const loadAdMobData = async () => {
    try {
      setIsLoading(true);
      await adMobService.loadConfig();
      const currentConfig = adMobService.getConfig();
      const currentRevenue = await adMobService.getRevenue();
      
      setConfig(currentConfig);
      setRevenue(currentRevenue);
      setIsInitialized(adMobService.isReady());
    } catch (error) {
      console.error('Failed to load AdMob data:', error);
      toast({
        title: "Error",
        description: "Failed to load AdMob settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config.appId) {
      toast({
        title: "Missing App ID",
        description: "Please enter your AdMob App ID",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await adMobService.saveConfig(config);
      
      if (config.enabled) {
        await adMobService.initialize();
        setIsInitialized(true);
      }
      
      toast({
        title: "Settings Saved",
        description: "AdMob configuration has been saved",
      });
    } catch (error) {
      console.error('Failed to save AdMob config:', error);
      toast({
        title: "Error",
        description: "Failed to save AdMob configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testBannerAd = async () => {
    if (!isInitialized) {
      toast({
        title: "Not Initialized",
        description: "Please save and enable AdMob first",
        variant: "destructive",
      });
      return;
    }

    try {
      await adMobService.showBanner();
      toast({
        title: "Banner Ad",
        description: "Banner ad should now be visible",
      });
    } catch (error) {
      console.error('Failed to show banner ad:', error);
      toast({
        title: "Error",
        description: "Failed to show banner ad",
        variant: "destructive",
      });
    }
  };

  const testInterstitialAd = async () => {
    if (!isInitialized) {
      toast({
        title: "Not Initialized",
        description: "Please save and enable AdMob first",
        variant: "destructive",
      });
      return;
    }

    try {
      const shown = await adMobService.showInterstitial();
      if (shown) {
        toast({
          title: "Interstitial Ad",
          description: "Interstitial ad displayed successfully",
        });
      } else {
        toast({
          title: "Ad Not Ready",
          description: "Interstitial ad is not ready yet",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      toast({
        title: "Error",
        description: "Failed to show interstitial ad",
        variant: "destructive",
      });
    }
  };

  const testRewardedAd = async () => {
    if (!isInitialized) {
      toast({
        title: "Not Initialized",
        description: "Please save and enable AdMob first",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await adMobService.showRewardedAd();
      if (result.rewarded) {
        toast({
          title: "Reward Earned!",
          description: `You earned a reward!`,
        });
      } else {
        toast({
          title: "No Reward",
          description: "Rewarded ad was not completed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      toast({
        title: "Error",
        description: "Failed to show rewarded ad",
        variant: "destructive",
      });
    }
  };

  const hideBanner = async () => {
    try {
      await adMobService.hideBanner();
      toast({
        title: "Banner Hidden",
        description: "Banner ad has been hidden",
      });
    } catch (error) {
      console.error('Failed to hide banner:', error);
    }
  };

  const addTestDevice = () => {
    if (!newTestDeviceId) return;
    
    const updatedDevices = [...config.testDeviceIds, newTestDeviceId];
    setConfig(prev => ({ ...prev, testDeviceIds: updatedDevices }));
    setNewTestDeviceId('');
  };

  const removeTestDevice = (index: number) => {
    const updatedDevices = config.testDeviceIds.filter((_, i) => i !== index);
    setConfig(prev => ({ ...prev, testDeviceIds: updatedDevices }));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center">Loading AdMob settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AdMob Configuration</h1>
          <p className="text-muted-foreground">
            Configure monetization and advertising
          </p>
        </div>
        <Badge variant={isInitialized ? "default" : "secondary"}>
          {isInitialized ? "Active" : "Inactive"}
        </Badge>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Basic Configuration
              </CardTitle>
              <CardDescription>
                Enter your AdMob application and ad unit IDs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">App ID</label>
                <Input
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
                  value={config.appId}
                  onChange={(e) => setConfig(prev => ({ ...prev, appId: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Your AdMob application ID from the AdMob console
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Banner Ad Unit ID</label>
                <Input
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                  value={config.bannerAdUnitId}
                  onChange={(e) => setConfig(prev => ({ ...prev, bannerAdUnitId: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Interstitial Ad Unit ID</label>
                <Input
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                  value={config.interstitialAdUnitId}
                  onChange={(e) => setConfig(prev => ({ ...prev, interstitialAdUnitId: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rewarded Ad Unit ID</label>
                <Input
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                  value={config.rewardedAdUnitId}
                  onChange={(e) => setConfig(prev => ({ ...prev, rewardedAdUnitId: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <label className="text-sm font-medium">Enable AdMob</label>
                  <p className="text-xs text-muted-foreground">
                    Activate advertising and monetization
                  </p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Device IDs</CardTitle>
              <CardDescription>
                Add device IDs for testing ads without affecting production metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Test device ID"
                  value={newTestDeviceId}
                  onChange={(e) => setNewTestDeviceId(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addTestDevice} disabled={!newTestDeviceId}>
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {config.testDeviceIds.map((deviceId, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm font-mono">{deviceId}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTestDevice(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              {config.testDeviceIds.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No test devices configured. Add your device ID to test ads safely.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button onClick={saveConfig} disabled={isSaving} className="flex-1">
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Ad Testing
              </CardTitle>
              <CardDescription>
                Test your ad implementations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isInitialized && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    AdMob is not initialized. Save your configuration and enable AdMob first.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={testBannerAd} 
                  disabled={!isInitialized}
                  variant="outline"
                  className="h-24 flex flex-col"
                >
                  <Gift className="h-6 w-6 mb-2" />
                  <span>Show Banner Ad</span>
                </Button>

                <Button 
                  onClick={hideBanner} 
                  disabled={!isInitialized}
                  variant="outline"
                  className="h-24 flex flex-col"
                >
                  <Eye className="h-6 w-6 mb-2" />
                  <span>Hide Banner Ad</span>
                </Button>

                <Button 
                  onClick={testInterstitialAd} 
                  disabled={!isInitialized}
                  variant="outline"
                  className="h-24 flex flex-col"
                >
                  <Settings className="h-6 w-6 mb-2" />
                  <span>Show Interstitial</span>
                </Button>

                <Button 
                  onClick={testRewardedAd} 
                  disabled={!isInitialized}
                  variant="outline"
                  className="h-24 flex flex-col"
                >
                  <DollarSign className="h-6 w-6 mb-2" />
                  <span>Show Rewarded Ad</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue Overview
              </CardTitle>
              <CardDescription>
                Track your advertising performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    ${revenue.totalRevenue.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
                
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {revenue.impressions}
                  </div>
                  <p className="text-sm text-muted-foreground">Impressions</p>
                </div>
                
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {revenue.clicks}
                  </div>
                  <p className="text-sm text-muted-foreground">Clicks</p>
                </div>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                Last updated: {new Date(revenue.lastUpdated).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
