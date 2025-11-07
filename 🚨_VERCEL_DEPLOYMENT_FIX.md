# 🚨 VERCEL DEPLOYMENT - QUICK FIX

## ❌ Problem
Build failing with error: `VITE_SUPABASE_URL is required`

## ✅ Solution (3 Steps - 5 Minutes)

### Step 1: Add Environment Variables to Vercel
Go to: https://vercel.com/khamis-1992-hotmailcoms-projects/fleetifyapp/settings/environment-variables

Add these two variables:

```
VITE_SUPABASE_URL = <your-supabase-url>
VITE_SUPABASE_ANON_KEY = <your-supabase-anon-key>
```

**Where to find these values?**
- Supabase Dashboard → Settings → API
- Copy "Project URL" and "anon public" key

### Step 2: Apply to All Environments
Make sure to check:
- ✅ Production
- ✅ Preview  
- ✅ Development

### Step 3: Redeploy
1. Go to deployment page
2. Click three dots (•••) → "Redeploy"
3. Wait 2-3 minutes

## ✅ Done!
Your deployment should now succeed.

---

**For detailed guide**: See `VERCEL_DEPLOYMENT_FIX.md`
**To verify locally**: Run `npm run check:env`





