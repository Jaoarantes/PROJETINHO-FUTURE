import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.valere.app',
  appName: 'Valere',
  webDir: 'dist',
  android: {
    webContentsDebuggingEnabled: false,
  },
  server: {
    // Aponta para a URL de deploy na Vercel.
    // O APK carrega o app direto do servidor, assim toda atualização
    // no código é refletida sem precisar rebuildar o APK.
    // Troque pela sua URL real da Vercel:
    url: 'https://valere.vercel.app',
    androidScheme: 'https',
    iosScheme: 'https',
  },
};

export default config;
