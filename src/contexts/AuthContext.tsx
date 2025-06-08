import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';
import { IntruderDetection } from '@/components/security/IntruderDetection';

interface AuthContextType {
  isAuthenticated: boolean;
  hasPin: boolean;
  login: (credentials: string) => Promise<boolean>;
  register: (credentials: string) => Promise<void>;
  logout: () => void;
  setupPin: (credentials: string) => Promise<void>;
  changePin: (oldCredentials: string, newCredentials: string) => Promise<boolean>;
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
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [fakeVaultMode, setFakeVaultModeState] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authMethod, setAuthMethodState] = useState<'pin' | 'pattern'>('pin');

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await Promise.all([
          checkExistingPin(),
          checkBiometricSettings(),
          checkLockStatus(),
          loadAuthMethod()
        ]);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const checkExistingPin = async () => {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_pin_hash' });
      setHasPin(!!value);
      console.log('PIN check complete:', !!value);
    } catch (error) {
      console.error('Error checking PIN:', error);
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
      await Preferences.set({ key: 'vaultix_auth_method', value: authMethod });
      setHasPin(true);
      setIsAuthenticated(true);
      setAttempts(0);
      console.log('Authentication setup successful');
    } catch (error) {
      console.error('Error setting up authentication:', error);
      throw error;
    }
  };

  const register = async (credentials: string): Promise<void> => {
    await setupPin(credentials);
  };

  const login = async (credentials: string): Promise<boolean> => {
    try {
      console.log('Login attempt started');
      const { value: storedHash } = await Preferences.get({ key: 'vaultix_pin_hash' });
      
      if (!storedHash) {
        console.error('No stored authentication hash found');
        return false;
      }

      const inputHash = hashCredentials(credentials);
      
      if (storedHash === inputHash) {
        console.log('Authentication verification successful');
        setIsAuthenticated(true);
        setAttempts(0);
        setIsLocked(false);
        await Preferences.remove({ key: 'vaultix_lock_status' });
        return true;
      } else {
        console.log('Authentication verification failed');
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        // Log break-in attempt with photo and location
        try {
          await IntruderDetection.logBreakInAttempt(authMethod === 'pattern' ? 'failed_pin' : 'failed_pin');
        } catch (detectionError) {
          console.error('Intruder detection failed:', detectionError);
        }
        
        // Lock vault after 5 failed attempts
        if (newAttempts >= 5) {
          setIsLocked(true);
          await Preferences.set({ key: 'vaultix_lock_status', value: 'true' });
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
      console.error('Error changing authentication:', error);
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
    await Preferences.remove({ key: 'vaultix_lock_status' });
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
      login,
      register,
      logout,
      setupPin,
      changePin,
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
    }}>
      {children}
    </AuthContext.Provider>
  );
};
