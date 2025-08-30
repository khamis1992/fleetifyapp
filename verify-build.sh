#!/bin/bash

# Build verification script for Fleetify mobile app
# This script checks if the APK was created successfully

echo "🔍 Checking for APK file..."

APK_PATH="build/app/outputs/flutter-apk/app-release.apk"

if [ -f "$APK_PATH" ]; then
    echo "✅ APK found at: $APK_PATH"
    
    # Get file size
    SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
    echo "📦 APK Size: $SIZE"
    
    # Get file timestamp
    TIMESTAMP=$(ls -l "$APK_PATH" | awk '{print $6, $7, $8}')
    echo "🕒 Created: $TIMESTAMP"
    
    echo ""
    echo "🎉 Build verification successful!"
    echo "📱 Your APK is ready for installation on Android devices."
    echo ""
    echo "Next steps:"
    echo "  1. Transfer the APK to your Android device"
    echo "  2. Enable 'Install from unknown sources' on your device"
    echo "  3. Install the APK file"
    echo ""
else
    echo "❌ APK not found at expected location: $APK_PATH"
    echo ""
    echo "🔍 Checking for APK files in other locations..."
    
    # Check Android build outputs
    if [ -d "android" ]; then
        echo "Android project found, checking build outputs:"
        find android -name "*.apk" -type f 2>/dev/null | while read -r apk; do
            echo "  Found: $apk"
        done
    else
        echo "No Android project found. Run 'npm run build:apk' first."
    fi
    
    echo ""
    echo "💡 To create the APK, run:"
    echo "   npm run build:apk"
    
    exit 1
fi