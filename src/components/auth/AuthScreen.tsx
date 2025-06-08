
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Shield, Eye, EyeOff, Smartphone, AlertTriangle, CheckCircle, Fingerprint } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BiometricService } from '@/services/BiometricService';
import { useToast } from '@/hooks/use-toast';
import PatternLock from './PatternLock';
import BiometricAuthButton from './BiometricAuthButton';

export default function AuthScreen() {
  const [authMode, setAuthMode] = useState<'login' | 'setup'>('login');
  const [authMethod, setAuthMethod] = useState<'pin' | 'pattern' | 'biometric'>('pin');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pattern, setPattern] = useState<number[]>([]);
  const [confirmPattern, setConfirmPattern] = useState<number[]>([]);
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);

  const { login, register, isAuthenticated, hasStoredCredentials } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkBiometricAvailability();
    if (hasStoredCredentials) {
      setAuthMode('login');
    } else {
      setAuthMode('setup');
    }
  }, [hasStoredCredentials]);

  const checkBiometricAvailability = async () => {
    try {
      const capabilities = await BiometricService.getInstance().checkCapabilities();
      setBiometricAvailable(capabilities.isAvailable);
      setBiometricTypes(capabilities.biometryTypes.map(type => type.toString()));
    } catch (error) {
      console.error('Failed to check biometric capabilities:', error);
    }
  };

  const handlePinAuth = async () => {
    if (authMode === 'setup') {
      if (pin !== confirmPin) {
        toast({
          title: "PIN Mismatch",
          description: "PINs do not match. Please try again.",
          variant: "destructive"
        });
        return;
      }
      if (pin.length < 4) {
        toast({
          title: "PIN Too Short",
          description: "PIN must be at least 4 digits long.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      if (authMode === 'setup') {
        await register(pin, 'pin');
        toast({
          title: "Account Created",
          description: "Your secure vault has been set up successfully."
        });
      } else {
        await login(pin, 'pin');
        toast({
          title: "Welcome Back",
          description: "Successfully logged into your vault."
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatternAuth = async (selectedPattern: number[]) => {
    if (authMode === 'setup') {
      if (pattern.length === 0) {
        setPattern(selectedPattern);
        toast({
          title: "Pattern Set",
          description: "Please confirm your pattern."
        });
        return;
      }
      
      if (JSON.stringify(pattern) !== JSON.stringify(selectedPattern)) {
        toast({
          title: "Pattern Mismatch",
          description: "Patterns do not match. Please try again.",
          variant: "destructive"
        });
        setPattern([]);
        return;
      }
    }

    setIsLoading(true);
    try {
      const patternString = selectedPattern.join(',');
      if (authMode === 'setup') {
        await register(patternString, 'pattern');
        toast({
          title: "Account Created",
          description: "Your secure vault has been set up successfully."
        });
      } else {
        await login(patternString, 'pattern');
        toast({
          title: "Welcome Back",
          description: "Successfully logged into your vault."
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "Invalid pattern",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricSuccess = async () => {
    if (authMode === 'setup') {
      // For setup, we still need a fallback PIN
      if (!pin) {
        toast({
          title: "Setup Required",
          description: "Please set up a PIN as a fallback method first.",
          variant: "destructive"
        });
        setAuthMethod('pin');
        return;
      }
      
      try {
        await register(pin, 'biometric');
        toast({
          title: "Biometric Setup Complete",
          description: "Your vault is now secured with biometric authentication."
        });
      } catch (error: any) {
        toast({
          title: "Setup Failed",
          description: error.message || "Failed to setup biometric authentication",
          variant: "destructive"
        });
      }
    } else {
      // For login, biometric handles authentication directly
      try {
        await login('', 'biometric');
        toast({
          title: "Welcome Back",
          description: "Successfully authenticated with biometrics."
        });
      } catch (error: any) {
        toast({
          title: "Authentication Failed",
          description: error.message || "Biometric authentication failed",
          variant: "destructive"
        });
      }
    }
  };

  const renderAuthMethodSelector = () => (
    <div className="grid grid-cols-3 gap-2 mb-6">
      <Button
        variant={authMethod === 'pin' ? 'default' : 'outline'}
        onClick={() => setAuthMethod('pin')}
        className="flex flex-col items-center gap-2 h-16"
      >
        <Shield className="h-5 w-5" />
        <span className="text-xs">PIN</span>
      </Button>
      <Button
        variant={authMethod === 'pattern' ? 'default' : 'outline'}
        onClick={() => setAuthMethod('pattern')}
        className="flex flex-col items-center gap-2 h-16"
      >
        <Smartphone className="h-5 w-5" />
        <span className="text-xs">Pattern</span>
      </Button>
      <Button
        variant={authMethod === 'biometric' ? 'default' : 'outline'}
        onClick={() => setAuthMethod('biometric')}
        disabled={!biometricAvailable}
        className="flex flex-col items-center gap-2 h-16"
      >
        <Fingerprint className="h-5 w-5" />
        <span className="text-xs">Biometric</span>
        {!biometricAvailable && (
          <Badge variant="destructive" className="text-xs">Unavailable</Badge>
        )}
      </Button>
    </div>
  );

  const renderPinAuth = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="pin">
          {authMode === 'setup' ? 'Set PIN' : 'Enter PIN'}
        </Label>
        <div className="relative">
          <Input
            id="pin"
            type={showPin ? 'text' : 'password'}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter your PIN"
            className="pr-10"
            maxLength={6}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowPin(!showPin)}
          >
            {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {authMode === 'setup' && (
        <div>
          <Label htmlFor="confirmPin">Confirm PIN</Label>
          <Input
            id="confirmPin"
            type={showPin ? 'text' : 'password'}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Confirm your PIN"
            maxLength={6}
          />
        </div>
      )}

      <Button
        onClick={handlePinAuth}
        disabled={isLoading || pin.length < 4 || (authMode === 'setup' && confirmPin.length < 4)}
        className="w-full"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {authMode === 'setup' ? 'Setting up...' : 'Authenticating...'}
          </div>
        ) : (
          authMode === 'setup' ? 'Create Vault' : 'Unlock Vault'
        )}
      </Button>
    </div>
  );

  const renderPatternAuth = () => (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          {authMode === 'setup' 
            ? (pattern.length === 0 ? 'Draw your unlock pattern' : 'Confirm your pattern')
            : 'Draw your unlock pattern'
          }
        </p>
      </div>
      
      <PatternLock
        onPatternComplete={handlePatternAuth}
        disabled={isLoading}
      />
      
      {authMode === 'setup' && pattern.length > 0 && (
        <Button
          variant="outline"
          onClick={() => {
            setPattern([]);
            toast({
              title: "Pattern Reset",
              description: "Draw your pattern again."
            });
          }}
          className="w-full"
        >
          Reset Pattern
        </Button>
      )}
    </div>
  );

  const renderBiometricAuth = () => (
    <div className="space-y-4">
      {biometricTypes.length > 0 && (
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Available biometric methods:
          </p>
          <div className="flex justify-center gap-2">
            {biometricTypes.map((type, index) => (
              <Badge key={index} variant="outline">
                {type}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {authMode === 'setup' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Set up a PIN first as a fallback method, then enable biometric authentication.
          </AlertDescription>
        </Alert>
      )}

      <BiometricAuthButton 
        onSuccess={handleBiometricSuccess}
        disabled={isLoading || (authMode === 'setup' && !pin)}
      />

      {authMode === 'setup' && !pin && (
        <Button
          variant="outline"
          onClick={() => setAuthMethod('pin')}
          className="w-full"
        >
          Set up PIN first
        </Button>
      )}
    </div>
  );

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {authMode === 'setup' ? 'Secure Your Vault' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {authMode === 'setup' 
              ? 'Set up your authentication method to secure your files'
              : 'Unlock your vault to access your secure files'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {renderAuthMethodSelector()}
          
          <Separator />

          {authMethod === 'pin' && renderPinAuth()}
          {authMethod === 'pattern' && renderPatternAuth()}
          {authMethod === 'biometric' && renderBiometricAuth()}

          {authMode === 'login' && hasStoredCredentials && (
            <div className="text-center">
              <Button
                variant="link"
                onClick={() => setAuthMode('setup')}
                className="text-sm text-muted-foreground"
              >
                Set up new authentication method
              </Button>
            </div>
          )}

          {biometricAvailable && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Biometric authentication available</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
