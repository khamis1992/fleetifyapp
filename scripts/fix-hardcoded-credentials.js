#!/usr/bin/env node

/**
 * Security Fix Script: Remove Hardcoded Credentials
 * 
 * This script automatically finds and fixes hardcoded Supabase credentials
 * across the codebase by replacing them with environment variable references.
 * 
 * Usage:
 *   node scripts/fix-hardcoded-credentials.js [--dry-run] [--backup]
 * 
 * Options:
 *   --dry-run    Show what would be changed without making changes
 *   --backup     Create backup files before making changes (default: true)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const CREATE_BACKUP = process.argv.includes('--backup') || (!DRY_RUN && !process.argv.includes('--no-backup'));

// Hardcoded Supabase URL
const HARDCODED_URL = 'https://qwhunliohlkkahbspfiu.supabase.co';
// Hardcoded Supabase Anon Key (exposed - must be rotated!)
const HARDCODED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs';

// Files to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.next/,
  /\.pnpm-store/,
  /\.cursor/,
  /\.qoder/,
  /\.env/,
  /\.env\./,
  /package-lock\.json/,
  /yarn\.lock/,
  /pnpm-lock\.yaml/,
  /\.md$/,
  /\.sql$/,
  /\.log$/,
  /fix-hardcoded-credentials\.js$/,
  /\.backup\./,
];

// File types to process
const FILE_EXTENSIONS = ['.ts', '.js', '.mjs', '.tsx', '.jsx'];

// Statistics
const stats = {
  filesScanned: 0,
  filesModified: 0,
  credentialsFound: 0,
  backupsCreated: 0,
  errors: [],
  fixes: []
};

/**
 * Check if file should be excluded
 */
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Get file extension
 */
function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

/**
 * Create backup of file
 */
function createBackup(filePath) {
  if (!CREATE_BACKUP || DRY_RUN) return null;
  
  try {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    stats.backupsCreated++;
    return backupPath;
  } catch (error) {
    stats.errors.push(`Failed to create backup for ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Check if file already has environment variable loading
 */
function hasEnvLoadingCode(content) {
  return content.includes('loadEnvFile') || 
         content.includes('process.env.VITE_SUPABASE_URL') ||
         content.includes('process.env.SUPABASE_URL');
}

/**
 * Add environment variable loading code for .mjs files
 */
function addEnvLoadingCode(content, filePath) {
  // Check if already has env loading
  if (hasEnvLoadingCode(content)) {
    return content;
  }
  
  const ext = getFileExtension(filePath);
  if (ext === '.mjs' || (ext === '.js' && content.includes('import'))) {
    // Check what imports already exist
    const hasFs = content.includes("import fs from");
    const hasPath = content.includes("import path from");
    const hasFileURL = content.includes("import { fileURLToPath }");
    
    let importsToAdd = [];
    if (!hasFs) importsToAdd.push("import fs from 'fs';");
    if (!hasPath) importsToAdd.push("import path from 'path';");
    if (!hasFileURL) importsToAdd.push("import { fileURLToPath } from 'url';");
    
    const envLoaderImports = importsToAdd.length > 0 ? importsToAdd.join('\n') + '\n' : '';
    
    const envLoader = `
${envLoaderImports}// Load environment variables from .env file
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    }
  }
}

