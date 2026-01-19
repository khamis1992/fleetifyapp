const fs = require('fs');

// Read ESLint output
const eslintData = JSON.parse(fs.readFileSync('eslint_output.json', 'utf8'));

const filesWithOnlyImports = {};

eslintData.forEach(file => {
  if (!file.messages || file.messages.length === 0) return;

  const importIssues = [];
  const varIssues = [];

  file.messages.forEach(msg => {
    if (msg.ruleId !== '@typescript-eslint/no-unused-vars') return;

    // Check if it's an import (defined but never used) vs variable (assigned but never used)
    if (msg.message && msg.message.includes('is defined but never used')) {
      importIssues.push({ line: msg.line, column: msg.column, message: msg.message });
    } else if (msg.message && msg.message.includes('is assigned a value but never used')) {
      varIssues.push({ line: msg.line, column: msg.column, message: msg.message });
    }
  });

  // Only include files that have import issues but NO variable issues
  if (importIssues.length > 0 && varIssues.length === 0) {
    filesWithOnlyImports[file.filePath] = {
      count: importIssues.length,
      issues: importIssues
    };
  }
});

console.log(JSON.stringify(filesWithOnlyImports, null, 2));
