# 🚀 Fleetify Fleet Management System - Complete Deployment Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Environment Configuration](#environment-configuration)
5. [Frontend Deployment](#frontend-deployment)
6. [Backend Deployment](#backend-deployment)
7. [Database Setup](#database-setup)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Domain & SSL Configuration](#domain--ssl-configuration)
10. [Monitoring & Logging](#monitoring--logging)
11. [Security Considerations](#security-considerations)
12. [Troubleshooting](#troubleshooting)
13. [Maintenance](#maintenance)

---

## 🎯 System Overview

**Fleetify** is a comprehensive fleet management system with the following components:

- **Frontend**: React/Vite application (TypeScript)
- **Backend**: Node.js/Express API server (TypeScript)
- **Database**: Supabase (PostgreSQL with real-time features)
- **File Storage**: Supabase Storage
- **Mobile**: Capacitor-based mobile apps (Android/iOS)

### Current State
- ✅ Frontend is ready for deployment
- ✅ Backend has been separated into independent repository
- ✅ Database is configured with Supabase
- ✅ Environment variables are structured
- ✅ CI/CD pipelines are configured

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Supabase DB   │
│   (Vite/React)  │◄──►│  (Express API)  │◄──►│  (PostgreSQL)   │
│                 │    │                 │    │                 │
│ • Vite 7.2.4    │    │ • Node.js 18+   │    │ • Real-time     │
│ • React 18      │    │ • Express 5     │    │ • RLS Security  │
│ • TypeScript    │    │ • TypeScript    │    │ • Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│  File Storage   │◄─────────────┘
                        │ (Supabase)      │
                        └─────────────────┘
```

---

## ✅ Prerequisites

### Required Accounts & Services
1. **Vercel Account** (Frontend hosting)
2. **Railway/Render Account** (Backend hosting)
3. **Supabase Account** (Database & Storage)
4. **Domain Name** (Optional, for custom domain)
5. **GitHub Account** (CI/CD)

### Required Tools
```bash
# Node.js & Package Manager
node --version  # Should be 18+
npm --version   # Should be 9+

# Git
git --version

# Supabase CLI (optional)
npm install -g supabase

# Vercel CLI (optional)
npm install -g vercel
```

---

## 🔧 Environment Configuration

### Frontend Environment Variables
Create `.env.production` for frontend:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Security
VITE_ENCRYPTION_SECRET=your_32_character_secret

# API Configuration
VITE_API_URL=https://your-backend-url.railway.app
VITE_API_TIMEOUT=30000

# Monitoring (Optional)
VITE_SENTRY_DSN=your_sentry_dsn
VITE_MONITORING_ENABLED=true

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_MAINTENANCE_MODE=false
```

### Backend Environment Variables
Create `.env` for backend:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_SECRET=your_encryption_secret

# Redis (Optional, for caching)
REDIS_URL=redis://user:pass@host:port

# Monitoring
SENTRY_DSN=your_sentry_dsn

# File Upload Limits
MAX_FILE_SIZE=10485760  # 10MB
```

---

## 🌐 Frontend Deployment

### Option 1: Vercel (Recommended)

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Link Project
```bash
cd /path/to/fleetifyapp
vercel link
```

#### Step 3: Configure Environment Variables
```bash
# Via CLI
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_ENCRYPTION_SECRET production

# Or via Vercel Dashboard
# Project → Settings → Environment Variables
```

#### Step 4: Deploy
```bash
# Deploy to production
vercel --prod

# Or push to main branch (triggers auto-deploy)
git push origin main
```

#### Step 5: Configure Custom Domain (Optional)
```bash
vercel domains add yourdomain.com
```

### Option 2: Netlify

#### Step 1: Build Configuration
Create `netlify.toml`:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production]
  command = "npm run build"

[context.deploy-preview]
  command = "npm run build:dev"
```

#### Step 2: Deploy via Git
```bash
# Connect repository in Netlify Dashboard
# Configure environment variables in Netlify UI
# Deploy automatically on push
```

### Option 3: AWS S3 + CloudFront

#### Step 1: S3 Bucket Configuration
```bash
# Create S3 bucket
aws s3 mb s3://your-fleetify-frontend

# Configure for static hosting
aws s3 website s3://your-fleetify-frontend \
  --index-document index.html \
  --error-document index.html
```

#### Step 2: CloudFront Distribution
```javascript
// cloudfront-config.json
{
  "CallerReference": "fleetify-frontend",
  "Origins": {
    "S3Origin": {
      "DomainName": "your-fleetify-frontend.s3.amazonaws.com"
    }
  },
  "DefaultRootObject": "index.html",
  "CustomErrorResponses": [
    {
      "ErrorCode": 404,
      "ResponsePagePath": "/index.html",
      "ResponseCode": 200
    }
  ]
}
```

---

## 🔧 Backend Deployment

### Option 1: Railway (Recommended)

#### Step 1: Prepare Backend Repository
```bash
# Clone backend repository
git clone https://github.com/khamis1992/fleetify-backend
cd fleetify-backend

# Install dependencies
npm install

# Create railway.json
cat > railway.json << EOF
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
EOF
```

#### Step 2: Deploy via Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway new
railway up

# Configure environment variables in Railway Dashboard
```

#### Step 3: Environment Variables in Railway
```bash
# Add these in Railway Dashboard
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FRONTEND_URL=your_vercel_app_url
JWT_SECRET=your_jwt_secret
```

### Option 2: Render

#### Step 1: Create Dockerfile
```dockerfile
# fleetify-backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["npm", "start"]
```

#### Step 2: Deploy to Render
```bash
# Connect repository in Render Dashboard
# Choose "Web Service"
# Configure:
# - Build Command: npm install && npm run build
# - Start Command: npm start
# - Health Check Path: /health
```

### Option 3: AWS ECS

#### Step 1: Create Task Definition
```json
{
  "family": "fleetify-backend",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "fleetify-backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/fleetify-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fleetify-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

---

## 🗄️ Database Setup

### Supabase Configuration

#### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Choose region close to your users
4. Set database password

#### Step 2: Configure Database
```sql
-- Run migrations in Supabase SQL Editor
-- Found in your project's SQL files or migrations folder

-- Example: Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_contract_id ON vehicles(contract_id);
```

#### Step 3: Set up Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Example RLS policy
CREATE POLICY "Users can view own company data" ON contracts
  FOR ALL USING (company_id = auth.jwt()->>'company_id');
```

#### Step 4: Configure Storage
```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Set up storage policies
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Configuration

#### Frontend Workflow (`.github/workflows/frontend-deploy.yml`)
```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths: ['frontend/**']
  pull_request:
    branches: [main]
    paths: ['frontend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test --if-present

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_ENCRYPTION_SECRET: ${{ secrets.VITE_ENCRYPTION_SECRET }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

#### Backend Workflow (`.github/workflows/backend-deploy.yml`)
```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths: ['backend/**']
  pull_request:
    branches: [main]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test --if-present

      - name: Build TypeScript
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Railway
        uses: railway-app/railway-action@v1
        with:
          api-token: ${{ secrets.RAILWAY_TOKEN }}
          service: ${{ secrets.RAILWAY_SERVICE_ID }}
```

### Environment Setup in GitHub

#### Required Secrets
```bash
# Frontend Secrets
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ENCRYPTION_SECRET
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

# Backend Secrets
RAILWAY_TOKEN
RAILWAY_SERVICE_ID
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
```

---

## 🌍 Domain & SSL Configuration

### Custom Domain Setup

#### Vercel Frontend
```bash
# Add custom domain via CLI
vercel domains add fleetify.yourdomain.com

# Or via Vercel Dashboard:
# Project → Settings → Domains → Add
```

#### Railway Backend
```bash
# Railway provides a random URL
# To use custom domain, configure DNS CNAME:
# api.fleetify.yourdomain.com → your-app.railway.app

# Then add custom domain in Railway Dashboard
```

#### SSL Certificate
- **Vercel**: Automatic SSL certificates
- **Railway**: Automatic SSL for custom domains
- **Custom**: Use Cloudflare for SSL and CDN

### DNS Configuration
```dns
# Example DNS setup
Type    Name                    Value
A       fleetify.yourdomain.com    76.76.21.21  (Vercel)
CNAME   api.fleetify.yourdomain.com  your-app.railway.app
```

---

## 📊 Monitoring & Logging

### Frontend Monitoring

#### Sentry Integration
```typescript
// src/lib/monitoring.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.BrowserTracing(),
  ],
});
```

#### Performance Monitoring
```typescript
// Built-in monitoring system
import { initializeMonitoring } from '@/lib/api-monitoring';

// Initialize in main.tsx
initializeMonitoring({
  enabled: true,
  sampleRate: 0.1,
  endpoint: '/api/monitoring'
});
```

### Backend Monitoring

#### Application Logs
```typescript
// src/server/middleware/logging.ts
import morgan from 'morgan';
import { logger } from '@/utils/logger';

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    }
  }
}));
```

#### Health Checks
```typescript
// Health endpoint (already exists)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
  });
});
```

### Error Tracking
```typescript
// Error tracking middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});
```

---

## 🔒 Security Considerations

### Environment Variables Security
```bash
# Never commit .env files
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# Use different secrets for different environments
# Generate strong secrets
openssl rand -base64 32
```

### CORS Configuration
```typescript
// Backend CORS setup
app.use(cors({
  origin: [
    'https://fleetify.yourdomain.com',
    'https://your-app.vercel.app',
    // Add development origins
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### Rate Limiting
```typescript
// Rate limiting configuration
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

app.use('/api/', limiter);
```

### Security Headers
```typescript
// Security middleware
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Frontend Issues

##### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules dist package-lock.json
npm install
npm run build

# Check for memory issues
export NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

##### Environment Variable Issues
```bash
# Verify variables are present
npm run check:env

# Test environment locally
cp .env.example .env.local
# Fill in actual values
npm run dev
```

##### CORS Issues
```bash
# Check backend CORS configuration
curl -H "Origin: https://your-domain.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api.your-domain.com/health
```

#### Backend Issues

##### Database Connection
```bash
# Test Supabase connection
curl -X POST https://your-project.supabase.co/rest/v1/health \
     -H "apikey: your_anon_key"

# Check service role key permissions
psql -h db.your-project.supabase.co -U postgres -d postgres
```

##### Environment Variables
```bash
# Debug environment variables
node -e "console.log(process.env)"

# Check required variables
node -e "console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing')"
```

#### Database Issues

##### Connection Pooling
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

##### Migration Issues
```sql
-- Check migration status
SELECT * FROM supabase_migrations.schema_migrations;

-- Run specific migration
-- Use Supabase Dashboard SQL Editor
```

### Monitoring & Debugging

#### Frontend Debugging
```typescript
// Enable debug mode
localStorage.setItem('debug', 'fleetify:*');

// Monitor API calls
import { apiMonitor } from '@/lib/api-monitoring';
console.log('API Metrics:', apiMonitor.getMetrics());
```

#### Backend Debugging
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check health endpoint
curl https://api.your-domain.com/health

# Monitor logs (Railway)
railway logs
```

---

## 🔄 Maintenance

### Regular Tasks

#### Weekly
```bash
# Check for security updates
npm audit

# Update dependencies
npm update

# Check deployment health
curl https://api.your-domain.com/health
curl https://your-domain.com
```

#### Monthly
```bash
# Full dependency audit
npm audit --audit-level=moderate

# Database backup verification
# Check in Supabase Dashboard

# SSL certificate check
ssl-checker your-domain.com
```

### Backup Strategy

#### Database Backups
- Supabase provides automated daily backups
- Configure point-in-time recovery
- Export regular backups for critical data

#### Code Backups
- Git provides version control
- Tag releases for easy rollback
- Document deployment procedures

### Scaling Considerations

#### Frontend Scaling
- Vercel automatically scales globally
- Configure edge functions for better performance
- Optimize bundle size and loading

#### Backend Scaling
- Railway provides auto-scaling
- Monitor performance metrics
- Consider load balancer for high traffic

---

## 📞 Support & Emergency Procedures

### Emergency Contacts
- **Platform Support**: Vercel, Railway, Supabase
- **Domain Registrar**: Domain configuration issues
- **Emergency Rollback**: GitHub revert procedures

### Rollback Procedures

#### Frontend Rollback
```bash
# Quick rollback via Vercel
vercel rollback [deployment-url]

# Git rollback
git revert HEAD
git push origin main
```

#### Backend Rollback
```bash
# Railway rollback
railway rollback [deployment-id]

# Or redeploy previous commit
git checkout [previous-commit]
railway up
```

### Monitoring Alerts
Set up alerts for:
- Downtime (uptime monitoring)
- Error rate spikes
- Performance degradation
- Database connection issues

---

## 🎯 Deployment Checklist

### Pre-Deployment Checklist
- [ ] Environment variables configured
- [ ] All tests passing locally
- [ ] Database migrations tested
- [ ] SSL certificates configured
- [ ] DNS records updated
- [ ] Backup procedures verified
- [ ] Monitoring set up
- [ ] Rollback procedures documented

### Post-Deployment Checklist
- [ ] Frontend loads correctly
- [ ] Backend API responding
- [ ] Database connections working
- [ ] Authentication functioning
- [ ] File uploads working
- [ ] Mobile apps connecting
- [ ] Error monitoring active
- [ ] Performance metrics normal

---

## 📚 Additional Resources

### Documentation Links
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Supabase Documentation](https://supabase.com/docs)
- [React/Vite Documentation](https://vitejs.dev)

### Useful Scripts
```bash
# Full deployment script
#!/bin/bash
# deploy.sh

echo "🚀 Starting Fleetify Deployment..."

# Frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
npm run deploy

# Backend
echo "🔧 Deploying backend..."
cd ../backend
npm install
npm run build
railway up

echo "✅ Deployment complete!"
echo "Frontend: https://your-domain.vercel.app"
echo "Backend: https://api.your-domain.railway.app"
```

---

**Last Updated**: November 23, 2025
**Version**: 1.0.0
**Maintainer**: Fleetify Development Team

For questions or issues, please refer to the project documentation or create an issue in the respective repositories.