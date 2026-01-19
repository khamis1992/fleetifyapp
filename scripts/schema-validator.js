#!/usr/bin/env node

/**
 * Schema Validator Script
 * Validates database schema consistency and TypeScript type alignment
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TYPES_FILE = 'src/integrations/supabase/types.ts';
const HOOKS_DIR = 'src/hooks';
const COMPONENTS_DIR = 'src/components';

class SchemaValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.typesContent = '';
  }

  // Read the generated types file
  readTypesFile() {
    try {
      this.typesContent = fs.readFileSync(TYPES_FILE, 'utf8');
      console.log('✓ Types file loaded successfully');
    } catch (error) {
      this.errors.push(`Failed to read types file: ${error.message}`);
    }
  }

  // Extract table names from types file
  extractTableNames() {
    const tableRegex = /Tables:\s*{([^}]+)}/s;
    const match = this.typesContent.match(tableRegex);
    
    if (!match) {
      this.errors.push('Could not extract table names from types file');
      return [];
    }

    const tablesSection = match[1];
    const tableNames = [];
    const nameRegex = /(\w+):\s*{/g;
    let nameMatch;

    while ((nameMatch = nameRegex.exec(tablesSection)) !== null) {
      tableNames.push(nameMatch[1]);
    }

    console.log(`✓ Found ${tableNames.length} tables in schema`);
    return tableNames;
  }

  // Check for hardcoded database queries
  checkHardcodedQueries(filePath, content) {
    const lines = content.split('\n');
    const issues = [];

    lines.forEach((line, index) => {
      // Check for direct table references without type safety
      if (line.includes('.from(') && line.includes("'")) {
        const tableMatch = line.match(/\.from\(['"]([^'"]+)['"]\)/);
        if (tableMatch) {
          const tableName = tableMatch[1];
          // Check if this table exists in our schema
          if (!this.isKnownTable(tableName)) {
            issues.push({
              file: filePath,
              line: index + 1,
              message: `Unknown table reference: ${tableName}`,
              severity: 'error'
            });
          }
        }
      }

      // Check for hardcoded status values
      if (line.includes('status') && line.includes('===') || line.includes('status') && line.includes('!==')) {
        const statusMatch = line.match(/status.*['"]([^'"]+)['"]/);
        if (statusMatch) {
          issues.push({
            file: filePath,
            line: index + 1,
            message: `Hardcoded status value: ${statusMatch[1]}. Consider using type union.`,
            severity: 'warning'
          });
        }
      }
    });

    return issues;
  }

  // Check if table exists in schema
  isKnownTable(tableName) {
    return this.typesContent.includes(`${tableName}:`);
  }

  // Validate file for type safety issues
  validateFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const issues = [];

      // Check for type safety issues
      issues.push(...this.checkHardcodedQueries(filePath, content));
      issues.push(...this.checkTypeConsistency(filePath, content));
      issues.push(...this.checkErrorHandling(filePath, content));

      return issues;
    } catch (error) {
      return [{
        file: filePath,
        line: 0,
        message: `Failed to read file: ${error.message}`,
        severity: 'error'
      }];
    }
  }

  // Check for type consistency issues
  checkTypeConsistency(filePath, content) {
    const issues = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for any types
      if (line.includes(': any') && !line.includes('// @ts-ignore')) {
        issues.push({
          file: filePath,
          line: index + 1,
          message: 'Usage of "any" type detected. Consider using specific types.',
          severity: 'warning'
        });
      }

      // Check for duplicate interface definitions
      if (line.includes('interface ') || line.includes('type ')) {
        const typeMatch = line.match(/(?:interface|type)\s+(\w+)/);
        if (typeMatch) {
          // This would need a more sophisticated check across files
          // For now, just flag potential duplicates
          if (this.isCommonTypeName(typeMatch[1])) {
            issues.push({
              file: filePath,
              line: index + 1,
              message: `Potential duplicate type definition: ${typeMatch[1]}`,
              severity: 'info'
            });
          }
        }
      }
    });

    return issues;
  }

  // Check common type names that might be duplicated
  isCommonTypeName(typeName) {
    const commonTypes = [
      'Customer', 'Payment', 'Contract', 'Invoice', 'User',
      'Company', 'Employee', 'Vehicle', 'Obligation'
    ];
    return commonTypes.includes(typeName);
  }

  // Check for proper error handling
  checkErrorHandling(filePath, content) {
    const issues = [];
    const lines = content.split('\n');

    let hasAsyncFunction = false;
    let hasTryCatch = false;

    lines.forEach((line, index) => {
      if (line.includes('async ') || line.includes('await ')) {
        hasAsyncFunction = true;
      }
      if (line.includes('try {') || line.includes('catch')) {
        hasTryCatch = true;
      }
    });

    if (hasAsyncFunction && !hasTryCatch && filePath.includes('hooks/')) {
      issues.push({
        file: filePath,
        line: 0,
        message: 'Async operations without try-catch blocks detected',
        severity: 'warning'
      });
    }

    return issues;
  }

  // Recursively find all TypeScript files
  findTypeScriptFiles(dir, files = []) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.findTypeScriptFiles(fullPath, files);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  // Run all validations
  async validate() {
    console.log('🔍 Starting schema validation...\n');

    // Read types file
    this.readTypesFile();
    if (this.errors.length > 0) {
      this.printResults();
      return false;
    }

    // Extract table names
    const tableNames = this.extractTableNames();

    // Find all TypeScript files
    const tsFiles = this.findTypeScriptFiles('src');
    console.log(`✓ Found ${tsFiles.length} TypeScript files to validate\n`);

    // Validate each file
    let totalIssues = 0;
    for (const file of tsFiles) {
      const issues = this.validateFile(file);
      totalIssues += issues.length;

      issues.forEach(issue => {
        if (issue.severity === 'error') {
          this.errors.push(issue);
        } else {
          this.warnings.push(issue);
        }
      });
    }

    console.log(`\n📊 Validation complete. Found ${totalIssues} issues.`);
    this.printResults();

    return this.errors.length === 0;
  }

  // Print validation results
  printResults() {
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach(error => {
        if (typeof error === 'string') {
          console.log(`   ${error}`);
        } else {
          console.log(`   ${error.file}:${error.line} - ${error.message}`);
        }
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach(warning => {
        if (typeof warning === 'string') {
          console.log(`   ${warning}`);
        } else {
          console.log(`   ${warning.file}:${warning.line} - ${warning.message}`);
        }
      });
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ No issues found! Schema is consistent.');
    }

    // Summary
    console.log('\n📈 SUMMARY:');
    console.log(`   Errors: ${this.errors.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);
  }
}

// Main execution
if (require.main === module) {
  const validator = new SchemaValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = SchemaValidator;