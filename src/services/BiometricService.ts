
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometryTypes: BiometryType[];
  strongBiometryIsAvailable: boolean;
}

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export interface BiometricConfig {
  enabled: boolean;
  allowDeviceCredential: boolean;
  fallbackToDeviceCredentials: boolean;
  requireConfirmation: boolean;
  invalidateOnBiometryChange: boolean;
}

export interface AuthenticationHistoryEntry {
  timestamp: Date;
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

  async authenticate(reason: string): Promise<BiometricResult> {
    try {
      await BiometricAuth.authenticate({
        reason,
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

  async authenticateWithPrompt(title: string, subtitle: string, description: string): Promise<BiometricResult> {
    try {
      await BiometricAuth.authenticate({
        reason: description,
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

  async getConfig(): Promise<BiometricConfig> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_biometric_config' });
      if (value) {
        return JSON.parse(value);
      }
    } catch (error) {
      console.error('Failed to get biometric config:', error);
    }

    return {
      enabled: false,
      allowDeviceCredential: true,
      fallbackToDeviceCredentials: true,
      requireConfirmation: false,
      invalidateOnBiometryChange: true
    };
  }

  async saveConfig(config: BiometricConfig): Promise<void> {
    try {
      await Preferences.set({ 
        key: 'vaultix_biometric_config', 
        value: JSON.stringify(config) 
      });
    } catch (error) {
      console.error('Failed to save biometric config:', error);
    }
  }

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    const config = await this.getConfig();
    config.enabled = enabled;
    await this.saveConfig(config);
  }

  async getAuthenticationHistory(): Promise<AuthenticationHistoryEntry[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_biometric_history' });
      if (value) {
        return JSON.parse(value);
      }
    } catch (error) {
      console.error('Failed to get auth history:', error);
    }
    return [];
  }

  async isAvailable(): Promise<boolean> {
    const capabilities = await this.checkCapabilities();
    return capabilities.isAvailable;
  }
}
