
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.a8ba5324253f4fe881f605074c4abc05',
  appName: 'secure-ai-vault-hub-21',
  webDir: 'dist',
  server: {
    url: 'https://a8ba5324-253f-4fe8-81f6-05074c4abc05.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    AdMob: {
      appId: "ca-app-pub-3940256099942544~3347511713",
      testingDevices: ["2077ef9a63d2b398840261c8221a0c9b"]
    }
  }
};

export default config;
