/**
 * Component Migration Script
 * 
 * Automatically updates components to use new Services and Hooks.
 */

import * as fs from 'fs';
import * as path from 'path';

interface MigrationRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const MIGRATION_RULES: MigrationRule[] = [
  // Rule 1: Replace useUnifiedCompanyAccess imports
  {
    pattern: /import\s+{\s*useUnifiedCompanyAccess\s*}\s+from\s+['"]@\/hooks\/useUnifiedCompanyAccess['"]/g,
    replacement: "import { useCompanyAccess, useCompanyPermissions, useCompanyFiltering, useBrowsingMode } from '@/hooks/company'",
    description: 'Replace useUnifiedCompanyAccess import'
  },
  
  // Rule 2: Replace useCurrentCompanyId
  {
    pattern: /import\s+{\s*useCurrentCompanyId\s*}\s+from\s+['"]@\/hooks\/useUnifiedCompanyAccess['"]/g,
    replacement: "import { useCurrentCompanyId } from '@/hooks/company'",
    description: 'Replace useCurrentCompanyId import'
  },
  
  // Rule 3: Add Service imports where needed
  {
    pattern: /(from\s+['"]@\/integrations\/supabase\/client['"])/g,
    replacement: "$1\nimport { contractService, paymentService, invoiceService } from '@/services'",
    description: 'Add service imports'
  }
];

/**
 * Migrate a single file
 */
function migrateFile(filePath: string): boolean {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Apply each migration rule
    for (const rule of MIGRATION_RULES) {
      if (rule.pattern.test(content)) {
        content = content.replace(rule.pattern, rule.replacement);
        modified = true;
        console.log(`✅ Applied: ${rule.description} to ${filePath}`);
      }
    }

    if (modified) {
      // Create backup
      fs.writeFileSync(filePath + '.backup', fs.readFileSync(filePath));
      
      // Write updated content
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error);
    return false;
  }
}

/**
 * Migrate all files in directory
 */
function migrateDirectory(dirPath: string): void {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      migrateDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      migrateFile(fullPath);
    }
  }
}

/**
 * Main migration function
 */
function main() {
  console.log('🚀 Starting component migration...\n');

  const componentsDir = path.join(__dirname, '../src/components');
  const pagesDir = path.join(__dirname, '../src/pages');

  console.log('📂 Migrating components...');
  migrateDirectory(componentsDir);

  console.log('\n📂 Migrating pages...');
  migrateDirectory(pagesDir);

  console.log('\n✅ Migration completed!');
  console.log('\n⚠️  Backup files (.backup) created for all modified files');
  console.log('💡 Review changes and remove .backup files when satisfied');
}

// Run migration
if (require.main === module) {
  main();
}

