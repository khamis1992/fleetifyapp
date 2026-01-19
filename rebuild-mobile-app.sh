#!/bin/bash

# Fleetify Mobile App Rebuild Script
# This script rebuilds the mobile app with the latest fixes

set -e  # Exit on error

echo "=========================================="
echo "Fleetify Mobile App Rebuild Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "capacitor.config.ts" ]; then
    echo -e "${RED}Error: capacitor.config.ts not found!${NC}"
    echo "Please run this script from the root of the fleetifyapp directory."
    exit 1
fi

echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
npm install || pnpm install || yarn install

echo ""
echo -e "${BLUE}Step 2: Building the web app...${NC}"
npm run build || pnpm build || yarn build

echo ""
echo -e "${BLUE}Step 3: Syncing with Capacitor...${NC}"
npx cap sync android

echo ""
echo -e "${GREEN}✓ Build preparation complete!${NC}"
echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "To build the APK, choose one of the following methods:"
echo ""
echo -e "${YELLOW}Method 1: Using Android Studio (Recommended)${NC}"
echo "  1. Run: npx cap open android"
echo "  2. In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)"
echo "  3. Find APK in: android/app/build/outputs/apk/"
echo ""
echo -e "${YELLOW}Method 2: Using Command Line${NC}"
echo "  For debug build:"
echo "    cd android && ./gradlew assembleDebug"
echo ""
echo "  For release build (signed):"
echo "    cd android && ./gradlew assembleRelease"
echo ""
echo -e "${GREEN}✓ After building, install the new APK on your device!${NC}"
echo ""
