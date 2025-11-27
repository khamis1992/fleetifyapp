# 📜 CTO Agent Rules - FleetifyApp

## 🔴 CRITICAL (Blocking)

### R001: No TypeScript Errors
- **Check**: `tsc --noEmit` must exit with code 0
- **Action**: Block PR merge
- **Auto-fix**: No

### R002: No ESLint Errors
- **Check**: `eslint . --max-warnings 10`
- **Action**: Block on errors, warn on >10 warnings
- **Auto-fix**: Yes (`eslint --fix`)

### R003: Tests Must Pass
- **Check**: All test suites green
- **Action**: Block PR merge
- **Auto-fix**: No

### R004: Coverage Threshold
- **Check**: Line coverage ≥70%
- **Action**: Block if below threshold
- **Auto-fix**: No (requires adding tests)

### R005: No Hardcoded Secrets
- **Pattern**: Detect API keys, passwords, tokens in code
- **Action**: Block immediately
- **Auto-fix**: No

---

## 🟡 WARNING (Non-blocking)

### R101: Bundle Size
- **Check**: Production bundle ≤2MB
- **Action**: Warn if exceeded
- **Auto-fix**: No

### R102: Build Time
- **Check**: CI build ≤5 minutes
- **Action**: Warn if exceeded
- **Auto-fix**: No

### R103: Console Statements
- **Pattern**: `console.log`, `console.debug` in production
- **Action**: Warn (suggest removal)
- **Auto-fix**: Yes (can remove)

### R104: TODO/FIXME Comments
- **Pattern**: `TODO:`, `FIXME:`, `HACK:`
- **Action**: Warn and log for tracking
- **Auto-fix**: No

---

## 🔵 INFO (Tracked)

### R201: File Size
- **Check**: Single file ≤500 LOC
- **Action**: Log for review
- **Auto-fix**: No (requires refactoring)

### R202: Function Complexity
- **Check**: Cyclomatic complexity ≤10
- **Action**: Log for review
- **Auto-fix**: No

### R203: Import Depth
- **Check**: Max 5 levels of relative imports
- **Action**: Log for review
- **Auto-fix**: No

---

## 📋 SOLID Principles Check

### Single Responsibility (SRP)
```
✓ Each component has ONE reason to change
✓ Services handle ONE domain
✓ Hooks manage ONE concern
```

**Detection**:
- Files with >300 LOC flagged for review
- Components with >5 props reviewed
- Functions with >3 responsibilities warned

### Open/Closed (OCP)
```
✓ Extend through composition, not modification
✓ Use interfaces/types for extensibility
✓ Plugin architecture where appropriate
```

### Liskov Substitution (LSP)
```
✓ Derived components can replace base
✓ Props contracts are honored
✓ No unexpected side effects in overrides
```

### Interface Segregation (ISP)
```
✓ Small, focused interfaces
✓ Components accept only needed props
✓ No "god interfaces" with 20+ properties
```

### Dependency Inversion (DIP)
```
✓ Depend on abstractions (hooks, contexts)
✓ No direct database calls in components
✓ Use dependency injection patterns
```

---

## 🔒 Security Rules

### SEC001: SQL Injection Prevention
- Use parameterized queries only
- No string concatenation in SQL

### SEC002: XSS Prevention
- Sanitize user input
- Use React's built-in escaping

### SEC003: Authentication Check
- All protected routes verify auth
- No client-side only auth checks

### SEC004: RLS Enforcement
- All tenant tables have RLS
- Company_id filters applied

### SEC005: Dependency Audit
- No high/critical vulnerabilities
- Weekly dependency updates

---

## 📝 Documentation Rules

### DOC001: Changelog
- Updated for every release
- Follows Keep a Changelog format

### DOC002: API Documentation
- Public functions documented
- Props interfaces have JSDoc

### DOC003: Breaking Changes
- Clearly marked in PR description
- Migration guide provided

---

## 🗄️ Database Rules

### DB001: Migrations
- Must be reversible (up + down)
- Tested on staging first

### DB002: RLS
- All tables with company_id have RLS
- Policies reviewed for each table

### DB003: Indexes
- Foreign keys indexed
- Query patterns analyzed

---

## ⚙️ Configuration

```json
{
  "coverage_threshold": 70,
  "max_warnings": 10,
  "max_bundle_size_mb": 2,
  "max_build_time_min": 5,
  "max_file_loc": 500,
  "max_complexity": 10,
  "waiver_expiry_days": 7
}
```

---

**Enforcement Level**: Strict  
**Last Updated**: 2025-11-27

