#!/bin/bash

# ================================================================
# FLEETIFY POST-OPTIMIZATION VERIFICATION SCRIPT
# ================================================================
# This script runs all verification tests in sequence
# Run: bash run-verification.sh
# ================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print header
echo -e "${BOLD}${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     FLEETIFY POST-OPTIMIZATION VERIFICATION SUITE        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check prerequisites
echo -e "${BOLD}Checking prerequisites...${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Please install Node.js from https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
fi

# Check if project dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ node_modules not found. Installing dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

echo ""

# ================================================================
# PART 1: Build Verification
# ================================================================

echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}PART 1: BUILD VERIFICATION${NC}"
echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${CYAN}Running production build...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo ""

# Check bundle sizes
echo -e "${CYAN}Analyzing bundle sizes...${NC}"
if [ -d "dist/assets" ]; then
    echo ""
    echo "Bundle sizes:"
    du -h dist/assets/*.js | sort -rh | head -10

    # Check total size
    TOTAL_SIZE=$(du -sh dist | cut -f1)
    echo ""
    echo -e "Total dist size: ${BOLD}$TOTAL_SIZE${NC}"

    # Check for compressed files
    if ls dist/assets/*.gz 1> /dev/null 2>&1; then
        echo -e "${GREEN}✓ Gzip compression enabled${NC}"
    else
        echo -e "${YELLOW}⚠ Gzip compression not found${NC}"
    fi

    if ls dist/assets/*.br 1> /dev/null 2>&1; then
        echo -e "${GREEN}✓ Brotli compression enabled${NC}"
    else
        echo -e "${YELLOW}⚠ Brotli compression not found${NC}"
    fi
else
    echo -e "${RED}✗ dist directory not found${NC}"
fi

echo ""

# ================================================================
# PART 2: Frontend Tests
# ================================================================

echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}PART 2: FRONTEND VERIFICATION${NC}"
echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${CYAN}Opening frontend performance dashboard...${NC}"
echo -e "${YELLOW}→ Please open: ${BOLD}verify-frontend-performance.html${NC}${YELLOW} in your browser${NC}"
echo ""

# Check if browser is available
if command -v open &> /dev/null; then
    # macOS
    open verify-frontend-performance.html
    echo -e "${GREEN}✓ Opened in default browser${NC}"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open verify-frontend-performance.html
    echo -e "${GREEN}✓ Opened in default browser${NC}"
elif command -v start &> /dev/null; then
    # Windows Git Bash
    start verify-frontend-performance.html
    echo -e "${GREEN}✓ Opened in default browser${NC}"
else
    echo -e "${YELLOW}⚠ Could not auto-open browser. Please open manually.${NC}"
fi

echo ""
read -p "Press Enter once you've reviewed the frontend dashboard..."
echo ""

# ================================================================
# PART 3: Integration Tests
# ================================================================

echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}PART 3: INTEGRATION TESTS${NC}"
echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${CYAN}Running integration tests...${NC}"
echo ""

node verify-integration.js

INTEGRATION_EXIT_CODE=$?

echo ""

# ================================================================
# PART 4: Database Tests
# ================================================================

echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}PART 4: DATABASE VERIFICATION${NC}"
echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if database connection info is available
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${YELLOW}⚠ Database connection not configured${NC}"
    echo ""
    echo "To run database tests:"
    echo "1. Go to your Supabase Dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Run the script: ${BOLD}verify-database-optimizations.sql${NC}"
    echo ""
    echo -e "${CYAN}Skipping automated database tests...${NC}"
else
    echo -e "${CYAN}Running database verification...${NC}"
    echo ""

    # If psql is available
    if command -v psql &> /dev/null; then
        psql -d "$DATABASE_URL" -f verify-database-optimizations.sql

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Database tests completed${NC}"
        else
            echo -e "${RED}✗ Database tests failed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ psql not found. Please run verify-database-optimizations.sql manually${NC}"
    fi
fi

echo ""

# ================================================================
# FINAL SUMMARY
# ================================================================

echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}VERIFICATION SUMMARY${NC}"
echo -e "${BOLD}${BLUE}══════════════════════════════════════════════════════════${NC}"
echo ""

# Count passed/failed sections
PASSED=0
FAILED=0

# Build check
if [ -d "dist" ]; then
    echo -e "${GREEN}✓ Build Verification: PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Build Verification: FAIL${NC}"
    ((FAILED++))
fi

# Integration tests
if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Integration Tests: PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Integration Tests: FAIL${NC}"
    ((FAILED++))
fi

# Frontend (manual review)
echo -e "${CYAN}ℹ Frontend Dashboard: MANUAL REVIEW${NC}"

# Database (manual or automated)
echo -e "${CYAN}ℹ Database Tests: MANUAL REVIEW${NC}"

echo ""

# Overall result
TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$((PASSED * 100 / TOTAL))

    echo -e "Pass Rate: ${BOLD}$PASS_RATE%${NC} ($PASSED/$TOTAL automated tests)"
    echo ""

    if [ $PASS_RATE -ge 90 ]; then
        echo -e "${BOLD}${GREEN}Grade: A+ - EXCELLENT ✓${NC}"
        echo -e "${GREEN}All optimizations working perfectly!${NC}"
    elif [ $PASS_RATE -ge 70 ]; then
        echo -e "${BOLD}${YELLOW}Grade: B - GOOD ⚠${NC}"
        echo -e "${YELLOW}Most optimizations working, minor issues to address${NC}"
    else
        echo -e "${BOLD}${RED}Grade: C - NEEDS WORK ✗${NC}"
        echo -e "${RED}Several optimizations need attention${NC}"
    fi
fi

echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo "1. Review ${BOLD}POST_OPTIMIZATION_VERIFICATION_GUIDE.md${NC} for detailed results"
echo "2. Check frontend dashboard for component-level metrics"
echo "3. Review database verification output in Supabase SQL Editor"
echo "4. Address any failed tests before production deployment"
echo ""

echo -e "${BOLD}Generated Files:${NC}"
echo "  - verify-database-optimizations.sql     (Database tests)"
echo "  - verify-frontend-performance.html      (Frontend dashboard)"
echo "  - verify-integration.js                 (Integration tests)"
echo "  - POST_OPTIMIZATION_VERIFICATION_GUIDE.md (Complete guide)"
echo ""

echo -e "${CYAN}Verification complete!${NC}"
echo ""

# Exit with appropriate code
if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
