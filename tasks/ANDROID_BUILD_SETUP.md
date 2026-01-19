# Android Build Setup Guide

**Created:** 2025-10-25
**Status:** 🔧 Setup Required
**Estimated Time:** 30-45 minutes

---

## ✅ Critical Security Fix Applied

**COMPLETED:** Removed `SUPABASE_SERVICE_ROLE_KEY` from `.env` file

The service role key has been successfully removed from the frontend environment file. This key provides admin-level access to your Supabase database and should NEVER be exposed in frontend code.

**What was changed:**
- ✅ Removed `SUPABASE_SERVICE_ROLE_KEY` from `.env`
- ✅ Added security comment explaining the removal
- ✅ Frontend now uses only the public anon key (safe for client-side)

**Important:** If you need the service role key for backend operations, store it in:
1. Backend server environment variables (Node.js, Python, etc.)
2. Supabase Edge Functions secrets
3. CI/CD secret management (GitHub Actions, Vercel, etc.)

---

## 🔴 Required: Java JDK Installation

**Current Status:** ❌ Java JDK NOT INSTALLED

To build Android APKs, you must install Java Development Kit (JDK) version 17 or higher.

### Step 1: Download Java JDK

**Recommended:** Eclipse Temurin (AdoptOpenJDK)

**Download Link:** https://adoptium.net/

**Select:**
- Version: **JDK 17 (LTS)** or **JDK 21 (LTS)**
- Operating System: **Windows**
- Architecture: **x64**

**Alternative Sources:**
- Oracle JDK: https://www.oracle.com/java/technologies/downloads/#java17
- Amazon Corretto: https://aws.amazon.com/corretto/

### Step 2: Install Java JDK

1. **Run the downloaded installer** (e.g., `OpenJDK17U-jdk_x64_windows_hotspot_17.0.x.msi`)
2. **Select installation directory:**
   - Default: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x\`
   - Remember this path - you'll need it for Step 3
3. **Complete the installation**
4. **Verify installation:**
   ```cmd
   java -version
   ```

   Expected output:
   ```
   openjdk version "17.0.x" 2024-xx-xx
   OpenJDK Runtime Environment Temurin-17.0.x+x (build 17.0.x+x)
   OpenJDK 64-Bit Server VM Temurin-17.0.x+x (build 17.0.x+x, mixed mode, sharing)
   ```

### Step 3: Set Environment Variables

#### Option A: Using Windows Settings (Recommended)

1. **Open System Environment Variables:**
   - Press `Windows + R`
   - Type `sysdm.cpl` and press Enter
   - Click **"Advanced"** tab
   - Click **"Environment Variables"** button

2. **Add JAVA_HOME (System Variable):**
   - Under "System variables", click **"New"**
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x`
     (Replace `x.x` with your actual version)
   - Click **OK**

3. **Update PATH:**
   - Under "System variables", find **PATH**
   - Click **"Edit"**
   - Click **"New"**
   - Add: `%JAVA_HOME%\bin`
   - Click **OK** on all dialogs

4. **Verify:**
   - **Close and reopen** your terminal/command prompt
   - Run:
     ```cmd
     echo %JAVA_HOME%
     java -version
     javac -version
     ```

#### Option B: Using PowerShell (Quick Setup)

Run PowerShell **as Administrator**:

```powershell
# Set JAVA_HOME (replace with your actual path)
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.0.13", "Machine")

# Add to PATH
$path = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
$newPath = $path + ";%JAVA_HOME%\bin"
[System.Environment]::SetEnvironmentVariable("PATH", $newPath, "Machine")

# Verify
$env:JAVA_HOME
java -version
```

**Important:** Close and reopen your terminal after setting environment variables.

---

## 🟡 Optional: Android SDK Installation

**Current Status:** ⚠️ Android SDK not detected (not required for basic builds)

For basic APK builds, **Gradle will download required Android SDK components automatically**.

However, for advanced features (emulator, debugging, native development), you can install Android Studio:

### Install Android Studio (Optional)

1. **Download:** https://developer.android.com/studio
2. **Install Android Studio**
3. **During setup, ensure these components are selected:**
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (for emulator)
4. **Set ANDROID_HOME environment variable:**
   ```
   Variable: ANDROID_HOME
   Value: C:\Users\[YourUsername]\AppData\Local\Android\Sdk
   ```

---

## 🚀 Build Your First APK

Once Java JDK is installed and environment variables are set, follow these steps:

### Step 1: Sync Capacitor

