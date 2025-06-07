import { BiometricAuth, BiometryType, CheckBiometryResult, AuthenticateOptions } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

export interface BiometricConfig {
  enabled: boolean;
  allowDeviceCredential: boolean;
  invalidateOnBiometryChange: boolean;
  fallbackToDeviceCredentials: boolean;
  requireConfirmation: boolean;
}

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometryTypes: string[];
  strongBiometryIsAvailable: boolean;
  reason: string;
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
      const result: CheckBiometryResult = await BiometricAuth.checkBiometry();
      
      return {
        isAvailable: result.isAvailable,
        biometryTypes: result.biometryTypes.map(type => this.mapBiometryType(type)),
        strongBiometryIsAvailable: result.strongBiometryIsAvailable,
        reason: result.reason || 'Unknown'
      };
    } catch (error) {
      console.error('Biometric capability check failed:', error);
      return {
        isAvailable: false,
        biometryTypes: [],
        strongBiometryIsAvailable: false,
        reason: 'Error checking biometric capabilities'
      };
    }
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
      return result.biometryTypes.map(type => this.mapBiometryType(type));
    } catch (error) {
      console.error('Failed to get biometry types:', error);
      return [];
    }
  }

  async authenticate(reason: string = 'Authenticate to access your vault'): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.getConfig();
      
      const options: AuthenticateOptions = {
        reason,
        cancelTitle: 'Cancel',
        allowDeviceCredential: config.allowDeviceCredential,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Vaultix Authentication',
        androidSubtitle: 'Use your biometric to unlock vault',
        androidConfirmationRequired: config.requireConfirmation,
        androidBiometryRequiredTitle: 'Biometric Required',
        androidBiometryNotRecognizedTitle: 'Not Recognized',
        androidDeviceCredentialAllowed: config.fallbackToDeviceCredentials,
        androidMaxAttempts: 3
      };

      await BiometricAuth.authenticate(options);
      
      // Track successful authentication
      await this.trackAuthenticationAttempt(true);
      
      return { success: true };
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      
      await this.trackAuthenticationAttempt(false);
      
      return { 
        success: false, 
        error: this.mapAuthenticationError(error)
      };
    }
  }

  async authenticateWithPrompt(
    title: string, 
    subtitle: string, 
    description: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.getConfig();
      
      const options: AuthenticateOptions = {
        reason: description,
        cancelTitle: 'Cancel',
        allowDeviceCredential: config.allowDeviceCredential,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: title,
        androidSubtitle: subtitle,
        androidConfirmationRequired: config.requireConfirmation,
        androidDeviceCredentialAllowed: config.fallbackToDeviceCredentials,
        androidMaxAttempts: 5
      };

      await BiometricAuth.authenticate(options);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: this.mapAuthenticationError(error)
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
      invalidateOnBiometryChange: true,
      fallbackToDeviceCredentials: true,
      requireConfirmation: false
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

  async getAuthenticationHistory(): Promise<any[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_biometric_history' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      return [];
    }
  }

  private async trackAuthenticationAttempt(success: boolean): Promise<void> {
    try {
      const history = await this.getAuthenticationHistory();
      
      history.unshift({
        timestamp: new Date().toISOString(),
        success,
        method: 'biometric'
      });
      
      // Keep last 100 attempts
      history.splice(100);
      
      await Preferences.set({
        key: 'vaultix_biometric_history',
        value: JSON.stringify(history)
      });
    } catch (error) {
      console.error('Failed to track authentication attempt:', error);
    }
  }

  private mapBiometryType(type: BiometryType): string {
    switch (type) {
      case BiometryType.fingerprintAuthentication:
        return 'Fingerprint';
      case BiometryType.faceAuthentication:
        return 'Face Recognition';
      case BiometryType.irisAuthentication:
        return 'Iris Scan';
      case BiometryType.voiceAuthentication:
        return 'Voice Recognition';
      default:
        return 'Unknown';
    }
  }

  private mapAuthenticationError(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    // Map common error codes to user-friendly messages
    switch (error.code) {
      case 'UserCancel':
        return 'Authentication cancelled by user';
      case 'UserFallback':
        return 'User chose to use fallback authentication';
      case 'BiometryNotAvailable':
        return 'Biometric authentication not available';
      case 'BiometryNotEnrolled':
        return 'No biometric credentials enrolled';
      case 'BiometryLockout':
        return 'Biometric authentication locked due to too many failed attempts';
      case 'AuthenticationFailed':
        return 'Authentication failed - biometric not recognized';
      default:
        return error.message || 'Authentication failed';
    }
  }

  async resetBiometricData(): Promise<void> {
    try {
      await Preferences.remove({ key: 'vaultix_biometric_config' });
      await Preferences.remove({ key: 'vaultix_biometric_history' });
    } catch (error) {
      console.error('Failed to reset biometric data:', error);
    }
  }

  async isConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    return config.enabled;
  }

  async canUseBiometrics(): Promise<boolean> {
    const isAvailable = await this.isAvailable();
    const config = await this.getConfig();
    return isAvailable && config.enabled;
  }
}
