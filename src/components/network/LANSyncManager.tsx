
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Wifi, Smartphone, RefreshCw, Play, CheckCircle, AlertCircle, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LANSyncService, DiscoveredDevice, SyncProgress } from '../../services/LANSyncService';

const LANSyncManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [wifiConnected, setWifiConnected] = useState(false);

  useEffect(() => {
    initializeSync();
    const interval = setInterval(refreshDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const initializeSync = async () => {
    try {
      await LANSyncService.getInstance().initialize();
      checkWifiStatus();
      refreshDevices();
    } catch (error) {
      console.error('Failed to initialize LAN sync:', error);
      toast({
        title: "Initialization Failed",
        description: "Failed to start LAN sync service.",
        variant: "destructive",
      });
    }
  };

  const checkWifiStatus = async () => {
    try {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      setWifiConnected(status.connected && status.connectionType === 'wifi');
    } catch (error) {
      console.error('Failed to check network status:', error);
    }
  };

  const refreshDevices = useCallback(async () => {
    if (!wifiConnected) return;
    
    setIsScanning(true);
    try {
      const discoveredDevices = LANSyncService.getInstance().getDiscoveredDevices();
      setDevices(discoveredDevices);
    } catch (error) {
      console.error('Failed to refresh devices:', error);
    } finally {
      setIsScanning(false);
    }
  }, [wifiConnected]);

  const syncWithDevice = async (deviceId: string) => {
    try {
      setSyncProgress({
        stage: 'connecting',
        progress: 0,
        deviceName: devices.find(d => d.id === deviceId)?.name || 'Unknown Device',
        filesTransferred: 0,
        totalFiles: 0
      });

      const success = await LANSyncService.getInstance().syncWithDevice(
        deviceId,
        (progress) => setSyncProgress(progress)
      );

      if (success) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced with ${syncProgress?.deviceName}`,
        });
      } else {
        toast({
          title: "Sync Failed",
          description: "Failed to sync with device. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync Error",
        description: "An error occurred during sync.",
        variant: "destructive",
      });
    } finally {
      setSyncProgress(null);
    }
  };

  const syncWithAllDevices = async () => {
    try {
      await LANSyncService.getInstance().syncWithDevices();
      toast({
        title: "Sync Complete",
        description: "Synced with all available devices.",
      });
      refreshDevices();
    } catch (error) {
      console.error('Bulk sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync with some devices.",
        variant: "destructive",
      });
    }
  };

  const enableHotspot = async () => {
    try {
      const success = await LANSyncService.getInstance().enableHotspot();
      if (success) {
        toast({
          title: "Hotspot Enabled",
          description: "Other devices can now connect to this device.",
        });
      } else {
        toast({
          title: "Hotspot Failed",
          description: "Failed to enable WiFi hotspot.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to enable hotspot:', error);
      toast({
        title: "Error",
        description: "Failed to enable hotspot functionality.",
        variant: "destructive",
      });
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'android':
      case 'ios':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (device: DiscoveredDevice) => {
    if (device.isOnline) {
      return <Badge variant="default" className="bg-green-500">Online</Badge>;
    }
    return <Badge variant="secondary">Offline</Badge>;
  };

  if (!wifiConnected) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate('/settings')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">LAN Sync</h1>
              <p className="text-muted-foreground">Local network synchronization</p>
            </div>
          </div>

          <Card className="text-center">
            <CardContent className="pt-6">
              <WifiOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">WiFi Required</h3>
              <p className="text-muted-foreground mb-4">
                Please connect to a WiFi network to use LAN sync functionality.
              </p>
              <Button onClick={checkWifiStatus}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Connection
              </Button>
            </CardContent>
          </Card>
        </div>
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
            onClick={() => navigate('/settings')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">LAN Sync</h1>
            <p className="text-muted-foreground">Sync with devices on your network</p>
          </div>
          <Button 
            onClick={refreshDevices} 
            disabled={isScanning}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Sync Progress */}
        {syncProgress && (
          <Card>
            <CardHeader>
              <CardTitle>Syncing with {syncProgress.deviceName}</CardTitle>
              <CardDescription>
                {syncProgress.stage === 'connecting' && 'Establishing connection...'}
                {syncProgress.stage === 'syncing' && `Transferring files (${syncProgress.filesTransferred}/${syncProgress.totalFiles})`}
                {syncProgress.stage === 'complete' && 'Sync completed successfully'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={syncProgress.progress} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                {Math.round(syncProgress.progress)}% complete
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={syncWithAllDevices} 
              className="w-full justify-start"
              disabled={devices.length === 0 || !!syncProgress}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Sync with All Devices ({devices.filter(d => d.isOnline).length})
            </Button>
            <Button 
              onClick={enableHotspot} 
              variant="outline" 
              className="w-full justify-start"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Enable WiFi Hotspot
            </Button>
          </CardContent>
        </Card>

        {/* Discovered Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Discovered Devices</span>
              <Badge variant="outline">{devices.length} found</Badge>
            </CardTitle>
            <CardDescription>
              Devices available for synchronization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <div className="text-center py-8">
                <Wifi className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
                <p className="text-muted-foreground">
                  Make sure other Vaultix devices are on the same WiFi network.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getDeviceIcon(device.deviceType)}
                      <div>
                        <h4 className="font-medium">{device.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {device.ip}:{device.port} • v{device.version}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(device)}
                      <Button
                        size="sm"
                        onClick={() => syncWithDevice(device.id)}
                        disabled={!device.isOnline || !!syncProgress}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Sync
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync History */}
        <SyncHistory />
      </div>
    </div>
  );
};

const SyncHistory = () => {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadSyncHistory();
  }, []);

  const loadSyncHistory = async () => {
    try {
      const historyData = await LANSyncService.getInstance().getSyncHistory();
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load sync history:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync History</CardTitle>
        <CardDescription>Recent synchronization activities</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No sync history available
          </p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 5).map((entry, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <p className="font-medium">{entry.deviceName}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.fileCount} files • {new Date(entry.timestamp).toLocaleDateString()}
                  </p>
                </div>
                {entry.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LANSyncManager;
