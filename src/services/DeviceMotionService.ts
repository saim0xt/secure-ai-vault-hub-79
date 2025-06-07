
import { DeviceMotion, DeviceMotionAccelerometerOptions } from '@capacitor/device-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface ShakeDetectionConfig {
  enabled: boolean;
  sensitivity: number;
  cooldownMs: number;
}

export class DeviceMotionService {
  private static watchId: string | null = null;
  private static lastShakeTime = 0;
  private static shakeCallback: (() => void) | null = null;
  private static config: ShakeDetectionConfig = {
    enabled: true,
    sensitivity: 15,
    cooldownMs: 1000
  };

  static async startShakeDetection(onShake: () => void): Promise<void> {
    this.shakeCallback = onShake;

    try {
      const options: DeviceMotionAccelerometerOptions = {
        frequency: 100 // 100ms intervals
      };

      this.watchId = await DeviceMotion.addListener('accel', options, (acceleration) => {
        this.handleAcceleration(acceleration.x, acceleration.y, acceleration.z);
      });

      console.log('Shake detection started');
    } catch (error) {
      console.error('Failed to start shake detection:', error);
    }
  }

  static async stopShakeDetection(): Promise<void> {
    if (this.watchId) {
      try {
        await DeviceMotion.removeListener(this.watchId);
        this.watchId = null;
        this.shakeCallback = null;
        console.log('Shake detection stopped');
      } catch (error) {
        console.error('Failed to stop shake detection:', error);
      }
    }
  }

  private static handleAcceleration(x: number, y: number, z: number): void {
    if (!this.config.enabled || !this.shakeCallback) return;

    const acceleration = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();

    if (acceleration > this.config.sensitivity && 
        now - this.lastShakeTime > this.config.cooldownMs) {
      
      this.lastShakeTime = now;
      
      // Provide haptic feedback
      Haptics.impact({ style: ImpactStyle.Medium });
      
      console.log('Shake detected!', acceleration);
      this.shakeCallback();
    }
  }

  static updateConfig(config: Partial<ShakeDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  static getConfig(): ShakeDetectionConfig {
    return { ...this.config };
  }
}
