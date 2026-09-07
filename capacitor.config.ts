import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'live.ludo.app',
  appName: 'Ludo Live',
  webDir: 'public',
  server: {
    url: 'https://ludo-live.up.railway.app',
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
