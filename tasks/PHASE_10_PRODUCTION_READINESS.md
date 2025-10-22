# Task: Phase 10 - Production Readiness & Deployment

## Objective
Deploy FleetifyApp to production environment with confidence after achieving 82.4% test pass rate, 76% code coverage, and 100% WCAG AA compliance. Ensure production readiness through comprehensive pre-flight checks, staging validation, and monitored deployment with rollback capabilities.

**Business Impact:**
- Launch fully tested ERP system to production
- Enable customers to use FleetifyApp with high reliability (398/483 tests passing)
- Ensure accessibility compliance for all users
- Provide monitoring and error tracking for production stability

## Acceptance Criteria
- [ ] All pre-flight checks passed (build, tests, environment variables)
- [ ] Staging environment deployed and validated
- [ ] Production environment deployed successfully
- [ ] Monitoring and error tracking active (Sentry/logging)
- [ ] Database migrations applied without errors
- [ ] Production smoke tests passed (5 critical paths)
- [ ] Performance metrics within targets (<3s initial load, <1s interactions)
- [ ] Rollback plan documented and tested
- [ ] Team trained on deployment procedures
- [ ] Documentation updated with deployment details

## Scope & Impact Radius

### Modules/files likely touched:
**Environment & Configuration:**
- `.env` - Production environment variables (Supabase URL, keys, feature flags)
- `vercel.json` - Deployment configuration for Vercel
- `netlify.toml` - Alternative deployment configuration for Netlify
- `package.json` - Build scripts verification

**Database:**
- Supabase migrations (100+ migration files to be applied)
- RLS policies verification
- Database indexes optimization
- Connection pooling configuration

**Build & Deployment:**
- `vite.config.ts` - Production build optimizations
- `vitest.config.ts` - Test configuration
- Build artifacts in `dist/` directory
- Source maps and asset optimization

**Monitoring & Logging:**
- Error boundary implementation
- Sentry integration (if implementing monitoring)
- Performance monitoring setup
- Analytics configuration

### Out-of-scope:
- Major feature development (Phase 9B testing complete, no new features)
- Database schema changes (migrations already created in Phase 7B/7C)
- UI/UX redesigns (completed in Phase 8)
- E2E testing with Playwright (deferred to Phase 11)
- Load testing with high traffic volumes (deferred to Phase 11)

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Database migration fails in production | **Critical** | Low | Test all migrations on staging first; create backup before deployment; maintain rollback scripts |
| Environment variables misconfigured | High | Medium | Use .env.example as template; validate all required vars before deployment; test on staging |
| Build failures due to missing dependencies | High | Low | Lock dependency versions in package-lock.json; test build locally and in CI |
| Performance degradation in production | Medium | Medium | Run Lighthouse audits pre-deployment; monitor Core Web Vitals; have optimization plan ready |
| Supabase RLS policies blocking legitimate users | High | Low | Test RLS policies with multiple user roles on staging; verify company_id filtering |
| Downtime during deployment | Medium | Low | Use zero-downtime deployment strategy; deploy during low-traffic hours; have rollback ready |
| Missing Supabase Edge Functions deployment | Medium | Low | Verify all 5 edge functions deployed (financial-analysis-ai, intelligent-contract-processor, etc.) |

**Mitigation Strategy:**
- Deploy to staging first, validate all critical paths
- Create database backup before migration
- Deploy during low-traffic hours (if applicable)
- Monitor error rates in first 24 hours
- Keep previous deployment ready for rollback
- Incremental rollout with feature flags for high-risk features

## Steps

### Step 1: Pre-flight Checks ✈️
**Objective:** Verify codebase is production-ready

- [ ] Run full test suite: `npm run test:run`
  - Target: 398+ tests passing (82.4%+ pass rate)
- [ ] Run TypeScript typecheck: `npx tsc --noEmit`
  - Target: Zero type errors
- [ ] Run build: `npm run build`
  - Target: Build completes successfully, <2MB bundle size
- [ ] Run lint: `npm run lint`
  - Target: Zero linting errors
- [ ] Verify accessibility tests: `npm run test -- src/__tests__/accessibility --run`
  - Target: 125/126 passing (99.2%), zero axe-core violations
