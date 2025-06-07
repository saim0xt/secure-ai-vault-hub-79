
import { BiometricAuth, BiometryType, CheckBiometryResult, AuthenticateOptions } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

export interface BiometricConfig {
  enabled: boolean;
  allowDeviceCredential: boolean;
  invalidateOnBiometryChange: boolean;
}

export class BiometricService {
  private static instance: BiometricService;

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result: CheckBiometryResult = await BiometricAuth.checkBiometry();
      return result.isAvailable && result.biometryTypes.length > 0;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }

  async getBiometryTypes(): Promise<string[]> {
    try {
      const result: CheckBiometryResult = await BiometricAuth.checkBiometry();
      return result.biometryTypes.map((type: BiometryType) => type.toString());
    } catch (error) {
      console.error('Failed to get biometry types:', error);
      return [];
    }
  }

  async authenticate(reason: string = 'Authenticate to access your vault'): Promise<boolean> {
    try {
      const options: AuthenticateOptions = {
        reason,
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Vaultix Authentication',
        androidSubtitle: 'Use your biometric to unlock vault',
        androidConfirmationRequired: false
      };

      await BiometricAuth.authenticate(options);
      // If authenticate() doesn't throw, it means authentication was successful
      return true;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
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
}
