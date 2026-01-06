# Android APK Build via GitHub Actions

This workflow automatically builds Android APKs on push to main/develop or when creating tags.

## 🚀 Quick Start

### Trigger a Build

**Option 1: Push to main/develop**
```bash
git push origin main
```

**Option 2: Create a release tag**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Option 3: Manual trigger**
1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/build-android-apk.yml`
2. Click "Run workflow"
3. Choose build type: `debug` or `release`

## 🔐 Setup Release Signing (Optional)

For signed release APKs, add these secrets in GitHub:

### Step 1: Generate Keystore

```bash
keytool -genkey -v -keystore release.keystore -alias fleetify -keyalg RSA -keysize 2048 -validity 10000
```

### Step 2: Add GitHub Secrets

Go to: `Settings → Secrets and variables → Actions`

| Secret Name | Description |
|------------|-------------|
| `ANDROID_KEYSTORE_FILE` | Base64 encoded keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias (e.g., `fleetify`) |
| `ANDROID_KEY_PASSWORD` | Key password (usually same as keystore) |

### Step 3: Encode Keystore

```bash
# On Linux/Mac
base64 -i release.keystore | pbcopy

# On Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore")) | Set-Clipboard
```

Paste the output as `ANDROID_KEYSTORE_FILE` secret.

## 📦 Download APK

**After build completes:**
1. Go to the workflow run
2. Scroll to "Artifacts" section
3. Download `fleetify-debug-apk` or `fleetify-release-apk`

**For tagged releases:**
- APKs are automatically attached to the GitHub Release

## 🔧 Build Locally (Alternative)

```bash
# Debug APK
npm run android:build

# Release APK (requires keystore setup)
cd android
./gradlew assembleRelease
```

## 📱 Install APK

**On Android device:**
1. Download APK to device
2. Enable "Install from unknown sources" in settings
3. Open the APK file to install

**Via ADB:**
```bash
adb install app-debug.apk
```

## ⚙️ Configuration

Edit `.github/workflows/build-android-apk.yml` to customize:
- Build variants
- APK naming
- Retention period
- Trigger branches

## 🐛 Troubleshooting

**Build fails:**
- Check that `android/` folder exists and has been synced with `npx cap sync android`

**Keystore errors:**
- Verify all secrets are set correctly
- Ensure keystore password matches

**APK won't install:**
- Try the debug APK first
- Check Android version compatibility
- Enable installation from unknown sources
