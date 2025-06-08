import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Upload, Cloud, HardDrive, Shield, Calendar, Wifi, Smartphone } from 'lucide-react';
import { EnhancedBackupService, BackupMetadata, RestoreProgress } from '@/services/EnhancedBackupService';
import { GoogleDriveService } from '@/services/GoogleDriveService';
import { LANSyncService, DiscoveredDevice } from '@/services/LANSyncService';

const BackupManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupHistory, setBackupHistory] = useState<BackupMetadata[]>([]);
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null);
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [lanDevices, setLanDevices] = useState<DiscoveredDevice[]>([]);

  const backupService = EnhancedBackupService.getInstance();
  const googleDriveService = GoogleDriveService.getInstance();
  const lanSyncService = LANSyncService.getInstance();

  useEffect(() => {
    loadBackupData();
    initializeServices();
  }, []);

  const loadBackupData = async () => {
    try {
      const history = await backupService.getBackupHistory();
      setBackupHistory(history);
    } catch (error) {
      console.error('Failed to load backup history:', error);
    }
  };

  const initializeServices = async () => {
    try {
      // Check Google Drive connection
      const hasTokens = await googleDriveService.loadStoredTokens();
      setIsGoogleDriveConnected(hasTokens);

      // Initialize LAN sync
      await lanSyncService.initialize();
      const devices = lanSyncService.getDiscoveredDevices();
      setLanDevices(devices);
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  };

  const handleLocalBackup = async () => {
    if (!backupPassword) {
      toast({
        title: "Password Required",
        description: "Please enter a password to encrypt your backup",
        variant: "destructive",
      });
      return;
    }

    setIsBackingUp(true);
    setBackupProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setBackupProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const metadata = await backupService.createFullBackup(backupPassword, true);
      
      clearInterval(progressInterval);
      setBackupProgress(100);

      toast({
        title: "Backup Complete",
        description: `Backup created with ${metadata.fileCount} files`,
      });

      await loadBackupData();
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
      setBackupProgress(0);
    }
  };

  const handleCloudBackup = async () => {
    if (!backupPassword) {
      toast({
        title: "Password Required",
        description: "Please enter a password to encrypt your backup",
        variant: "destructive",
      });
      return;
    }

    if (!isGoogleDriveConnected) {
      const connected = await googleDriveService.authenticate();
      if (!connected) {
        toast({
          title: "Authentication Failed",
          description: "Could not connect to Google Drive",
          variant: "destructive",
        });
        return;
      }
      setIsGoogleDriveConnected(true);
    }

    setIsBackingUp(true);
    
    try {
      const metadata = await backupService.createCloudBackup(backupPassword);
      
      toast({
        title: "Cloud Backup Complete",
        description: `Backup uploaded with ${metadata.fileCount} files`,
      });

      await loadBackupData();
    } catch (error) {
      toast({
        title: "Cloud Backup Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (backup: BackupMetadata) => {
    if (!backupPassword) {
      toast({
        title: "Password Required",
        description: "Please enter the backup password",
        variant: "destructive",
      });
      return;
    }

    setIsRestoring(true);
    setRestoreProgress({ stage: 'preparing', progress: 0 });

    try {
      await backupService.restoreBackup(backup.id, backupPassword, setRestoreProgress);
      
      toast({
        title: "Restore Complete",
        description: "Your vault has been restored successfully",
      });
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
      setRestoreProgress(null);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      await backupService.deleteBackup(backupId);
      await loadBackupData();
      
      toast({
        title: "Backup Deleted",
        description: "Backup has been removed successfully",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const backupMethods = [
    {
      title: 'Local Backup',
      description: 'Save encrypted backup to device storage',
      icon: HardDrive,
      color: 'from-blue-500 to-purple-600',
      action: handleLocalBackup,
    },
    {
      title: 'Cloud Backup',
      description: isGoogleDriveConnected ? 'Backup to Google Drive' : 'Connect to Google Drive',
      icon: Cloud,
      color: 'from-green-500 to-blue-600',
      action: handleCloudBackup,
    },
    {
      title: 'LAN Sync',
      description: `Sync with ${lanDevices.length} devices`,
      icon: Wifi,
      color: 'from-purple-500 to-pink-600',
      action: () => lanSyncService.syncWithDevices(),
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
            onClick={() => navigate('/settings')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Enhanced Backup Manager</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Backup Password */}
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-3">Backup Encryption</h3>
          <Input
            type="password"
            placeholder="Enter backup password"
            value={backupPassword}
            onChange={(e) => setBackupPassword(e.target.value)}
            className="mb-2"
          />
          <p className="text-xs text-muted-foreground">
            This password encrypts your backup with AES-256. Keep it safe - you'll need it to restore.
          </p>
        </Card>

        {/* Backup/Restore Progress */}
        {(isBackingUp || isRestoring || restoreProgress) && (
          <Card className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <h3 className="font-semibold text-foreground">
                {isBackingUp ? 'Creating Backup...' : 'Restoring Backup...'}
              </h3>
            </div>
            <Progress value={isBackingUp ? backupProgress : restoreProgress?.progress || 0} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              {isBackingUp 
                ? `${backupProgress}% complete` 
                : `${restoreProgress?.stage}: ${restoreProgress?.progress || 0}% complete`
              }
            </p>
            {restoreProgress?.currentFile && (
              <p className="text-xs text-muted-foreground mt-1">
                Processing: {restoreProgress.currentFile}
              </p>
            )}
          </Card>
        )}

        {/* Backup Methods */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Backup Methods</h3>
          <div className="grid gap-4">
            {backupMethods.map((method) => (
              <Card 
                key={method.title}
                className="p-4 cursor-pointer hover:shadow-lg transition-all"
                onClick={method.action}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${method.color} flex items-center justify-center`}>
                    <method.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{method.title}</h4>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    {method.title === 'LAN Sync' ? 'Sync' : 'Backup'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* LAN Devices */}
        {lanDevices.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Discovered Devices</h3>
            <div className="space-y-3">
              {lanDevices.map((device) => (
                <Card key={device.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{device.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {device.ip}:{device.port} • {device.deviceType}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Sync
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Backups */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Backup History</h3>
          {backupHistory.length === 0 ? (
            <Card className="p-8 text-center">
              <Download className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground mb-2">No Backups Found</h4>
              <p className="text-muted-foreground">Create your first backup to secure your vault data</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {backupHistory.map((backup) => (
                <Card key={backup.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        {backup.type === 'cloud' ? (
                          <Cloud className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <HardDrive className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {backup.type === 'cloud' ? 'Cloud' : 'Local'} Backup
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(backup.timestamp).toLocaleDateString()}</span>
                          </span>
                          <span>{(backup.totalSize / (1024 * 1024)).toFixed(1)} MB</span>
                          <span>{backup.fileCount} files</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRestore(backup)}
                        disabled={isRestoring}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteBackup(backup.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupManager;
