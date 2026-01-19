#!/bin/bash
# Automated Dependency Update Script
# Safely updates dependencies based on classification

set -e

BACKUP_DIR="./scripts/dependency-audit/backups"
REPORTS_DIR="./scripts/dependency-audit/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "================================================"
echo "Fleetify Automated Dependency Update"
echo "================================================"
echo "Timestamp: $TIMESTAMP"
echo ""

# Check prerequisites
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

if ! command -v ncu &> /dev/null; then
    echo -e "${RED}Error: npm-check-updates is not installed${NC}"
    echo "Run: npm install -g npm-check-updates"
    exit 1
fi

# Function to create backup
create_backup() {
    echo -e "${YELLOW}Creating backup...${NC}"
    mkdir -p "$BACKUP_DIR"
    cp package.json "$BACKUP_DIR/package.json.${TIMESTAMP}"
    if [ -f "package-lock.json" ]; then
        cp package-lock.json "$BACKUP_DIR/package-lock.json.${TIMESTAMP}"
    fi
    echo -e "${GREEN}✓ Backup created at: $BACKUP_DIR${NC}"
    echo ""
}

# Function to validate build
validate_build() {
    echo -e "${YELLOW}Validating build...${NC}"
    if npm run build; then
        echo -e "${GREEN}✓ Build successful${NC}"
        return 0
    else
        echo -e "${RED}✗ Build failed${NC}"
        return 1
    fi
}

# Function to run tests (if available)
run_tests() {
    echo -e "${YELLOW}Running tests...${NC}"
    if npm test 2>&1 | grep -q "no test specified"; then
        echo -e "${YELLOW}⚠ No tests configured${NC}"
        return 0
    else
        if npm test; then
            echo -e "${GREEN}✓ Tests passed${NC}"
            return 0
        else
            echo -e "${RED}✗ Tests failed${NC}"
            return 1
        fi
    fi
}

# Function to rollback
rollback() {
    echo -e "${RED}Rolling back changes...${NC}"
    if [ -f "$BACKUP_DIR/package.json.${TIMESTAMP}" ]; then
        cp "$BACKUP_DIR/package.json.${TIMESTAMP}" package.json
        if [ -f "$BACKUP_DIR/package-lock.json.${TIMESTAMP}" ]; then
            cp "$BACKUP_DIR/package-lock.json.${TIMESTAMP}" package-lock.json
        fi
        npm install
        echo -e "${GREEN}✓ Rollback completed${NC}"
    else
        echo -e "${RED}✗ Backup not found${NC}"
    fi
}

# Parse command line arguments
UPDATE_TYPE="${1:-safe}"  # safe, minor, major, all

case "$UPDATE_TYPE" in
    safe|patch)
        UPDATE_TARGET="patch"
        UPDATE_DESC="Patch versions only"
        UPDATE_ARGS="--target patch"
        ;;
    minor)
        UPDATE_TARGET="minor"
        UPDATE_DESC="Minor and patch versions"
        UPDATE_ARGS="--target minor"
        ;;
    major)
        UPDATE_TARGET="latest"
        UPDATE_DESC="All updates including major versions"
        UPDATE_ARGS=""
        ;;
    all)
        UPDATE_TARGET="latest"
        UPDATE_DESC="All updates including major versions"
        UPDATE_ARGS=""
        ;;
    *)
        echo -e "${RED}Invalid update type: $UPDATE_TYPE${NC}"
        echo "Usage: $0 [safe|minor|major|all]"
        echo "  safe/patch - Update patch versions only (1.0.x)"
        echo "  minor      - Update minor and patch versions (1.x.0)"
        echo "  major/all  - Update all versions including major (x.0.0)"
        exit 1
        ;;
esac

echo -e "${BLUE}Update Strategy: ${UPDATE_DESC}${NC}"
echo ""

# Create backup before any changes
create_backup

# Show what will be updated
echo -e "${BLUE}=== Checking for updates ===${NC}"
ncu $UPDATE_ARGS
echo ""

# Ask for confirmation for major updates
if [ "$UPDATE_TARGET" = "latest" ]; then
    echo -e "${YELLOW}⚠ WARNING: This will update to latest versions including breaking changes${NC}"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Update cancelled"
        exit 0
    fi
fi

# Perform the update
echo -e "${BLUE}=== Updating dependencies ===${NC}"
ncu -u $UPDATE_ARGS
echo -e "${GREEN}✓ package.json updated${NC}"
echo ""

# Install updated dependencies
echo -e "${BLUE}=== Installing updated dependencies ===${NC}"
if npm install; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Installation failed${NC}"
    rollback
    exit 1
fi
echo ""

# Validate the update
echo -e "${BLUE}=== Validating updates ===${NC}"
if ! validate_build; then
    echo -e "${RED}Build validation failed. Rolling back...${NC}"
    rollback
    exit 1
fi

# Run tests if available
run_tests

# Generate update report
mkdir -p "$REPORTS_DIR"
UPDATE_REPORT="$REPORTS_DIR/update-${TIMESTAMP}.md"

cat > "$UPDATE_REPORT" << EOF
# Dependency Update Report

**Date:** $(date)
**Update Type:** ${UPDATE_DESC}
**Status:** Success

## Updated Packages

\`\`\`
$(ncu $UPDATE_ARGS)
\`\`\`

## Validation Results

- **Build:** ✓ Successful
- **Tests:** $(if grep -q "no test specified" <(npm test 2>&1); then echo "⚠ Not configured"; else echo "✓ Passed"; fi)

## Backup Location

- package.json: \`${BACKUP_DIR}/package.json.${TIMESTAMP}\`
- package-lock.json: \`${BACKUP_DIR}/package-lock.json.${TIMESTAMP}\`

## Rollback Command

If issues arise, run:
\`\`\`bash
./scripts/dependency-audit/rollback.sh ${TIMESTAMP}
\`\`\`

## Next Steps

1. Test the application thoroughly
2. Check for any deprecation warnings
3. Review changelog for major version updates
4. Update code if breaking changes detected

---
*Generated by Fleetify Dependency Audit System*
EOF

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Update Completed Successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Update report: $UPDATE_REPORT"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the application: npm run dev"
echo "2. Check for warnings in the console"
echo "3. Test mobile builds if needed"
echo "4. If issues arise, rollback: ./scripts/dependency-audit/rollback.sh ${TIMESTAMP}"
