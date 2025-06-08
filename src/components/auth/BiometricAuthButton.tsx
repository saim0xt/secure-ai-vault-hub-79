
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Eye, Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BiometricService } from '../../services/BiometricService';

interface BiometricAuthButtonProps {
  onSuccess: () => void;
  disabled?: boolean;
}

const BiometricAuthButton: React.FC<BiometricAuthButtonProps> = ({ onSuccess, disabled = false }) => {
  const { toast } = useToast();
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const capabilities = await BiometricService.getInstance().checkCapabilities();
      setIsAvailable(capabilities.isAvailable);
      setBiometricType(capabilities.biometryTypes[0]?.toString() || '');
    } catch (error) {
      console.error('Failed to check biometric capabilities:', error);
      setIsAvailable(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (!isAvailable || disabled) return;

    setIsAuthenticating(true);
    try {
      const result = await BiometricService.getInstance().authenticate(
        'Authenticate to access your vault'
      );

      if (result.success) {
        toast({
          title: "Authentication successful",
          description: "Welcome back to your secure vault.",
        });
        onSuccess();
      } else {
        toast({
          title: "Authentication failed",
          description: result.error || "Biometric authentication failed. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      toast({
        title: "Authentication error",
        description: "An error occurred during biometric authentication.",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const getBiometricIcon = () => {
    switch (biometricType.toLowerCase()) {
      case 'face':
      case 'faceauth':
        return <Eye className="h-5 w-5" />;
      case 'fingerprint':
      case 'touchid':
        return <Fingerprint className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getBiometricLabel = () => {
    switch (biometricType.toLowerCase()) {
      case 'face':
      case 'faceauth':
        return 'Face Unlock';
      case 'fingerprint':
      case 'touchid':
        return 'Fingerprint Unlock';
      default:
        return 'Biometric Unlock';
    }
  };

  if (!isAvailable) {
    return (
      <div className="flex items-center justify-center p-4 border border-dashed border-border rounded-lg">
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Biometric authentication not available</p>
          <Badge variant="outline" className="text-xs">Setup required</Badge>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handleBiometricAuth}
      disabled={disabled || isAuthenticating}
      className="w-full h-16 text-lg relative overflow-hidden group"
      variant="default"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-center justify-center gap-3">
        {getBiometricIcon()}
        <span>{isAuthenticating ? 'Authenticating...' : getBiometricLabel()}</span>
      </div>
    </Button>
  );
};

export default BiometricAuthButton;
