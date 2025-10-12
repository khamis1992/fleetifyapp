#!/bin/bash
# Automated Dependency Monitoring Script
# Schedule this script to run periodically for continuous monitoring

set -e

REPORTS_DIR="./scripts/dependency-audit/reports"
MONITORING_DIR="./scripts/dependency-audit/monitoring"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create monitoring directory
mkdir -p "$MONITORING_DIR"
mkdir -p "$REPORTS_DIR"

echo "================================================"
echo "Fleetify Dependency Monitoring"
echo "================================================"
echo "Timestamp: $(date)"
echo ""

# Function to send alert (placeholder - implement email/slack/etc)
send_alert() {
    local severity=$1
    local message=$2
    
    ALERT_FILE="$MONITORING_DIR/alerts-${TIMESTAMP}.log"
    echo "[$(date)] [$severity] $message" >> "$ALERT_FILE"
    
    # TODO: Implement actual alerting (email, Slack, etc.)
    echo -e "${RED}ALERT [$severity]: $message${NC}"
}

# 1. Check for security vulnerabilities
echo -e "${BLUE}=== Security Scan ===${NC}"
AUDIT_OUTPUT=$(npm audit --json 2>&1 || true)
echo "$AUDIT_OUTPUT" > "$MONITORING_DIR/audit-${TIMESTAMP}.json"

CRITICAL=$(echo "$AUDIT_OUTPUT" | grep -o '"critical":[0-9]*' | cut -d: -f2 | head -1 || echo "0")
HIGH=$(echo "$AUDIT_OUTPUT" | grep -o '"high":[0-9]*' | cut -d: -f2 | head -1 || echo "0")
MODERATE=$(echo "$AUDIT_OUTPUT" | grep -o '"moderate":[0-9]*' | cut -d: -f2 | head -1 || echo "0")
LOW=$(echo "$AUDIT_OUTPUT" | grep -o '"low":[0-9]*' | cut -d: -f2 | head -1 || echo "0")

echo "  Critical: $CRITICAL"
echo "  High: $HIGH"
echo "  Moderate: $MODERATE"
echo "  Low: $LOW"

# Alert on critical/high vulnerabilities
if [ "$CRITICAL" -gt "0" ]; then
    send_alert "CRITICAL" "Found $CRITICAL critical security vulnerabilities"
fi

if [ "$HIGH" -gt "0" ]; then
    send_alert "HIGH" "Found $HIGH high severity security vulnerabilities"
fi

echo ""

# 2. Check for outdated packages
echo -e "${BLUE}=== Outdated Packages Check ===${NC}"
if command -v ncu &> /dev/null; then
    OUTDATED_JSON=$(ncu --jsonUpgraded 2>/dev/null || echo "{}")
    echo "$OUTDATED_JSON" > "$MONITORING_DIR/outdated-${TIMESTAMP}.json"
    
    OUTDATED_COUNT=$(echo "$OUTDATED_JSON" | grep -c '"' || echo "0")
    echo "  Outdated packages: $OUTDATED_COUNT"
    
    # Alert if many packages are outdated
    if [ "$OUTDATED_COUNT" -gt "30" ]; then
        send_alert "WARN" "More than 30 packages are outdated ($OUTDATED_COUNT total)"
    fi
else
    echo -e "${YELLOW}  npm-check-updates not installed${NC}"
fi

echo ""

# 3. Check for deprecated packages
echo -e "${BLUE}=== Deprecated Packages Check ===${NC}"
DEPRECATED=$(npm outdated --json 2>&1 | grep -c '"wanted"' || echo "0")
echo "  Deprecated packages: $DEPRECATED"

if [ "$DEPRECATED" -gt "5" ]; then
    send_alert "WARN" "Found $DEPRECATED deprecated packages"
fi

echo ""

# 4. License compliance check
echo -e "${BLUE}=== License Compliance ===${NC}"
if command -v npm-license-checker &> /dev/null; then
    npm-license-checker --json > "$MONITORING_DIR/licenses-${TIMESTAMP}.json" 2>&1 || true
    echo "  License report generated"
else
    echo -e "${YELLOW}  npm-license-checker not installed${NC}"
    echo "  Install: npm install -g license-checker"
fi

echo ""

# 5. Dependency health metrics
echo -e "${BLUE}=== Dependency Health Metrics ===${NC}"