```bash
npm run build:mobile
```

This command:
1. Builds the web app (`npm run build`)
2. Syncs assets to Android (`npx cap sync`)

Expected output:
```
✔ Building web app...
✔ Copying web assets from dist to android\app\src\main\assets\public in 4.38s
✔ Updating Android plugins in 58.85ms
```

### Step 2: Build Debug APK

```bash
cd android
.\gradlew.bat assembleDebug
```

**First Build Notes:**
- First build will take **5-10 minutes** (downloading Gradle, Android SDK components)
- Subsequent builds: **1-2 minutes**
- Build output: `android/app/build/outputs/apk/debug/app-debug.apk`

Expected output:
```
BUILD SUCCESSFUL in 2m 15s
45 actionable tasks: 45 executed
```

### Step 3: Locate Your APK

**APK Location:**
```
android\app\build\outputs\apk\debug\app-debug.apk
```

**APK Size:** Approximately 15-20 MB (debug build)

### Step 4: Install on Android Device

#### Option A: USB Debugging

1. Enable **Developer Options** on your Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options
   - Enable **USB Debugging**

2. Connect your device via USB

3. Install the APK:
   ```bash
   adb install android\app\build\outputs\apk\debug\app-debug.apk
   ```

#### Option B: File Transfer

1. Copy `app-debug.apk` to your Android device (via USB, email, cloud storage)
2. On your device, tap the APK file
3. Allow installation from unknown sources if prompted
4. Install the app

---

## 📱 Build Release APK (For Production)

**Note:** Release builds require a signing keystore.

### Step 1: Generate Keystore

```bash
keytool -genkey -v -keystore fleetify-release-key.keystore -alias fleetify -keyalg RSA -keysize 2048 -validity 10000
```

**Prompts:**
- Enter keystore password: [Choose a secure password]
- Re-enter password: [Same password]
- What is your first and last name? [Your name or company name]
- What is the name of your organizational unit? [e.g., Development]
- What is the name of your organization? [Your company name]
- What is the name of your City or Locality? [Your city]
- What is the name of your State or Province? [Your state]
- What is the two-letter country code? [e.g., QA, SA, AE]
- Is this correct? yes

**IMPORTANT:**
- **DO NOT commit keystore to Git**
- **Store keystore and passwords securely**
- **Backup keystore** (you cannot recover it if lost)

### Step 2: Configure Signing in Capacitor

Edit `capacitor.config.ts`:

```typescript
android: {
  buildOptions: {
    keystorePath: 'path/to/fleetify-release-key.keystore',
    keystorePassword: 'YOUR_KEYSTORE_PASSWORD',
    keystoreAlias: 'fleetify',
    keystoreAliasPassword: 'YOUR_ALIAS_PASSWORD',
    releaseType: 'APK'  // or 'AAB' for App Bundle
  }
}
```

**Better approach (using environment variables):**

Create `android/keystore.properties`:
```properties
storeFile=path/to/fleetify-release-key.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=fleetify
keyPassword=YOUR_ALIAS_PASSWORD
```

Add to `.gitignore`:
```
android/keystore.properties
*.keystore
```

### Step 3: Build Release APK

```bash
cd android
.\gradlew.bat assembleRelease
```

**Release APK Location:**
```
android\app\build\outputs\apk\release\app-release.apk
```

**Expected Size:** 8-12 MB (ProGuard optimized)

---

## 🏪 Prepare for Google Play Store

### App Bundle (Recommended for Play Store)

Google Play prefers **Android App Bundles (AAB)** over APKs:

```bash
# Build App Bundle
cd android
.\gradlew.bat bundleRelease
```

**Bundle Location:**
```
android\app\build\outputs\bundle\release\app-release.aab
```

**Benefits:**
- Smaller download size for users (Play Store optimizes per-device)
- Required for new apps on Play Store (since August 2021)

### Play Store Requirements Checklist

- [ ] App signed with release keystore
- [ ] Version code incremented in `android/app/build.gradle`
- [ ] Version name updated (e.g., 1.0.0 → 1.0.1)
- [ ] App icon and splash screen configured
- [ ] App tested on multiple devices
- [ ] Privacy policy URL ready
- [ ] Screenshots prepared (phone + tablet)
- [ ] Feature graphic (1024x500)
- [ ] Short description (80 characters max)
- [ ] Full description (4000 characters max)
- [ ] Content rating completed

---

## 🧪 Testing Checklist

Before releasing, test these scenarios:

