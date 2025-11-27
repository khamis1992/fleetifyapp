# Mobile App Build Guide - Fleetify

This document explains how to build mobile applications (APK/IPA files) from the Fleetify React web application.

## Overview

Fleetify is primarily a React web application built with Vite. To generate mobile apps (APK for Android, IPA for iOS), we use **Capacitor** to wrap the web app as a native mobile application.

## Prerequisites

### For Android APK Building:
- Node.js and npm
- Android Studio (with Android SDK)
- Java Development Kit (JDK) 17+
- Gradle

### For iOS IPA Building:
- macOS
- Xcode
- iOS development certificates

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build APK (Automated)
```bash
npm run build:apk
```

This will:
1. Build the web application
2. Initialize Capacitor Android project (if needed)
3. Sync web assets with the mobile project
4. Build the Android APK
5. Copy the APK to: `build/app/outputs/flutter-apk/app-release.apk`

## Manual Build Process

### Step 1: Build Web Application
```bash
npm run build
```

### Step 2: Initialize Capacitor (First Time Only)
```bash
# Add Android platform
npx cap add android

# Add iOS platform (macOS only)
npx cap add ios
```

### Step 3: Sync Web Assets
```bash
npx cap sync
```

### Step 4: Build Mobile Apps

#### For Android APK:
```bash
npx cap build android
```

#### For iOS:
```bash
npx cap build ios
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build:apk` | Complete APK build process |
| `npm run build:mobile` | Build web app and sync with mobile |
| `npm run android:build` | Build Android app |
| `npm run android:run` | Build and run on Android device |
| `npm run ios:build` | Build iOS app |
| `npm run ios:run` | Build and run on iOS device |
| `npm run mobile:sync` | Sync web assets with mobile projects |
| `npm run mobile:open:android` | Open Android project in Android Studio |
| `npm run mobile:open:ios` | Open iOS project in Xcode |

## Output Locations

### APK Files:
- **Expected Location**: `build/app/outputs/flutter-apk/app-release.apk`
- **Capacitor Android Location**: `android/app/build/outputs/apk/release/app-release.apk`

### IPA Files:
- **Capacitor iOS Location**: `ios/App/build/`

## Configuration

### Capacitor Configuration
The mobile app configuration is defined in `capacitor.config.ts`:

```typescript
{
  appId: 'com.fleetify.app',
  appName: 'Fleetify',
  webDir: 'dist',
  // ... other settings
}
```

### Android Specific Settings
- **Package Name**: `com.fleetify.app`
- **Build Type**: APK (can be changed to AAB for Play Store)
- **Target SDK**: Latest stable Android SDK

## Troubleshooting

### APK Not Found
If the APK is not created at the expected location:

1. Check if Android Studio and SDK are properly installed
2. Verify Java/JDK version compatibility
3. Run with verbose logging: `npx cap build android --verbose`
4. Check Android project manually: `npm run mobile:open:android`

### Build Errors
Common solutions:
- Clean and rebuild: `npx cap clean android && npx cap build android`
- Update Capacitor: `npm update @capacitor/cli @capacitor/core @capacitor/android`
- Sync assets: `npx cap sync android`

### First Time Setup
For first-time setup on a new machine:
1. Install Android Studio
2. Install Android SDK and build tools
3. Set up environment variables (ANDROID_HOME, PATH)
4. Accept Android SDK licenses: `sdkmanager --licenses`

## Development Workflow

### For Active Development:
1. Make changes to React code in `src/`
2. Test in browser: `npm run dev`
3. Build and test on device: `npm run android:run`

### For Release:
1. Build production web app: `npm run build`
2. Test web build: `npm run preview`
3. Build APK: `npm run build:apk`
4. Test APK on device before distribution

## Notes

- The APK will be a debug build by default
- For release builds, you'll need to configure signing keys
- The app requires internet connectivity as it connects to Supabase backend
- Icons and splash screens can be configured in the Android project