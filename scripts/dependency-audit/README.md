# Dependency Audit System

A comprehensive dependency management system for the Fleetify Fleet Management Application.

## Overview

This system provides automated tools for:
- **Security vulnerability scanning** - Detect and fix security issues
- **Version currency analysis** - Track outdated packages
- **Dependency conflict detection** - Identify compatibility issues
- **Automated updates** - Safe, validated dependency updates
- **Rollback procedures** - Recover from failed updates
- **Continuous monitoring** - Daily health checks

## Directory Structure

```
scripts/dependency-audit/
├── README.md                      # This file
├── setup-dependencies.sh          # Initial setup script
├── generate-reports.sh            # Generate audit reports
├── update-dependencies.sh         # Update dependencies safely
├── validate.sh                    # Validate installation
├── rollback.sh                    # Rollback changes
├── monitor-dependencies.sh        # Daily monitoring
├── reports/                       # Generated reports
│   ├── version-currency-*.txt
│   ├── security-audit-*.txt
│   ├── dependency-tree-*.txt
│   ├── outdated-packages-*.txt
│   ├── duplicate-deps-*.txt
│   └── summary-*.md
├── backups/                       # Automatic backups
│   ├── package.json.*
│   └── package-lock.json.*
└── monitoring/                    # Monitoring data
    ├── monitoring-report-*.md
    ├── audit-*.json
    └── alerts-*.log
```

## Quick Start

### 1. Initial Setup

```bash
# Navigate to project root
cd /data/workspace/fleetifyapp

# Make scripts executable
chmod +x scripts/dependency-audit/*.sh

# Run setup (requires npm)
./scripts/dependency-audit/setup-dependencies.sh
```

This will:
- Install npm-check-updates globally
- Create package-lock.json
- Create necessary directories
- Set up the infrastructure

### 2. Generate Baseline Reports

```bash
./scripts/dependency-audit/generate-reports.sh
```

This creates:
- Version currency report
- Security audit report
- Dependency tree analysis
- Outdated packages list
- Duplicate dependencies report
- Comprehensive summary

### 3. Review Reports

```bash
# View summary
cat scripts/dependency-audit/reports/summary-latest.md

# View security issues
cat scripts/dependency-audit/reports/security-audit-latest.txt

# View outdated packages
cat scripts/dependency-audit/reports/version-currency-latest.txt
```

## Usage

### Daily Operations

#### Security Check
```bash
# Quick security audit
npm audit

# Full monitoring report
./scripts/dependency-audit/monitor-dependencies.sh
```

#### Check for Updates
```bash
# See available updates
ncu

# See outdated packages
npm outdated
```

### Updating Dependencies

#### Safe Updates (Recommended)
```bash
# Update patch versions only (1.0.x → 1.0.y)
./scripts/dependency-audit/update-dependencies.sh safe
```

This is the safest option for regular maintenance. It only updates patch versions which should not contain breaking changes.

#### Minor Updates
```bash
# Update minor and patch versions (1.x.0 → 1.y.0)
./scripts/dependency-audit/update-dependencies.sh minor
```

Use this for monthly updates. Minor versions may add features but should remain backward compatible.

#### Major Updates (Use Carefully)
```bash
# Update all versions including major (x.0.0 → y.0.0)
./scripts/dependency-audit/update-dependencies.sh major
```

⚠️ **Warning:** Major updates may contain breaking changes. Use with caution and test thoroughly.

### Validation

After any update, validate the installation:

```bash
./scripts/dependency-audit/validate.sh
```

This runs:
- Environment checks
- Dependency installation verification
- Build validation
- Test suite execution
- Linting checks
- Security audit
- Dependency health assessment
- Mobile build compatibility (if applicable)

### Rollback

If an update causes issues:

```bash
# List available backups
./scripts/dependency-audit/rollback.sh

# Rollback to specific backup
./scripts/dependency-audit/rollback.sh 20251012_143022
```

The system automatically creates backups before each update.

## Scripts Reference

### setup-dependencies.sh

**Purpose:** Initial setup of the dependency audit system

**Usage:**
```bash
./scripts/dependency-audit/setup-dependencies.sh
```

