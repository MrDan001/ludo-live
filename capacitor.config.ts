import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ludolive.app',
  appName: 'Ludo Live',
  webDir: 'public',
  server: {
    url: 'https://ludo-live.vercel.app',
    cleartext: false,
  },
};

export default config;