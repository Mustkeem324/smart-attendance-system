import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apex.electronics.distribution',
  appName: 'APEX Electronics',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    cleartext: true
  }
};

export default config;
