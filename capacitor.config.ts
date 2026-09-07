import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'live.ludo.app',
  appName: 'Ludo Live',
  webDir: 'public',
  appendUserAgent: 'LudoLiveApp/1',
  server: {
    url: 'https://ludo-live.up.railway.app',
    cleartext: false
  },
  android: {
    allowMixedContent: false,
    appendUserAgent: 'LudoLiveApp/1'
  }
};

export default config;