- [ ] Review test coverage: `npm run test:coverage`
  - Target: >76% coverage maintained
- [ ] Check for TODO/FIXME comments: `grep -r "TODO" src/ | wc -l`
  - Target: Document any remaining TODOs as known limitations
- [ ] Verify .env.example is up-to-date with all required variables
- [ ] Confirm no secrets in codebase: `grep -r "sk-" src/` (OpenAI keys, etc.)

**Success Criteria:** All checks pass with zero blockers

---

### Step 2: Environment Setup 🔧
**Objective:** Configure production environment variables and secrets

- [ ] Create production Supabase project (if not exists)
  - Project name: fleetify-production
  - Region: Select closest to target users
- [ ] Set up environment variables in deployment platform (Vercel/Netlify):
  ```env
  # Required
  VITE_SUPABASE_URL=<production-url>
  VITE_SUPABASE_ANON_KEY=<production-anon-key>
  VITE_OPENAI_API_KEY=<production-openai-key>

  # Optional (if implementing)
  VITE_ENABLE_ANALYTICS=true
  VITE_SENTRY_DSN=<sentry-dsn>
  ```
- [ ] Configure Supabase settings:
  - [ ] Auth providers enabled (email/password)
  - [ ] Storage buckets created (vendor_documents, etc.)
  - [ ] Edge Functions deployed (5 functions)
  - [ ] Database connection pooling enabled
  - [ ] RLS policies active on all tables
- [ ] Set up deployment secrets in Vercel/Netlify dashboard
- [ ] Verify CORS settings for Supabase API
- [ ] Configure custom domain (if applicable)

**Success Criteria:** All environment variables configured and validated

---

### Step 3: Database Migrations 🗄️
**Objective:** Apply all database migrations to production

**IMPORTANT:** This is the highest-risk step. Take backups first.

- [ ] Create database backup:
  ```bash
  # Via Supabase Dashboard: Settings > Database > Backups > Create Backup
  ```
- [ ] Review migration files to be applied:
  ```bash
  cd supabase/migrations
  ls -la
  # Expected: 100+ migration files from Phase 7B/7C/7D
  ```
- [ ] Apply migrations to staging first:
  ```bash
  # Link to staging project
  npx supabase link --project-ref <staging-project-ref>

  # Push migrations
  npx supabase db push

  # Verify tables created
  npx supabase db pull
  ```
- [ ] Test staging database:
  - [ ] Verify all tables exist (inventory_*, sales_*, vendor_*, etc.)
  - [ ] Verify RLS policies active: `SELECT * FROM pg_policies;`
  - [ ] Test CRUD operations via staging UI
  - [ ] Verify foreign key constraints working
- [ ] Apply migrations to production:
  ```bash
  # Link to production project
  npx supabase link --project-ref <production-project-ref>

  # Push migrations
  npx supabase db push

  # Verify success
  npx supabase db pull
  ```
- [ ] Verify production database schema matches SYSTEM_REFERENCE.md
- [ ] Document migration completion time and any issues

**Rollback Plan:** If migration fails:
1. Restore from backup via Supabase Dashboard
2. Review migration error logs
3. Fix migration files locally
4. Re-test on staging
5. Re-attempt production deployment

**Success Criteria:** All migrations applied, database schema complete, RLS active

---

### Step 4: Deploy to Staging 🚀
**Objective:** Deploy to staging environment for validation

#### Option A: Vercel Deployment (Primary)
```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Link project to Vercel
vercel link

# Set staging environment variables in Vercel dashboard
# Visit: https://vercel.com/[team]/[project]/settings/environment-variables

# Deploy to staging
vercel --env=preview

# Wait for deployment
# Expected output: Deployment URL (e.g., https://fleetify-abc123.vercel.app)
```

#### Option B: Netlify Deployment (Alternative)
```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Link project to Netlify
netlify link

# Set staging environment variables in Netlify dashboard
# Visit: https://app.netlify.com/sites/[site-name]/settings/env

# Deploy to staging
netlify deploy --build

# Wait for deployment
# Expected output: Deployment URL (e.g., https://staging--fleetify.netlify.app)
```

**Tasks:**
- [ ] Deploy to staging environment
- [ ] Verify deployment URL is accessible
- [ ] Verify environment variables loaded correctly (check Supabase connection)
- [ ] Check browser console for errors (should be clean)
- [ ] Verify build size: Target <2MB gzipped

