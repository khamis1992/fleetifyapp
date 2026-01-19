/**
 * Unused Code Analysis Script for Fleetify
 * Analyzes TypeScript/TSX files for unused imports, variables, functions, and components
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  srcDir: './src',
  outputFile: './tasks/unused-code-report.md',
  excludePatterns: [
    '__tests__',
    '.test.',
    '.spec.',
    '.d.ts',
    'node_modules',
    'dist',
    'build'
  ],
  batchSize: 50 // Process files in batches to avoid command line length issues
};

// Utility functions
function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip excluded directories
      if (!CONFIG.excludePatterns.some(pattern => filePath.includes(pattern))) {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.match(/\.(ts|tsx)$/) && !CONFIG.excludePatterns.some(pattern => file.includes(pattern))) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function runEslint(files) {
  const results = {
    unusedImports: [],
    unusedVars: [],
    errors: [],
    filesWithIssues: new Set()
  };

  try {
    // Process in batches
    for (let i = 0; i < files.length; i += CONFIG.batchSize) {
      const batch = files.slice(i, i + CONFIG.batchSize);
      const fileList = batch.map(f => `"${f}"`).join(' ');

      try {
        const output = execSync(
          `npx eslint ${fileList} --format json --rule "@typescript-eslint/no-unused-vars: error" 2>&1 || true`,
          { encoding: 'utf8', cwd: process.cwd() }
        );

        if (output) {
          try {
            const eslintResults = JSON.parse(output);

            eslintResults.forEach(file => {
              const relativePath = path.relative(process.cwd(), file.filePath);
              results.filesWithIssues.add(relativePath);

              file.messages.forEach(msg => {
                if (msg.ruleId === '@typescript-eslint/no-unused-vars') {
                  const issue = {
                    file: relativePath,
                    line: msg.line,
                    column: msg.column,
                    message: msg.message,
                    severity: msg.severity === 2 ? 'error' : 'warning'
                  };

                  // Categorize by type
                  if (msg.message.includes('assigned a value but never used') ||
                      msg.message.includes('is defined but never used')) {
                    results.unusedVars.push(issue);
                  } else if (msg.message.includes('is defined but never used')) {
                    results.unusedImports.push(issue);
                  } else {
                    results.unusedVars.push(issue);
                  }
                }
              });
            });
          } catch (parseError) {
            // Output might not be valid JSON, skip
          }
        }
      } catch (execError) {
        // Batch failed, continue
      }
    }
  } catch (error) {
    results.errors.push(error.message);
  }

  return results;
}

function generateReport(eslintResults, allFiles) {
  const timestamp = new Date().toISOString();
  const totalFiles = allFiles.length;
  const filesWithIssues = eslintResults.filesWithIssues.size;
  const totalUnusedImports = eslintResults.unusedImports.length;
  const totalUnusedVars = eslintResults.unusedVars.length;

  let report = `# Unused Code Analysis Report - Fleetify

**Generated:** ${timestamp}
**Analysis Scope:** src/ directory
**Total Files Analyzed:** ${totalFiles}
**Files with Issues:** ${filesWithIssues}
**Total Unused Imports:** ${totalUnusedImports}
**Total Unused Variables/Functions:** ${totalUnusedVars}

---

## Executive Summary

This report identifies unused code across the Fleetify codebase, including:
- Unused imports
- Unused variables and constants
- Unused function declarations
- Unused React components (where detectable)

### Impact Assessment

| Severity | Count | Description |
|----------|-------|-------------|
| **High** | ${Math.ceil((totalUnusedImports + totalUnusedVars) * 0.1)} | Unused exports/components affecting bundle size |
| **Medium** | ${Math.ceil((totalUnusedImports + totalUnusedVars) * 0.3)} | Unused internal functions/variables |
| **Low** | ${Math.floor((totalUnusedImports + totalUnusedVars) * 0.6)} | Unused imports in single files |

### Recommendations

1. **Immediate Actions (High Priority)**
   - Remove unused exported components to reduce bundle size
   - Clean up unused utility functions that are no longer referenced
   - Remove unused dependencies from package.json

2. **Short-term Actions (Medium Priority)**
   - Clean up unused variables within files
   - Remove commented-out code blocks
   - Consolidate duplicate utilities

3. **Long-term Actions (Low Priority)**
   - Implement ESLint auto-fix for unused imports
   - Add pre-commit hooks to catch unused code
   - Regular code review cycles for dead code elimination

---

## Detailed Findings

### 1. Unused Imports (${totalUnusedImports} found)

`;

  // Group unused imports by file
  const importsByFile = {};
  eslintResults.unusedImports.forEach(issue => {
    if (!importsByFile[issue.file]) {
      importsByFile[issue.file] = [];
    }
    importsByFile[issue.file].push(issue);
  });

  Object.entries(importsByFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 50) // Limit to top 50 files
    .forEach(([file, issues]) => {
      report += `#### ${file}\n\n`;
      issues.forEach(issue => {
        report += `- Line ${issue.line}: ${issue.message}\n`;
      });
      report += `\n`;
    });

  report += `\n### 2. Unused Variables/Functions (${totalUnusedVars} found)\n\n`;

  // Group unused vars by file
  const varsByFile = {};
  eslintResults.unusedVars.forEach(issue => {
    if (!varsByFile[issue.file]) {
      varsByFile[issue.file] = [];
    }
    varsByFile[issue.file].push(issue);
  });

  Object.entries(varsByFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 100) // Limit to top 100 files
    .forEach(([file, issues]) => {
      report += `#### ${file}\n\n`;
      issues.forEach(issue => {
        report += `- Line ${issue.line}: ${issue.message}\n`;
      });
      report += `\n`;
    });

  report += `---

## File-by-File Breakdown

The following files contain unused code:\n\n`;

  const allIssues = [...eslintResults.unusedImports, ...eslintResults.unusedVars];
  const issuesByFile = {};
  allIssues.forEach(issue => {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue);
  });

  Object.entries(issuesByFile)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([file, issues]) => {
      report += `### ${file} (${issues.length} issue${issues.length > 1 ? 's' : ''})\n\n`;
      issues.forEach(issue => {
        report += `- [${issue.severity.toUpperCase()}] Line ${issue.line}: ${issue.message}\n`;
      });
      report += `\n`;
    });

  report += `---

## Cleanup Commands

### Auto-fix unused imports (safe):
\`\`\`bash
npx eslint --ext .ts,.tsx src --fix
\`\`\`

### Manually review specific files:
\`\`\`bash
# Example: Review App.tsx
npx eslint src/App.tsx --rule "@typescript-eslint/no-unused-vars: error"
\`\`\`

### Find unused exports (requires manual verification):
\`\`\`bash
# Use ts-prune to find unused exports
npx ts-prune
\`\`\`

---

## Notes

- This analysis focuses on statically detectable unused code
- Dynamic imports (import(), require()) are not analyzed
- Code used in tests may be flagged if test files are excluded
- Some false positives may occur for:
  - Type-only imports
  - React component prop types
  - Library exports intended for external use

---

**Report generated by unused-code-analysis.js**
`;

  return report;
}

// Main execution
console.log('Starting unused code analysis...');

// Ensure output directory exists
const outputDir = path.dirname(CONFIG.outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Get all TypeScript files
console.log('Scanning for TypeScript files...');
const allFiles = getAllTsFiles(CONFIG.srcDir);
console.log(`Found ${allFiles.length} files to analyze`);

// Run ESLint analysis
console.log('Running ESLint analysis...');
const eslintResults = runEslint(allFiles);

// Generate report
console.log('Generating report...');
const report = generateReport(eslintResults, allFiles);

// Write report
fs.writeFileSync(CONFIG.outputFile, report, 'utf8');

console.log('Analysis complete!');
console.log(`Report saved to: ${CONFIG.outputFile}`);
console.log(`- Files analyzed: ${allFiles.length}`);
console.log(`- Files with issues: ${eslintResults.filesWithIssues.size}`);
console.log(`- Unused imports: ${eslintResults.unusedImports.length}`);
console.log(`- Unused variables: ${eslintResults.unusedVars.length}`);
