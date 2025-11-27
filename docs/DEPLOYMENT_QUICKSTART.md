# 🚀 Fleetify Deployment Quick Start

This guide will help you deploy the Fleetify fleet management system to production in under 30 minutes.

## ⚡ Quick Deployment (5 Minute Setup)

### Prerequisites
- Node.js 18+ installed
- Vercel account (free tier works)
- Railway account (free tier works)
- Supabase account (free tier works)

### Step 1: Deploy Frontend (2 minutes)

```bash
# Clone and setup frontend
git clone https://github.com/khamis1992/fleetifyapp
cd fleetifyapp

# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel
vercel --prod
```

### Step 2: Deploy Backend (2 minutes)

```bash
# Clone backend (separate repository)
git clone https://github.com/khamis1992/fleetify-backend
cd fleetify-backend

# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway new
railway up
```

### Step 3: Configure Environment (1 minute)

#### Frontend (Vercel Dashboard)
1. Go to your Vercel project → Settings → Environment Variables
2. Add these variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_ENCRYPTION_SECRET=your_32_char_secret
   VITE_API_URL=https://your-backend.railway.app
   ```

#### Backend (Railway Dashboard)
1. Go to your Railway project → Settings → Variables
2. Add these variables:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   FRONTEND_URL=https://your-frontend.vercel.app
   JWT_SECRET=your_jwt_secret
   ```

### Step 4: Setup Database (2 minutes)

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL migrations from your repository
3. Configure Row Level Security (RLS)

### Step 5: Verify Deployment (30 seconds)

```bash
# Test frontend
curl https://your-frontend.vercel.app

# Test backend
curl https://your-backend.railway.app/health
```

That's it! Your Fleetify system is now live! 🎉

---

## 📋 Detailed Environment Setup

### Required Environment Variables

#### Frontend (.env.production)
```bash
# Core configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=https://your-backend.railway.app
VITE_ENCRYPTION_SECRET=your_32_char_secret

# Optional monitoring
VITE_ENABLE_ANALYTICS=true
VITE_MONITORING_ENABLED=true
```

#### Backend (.env)
```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://your-frontend.vercel.app

# Server
NODE_ENV=production
PORT=3001
```

---

## 🛠️ Platform-Specific Instructions

### Vercel (Frontend)

#### Automatic Deployment
```bash
# Connect GitHub repository
# Vercel will auto-deploy on push to main branch
git push origin main
```

#### Custom Domain
```bash
# Add domain via Vercel CLI
vercel domains add fleetify.yourdomain.com

# Or configure in Vercel Dashboard
# Project → Settings → Domains
```

### Railway (Backend)

#### Environment Setup
```bash
# Create railway.json in backend root
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

#### Custom Domain
```bash
# Configure DNS CNAME record
# api.fleetify.yourdomain.com → your-app.railway.app

# Add domain in Railway Dashboard
# Project → Settings → Domains
```

### Supabase (Database)

#### Quick Setup
1. **Create Project**: Go to supabase.com → New Project
2. **Get Keys**: Project Settings → API
3. **Run Migrations**: SQL Editor → Run your migration files
4. **Setup Storage**: Storage → Create buckets for documents/images

#### Security Setup
```sql
-- Enable Row Level Security
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own data" ON contracts
  FOR ALL USING (company_id = auth.jwt()->>'company_id');
```

---

## 🔧 Useful Scripts

### Full Deployment Script
```bash
# Make scripts executable
chmod +x scripts/deploy-all.sh
chmod +x scripts/verify-deployment.sh

# Deploy everything
./scripts/deploy-all.sh

# Verify deployment
./scripts/verify-deployment.sh
```

### Environment Setup Script
```bash
# Create environment files
cp .env.example .env.local
cp .env.production.template .env.production

# Edit with your actual values
nano .env.local .env.production
```

---

## 🚨 Common Issues & Fixes

### Frontend Issues

**Build fails with environment variable errors:**
```bash
# Check VITE_ prefix (required for all client variables)
# Restart dev server after changing .env files
```

**CORS errors:**
```bash
# Check backend CORS configuration
# Ensure FRONTEND_URL is set correctly in backend env
```

### Backend Issues

**Database connection fails:**
```bash
# Verify Supabase URL and keys
# Check network connectivity
# Ensure service role key is correct
```

**Health check failing:**
```bash
# Check if backend is running on correct port (3001)
# Verify all environment variables are set
```

### Database Issues

**RLS policies blocking access:**
```bash
-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Disable RLS temporarily for testing
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;
```

---

## 📞 Support & Resources

### Documentation
- [Full Deployment Guide](./FLEETIFY_DEPLOYMENT_GUIDE.md) - Comprehensive deployment instructions
- [API Documentation](./docs/api/) - Backend API reference
- [Frontend Documentation](./docs/frontend/) - Frontend architecture

### Getting Help
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Railway Support**: [railway.app/help](https://railway.app/help)
- **Supabase Support**: [supabase.com/docs](https://supabase.com/docs)

### Quick Commands
```bash
# Check deployment status
vercel ls
railway status

# View logs
vercel logs
railway logs

# Redeploy
vercel --prod
railway up
```

---

## 🎉 Success!

Your Fleetify system should now be running at:
- **Frontend**: https://your-frontend.vercel.app
- **Backend**: https://your-backend.railway.app
- **API Docs**: https://your-backend.railway.app/api-docs
- **Health Check**: https://your-backend.railway.app/health

For any issues, check the [Full Deployment Guide](./FLEETIFY_DEPLOYMENT_GUIDE.md) or create an issue in the repository.