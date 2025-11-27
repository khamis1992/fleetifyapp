# Fleetify Deployment Guide

**Version**: 1.0.0  
**Last Updated**: September 1, 2025

---

## Overview

This guide provides step-by-step instructions for deploying the Fleetify fleet management system to production.

---

## Pre-Deployment Checklist

### Code Quality ✅
- [x] All tests passing (83%+ coverage)
- [x] No TypeScript errors
- [x] No ESLint warnings
- [x] Security audit passed
- [x] Performance optimized

### Database ✅
- [x] All migrations created
- [x] RLS policies implemented
- [x] Indexes optimized
- [ ] Production backup strategy

### Configuration
- [ ] Environment variables configured
- [ ] API keys encrypted and stored
- [ ] CORS settings configured
- [ ] Rate limiting configured

---

## Phase 10: Mobile Compatibility (Complete Before Deployment)

### Responsive Design Verification

**Test Breakpoints:**
```
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+
```

**Components to Test:**
1. UnifiedFinancialDashboard - Test on mobile/tablet
2. EnhancedLegalAIInterface_v2 - Ensure touch-friendly
3. UnifiedPaymentForm - Test form inputs on small screens
4. All navigation menus - Verify hamburger menu works

**Testing Command:**
```bash
# Start dev server
npm run dev

# Open in browser DevTools
# Toggle device toolbar (Ctrl+Shift+M)
# Test all breakpoints
```

### Capacitor Integration Testing

**iOS Setup:**
```bash
# Add iOS platform
npx cap add ios

# Sync assets
npx cap sync ios

# Open in Xcode
npx cap open ios

# Test on iOS simulator or device
```

**Android Setup:**
```bash
# Add Android platform
npx cap add android

# Sync assets
npx cap sync android

# Open in Android Studio
npx cap open android

# Test on Android emulator or device
```

### Offline Support Implementation

**Critical Features for Offline:**
1. View recent financial data (cached)
2. View contracts list (cached)
3. View customer list (cached)
4. Queue payment creation for sync

**Implementation:**
```typescript
// In queryClient.ts - already configured
networkMode: 'online',  // Suspend when offline

// Add service worker for offline caching
// File: public/sw.js
```

---

## Phase 11: Production Deployment

### Step 1: Environment Configuration

**Create `.env.production`:**
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Encryption Secret (Generate secure random string)
VITE_ENCRYPTION_SECRET=your-256-bit-secret-key

# Feature Flags
VITE_ENABLE_LEGAL_AI=true
VITE_ENABLE_MOBILE_APP=true

# Analytics (Optional)
VITE_GA_TRACKING_ID=UA-XXXXXXXXX-X

# Sentry (Optional)
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

**Generate Encryption Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Database Migration

**Apply Migrations to Production:**
```bash
# Using Supabase CLI
supabase db push --db-url "postgresql://postgres:[password]@[host]:5432/postgres"

# Or manually via SQL editor in Supabase Dashboard
# Run migrations in order:
# 1. 20250901000000_create_legal_system_tables.sql
# 2. 20250901120000_create_audit_logs_table.sql
```

**Verify Tables:**
```sql
-- Check legal tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'legal_%';

-- Check audit table
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'audit_logs';

-- Verify RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

### Step 3: Build for Production

**Build Command:**
```bash
# Install dependencies
npm ci

# Run tests
npm run test

# Build production bundle
npm run build

# Analyze bundle (optional)
npm run build -- --analyze
```

**Expected Output:**
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js      (~1.2 MB - main bundle)
│   ├── vendor-[hash].js     (~800 KB - dependencies)
│   ├── legal-[hash].js      (~200 KB - lazy loaded)
│   ├── finance-[hash].js    (~180 KB - lazy loaded)
│   └── ... (40+ chunks)
└── _redirects (for SPA routing)
```

### Step 4: CI/CD Pipeline Setup

