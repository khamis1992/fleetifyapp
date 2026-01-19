# Dependency Audit System - Quick Reference

## 🚀 Quick Start (5 Minutes)

### First Time Setup
```bash
# 1. Make scripts executable
chmod +x scripts/dependency-audit/*.sh

# 2. Run setup (when npm is available)
./scripts/dependency-audit/setup-dependencies.sh

# 3. Generate initial reports
./scripts/dependency-audit/generate-reports.sh

# 4. Review summary
cat scripts/dependency-audit/reports/summary-latest.md
```

---

## 📋 Daily Commands

### Security Check
```bash
# Quick security scan
npm audit

# Detailed monitoring
./scripts/dependency-audit/monitor-dependencies.sh
```

### Package Status
```bash
# Check for outdated packages
ncu

# See all outdated
npm outdated
```

---

## 🔄 Update Commands

### Safe Updates (Patch Versions)
```bash
# Update patch versions only (1.0.x → 1.0.y)
./scripts/dependency-audit/update-dependencies.sh safe
```

### Minor Updates
```bash
# Update minor and patch (1.x.0 → 1.y.0)
./scripts/dependency-audit/update-dependencies.sh minor
```

### Major Updates
```bash
# Update all including major (x.0.0 → y.0.0) - USE CAREFULLY
./scripts/dependency-audit/update-dependencies.sh major
```

---

## ✅ Validation

### After Any Update
```bash
# Validate installation and build
./scripts/dependency-audit/validate.sh

# Manual validation
npm run build
npm run lint
npm test
```

---

## ↩️ Rollback

### If Something Breaks
```bash
# List available backups
./scripts/dependency-audit/rollback.sh

# Rollback to specific backup
./scripts/dependency-audit/rollback.sh 20251012_143022
```

---

## 📊 Reports & Monitoring

### Generate Reports
```bash
# Full audit report
./scripts/dependency-audit/generate-reports.sh

# View latest reports
cat scripts/dependency-audit/reports/summary-latest.md
cat scripts/dependency-audit/reports/security-audit-latest.txt
```

### Monitoring
```bash
# Run daily monitoring
./scripts/dependency-audit/monitor-dependencies.sh

# View monitoring history
ls -l scripts/dependency-audit/monitoring/
```

---

## 🚨 Emergency Procedures

### Critical Security Vulnerability

```bash
# 1. Assess severity
npm audit

# 2. Attempt automatic fix
npm audit fix

# 3. If needed, force fix
npm audit fix --force

# 4. Validate
./scripts/dependency-audit/validate.sh

# 5. If broken, rollback
./scripts/dependency-audit/rollback.sh <timestamp>
```

### Build Failure

```bash
# 1. Check build errors
npm run build

# 2. Rollback recent changes
./scripts/dependency-audit/rollback.sh <timestamp>

# 3. Clean install
rm -rf node_modules package-lock.json
npm install

# 4. Rebuild
npm run build
```

---

## 📝 Common Tasks

### Add New Package
```bash
# Production dependency
npm install <package-name>

# Development dependency
npm install -D <package-name>

# Then validate
npm run build
```

### Remove Package
```bash
# Uninstall package
npm uninstall <package-name>

# Clean unused
npm prune

# Validate
npm run build
```

### Update Single Package
```bash
# Update to latest
npm update <package-name>

# Update to specific version
npm install <package-name>@<version>

# Validate
npm run build
```

### Check Package Info
```bash
# View package details
npm view <package-name>

# View current version
npm ls <package-name>

# View dependency tree
npm ls <package-name> --all
```

---

## 🔍 Troubleshooting Quick Fixes

### Peer Dependency Warnings
```bash
npm install --legacy-peer-deps
```

### Package Lock Conflicts
```bash
rm package-lock.json
npm install
```

### Cache Issues
```bash
npm cache clean --force
npm install
```

### Module Not Found
```bash
rm -rf node_modules
npm install
```

---

## 📅 Maintenance Schedule

### Daily
- [ ] Run security monitoring
- [ ] Check for critical alerts

### Weekly
- [ ] Review security advisories
- [ ] Check for outdated packages

### Monthly
- [ ] Update patch/minor versions
- [ ] Run full validation
- [ ] Clean old backups

### Quarterly
- [ ] Plan major version updates
- [ ] Review dependency health
- [ ] Audit unused dependencies

---

## 🎯 Script Locations

All scripts are in: `scripts/dependency-audit/`

| Script | Purpose |
|--------|---------|
| `setup-dependencies.sh` | Initial setup |
| `generate-reports.sh` | Generate audit reports |
| `update-dependencies.sh` | Update dependencies |
| `validate.sh` | Validate installation |
| `rollback.sh` | Rollback changes |
| `monitor-dependencies.sh` | Daily monitoring |

---

## 📚 Documentation

- **Full Guide:** `docs/DEPENDENCY_MANAGEMENT_GUIDE.md`
- **Audit Report:** `docs/DEPENDENCY_AUDIT_REPORT.md`
- **This File:** `docs/DEPENDENCY_QUICK_REFERENCE.md`

---

## ⚡ One-Liners

```bash
# Quick status check
npm outdated && npm audit

# Safe update cycle
./scripts/dependency-audit/update-dependencies.sh safe && ./scripts/dependency-audit/validate.sh

# Emergency security fix
npm audit fix && npm run build

# Full health check
./scripts/dependency-audit/generate-reports.sh && ./scripts/dependency-audit/validate.sh

# Clean slate
rm -rf node_modules package-lock.json && npm install && npm run build
```

---

## 🆘 Getting Help

1. **Check Troubleshooting:** `docs/DEPENDENCY_MANAGEMENT_GUIDE.md#troubleshooting`
2. **Review Reports:** `scripts/dependency-audit/reports/`
3. **Check Logs:** `/tmp/build-output-*.log`
4. **Rollback:** `./scripts/dependency-audit/rollback.sh`

---

## 🎓 Learning Resources

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [npm Security](https://docs.npmjs.com/packages-and-modules/securing-your-code)

---

## ✨ Pro Tips

1. **Always backup before major updates**
   ```bash
   cp package.json package.json.backup
   ```

2. **Test in development first**
   ```bash
   npm run dev
   # Test functionality before deploying
   ```

3. **Read changelogs for major updates**
   ```bash
   npm view <package-name> version
   # Check GitHub releases page
   ```

4. **Keep package-lock.json in git**
   ```bash
   git add package-lock.json
   git commit -m "Update dependencies"
   ```

5. **Monitor bundle size**
   ```bash
   npm run build
   # Check dist/assets/ folder sizes
   ```

---

*Last Updated: 2025-10-12*
*Quick Reference Version: 1.0.0*