**What it does:**
- Installs npm-check-updates globally
- Creates package-lock.json if missing
- Creates reports, backups, and monitoring directories
- Verifies environment setup

**Requirements:**
- npm must be installed
- Internet connection for package downloads

---

### generate-reports.sh

**Purpose:** Generate comprehensive dependency audit reports

**Usage:**
```bash
./scripts/dependency-audit/generate-reports.sh
```

**Generated Reports:**
- `version-currency-{timestamp}.txt` - Packages with available updates
- `security-audit-{timestamp}.txt` - Security vulnerability report
- `dependency-tree-{timestamp}.txt` - Complete dependency tree
- `outdated-packages-{timestamp}.txt` - Outdated packages list
- `duplicate-deps-{timestamp}.txt` - Duplicate dependencies
- `summary-{timestamp}.md` - Executive summary

**Output:**
All reports are saved to `scripts/dependency-audit/reports/`

Latest reports are symlinked to `*-latest.txt` for easy access.

---

### update-dependencies.sh

**Purpose:** Safely update dependencies with automatic validation

**Usage:**
```bash
./scripts/dependency-audit/update-dependencies.sh [safe|minor|major|all]
```

**Arguments:**
- `safe` or `patch` - Update patch versions only (default)
- `minor` - Update minor and patch versions
- `major` or `all` - Update all including major versions

**Process:**
1. Create automatic backup
2. Show update preview
3. Request confirmation (for major updates)
4. Update package.json
5. Install dependencies
6. Validate build
7. Run tests
8. Generate update report

**Output:**
- Backup in `backups/`
- Update report in `reports/update-{timestamp}.md`

**Rollback:**
If validation fails, automatic rollback is performed.

---

### validate.sh

**Purpose:** Comprehensive validation of dependency installation

**Usage:**
```bash
./scripts/dependency-audit/validate.sh
```

**Validation Steps:**
1. **Environment Check** - Verify npm and Node.js
2. **Dependency Installation** - Check node_modules
3. **Build Validation** - Run production build
4. **Test Suite** - Execute tests
5. **Code Quality** - Run linting
6. **Security Audit** - Check for vulnerabilities
7. **Dependency Health** - Check for outdated packages
8. **Mobile Compatibility** - Verify Capacitor setup

**Exit Codes:**
- `0` - All validations passed
- `1` - One or more validations failed

**Output:**
- Console output with colored status indicators
- Validation report in `reports/validation-{timestamp}.md`

---

### rollback.sh

**Purpose:** Rollback to a previous dependency state

**Usage:**
```bash
# List available backups
./scripts/dependency-audit/rollback.sh

# Rollback to specific timestamp
./scripts/dependency-audit/rollback.sh <timestamp>
```

**Process:**
1. Verify backup exists
2. Create backup of current state
3. Restore package.json
4. Restore package-lock.json
5. Reinstall dependencies
6. Validate rollback

**Safety:**
Before rollback, current state is backed up as `pre-rollback-{timestamp}`

---

### monitor-dependencies.sh

**Purpose:** Continuous dependency monitoring

**Usage:**
```bash
./scripts/dependency-audit/monitor-dependencies.sh
```

**Monitoring Checks:**
1. Security vulnerability scan
2. Outdated packages check
3. Deprecated packages detection
4. License compliance review
5. Dependency health metrics
6. Alert generation

**Output:**
- Monitoring report in `monitoring/monitoring-report-{timestamp}.md`
- Alert log in `monitoring/alerts-{timestamp}.log`
- JSON data for automation

**Scheduling:**
Can be scheduled via cron for daily monitoring:
```bash
# Add to crontab
0 9 * * * cd /data/workspace/fleetifyapp && ./scripts/dependency-audit/monitor-dependencies.sh
```

**Exit Codes:**
- `0` - System healthy
- `1` - Critical/high vulnerabilities detected

---

## Automated Monitoring Setup

### Option 1: Cron Job (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add daily monitoring at 9 AM
0 9 * * * cd /data/workspace/fleetifyapp && ./scripts/dependency-audit/monitor-dependencies.sh > /dev/null 2>&1
```

### Option 2: GitHub Actions

Create `.github/workflows/dependency-audit.yml`:

```yaml
name: Daily Dependency Audit

