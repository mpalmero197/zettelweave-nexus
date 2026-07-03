import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.4eb34d34fd9d491db4fe83f99b554cfb',
  appName: 'bakuscribe',
  webDir: 'dist',
  // Hot-reload from the Lovable sandbox during development.
  // IMPORTANT: Remove or comment the `server` block before building the release .aab for Play upload.
  server: {
    url: 'https://4eb34d34-fd9d-491d-b4fe-83f99b554cfb.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    backgroundColor: '#0A0A14',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0A0A14',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0A14',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