**GitHub Actions Workflow:**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_ENCRYPTION_SECRET: ${{ secrets.VITE_ENCRYPTION_SECRET }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./dist
```

**GitHub Secrets to Add:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ENCRYPTION_SECRET`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Step 5: Deployment Platforms

#### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
```

#### Option 2: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist

# Configure environment variables in Netlify dashboard
```

#### Option 3: AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

### Step 6: Post-Deployment Verification

**Health Checks:**
```bash
# Check homepage loads
curl -I https://your-domain.com

# Check API connectivity
curl https://your-domain.com/api/health

# Check static assets
curl -I https://your-domain.com/assets/index-[hash].js
```

**Functional Tests:**
1. User login works
2. Dashboard loads with data
3. Payment creation works
4. Legal AI query processes
5. Mobile responsive on real devices

**Performance Tests:**
```bash
# Lighthouse audit
npx lighthouse https://your-domain.com --view

# Target scores:
# Performance: > 90
# Accessibility: > 95
# Best Practices: > 90
# SEO: > 85
```

### Step 7: Monitoring Setup

**Sentry for Error Tracking:**

```bash
npm install @sentry/react @sentry/tracing
```

**Configure in src/main.tsx:**
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
  environment: import.meta.env.MODE,
});
```

**Analytics (Google Analytics):**
```typescript
// Add to index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-XXXXXXXXX-X"></script>
```

### Step 8: Database Backups

**Automated Backups:**
```sql
-- Supabase automatically backs up daily
-- Configure retention in Supabase dashboard

-- Manual backup
pg_dump -h [host] -U postgres -d postgres > backup_$(date +%Y%m%d).sql

-- Restore
psql -h [host] -U postgres -d postgres < backup_20250901.sql
```

### Step 9: Security Hardening

**Headers Configuration:**

Create `vercel.json` or `netlify.toml`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
        }
      ]
    }
  ]
}
```

**Rate Limiting:**
```typescript
// Configure in Supabase Edge Functions or API Gateway
// Limit: 100 requests per minute per IP
```

### Step 10: DNS Configuration

**Set DNS Records:**
```
A     @              76.76.21.21
CNAME www            your-app.vercel.app
TXT   @              "v=spf1 include:_spf.google.com ~all"
```

**SSL Certificate:**
- Vercel/Netlify: Auto-provisioned (Let's Encrypt)
- AWS: Use AWS Certificate Manager

---

## Rollback Plan

**If deployment fails:**

1. **Revert code:**
```bash
git revert HEAD
git push origin main
```

2. **Rollback database:**
```sql
-- Restore from backup
psql -h [host] -U postgres -d postgres < backup_previous.sql
```

3. **Switch traffic:**
```bash
# In Vercel
vercel rollback

# In Netlify
netlify deploy --rollback
```

---

## Monitoring Checklist

**Daily:**
- [ ] Check error rates (Sentry)
- [ ] Check response times
- [ ] Review audit logs

**Weekly:**
- [ ] Review performance metrics
- [ ] Check database size
- [ ] Review security logs

**Monthly:**
- [ ] Update dependencies
- [ ] Security audit
- [ ] Performance optimization

---

## Support Contacts

**Development Team:** dev@fleetify.com  
**Operations:** ops@fleetify.com  
**Emergency:** +965-XXXX-XXXX

---

## Completion Checklist

### Phase 10: Mobile ☐
- [ ] Responsive design verified on 3+ breakpoints
- [ ] iOS app tested on physical device
- [ ] Android app tested on physical device
- [ ] Offline mode implemented and tested
- [ ] Touch interactions optimized
- [ ] App store submission prepared (if applicable)

### Phase 11: Deployment ☐
- [ ] Production environment configured
- [ ] Database migrations applied
- [ ] Build completed successfully
- [ ] CI/CD pipeline configured
- [ ] Deployed to production
- [ ] Post-deployment verification passed
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Documentation complete
- [ ] Team trained on deployment process

---

**Deployment Status**: Ready for execution  
**Estimated Time**: 2-3 days  
**Risk Level**: Low (all code tested and ready)
