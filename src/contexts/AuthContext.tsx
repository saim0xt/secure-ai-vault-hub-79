
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';
import { IntruderDetection } from '@/components/security/IntruderDetection';

interface AuthContextType {
  isAuthenticated: boolean;
  hasPin: boolean;
  hasPattern: boolean;
  login: (credentials: string, method?: 'pin' | 'pattern') => Promise<boolean>;
  logout: () => void;
  setupPin: (credentials: string) => Promise<void>;
  setupPattern: (pattern: string) => Promise<void>;
  changePin: (oldCredentials: string, newCredentials: string) => Promise<boolean>;
  changePattern: (oldPattern: string, newPattern: string) => Promise<boolean>;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  fakeVaultMode: boolean;
  setFakeVaultMode: (mode: boolean) => void;
  toggleFakeVault: () => void;
  attempts: number;
  resetAttempts: () => void;
  isLocked: boolean;
  authMethod: 'pin' | 'pattern';
  setAuthMethod: (method: 'pin' | 'pattern') => void;
  maxAttempts: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [hasPattern, setHasPattern] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [fakeVaultMode, setFakeVaultModeState] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authMethod, setAuthMethodState] = useState<'pin' | 'pattern'>('pin');
  const maxAttempts = 5;

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await Promise.all([
          checkExistingCredentials(),
          checkBiometricSettings(),
          checkLockStatus(),
          loadAuthMethod(),
          loadFailedAttempts()
        ]);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const checkExistingCredentials = async () => {
    try {
      const [pinResult, patternResult] = await Promise.all([
        Preferences.get({ key: 'vaultix_pin_hash' }),
        Preferences.get({ key: 'vaultix_pattern_hash' })
      ]);
      
      setHasPin(!!pinResult.value);
      setHasPattern(!!patternResult.value);
      
      console.log('Credentials check - PIN:', !!pinResult.value, 'Pattern:', !!patternResult.value);
    } catch (error) {
      console.error('Error checking credentials:', error);
    }
  };

  const checkBiometricSettings = async () => {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_biometric_enabled' });
      setBiometricEnabled(value === 'true');
    } catch (error) {
      console.error('Error checking biometric settings:', error);
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

  const loadFailedAttempts = async () => {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_failed_attempts' });
      const savedAttempts = value ? parseInt(value, 10) : 0;
      setAttempts(savedAttempts);
      
      // Auto-lock if attempts exceeded
      if (savedAttempts >= maxAttempts) {
        setIsLocked(true);
        await Preferences.set({ key: 'vaultix_lock_status', value: 'true' });
      }
    } catch (error) {
      console.error('Error loading failed attempts:', error);
    }
  };

  const saveFailedAttempts = async (attemptCount: number) => {
    try {
      await Preferences.set({ key: 'vaultix_failed_attempts', value: attemptCount.toString() });
    } catch (error) {
      console.error('Error saving failed attempts:', error);
    }
  };

  const loadAuthMethod = async () => {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_auth_method' });
      if (value && (value === 'pin' || value === 'pattern')) {
        setAuthMethodState(value);
      }
    } catch (error) {
      console.error('Error loading auth method:', error);
    }
  };

  const hashCredentials = (credentials: string): string => {
    return CryptoJS.SHA256(credentials + 'vaultix_salt').toString();
  };

  const setupPin = async (credentials: string): Promise<void> => {
    try {
      const hashedCredentials = hashCredentials(credentials);
      await Preferences.set({ key: 'vaultix_pin_hash', value: hashedCredentials });
      setHasPin(true);
      setIsAuthenticated(true);
      await resetAttempts();
      console.log('PIN setup successful');
    } catch (error) {
      console.error('Error setting up PIN:', error);
      throw error;
    }
  };

  const setupPattern = async (pattern: string): Promise<void> => {
    try {
      const hashedPattern = hashCredentials(pattern);
      await Preferences.set({ key: 'vaultix_pattern_hash', value: hashedPattern });
      await Preferences.set({ key: 'vaultix_auth_method', value: 'pattern' });
      setHasPattern(true);
      setAuthMethodState('pattern');
      setIsAuthenticated(true);
      await resetAttempts();
      console.log('Pattern setup successful');
    } catch (error) {
      console.error('Error setting up pattern:', error);
      throw error;
    }
  };

  const login = async (credentials: string, method?: 'pin' | 'pattern'): Promise<boolean> => {
    try {
      console.log('Login attempt started with method:', method || authMethod);
      
      // Check if locked
      if (isLocked) {
        console.log('Vault is locked due to too many failed attempts');
        return false;
      }

      const loginMethod = method || authMethod;
      const storageKey = loginMethod === 'pattern' ? 'vaultix_pattern_hash' : 'vaultix_pin_hash';
      const { value: storedHash } = await Preferences.get({ key: storageKey });
      
      if (!storedHash) {
        console.error(`No stored ${loginMethod} hash found`);
        return false;
      }

      const inputHash = hashCredentials(credentials);
      
      if (storedHash === inputHash) {
        console.log('Authentication verification successful');
        setIsAuthenticated(true);
        await resetAttempts();
        setIsLocked(false);
        await Preferences.remove({ key: 'vaultix_lock_status' });
        return true;
      } else {
        console.log('Authentication verification failed');
        const newAttempts = Math.min(attempts + 1, maxAttempts);
        setAttempts(newAttempts);
        await saveFailedAttempts(newAttempts);
        
        // Log break-in attempt
        try {
          await IntruderDetection.logBreakInAttempt(`failed_${loginMethod}`);
        } catch (detectionError) {
          console.error('Intruder detection failed:', detectionError);
        }
        
        // Lock vault after max failed attempts
        if (newAttempts >= maxAttempts) {
          setIsLocked(true);
          await Preferences.set({ key: 'vaultix_lock_status', value: 'true' });
          console.log('Vault locked due to too many failed attempts');
        }
        
        return false;
      }
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  };

  const logout = async () => {
    console.log('Logout initiated');
    setIsAuthenticated(false);
    setFakeVaultModeState(false);
  };

  const changePin = async (oldCredentials: string, newCredentials: string): Promise<boolean> => {
    try {
      const { value: storedHash } = await Preferences.get({ key: 'vaultix_pin_hash' });
      const oldHash = hashCredentials(oldCredentials);
      
      if (storedHash === oldHash) {
        const newHash = hashCredentials(newCredentials);
        await Preferences.set({ key: 'vaultix_pin_hash', value: newHash });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error changing PIN:', error);
      return false;
    }
  };

  const changePattern = async (oldPattern: string, newPattern: string): Promise<boolean> => {
    try {
      const { value: storedHash } = await Preferences.get({ key: 'vaultix_pattern_hash' });
      const oldHash = hashCredentials(oldPattern);
      
      if (storedHash === oldHash) {
        const newHash = hashCredentials(newPattern);
        await Preferences.set({ key: 'vaultix_pattern_hash', value: newHash });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error changing pattern:', error);
      return false;
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    try {
      await Preferences.set({ key: 'vaultix_biometric_enabled', value: enabled.toString() });
      setBiometricEnabled(enabled);
    } catch (error) {
      console.error('Error setting biometric preference:', error);
    }
  };

  const setFakeVaultMode = (mode: boolean) => {
    setFakeVaultModeState(mode);
  };

  const toggleFakeVault = () => {
    setFakeVaultModeState(!fakeVaultMode);
  };

  const resetAttempts = async () => {
    setAttempts(0);
    setIsLocked(false);
    await Promise.all([
      Preferences.remove({ key: 'vaultix_lock_status' }),
      Preferences.remove({ key: 'vaultix_failed_attempts' })
    ]);
  };

  const setAuthMethod = async (method: 'pin' | 'pattern') => {
    try {
      setAuthMethodState(method);
      await Preferences.set({ key: 'vaultix_auth_method', value: method });
    } catch (error) {
      console.error('Error saving auth method:', error);
    }
  };

  // Don't render children until auth is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Initializing...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      hasPin,
      hasPattern,
      login,
      logout,
      setupPin,
      setupPattern,
      changePin,
      changePattern,
      biometricEnabled,
      setBiometricEnabled: handleBiometricToggle,
      fakeVaultMode,
      setFakeVaultMode,
      toggleFakeVault,
      attempts,
      resetAttempts,
      isLocked,
      authMethod,
      setAuthMethod,
      maxAttempts,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
