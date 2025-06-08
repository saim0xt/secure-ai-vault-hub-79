
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.3ad7fd016f6b4a818b94171a13ae9afc',
  appName: 'secure-ai-vault-hub-19',
  webDir: 'dist',
  server: {
    url: 'https://3ad7fd01-6f6b-4a81-8b94-171a13ae9afc.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    NativeSecurity: {
      class: 'app.lovable.plugins.NativeSecurityPlugin'
    },
    SecureStorage: {
      class: 'app.lovable.plugins.SecureStoragePlugin'  
    }
  }
};

export default config;
