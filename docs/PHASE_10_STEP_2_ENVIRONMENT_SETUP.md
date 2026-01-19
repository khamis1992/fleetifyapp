# Phase 10 Step 2: Environment Setup Guide

**Status:** 🔄 IN PROGRESS
**Estimated Duration:** 3 hours
**Prerequisites:** ✅ Pre-flight checks passed

---

## 📋 Overview

This guide will walk you through setting up the production environment for FleetifyApp deployment. We'll configure:

1. Production Supabase project
2. Vercel deployment platform
3. Environment variables
4. Supabase Edge Functions
5. Storage buckets

---

## 🎯 Required Environment Variables

Based on `.env.example`, FleetifyApp requires:

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `VITE_SUPABASE_URL` | Production Supabase URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase key (RLS protected) | Supabase Dashboard → Settings → API |
| `VITE_ENCRYPTION_SECRET` | Client-side encryption secret | Generate with OpenSSL/Node.js |

**Optional (Phase 11):**
- `VITE_SENTRY_DSN` - Error tracking (if using Sentry)
- `VITE_ENABLE_ANALYTICS` - Analytics flag

---

## 🚀 Step-by-Step Setup

### Task 2.1: Create Production Supabase Project

**Duration:** 30 minutes

#### Instructions:

1. **Go to Supabase Dashboard:**
   ```
   https://app.supabase.com/
   ```

2. **Sign in** (or create account if needed)

3. **Click "New Project"**

4. **Configure Project:**
   ```
   Project Name: fleetify-production
   Database Password: [Generate strong password - SAVE THIS]
   Region: [Select closest to your users]
   Pricing Plan: [Free tier OK for testing, Pro recommended for production]
   ```

5. **Click "Create Project"** (takes ~2 minutes)

