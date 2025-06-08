import { BiometricAuth, BiometryType, BiometricAuthenticationStatus } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometryTypes: BiometryType[];
  strongBiometryIsAvailable: boolean;
  deviceHasPin: boolean;
}

export interface BiometricResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

export interface BiometricConfig {
  enabled: boolean;
  allowDeviceCredential: boolean;
  fallbackToDeviceCredentials: boolean;
  requireConfirmation: boolean;
  invalidateOnBiometryChange: boolean;
  maxRetries: number;
}

export interface AuthenticationHistoryEntry {
  timestamp: Date;
  success: boolean;
  biometryType?: BiometryType;
  error?: string;
  errorCode?: string;
}

export class ProductionBiometricService {
  private static instance: ProductionBiometricService;
  private isInitialized = false;
  private retryCount = 0;

  static getInstance(): ProductionBiometricService {
    if (!ProductionBiometricService.instance) {
      ProductionBiometricService.instance = new ProductionBiometricService();
    }
    return ProductionBiometricService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if biometric authentication is available
      const capabilities = await this.checkCapabilities();
      if (!capabilities.isAvailable) {
        console.warn('Biometric authentication not available on this device');
      }
      
      this.isInitialized = true;
      console.log('Production biometric service initialized');
    } catch (error) {
      console.error('Failed to initialize biometric service:', error);
      throw error;
    }
  }

  async checkCapabilities(): Promise<BiometricCapabilities> {
    try {
      const result = await BiometricAuth.checkBiometry();
      return {
        isAvailable: result.isAvailable,
        biometryTypes: result.biometryTypes || [],
        strongBiometryIsAvailable: result.strongBiometryIsAvailable || false,
        deviceHasPin: result.deviceIsSecure || false
      };
    } catch (error) {
      console.error('Biometric capability check failed:', error);
      return {
        isAvailable: false,
        biometryTypes: [],
        strongBiometryIsAvailable: false,
        deviceHasPin: false
      };
    }
  }

  async authenticate(reason: string, requireStrongBiometry: boolean = true): Promise<BiometricResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const config = await this.getConfig();
      
      // Reset retry count for new authentication session
      this.retryCount = 0;

      const result = await this.performAuthentication(reason, requireStrongBiometry, config);
      await this.logAuthenticationAttempt(result);
      
      return result;
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      const result: BiometricResult = {
        success: false,
        error: error.message || 'Authentication failed',
        errorCode: error.code || 'UNKNOWN_ERROR'
      };
      
      await this.logAuthenticationAttempt(result);
      return result;
    }
  }

  private async performAuthentication(
    reason: string, 
    requireStrongBiometry: boolean, 
    config: BiometricConfig
  ): Promise<BiometricResult> {
    try {
      const capabilities = await this.checkCapabilities();
      
      if (!capabilities.isAvailable) {
        throw new Error('Biometric authentication not available');
      }

      if (requireStrongBiometry && !capabilities.strongBiometryIsAvailable) {
        if (config.fallbackToDeviceCredentials && capabilities.deviceHasPin) {
          // Fallback to device PIN/Pattern/Password
          console.log('Falling back to device credentials');
        } else {
          throw new Error('Strong biometry required but not available');
        }
      }

      await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Cancel',
        allowDeviceCredential: config.allowDeviceCredential,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Biometric Authentication',
        androidSubtitle: 'Authenticate to access your vault',
        androidConfirmationRequired: config.requireConfirmation,
        androidNegativeText: 'Cancel'
      });

      return { success: true };
    } catch (error: any) {
      this.retryCount++;
      
      // Handle specific biometric errors
      switch (error.code) {
        case BiometricAuthenticationStatus.userCancel:
          return {
            success: false,
            error: 'Authentication cancelled by user',
            errorCode: 'USER_CANCEL'
          };
        case BiometricAuthenticationStatus.userFallback:
          if (config.fallbackToDeviceCredentials) {
            // Retry with device credentials
            return await this.authenticateWithDeviceCredentials(reason);
          }
          return {
            success: false,
            error: 'User chose fallback authentication',
            errorCode: 'USER_FALLBACK'
          };
        case BiometricAuthenticationStatus.biometryNotAvailable:
          return {
            success: false,
            error: 'Biometric authentication not available',
            errorCode: 'NOT_AVAILABLE'
          };
        case BiometricAuthenticationStatus.biometryNotEnrolled:
          return {
            success: false,
            error: 'No biometrics enrolled on device',
            errorCode: 'NOT_ENROLLED'
          };
        case BiometricAuthenticationStatus.biometryLockout:
          return {
            success: false,
            error: 'Biometric authentication locked out',
            errorCode: 'LOCKOUT'
          };
        default:
          throw error;
      }
    }
  }

  private async authenticateWithDeviceCredentials(reason: string): Promise<BiometricResult> {
    try {
      await BiometricAuth.authenticate({
        reason,
        allowDeviceCredential: true,
        androidTitle: 'Device Authentication',
        androidSubtitle: 'Use your device PIN, pattern, or password'
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: 'Device credential authentication failed',
        errorCode: 'DEVICE_CREDENTIAL_FAILED'
      };
    }
  }

  async authenticateWithPrompt(
    title: string, 
    subtitle: string, 
    description: string,
    requireStrongBiometry: boolean = true
  ): Promise<BiometricResult> {
    try {
      const config = await this.getConfig();
      
      await BiometricAuth.authenticate({
        reason: description,
        cancelTitle: 'Cancel',
        allowDeviceCredential: config.allowDeviceCredential,
        androidTitle: title,
        androidSubtitle: subtitle,
        androidConfirmationRequired: config.requireConfirmation,
        androidNegativeText: 'Cancel'
      });

      const result: BiometricResult = { success: true };
      await this.logAuthenticationAttempt(result);
      return result;
    } catch (error: any) {
      const result: BiometricResult = {
        success: false,
        error: error.message || 'Authentication failed',
        errorCode: error.code || 'UNKNOWN_ERROR'
      };
      
      await this.logAuthenticationAttempt(result);
      return result;
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
      invalidateOnBiometryChange: true,
      maxRetries: 3
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

  private async logAuthenticationAttempt(result: BiometricResult): Promise<void> {
    try {
      const capabilities = await this.checkCapabilities();
      const entry: AuthenticationHistoryEntry = {
        timestamp: new Date(),
        success: result.success,
        biometryType: capabilities.biometryTypes[0],
        error: result.error,
        errorCode: result.errorCode
      };

      const history = await this.getAuthenticationHistory();
      history.unshift(entry);
      
      // Keep only last 100 entries
      history.splice(100);
      
      await Preferences.set({ 
        key: 'vaultix_biometric_history', 
        value: JSON.stringify(history) 
      });
    } catch (error) {
      console.error('Failed to log authentication attempt:', error);
    }
  }

  async getAuthenticationHistory(): Promise<AuthenticationHistoryEntry[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_biometric_history' });
      if (value) {
        const history = JSON.parse(value);
        return history.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
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

  async isStrongBiometryAvailable(): Promise<boolean> {
    const capabilities = await this.checkCapabilities();
    return capabilities.strongBiometryIsAvailable;
  }

  async clearAuthenticationHistory(): Promise<void> {
    try {
      await Preferences.remove({ key: 'vaultix_biometric_history' });
    } catch (error) {
      console.error('Failed to clear authentication history:', error);
    }
  }
}
