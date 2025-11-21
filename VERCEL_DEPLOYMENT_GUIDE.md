# Vercel Deployment Guide

## Environment Variables Configuration

### Required Environment Variables

Set these in your Vercel dashboard under **Project Settings > Environment Variables**:

#### Production Variables
```
VITE_SUPABASE_URL=https://qwhunliohlkkahbspfiu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.vDZxVVqfQqnqrDo5Uw-Ew7RL6Ks8mVjCnXLXOWRxFms
VITE_ENCRYPTION_SECRET=12345678901234567890123456789012
```

#### Optional Variables
```
VITE_APP_VERSION=1.0.0
VITE_API_TIMEOUT=30000
VITE_ENABLE_ANALYTICS=true
VITE_API_PERFORMANCE_OPTIMIZATIONS=true
VITE_PERFORMANCE_MONITORING_ENABLED=true
VITE_MONITORING_ENABLED=true
```

### Steps to Configure in Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project** or import if new
3. **Navigate to Project Settings > Environment Variables**
4. **Add each variable** with the exact name and value
5. **Choose the appropriate environment** (Production, Preview, Development)
6. **Save changes**

## Build Configuration

The project now uses a robust Vite configuration that:

1. **Loads environment variables** properly during build time
2. **Handles missing variables gracefully** with fallbacks
3. **Works with Vercel's build environment**
4. **Optimizes production builds** with compression and code splitting

### Key Fixes Applied

#### 1. Vite Configuration (vite.config.ts)
- Added `loadEnv` function to properly load environment variables
- Added safe environment variable access with conditional checks
- Fixed security.ts to handle import.meta.env safely

#### 2. Build Process
- Environment variables are now properly defined for build-time access
- Build works with both local `.env` files and Vercel environment variables
- TypeScript compilation passes before Vite build

#### 3. Dependencies
- Fixed missing `xlsx` dependency
- Resolved syntax errors in FleetOperationsSection.tsx

## Deployment Verification

After deploying, verify:

1. **Build succeeds** in Vercel dashboard
2. **Application loads** without environment variable errors
3. **Supabase connection** works correctly
4. **All features function** as expected

## Troubleshooting

### Common Issues

1. **Environment variables not loading**
   - Ensure variables are set in Vercel dashboard
   - Check exact variable names (must start with `VITE_`)
   - Verify no typos in values

2. **Build fails during TypeScript compilation**
   - Check for syntax errors in the codebase
   - Ensure all dependencies are installed

3. **Runtime errors in browser**
   - Check browser console for specific errors
   - Verify environment variables are accessible via `import.meta.env`

### Build Logs

If build fails, check Vercel build logs for:
- TypeScript compilation errors
- Vite build errors
- Environment variable warnings
- Missing dependency errors

## Production Best Practices

1. **Environment Security**
   - Never commit secrets to git
   - Use Vercel environment variables for sensitive data
   - Rotate keys periodically

2. **Build Optimization**
   - Build completes in ~50-60 seconds
   - Generates optimized chunks for better performance
   - Includes compression for smaller bundle sizes

3. **Performance Monitoring**
   - Core Web Vitals monitoring enabled
   - Error tracking configured
   - Performance optimizations active

## Next Steps

1. **Set environment variables** in Vercel dashboard
2. **Trigger a deployment** to test the configuration
3. **Monitor build logs** for any issues
4. **Test application functionality** in production
5. **Set up monitoring** for production performance

## Support

If you encounter issues:

1. Check Vercel build logs for specific error messages
2. Verify environment variable configuration
3. Test locally with the same environment variables
4. Review this guide for any missed configuration steps

---

**Last Updated**: 2025-11-21
**Version**: 1.0.0