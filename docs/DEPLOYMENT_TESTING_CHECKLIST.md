# Vercel Deployment Testing Checklist

## Overview
This checklist ensures thorough testing of the Vercel deployment configuration for the Fleetify application. Follow this checklist before and after deploying configuration changes.

---

## Pre-Deployment Checklist

### 1. Local Build Verification

- [ ] **Clean Install Dependencies**
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

- [ ] **Local Build Test**
  ```bash
  npm run build
  ```
  - Build completes without errors
  - No TypeScript errors
  - No linting errors
  - Build output in `dist/` directory

- [ ] **Preview Build Locally**
  ```bash
  npm run preview
  ```
  - Server starts successfully (http://localhost:4173)
  - Homepage loads correctly
  - Navigation between routes works
  - No console errors

### 2. Configuration Validation

- [ ] **Verify vercel.json Structure**
  - `$schema` property present for IDE support
  - `framework` set to "vite"
  - `outputDirectory` set to "dist"
  - `rewrites` configured for SPA routing
  - `headers` include all security headers
  - No deprecated properties (`builds`, `routes`, `functions`, `env`)

- [ ] **Check JSON Syntax**
  ```bash
  # Validate JSON syntax
  cat vercel.json | jq .
  ```
  - No syntax errors
  - Properly formatted

- [ ] **Review Security Headers**
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security: max-age=31536000
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: geolocation=(), microphone=(), camera=()
  - Content-Security-Policy: (comprehensive policy)

### 3. Environment Variables Setup

- [ ] **Vercel Dashboard Configuration**
  - Navigate to Project → Settings → Environment Variables
  - Verify `VITE_SUPABASE_URL` is set for all environments
  - Verify `VITE_SUPABASE_ANON_KEY` is set for all environments
  - Verify `VITE_ENCRYPTION_SECRET` is set for all environments
  - Different encryption secrets for Production vs Preview/Development

- [ ] **GitHub Actions Secrets**
  - Repository → Settings → Secrets and variables → Actions
  - `VITE_SUPABASE_URL` exists
  - `VITE_SUPABASE_ANON_KEY` exists
  - `VITE_ENCRYPTION_SECRET` exists
  - `VERCEL_TOKEN` exists
  - `VERCEL_ORG_ID` exists
  - `VERCEL_PROJECT_ID` exists

- [ ] **Local Development**
  ```bash
  # Pull environment variables from Vercel
  vercel env pull .env
  ```
  - `.env` file created
  - All required variables present
  - Values match expected format

### 4. Code Quality Checks

- [ ] **Run Linter**
  ```bash
  npm run lint
  ```
  - No linting errors
  - Code follows style guidelines

- [ ] **Run Tests (if available)**
  ```bash
  npm test
  ```
  - All tests pass
  - No test failures

- [ ] **TypeScript Compilation**
  ```bash
  npx tsc --noEmit
  ```
  - No type errors
  - All imports resolve correctly

---

## Preview Deployment Testing

### 1. Create Preview Deployment

- [ ] **Create Test Branch**
  ```bash
  git checkout -b test-vercel-config-$(date +%Y%m%d)
  git add .
  git commit -m "test: Vercel configuration update"
  git push origin test-vercel-config-$(date +%Y%m%d)
  ```

- [ ] **Open Pull Request**
  - Create PR on GitHub
  - Vercel bot comments with preview URL
  - Deployment status shows "Ready"
  - Build logs show no errors

### 2. Preview Deployment Functional Testing

- [ ] **Core Application Features**
  - [ ] Homepage loads without errors
  - [ ] Login page accessible
  - [ ] Authentication flow works
  - [ ] Dashboard loads after login
  - [ ] Navigation menu functional
  - [ ] All main sections accessible (Finance, Legal, Vehicles, etc.)

- [ ] **Routing & Navigation**
  - [ ] Deep links work (e.g., `/finance`, `/legal`)
  - [ ] Browser back/forward buttons work
  - [ ] Page refresh on internal routes doesn't cause 404
  - [ ] Hash navigation works (if applicable)
  - [ ] External links open correctly

- [ ] **Static Assets**
  - [ ] Images load correctly
  - [ ] Fonts are applied properly
  - [ ] CSS styles render correctly
  - [ ] Icons display properly
  - [ ] Favicons visible in browser tab

- [ ] **Data & API Connections**
  - [ ] Supabase connection successful
  - [ ] Data fetching works
  - [ ] CRUD operations function
  - [ ] Real-time updates work (if applicable)
  - [ ] File uploads work (if applicable)

- [ ] **Forms & User Interactions**
  - [ ] Forms submit successfully
  - [ ] Validation messages display
  - [ ] Error handling works
  - [ ] Success notifications appear
  - [ ] Modal dialogs open/close correctly

### 3. Browser Compatibility Testing

- [ ] **Desktop Browsers**
  - [ ] Chrome/Edge (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest) - if available

- [ ] **Mobile Browsers**
  - [ ] Chrome Mobile
  - [ ] Safari Mobile (iOS)
  - [ ] Responsive design works
  - [ ] Touch interactions functional

### 4. Performance Testing

- [ ] **Lighthouse Audit**
  ```bash
  # Open DevTools → Lighthouse → Run Audit
  ```
  - Performance Score: > 90
  - Accessibility Score: > 95
  - Best Practices Score: > 90
  - SEO Score: > 90
  - Core Web Vitals within thresholds:
    - LCP (Largest Contentful Paint): < 2.5s
    - FID (First Input Delay): < 100ms
    - CLS (Cumulative Layout Shift): < 0.1

- [ ] **Bundle Size Analysis**
  ```bash
  npm run build:analyze
  ```
  - Total bundle size reasonable (< 500KB gzipped for initial load)
  - Chunks properly split
  - No duplicate dependencies
  - Vendor chunks appropriately sized

- [ ] **Network Performance**
  - Check Network tab in DevTools
  - Assets load in parallel
  - No failed requests
  - Reasonable load times

---

## Security Verification

### 1. Security Headers Check

- [ ] **Automated Security Header Test**
  - Visit: https://securityheaders.com/
  - Enter preview deployment URL
  - Grade: A or A+
  - All recommended headers present

- [ ] **Manual DevTools Verification**
  - Open DevTools → Network tab
  - Refresh page
  - Click on document request (HTML)
  - Check Response Headers:
    ```
    x-content-type-options: nosniff
    x-frame-options: DENY
    x-xss-protection: 1; mode=block
    strict-transport-security: max-age=31536000; includeSubDomains
    referrer-policy: strict-origin-when-cross-origin
    permissions-policy: geolocation=(), microphone=(), camera=()
    content-security-policy: (full CSP string)
    ```

### 2. Content Security Policy Testing

- [ ] **Console CSP Violations**
  - No CSP violation errors in console
  - If violations present, verify they're expected
  - Scripts load successfully
  - Styles apply correctly
  - External resources (Supabase) connect properly

- [ ] **CSP Directives Verification**
  - [ ] `default-src 'self'` - Only same-origin by default
  - [ ] `script-src` - Allows inline scripts (required for Vite)
  - [ ] `style-src` - Allows inline styles
  - [ ] `img-src` - Allows HTTPS images
  - [ ] `connect-src` - Allows Supabase domains
  - [ ] `frame-ancestors 'none'` - Prevents iframe embedding

### 3. Asset Caching Verification

- [ ] **Cache Headers for Static Assets**
  - Filter Network tab by JS/CSS files
  - Click on any asset file from `/assets/`
  - Verify Response Headers:
    ```
    cache-control: public, max-age=31536000, immutable
    ```

- [ ] **Content Hashing**
  - Asset filenames include hash (e.g., `app-a1b2c3d4.js`)
  - Each deployment has unique hashes
  - Old asset URLs remain accessible

### 4. SSL/TLS Configuration

- [ ] **HTTPS Enforcement**
  - Preview URL uses HTTPS
  - No mixed content warnings
  - Valid SSL certificate
  - TLS 1.2 or higher

- [ ] **HSTS Header**
  - Strict-Transport-Security header present
  - Max-age set to 1 year (31536000)
  - includeSubDomains directive present

---

## Production Deployment Checklist

### 1. Pre-Production Verification

- [ ] **Final Code Review**
  - All changes reviewed
  - No debug code or console.logs
  - Comments removed or minimal
  - Code follows project standards

- [ ] **Deployment Approval**
  - Preview deployment tested thoroughly
  - Team approval obtained
  - Stakeholder sign-off (if required)
  - Merge PR to main branch

### 2. Production Deployment Monitoring

- [ ] **GitHub Actions Workflow**
  - Navigate to Actions tab
  - Watch deployment workflow progress
  - All jobs complete successfully:
    - Test job passes
    - Build job completes
    - Deploy job succeeds

- [ ] **Vercel Deployment Status**
  - Vercel Dashboard → Deployments
  - Latest deployment shows "Ready"
  - Build logs have no errors
  - Deployment time reasonable

### 3. Production Verification

- [ ] **Core Functionality**
  - [ ] Production URL loads (e.g., https://fleetify.app)
  - [ ] Homepage renders correctly
  - [ ] Authentication works
  - [ ] Main features functional
  - [ ] Data loads from production database

- [ ] **Environment Variables**
  - Production environment variables active
  - Supabase connection to production database
  - No environment variable errors in logs
  - Encryption working correctly

- [ ] **Custom Domain (if configured)**
  - [ ] Custom domain resolves correctly
  - [ ] SSL certificate active
  - [ ] www redirect works (if configured)
  - [ ] No DNS errors

### 4. Post-Deployment Monitoring

- [ ] **Error Monitoring**
  - Check Vercel Dashboard → Logs
  - No server errors (5xx)
  - No client errors (4xx beyond expected 404s)
  - No JavaScript errors in Sentry/error tracking (if configured)

- [ ] **Analytics Check (if enabled)**
  - Vercel Analytics receiving data
  - Page views tracking
  - Core Web Vitals monitoring
  - No anomalies in traffic

- [ ] **Performance Baseline**
  - Run Lighthouse on production URL
  - Document baseline scores
  - Set up performance monitoring alerts

---

## Rollback Procedures

### When to Rollback

Consider rollback if you observe:
- Widespread user-facing errors
- Critical functionality broken
- Severe performance degradation
- Security vulnerabilities exposed
- Database connection failures

### Rollback Options

- [ ] **Option 1: Vercel Dashboard Rollback**
  1. Vercel Dashboard → Project → Deployments
  2. Find last known good deployment
  3. Click "..." → "Promote to Production"
  4. Confirm rollback
  5. Verify rollback successful

- [ ] **Option 2: Vercel CLI Rollback**
  ```bash
  vercel ls
  vercel rollback <deployment-url>
  ```

- [ ] **Option 3: Git Revert**
  ```bash
  git revert HEAD
  git push origin main
  ```
  - Wait for automatic deployment
  - Verify previous configuration restored

- [ ] **Option 4: Restore Backup Configuration**
  ```bash
  cp vercel.json.backup vercel.json
  git add vercel.json
  git commit -m "rollback: Restore previous Vercel configuration"
  git push origin main
  ```

### Post-Rollback Actions

- [ ] Verify application functionality restored
- [ ] Notify team of rollback
- [ ] Document what went wrong
- [ ] Create issue to track problem
- [ ] Plan fix for next deployment

---

## Continuous Monitoring

### Daily Checks

- [ ] Review Vercel deployment logs for errors
- [ ] Check uptime status
- [ ] Monitor error rates
- [ ] Review Core Web Vitals trends

### Weekly Checks

- [ ] Analyze performance metrics
- [ ] Review security header compliance
- [ ] Check for Vercel platform updates
- [ ] Verify backups are current

### Monthly Checks

- [ ] Run full Lighthouse audit
- [ ] Review and update CSP if needed
- [ ] Check for dependency updates
- [ ] Perform security audit
- [ ] Review environment variable usage

---

## Issue Reporting Template

If issues are found during testing, document them using this template:

```markdown
## Issue: [Brief Description]

**Severity:** [Critical/High/Medium/Low]
**Environment:** [Preview/Production]
**Deployment URL:** [URL where issue occurred]

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Screenshots/Logs
[Attach relevant screenshots or log excerpts]

### Browser/Device Information
- Browser: [Chrome/Firefox/Safari]
- Version: [Browser version]
- OS: [Windows/Mac/Linux/iOS/Android]
- Device: [Desktop/Mobile/Tablet]

### Additional Context
[Any other relevant information]
```

---

## Success Criteria

Deployment is considered successful when ALL of the following are true:

- ✅ Build completes without errors
- ✅ All routes accessible and functional
- ✅ Authentication works correctly
- ✅ Environment variables properly configured
- ✅ Security headers present and correct (Grade A/A+)
- ✅ No CSP violations in console
- ✅ Asset caching working (1-year cache headers)
- ✅ Core Web Vitals within targets (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- ✅ Lighthouse Performance score > 90
- ✅ No critical errors in Vercel logs
- ✅ All major features functional
- ✅ SSL/HTTPS working correctly
- ✅ Mobile responsiveness intact

---

## Quick Reference Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linter
npm run lint

# Analyze bundle size
npm run build:analyze

# Pull environment variables from Vercel
vercel env pull .env

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployments
vercel ls

# Rollback deployment
vercel rollback <deployment-url>

# View logs
vercel logs <deployment-url>
```

---

## Checklist Completion

**Date Tested:** _______________

**Tester Name:** _______________

**Deployment URL:** _______________

**Overall Result:** [ ] PASS  [ ] FAIL

**Notes:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

---

**Last Updated:** 2025-10-12

**Version:** 1.0.0
