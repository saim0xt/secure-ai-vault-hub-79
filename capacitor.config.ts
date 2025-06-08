
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.a8ba5324253f4fe881f605074c4abc05',
  appName: 'Vaultix Secure Vault',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    AdMob: {
      appId: "ca-app-pub-3940256099942544~3347511713",
      testingDevices: []
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1a1a1a",
      showSpinner: false
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#1a1a1a"
    }
  }
};

export default config;
