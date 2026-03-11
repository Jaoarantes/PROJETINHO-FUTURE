import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.future.fit',
  appName: 'future-fit',
  webDir: 'dist',
  android: {
    // Allow camera access for barcode scanner
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
