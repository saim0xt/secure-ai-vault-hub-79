
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.602d23af33ed46c5b0aba830e22b270d',
  appName: 'Vaultix - Secure Vault',
  webDir: 'dist',
  server: {
    url: 'https://602d23af-33ed-46c5-b0ab-a830e22b270d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    backgroundColor: '#000000',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    appendUserAgent: 'Vaultix/1.0',
    overrideUserAgent: 'Vaultix Android App',
    flavor: 'main',
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
    BiometricAuth: {
      allowDeviceCredential: true
    },
    DeviceMotion: {
      accelInterval: 100
    }
  },
};

export default config;
