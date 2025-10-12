#!/bin/bash
# Generate Dependency Audit Reports
# This script generates comprehensive dependency analysis reports

set -e

REPORTS_DIR="./scripts/dependency-audit/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "================================================"
echo "Fleetify Dependency Audit Report Generation"
echo "================================================"
echo "Timestamp: $TIMESTAMP"
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Check if ncu is available
if ! command -v ncu &> /dev/null; then
    echo -e "${YELLOW}npm-check-updates not found. Installing...${NC}"
    npm install -g npm-check-updates
fi

# Create reports directory
mkdir -p "$REPORTS_DIR"

echo -e "${BLUE}=== 1. Version Currency Report ===${NC}"
echo -e "${YELLOW}Checking for outdated packages...${NC}"
ncu > "$REPORTS_DIR/version-currency-${TIMESTAMP}.txt" 2>&1 || true
ncu --format json > "$REPORTS_DIR/version-currency-${TIMESTAMP}.json" 2>&1 || true
echo -e "${GREEN}✓ Version currency report generated${NC}"
echo ""

echo -e "${BLUE}=== 2. Security Vulnerability Scan ===${NC}"
echo -e "${YELLOW}Running npm audit...${NC}"
npm audit --json > "$REPORTS_DIR/security-audit-${TIMESTAMP}.json" 2>&1 || true
npm audit > "$REPORTS_DIR/security-audit-${TIMESTAMP}.txt" 2>&1 || true
echo -e "${GREEN}✓ Security audit report generated${NC}"
echo ""

echo -e "${BLUE}=== 3. Dependency Tree Analysis ===${NC}"
echo -e "${YELLOW}Analyzing dependency tree...${NC}"
npm ls --all --json > "$REPORTS_DIR/dependency-tree-${TIMESTAMP}.json" 2>&1 || true
npm ls --all > "$REPORTS_DIR/dependency-tree-${TIMESTAMP}.txt" 2>&1 || true
echo -e "${GREEN}✓ Dependency tree report generated${NC}"
echo ""

echo -e "${BLUE}=== 4. Outdated Packages Summary ===${NC}"
echo -e "${YELLOW}Generating outdated packages list...${NC}"
npm outdated --json > "$REPORTS_DIR/outdated-packages-${TIMESTAMP}.json" 2>&1 || true
npm outdated > "$REPORTS_DIR/outdated-packages-${TIMESTAMP}.txt" 2>&1 || true
echo -e "${GREEN}✓ Outdated packages report generated${NC}"
echo ""

echo -e "${BLUE}=== 5. Duplicate Dependencies ===${NC}"
echo -e "${YELLOW}Finding duplicate dependencies...${NC}"
npm dedupe --dry-run > "$REPORTS_DIR/duplicate-deps-${TIMESTAMP}.txt" 2>&1 || true
echo -e "${GREEN}✓ Duplicate dependencies report generated${NC}"
echo ""

# Generate comprehensive summary
echo -e "${BLUE}=== 6. Generating Summary Report ===${NC}"
cat > "$REPORTS_DIR/summary-${TIMESTAMP}.md" << 'EOF'
# Dependency Audit Summary Report

**Generated:** $(date)
**Project:** Fleetify Fleet Management Application

## Overview

This report provides a comprehensive analysis of the project's dependencies including version currency, security vulnerabilities, and recommendations for updates.

## Key Metrics

### Dependency Count
- **Production Dependencies:** $(cat package.json | grep -A 100 '"dependencies"' | grep -c '":')
- **Development Dependencies:** $(cat package.json | grep -A 100 '"devDependencies"' | grep -c '":')

### Version Currency Status
```
See version-currency-${TIMESTAMP}.txt for details
```

### Security Status
```
See security-audit-${TIMESTAMP}.txt for details
```

## Critical Findings

### High Priority Updates Required
- Check security-audit report for critical/high severity vulnerabilities
- Review version-currency report for packages >2 major versions behind

### Deprecated Packages
- Listed in outdated-packages report

### Duplicate Dependencies
- Listed in duplicate-deps report

## Recommendations

### Immediate Actions (Critical)
1. Address all critical and high severity security vulnerabilities
2. Update packages with known security issues
3. Remove deprecated packages

### Short-term Actions (1-2 weeks)
1. Update patch and minor versions for all safe packages
2. Plan major version updates with breaking changes
3. Resolve duplicate dependencies

### Long-term Actions (Monthly)
1. Establish automated dependency monitoring
2. Schedule regular dependency updates
3. Maintain dependency health metrics

## Update Strategy

### Safe Updates (Automated)
- Patch versions: Can be updated automatically
- Minor versions: Safe for most well-maintained packages
- Process: Run automated update script

### Cautious Updates (Manual Review)
- Major versions: Require review of changelogs
- Core dependencies: React, TypeScript, Vite
- Process: Review breaking changes before updating

### High-Risk Updates (Careful Testing)
- Dependencies with security issues
- Packages with limited maintenance
- Mobile-related packages (Capacitor)
- Process: Test thoroughly in development environment

## Next Steps

1. Review all generated reports in detail
2. Prioritize updates based on security severity
3. Create update plan with timeline
4. Execute updates in stages with validation
5. Monitor for issues after updates

## Report Files

- \`version-currency-${TIMESTAMP}.txt\` - Outdated packages
- \`security-audit-${TIMESTAMP}.txt\` - Security vulnerabilities
- \`dependency-tree-${TIMESTAMP}.txt\` - Full dependency tree
- \`outdated-packages-${TIMESTAMP}.txt\` - Outdated packages list
- \`duplicate-deps-${TIMESTAMP}.txt\` - Duplicate dependencies

---
*Generated by Fleetify Dependency Audit System*
EOF

# Evaluate the template
eval "echo \"$(cat "$REPORTS_DIR/summary-${TIMESTAMP}.md")\"" > "$REPORTS_DIR/summary-${TIMESTAMP}.md.tmp"
mv "$REPORTS_DIR/summary-${TIMESTAMP}.md.tmp" "$REPORTS_DIR/summary-${TIMESTAMP}.md"

echo -e "${GREEN}✓ Summary report generated${NC}"
echo ""

# Create latest symlinks
ln -sf "version-currency-${TIMESTAMP}.txt" "$REPORTS_DIR/version-currency-latest.txt"
ln -sf "security-audit-${TIMESTAMP}.txt" "$REPORTS_DIR/security-audit-latest.txt"
ln -sf "summary-${TIMESTAMP}.md" "$REPORTS_DIR/summary-latest.md"

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Report Generation Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Reports location: $REPORTS_DIR"
echo ""
echo -e "${YELLOW}Quick View:${NC}"
echo "  - Summary: cat $REPORTS_DIR/summary-latest.md"
echo "  - Security: cat $REPORTS_DIR/security-audit-latest.txt"
echo "  - Versions: cat $REPORTS_DIR/version-currency-latest.txt"
echo ""
echo "Next step: Review reports and run update-dependencies.sh"
