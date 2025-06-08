
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Camera, AlertTriangle, Eye, Lock, Unlock } from 'lucide-react';
import { RealNativeSecurityService } from '@/services/RealNativeSecurityService';
import { RealNativeNotificationService } from '@/services/RealNativeNotificationService';

interface SecurityStatus {
  screenshotPrevention: boolean;
  realTimeMonitoring: boolean;
  appHiding: boolean;
  secureMode: boolean;
  tamperDetection: {
    active: boolean;
    threatsDetected: number;
    lastCheck: string;
  };
}

const SecurityDashboard = () => {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    screenshotPrevention: false,
    realTimeMonitoring: false,
    appHiding: false,
    secureMode: false,
    tamperDetection: {
      active: false,
      threatsDetected: 0,
      lastCheck: 'Never'
    }
  });
  const [loading, setLoading] = useState(false);

  const securityService = RealNativeSecurityService.getInstance();
  const notificationService = RealNativeNotificationService.getInstance();

  useEffect(() => {
    loadSecurityStatus();
    const interval = setInterval(loadSecurityStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityStatus = async () => {
    try {
      const tamperResult = await securityService.detectTamperAttempts();
      
      setSecurityStatus(prev => ({
        ...prev,
        tamperDetection: {
          active: true,
          threatsDetected: tamperResult.tampering ? prev.tamperDetection.threatsDetected + 1 : prev.tamperDetection.threatsDetected,
          lastCheck: new Date().toLocaleTimeString()
        }
      }));

      if (tamperResult.tampering) {
        await notificationService.showSecurityAlert(
          'Security Threat Detected',
          'Tampering attempt detected on your device',
          'tamper_detected'
        );
      }
    } catch (error) {
      console.error('Failed to load security status:', error);
    }
  };

  const toggleScreenshotPrevention = async () => {
    setLoading(true);
    try {
      const success = securityStatus.screenshotPrevention
        ? await securityService.disableScreenshotPrevention()
        : await securityService.enableScreenshotPrevention();

      if (success) {
        setSecurityStatus(prev => ({
          ...prev,
          screenshotPrevention: !prev.screenshotPrevention
        }));

        await notificationService.showSecurityAlert(
          'Screenshot Prevention',
          `Screenshot prevention ${securityStatus.screenshotPrevention ? 'disabled' : 'enabled'}`,
          'security_update'
        );
      }
    } catch (error) {
      console.error('Failed to toggle screenshot prevention:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRealTimeMonitoring = async () => {
    setLoading(true);
    try {
      const success = securityStatus.realTimeMonitoring
        ? await securityService.stopRealTimeMonitoring()
        : await securityService.startRealTimeMonitoring();

      if (success) {
        setSecurityStatus(prev => ({
          ...prev,
          realTimeMonitoring: !prev.realTimeMonitoring
        }));

        await notificationService.showSecurityAlert(
          'Real-time Monitoring',
          `Real-time monitoring ${securityStatus.realTimeMonitoring ? 'stopped' : 'started'}`,
          'monitoring_update'
        );
      }
    } catch (error) {
      console.error('Failed to toggle real-time monitoring:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAppHiding = async () => {
    setLoading(true);
    try {
      const success = securityStatus.appHiding
        ? await securityService.disableAppHiding()
        : await securityService.enableAppHiding(true);

      if (success) {
        setSecurityStatus(prev => ({
          ...prev,
          appHiding: !prev.appHiding
        }));

        await notificationService.showSecurityAlert(
          'App Disguise',
          `App disguise ${securityStatus.appHiding ? 'disabled' : 'enabled'}. ${!securityStatus.appHiding ? 'App will appear as Calculator.' : ''}`,
          'disguise_update'
        );
      }
    } catch (error) {
      console.error('Failed to toggle app hiding:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSecureMode = async () => {
    setLoading(true);
    try {
      const success = securityStatus.secureMode
        ? await securityService.disableSecureMode()
        : await securityService.enableSecureMode();

      if (success) {
        setSecurityStatus(prev => ({
          ...prev,
          secureMode: !prev.secureMode
        }));

        await notificationService.showSecurityAlert(
          'Secure Mode',
          `Secure mode ${securityStatus.secureMode ? 'disabled' : 'enabled'}`,
          'secure_mode_update'
        );
      }
    } catch (error) {
      console.error('Failed to toggle secure mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const captureIntruderPhoto = async () => {
    setLoading(true);
    try {
      const photoPath = await securityService.captureIntruderPhoto();
      if (photoPath) {
        await notificationService.showSecurityAlert(
          'Intruder Photo Captured',
          'Security photo has been taken and stored securely',
          'photo_captured'
        );
      }
    } catch (error) {
      console.error('Failed to capture intruder photo:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Security Dashboard</h2>
        <Badge variant={securityStatus.secureMode ? "default" : "secondary"}>
          <Shield className="w-4 h-4 mr-1" />
          {securityStatus.secureMode ? 'Secure' : 'Standard'}
        </Badge>
      </div>

      {/* Tamper Detection Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Tamper Detection</h3>
            <p className="text-sm text-muted-foreground">
              Last Check: {securityStatus.tamperDetection.lastCheck}
            </p>
            <p className="text-sm text-muted-foreground">
              Threats Detected: {securityStatus.tamperDetection.threatsDetected}
            </p>
          </div>
          <div className="flex items-center">
            {securityStatus.tamperDetection.threatsDetected > 0 && (
              <AlertTriangle className="w-6 h-6 text-destructive mr-2" />
            )}
            <Badge variant={securityStatus.tamperDetection.active ? "default" : "secondary"}>
              {securityStatus.tamperDetection.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Security Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Screenshot Prevention</h3>
              <p className="text-sm text-muted-foreground">Prevent screenshots and screen recording</p>
            </div>
            <Button
              onClick={toggleScreenshotPrevention}
              disabled={loading}
              variant={securityStatus.screenshotPrevention ? "default" : "outline"}
            >
              {securityStatus.screenshotPrevention ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Real-time Monitoring</h3>
              <p className="text-sm text-muted-foreground">Monitor for security threats</p>
            </div>
            <Button
              onClick={toggleRealTimeMonitoring}
              disabled={loading}
              variant={securityStatus.realTimeMonitoring ? "default" : "outline"}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">App Disguise</h3>
              <p className="text-sm text-muted-foreground">Hide app as calculator</p>
            </div>
            <Button
              onClick={toggleAppHiding}
              disabled={loading}
              variant={securityStatus.appHiding ? "default" : "outline"}
            >
              {securityStatus.appHiding ? 'Hidden' : 'Visible'}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Secure Mode</h3>
              <p className="text-sm text-muted-foreground">Enable all security features</p>
            </div>
            <Button
              onClick={toggleSecureMode}
              disabled={loading}
              variant={securityStatus.secureMode ? "default" : "outline"}
            >
              <Shield className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="flex gap-2">
          <Button
            onClick={captureIntruderPhoto}
            disabled={loading}
            variant="outline"
          >
            <Camera className="w-4 h-4 mr-2" />
            Capture Intruder Photo
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SecurityDashboard;
