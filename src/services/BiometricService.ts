
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometryTypes: BiometryType[];
  strongBiometryIsAvailable: boolean;
}

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export class BiometricService {
  private static instance: BiometricService;

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  async checkCapabilities(): Promise<BiometricCapabilities> {
    try {
      const result = await BiometricAuth.checkBiometry();
      return {
        isAvailable: result.isAvailable,
        biometryTypes: result.biometryTypes || [],
        strongBiometryIsAvailable: result.strongBiometryIsAvailable || false
      };
    } catch (error) {
      console.error('Biometric capability check failed:', error);
      return {
        isAvailable: false,
        biometryTypes: [],
        strongBiometryIsAvailable: false
      };
    }
  }

  async authenticate(reason: string, subtitle?: string): Promise<BiometricResult> {
    try {
      await BiometricAuth.authenticate({
        reason,
        subtitle,
        description: subtitle,
        negativeButtonText: 'Cancel'
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      return { 
        success: false, 
        error: error.message || 'Authentication failed' 
      };
    }
  }
}
