/**
 * Script to check console errors on the website
 * Run with: npx tsx scripts/check-console-errors.ts
 */

import { chromium, ConsoleMessage } from '@playwright/test';

interface ConsoleLog {
  type: string;
  text: string;
  location: string;
}

async function checkConsoleErrors() {
  console.log('🚀 Starting browser...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'ar-SA',
  });
  
  const page = await context.newPage();
  
  const consoleLogs: ConsoleLog[] = [];
  const errors: ConsoleLog[] = [];
  const warnings: ConsoleLog[] = [];
  
  // Listen to console events
  page.on('console', (msg: ConsoleMessage) => {
    const log: ConsoleLog = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location().url || 'unknown'
    };
    
    consoleLogs.push(log);
    
    if (msg.type() === 'error') {
      errors.push(log);
    } else if (msg.type() === 'warning') {
      warnings.push(log);
    }
  });
  
  // Listen to page errors
  page.on('pageerror', (error) => {
    errors.push({
      type: 'pageerror',
      text: error.message,
      location: error.stack || 'unknown'
    });
  });
  
  // Listen to request failures
  page.on('requestfailed', (request) => {
    errors.push({
      type: 'requestfailed',
      text: `Failed to load: ${request.url()} - ${request.failure()?.errorText}`,
      location: request.url()
    });
  });

  try {
    console.log('📍 Navigating to https://www.alaraf.online/auth ...');
    await page.goto('https://www.alaraf.online/auth', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForTimeout(5000);
    
    // Take a screenshot
    await page.screenshot({ path: 'auth-page-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved to auth-page-screenshot.png');
    
    // Check if page is blank
    const bodyContent = await page.evaluate(() => {
      return document.body.innerText.trim().length;
    });
    
    if (bodyContent < 10) {
      console.log('⚠️ WARNING: Page appears to be blank or nearly empty!');
    } else {
      console.log(`✅ Page has content (${bodyContent} characters)`);
    }
    
    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
  } catch (error) {
    console.error('❌ Navigation error:', error);
  }

  // Now try the dashboard
  try {
    console.log('\n📍 Navigating to https://www.alaraf.online/dashboard ...');
    await page.goto('https://www.alaraf.online/dashboard', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForTimeout(5000);
    
    // Take a screenshot
    await page.screenshot({ path: 'dashboard-page-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved to dashboard-page-screenshot.png');
    
  } catch (error) {
    console.error('❌ Navigation error:', error);
  }

  await browser.close();

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 CONSOLE LOGS SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n🔴 ERRORS (${errors.length}):`);
  if (errors.length === 0) {
    console.log('   ✅ No errors found!');
  } else {
    errors.forEach((error, i) => {
      console.log(`\n   ${i + 1}. [${error.type}]`);
      console.log(`      Message: ${error.text.substring(0, 500)}`);
      if (error.location !== 'unknown') {
        console.log(`      Location: ${error.location.substring(0, 100)}`);
      }
    });
  }
  
  console.log(`\n🟡 WARNINGS (${warnings.length}):`);
  if (warnings.length === 0) {
    console.log('   ✅ No warnings found!');
  } else {
    // Show first 10 warnings only
    warnings.slice(0, 10).forEach((warning, i) => {
      console.log(`\n   ${i + 1}. ${warning.text.substring(0, 200)}`);
    });
    if (warnings.length > 10) {
      console.log(`\n   ... and ${warnings.length - 10} more warnings`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📈 Total logs: ${consoleLogs.length} | Errors: ${errors.length} | Warnings: ${warnings.length}`);
  console.log('='.repeat(60));
  
  // Return exit code based on errors
  if (errors.length > 0) {
    process.exit(1);
  }
}

checkConsoleErrors().catch(console.error);
