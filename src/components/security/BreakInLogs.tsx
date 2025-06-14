
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, AlertTriangle, MapPin, Calendar, Camera } from 'lucide-react';

interface BreakInLog {
  timestamp: string;
  type: 'failed_pin' | 'failed_biometric' | 'multiple_attempts';
  deviceInfo: string;
  location?: string;
  photoPath?: string;
  ipAddress?: string;
}

const BreakInLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<BreakInLog[]>([]);

  useEffect(() => {
    loadBreakInLogs();
  }, []);

  const loadBreakInLogs = async () => {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_breakin_logs' });
      if (value) {
        setLogs(JSON.parse(value));
      }
    } catch (error) {
      console.error('Error loading break-in logs:', error);
    }
  };

  const clearLogs = async () => {
    try {
      await Preferences.remove({ key: 'vaultix_breakin_logs' });
      setLogs([]);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  const getLogTypeLabel = (type: string) => {
    switch (type) {
      case 'failed_pin':
        return 'Failed PIN';
      case 'failed_biometric':
        return 'Failed Biometric';
      case 'multiple_attempts':
        return 'Multiple Attempts';
      default:
        return 'Unknown';
    }
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'failed_pin':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'failed_biometric':
        return 'bg-orange-500/20 text-orange-500';
      case 'multiple_attempts':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-red-500" />
              <h1 className="text-xl font-bold text-foreground">Break-in Logs</h1>
            </div>
          </div>
          {logs.length > 0 && (
            <Button variant="outline" onClick={clearLogs}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        {logs.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Break-in Attempts
            </h3>
            <p className="text-muted-foreground">
              Your vault is secure. No unauthorized access attempts detected.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {logs.length} unauthorized attempt{logs.length > 1 ? 's' : ''} detected
              </p>
              <Badge variant="destructive" className="flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Security Alert</span>
              </Badge>
            </div>

            {logs.map((log, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getLogTypeColor(log.type)}>
                      {getLogTypeLabel(log.type)}
                    </Badge>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Device:</span> {log.deviceInfo}
                    </div>

                    {log.location && (
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>Location: {log.location}</span>
                      </div>
                    )}

                    {log.ipAddress && (
                      <div className="text-sm">
                        <span className="font-medium">IP Address:</span> {log.ipAddress}
                      </div>
                    )}

                    {log.photoPath && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Camera className="w-4 h-4 text-muted-foreground" />
                        <span>Photo captured</span>
                        <Button variant="outline" size="sm">
                          View Photo
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BreakInLogs;
