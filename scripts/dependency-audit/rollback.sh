#!/bin/bash
# Rollback Script
# Safely rollback dependency updates

set -e

BACKUP_DIR="./scripts/dependency-audit/backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "================================================"
echo "Fleetify Dependency Rollback"
echo "================================================"
echo ""

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}Error: Backup directory not found${NC}"
    echo "No backups available to rollback"
    exit 1
fi

# Function to list available backups
list_backups() {
    echo -e "${BLUE}Available backups:${NC}"
    echo ""
    ls -lt "$BACKUP_DIR" | grep "package.json" | awk '{print $9}' | sed 's/package.json.//' | sort -r
}

# Get timestamp from argument or show list
TIMESTAMP=$1

if [ -z "$TIMESTAMP" ]; then
    echo "Usage: $0 <timestamp>"
    echo ""
    list_backups
    echo ""
    echo "Example: $0 20251012_143022"
    exit 1
fi

# Check if backup exists
if [ ! -f "$BACKUP_DIR/package.json.${TIMESTAMP}" ]; then
    echo -e "${RED}Error: Backup not found for timestamp: $TIMESTAMP${NC}"
    echo ""
    list_backups
    exit 1
fi

echo -e "${YELLOW}Rolling back to: $TIMESTAMP${NC}"
echo ""

# Show what will be restored
echo -e "${BLUE}Backup files:${NC}"
if [ -f "$BACKUP_DIR/package.json.${TIMESTAMP}" ]; then
    echo "  ✓ package.json.${TIMESTAMP}"
fi
if [ -f "$BACKUP_DIR/package-lock.json.${TIMESTAMP}" ]; then
    echo "  ✓ package-lock.json.${TIMESTAMP}"
fi
echo ""

# Confirm rollback
read -p "Are you sure you want to rollback? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Create backup of current state before rollback
ROLLBACK_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo -e "${YELLOW}Creating backup of current state...${NC}"
cp package.json "$BACKUP_DIR/package.json.pre-rollback-${ROLLBACK_TIMESTAMP}" 2>/dev/null || true
cp package-lock.json "$BACKUP_DIR/package-lock.json.pre-rollback-${ROLLBACK_TIMESTAMP}" 2>/dev/null || true
echo -e "${GREEN}✓ Current state backed up${NC}"
echo ""

# Restore package.json
echo -e "${YELLOW}Restoring package.json...${NC}"
cp "$BACKUP_DIR/package.json.${TIMESTAMP}" package.json
echo -e "${GREEN}✓ package.json restored${NC}"

# Restore package-lock.json if exists
if [ -f "$BACKUP_DIR/package-lock.json.${TIMESTAMP}" ]; then
    echo -e "${YELLOW}Restoring package-lock.json...${NC}"
    cp "$BACKUP_DIR/package-lock.json.${TIMESTAMP}" package-lock.json
    echo -e "${GREEN}✓ package-lock.json restored${NC}"
fi
echo ""

# Reinstall dependencies
echo -e "${YELLOW}Reinstalling dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✓ Dependencies reinstalled${NC}"
else
    echo -e "${RED}✗ Failed to reinstall dependencies${NC}"
    echo ""
    echo "Attempting to restore pre-rollback state..."
    cp "$BACKUP_DIR/package.json.pre-rollback-${ROLLBACK_TIMESTAMP}" package.json
    cp "$BACKUP_DIR/package-lock.json.pre-rollback-${ROLLBACK_TIMESTAMP}" package-lock.json 2>/dev/null || true
    npm install
    exit 1
fi
echo ""

# Validate rollback
echo -e "${BLUE}=== Validating rollback ===${NC}"
if npm run build > /tmp/rollback-build-${ROLLBACK_TIMESTAMP}.log 2>&1; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    echo "Check log: /tmp/rollback-build-${ROLLBACK_TIMESTAMP}.log"
    exit 1
fi
echo ""

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Rollback Completed Successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Rolled back to: $TIMESTAMP"
echo "Pre-rollback backup: ${ROLLBACK_TIMESTAMP}"
echo ""
echo "Next steps:"
echo "1. Test the application: npm run dev"
echo "2. Verify functionality"
echo "3. Review what went wrong with the update"
