import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.doinow.app',
  appName: 'Doinow',
  webDir: 'dist',
  androidScheme: 'https',
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#7c3aed',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#7c3aed',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7c3aed',
    },
  },
};

export default config;