**Success Criteria:** Staging deployment successful, URL accessible, no console errors

---

### Step 5: Staging Validation 🧪
**Objective:** Comprehensive testing on staging environment

#### Critical Path Testing (5 Paths)
- [ ] **Path 1: User Authentication**
  - [ ] User registration works
  - [ ] User login works
  - [ ] Session persistence works
  - [ ] Logout works
  - [ ] RLS policies enforce company_id isolation

- [ ] **Path 2: Contract Management**
  - [ ] Create new contract
  - [ ] View contract list
  - [ ] Edit contract
  - [ ] Add payment to contract
  - [ ] Generate contract PDF export

- [ ] **Path 3: Inventory Management** (Phase 7B)
  - [ ] Create inventory item
  - [ ] View inventory dashboard
  - [ ] Adjust stock levels
  - [ ] View stock movement history
  - [ ] Export inventory to Excel

- [ ] **Path 4: Sales Pipeline** (Phase 7B)
  - [ ] Create lead
  - [ ] Convert lead to opportunity
  - [ ] Generate quote
  - [ ] Create sales order
  - [ ] View sales analytics

- [ ] **Path 5: Financial Tracking**
  - [ ] Create chart of account
  - [ ] Record journal entry
  - [ ] View financial summary
  - [ ] Export financial report to PDF
  - [ ] View enhanced dashboard widgets (Phase 7C)

#### Accessibility Validation
- [ ] Run axe DevTools extension on 5 key pages
- [ ] Test keyboard navigation (Tab, Enter, Esc)
- [ ] Test screen reader compatibility (NVDA/JAWS)
- [ ] Verify RTL layout for Arabic language
- [ ] Verify WCAG AA compliance (match 100% from Phase 9B)

#### Performance Validation
- [ ] Run Lighthouse audit on staging:
  ```bash
  npm install -g lighthouse
  lighthouse https://staging-url.vercel.app --view
  ```
  - Target: Performance >90, Accessibility 100, Best Practices >90
- [ ] Test dashboard load time: Target <3s initial load
- [ ] Test widget interaction time: Target <1s per action
- [ ] Test export functionality: PDF/Excel generation <5s
- [ ] Monitor network requests in DevTools (no 500 errors)

#### Browser Compatibility
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (latest)
- [ ] Test on Edge (latest)
- [ ] Test on mobile (iOS Safari + Android Chrome)

**Success Criteria:** All critical paths working, accessibility 100%, performance >90, zero critical bugs

---

### Step 6: Deploy to Production 🎯
**Objective:** Deploy to production with monitoring

#### Pre-Deployment Checklist
- [ ] Staging validation complete (all 5 critical paths tested)
- [ ] Database migrations applied and tested
- [ ] Environment variables configured
- [ ] Team notified of deployment window
- [ ] Rollback plan documented and accessible
- [ ] Backup of current production state (if redeploying)

#### Deployment Commands

**Vercel Production Deployment:**
```bash
# Deploy to production
vercel --prod

# Wait for deployment
# Expected output: Production URL (e.g., https://fleetify.com or custom domain)

# Verify deployment
curl -I https://fleetify.com
# Expected: HTTP 200 OK
```

**Netlify Production Deployment:**
```bash
# Deploy to production
netlify deploy --prod

# Wait for deployment
# Expected output: Production URL (e.g., https://fleetify.netlify.app or custom domain)

# Verify deployment
curl -I https://fleetify.netlify.app
# Expected: HTTP 200 OK
```

**Tasks:**
- [ ] Deploy to production
- [ ] Verify production URL is live
- [ ] Test homepage loads successfully
- [ ] Verify no console errors on homepage
- [ ] Test login flow immediately
- [ ] Monitor error logs for first 10 minutes

**Success Criteria:** Production deployment successful, URL live, login working

---

### Step 7: Production Smoke Tests 🔥
**Objective:** Quick validation of production environment

**Execute within 30 minutes of deployment:**

- [ ] **Smoke Test 1: Authentication**
  - [ ] Create test user account
  - [ ] Login with test account
  - [ ] Verify session persists after refresh
  - [ ] Logout successfully