### Functionality
- [ ] App launches without crashing
- [ ] Login/authentication works
- [ ] Main features functional (contracts, customers, vehicles)
- [ ] Forms submit correctly
- [ ] Camera/file uploads work
- [ ] Network requests succeed
- [ ] Offline mode works (if implemented)

### UI/UX
- [ ] All pages responsive on small screens (320px)
- [ ] Touch targets are 44x44px minimum
- [ ] No horizontal scrolling issues
- [ ] Text is readable (no tiny fonts)
- [ ] Buttons are easy to tap
- [ ] Navigation works smoothly

### Performance
- [ ] App loads in <3 seconds on 4G
- [ ] Large lists scroll smoothly (60fps)
- [ ] No memory leaks on long usage
- [ ] Battery usage is reasonable

### Security
- [ ] HTTPS for all API calls
- [ ] No sensitive data in logs
- [ ] Proper permission handling
- [ ] Secure storage for tokens

---

## 📊 Build Size Optimization

### Current Size Analysis

**Debug APK:** ~15-20 MB
**Release APK:** ~8-12 MB (with ProGuard)
**App Bundle:** ~5-8 MB (optimized per device)

### Reduce APK Size

**1. Enable ProGuard (Minification)**

Already configured in `android/app/build.gradle`:
```gradle
buildTypes {
    release {
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

**2. Enable R8 (Code Shrinking)**

In `gradle.properties`:
```properties
android.enableR8.fullMode=true
```

**3. Split APKs by Architecture**

In `android/app/build.gradle`:
```gradle
android {
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
            universalApk true
        }
    }
}
```

This generates separate APKs for each CPU architecture, reducing size by ~30-40%.

---

## 🐛 Troubleshooting

### "JAVA_HOME is not set"

**Solution:**
1. Verify Java is installed: `java -version`
2. Set JAVA_HOME environment variable (see Step 3 above)
3. **Close and reopen your terminal**
4. Verify: `echo %JAVA_HOME%`

### "SDK location not found"

**Solution:**

Create `android/local.properties`:
```properties
sdk.dir=C\:\\Users\\[YourUsername]\\AppData\\Local\\Android\\Sdk
```

Or let Gradle download SDK automatically (no action needed).

### "Execution failed for task ':app:processDebugResources'"

**Solution:**
```bash
cd android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

### APK install fails on device

**Reasons:**
- Signature mismatch (previous version installed with different signature)
- Insufficient storage
- Installation from unknown sources blocked

**Solution:**
1. Uninstall previous version
2. Enable "Install from unknown sources" in device settings
3. Try again

---

## 📝 Next Steps After Successful Build

Once your APK builds successfully:

1. **Test on Real Devices**
   - Test on at least 3 different Android versions (API 29, 31, 33+)
   - Test on small, medium, and large screens
   - Test on low-end devices (2GB RAM)

2. **Implement Performance Optimizations**
   - Icon tree-shaking (-400KB)
   - Lazy loading (-1.4MB)
   - Service worker for offline support
   - See `tasks/performance-quick-wins.md`

3. **Add Crash Reporting**
   - Setup Sentry or Firebase Crashlytics
   - Monitor production errors
   - Track performance metrics

4. **Prepare for Production Release**
   - Generate release keystore (secure storage)
   - Build signed release APK/AAB
   - Complete Play Store listing
   - Submit for review

---

## 📚 Additional Resources

**Capacitor Documentation:**
- Android Guide: https://capacitorjs.com/docs/android
- Building Android Apps: https://capacitorjs.com/docs/android/building

**Android Developer Documentation:**
- Build Your App: https://developer.android.com/studio/build
- Sign Your App: https://developer.android.com/studio/publish/app-signing
- Publish to Play Store: https://developer.android.com/distribute

**Gradle Documentation:**
- Gradle Build Tool: https://gradle.org/guides/
- Android Gradle Plugin: https://developer.android.com/build

---

## ✅ Summary

**Completed:**
- ✅ CRITICAL security fix (service role key removed)
- ✅ Android platform initialized
- ✅ Gradle build system configured

**Next Actions:**
1. **Install Java JDK 17** (30 minutes)
2. **Set JAVA_HOME environment variable** (5 minutes)
3. **Build your first APK** (10 minutes)
4. **Test on Android device** (15 minutes)

**Total Time:** ~60 minutes to first working APK

---

**Document Version:** 1.0
**Last Updated:** 2025-10-25
**Created By:** Claude Code AI Assistant
**Status:** Ready to use - follow steps above
