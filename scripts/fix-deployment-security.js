#!/usr/bin/env node

/**
 * Vercel Deployment Security Fix Script
 *
 * This script helps prepare the repository for secure Vercel deployment by:
 * 1. Removing hardcoded credentials from .env
 * 2. Creating a secure .env template
 * 3. Updating .gitignore if needed
 * 4. Providing guidance for Vercel environment setup
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ERROR: ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function header(message) {
  log(`\n🔒 ${message}`, 'cyan');
  log('─'.repeat(message.length + 4), 'cyan');
}

function checkAndFixGitignore() {
  header('Checking .gitignore');

  const gitignorePath = path.join(process.cwd(), '.gitignore');
  let gitignoreContent = '';

  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }

  const requiredEntries = [
    '.env',
    '.env.local',
    '.env.development.local',
    '.env.test.local',
    '.env.production.local',
    'vercel.json.local',
    '.vercel'
  ];

  let updated = false;

  requiredEntries.forEach(entry => {
    if (!gitignoreContent.includes(entry)) {
      gitignoreContent += `\n# Environment variables\n${entry}\n`;
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(gitignorePath, gitignoreContent);
    success('Updated .gitignore with environment file exclusions');
  } else {
    success('.gitignore already properly configured');
  }
}

function secureEnvFile() {
  header('Securing Environment Files');

  const envPath = path.join(process.cwd(), '.env');
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  // Check if .env exists and contains actual credentials
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');

    // Check for actual Supabase credentials (not placeholder values)
    if (envContent.includes('qwhunliohlkkahbspfiu') ||
        envContent.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
      warning('Found actual credentials in .env file!');
      warning('This is a security risk and should not be committed to version control.');

      // Backup current .env
      const backupPath = path.join(process.cwd(), '.env.backup');
      fs.copyFileSync(envPath, backupPath);
      warning(`Created backup at: .env.backup`);

      // Create secure .env from example if it exists
      if (fs.existsSync(envExamplePath)) {
        const exampleContent = fs.readFileSync(envExamplePath, 'utf8');

        // Extract just the essential variables
        const secureEnvContent = `# Fleetify Environment Variables
# Copy this file to .env.local and add your actual values
# NEVER commit this file to version control

# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Security (Required)
VITE_ENCRYPTION_SECRET=your_32_character_encryption_secret_here

# Application (Optional)
VITE_APP_VERSION=1.0.0
VITE_API_TIMEOUT=30000
VITE_ENABLE_ANALYTICS=true

# Performance (Production)
VITE_API_PERFORMANCE_OPTIMIZATIONS=false
VITE_PERFORMANCE_MONITORING_ENABLED=true
VITE_MONITORING_ENABLED=true
`;

        fs.writeFileSync(envPath, secureEnvContent);
        success('Replaced .env with secure template');

        // Also create .env.local for actual usage
        fs.writeFileSync(envLocalPath, `# Local Development Environment Variables
# Add your actual values here - this file is git-ignored

# Supabase Configuration (Get from: https://app.supabase.com/project/YOUR_PROJECT/settings/api)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Security (Generate: openssl rand -base64 32)
VITE_ENCRYPTION_SECRET=
`);
        success('Created .env.local for local development');
      }
    } else {
      success('.env file appears to be secure (no hardcoded credentials found)');
    }
  } else {
    info('.env file does not exist - that\'s OK for production');

    // Create .env.local for local development
    if (!fs.existsSync(envLocalPath)) {
      fs.writeFileSync(envLocalPath, `# Local Development Environment Variables
# Add your actual values here - this file is git-ignored

# Supabase Configuration (Get from: https://app.supabase.com/project/YOUR_PROJECT/settings/api)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Security (Generate: openssl rand -base64 32)
VITE_ENCRYPTION_SECRET=
`);
      success('Created .env.local for local development');
    }
  }
}

function updateVercelConfig() {
  header('Updating Vercel Configuration');

  const currentVercelPath = path.join(process.cwd(), 'vercel.json');
  const newVercelPath = path.join(process.cwd(), 'vercel.json.new');

  if (fs.existsSync(newVercelPath)) {
    if (fs.existsSync(currentVercelPath)) {
      // Backup current config
      const backupPath = path.join(process.cwd(), 'vercel.json.backup');
      fs.copyFileSync(currentVercelPath, backupPath);
      warning(`Backed up current vercel.json to vercel.json.backup`);
    }

    // Replace with new configuration
    fs.copyFileSync(newVercelPath, currentVercelPath);
    success('Updated vercel.json with enhanced security and performance configuration');

    // Clean up
    fs.unlinkSync(newVercelPath);
    success('Removed temporary vercel.json.new file');
  } else {
    info('No new vercel configuration found, keeping existing');
  }
}

function checkGitStatus() {
  header('Git Status Check');

  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });

    if (status.trim()) {
      warning('You have uncommitted changes:');
      console.log(status);
      warning('Consider committing or stashing these changes before deployment.');
    } else {
      success('Git working directory is clean');
    }
  } catch (error) {
    info('Not in a git repository or git not available');
  }
}

function generateDeploymentGuide() {
  header('Generating Deployment Guide');

  const guideContent = `# Quick Vercel Deployment Guide

## 🚀 Before You Deploy

### 1. Environment Variables Setup
Go to your Vercel project dashboard: https://vercel.com/[your-username]/[your-project]/settings/environment-variables

**Required Variables:**
- \`VITE_SUPABASE_URL\`: Your Supabase project URL
- \`VITE_SUPABASE_ANON_KEY\`: Your Supabase anonymous key

**Optional but Recommended:**
- \`VITE_ENCRYPTION_SECRET\`: 32-character secret (generate with: openssl rand -base64 32)
- \`VITE_APP_VERSION\`: Current app version (e.g., 1.0.0)
- \`VITE_API_TIMEOUT\`: API timeout in milliseconds (default: 30000)

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
\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
\`\`\`

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

Generated on: ${new Date().toISOString()}
`;

  const guidePath = path.join(process.cwd(), 'QUICK_DEPLOYMENT_GUIDE.md');
  fs.writeFileSync(guidePath, guideContent);
  success(`Created deployment guide: ${guidePath}`);
}

function main() {
  log('🔒 Vercel Deployment Security Fix Script', 'bright');
  log('This script will prepare your repository for secure Vercel deployment.\n', 'yellow');

  try {
    checkAndFixGitignore();
    secureEnvFile();
    updateVercelConfig();
    checkGitStatus();
    generateDeploymentGuide();

    header('Summary');
    success('Repository is now ready for secure Vercel deployment!');

    info('\nNext Steps:');
    console.log('1. Configure environment variables in Vercel dashboard');
    console.log('2. Review the generated QUICK_DEPLOYMENT_GUIDE.md');
    console.log('3. Deploy using vercel --prod or push to your main branch');

    info('\nSecurity Notes:');
    console.log('- Never commit .env files to version control');
    console.log('- Use different environment variables for each environment');
    console.log('- Regularly rotate your Supabase keys');

  } catch (error) {
    error(`Script failed: ${error.message}`);
    process.exit(1);
  }
}

main();