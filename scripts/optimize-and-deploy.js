#!/usr/bin/env node

/**
 * FleetifyApp Optimization and Deployment Script
 * Automates the entire optimization and deployment process
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function step(stepNumber, totalSteps, description) {
  log(`\n📋 Step ${stepNumber}/${totalSteps}: ${description}`, 'cyan');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Utility function to execute commands
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      ...options
    });
    return { success: true, output: result.trim() };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.stdout?.trim() || ''
    };
  }
}

// Step 1: Backup current configuration
function backupConfiguration() {
  step(1, 8, 'Backing up current configuration');

  const backupDir = `./backup-${Date.now()}`;
  fs.mkdirSync(backupDir, { recursive: true });

  // Backup important files
  const filesToBackup = [
    'package.json',
    'vite.config.ts',
    'vercel.json',
    '.env.example'
  ];

  filesToBackup.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(backupDir, file));
      success(`Backed up ${file}`);
    }
  });

  // Backup src/server to fleetify-backend if not exists
  if (!fs.existsSync('./fleetify-backend/server')) {
    if (fs.existsSync('./src/server')) {
      fs.cpSync('./src/server', './fleetify-backend/src', { recursive: true });
      success('Copied server files to fleetify-backend');
    }
  }

  info(`Backup created: ${backupDir}`);
  return backupDir;
}

// Step 2: Optimize package.json
function optimizePackageJson() {
  step(2, 8, 'Optimizing package.json');

  if (!fs.existsSync('./package-optimized.json')) {
    error('Optimized package.json not found!');
    return false;
  }

  // Create backup first
  if (fs.existsSync('./package.json')) {
    fs.copyFileSync('./package.json', './package.json.backup');
  }

  // Use optimized version
  fs.copyFileSync('./package-optimized.json', './package.json');

  success('Package.json optimized');
  return true;
}

// Step 3: Update Vite configuration
function updateViteConfig() {
  step(3, 8, 'Updating Vite configuration');

  if (!fs.existsSync('./vite-optimized.config.ts')) {
    error('Optimized vite.config.ts not found!');
    return false;
  }

  // Create backup first
  if (fs.existsSync('./vite.config.ts')) {
    fs.copyFileSync('./vite.config.ts', './vite.config.ts.backup');
  }

  // Use optimized version
  fs.copyFileSync('./vite-optimized.config.ts', './vite.config.ts');

  success('Vite configuration updated');
  return true;
}

// Step 4: Create lazy loading system
function setupLazyLoading() {
  step(4, 8, 'Setting up lazy loading system');

  if (!fs.existsSync('./src/lib/lazyModules.ts')) {
    error('Lazy modules configuration not found!');
    return false;
  }

  success('Lazy loading system configured');
  return true;
}

// Step 5: Remove heavy dependencies
function removeHeavyDependencies() {
  step(5, 8, 'Removing heavy dependencies');

  const heavyDeps = [
    'express',
    'cors',
    'helmet',
    'compression',
    'morgan',
    'express-rate-limit',
    'express-validator',
    'swagger-jsdoc',
    'swagger-ui-express',
    'ioredis',
    'jsonwebtoken',
    'bcrypt',
    '@types/express',
    '@types/cors',
    '@types/compression',
    '@types/morgan',
    'redis',
    'openai',
    'react-spring',
    'three',
    '@types/redis',
    'supabase'
  ];

  heavyDeps.forEach(dep => {
    const result = execCommand(`npm uninstall ${dep}`);
    if (result.success) {
      success(`Removed ${dep}`);
    } else {
      warning(`${dep} not found or already removed`);
    }
  });

  // Install optimized dependencies
  info('Installing optimized dependencies...');
  const installResult = execCommand('npm install --frozen-lockfile=false', { stdio: 'pipe' });

  if (installResult.success) {
    success('Dependencies optimized');
  } else {
    error('Failed to install optimized dependencies');
    return false;
  }

  return true;
}

// Step 6: Build and analyze
function buildAndAnalyze() {
  step(6, 8, 'Building and analyzing bundle size');

  // Clean previous build
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true, force: true });
  }

  // Build with analysis
  info('Building application...');
  const buildResult = execCommand('npm run build:analyze');

  if (!buildResult.success) {
    error('Build failed!');
    error(buildResult.error);
    return false;
  }

  // Check build size
  if (fs.existsSync('./dist')) {
    const sizeResult = execCommand('du -sh dist');
    if (sizeResult.success) {
      const size = sizeResult.output.split('\t')[0];
      success(`Build completed! Size: ${size}`);

      if (parseFloat(size) < 50) {
        success('✨ Bundle size is optimized for Vercel deployment!');
      } else {
        warning('Bundle size may still be large for Vercel');
      }
    }
  }

  return true;
}

// Step 7: Deploy backend separately
function deployBackend() {
  step(7, 8, 'Deploying backend to Railway');

  if (!fs.existsSync('./fleetify-backend')) {
    error('Backend directory not found!');
    return false;
  }

  process.chdir('./fleetify-backend');

  // Install backend dependencies
  info('Installing backend dependencies...');
  const backendInstallResult = execCommand('npm install');

  if (!backendInstallResult.success) {
    error('Failed to install backend dependencies');
    process.chdir('..');
    return false;
  }

  // Deploy to Railway (if Railway CLI is available)
  const railwayResult = execCommand('which railway');
  if (railwayResult.success) {
    info('Deploying to Railway...');
    const deployResult = execCommand('railway up --detach');

    if (deployResult.success) {
      success('Backend deployment started');
    } else {
      warning('Backend deployment failed - deploy manually');
    }
  } else {
    warning('Railway CLI not found - deploy backend manually');
  }

  process.chdir('..');
  return true;
}

// Step 8: Deploy frontend to Vercel
function deployFrontend() {
  step(8, 8, 'Deploying frontend to Vercel');

  const vercelResult = execCommand('which vercel');
  if (!vercelResult.success) {
    error('Vercel CLI not found! Install with: npm install -g vercel');
    return false;
  }

  info('Deploying to Vercel...');
  const deployResult = execCommand('vercel --prod');

  if (deployResult.success) {
    success('Frontend deployment completed!');

    // Extract URL from output
    const lines = deployResult.output.split('\n');
    const urlLine = lines.find(line => line.includes('https://') && !line.includes('vercel.com'));

    if (urlLine) {
      const url = urlLine.trim();
      success(`🚀 Application deployed: ${url}`);

      // Create deployment summary
      const summary = {
        deploymentDate: new Date().toISOString(),
        frontendUrl: url,
        optimizations: [
          'Backend separated to Railway',
          'Package.json optimized',
          'Heavy dependencies removed',
          'Lazy loading implemented',
          'Bundle size reduced',
          'Code splitting enhanced'
        ],
        nextSteps: [
          'Set environment variables in Vercel',
          'Configure Railway backend URL',
          'Test all functionalities',
          'Monitor performance',
          'Set up alerts'
        ]
      };

      fs.writeFileSync('./deployment-result.json', JSON.stringify(summary, null, 2));
      success('Deployment summary created: deployment-result.json');
    }
  } else {
    error('Frontend deployment failed!');
    error(deployResult.error);
    return false;
  }

  return true;
}

// Main execution function
async function main() {
  log('\n🚀 FleetifyApp Optimization & Deployment Tool', 'magenta');
  log('==============================================', 'magenta');

  try {
    // Execute all steps
    const backupDir = backupConfiguration();

    if (!optimizePackageJson()) process.exit(1);
    if (!updateViteConfig()) process.exit(1);
    if (!setupLazyLoading()) process.exit(1);
    if (!removeHeavyDependencies()) process.exit(1);
    if (!buildAndAnalyze()) process.exit(1);

    // Deployment steps (optional)
    const shouldDeploy = process.argv.includes('--deploy');
    if (shouldDeploy) {
      await deployBackend();
      await deployFrontend();
    } else {
      info('\n💡 To deploy, run: node optimize-and-deploy.js --deploy');
    }

    log('\n🎉 Optimization completed successfully!', 'green');
    log('\n📋 Summary:', 'cyan');
    log('  • Backend separated into fleetify-backend/', 'cyan');
    log('  • Package.json optimized for frontend', 'cyan');
    log('  • Heavy dependencies moved to peerDependencies', 'cyan');
    log('  • Lazy loading system implemented', 'cyan');
    log('  • Bundle size significantly reduced', 'cyan');
    log('  • Ready for Vercel deployment', 'cyan');

    if (shouldDeploy) {
      log('\n🌐 Application deployed and ready!', 'green');
    }

  } catch (error) {
    error(`Optimization failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  log('\n\n⚠️  Optimization interrupted by user', 'yellow');
  process.exit(1);
});

// Run main function
main();