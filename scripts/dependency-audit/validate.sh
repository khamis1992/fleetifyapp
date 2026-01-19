#!/bin/bash
# Validation Test Script
# Comprehensive validation of dependency updates

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPORTS_DIR="./scripts/dependency-audit/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "================================================"
echo "Fleetify Dependency Validation Suite"
echo "================================================"
echo "Timestamp: $TIMESTAMP"
echo ""

# Track validation results
VALIDATION_PASSED=true

# Function to log results
log_result() {
    local test_name=$1
    local result=$2
    local details=$3
    
    if [ "$result" = "pass" ]; then
        echo -e "${GREEN}✓ $test_name${NC}"
    elif [ "$result" = "warn" ]; then
        echo -e "${YELLOW}⚠ $test_name${NC}"
        echo -e "  ${YELLOW}$details${NC}"
    else
        echo -e "${RED}✗ $test_name${NC}"
        echo -e "  ${RED}$details${NC}"
        VALIDATION_PASSED=false
    fi
}

# 1. Check npm installation
echo -e "${BLUE}=== 1. Environment Check ===${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    log_result "npm installed (v$NPM_VERSION)" "pass"
else
    log_result "npm installed" "fail" "npm not found in PATH"
fi

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_result "Node.js installed ($NODE_VERSION)" "pass"
else
    log_result "Node.js installed" "fail" "Node.js not found in PATH"
fi
echo ""

# 2. Dependency Installation Check
echo -e "${BLUE}=== 2. Dependency Installation ===${NC}"
if [ -d "node_modules" ]; then
    log_result "node_modules exists" "pass"
    
    # Check if node_modules is up to date
    if [ "package.json" -nt "node_modules" ]; then
        log_result "Dependencies up to date" "warn" "package.json is newer than node_modules"
    else
        log_result "Dependencies up to date" "pass"
    fi
else
    log_result "node_modules exists" "fail" "Run npm install first"
fi
echo ""

# 3. Build Validation
echo -e "${BLUE}=== 3. Build Validation ===${NC}"
echo -e "${YELLOW}Running build...${NC}"
if npm run build > /tmp/build-output-${TIMESTAMP}.log 2>&1; then
    log_result "Build successful" "pass"
    
    # Check build output
    if [ -d "build" ] || [ -d "dist" ]; then
        BUILD_DIR=$([ -d "dist" ] && echo "dist" || echo "build")
        BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
        log_result "Build output created ($BUILD_SIZE)" "pass"
    else
        log_result "Build output created" "fail" "Build directory not found"
    fi
else
    log_result "Build successful" "fail" "Build failed - check /tmp/build-output-${TIMESTAMP}.log"
    cat /tmp/build-output-${TIMESTAMP}.log
fi
echo ""

# 4. Test Suite
echo -e "${BLUE}=== 4. Test Suite ===${NC}"
if npm test 2>&1 | grep -q "no test specified"; then
    log_result "Tests configured" "warn" "No tests specified in package.json"
else
    echo -e "${YELLOW}Running tests...${NC}"
    if npm test > /tmp/test-output-${TIMESTAMP}.log 2>&1; then
        log_result "Tests passed" "pass"
    else
        log_result "Tests passed" "fail" "Some tests failed - check /tmp/test-output-${TIMESTAMP}.log"
    fi
fi
echo ""

# 5. Linting
echo -e "${BLUE}=== 5. Code Quality ===${NC}"
if npm run lint > /tmp/lint-output-${TIMESTAMP}.log 2>&1; then
    log_result "Linting passed" "pass"
else
    LINT_ERRORS=$(grep -c "error" /tmp/lint-output-${TIMESTAMP}.log || echo "0")
    LINT_WARNINGS=$(grep -c "warning" /tmp/lint-output-${TIMESTAMP}.log || echo "0")
    
    if [ "$LINT_ERRORS" -gt "0" ]; then
        log_result "Linting passed" "fail" "$LINT_ERRORS errors, $LINT_WARNINGS warnings"
    else
        log_result "Linting passed" "warn" "$LINT_WARNINGS warnings"
    fi
fi
echo ""

# 6. Security Audit
echo -e "${BLUE}=== 6. Security Audit ===${NC}"
npm audit --json > /tmp/audit-${TIMESTAMP}.json 2>&1 || true
CRITICAL=$(cat /tmp/audit-${TIMESTAMP}.json | grep -o '"critical":[0-9]*' | cut -d: -f2 || echo "0")
HIGH=$(cat /tmp/audit-${TIMESTAMP}.json | grep -o '"high":[0-9]*' | cut -d: -f2 || echo "0")
MODERATE=$(cat /tmp/audit-${TIMESTAMP}.json | grep -o '"moderate":[0-9]*' | cut -d: -f2 || echo "0")
LOW=$(cat /tmp/audit-${TIMESTAMP}.json | grep -o '"low":[0-9]*' | cut -d: -f2 || echo "0")

