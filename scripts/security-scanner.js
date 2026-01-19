#!/usr/bin/env node

/**
 * Security Scanner MCP - Comprehensive Codebase Security Scanner
 * 
 * This script performs comprehensive security scanning of the codebase including:
 * - Hardcoded credentials detection
 * - Dependency vulnerability scanning
 * - Security best practices checks
 * - Code quality analysis
 * 
 * Usage:
 *   node scripts/security-scanner.js [options]
 * 
 * Options:
 *   --scan-credentials    Scan for hardcoded credentials
 *   --scan-deps           Scan for dependency vulnerabilities
 *   --scan-all            Run all scans (default)
 *   --output <format>     Output format: json, html, text (default: text)
 *   --report <path>       Save report to file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const SCAN_OPTIONS = {
  scanCredentials: process.argv.includes('--scan-credentials') || process.argv.includes('--scan-all'),
  scanDeps: process.argv.includes('--scan-deps') || process.argv.includes('--scan-all'),
  outputFormat: process.argv.includes('--output') 
    ? process.argv[process.argv.indexOf('--output') + 1] || 'text'
    : 'text',
  reportPath: process.argv.includes('--report')
    ? process.argv[process.argv.indexOf('--report') + 1]
    : null,
};

// If no specific scan specified, scan all
if (!SCAN_OPTIONS.scanCredentials && !SCAN_OPTIONS.scanDeps) {
  SCAN_OPTIONS.scanCredentials = true;
  SCAN_OPTIONS.scanDeps = true;
}

// Security patterns to detect
const SECURITY_PATTERNS = {
  hardcodedCredentials: [
    {
      name: 'Supabase URL',
      pattern: /https:\/\/[a-z0-9]+\.supabase\.co/g,
      severity: 'medium',
      description: 'Hardcoded Supabase URL detected'
    },
    {
      name: 'API Keys (JWT)',
      pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
      severity: 'high',
      description: 'Hardcoded JWT token detected (likely API key)'
    },
    {
      name: 'Supabase Anon Key',
      pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+/g,
      severity: 'critical',
      description: 'Hardcoded Supabase anon key detected'
    },
    {
      name: 'AWS Access Key',
      pattern: /AKIA[0-9A-Z]{16}/g,
      severity: 'critical',
      description: 'AWS access key detected'
    },
    {
      name: 'Private Key',
      pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
      severity: 'critical',
      description: 'Private key detected in codebase'
    },
    {
      name: 'Password Assignment',
      pattern: /(password|passwd|pwd)\s*=\s*["'][^"']{8,}["']/gi,
      severity: 'high',
      description: 'Hardcoded password detected'
    },
    {
      name: 'Secret Key',
      pattern: /(secret|api[_-]?key|api[_-]?token)\s*=\s*["'][^"']{10,}["']/gi,
      severity: 'high',
      description: 'Hardcoded secret or API key detected'
    },
    {
      name: 'Database Connection String',
      pattern: /(postgres|mysql|mongodb):\/\/[^"'\s]+/gi,
      severity: 'high',
      description: 'Database connection string detected'
    }
  ],
  
  securityIssues: [
    {
      name: 'Eval Usage',
      pattern: /\beval\s*\(/g,
      severity: 'high',
      description: 'Use of eval() can lead to code injection vulnerabilities'
    },
    {
      name: 'InnerHTML Assignment',
      pattern: /\.innerHTML\s*=\s*[^;]+/g,
      severity: 'medium',
      description: 'Direct innerHTML assignment can lead to XSS vulnerabilities'
    },
    {
      name: 'Dangerous Redirect',
      pattern: /window\.location\s*=\s*[^;]+/g,
      severity: 'medium',
      description: 'Unvalidated redirect can lead to open redirect vulnerabilities'
    },
    {
      name: 'SQL Concatenation',
      pattern: /['"]\s*\+\s*[^+]+.*SELECT|INSERT|UPDATE|DELETE/gi,
      severity: 'high',
      description: 'SQL string concatenation can lead to SQL injection'
    },
    {
      name: 'Console Log with Sensitive Data',
      pattern: /console\.(log|debug|info)\s*\([^)]*(password|token|key|secret|api)/gi,
      severity: 'medium',
      description: 'Sensitive data logged to console'
    }
  ]
};

// Exclude patterns
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.next/,
  /\.pnpm-store/,
  /\.backup\./,
  /\.log$/,
  /\.md$/,
  /\.json$/,
  /\.sql$/,
  /package-lock\.json/,
  /yarn\.lock/,
];

// Statistics
const stats = {
  filesScanned: 0,
  issuesFound: 0,
  vulnerabilities: [],
  scanStartTime: Date.now(),
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
 * Scan file for security issues
 */