6. **Wait for project to initialize** (you'll see a progress indicator)

#### Verification:
- [ ] Project shows "Active" status
- [ ] Database is accessible
- [ ] You have the database password saved securely

---

### Task 2.2: Get Supabase Credentials

**Duration:** 5 minutes

#### Instructions:

1. **Navigate to Settings:**
   ```
   Dashboard → Your Project → Settings → API
   ```

2. **Copy the following values:**

   **Project URL:**
   ```
   Example: https://abcdefghijklmnop.supabase.co
   ```
   - This is your `VITE_SUPABASE_URL`

   **Anon (public) Key:**
   ```
   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...
   ```
   - This is your `VITE_SUPABASE_ANON_KEY`
   - ⚠️ **IMPORTANT:** Use the **anon** key, NOT the service_role key

3. **Save these values** (you'll need them for Vercel configuration)

#### Verification:
- [ ] You have the Project URL (starts with https://)
- [ ] You have the Anon key (starts with eyJ)
- [ ] You did NOT copy the service_role key

---

### Task 2.3: Generate Encryption Secret

**Duration:** 2 minutes

#### Instructions:

**Option A: Using OpenSSL (recommended):**
```bash
openssl rand -base64 32
```

**Option B: Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option C: Using PowerShell (Windows):**
```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

#### Example Output:
```
aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE=
```

**Save this value** - This is your `VITE_ENCRYPTION_SECRET`

#### Verification:
- [ ] Generated a 32-byte base64 string
- [ ] Value saved securely

---

### Task 2.4: Set Up Vercel Project

**Duration:** 15 minutes

#### Prerequisites:
- [ ] GitHub account (for code hosting)
- [ ] Vercel account (free tier OK)

#### Instructions:

**Step 1: Push code to GitHub (if not already done)**
```bash
# Initialize git (if not already a repo)
git init

# Add all files
git add .

# Commit
git commit -m "feat: Phase 10 production-ready build"

# Create GitHub repository (via GitHub.com)
# Then add remote:
git remote add origin https://github.com/YOUR_USERNAME/fleetifyapp.git

# Push
git push -u origin main
```

**Step 2: Connect to Vercel**

1. **Go to Vercel Dashboard:**
   ```
   https://vercel.com/
   ```

2. **Click "Add New Project"**

3. **Import Git Repository:**
   - Select GitHub
   - Authenticate GitHub account
   - Select `fleetifyapp` repository

4. **Configure Project:**
   ```
   Framework Preset: Vite (auto-detected)
   Root Directory: ./
   Build Command: npm run build (auto-detected)
   Output Directory: dist (auto-detected)
   Install Command: npm install (auto-detected)
   ```

5. **⚠️ DO NOT DEPLOY YET** - Click "Skip" or "Cancel"
   - We need to set environment variables first

#### Verification:
- [ ] Vercel project created
- [ ] Repository connected
- [ ] Framework settings correct
- [ ] NOT deployed yet

---

### Task 2.5: Configure Vercel Environment Variables

**Duration:** 10 minutes

#### Instructions:

1. **Navigate to Project Settings:**
   ```
   Vercel Dashboard → Your Project → Settings → Environment Variables
   ```

2. **Add Production Variables:**

   **Variable 1: VITE_SUPABASE_URL**
   ```
   Name: VITE_SUPABASE_URL
   Value: [Your production Supabase URL from Task 2.2]
   Environment: Production (checked)
   ```

   **Variable 2: VITE_SUPABASE_ANON_KEY**
   ```
   Name: VITE_SUPABASE_ANON_KEY
   Value: [Your production anon key from Task 2.2]
   Environment: Production (checked)
   ```

   **Variable 3: VITE_ENCRYPTION_SECRET**
   ```
   Name: VITE_ENCRYPTION_SECRET
   Value: [Your generated secret from Task 2.3]
   Environment: Production (checked)
   ```

3. **Add Preview/Development Variables (Optional):**
   - If you want staging environment, repeat above for "Preview" environment
   - For local dev, keep using your local `.env` file

4. **Click "Save"** for each variable

#### Verification:
- [ ] All 3 variables added to Production environment
- [ ] Variable names start with `VITE_` (required)
- [ ] No typos in variable names
- [ ] No trailing spaces in values

---

### Task 2.6: Configure Supabase Settings

**Duration:** 30 minutes

#### Instructions:

**Step 1: Enable Authentication Providers**

1. **Navigate to Authentication:**
   ```
   Supabase Dashboard → Authentication → Providers
   ```

2. **Enable Email Provider:**
   - Toggle "Email" to ON
   - Enable "Confirm email": ON (recommended)
   - Email Templates: Use default (or customize)

3. **Add Site URL:**
   ```
   Authentication → URL Configuration → Site URL
   ```
   - Add your Vercel production URL (e.g., `https://fleetify.vercel.app`)
   - Add redirect URLs (same URL)

**Step 2: Create Storage Buckets**

1. **Navigate to Storage:**
   ```
   Supabase Dashboard → Storage → Create Bucket
   ```

2. **Create `vendor_documents` bucket:**
   ```
   Name: vendor_documents
   Public: No (private bucket)
   File size limit: 50 MB
   Allowed MIME types: application/pdf, image/*, application/msword, application/vnd.*
   ```

3. **Set RLS policies for `vendor_documents`:**
   ```sql
   -- Allow users to upload to their company's folder
   CREATE POLICY "Users can upload vendor documents"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'vendor_documents' AND
     (storage.foldername(name))[1] = auth.jwt() ->> 'company_id'
   );

   -- Allow users to read their company's documents
   CREATE POLICY "Users can view vendor documents"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'vendor_documents' AND
     (storage.foldername(name))[1] = auth.jwt() ->> 'company_id'
   );
   ```

4. **Create additional buckets (if needed):**
   - `contract_documents`
   - `invoice_attachments`
   - `profile_images`

**Step 3: Configure Database Connection Pooling**

1. **Navigate to Database Settings:**
   ```
   Supabase Dashboard → Settings → Database
   ```

2. **Enable Connection Pooling:**
   - Mode: Transaction
   - Pool size: 15 (adjust based on usage)

3. **Copy Pooler Connection String** (save for later)

#### Verification:
- [ ] Email authentication enabled
- [ ] Site URL configured with Vercel URL
- [ ] Storage buckets created
- [ ] RLS policies set on storage
- [ ] Connection pooling enabled

---

### Task 2.7: Deploy Supabase Edge Functions

**Duration:** 45 minutes

#### Prerequisites:
```bash
# Install Supabase CLI
npm install -g supabase
```

#### Instructions:

**Step 1: Link to Production Project**
```bash
# Login to Supabase CLI
supabase login

# Link to production project
supabase link --project-ref YOUR_PROJECT_REF

# Project ref is in your Supabase URL:
# https://[PROJECT_REF].supabase.co
```

**Step 2: Deploy Edge Functions**

FleetifyApp has 5 edge functions (from SYSTEM_REFERENCE.md):

1. **financial-analysis-ai**
2. **intelligent-contract-processor**
3. **process-traffic-fine**
4. **scan-invoice**
5. **transfer-user-company**

```bash
# Check if functions exist locally
ls supabase/functions/

# Deploy all functions
supabase functions deploy financial-analysis-ai
supabase functions deploy intelligent-contract-processor
supabase functions deploy process-traffic-fine
supabase functions deploy scan-invoice
supabase functions deploy transfer-user-company

# Or deploy all at once (if available)
supabase functions deploy --project-ref YOUR_PROJECT_REF
```

**Step 3: Set Function Secrets (if needed)**
```bash
# Example: If functions need OpenAI API key
supabase secrets set OPENAI_API_KEY=your_openai_key_here
```

**Step 4: Test Function Invocation**
```bash
# Test a simple function
supabase functions invoke process-traffic-fine --project-ref YOUR_PROJECT_REF
```

#### Verification:
- [ ] All 5 edge functions deployed
- [ ] Function secrets set (if required)
- [ ] Test invocation successful
- [ ] Functions visible in Supabase Dashboard → Edge Functions

---

### Task 2.8: Verify Vercel Configuration

**Duration:** 10 minutes

#### Instructions:

1. **Check `vercel.json` configuration:**
   - ✅ Framework: vite
   - ✅ Output directory: dist
   - ✅ Security headers configured
   - ✅ SPA routing enabled

2. **Verify Build Settings in Vercel:**
   ```
   Vercel Dashboard → Project → Settings → General
   ```
   - Node.js Version: 18.x or higher
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Check Domain Configuration (if custom domain):**
   ```
   Vercel Dashboard → Project → Settings → Domains
   ```
   - Add custom domain (e.g., fleetify.com)
   - Configure DNS records as instructed by Vercel

#### Verification:
- [ ] vercel.json settings correct
- [ ] Build settings confirmed
- [ ] Domain configured (if applicable)

---

## ✅ Environment Setup Checklist

### Supabase Configuration
- [ ] Production project created
- [ ] Project URL and anon key obtained
- [ ] Authentication providers enabled
- [ ] Site URL configured
- [ ] Storage buckets created with RLS policies
- [ ] Connection pooling enabled
- [ ] Edge functions deployed (5 functions)

### Vercel Configuration
- [ ] GitHub repository connected
- [ ] Vercel project created
- [ ] Environment variables set (3 required)
- [ ] Build settings verified
- [ ] Domain configured (if applicable)

### Security
- [ ] Encryption secret generated and saved
- [ ] Service role key NOT used in client
- [ ] RLS policies active on all tables
- [ ] Storage RLS policies configured

---

## 🔐 Security Checklist

Before proceeding to Step 3 (Database Migrations):

- [ ] ✅ All secrets stored securely (not in code)
- [ ] ✅ VITE_SUPABASE_ANON_KEY is anon key (not service role)
- [ ] ✅ Database password saved in password manager
- [ ] ✅ .env file NOT committed to Git
- [ ] ✅ Vercel environment variables set to "Production" only
- [ ] ✅ CSP headers configured in vercel.json
- [ ] ✅ HTTPS enforced (automatic with Vercel)

---

## 📝 Environment Variables Summary

**Configured in Vercel Dashboard:**

```env
# Production Environment
VITE_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ENCRYPTION_SECRET=[Your generated 32-byte base64 string]
```

**NOT included (keep private):**
- Database password (saved in password manager)
- Service role key (never expose to client)
- Edge function secrets (set via Supabase CLI)

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Invalid API Key" Error
**Solution:** Verify you're using the **anon** key, not service_role key

### Issue 2: Vercel Build Fails
**Solution:** Check that all VITE_* variables are set in Vercel dashboard

### Issue 3: Supabase Connection Timeout
**Solution:** Verify Supabase project is active, check Site URL configuration

### Issue 4: Edge Functions Not Working
**Solution:** Ensure functions are deployed and secrets are set

### Issue 5: Storage Bucket Access Denied
**Solution:** Check RLS policies, verify company_id in JWT token

---

## 🎯 Next Steps

Once all tasks are complete:

✅ **Mark Step 2 as Complete**

🚀 **Proceed to Step 3: Database Migrations**
- Apply 100+ migrations to production database
- Verify schema matches SYSTEM_REFERENCE.md
- Test CRUD operations

---

## 📊 Step 2 Completion Criteria

- [ ] Supabase production project active
- [ ] Environment variables configured in Vercel
- [ ] Edge functions deployed (5/5)
- [ ] Storage buckets created with RLS
- [ ] Authentication configured
- [ ] Security checklist passed
- [ ] Vercel project ready (not yet deployed)

**Estimated Total Time:** 2-3 hours
**Actual Time:** [To be filled]

---

**Step 2 Status:** 🔄 IN PROGRESS
**Last Updated:** 2025-10-21
**Next Step:** Database Migrations (Step 3)
