
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';

interface AuthContextType {
  isAuthenticated: boolean;
  hasPin: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  setupPin: (pin: string) => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  fakeVaultMode: boolean;
  toggleFakeVault: () => void;
  attempts: number;
  resetAttempts: () => void;
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
  const [fakeVaultMode, setFakeVaultMode] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    checkExistingPin();
    checkBiometricSettings();
  }, []);

  const checkExistingPin = async () => {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_pin_hash' });
      setHasPin(!!value);
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

  const hashPin = (pin: string): string => {
    return CryptoJS.SHA256(pin + 'vaultix_salt').toString();
  };

  const setupPin = async (pin: string): Promise<void> => {
    try {
      const hashedPin = hashPin(pin);
      await Preferences.set({ key: 'vaultix_pin_hash', value: hashedPin });
      setHasPin(true);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error setting up PIN:', error);
      throw error;
    }
  };

  const login = async (pin: string): Promise<boolean> => {
    try {
      const { value: storedHash } = await Preferences.get({ key: 'vaultix_pin_hash' });
      const inputHash = hashPin(pin);
      
      if (storedHash === inputHash) {
        setIsAuthenticated(true);
        setAttempts(0);
        return true;
      } else {
        setAttempts(prev => prev + 1);
        // Log break-in attempt
        await logBreakInAttempt();
        return false;
      }
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setFakeVaultMode(false);
  };

  const changePin = async (oldPin: string, newPin: string): Promise<boolean> => {
    try {
      const { value: storedHash } = await Preferences.get({ key: 'vaultix_pin_hash' });
      const oldHash = hashPin(oldPin);
      
      if (storedHash === oldHash) {
        const newHash = hashPin(newPin);
        await Preferences.set({ key: 'vaultix_pin_hash', value: newHash });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error changing PIN:', error);
      return false;
    }
  };

  const logBreakInAttempt = async () => {
    try {
      const timestamp = new Date().toISOString();
      const { value: existingLogs } = await Preferences.get({ key: 'vaultix_breakin_logs' });
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      logs.push({
        timestamp,
        type: 'failed_pin',
        deviceInfo: 'Mobile Device', // In real app, get actual device info
      });
      
      await Preferences.set({ key: 'vaultix_breakin_logs', value: JSON.stringify(logs) });
    } catch (error) {
      console.error('Error logging break-in attempt:', error);
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

  const toggleFakeVault = () => {
    setFakeVaultMode(!fakeVaultMode);
  };

  const resetAttempts = () => {
    setAttempts(0);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      hasPin,
      login,
      logout,
      setupPin,
      changePin,
      biometricEnabled,
      setBiometricEnabled: handleBiometricToggle,
      fakeVaultMode,
      toggleFakeVault,
      attempts,
      resetAttempts,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
