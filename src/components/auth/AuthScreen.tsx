
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSecurity } from '@/contexts/SecurityContext';
import { BiometricService } from '@/services/BiometricService';
import { VolumeKeyService } from '@/services/VolumeKeyService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Fingerprint, Eye, EyeOff, Shield, Lock, Grid3X3, AlertTriangle } from 'lucide-react';
import PatternLock from './PatternLock';

const AuthScreen = () => {
  const navigate = useNavigate();
  const { hasPin, login, setupPin, attempts, fakeVaultMode, isAuthenticated, biometricEnabled } = useAuth();
  const { maxFailedAttempts, stealthMode } = useSecurity();
  const { toast } = useToast();
  
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'pin' | 'pattern'>('pin');
  const [showPatternLock, setShowPatternLock] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);

  const biometricService = BiometricService.getInstance();
  const volumeKeyService = VolumeKeyService.getInstance();

  // Check biometric availability
  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  // Setup volume key patterns
  useEffect(() => {
    setupVolumeKeyPatterns();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User already authenticated, redirecting to dashboard');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Auto-focus PIN input
    if (authMethod === 'pin') {
      const input = document.getElementById('pin-input');
      if (input) input.focus();
    }
  }, [authMethod]);

  const checkBiometricCapabilities = async () => {
    try {
      const capabilities = await biometricService.checkCapabilities();
      setBiometricAvailable(capabilities.isAvailable);
      setBiometricTypes(capabilities.biometryTypes);
      
      if (!capabilities.isAvailable) {
        console.log('Biometric not available:', capabilities.reason);
      }
    } catch (error) {
      console.error('Failed to check biometric capabilities:', error);
    }
  };

  const setupVolumeKeyPatterns = () => {
    // Register volume key callbacks for authentication
    volumeKeyService.registerCallback('unlock', handleVolumeUnlock);
    volumeKeyService.registerCallback('emergency_lock', handleEmergencyLock);
    volumeKeyService.registerCallback('fake_vault', handleFakeVaultToggle);
  };

  const handleVolumeUnlock = async () => {
    if (biometricAvailable && biometricEnabled) {
      await handleBiometricAuth();
    }
  };

  const handleEmergencyLock = () => {
    // Clear sensitive data and redirect
    localStorage.removeItem('vaultix_session');
    window.location.href = '/auth';
  };

  const handleFakeVaultToggle = () => {
    // Toggle fake vault mode
    const event = new CustomEvent('toggle_fake_vault');
    window.dispatchEvent(event);
  };

  const handleBiometricAuth = async () => {
    if (!biometricAvailable || !biometricEnabled) {
      toast({
        title: "Biometric Unavailable",
        description: "Biometric authentication is not available or enabled",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await biometricService.authenticate(
        "Unlock your secure vault with biometric authentication"
      );

      if (result.success) {
        // Biometric success - auto-login with stored credentials
        const { value: storedHash } = await import('@capacitor/preferences').then(p => 
          p.Preferences.get({ key: 'vaultix_pin_hash' })
        );
        
        if (storedHash) {
          // Simulate successful login without requiring PIN again
          const success = await login('biometric_bypass_token');
          if (success) {
            toast({
              title: "Welcome",
              description: "Biometric authentication successful!",
            });
            setTimeout(() => navigate('/', { replace: true }), 500);
          }
        }
      } else {
        toast({
          title: "Authentication Failed",
          description: result.error || "Biometric authentication failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      toast({
        title: "Error",
        description: "Biometric authentication error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMethod === 'pattern') {
      setShowPatternLock(true);
      return;
    }
    
    if (!pin) {
      toast({
        title: "Error",
        description: "Please enter your PIN",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (!hasPin || isSettingUp) {
        if (pin !== confirmPin) {
          toast({
            title: "Error",
            description: "PINs do not match",
            variant: "destructive",
          });
          return;
        }
        
        if (pin.length < 4) {
          toast({
            title: "Error",
            description: "PIN must be at least 4 digits",
            variant: "destructive",
          });
          return;
        }

        await setupPin(pin);
        
        // Setup biometric after PIN setup if available
        if (biometricAvailable && !biometricEnabled) {
          const setupBiometric = await new Promise<boolean>((resolve) => {
            toast({
              title: "Setup Biometric",
              description: "Would you like to enable biometric authentication?",
              action: (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => resolve(true)}>Yes</Button>
                  <Button size="sm" variant="outline" onClick={() => resolve(false)}>No</Button>
                </div>
              ),
            });
          });

          if (setupBiometric) {
            try {
              await biometricService.setBiometricEnabled(true);
              toast({
                title: "Success",
                description: "Biometric authentication enabled!",
              });
            } catch (error) {
              console.error('Failed to enable biometric:', error);
            }
          }
        }
        
        toast({
          title: "Success",
          description: "PIN setup complete. Welcome to Vaultix!",
        });
        
        setTimeout(() => navigate('/', { replace: true }), 500);
      } else {
        const success = await login(pin);
        if (success) {
          console.log('Login successful, navigating to dashboard');
          toast({
            title: "Welcome",
            description: "Successfully logged in!",
          });
          
          setTimeout(() => navigate('/', { replace: true }), 500);
        } else {
          toast({
            title: "Access Denied",
            description: `Incorrect PIN. ${maxFailedAttempts - attempts} attempts remaining.`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: "Authentication failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setPin('');
      setConfirmPin('');
    }
  };

  const handlePatternComplete = async (pattern: number[]) => {
    try {
      const patternString = pattern.join('');
      
      if (!hasPin || isSettingUp) {
        await setupPin(patternString);
        toast({
          title: "Success",
          description: "Pattern setup complete. Welcome to Vaultix!",
        });
        
        setTimeout(() => navigate('/', { replace: true }), 500);
      } else {
        const success = await login(patternString);
        if (success) {
          toast({
            title: "Welcome",
            description: "Successfully logged in!",
          });
          
          setTimeout(() => navigate('/', { replace: true }), 500);
        } else {
          toast({
            title: "Access Denied",
            description: `Incorrect pattern. ${maxFailedAttempts - attempts} attempts remaining.`,
            variant: "destructive",
          });
          setShowPatternLock(false);
        }
      }
    } catch (error) {
      console.error('Pattern auth error:', error);
      toast({
        title: "Error",
        description: "Pattern authentication failed. Please try again.",
        variant: "destructive",
      });
      setShowPatternLock(false);
    }
  };

  const switchToSetup = () => {
    setIsSettingUp(true);
    setPin('');
    setConfirmPin('');
  };

  if (showPatternLock) {
    return (
      <PatternLock
        onPatternComplete={handlePatternComplete}
        onCancel={() => setShowPatternLock(false)}
        isSetup={!hasPin || isSettingUp}
        title={!hasPin || isSettingUp ? "Create Pattern" : "Enter Pattern"}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700 shadow-2xl">
          <div className="p-8">
            {/* App Logo and Title */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center"
              >
                <Shield className="w-10 h-10 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {stealthMode ? "Calculator" : "Vaultix"}
              </h1>
              <p className="text-gray-400">
                {!hasPin || isSettingUp
                  ? "Setup your secure vault"
                  : "Enter your credentials to access vault"
                }
              </p>
              {fakeVaultMode && (
                <div className="mt-2 text-yellow-400 text-sm">
                  🔒 Fake Vault Mode Active
                </div>
              )}
            </div>

            {/* Authentication Method Tabs */}
            <div className="flex mb-6 bg-gray-700/50 rounded-lg p-1">
              <button
                onClick={() => setAuthMethod('pin')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
                  authMethod === 'pin' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>PIN</span>
              </button>
              <button
                onClick={() => setAuthMethod('pattern')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
                  authMethod === 'pattern' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                <span>Pattern</span>
              </button>
            </div>

            {/* PIN Form */}
            {authMethod === 'pin' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      id="pin-input"
                      type={showPin ? "text" : "password"}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder={!hasPin || isSettingUp ? "Create PIN (4+ digits)" : "Enter PIN"}
                      className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 pr-10"
                      maxLength={10}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {(!hasPin || isSettingUp) && (
                    <div className="relative">
                      <Input
                        type={showPin ? "text" : "password"}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        placeholder="Confirm PIN"
                        className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                        maxLength={10}
                        autoComplete="off"
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      {!hasPin || isSettingUp ? "Setup Vault" : "Unlock Vault"}
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Pattern Form */}
            {authMethod === 'pattern' && (
              <div className="space-y-6">
                <Button
                  onClick={() => setShowPatternLock(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
                >
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  {!hasPin || isSettingUp ? "Create Pattern" : "Draw Pattern"}
                </Button>
              </div>
            )}

            {/* Failed Attempts Warning */}
            {attempts > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mt-4"
              >
                <p className="text-red-400 text-sm flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {attempts} failed attempt{attempts > 1 ? 's' : ''}. 
                  {maxFailedAttempts - attempts} remaining.
                </p>
              </motion.div>
            )}

            {/* Biometric Option */}
            {hasPin && !isSettingUp && biometricAvailable && biometricEnabled && (
              <div className="mt-6">
                <Button
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={handleBiometricAuth}
                  disabled={loading}
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Use {biometricTypes.join(' / ')}
                </Button>
              </div>
            )}

            {/* App Info */}
            <div className="mt-8 text-center">
              <p className="text-gray-500 text-xs">
                Vaultix v1.0 - Secure File Vault
              </p>
              <p className="text-gray-600 text-xs mt-1">
                Your files are encrypted and protected
              </p>
              {biometricAvailable && (
                <p className="text-green-500 text-xs mt-1">
                  ✓ {biometricTypes.join(' & ')} Available
                </p>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthScreen;
