
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Upload, Cloud, HardDrive, Shield, Calendar } from 'lucide-react';

const BackupManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');

  const backupMethods = [
    {
      title: 'Local Backup',
      description: 'Save encrypted backup to device storage',
      icon: HardDrive,
      color: 'from-blue-500 to-purple-600',
      action: () => handleLocalBackup(),
    },
    {
      title: 'Cloud Backup',
      description: 'Secure backup to Google Drive',
      icon: Cloud,
      color: 'from-green-500 to-blue-600',
      action: () => handleCloudBackup(),
    },
  ];

  const recentBackups = [
    {
      date: '2024-01-15',
      type: 'Local',
      size: '45.2 MB',
      files: 127,
    },
    {
      date: '2024-01-10',
      type: 'Cloud',
      size: '43.8 MB',
      files: 125,
    },
  ];

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

    // Simulate backup progress
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBackingUp(false);
          toast({
            title: "Backup Complete",
            description: "Your vault has been backed up successfully",
          });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleCloudBackup = () => {
    toast({
      title: "Cloud Backup",
      description: "Google Drive integration would be implemented here",
    });
  };

  const handleRestore = (backup: any) => {
    toast({
      title: "Restore Backup",
      description: `Restoring backup from ${backup.date}...`,
    });
  };

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
            <h1 className="text-xl font-bold text-foreground">Backup Manager</h1>
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
            This password will encrypt your backup. Keep it safe - you'll need it to restore.
          </p>
        </Card>

        {/* Backup Progress */}
        {isBackingUp && (
          <Card className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <h3 className="font-semibold text-foreground">Creating Backup...</h3>
            </div>
            <Progress value={backupProgress} className="mb-2" />
            <p className="text-sm text-muted-foreground">{backupProgress}% complete</p>
          </Card>
        )}

        {/* Backup Methods */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Create Backup</h3>
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
                    Backup
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Backups */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Backups</h3>
          {recentBackups.length === 0 ? (
            <Card className="p-8 text-center">
              <Download className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground mb-2">No Backups Found</h4>
              <p className="text-muted-foreground">Create your first backup to secure your vault data</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentBackups.map((backup, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        {backup.type === 'Cloud' ? (
                          <Cloud className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <HardDrive className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {backup.type} Backup
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{backup.date}</span>
                          </span>
                          <span>{backup.size}</span>
                          <span>{backup.files} files</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRestore(backup)}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Restore
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Backup Settings */}
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-3">Backup Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Auto Backup</p>
                <p className="text-sm text-muted-foreground">Automatically backup daily</p>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Backup Retention</p>
                <p className="text-sm text-muted-foreground">Keep last 5 backups</p>
              </div>
              <Button variant="outline" size="sm">
                Change
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BackupManager;