- [ ] **Smoke Test 2: Core Module Access**
  - [ ] Access Dashboard
  - [ ] Access Contracts page
  - [ ] Access Customers page
  - [ ] Access Inventory page (Phase 7B)
  - [ ] Access Finance page

- [ ] **Smoke Test 3: Data Operations**
  - [ ] Create a test contract
  - [ ] View contract in list
  - [ ] Edit contract details
  - [ ] Delete test contract

- [ ] **Smoke Test 4: Export Functionality** (Phase 8)
  - [ ] Export dashboard widget to PDF
  - [ ] Export table to Excel
  - [ ] Export data to CSV
  - [ ] Verify files download correctly

- [ ] **Smoke Test 5: Performance Check**
  - [ ] Dashboard loads in <3s
  - [ ] Widget interactions <1s
  - [ ] No JavaScript errors in console
  - [ ] Mobile responsive layout works

**Success Criteria:** All smoke tests pass within 30 minutes

---

### Step 8: Monitoring Setup (Optional) 📊
**Objective:** Enable production monitoring and error tracking

#### Option A: Basic Monitoring (Free)
- [ ] Enable Vercel/Netlify built-in analytics
- [ ] Set up uptime monitoring (e.g., UptimeRobot free tier)
- [ ] Configure email alerts for downtime
- [ ] Monitor browser console errors manually

#### Option B: Advanced Monitoring (Recommended for Production)
- [ ] Install Sentry for error tracking:
  ```bash
  npm install @sentry/react @sentry/tracing
  ```
- [ ] Configure Sentry in `src/main.tsx`:
  ```typescript
  import * as Sentry from "@sentry/react";

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: "production",
    tracesSampleRate: 0.1,
  });
  ```
- [ ] Test Sentry error reporting:
  ```typescript
  Sentry.captureMessage("Production deployment test");
  ```
- [ ] Set up Sentry alerts for critical errors
- [ ] Configure performance monitoring
- [ ] Add user context to error reports

**Tasks:**
- [ ] Choose monitoring approach (Basic or Advanced)
- [ ] Implement selected monitoring
- [ ] Verify error tracking works (send test error)
- [ ] Configure alert thresholds
- [ ] Document monitoring dashboards

**Success Criteria:** Monitoring active, test alert received

---

### Step 9: Performance Verification 🏎️
**Objective:** Validate production performance meets targets

- [ ] Run Lighthouse audit on production:
  ```bash
  lighthouse https://production-url.com --view
  ```
  - Target: Performance >90, Accessibility 100, Best Practices >90, SEO >90

- [ ] Measure Core Web Vitals:
  - [ ] LCP (Largest Contentful Paint): <2.5s
  - [ ] FID (First Input Delay): <100ms
  - [ ] CLS (Cumulative Layout Shift): <0.1

- [ ] Test bundle size:
  ```bash
  npm run build:analyze
  # Review bundle size in dist/stats.html
  ```
  - Target: Main bundle <2MB, gzipped <500KB

- [ ] Monitor initial load time:
  - [ ] Homepage: <3s
  - [ ] Dashboard: <3s
  - [ ] Inventory page: <3s

- [ ] Test database query performance:
  - [ ] Contracts list load: <1s for 100 records
  - [ ] Customers list load: <1s for 100 records
  - [ ] Dashboard widgets load: <2s total

**Success Criteria:** All performance targets met or documented as known limitations

---

### Step 10: Security Audit ���
**Objective:** Verify security best practices in production

- [ ] **Authentication & Authorization**
  - [ ] Verify JWT tokens expire correctly
  - [ ] Verify RLS policies enforce company_id isolation
  - [ ] Test unauthorized access attempts (should be blocked)
  - [ ] Verify role-based permissions work

- [ ] **Data Protection**
  - [ ] Verify all API calls use HTTPS
  - [ ] Check for exposed API keys in browser (should be none)
  - [ ] Verify Supabase anon key is restricted to read-only RLS
  - [ ] Test input validation with XSS attempts (should be blocked)

- [ ] **Supabase Configuration**
  - [ ] Verify RLS enabled on all tables
  - [ ] Check for overly permissive RLS policies
  - [ ] Verify foreign key constraints active
  - [ ] Test SQL injection protection (parameterized queries)

