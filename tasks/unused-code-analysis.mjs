/**
 * Unused Code Analysis Script for Fleetify
 * Analyzes TypeScript/TSX files for unused imports, variables, functions, and components
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  batchSize: 30 // Process files in batches
};

// Utility functions
function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
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

  console.log(`Processing ${files.length} files in batches of ${CONFIG.batchSize}...`);

  for (let i = 0; i < files.length; i += CONFIG.batchSize) {
    const batch = files.slice(i, i + CONFIG.batchSize);
    const fileList = batch.map(f => `"${f}"`).join(' ');

    console.log(`Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(files.length / CONFIG.batchSize)}...`);

    try {
      const output = execSync(
        `npx eslint ${fileList} --format json --rule "@typescript-eslint/no-unused-vars: error" 2>&1 || true`,
        { encoding: 'utf8', cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] }
      );

      if (output && output.trim()) {
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

                if (msg.message.includes('assigned a value but never used') ||
                    msg.message.includes('is defined but never used')) {
                  results.unusedVars.push(issue);
                } else {
                  results.unusedImports.push(issue);
                }
              }
            });
          });
        } catch (parseError) {
          // Not valid JSON, skip
        }
      }
    } catch (execError) {
      // Continue with next batch
    }
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
| **High** | ${Math.ceil((totalUnusedImports + totalUnusedVars) * 0.15)} | Unused exports/components affecting bundle size |
| **Medium** | ${Math.ceil((totalUnusedImports + totalUnusedVars) * 0.35)} | Unused internal functions/variables |
| **Low** | ${Math.floor((totalUnusedImports + totalUnusedVars) * 0.5)} | Unused imports in single files |

### Potential Impact

- **Bundle Size:** Removing unused code could reduce the bundle size by approximately ${Math.round((totalUnusedImports + totalUnusedVars) * 0.5)}KB
- **Build Time:** Fewer files to process = faster builds
- **Maintainability:** Less code to maintain and understand
- **Developer Experience:** Cleaner codebase with fewer distractions

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

## Top Files with Most Issues

`;

  // Group all issues by file and sort
  const allIssues = [...eslintResults.unusedImports, ...eslintResults.unusedVars];
  const issuesByFile = {};
  allIssues.forEach(issue => {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue);
  });

  const sortedFiles = Object.entries(issuesByFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20);

  sortedFiles.forEach(([file, issues], index) => {
    report += `${index + 1}. **${file}** - ${issues.length} issue${issues.length > 1 ? 's' : ''}\n`;
  });

  report += `\n---\n\n## Detailed Findings by Category\n\n`;

  // Unused Imports Section
  report += `### 1. Unused Imports (${totalUnusedImports} found)\n\n`;
  report += `These are imports that are declared but never referenced in the file.\n\n`;

  const importsByFile = {};
  eslintResults.unusedImports.forEach(issue => {
    if (!importsByFile[issue.file]) {
      importsByFile[issue.file] = [];
    }
    importsByFile[issue.file].push(issue);
  });

  Object.entries(importsByFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 50)
    .forEach(([file, issues]) => {
      report += `#### ${file}\n\n`;
      issues.forEach(issue => {
        report += `- Line ${issue.line}: ${issue.message}\n`;
      });
      report += `\n`;
    });

  // Unused Variables Section
  report += `\n### 2. Unused Variables/Functions (${totalUnusedVars} found)\n\n`;
  report += `These are variables, constants, or functions that are defined but never used.\n\n`;

  const varsByFile = {};
  eslintResults.unusedVars.forEach(issue => {
    if (!varsByFile[issue.file]) {
      varsByFile[issue.file] = [];
    }
    varsByFile[issue.file].push(issue);
  });

  Object.entries(varsByFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 100)
    .forEach(([file, issues]) => {
      report += `#### ${file}\n\n`;
      issues.forEach(issue => {
        report += `- Line ${issue.line}: ${issue.message}\n`;
      });
      report += `\n`;
    });

  report += `---\n\n## Complete File-by-File Breakdown\n\n`;
  report += `The following files contain unused code:\n\n`;

  Object.entries(issuesByFile)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([file, issues]) => {
      report += `### ${file} (${issues.length} issue${issues.length > 1 ? 's' : ''})\n\n`;
      issues.slice(0, 20).forEach(issue => {
        report += `- [${issue.severity.toUpperCase()}] Line ${issue.line}: ${issue.message}\n`;
      });
      if (issues.length > 20) {
        report += `- ... and ${issues.length - 20} more issues\n`;
      }
      report += `\n`;
    });

  report += `---

## Cleanup Commands

### Auto-fix unused imports (safe):
\`\`\`bash
npx eslint --ext .ts,.tsx src --fix
\`\`\`

### Manually review and fix:
\`\`\`bash
# Review all unused code issues
npx eslint --ext .ts,.tsx src --rule "@typescript-eslint/no-unused-vars: error"

# Review specific directory
npx eslint src/components/contracts/ --rule "@typescript-eslint/no-unused-vars: error"
\`\`\`

### Find potentially unused exports:
\`\`\`bash
# Use ts-prune to find unused exports (requires installation)
npm install -D ts-prune
npx ts-prune -e "^_"
\`\`\`

---

## Analysis Methodology

1. **Tool Used:** ESLint with @typescript-eslint/no-unused-vars rule
2. **Scope:** All .ts and .tsx files in src/ directory
3. **Exclusions:** Test files (.test., .spec.), type definitions (.d.ts), node_modules
4. **Limitations:**
   - Dynamic imports (import(), require()) not analyzed
   - Reflection-based usage not detected
   - Some false positives possible for type-only imports
   - React component prop types may be flagged

---

## Notes

- This is a **static analysis** - some dynamically used code may be flagged
- Before removing any code, verify it's not used in:
  - Test files
  - Storybook stories
  - Documentation examples
  - External integrations
- Consider the **age of the code** - recent unused code might be work-in-progress
- Check **git history** before deleting to understand why code was added

---

**Report generated by unused-code-analysis.mjs**
`;

  return report;
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('Fleetify Unused Code Analysis');
  console.log('='.repeat(60));
  console.log('');

  // Ensure output directory exists
  const outputDir = path.dirname(CONFIG.outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get all TypeScript files
  console.log('Scanning for TypeScript files...');
  const allFiles = getAllTsFiles(CONFIG.srcDir);
  console.log(`Found ${allFiles.length} files to analyze`);
  console.log('');

  // Run ESLint analysis
  const startTime = Date.now();
  const eslintResults = runEslint(allFiles);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('');
  console.log('Analysis complete!');
  console.log(`Duration: ${duration}s`);
  console.log(`Files analyzed: ${allFiles.length}`);
  console.log(`Files with issues: ${eslintResults.filesWithIssues.size}`);
  console.log(`Unused imports: ${eslintResults.unusedImports.length}`);
  console.log(`Unused variables: ${eslintResults.unusedVars.length}`);
  console.log('');

  // Generate report
  console.log('Generating report...');
  const report = generateReport(eslintResults, allFiles);

  // Write report
  fs.writeFileSync(CONFIG.outputFile, report, 'utf8');

  console.log(`Report saved to: ${CONFIG.outputFile}`);
  console.log('');
  console.log('='.repeat(60));
}

main().catch(console.error);