function scanFile(filePath) {
  if (shouldExcludeFile(filePath)) {
    return [];
  }
  
  const ext = getFileExtension(filePath);
  const textExtensions = ['.ts', '.js', '.mjs', '.tsx', '.jsx', '.vue', '.py', '.java', '.go', '.rs'];
  
  if (!textExtensions.includes(ext)) {
    return [];
  }
  
  stats.filesScanned++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues = [];
    const relativePath = path.relative(projectRoot, filePath);
    
    // Scan for hardcoded credentials
    if (SCAN_OPTIONS.scanCredentials) {
      for (const pattern of SECURITY_PATTERNS.hardcodedCredentials) {
        const matches = content.match(pattern.pattern);
        if (matches) {
          matches.forEach(match => {
            issues.push({
              type: 'credential',
              severity: pattern.severity,
              pattern: pattern.name,
              description: pattern.description,
              file: relativePath,
              match: match.substring(0, 50) + (match.length > 50 ? '...' : ''),
              line: getLineNumber(content, match),
            });
            stats.issuesFound++;
          });
        }
      }
    }
    
    // Scan for security issues
    for (const pattern of SECURITY_PATTERNS.securityIssues) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            type: 'security',
            severity: pattern.severity,
            pattern: pattern.name,
            description: pattern.description,
            file: relativePath,
            match: match.substring(0, 100) + (match.length > 100 ? '...' : ''),
            line: getLineNumber(content, match),
          });
          stats.issuesFound++;
        });
      }
    }
    
    return issues;
  } catch (error) {
    console.error(`Error scanning ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * Get line number for match
 */
function getLineNumber(content, match) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(match.substring(0, 20))) {
      return i + 1;
    }
  }
  return null;
}

/**
 * Scan directory recursively
 */
function scanDirectory(dirPath) {
  const issues = [];
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (shouldExcludeFile(fullPath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        issues.push(...scanDirectory(fullPath));
      } else if (entry.isFile()) {
        issues.push(...scanFile(fullPath));
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}: ${error.message}`);
  }
  
  return issues;
}

/**
 * Scan dependencies for vulnerabilities
 */
function scanDependencies() {
  if (!SCAN_OPTIONS.scanDeps) {
    return [];
  }
  
  console.log('🔍 Scanning dependencies for vulnerabilities...\n');
  
  const vulnerabilities = [];
  
  try {
    // Run npm audit
    const auditResult = execSync('npm audit --json', { 
      encoding: 'utf-8',
      cwd: projectRoot,
      stdio: 'pipe'
    });
    
    const auditData = JSON.parse(auditResult);
    
    if (auditData.vulnerabilities) {
      Object.entries(auditData.vulnerabilities).forEach(([pkg, vuln]) => {
        vulnerabilities.push({
          type: 'dependency',
          severity: vuln.severity || 'unknown',
          package: pkg,
          description: vuln.title || 'Dependency vulnerability',
          recommendation: vuln.recommendation || 'Update package',
          file: 'package.json',
        });
        stats.issuesFound++;
      });
    }
  } catch (error) {
    // npm audit may fail if there are vulnerabilities (exit code 1)
    if (error.stdout) {
      try {
        const auditData = JSON.parse(error.stdout);
        if (auditData.vulnerabilities) {
          Object.entries(auditData.vulnerabilities).forEach(([pkg, vuln]) => {
            vulnerabilities.push({
              type: 'dependency',
              severity: vuln.severity || 'unknown',
              package: pkg,
              description: vuln.title || 'Dependency vulnerability',
              recommendation: vuln.recommendation || 'Update package',
              file: 'package.json',
            });
            stats.issuesFound++;
          });
        }
      } catch (e) {
        console.warn('⚠️  Could not parse npm audit output');
      }
    }
  }
  
  return vulnerabilities;
}

/**
 * Generate report
 */
