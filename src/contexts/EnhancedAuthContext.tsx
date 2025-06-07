
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';
import { BiometricService } from '@/services/BiometricService';
import { DeviceMotionService } from '@/services/DeviceMotionService';
import { IntruderDetection } from '@/components/security/IntruderDetection';

export type AuthMethod = 'pin' | 'pattern' | 'password' | 'biometric';

interface AuthConfig {
  primaryMethod: AuthMethod;
  biometricEnabled: boolean;
  patternEnabled: boolean;
  autoLockTimeout: number;
  maxAttempts: number;
  selfDestructEnabled: boolean;
  shakeToLockEnabled: boolean;
}

interface EnhancedAuthContextType {
  isAuthenticated: boolean;
  hasAuth: boolean;
  authConfig: AuthConfig;
  attempts: number;
  isLocked: boolean;
  fakeVaultMode: boolean;
  login: (credentials: string, method: AuthMethod) => Promise<boolean>;
  loginWithBiometric: () => Promise<boolean>;
  setupAuth: (credentials: string, method: AuthMethod) => Promise<void>;
  logout: () => void;
  changeAuth: (oldCredentials: string, newCredentials: string, method: AuthMethod) => Promise<boolean>;
  updateAuthConfig: (config: Partial<AuthConfig>) => Promise<void>;
  toggleFakeVault: () => void;
  resetAttempts: () => void;
  checkBiometricAvailability: () => Promise<boolean>;
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

export const useEnhancedAuth = () => {
  const context = useContext(EnhancedAuthContext);
  if (!context) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
};

export const EnhancedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAuth, setHasAuth] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [fakeVaultMode, setFakeVaultMode] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig>({
    primaryMethod: 'pin',
    biometricEnabled: false,
    patternEnabled: false,
    autoLockTimeout: 300000, // 5 minutes
    maxAttempts: 5,
    selfDestructEnabled: false,
    shakeToLockEnabled: true
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const biometricService = BiometricService.getInstance();

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && authConfig.shakeToLockEnabled) {
      DeviceMotionService.startShakeDetection(() => {
        console.log('Shake detected - locking vault');
        logout();
      });
    }

    return () => {
      DeviceMotionService.stopShakeDetection();
    };
  }, [isAuthenticated, authConfig.shakeToLockEnabled]);

  const initializeAuth = async () => {
    try {
      await Promise.all([
        checkExistingAuth(),
        loadAuthConfig(),
        checkLockStatus()
      ]);
    } catch (error) {
      console.error('Enhanced auth initialization error:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  const checkExistingAuth = async () => {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_auth_hash' });
      setHasAuth(!!value);
    } catch (error) {
      console.error('Error checking existing auth:', error);
    }
  };

  const loadAuthConfig = async () => {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_auth_config' });
      if (value) {
        const config = JSON.parse(value);
        setAuthConfig(prev => ({ ...prev, ...config }));
      }
    } catch (error) {
      console.error('Error loading auth config:', error);
    }
  };

  const checkLockStatus = async () => {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_lock_status' });
      setIsLocked(value === 'true');
    } catch (error) {
      console.error('Error checking lock status:', error);
    }
  };

  const hashCredentials = (credentials: string, method: AuthMethod): string => {
    const salt = `vaultix_${method}_salt`;
    return CryptoJS.SHA256(credentials + salt).toString();
  };

  const setupAuth = async (credentials: string, method: AuthMethod): Promise<void> => {
    try {
      const hashedCredentials = hashCredentials(credentials, method);
      await Preferences.set({ key: 'vaultix_auth_hash', value: hashedCredentials });
      
      const newConfig = { ...authConfig, primaryMethod: method };
      await updateAuthConfig(newConfig);
      
      setHasAuth(true);
      setIsAuthenticated(true);
      setAttempts(0);
      console.log(`${method} auth setup successful`);
    } catch (error) {
      console.error('Error setting up auth:', error);
      throw error;
    }
  };

  const login = async (credentials: string, method: AuthMethod): Promise<boolean> => {
    try {
      console.log(`Login attempt with ${method}`);
      const { value: storedHash } = await Preferences.get({ key: 'vaultix_auth_hash' });
      
      if (!storedHash) {
        console.error('No stored auth hash found');
        return false;
      }

      const inputHash = hashCredentials(credentials, method);
      
      if (storedHash === inputHash) {
        console.log('Auth verification successful');
        setIsAuthenticated(true);
        setAttempts(0);
        setIsLocked(false);
        await Preferences.remove({ key: 'vaultix_lock_status' });
        return true;
      } else {
        return await handleFailedAttempt();
      }
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  };

  const loginWithBiometric = async (): Promise<boolean> => {
    try {
      if (!authConfig.biometricEnabled) {
        console.log('Biometric auth not enabled');
        return false;
      }

      const isAvailable = await biometricService.isAvailable();
      if (!isAvailable) {
        console.log('Biometric auth not available');
        return false;
      }

      const success = await biometricService.authenticate('Unlock your vault');
      if (success) {
        setIsAuthenticated(true);
        setAttempts(0);
        setIsLocked(false);
        await Preferences.remove({ key: 'vaultix_lock_status' });
        return true;
      } else {
        return await handleFailedAttempt();
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      return false;
    }
  };

  const handleFailedAttempt = async (): Promise<boolean> => {
    console.log('Auth verification failed');
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    // Log break-in attempt
    try {
      await IntruderDetection.logBreakInAttempt('failed_pin');
    } catch (detectionError) {
      console.error('Intruder detection failed:', detectionError);
    }
    
    // Lock vault after max failed attempts
    if (newAttempts >= authConfig.maxAttempts) {
      setIsLocked(true);
      await Preferences.set({ key: 'vaultix_lock_status', value: 'true' });
      
      // Self-destruct if enabled
      if (authConfig.selfDestructEnabled) {
        console.log('Self-destruct triggered');
        await performSelfDestruct();
      }
    }
    
    return false;
  };

  const performSelfDestruct = async () => {
    try {
      // Clear all vault data
      const keys = [
        'vaultix_files',
        'vaultix_folders',
        'vaultix_auth_hash',
        'vaultix_auth_config',
        'vaultix_recycle_bin',
        'vaultix_breakin_logs'
      ];
      
      for (const key of keys) {
        await Preferences.remove({ key });
      }
      
      console.log('Vault data destroyed due to max failed attempts');
    } catch (error) {
      console.error('Self-destruct failed:', error);
    }
  };

  const changeAuth = async (oldCredentials: string, newCredentials: string, method: AuthMethod): Promise<boolean> => {
    try {
      const { value: storedHash } = await Preferences.get({ key: 'vaultix_auth_hash' });
      const oldHash = hashCredentials(oldCredentials, authConfig.primaryMethod);
      
      if (storedHash === oldHash) {
        const newHash = hashCredentials(newCredentials, method);
        await Preferences.set({ key: 'vaultix_auth_hash', value: newHash });
        
        const newConfig = { ...authConfig, primaryMethod: method };
        await updateAuthConfig(newConfig);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error changing auth:', error);
      return false;
    }
  };

  const updateAuthConfig = async (config: Partial<AuthConfig>) => {
    try {
      const newConfig = { ...authConfig, ...config };
      await Preferences.set({ key: 'vaultix_auth_config', value: JSON.stringify(newConfig) });
      setAuthConfig(newConfig);
    } catch (error) {
      console.error('Error updating auth config:', error);
    }
  };

  const logout = async () => {
    console.log('Logout initiated');
    setIsAuthenticated(false);
    setFakeVaultMode(false);
  };

  const toggleFakeVault = () => {
    setFakeVaultMode(!fakeVaultMode);
  };

  const resetAttempts = async () => {
    setAttempts(0);
    setIsLocked(false);
    await Preferences.remove({ key: 'vaultix_lock_status' });
  };

  const checkBiometricAvailability = async (): Promise<boolean> => {
    return await biometricService.isAvailable();
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Initializing Enhanced Security...</div>
      </div>
    );
  }

  return (
    <EnhancedAuthContext.Provider value={{
      isAuthenticated,
      hasAuth,
      authConfig,
      attempts,
      isLocked,
      fakeVaultMode,
      login,
      loginWithBiometric,
      setupAuth,
      logout,
      changeAuth,
      updateAuthConfig,
      toggleFakeVault,
      resetAttempts,
      checkBiometricAvailability,
    }}>
      {children}
    </EnhancedAuthContext.Provider>
  );
};