- [ ] **Environment Variables**
  - [ ] Confirm no secrets in client-side code
  - [ ] Verify .env file not committed to Git
  - [ ] Check Vercel/Netlify environment variables are secure

**Success Criteria:** Zero security vulnerabilities found, all best practices followed

---

### Step 11: Documentation Update 📝
**Objective:** Update all documentation with production details

- [ ] Update SYSTEM_REFERENCE.md:
  - [ ] Add deployment section with production URLs
  - [ ] Document environment variables required
  - [ ] Add monitoring dashboard links
  - [ ] Update version history to v1.3.0 (Phase 10 complete)

- [ ] Create DEPLOYMENT_GUIDE.md (if not exists):
  - [ ] Step-by-step deployment process
  - [ ] Rollback procedures
  - [ ] Database migration guide
  - [ ] Environment setup guide
  - [ ] Troubleshooting common issues

- [ ] Update PHASE_9B_SESSION_SUMMARY.md:
  - [ ] Add Phase 10 completion status
  - [ ] Document production deployment date
  - [ ] Link to production URL

- [ ] Create PRODUCTION_DEPLOYMENT_REPORT.md:
  - [ ] Deployment timeline
  - [ ] Performance metrics achieved
  - [ ] Known issues and limitations
  - [ ] Post-deployment action items

**Success Criteria:** All documentation updated and accessible

---

### Step 12: Team Training & Handoff 👥
**Objective:** Ensure team can maintain and troubleshoot production

- [ ] Conduct deployment walkthrough session:
  - [ ] Show production URL and key features
  - [ ] Demonstrate admin access and permissions
  - [ ] Review monitoring dashboards
  - [ ] Explain rollback procedures

- [ ] Provide access credentials:
  - [ ] Vercel/Netlify dashboard access
  - [ ] Supabase production dashboard access
  - [ ] Sentry dashboard access (if using)
  - [ ] Admin user credentials

- [ ] Document common operations:
  - [ ] How to apply database migrations
  - [ ] How to update environment variables
  - [ ] How to redeploy with new changes
  - [ ] How to check error logs
  - [ ] How to rollback deployment

- [ ] Create incident response plan:
  - [ ] Who to contact for production issues
  - [ ] Steps to take if site is down
  - [ ] Emergency rollback procedures
  - [ ] Communication templates for users

**Success Criteria:** Team trained, access granted, procedures documented

---

### Step 13: Post-Deployment Monitoring 🔍
**Objective:** Monitor production stability for 72 hours

- [ ] **First 24 Hours:**
  - [ ] Check error logs every 4 hours
  - [ ] Monitor performance metrics hourly
  - [ ] Respond to any user-reported issues immediately
  - [ ] Document any bugs or anomalies

- [ ] **Day 2-3:**
  - [ ] Review error rates (target: <0.1% of requests)
  - [ ] Check performance trends (should be stable)
  - [ ] Review user feedback
  - [ ] Address any critical issues

- [ ] **After 72 Hours:**
  - [ ] Generate deployment success report
  - [ ] Document lessons learned
  - [ ] Plan Phase 11 improvements based on production data
  - [ ] Close deployment tickets

**Success Criteria:** Production stable for 72 hours, error rate <0.1%, performance within targets

---

## Review (fill after implementation)

### Summary of changes:
- [ ] Production environment deployed
- [ ] Database migrations applied
- [ ] Monitoring and error tracking enabled
- [ ] Performance metrics validated
- [ ] Documentation updated
- [ ] Team trained

### Known limitations:
- [ ] Document any performance bottlenecks discovered
- [ ] Note any browser compatibility issues
- [ ] List any features disabled in production
- [ ] Document any manual steps required

### Follow-ups for Phase 11:
- [ ] E2E testing with Playwright/Cypress
- [ ] Load testing with realistic traffic
- [ ] Performance optimization (if needed)
- [ ] Additional monitoring and alerting
- [ ] User feedback integration
- [ ] Feature enhancements based on production data

---

## Timeline & Milestones

