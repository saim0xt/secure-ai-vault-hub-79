
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, Smartphone, Lock, Wifi } from 'lucide-react';
import { RealNativeSecurityService } from '@/services/RealNativeSecurityService';
import { PushNotificationService } from '@/services/PushNotificationService';
import { useToast } from '@/hooks/use-toast';

export default function SecurityDashboard() {
  const [scanResults, setScanResults] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const { toast } = useToast();

  const nativeSecurityService = RealNativeSecurityService.getInstance();
  const pushService = PushNotificationService.getInstance();

  useEffect(() => {
    initializeServices();
    performInitialScan();
  }, []);

  const initializeServices = async () => {
    try {
      await nativeSecurityService.initialize();
      await pushService.initialize();
    } catch (error) {
      console.error('Failed to initialize security services:', error);
    }
  };

  const performInitialScan = async () => {
    await performSecurityScan();
  };

  const performSecurityScan = async () => {
    setIsScanning(true);
    try {
      const results = await nativeSecurityService.performComprehensiveSecurityScan();
      setScanResults(results);
      setThreatLevel(results.overallThreatLevel);

      if (results.overallThreatLevel === 'high' || results.overallThreatLevel === 'critical') {
        await pushService.sendSecurityAlert(
          'Security Threat Detected',
          `Your device has a ${results.overallThreatLevel} threat level. Please review security settings.`,
          'tamper',
          results.overallThreatLevel
        );
      }

      toast({
        title: "Security scan complete",
        description: `Threat level: ${results.overallThreatLevel.toUpperCase()}`,
        variant: results.overallThreatLevel === 'low' ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Security scan failed:', error);
      toast({
        title: "Security scan failed",
        description: "Unable to complete comprehensive security analysis",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const enableAdvancedProtection = async () => {
    try {
      await nativeSecurityService.enableAdvancedProtection();
      toast({
        title: "Advanced protection enabled",
        description: "Enhanced security features are now active"
      });
      await performSecurityScan(); // Re-scan after enabling protection
    } catch (error) {
      console.error('Failed to enable advanced protection:', error);
      toast({
        title: "Failed to enable protection",
        description: "Unable to activate advanced security features",
        variant: "destructive"
      });
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getThreatLevelProgress = (level: string) => {
    switch (level) {
      case 'low': return 25;
      case 'medium': return 50;
      case 'high': return 75;
      case 'critical': return 100;
      default: return 0;
    }
  };

  const getSecurityScoreIcon = (isSecure: boolean) => {
    return isSecure ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  if (!scanResults) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Initializing security dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive device security analysis
          </p>
        </div>
        <Button 
          onClick={performSecurityScan}
          disabled={isScanning}
          variant="outline"
        >
          <Shield className="h-4 w-4 mr-2" />
          {isScanning ? 'Scanning...' : 'Rescan'}
        </Button>
      </div>

      {/* Threat Level Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Overall Threat Level
          </CardTitle>
          <CardDescription>
            Comprehensive security assessment of your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-2xl font-bold ${getThreatLevelColor(threatLevel)}`}>
                {threatLevel.toUpperCase()}
              </div>
              <p className="text-sm text-muted-foreground">Security Status</p>
            </div>
            <Badge 
              variant={threatLevel === 'low' ? "default" : "destructive"}
              className="text-lg px-4 py-2"
            >
              {threatLevel === 'low' ? 'Secure' : 'At Risk'}
            </Badge>
          </div>
          <Progress 
            value={getThreatLevelProgress(threatLevel)} 
            className="w-full"
          />
          {threatLevel !== 'low' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Security vulnerabilities detected. Review the detailed analysis below and take recommended actions.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Security Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Root Detection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Root Detection
              </div>
              {getSecurityScoreIcon(!scanResults.rootDetection.isRooted)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                Status: {scanResults.rootDetection.isRooted ? 'Rooted' : 'Not Rooted'}
              </p>
              <p className="text-sm text-muted-foreground">
                Confidence: {Math.round(scanResults.rootDetection.confidence * 100)}%
              </p>
              {scanResults.rootDetection.isRooted && (
                <Badge variant="destructive" className="text-xs">
                  Security Risk
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emulator Detection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Emulator Detection
              </div>
              {getSecurityScoreIcon(!scanResults.emulatorDetection.isEmulator)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                Status: {scanResults.emulatorDetection.isEmulator ? 'Emulator' : 'Real Device'}
              </p>
              <p className="text-sm text-muted-foreground">
                Confidence: {Math.round(scanResults.emulatorDetection.confidence * 100)}%
              </p>
              {scanResults.emulatorDetection.isEmulator && (
                <Badge variant="destructive" className="text-xs">
                  Virtual Environment
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Debugging Detection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Debug Detection
              </div>
              {getSecurityScoreIcon(!scanResults.debuggingDetection.isDebugging)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                Debug Mode: {scanResults.debuggingDetection.isDebugging ? 'Active' : 'Inactive'}
              </p>
              <p className="text-sm">
                Debug Build: {scanResults.debuggingDetection.isDebugBuild ? 'Yes' : 'No'}
              </p>
              {scanResults.debuggingDetection.isDebugging && (
                <Badge variant="destructive" className="text-xs">
                  Debug Active
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* App Integrity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                App Integrity
              </div>
              {getSecurityScoreIcon(scanResults.appIntegrity.signatureValid)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                Signature: {scanResults.appIntegrity.signatureValid ? 'Valid' : 'Invalid'}
              </p>
              <p className="text-sm">
                Installer: {scanResults.appIntegrity.installerValid ? 'Trusted' : 'Unknown'}
              </p>
              {!scanResults.appIntegrity.signatureValid && (
                <Badge variant="destructive" className="text-xs">
                  Integrity Compromised
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Network Security */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Network Security
              </div>
              {getSecurityScoreIcon(!scanResults.networkSecurity.isProxyDetected)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                VPN: {scanResults.networkSecurity.isVpnActive ? 'Active' : 'Inactive'}
              </p>
              <p className="text-sm">
                Proxy: {scanResults.networkSecurity.isProxyDetected ? 'Detected' : 'None'}
              </p>
              <p className="text-sm">
                Type: {scanResults.networkSecurity.networkType}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hooking Detection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Hooking Detection
              </div>
              {getSecurityScoreIcon(!scanResults.hookingDetection.xposedDetected && !scanResults.hookingDetection.friddaDetected)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                Xposed: {scanResults.hookingDetection.xposedDetected ? 'Detected' : 'None'}
              </p>
              <p className="text-sm">
                Frida: {scanResults.hookingDetection.friddaDetected ? 'Detected' : 'None'}
              </p>
              {(scanResults.hookingDetection.xposedDetected || scanResults.hookingDetection.friddaDetected) && (
                <Badge variant="destructive" className="text-xs">
                  Hooking Detected
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button 
          onClick={enableAdvancedProtection}
          variant="default"
          className="flex-1"
        >
          <Shield className="h-4 w-4 mr-2" />
          Enable Advanced Protection
        </Button>
        <Button 
          onClick={() => window.location.hash = '/permissions'}
          variant="outline"
          className="flex-1"
        >
          <Lock className="h-4 w-4 mr-2" />
          Manage Permissions
        </Button>
      </div>
    </div>
  );
}
