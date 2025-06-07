
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSecurity } from '@/contexts/SecurityContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Fingerprint, Eye, EyeOff, Shield, Lock } from 'lucide-react';

const AuthScreen = () => {
  const navigate = useNavigate();
  const { hasPin, login, setupPin, attempts, fakeVaultMode, isAuthenticated } = useAuth();
  const { maxFailedAttempts, stealthMode } = useSecurity();
  const { toast } = useToast();
  
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User already authenticated, redirecting to dashboard');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Auto-focus PIN input
    const input = document.getElementById('pin-input');
    if (input) input.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        toast({
          title: "Success",
          description: "PIN setup complete. Welcome to Vaultix!",
        });
        
        // Navigate after successful setup
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      } else {
        const success = await login(pin);
        if (success) {
          console.log('Login successful, navigating to dashboard');
          toast({
            title: "Welcome",
            description: "Successfully logged in!",
          });
          
          // Navigate after successful login
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 500);
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

  const switchToSetup = () => {
    setIsSettingUp(true);
    setPin('');
    setConfirmPin('');
  };

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
                  : "Enter your PIN to access vault"
                }
              </p>
              {fakeVaultMode && (
                <div className="mt-2 text-yellow-400 text-sm">
                  🔒 Fake Vault Mode Active
                </div>
              )}
            </div>

            {/* PIN Form */}
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

              {/* Failed Attempts Warning */}
              {attempts > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/20 border border-red-500/30 rounded-lg p-3"
                >
                  <p className="text-red-400 text-sm">
                    ⚠️ {attempts} failed attempt{attempts > 1 ? 's' : ''}. 
                    {maxFailedAttempts - attempts} remaining.
                  </p>
                </motion.div>
              )}

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

            {/* Biometric Option */}
            {hasPin && !isSettingUp && (
              <div className="mt-6">
                <Button
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => toast({
                    title: "Biometric Auth",
                    description: "Biometric authentication would be implemented here",
                  })}
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Use Biometric
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
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthScreen;
