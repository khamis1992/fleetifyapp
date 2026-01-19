#!/bin/bash

# Fleetify Mobile Build Script
# This script builds the APK file for Android deployment

set -e

echo "🚀 Starting Fleetify Mobile Build Process..."

# Check if required tools are installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npm/npx is required but not installed."
    exit 1
fi

# Create build directory structure
echo "📁 Creating build directory structure..."
mkdir -p build/app/outputs/flutter-apk

# Build the web application
echo "🔨 Building web application..."
npm run build

# Check if Capacitor is initialized
if [ ! -d "android" ]; then
    echo "🔧 Initializing Capacitor for Android..."
    npx cap add android
fi

# Sync web assets with mobile project
echo "🔄 Syncing web assets with mobile project..."
npx cap sync android

# Build the Android APK
echo "📱 Building Android APK..."
npx cap build android

# Copy APK to expected location
echo "📋 Copying APK to expected location..."
if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
    cp android/app/build/outputs/apk/release/app-release.apk build/app/outputs/flutter-apk/app-release.apk
    echo "✅ APK successfully created at: build/app/outputs/flutter-apk/app-release.apk"
elif [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
    cp android/app/build/outputs/apk/debug/app-debug.apk build/app/outputs/flutter-apk/app-release.apk
    echo "✅ Debug APK copied as release APK at: build/app/outputs/flutter-apk/app-release.apk"
else
    echo "❌ Error: APK file not found in expected Android build output locations"
    echo "🔍 Checking for APK files in android directory..."
    find android -name "*.apk" -type f 2>/dev/null || echo "No APK files found"
    exit 1
fi

echo "🎉 Build completed successfully!"
echo "📍 APK Location: build/app/outputs/flutter-apk/app-release.apk"