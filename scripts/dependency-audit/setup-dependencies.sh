#!/bin/bash
# Dependency Audit Setup Script
# This script sets up the dependency audit infrastructure

set -e

echo "================================================"
echo "Fleetify Dependency Audit Setup"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed or not in PATH${NC}"
    echo "Please install Node.js and npm first"
    exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""

# Install npm-check-updates globally
echo -e "${YELLOW}Installing npm-check-updates...${NC}"
npm install -g npm-check-updates
echo -e "${GREEN}✓ npm-check-updates installed${NC}"
echo ""

# Create package-lock.json if it doesn't exist
if [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}Creating package-lock.json...${NC}"
    npm install
    echo -e "${GREEN}✓ package-lock.json created${NC}"
else
    echo -e "${GREEN}✓ package-lock.json already exists${NC}"
fi
echo ""

# Create audit reports directory
echo -e "${YELLOW}Creating audit reports directory...${NC}"
mkdir -p scripts/dependency-audit/reports
echo -e "${GREEN}✓ Reports directory created${NC}"
echo ""

# Create backup directory
echo -e "${YELLOW}Creating backup directory...${NC}"
mkdir -p scripts/dependency-audit/backups
echo -e "${GREEN}✓ Backup directory created${NC}"
echo ""

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Run: ./scripts/dependency-audit/generate-reports.sh"
echo "2. Review reports in: ./scripts/dependency-audit/reports/"
echo "3. Execute updates using: ./scripts/dependency-audit/update-dependencies.sh"
