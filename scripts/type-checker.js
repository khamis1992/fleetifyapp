#!/usr/bin/env node

/**
 * Type Checker Script
 * Advanced TypeScript type validation and consistency checking
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TypeChecker {
  constructor() {
    this.issues = [];
    this.typeDefinitions = new Map();
    this.imports = new Map();
  }

  // Parse TypeScript file and extract type information
  parseTypeScript(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const result = {
        interfaces: this.extractInterfaces(content),
        types: this.extractTypes(content),
        imports: this.extractImports(content),
        exports: this.extractExports(content),
        usages: this.extractTypeUsages(content)
      };

      this.typeDefinitions.set(filePath, result);
      return result;
    } catch (error) {
      this.addIssue('error', filePath, 0, `Failed to parse file: ${error.message}`);
      return null;
    }
  }

  // Extract interface definitions
  extractInterfaces(content) {
    const interfaces = [];
    const regex = /interface\s+(\w+)(?:\s*<[^>]*>)?\s*(?:extends\s+[^{]+)?\s*{([^}]*)}/gs;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      const properties = this.extractProperties(body);
      
      interfaces.push({
        name,
        properties,
        line: this.getLineNumber(content, match.index)
      });
    }

    return interfaces;
  }

  // Extract type definitions
  extractTypes(content) {
    const types = [];
    const regex = /type\s+(\w+)(?:\s*<[^>]*>)?\s*=\s*([^;\n]+)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      types.push({
        name: match[1],
        definition: match[2].trim(),
        line: this.getLineNumber(content, match.index)
      });
    }

    return types;
  }

  // Extract properties from interface body
  extractProperties(body) {
    const properties = [];
    const lines = body.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
        const propMatch = trimmed.match(/(\w+)(\?)?\s*:\s*([^;,\n]+)/);
        if (propMatch) {
          properties.push({
            name: propMatch[1],
            optional: !!propMatch[2],
            type: propMatch[3].trim()
          });
        }
      }
    });

    return properties;
  }

  // Extract import statements
  extractImports(content) {
    const imports = [];
    const regex = /import\s*(?:{([^}]+)}|(\w+)|(\*\s+as\s+\w+))\s*from\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const namedImports = match[1] ? match[1].split(',').map(s => s.trim()) : [];
      const defaultImport = match[2];
      const namespaceImport = match[3];
      const source = match[4];

      imports.push({
        named: namedImports,
        default: defaultImport,
        namespace: namespaceImport,
        source,
        line: this.getLineNumber(content, match.index)
      });
    }

    return imports;
  }

  // Extract export statements
  extractExports(content) {
    const exports = [];
    const regex = /export\s*(?:{([^}]+)}|(?:interface|type|class|function|const|let|var)\s+(\w+))/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        // Named exports
        const names = match[1].split(',').map(s => s.trim());
        names.forEach(name => exports.push({ name, type: 'named' }));
      } else if (match[2]) {
        // Direct exports
        exports.push({ name: match[2], type: 'direct' });
      }
    }

    return exports;
  }

  // Extract type usages
  extractTypeUsages(content) {
    const usages = [];
    const regex = /:\s*(\w+)(?:\[\]|\<[^>]*\>)?/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const typeName = match[1];
      // Filter out primitive types
      if (!['string', 'number', 'boolean', 'void', 'null', 'undefined', 'any'].includes(typeName)) {
        usages.push({
          type: typeName,
          line: this.getLineNumber(content, match.index)
        });
      }
    }

    return usages;
  }

  // Get line number from character index
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  // Add issue to the list
  addIssue(severity, file, line, message) {
    this.issues.push({ severity, file, line, message });
  }

  // Check for duplicate type definitions
  checkDuplicateTypes() {
    const typeNames = new Map();

    for (const [filePath, parsed] of this.typeDefinitions) {
      // Check interfaces
      parsed.interfaces.forEach(iface => {
        if (typeNames.has(iface.name)) {
          const existing = typeNames.get(iface.name);
          this.addIssue(
            'warning',
            filePath,
            iface.line,
            `Duplicate interface "${iface.name}" found. Also defined in ${existing.file}:${existing.line}`
          );
        } else {
          typeNames.set(iface.name, { file: filePath, line: iface.line });
        }
      });

      // Check types
      parsed.types.forEach(type => {
        if (typeNames.has(type.name)) {
          const existing = typeNames.get(type.name);
          this.addIssue(
            'warning',
            filePath,
            type.line,
            `Duplicate type "${type.name}" found. Also defined in ${existing.file}:${existing.line}`
          );
        } else {
          typeNames.set(type.name, { file: filePath, line: type.line });
        }
      });
    }
  }

  // Check for unused imports
  checkUnusedImports() {
    for (const [filePath, parsed] of this.typeDefinitions) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      parsed.imports.forEach(importStmt => {
        importStmt.named.forEach(namedImport => {
          const usage = new RegExp(`\\b${namedImport}\\b`, 'g');
          const matches = content.match(usage) || [];
          
          // Subtract 1 for the import declaration itself
          if (matches.length <= 1) {
            this.addIssue(
              'info',
              filePath,
              importStmt.line,
              `Unused import "${namedImport}"`
            );
          }
        });
      });
    }
  }

  // Check for missing type imports
  checkMissingImports() {
    for (const [filePath, parsed] of this.typeDefinitions) {
      const importedTypes = new Set();
      
      // Collect all imported types
      parsed.imports.forEach(importStmt => {
        importStmt.named.forEach(name => importedTypes.add(name));
        if (importStmt.default) importedTypes.add(importStmt.default);
      });

      // Collect locally defined types
      const localTypes = new Set();
      parsed.interfaces.forEach(iface => localTypes.add(iface.name));
      parsed.types.forEach(type => localTypes.add(type.name));

      // Check usages
      parsed.usages.forEach(usage => {
        if (!importedTypes.has(usage.type) && !localTypes.has(usage.type)) {
          this.addIssue(
            'error',
            filePath,
            usage.line,
            `Type "${usage.type}" is used but not imported or defined`
          );
        }
      });
    }
  }

  // Check interface consistency
  checkInterfaceConsistency() {
    const interfaceMap = new Map();

    // Collect all interfaces with same name
    for (const [filePath, parsed] of this.typeDefinitions) {
      parsed.interfaces.forEach(iface => {
        if (!interfaceMap.has(iface.name)) {
          interfaceMap.set(iface.name, []);
        }
        interfaceMap.get(iface.name).push({
          ...iface,
          file: filePath
        });
      });
    }

    // Check for inconsistencies
    for (const [name, interfaces] of interfaceMap) {
      if (interfaces.length > 1) {
        const reference = interfaces[0];
        
        interfaces.slice(1).forEach(iface => {
          const differences = this.compareInterfaces(reference, iface);
          if (differences.length > 0) {
            this.addIssue(
              'warning',
              iface.file,
              iface.line,
              `Interface "${name}" differs from ${reference.file}:${reference.line}. Differences: ${differences.join(', ')}`
            );
          }
        });
      }
    }
  }

  // Compare two interfaces
  compareInterfaces(iface1, iface2) {
    const differences = [];
    
    const props1 = new Map(iface1.properties.map(p => [p.name, p]));
    const props2 = new Map(iface2.properties.map(p => [p.name, p]));

    // Check for missing properties
    for (const [name, prop] of props1) {
      if (!props2.has(name)) {
        differences.push(`missing property "${name}"`);
      } else {
        const other = props2.get(name);
        if (prop.type !== other.type) {
          differences.push(`property "${name}" type mismatch`);
        }
        if (prop.optional !== other.optional) {
          differences.push(`property "${name}" optionality mismatch`);
        }
      }
    }

    for (const [name] of props2) {
      if (!props1.has(name)) {
        differences.push(`extra property "${name}"`);
      }
    }

    return differences;
  }

  // Run TypeScript compiler for additional checks
  runTypeScriptCompiler() {
    try {
      console.log('🔍 Running TypeScript compiler...');
      execSync('npx tsc --noEmit --skipLibCheck', { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      console.log('✅ TypeScript compilation passed');
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      const lines = output.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        const match = line.match(/^(.+?)\((\d+),\d+\):\s*(error|warning)\s+TS\d+:\s*(.+)$/);
        if (match) {
          const [, file, lineNum, severity, message] = match;
          this.addIssue(severity, file, parseInt(lineNum), message);
        }
      });
    }
  }

  // Find all TypeScript files
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

  // Main validation function
  async validate() {
    console.log('🔍 Starting comprehensive type checking...\n');

    // Find and parse all TypeScript files
    const tsFiles = this.findTypeScriptFiles('src');
    console.log(`📁 Found ${tsFiles.length} TypeScript files`);

    // Parse all files
    console.log('📋 Parsing type definitions...');
    tsFiles.forEach(file => this.parseTypeScript(file));

    // Run checks
    console.log('🔍 Checking for duplicate types...');
    this.checkDuplicateTypes();

    console.log('🔍 Checking for unused imports...');
    this.checkUnusedImports();

    console.log('🔍 Checking for missing imports...');
    this.checkMissingImports();

    console.log('🔍 Checking interface consistency...');
    this.checkInterfaceConsistency();

    // Run TypeScript compiler
    this.runTypeScriptCompiler();

    // Print results
    this.printResults();

    return this.issues.filter(issue => issue.severity === 'error').length === 0;
  }

  // Print results
  printResults() {
    const errors = this.issues.filter(issue => issue.severity === 'error');
    const warnings = this.issues.filter(issue => issue.severity === 'warning');
    const info = this.issues.filter(issue => issue.severity === 'info');

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(issue => {
        console.log(`   ${issue.file}:${issue.line} - ${issue.message}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach(issue => {
        console.log(`   ${issue.file}:${issue.line} - ${issue.message}`);
      });
    }

    if (info.length > 0) {
      console.log('\n💡 INFO:');
      info.forEach(issue => {
        console.log(`   ${issue.file}:${issue.line} - ${issue.message}`);
      });
    }

    if (this.issues.length === 0) {
      console.log('\n✅ No type issues found!');
    }

    // Summary
    console.log('\n📈 SUMMARY:');
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Warnings: ${warnings.length}`);
    console.log(`   Info: ${info.length}`);
    console.log(`   Total files checked: ${this.typeDefinitions.size}`);
  }
}

// Main execution
if (require.main === module) {
  const checker = new TypeChecker();
  checker.validate().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = TypeChecker;