# Count total dependencies
TOTAL_DEPS=$(cat package.json | grep -A 100 '"dependencies"' | grep -c '":' || echo "0")
TOTAL_DEV_DEPS=$(cat package.json | grep -A 100 '"devDependencies"' | grep -c '":' || echo "0")
TOTAL=$((TOTAL_DEPS + TOTAL_DEV_DEPS))

echo "  Total dependencies: $TOTAL"
echo "    - Production: $TOTAL_DEPS"
echo "    - Development: $TOTAL_DEV_DEPS"

# Calculate freshness score
if [ "$OUTDATED_COUNT" -gt "0" ] && [ "$TOTAL" -gt "0" ]; then
    FRESHNESS=$((100 - (OUTDATED_COUNT * 100 / TOTAL)))
    echo "  Dependency freshness: ${FRESHNESS}%"
    
    if [ "$FRESHNESS" -lt "70" ]; then
        send_alert "WARN" "Dependency freshness is low: ${FRESHNESS}%"
    fi
fi

echo ""

# 6. Generate monitoring report
MONITORING_REPORT="$MONITORING_DIR/monitoring-report-${TIMESTAMP}.md"

cat > "$MONITORING_REPORT" << EOF
# Dependency Monitoring Report

**Date:** $(date)
**Status:** $(if [ "$CRITICAL" -eq "0" ] && [ "$HIGH" -eq "0" ]; then echo "✓ HEALTHY"; else echo "⚠ ATTENTION REQUIRED"; fi)

## Security Status

| Severity | Count | Status |
|----------|-------|--------|
| Critical | $CRITICAL | $(if [ "$CRITICAL" -eq "0" ]; then echo "✓"; else echo "🚨"; fi) |
| High | $HIGH | $(if [ "$HIGH" -eq "0" ]; then echo "✓"; else echo "⚠"; fi) |
| Moderate | $MODERATE | $(if [ "$MODERATE" -eq "0" ]; then echo "✓"; else echo "ℹ"; fi) |
| Low | $LOW | ℹ |

## Dependency Metrics

- **Total Dependencies:** $TOTAL
  - Production: $TOTAL_DEPS
  - Development: $TOTAL_DEV_DEPS
- **Outdated Packages:** $OUTDATED_COUNT
- **Deprecated Packages:** $DEPRECATED
- **Freshness Score:** ${FRESHNESS:-N/A}%

## Alerts Generated

$(if [ -f "$MONITORING_DIR/alerts-${TIMESTAMP}.log" ]; then
    cat "$MONITORING_DIR/alerts-${TIMESTAMP}.log"
else
    echo "No alerts"
fi)

## Recommendations

$(if [ "$CRITICAL" -gt "0" ] || [ "$HIGH" -gt "0" ]; then
    echo "### 🚨 Immediate Action Required"
    echo "- Address critical and high severity vulnerabilities"
    echo "- Run: \`npm audit fix --force\` or review updates manually"
fi)

$(if [ "$OUTDATED_COUNT" -gt "20" ]; then
    echo "### ⚠ Maintenance Recommended"
    echo "- Many packages are outdated"
    echo "- Schedule dependency update review"
    echo "- Run: \`./scripts/dependency-audit/update-dependencies.sh minor\`"
fi)

$(if [ "${FRESHNESS:-100}" -lt "80" ]; then
    echo "### 📊 Health Check"
    echo "- Dependency freshness is below target (80%)"
    echo "- Review and update packages regularly"
fi)

## Next Scheduled Check

$(if [ -f "/etc/crontab" ] && grep -q "dependency-monitor.sh" /etc/crontab 2>/dev/null; then
    echo "Automated monitoring is configured"
    grep "dependency-monitor.sh" /etc/crontab
else
    echo "Manual monitoring - run this script periodically"
fi)

---
*Generated by Fleetify Dependency Monitoring System*
EOF

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Monitoring Complete${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Report: $MONITORING_REPORT"
echo ""

# Create latest symlink
ln -sf "monitoring-report-${TIMESTAMP}.md" "$MONITORING_DIR/monitoring-report-latest.md"

# Summary
if [ "$CRITICAL" -gt "0" ] || [ "$HIGH" -gt "0" ]; then
    echo -e "${RED}⚠ Action required: Security vulnerabilities detected${NC}"
    exit 1
else
    echo -e "${GREEN}✓ System is healthy${NC}"
fi
