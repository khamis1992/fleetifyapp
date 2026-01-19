#!/usr/bin/env tsx

/**
 * Visual Regression Helper Script
 * Utility functions to manage visual regression tests
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { argv } from 'process';

const SNAPSHOT_DIR = '__snapshots__';
const REPORT_DIR = 'visual-reports';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createReport() {
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }

  const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Regression Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .test-suite {
            background: white;
            margin-bottom: 20px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .suite-header {
            background: #2196F3;
            color: white;
            padding: 15px 20px;
            font-weight: bold;
        }
        .test-case {
            border-bottom: 1px solid #eee;
            padding: 20px;
        }
        .test-case:last-child {
            border-bottom: none;
        }
        .comparison {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        .screenshot {
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
        }
        .screenshot img {
            width: 100%;
            height: auto;
            display: block;
        }
        .screenshot-title {
            background: #f8f9fa;
            padding: 8px 12px;
            font-weight: 500;
            border-bottom: 1px solid #ddd;
        }
        .status-pass {
            color: #4caf50;
        }
        .status-fail {
            color: #f44336;
        }
        .timestamp {
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Visual Regression Report</h1>
            <p class="timestamp">Generated on ${new Date().toLocaleString()}</p>
        </div>
        <div id="results">
            <!-- Results will be populated here -->
        </div>
    </div>
</body>
</html>
  `;

  writeFileSync(join(REPORT_DIR, 'index.html'), htmlReport);
  log('Created visual regression report template', 'green');
}

function updateSnapshots() {
  log('🔄 Updating visual snapshots...', 'yellow');

  try {
    // Set environment variable and run tests
    process.env.SNAPSHOT_UPDATE = 'true';
    execSync('npx playwright test --config=playwright.visual.config.ts', {
      stdio: 'inherit',
      env: { ...process.env, SNAPSHOT_UPDATE: 'true' }
    });
    log('✅ Snapshots updated successfully', 'green');
  } catch (error) {
    log('❌ Failed to update snapshots', 'red');
    process.exit(1);
  }
}

function runVisualTests() {
  log('🎨 Running visual regression tests...', 'cyan');

  try {
    execSync('npx playwright test --config=playwright.visual.config.ts', {
      stdio: 'inherit'
    });
    log('✅ Visual tests completed', 'green');
  } catch (error) {
    log('❌ Some visual tests failed', 'red');
    log('Run "npm run visual:update" to update snapshots if changes are intentional', 'yellow');
    process.exit(1);
  }
}

function showHelp() {
  log('Visual Regression Helper', 'cyan');
  log('');
  log('Commands:', 'white');
  log('  npm run visual:test      Run visual regression tests', 'white');
  log('  npm run visual:update    Update all snapshots', 'white');
  log('  npm run visual:report    Generate HTML report', 'white');
  log('');
  log('Environment Variables:', 'white');
  log('  SNAPSHOT_UPDATE=true     Update snapshots instead of comparing', 'white');
  log('  BASE_URL=http://...     Custom base URL for tests', 'white');
}

// Main script logic
const command = argv[2];

switch (command) {
  case 'test':
    runVisualTests();
    break;
  case 'update':
    updateSnapshots();
    break;
  case 'report':
    createReport();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    log('Unknown command. Use "help" for available commands.', 'red');
    process.exit(1);
}

export { createReport, updateSnapshots, runVisualTests };