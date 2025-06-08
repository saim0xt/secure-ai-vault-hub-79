import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useVault } from '@/contexts/VaultContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Folder,
  Image,
  Video,
  Camera,
  Search,
  Settings,
  Shield,
  Upload,
  Star,
  Clock,
  BarChart3,
  Lock,
  Mic
} from 'lucide-react';

const VaultDashboard = () => {
  const navigate = useNavigate();
  const { files, folders, getStorageUsage, loading } = useVault();
  const { logout, fakeVaultMode } = useAuth();
  const { theme } = useTheme();
  const [recentFiles, setRecentFiles] = useState(files.slice(0, 6));
  const [storageInfo, setStorageInfo] = useState({
    used: 0,
    total: 0,
    available: 0,
    percentage: 0,
    formattedUsed: '0 Bytes',
    formattedTotal: '0 Bytes',
    formattedAvailable: '0 Bytes'
  });

  useEffect(() => {
    setRecentFiles(files.slice(0, 6));
    
    // Load storage information
    const loadStorageInfo = async () => {
      try {
        const storage = await getStorageUsage();
        setStorageInfo(storage);
      } catch (error) {
        console.error('Error loading storage info:', error);
      }
    };
    
    loadStorageInfo();
    
    // Initialize shake detection
    const initShakeDetection = async () => {
      try {
        const { DeviceMotionService } = await import('@/services/DeviceMotionService');
        await DeviceMotionService.startShakeDetection(() => {
          // Lock vault on shake
          logout();
        });
      } catch (error) {
        console.log('Shake detection not available:', error);
      }
    };
    
    initShakeDetection();
    
    return () => {
      import('@/services/DeviceMotionService').then(({ DeviceMotionService }) => {
        DeviceMotionService.stopShakeDetection();
      });
    };
  }, [files, logout, getStorageUsage]);

  const quickStats = [
    {
      label: 'Total Files',
      value: files.length,
      icon: Folder,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Folders',
      value: folders.length,
      icon: Folder,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      label: 'Images',
      value: files.filter(f => f.type === 'image').length,
      icon: Image,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: 'Videos',
      value: files.filter(f => f.type === 'video').length,
      icon: Video,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
  ];

  const quickActions = [
    {
      label: 'Browse Files',
      description: 'View and manage your secure files',
      icon: Folder,
      action: () => navigate('/files'),
      color: 'from-blue-500 to-purple-600'
    },
    {
      label: 'Secure Camera',
      description: 'Take photos directly to vault',
      icon: Camera,
      action: () => navigate('/camera'),
      color: 'from-green-500 to-blue-600'
    },
    {
      label: 'Voice Recorder',
      description: 'Record voice notes securely',
      icon: Mic,
      action: () => navigate('/voice-recorder'),
      color: 'from-purple-500 to-pink-600'
    },
    {
      label: 'Rewards Center',
      description: 'Earn coins and unlock features',
      icon: Star,
      action: () => navigate('/rewards'),
      color: 'from-yellow-500 to-orange-600'
    },
    {
      label: 'AI Features',
      description: 'Smart organization and diary',
      icon: BarChart3,
      action: () => navigate('/ai-features'),
      color: 'from-orange-500 to-red-600'
    },
  ];

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // Implementation would handle file import
      console.log('Importing files:', files);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {fakeVaultMode ? "Calculator" : "Vaultix"}
              </h1>
              <p className="text-sm text-muted-foreground">Secure Vault</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/rewards')}
              className="relative"
            >
              <Star className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
            >
              <Lock className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Storage Usage */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Storage Usage</h3>
            <Badge variant="outline">
              {storageInfo.formattedUsed} / {storageInfo.formattedTotal}
            </Badge>
          </div>
          <Progress value={storageInfo.percentage} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {storageInfo.percentage.toFixed(1)}% used
          </p>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-primary/20"
                  onClick={action.action}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.color} flex items-center justify-center`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{action.label}</h4>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Files */}
        {recentFiles.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Recent Files</h3>
              <Button variant="ghost" onClick={() => navigate('/files')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recentFiles.map((file) => (
                <Card key={file.id} className="p-3 cursor-pointer hover:shadow-lg transition-all">
                  <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                    {file.type === 'image' ? (
                      <Image className="w-8 h-8 text-muted-foreground" />
                    ) : file.type === 'video' ? (
                      <Video className="w-8 h-8 text-muted-foreground" />
                    ) : (
                      <Folder className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(file.dateAdded).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          id="file-input"
          type="file"
          multiple
          accept="*/*"
          onChange={handleFileImport}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default VaultDashboard;