loadEnvFile();
`;
    // Insert after the last import or at the beginning
    const importPattern = /import\s+.*from\s+['"][^'"]+['"];?\s*\n/g;
    const matches = [...content.matchAll(importPattern)];
    
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const insertionPoint = lastMatch.index + lastMatch[0].length;
      return content.slice(0, insertionPoint) + envLoader + content.slice(insertionPoint);
    }
    return envLoader + '\n' + content;
  }
  
  return content;
}

/**
 * Fix hardcoded credentials in file content
 */
function fixCredentialsInContent(content, filePath) {
  let modified = false;
  let newContent = content;
  const relativePath = path.relative(projectRoot, filePath);
  
  // Fix 1: Hardcoded SUPABASE_URL
  const urlPatterns = [
    /const\s+SUPABASE_URL\s*=\s*["']https:\/\/qwhunliohlkkahbspfiu\.supabase\.co["']/g,
    /SUPABASE_URL\s*=\s*["']https:\/\/qwhunliohlkkahbspfiu\.supabase\.co["']/g,
    new RegExp(`const\\s+SUPABASE_URL\\s*=\\s*["']${HARDCODED_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g'),
  ];
  
  for (const pattern of urlPatterns) {
    if (pattern.test(newContent)) {
      stats.credentialsFound++;
      const replacement = `const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';`;
      newContent = newContent.replace(pattern, replacement);
      modified = true;
      stats.fixes.push(`${relativePath}: Fixed hardcoded SUPABASE_URL`);
      
      // Add validation if not exists
      if (!newContent.includes('if (!SUPABASE_URL)')) {
        const validationCode = `
if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL environment variable is not set.');
  console.error('Please set it in your .env file.');
  process.exit(1);
}`;
        const constMatch = newContent.match(/const\s+SUPABASE_URL\s*=[^;]+;/);
        if (constMatch) {
          const insertionPoint = newContent.indexOf(constMatch[0]) + constMatch[0].length;
          newContent = newContent.slice(0, insertionPoint) + validationCode + newContent.slice(insertionPoint);
        }
      }
    }
  }
  
  // Fix 2: Hardcoded SUPABASE_ANON_KEY
  const anonKeyPatterns = [
    /const\s+SUPABASE_ANON_KEY\s*=\s*["']eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9[^"']+["']/g,
    new RegExp(`const\\s+SUPABASE_ANON_KEY\\s*=\\s*["']${HARDCODED_ANON_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g'),
  ];
  
  for (const pattern of anonKeyPatterns) {
    if (pattern.test(newContent)) {
      stats.credentialsFound++;
      const replacement = `const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';`;
      newContent = newContent.replace(pattern, replacement);
      modified = true;
      stats.fixes.push(`${relativePath}: Fixed hardcoded SUPABASE_ANON_KEY`);
      
      // Add validation if not exists
      if (!newContent.includes('if (!SUPABASE_ANON_KEY)')) {
        const validationCode = `
if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: VITE_SUPABASE_ANON_KEY environment variable is not set.');
  console.error('Please set it in your .env file.');
  process.exit(1);
}`;
        const constMatch = newContent.match(/const\s+SUPABASE_ANON_KEY\s*=[^;]+;/);
        if (constMatch) {
          const insertionPoint = newContent.indexOf(constMatch[0]) + constMatch[0].length;
          newContent = newContent.slice(0, insertionPoint) + validationCode + newContent.slice(insertionPoint);
        }
      }
    }
  }
  
  // Fix 3: Hardcoded SUPABASE_PUBLISHABLE_KEY (same as anon key)
  const publishableKeyPatterns = [
    /const\s+SUPABASE_PUBLISHABLE_KEY\s*=\s*["']eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9[^"']+["']/g,
    new RegExp(`const\\s+SUPABASE_PUBLISHABLE_KEY\\s*=\\s*["']${HARDCODED_ANON_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g'),
  ];
  
  for (const pattern of publishableKeyPatterns) {
    if (pattern.test(newContent)) {
      stats.credentialsFound++;
      const replacement = `const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';`;
      newContent = newContent.replace(pattern, replacement);
      modified = true;
      stats.fixes.push(`${relativePath}: Fixed hardcoded SUPABASE_PUBLISHABLE_KEY`);
      
      // Add validation if not exists
      if (!newContent.includes('if (!SUPABASE_PUBLISHABLE_KEY)')) {
        const validationCode = `
if (!SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ Error: VITE_SUPABASE_ANON_KEY environment variable is not set.');
  console.error('Please set it in your .env file.');
  process.exit(1);
}`;
        const constMatch = newContent.match(/const\s+SUPABASE_PUBLISHABLE_KEY\s*=[^;]+;/);
        if (constMatch) {
          const insertionPoint = newContent.indexOf(constMatch[0]) + constMatch[0].length;
          newContent = newContent.slice(0, insertionPoint) + validationCode + newContent.slice(insertionPoint);
        }
      }
    }
  }
  
  // Add env loading code for .mjs files if needed
  if (modified && getFileExtension(filePath) === '.mjs') {
    newContent = addEnvLoadingCode(newContent, filePath);
  }
  
  return { modified, content: newContent };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  if (shouldExcludeFile(filePath)) {
    return;
  }
  
  const ext = getFileExtension(filePath);
  if (!FILE_EXTENSIONS.includes(ext)) {
    return;
  }
  
  stats.filesScanned++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { modified, content: newContent } = fixCredentialsInContent(content, filePath);
    
    if (modified) {
      if (DRY_RUN) {
        console.log(`📝 Would fix: ${path.relative(projectRoot, filePath)}`);
        stats.filesModified++;
      } else {
        createBackup(filePath);
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`✅ Fixed: ${path.relative(projectRoot, filePath)}`);
        stats.filesModified++;
      }
    }
  } catch (error) {
    stats.errors.push(`Error processing ${filePath}: ${error.message}`);
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (shouldExcludeFile(fullPath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile()) {
        processFile(fullPath);
      }
    }
  } catch (error) {
    stats.errors.push(`Error scanning directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔒 Security Fix Script: Removing Hardcoded Credentials\n');
  console.log('='.repeat(70));
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n');
  } else if (CREATE_BACKUP) {
    console.log('💾 Backup mode enabled - Backup files will be created\n');
  }
  
  console.log('Scanning codebase...\n');
  
  // Start scanning from project root
  scanDirectory(projectRoot);
  
  // Print results
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTS');
  console.log('='.repeat(70));
  console.log(`Files scanned: ${stats.filesScanned}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Credentials found: ${stats.credentialsFound}`);
  
  if (CREATE_BACKUP && !DRY_RUN) {
    console.log(`Backups created: ${stats.backupsCreated}`);
  }
  
  if (stats.fixes.length > 0) {
    console.log('\n📝 Changes made:');
    stats.fixes.forEach(fix => console.log(`  - ${fix}`));
  }
  
  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${stats.errors.length}`);
    stats.errors.forEach(error => console.error(`  - ${error}`));
  }
  
  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes:');
    console.log('   node scripts/fix-hardcoded-credentials.js');
  } else {
    console.log('\n✅ Security fixes applied!');
    console.log('\n📋 Next steps:');
    console.log('  1. Review the changes');
    console.log('  2. Ensure .env file contains all required variables:');
    console.log('     - VITE_SUPABASE_URL=https://qwhunliohlkkahbspfiu.supabase.co');
    console.log('     - VITE_SUPABASE_ANON_KEY=<your-new-anon-key>');
    console.log('     - SUPABASE_SERVICE_ROLE_KEY=<for-admin-scripts>');
    console.log('  3. ⚠️  IMPORTANT: Rotate exposed credentials in Supabase dashboard!');
    console.log('     Go to: https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/settings/api');
    console.log('     - Generate new anon key');
    console.log('     - Update all environments');
    console.log('  4. Test your application');
    console.log('  5. Remove backup files after verification:');
    console.log('     find . -name "*.backup.*" -type f -delete');
  }
  
  console.log('\n' + '='.repeat(70));
}

// Run the script
main();