on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM daily
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run dependency audit
        run: ./scripts/dependency-audit/monitor-dependencies.sh
      
      - name: Upload reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: audit-reports
          path: scripts/dependency-audit/reports/
```

### Option 3: System Service (Linux)

Create `/etc/systemd/system/dependency-audit.service`:

```ini
[Unit]
Description=Dependency Audit Service
After=network.target

[Service]
Type=oneshot
User=youruser
WorkingDirectory=/data/workspace/fleetifyapp
ExecStart=/data/workspace/fleetifyapp/scripts/dependency-audit/monitor-dependencies.sh

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/dependency-audit.timer`:

```ini
[Unit]
Description=Daily Dependency Audit Timer

[Timer]
OnCalendar=daily
OnCalendar=09:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:
```bash
sudo systemctl enable dependency-audit.timer
sudo systemctl start dependency-audit.timer
```

## Maintenance Schedule

### Daily
- [ ] Run `monitor-dependencies.sh`
- [ ] Check for critical security alerts
- [ ] Review monitoring reports

### Weekly
- [ ] Review security advisories
- [ ] Check for outdated packages
- [ ] Review alert history

### Monthly
- [ ] Run full audit: `generate-reports.sh`
- [ ] Update patch/minor versions: `update-dependencies.sh minor`
- [ ] Validate: `validate.sh`
- [ ] Clean old backups (keep last 10)

### Quarterly
- [ ] Review dependency health
- [ ] Plan major version updates
- [ ] Remove unused dependencies
- [ ] License compliance review

## Troubleshooting

### Scripts not executable

```bash
chmod +x scripts/dependency-audit/*.sh
```

### npm not found

```bash
# Install Node.js and npm first
# On Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# On macOS:
brew install node

# Verify installation
node --version
npm --version
```

### Build fails after update

```bash
# 1. Check build errors
npm run build

# 2. Rollback
./scripts/dependency-audit/rollback.sh <timestamp>

# 3. Update individually
npm update <package-name>
```

### Peer dependency conflicts

```bash
npm install --legacy-peer-deps
```

### Package lock conflicts

```bash
rm package-lock.json
npm install
```

## Best Practices

1. **Always backup before updates**
   - Automatic with update script
   - Manual: `cp package.json package.json.backup`

2. **Test in development first**
   - Run `npm run dev` after updates
   - Test key functionality

3. **Read changelogs**
   - For major updates, review breaking changes
   - Check migration guides

4. **Keep package-lock.json**
   - Commit to version control
   - Ensures consistent installations

5. **Monitor regularly**
   - Daily security checks
   - Weekly update reviews

6. **Update incrementally**
   - Start with patch updates
   - Then minor updates
   - Plan major updates carefully

## Security Response

### Critical Vulnerability Detected

```bash
# 1. Assess severity
npm audit

# 2. Attempt fix
npm audit fix

# 3. If needed, force fix
npm audit fix --force

# 4. Validate
./scripts/dependency-audit/validate.sh

# 5. Deploy immediately
npm run build
# Deploy to production
```

### High Severity (< 7 days)

```bash
# 1. Review vulnerability details
npm audit

# 2. Update affected packages
./scripts/dependency-audit/update-dependencies.sh minor

# 3. Test thoroughly
./scripts/dependency-audit/validate.sh

# 4. Schedule deployment
```

### Moderate/Low Severity

```bash
# Include in regular monthly update cycle
./scripts/dependency-audit/update-dependencies.sh minor
```

## Documentation

- **Full Guide:** `../../docs/DEPENDENCY_MANAGEMENT_GUIDE.md`
- **Audit Report:** `../../docs/DEPENDENCY_AUDIT_REPORT.md`
- **Quick Reference:** `../../docs/DEPENDENCY_QUICK_REFERENCE.md`

## Support

For issues or questions:
1. Check documentation
2. Review generated reports
3. Check troubleshooting section
4. Consult development team

## Contributing

When modifying scripts:
1. Test thoroughly
2. Update documentation
3. Maintain backward compatibility
4. Add comments for complex logic

## License

Part of the Fleetify Fleet Management Application.

---

*Last Updated: 2025-10-12*
*System Version: 1.0.0*
*Maintained by: Fleetify Development Team*