if [ "$CRITICAL" -gt "0" ]; then
    log_result "Security audit" "fail" "$CRITICAL critical vulnerabilities found"
elif [ "$HIGH" -gt "0" ]; then
    log_result "Security audit" "warn" "$HIGH high severity vulnerabilities found"
elif [ "$MODERATE" -gt "0" ] || [ "$LOW" -gt "0" ]; then
    log_result "Security audit" "warn" "$MODERATE moderate, $LOW low severity vulnerabilities"
else
    log_result "Security audit" "pass"
fi
echo ""

# 7. Dependency Health
echo -e "${BLUE}=== 7. Dependency Health ===${NC}"
if command -v ncu &> /dev/null; then
    OUTDATED=$(ncu --jsonUpgraded 2>/dev/null | grep -c '"' || echo "0")
    if [ "$OUTDATED" -gt "20" ]; then
        log_result "Dependency freshness" "warn" "$OUTDATED packages have updates available"
    elif [ "$OUTDATED" -gt "0" ]; then
        log_result "Dependency freshness" "pass" "$OUTDATED packages have updates available"
    else
        log_result "Dependency freshness" "pass" "All dependencies up to date"
    fi
else
    log_result "npm-check-updates installed" "warn" "Install with: npm install -g npm-check-updates"
fi
echo ""

# 8. Mobile Build Compatibility (if Capacitor is configured)
echo -e "${BLUE}=== 8. Mobile Build Compatibility ===${NC}"
if [ -f "capacitor.config.ts" ] || [ -f "capacitor.config.json" ]; then
    log_result "Capacitor configured" "pass"
    
    if command -v cap &> /dev/null; then
        log_result "Capacitor CLI available" "pass"
    else
        log_result "Capacitor CLI available" "warn" "Run: npm install -g @capacitor/cli"
    fi
else
    log_result "Capacitor configured" "warn" "Not a mobile project"
fi
echo ""

# Generate validation report
mkdir -p "$REPORTS_DIR"
VALIDATION_REPORT="$REPORTS_DIR/validation-${TIMESTAMP}.md"

cat > "$VALIDATION_REPORT" << EOF
# Validation Report

**Date:** $(date)
**Status:** $(if [ "$VALIDATION_PASSED" = true ]; then echo "✓ PASSED"; else echo "✗ FAILED"; fi)

## Environment
- Node.js: $(node --version 2>/dev/null || echo "Not installed")
- npm: $(npm --version 2>/dev/null || echo "Not installed")

## Validation Results

### Build Status
$(if grep -q "Build successful.*pass" /tmp/validation-summary-${TIMESTAMP}.txt 2>/dev/null; then echo "✓ Build successful"; else echo "✗ Build failed"; fi)

### Test Results
$(if npm test 2>&1 | grep -q "no test specified"; then echo "⚠ No tests configured"; else echo "See test output for details"; fi)

### Security Status
- Critical: $CRITICAL
- High: $HIGH
- Moderate: $MODERATE
- Low: $LOW

### Code Quality
$(if npm run lint >/dev/null 2>&1; then echo "✓ No linting errors"; else echo "⚠ Linting issues found"; fi)

## Recommendations

$(if [ "$CRITICAL" -gt "0" ] || [ "$HIGH" -gt "0" ]; then
    echo "### 🚨 Urgent Actions Required"
    echo "- Address security vulnerabilities immediately"
    echo "- Run: npm audit fix --force"
fi)

$(if [ "$VALIDATION_PASSED" = false ]; then
    echo "### ⚠️ Validation Failed"
    echo "- Review build and test errors"
    echo "- Consider rolling back recent changes"
    echo "- Check detailed logs in /tmp/"
fi)

## Next Steps

1. $(if [ "$VALIDATION_PASSED" = true ]; then echo "Proceed with deployment"; else echo "Fix validation errors before deployment"; fi)
2. Review security audit results
3. Update documentation if needed
4. Test in staging environment

---
*Generated by Fleetify Validation System*
EOF

echo -e "${GREEN}================================================${NC}"
if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✓ Validation Passed${NC}"
else
    echo -e "${RED}✗ Validation Failed${NC}"
fi
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Validation report: $VALIDATION_REPORT"
echo ""

if [ "$VALIDATION_PASSED" = false ]; then
    exit 1
fi
