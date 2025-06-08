
import React from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

interface BreakInLog {
  timestamp: string;
  type: 'failed_pin' | 'failed_pattern' | 'failed_biometric' | 'multiple_attempts';
  deviceInfo: string;
  location?: string;
  photoPath?: string;
  ipAddress?: string;
}

export class IntruderDetection {
  private static async captureIntruderPhoto(): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true
      });
      
      return image.dataUrl || null;
    } catch (error) {
      console.error('Failed to capture intruder photo:', error);
      return null;
    }
  }

  private static async getLocationInfo(): Promise<string | null> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000
      });
      
      return `${position.coords.latitude}, ${position.coords.longitude}`;
    } catch (error) {
      console.error('Failed to get location:', error);
      return null;
    }
  }

  private static async getDeviceInfo(): Promise<string> {
    try {
      const info = await Device.getInfo();
      return `${info.manufacturer} ${info.model} (${info.platform} ${info.osVersion})`;
    } catch (error) {
      return 'Unknown Device';
    }
  }

  private static async getIPAddress(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return null;
    }
  }

  static async logBreakInAttempt(type: 'failed_pin' | 'failed_pattern' | 'failed_biometric' | 'multiple_attempts'): Promise<void> {
    try {
      const [photoPath, location, deviceInfo, ipAddress] = await Promise.all([
        this.captureIntruderPhoto(),
        this.getLocationInfo(),
        this.getDeviceInfo(),
        this.getIPAddress()
      ]);

      const log: BreakInLog = {
        timestamp: new Date().toISOString(),
        type,
        deviceInfo,
        location: location || undefined,
        photoPath: photoPath || undefined,
        ipAddress: ipAddress || undefined
      };

      // Get existing logs
      const { value: existingLogs } = await Preferences.get({ key: 'vaultix_breakin_logs' });
      const logs: BreakInLog[] = existingLogs ? JSON.parse(existingLogs) : [];
      
      // Add new log
      logs.push(log);
      
      // Keep only last 50 logs to prevent storage bloat
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }
      
      // Save updated logs
      await Preferences.set({ key: 'vaultix_breakin_logs', value: JSON.stringify(logs) });
      
      console.log('Break-in attempt logged:', log);
    } catch (error) {
      console.error('Failed to log break-in attempt:', error);
    }
  }

  static async getBreakInLogs(): Promise<BreakInLog[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_breakin_logs' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get break-in logs:', error);
      return [];
    }
  }

  static async clearBreakInLogs(): Promise<void> {
    try {
      await Preferences.remove({ key: 'vaultix_breakin_logs' });
    } catch (error) {
      console.error('Failed to clear break-in logs:', error);
    }
  }
}