| Step | Duration | Completion Date | Status |
|------|----------|-----------------|--------|
| Pre-flight checks | 2 hours | - | ⏳ Pending |
| Environment setup | 3 hours | - | ⏳ Pending |
| Database migrations | 4 hours | - | ⏳ Pending |
| Deploy to staging | 1 hour | - | ⏳ Pending |
| Staging validation | 6 hours | - | ⏳ Pending |
| Deploy to production | 1 hour | - | ⏳ Pending |
| Production smoke tests | 1 hour | - | ⏳ Pending |
| Monitoring setup | 3 hours | - | ⏳ Pending |
| Performance verification | 2 hours | - | ⏳ Pending |
| Security audit | 3 hours | - | ⏳ Pending |
| Documentation update | 4 hours | - | ⏳ Pending |
| Team training | 2 hours | - | ⏳ Pending |
| Post-deployment monitoring | 72 hours | - | ⏳ Pending |

**Total Estimated Duration:** 3-5 days (32 hours active work + 72 hours monitoring)

**Recommended Start Date:** When user confirms approval

---

## PR Checklist

When creating PR for this deployment:

- [ ] Conventional commit title: `deploy: Phase 10 production deployment with 82.4% test coverage`
- [ ] Clear description of deployment steps taken
- [ ] Acceptance criteria met & demonstrated with screenshots
- [ ] All tests passing (398/483 tests, 82.4% pass rate)
- [ ] Build passes in CI (if applicable)
- [ ] Non-breaking deployment path (zero-downtime)
- [ ] Rollback plan documented and tested
- [ ] Documentation updated (SYSTEM_REFERENCE.md, DEPLOYMENT_GUIDE.md)
- [ ] Monitoring dashboards linked in PR description
- [ ] Performance metrics included (Lighthouse scores)

---

## Rollback Plan

If production deployment fails or critical issues occur:

### Immediate Rollback (Within 1 hour)

**Vercel Rollback:**
```bash
# Via Vercel Dashboard:
# 1. Go to Deployments tab
# 2. Find previous successful deployment
# 3. Click "..." menu → "Promote to Production"

# Via CLI:
vercel rollback <previous-deployment-url>
```

**Netlify Rollback:**
```bash
# Via Netlify Dashboard:
# 1. Go to Deploys tab
# 2. Find previous successful deployment
# 3. Click "Publish deploy"

# Via CLI:
netlify rollback
```

**Database Rollback (if migrations applied):**
```bash
# Restore from backup via Supabase Dashboard:
# 1. Settings > Database > Backups
# 2. Select pre-deployment backup
# 3. Click "Restore"
# WARNING: This will overwrite current production data
```

### Communication During Rollback
- [ ] Notify team immediately via Slack/email
- [ ] Update status page (if applicable)
- [ ] Document root cause analysis
- [ ] Plan remediation steps

### Post-Rollback Actions
- [ ] Investigate failure root cause
- [ ] Fix issues on staging first
- [ ] Re-test thoroughly
- [ ] Schedule new deployment attempt

---

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Deployment Success** | 100% | All 13 steps completed |
| **Test Pass Rate** | >82.4% | npm run test:run |
| **Code Coverage** | >76% | npm run test:coverage |
| **Performance Score** | >90 | Lighthouse audit |
| **Accessibility Score** | 100 | Lighthouse + axe-core |
| **Error Rate** | <0.1% | Sentry/logs (first 72 hours) |
| **Uptime** | >99.9% | Uptime monitoring |
| **Initial Load Time** | <3s | Lighthouse + manual testing |
| **Database Migration Success** | 100% | All migrations applied |
| **Zero Critical Bugs** | 0 | Manual testing + user reports |

---

## References

- [SYSTEM_REFERENCE.md](../SYSTEM_REFERENCE.md) - System architecture and deployment platforms
- [PHASE_9B_SESSION_SUMMARY.md](../PHASE_9B_SESSION_SUMMARY.md) - Testing achievements
- [PHASE_9B_ACCESSIBILITY_REPORT.md](../PHASE_9B_ACCESSIBILITY_REPORT.md) - Accessibility compliance
- [package.json](../package.json) - Build scripts and dependencies
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs/guides/platform/migrating-and-upgrading-projects)

---

**Plan Created:** 2025-10-21
**Status:** ⏳ Awaiting User Approval
**Estimated Completion:** 3-5 days after approval
**Risk Level:** Medium (database migrations, production deployment)
