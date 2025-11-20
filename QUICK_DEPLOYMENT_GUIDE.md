# Quick Vercel Deployment Guide

## 🚀 Before You Deploy

### 1. Environment Variables Setup
Go to your Vercel project dashboard: https://vercel.com/[your-username]/[your-project]/settings/environment-variables

**Required Variables:**
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

**Optional but Recommended:**
- `VITE_ENCRYPTION_SECRET`: 32-character secret (generate with: openssl rand -base64 32)
- `VITE_APP_VERSION`: Current app version (e.g., 1.0.0)
- `VITE_API_TIMEOUT`: API timeout in milliseconds (default: 30000)

### 2. Get Supabase Credentials
1. Go to: https://app.supabase.com/project/YOUR_PROJECT/settings/api
2. Copy the "Project URL" and "anon public" key
3. Add them to your Vercel environment variables

### 3. Rotate Exposed Keys (If Needed)
If you accidentally committed your Supabase keys:
1. Go to Supabase Dashboard → Settings → API
2. Click "Regenerate" next to the anon key
3. Update the new key in your Vercel environment variables

## 📦 Deploy

### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

### Option B: GitHub Integration
1. Connect your repository to Vercel
2. Push to your main branch
3. Vercel will auto-deploy

### Option C: Vercel Dashboard
1. Go to your Vercel project dashboard
2. Click "Deployments"
3. Click "Redeploy" or deploy a new branch

## 🔍 Post-Deployment Verification

1. **Check Environment Variables**: Open browser console and verify no "undefined" errors
2. **Test Supabase Connection**: Try to log in or access data
3. **Verify All Pages**: Check all routes work correctly
4. **Performance Check**: Use Lighthouse to verify performance
5. **Security Headers**: Use securityheaders.com to verify headers

## 🚨 Troubleshooting

### Build Fails
- Check environment variables in Vercel dashboard
- Verify build logs for specific errors
- Ensure all dependencies are installed

### Runtime Errors
- Check browser console for errors
- Verify Supabase URL and keys are correct
- Check for missing environment variables

### Performance Issues
- Enable performance monitoring
- Check bundle size in Vercel Analytics
- Verify caching headers are working

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review this guide: VERCEL_DEPLOYMENT_READINESS_ASSESSMENT.md
3. Check Supabase dashboard for any issues
4. Review browser console for JavaScript errors

Generated on: 2025-11-20T23:10:31.518Z
