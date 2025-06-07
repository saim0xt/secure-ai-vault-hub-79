
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

interface SecurityContextType {
  autoLockTimeout: number;
  setAutoLockTimeout: (timeout: number) => void;
  preventScreenshots: boolean;
  setPreventScreenshots: (prevent: boolean) => void;
  shakeToLock: boolean;
  setShakeToLock: (enabled: boolean) => void;
  maxFailedAttempts: number;
  setMaxFailedAttempts: (max: number) => void;
  selfDestructEnabled: boolean;
  setSelfDestructEnabled: (enabled: boolean) => void;
  stealthMode: boolean;
  setStealthMode: (enabled: boolean) => void;
  lastActivity: Date;
  updateActivity: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [autoLockTimeout, setAutoLockTimeoutState] = useState(300000); // 5 minutes
  const [preventScreenshots, setPreventScreenshotsState] = useState(true);
  const [shakeToLock, setShakeToLockState] = useState(true);
  const [maxFailedAttempts, setMaxFailedAttemptsState] = useState(5);
  const [selfDestructEnabled, setSelfDestructEnabledState] = useState(false);
  const [stealthMode, setStealthModeState] = useState(false);
  const [lastActivity, setLastActivity] = useState(new Date());

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const settings = await Promise.all([
        Preferences.get({ key: 'vaultix_auto_lock_timeout' }),
        Preferences.get({ key: 'vaultix_prevent_screenshots' }),
        Preferences.get({ key: 'vaultix_shake_to_lock' }),
        Preferences.get({ key: 'vaultix_max_failed_attempts' }),
        Preferences.get({ key: 'vaultix_self_destruct_enabled' }),
        Preferences.get({ key: 'vaultix_stealth_mode' }),
      ]);

      if (settings[0].value) setAutoLockTimeoutState(parseInt(settings[0].value));
      if (settings[1].value) setPreventScreenshotsState(settings[1].value === 'true');
      if (settings[2].value) setShakeToLockState(settings[2].value === 'true');
      if (settings[3].value) setMaxFailedAttemptsState(parseInt(settings[3].value));
      if (settings[4].value) setSelfDestructEnabledState(settings[4].value === 'true');
      if (settings[5].value) setStealthModeState(settings[5].value === 'true');
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
  };

  const setAutoLockTimeout = async (timeout: number) => {
    try {
      await Preferences.set({ key: 'vaultix_auto_lock_timeout', value: timeout.toString() });
      setAutoLockTimeoutState(timeout);
    } catch (error) {
      console.error('Error saving auto-lock timeout:', error);
    }
  };

  const setPreventScreenshots = async (prevent: boolean) => {
    try {
      await Preferences.set({ key: 'vaultix_prevent_screenshots', value: prevent.toString() });
      setPreventScreenshotsState(prevent);
    } catch (error) {
      console.error('Error saving screenshot prevention setting:', error);
    }
  };

  const setShakeToLock = async (enabled: boolean) => {
    try {
      await Preferences.set({ key: 'vaultix_shake_to_lock', value: enabled.toString() });
      setShakeToLockState(enabled);
    } catch (error) {
      console.error('Error saving shake to lock setting:', error);
    }
  };

  const setMaxFailedAttempts = async (max: number) => {
    try {
      await Preferences.set({ key: 'vaultix_max_failed_attempts', value: max.toString() });
      setMaxFailedAttemptsState(max);
    } catch (error) {
      console.error('Error saving max failed attempts:', error);
    }
  };

  const setSelfDestructEnabled = async (enabled: boolean) => {
    try {
      await Preferences.set({ key: 'vaultix_self_destruct_enabled', value: enabled.toString() });
      setSelfDestructEnabledState(enabled);
    } catch (error) {
      console.error('Error saving self-destruct setting:', error);
    }
  };

  const setStealthMode = async (enabled: boolean) => {
    try {
      await Preferences.set({ key: 'vaultix_stealth_mode', value: enabled.toString() });
      setStealthModeState(enabled);
    } catch (error) {
      console.error('Error saving stealth mode setting:', error);
    }
  };

  const updateActivity = () => {
    setLastActivity(new Date());
  };

  return (
    <SecurityContext.Provider value={{
      autoLockTimeout,
      setAutoLockTimeout,
      preventScreenshots,
      setPreventScreenshots,
      shakeToLock,
      setShakeToLock,
      maxFailedAttempts,
      setMaxFailedAttempts,
      selfDestructEnabled,
      setSelfDestructEnabled,
      stealthMode,
      setStealthMode,
      lastActivity,
      updateActivity,
    }}>
      {children}
    </SecurityContext.Provider>
  );
};
