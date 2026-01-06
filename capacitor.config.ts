import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alaraf.fleetify',
  appName: 'Fleetify - فليتفاي',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      '*'
    ]
  },
  android: {
    buildOptions: {
      releaseType: 'APK'
    },
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'automatic',
    cordovaLink: 'public',
    handleApplicationActivities: true,
    handleNotifications: true,
    handleLocalNotifications: true,
    appendUserAgent: 'FleetifyMobile/1.0'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#3b82f6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#3b82f6'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#3b82f6'
    },
    Keyboard: {
      resize: 'ionic',
      style: 'DARK',
      resizeOnFullScreen: true
    },
    Camera: {
      permissions: ['camera', 'photos']
    },
    Geolocation: {
      permissions: ['location']
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;