function generateReport(allIssues, vulnerabilities) {
  const scanDuration = ((Date.now() - stats.scanStartTime) / 1000).toFixed(2);
  
  const report = {
    timestamp: new Date().toISOString(),
    scanDuration: `${scanDuration}s`,
    filesScanned: stats.filesScanned,
    totalIssues: stats.issuesFound,
    issues: allIssues,
    vulnerabilities: vulnerabilities,
    summary: {
      critical: allIssues.filter(i => i.severity === 'critical').length,
      high: allIssues.filter(i => i.severity === 'high').length,
      medium: allIssues.filter(i => i.severity === 'medium').length,
      low: allIssues.filter(i => i.severity === 'low').length,
    }
  };
  
  if (SCAN_OPTIONS.outputFormat === 'json') {
    return JSON.stringify(report, null, 2);
  }
  
  // Text format
  let output = '';
  output += '='.repeat(70) + '\n';
  output += '🔒 SECURITY SCAN REPORT\n';
  output += '='.repeat(70) + '\n\n';
  output += `Scan Date: ${new Date().toLocaleString()}\n`;
  output += `Scan Duration: ${scanDuration}s\n`;
  output += `Files Scanned: ${stats.filesScanned}\n`;
  output += `Total Issues Found: ${stats.issuesFound}\n\n`;
  
  output += `Summary:\n`;
  output += `  Critical: ${report.summary.critical}\n`;
  output += `  High: ${report.summary.high}\n`;
  output += `  Medium: ${report.summary.medium}\n`;
  output += `  Low: ${report.summary.low}\n\n`;
  
  // Group by severity
  const bySeverity = {
    critical: allIssues.filter(i => i.severity === 'critical'),
    high: allIssues.filter(i => i.severity === 'high'),
    medium: allIssues.filter(i => i.severity === 'medium'),
    low: allIssues.filter(i => i.severity === 'low'),
  };
  
  for (const [severity, issues] of Object.entries(bySeverity)) {
    if (issues.length === 0) continue;
    
    output += `\n${'='.repeat(70)}\n`;
    output += `${severity.toUpperCase()} SEVERITY ISSUES (${issues.length})\n`;
    output += `${'='.repeat(70)}\n\n`;
    
    issues.forEach((issue, idx) => {
      output += `${idx + 1}. ${issue.pattern}\n`;
      output += `   File: ${issue.file}`;
      if (issue.line) output += `:${issue.line}`;
      output += `\n`;
      output += `   Description: ${issue.description}\n`;
      if (issue.match) {
        output += `   Match: ${issue.match}\n`;
      }
      output += `\n`;
    });
  }
  
  // Dependencies
  if (vulnerabilities.length > 0) {
    output += `\n${'='.repeat(70)}\n`;
    output += `DEPENDENCY VULNERABILITIES (${vulnerabilities.length})\n`;
    output += `${'='.repeat(70)}\n\n`;
    
    vulnerabilities.forEach((vuln, idx) => {
      output += `${idx + 1}. ${vuln.package}\n`;
      output += `   Severity: ${vuln.severity}\n`;
      output += `   Description: ${vuln.description}\n`;
      output += `   Recommendation: ${vuln.recommendation}\n\n`;
    });
  }
  
  output += `\n${'='.repeat(70)}\n`;
  output += `Scan Complete\n`;
  output += `${'='.repeat(70)}\n`;
  
  return output;
}

/**
 * Main execution
 */
function main() {
  console.log('🔒 Security Scanner MCP - Starting Scan...\n');
  console.log('='.repeat(70));
  
  if (SCAN_OPTIONS.scanCredentials) {
    console.log('✓ Scanning for hardcoded credentials');
  }
  if (SCAN_OPTIONS.scanDeps) {
    console.log('✓ Scanning dependencies');
  }
  console.log('');
  
  // Scan codebase
  console.log('📂 Scanning codebase...');
  const codeIssues = scanDirectory(projectRoot);
  
  // Scan dependencies
  const vulnerabilities = scanDependencies();
  
  // Generate report
  const allIssues = [...codeIssues, ...vulnerabilities];
  const report = generateReport(codeIssues, vulnerabilities);
  
  // Output report
  if (SCAN_OPTIONS.reportPath) {
    fs.writeFileSync(SCAN_OPTIONS.reportPath, report, 'utf-8');
    console.log(`\n📄 Report saved to: ${SCAN_OPTIONS.reportPath}`);
  } else {
    console.log('\n' + report);
  }
  
  // Exit with error code if critical issues found
  if (stats.issuesFound > 0) {
    const criticalCount = codeIssues.filter(i => i.severity === 'critical').length;
    if (criticalCount > 0) {
      process.exit(1);
    }
  }
}

// Run the scanner
main();

