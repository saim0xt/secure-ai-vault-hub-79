import React, { useEffect, useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { AndroidPermissionsService } from '@/services/AndroidPermissionsService';
import { useToast } from '@/hooks/use-toast';

interface BreakInAttempt {
  id: string;
  timestamp: string;
  type: 'failed_pin' | 'failed_biometric' | 'multiple_attempts' | 'tamper_detected';
  photoData?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  deviceInfo: {
    platform: string;
    model: string;
    osVersion: string;
    manufacturer: string;
  };
  ipAddress?: string;
  networkInfo?: {
    type: string;
    isConnected: boolean;
  };
}

export class RealIntruderDetection {
  private static permissionsService = AndroidPermissionsService.getInstance();
  private static failedAttempts = 0;
  private static maxAttempts = 5;

  static async initialize(): Promise<void> {
    try {
      // Ensure we have necessary permissions
      await this.requestRequiredPermissions();
      console.log('Intruder detection initialized');
    } catch (error) {
      console.error('Failed to initialize intruder detection:', error);
    }
  }

  private static async requestRequiredPermissions(): Promise<void> {
    const permissions = await Promise.all([
      this.permissionsService.requestCameraPermission(),
      this.permissionsService.requestLocationPermission()
    ]);

    if (!permissions[0]) {
      console.warn('Camera permission denied - photos will not be captured');
    }
    if (!permissions[1]) {
      console.warn('Location permission denied - location will not be recorded');
    }
  }

  static async recordFailedAttempt(type: BreakInAttempt['type'], additionalData?: any): Promise<void> {
    this.failedAttempts++;
    
    try {
      const [photoData, location, deviceInfo, networkInfo] = await Promise.all([
        this.captureIntruderPhoto(),
        this.getCurrentLocation(),
        this.getDeviceInfo(),
        this.getNetworkInfo()
      ]);

      const attempt: BreakInAttempt = {
        id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type,
        photoData: photoData || undefined,
        location: location || undefined,
        deviceInfo,
        networkInfo,
        ...additionalData
      };

      await this.storeBreakInAttempt(attempt);
      
      // Trigger additional security measures if threshold exceeded
      if (this.failedAttempts >= this.maxAttempts) {
        await this.triggerSecurityLockdown();
      }

      console.log('Break-in attempt recorded:', attempt);
    } catch (error) {
      console.error('Failed to record break-in attempt:', error);
    }
  }

  private static async captureIntruderPhoto(): Promise<string | null> {
    try {
      // Check camera permission first
      const hasPermission = await this.permissionsService.requestCameraPermission();
      if (!hasPermission) {
        console.warn('Camera permission denied');
        return null;
      }

      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
        width: 640,
        height: 480
      });

      return image.dataUrl || null;
    } catch (error) {
      console.error('Failed to capture intruder photo:', error);
      return null;
    }
  }

  private static async getCurrentLocation(): Promise<BreakInAttempt['location'] | null> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
    } catch (error) {
      console.error('Failed to get location:', error);
      return null;
    }
  }

  private static async getDeviceInfo(): Promise<BreakInAttempt['deviceInfo']> {
    try {
      const info = await Device.getInfo();
      return {
        platform: info.platform,
        model: info.model,
        osVersion: info.osVersion,
        manufacturer: info.manufacturer
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      return {
        platform: 'unknown',
        model: 'unknown',
        osVersion: 'unknown',
        manufacturer: 'unknown'
      };
    }
  }

  private static async getNetworkInfo(): Promise<BreakInAttempt['networkInfo'] | null> {
    try {
      // In a real implementation, this would use Capacitor Network plugin
      return {
        type: 'wifi', // This would be determined by actual network detection
        isConnected: navigator.onLine
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return null;
    }
  }

  private static async storeBreakInAttempt(attempt: BreakInAttempt): Promise<void> {
    try {
      const { value: existingData } = await Preferences.get({ key: 'vaultix_breakin_attempts' });
      const attempts: BreakInAttempt[] = existingData ? JSON.parse(existingData) : [];
      
      attempts.unshift(attempt);
      
      // Keep only last 100 attempts
      if (attempts.length > 100) {
        attempts.splice(100);
      }
      
      await Preferences.set({ 
        key: 'vaultix_breakin_attempts', 
        value: JSON.stringify(attempts) 
      });
    } catch (error) {
      console.error('Failed to store break-in attempt:', error);
    }
  }

  private static async triggerSecurityLockdown(): Promise<void> {
    try {
      console.log('SECURITY LOCKDOWN TRIGGERED');
      
      // Store lockdown state
      await Preferences.set({ 
        key: 'vaultix_security_lockdown', 
        value: JSON.stringify({
          triggered: true,
          timestamp: new Date().toISOString(),
          reason: 'max_failed_attempts_exceeded'
        })
      });

      // Send security alert event
      const event = new CustomEvent('security_lockdown', {
        detail: {
          reason: 'max_failed_attempts',
          attempts: this.failedAttempts,
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(event);

    } catch (error) {
      console.error('Failed to trigger security lockdown:', error);
    }
  }

  static async getBreakInAttempts(): Promise<BreakInAttempt[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_breakin_attempts' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get break-in attempts:', error);
      return [];
    }
  }

  static async clearBreakInAttempts(): Promise<void> {
    try {
      await Preferences.remove({ key: 'vaultix_breakin_attempts' });
      this.failedAttempts = 0;
    } catch (error) {
      console.error('Failed to clear break-in attempts:', error);
    }
  }

  static resetFailedAttempts(): void {
    this.failedAttempts = 0;
  }

  static getFailedAttemptCount(): number {
    return this.failedAttempts;
  }

  static async isLockdownActive(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_security_lockdown' });
      if (value) {
        const lockdown = JSON.parse(value);
        return lockdown.triggered === true;
      }
      return false;
    } catch (error) {
      console.error('Failed to check lockdown status:', error);
      return false;
    }
  }

  static async clearLockdown(): Promise<void> {
    try {
      await Preferences.remove({ key: 'vaultix_security_lockdown' });
      this.resetFailedAttempts();
    } catch (error) {
      console.error('Failed to clear lockdown:', error);
    }
  }
}

// React component for intruder detection UI
export const IntruderDetectionComponent: React.FC = () => {
  const [attempts, setAttempts] = useState<BreakInAttempt[]>([]);
  const [isLockdownActive, setIsLockdownActive] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAttempts();
    checkLockdownStatus();
    
    // Listen for security events
    const handleSecurityLockdown = (event: CustomEvent) => {
      setIsLockdownActive(true);
      toast({
        title: "Security Lockdown",
        description: "Maximum failed attempts exceeded. Vault is locked.",
        variant: "destructive"
      });
    };

    window.addEventListener('security_lockdown', handleSecurityLockdown as EventListener);
    
    return () => {
      window.removeEventListener('security_lockdown', handleSecurityLockdown as EventListener);
    };
  }, [toast]);

  const loadAttempts = async () => {
    const breakInAttempts = await RealIntruderDetection.getBreakInAttempts();
    setAttempts(breakInAttempts);
  };

  const checkLockdownStatus = async () => {
    const lockdown = await RealIntruderDetection.isLockdownActive();
    setIsLockdownActive(lockdown);
  };

  const clearAttempts = async () => {
    await RealIntruderDetection.clearBreakInAttempts();
    await loadAttempts();
    toast({
      title: "Cleared",
      description: "All break-in attempts have been cleared"
    });
  };

  const clearLockdown = async () => {
    await RealIntruderDetection.clearLockdown();
    setIsLockdownActive(false);
    toast({
      title: "Lockdown Cleared",
      description: "Security lockdown has been cleared"
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Intruder Detection</h3>
        {isLockdownActive && (
          <div className="bg-red-500 text-white px-3 py-1 rounded text-sm">
            LOCKDOWN ACTIVE
          </div>
        )}
      </div>
      
      <div className="text-sm text-muted-foreground">
        Failed attempts: {RealIntruderDetection.getFailedAttemptCount()}/{5}
      </div>

      {attempts.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Recent Attempts</h4>
          {attempts.slice(0, 5).map(attempt => (
            <div key={attempt.id} className="border rounded p-3 text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{attempt.type.replace('_', ' ').toUpperCase()}</div>
                  <div className="text-muted-foreground">
                    {new Date(attempt.timestamp).toLocaleString()}
                  </div>
                  {attempt.location && (
                    <div className="text-xs text-muted-foreground">
                      Location: {attempt.location.latitude.toFixed(6)}, {attempt.location.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
                {attempt.photoData && (
                  <img 
                    src={attempt.photoData} 
                    alt="Intruder" 
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
              </div>
            </div>
          ))}
          
          <div className="flex space-x-2">
            <button 
              onClick={clearAttempts}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm"
            >
              Clear Attempts
            </button>
            {isLockdownActive && (
              <button 
                onClick={clearLockdown}
                className="px-3 py-1 bg-orange-500 text-white rounded text-sm"
              >
                Clear Lockdown
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
