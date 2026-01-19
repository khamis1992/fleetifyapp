import { chromium } from 'playwright';

/**
 * Dashboard exploration script to understand the page structure and find buttons
 */

async function exploreDashboard() {
  console.log('🔍 Exploring FleetifyApp Dashboard Structure\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Wait for dynamic content

    console.log('📄 Page Title:', await page.title());
    console.log('🔗 Current URL:', page.url());

    // Check if we need to navigate to dashboard
    const currentUrl = page.url();
    if (!currentUrl.includes('/dashboard')) {
      console.log('🔄 Navigating to dashboard...');
      await page.goto('http://localhost:8080/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);
    }

    console.log('\n🔍 EXPLORING PAGE STRUCTURE:\n');

    // 1. Find all buttons using different selectors
    console.log('🔹 Finding buttons with different selectors...');

    const buttonSelectors = [
      'button',
      'input[type="button"]',
      'input[type="submit"]',
      '[role="button"]',
      '.btn',
      '[class*="button"]',
      '[onclick]',
      '[data-testid*="button"]',
      '[data-action]'
    ];

    for (const selector of buttonSelectors) {
      const count = await page.locator(selector).count();
      console.log(`  ${selector}: ${count} elements`);
    }

    // 2. Get all interactive elements
    console.log('\n🔹 Finding all interactive elements...');

    const interactiveSelectors = [
      'a[href]',
      'button',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]',
      '[role="link"]',
      '[onclick]'
    ];

    let totalInteractive = 0;
    for (const selector of interactiveSelectors) {
      const count = await page.locator(selector).count();
      totalInteractive += count;
      if (count > 0) {
        console.log(`  ${selector}: ${count} elements`);

        // Show details for first few elements
        const elements = page.locator(selector);
        for (let i = 0; i < Math.min(count, 3); i++) {
          const element = elements.nth(i);
          const text = await element.textContent();
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());
          const className = await element.getAttribute('class');
          console.log(`    ${i + 1}. <${tagName}> ${text?.substring(0, 50) || ''} ${className ? `(${className})` : ''}`);
        }
      }
    }

    console.log(`\n  Total interactive elements: ${totalInteractive}`);

    // 3. Look for specific dashboard components
    console.log('\n🔹 Looking for dashboard components...');

    const componentSelectors = [
      '.dashboard',
      '.card',
      '.widget',
      '[data-testid*="dashboard"]',
      '[data-testid*="card"]',
      '[data-testid*="widget"]',
      '.stats',
      '.metric',
      '[class*="stat"]',
      '[class*="metric"]'
    ];

    for (const selector of componentSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`  ${selector}: ${count} elements`);
      }
    }

    // 4. Look for navigation elements
    console.log('\n🔹 Looking for navigation elements...');

    const navSelectors = [
      'nav',
      '.navbar',
      '.sidebar',
      '.menu',
      '[data-testid*="nav"]',
      '[data-testid*="menu"]',
      'a[href*="/dashboard"]',
      'a[href*="/contracts"]',
      'a[href*="/vehicles"]',
      'a[href*="/customers"]'
    ];

    for (const selector of navSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`  ${selector}: ${count} elements`);

        // Show navigation links
        const elements = page.locator(selector);
        for (let i = 0; i < Math.min(count, 5); i++) {
          const element = elements.nth(i);
          const text = await element.textContent();
          if (text && text.trim()) {
            console.log(`    ${i + 1}. ${text.trim()}`);
          }
        }
      }
    }

    // 5. Take screenshot for visual inspection
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: 'dashboard-exploration-screenshot.png', fullPage: true });
    console.log('  Screenshot saved as: dashboard-exploration-screenshot.png');

    // 6. Generate page content summary
    console.log('\n📝 Page Content Summary:');
    const bodyText = await page.textContent('body');
    const wordCount = bodyText?.split(/\s+/).length || 0;
    console.log(`  Word count: ${wordCount}`);
    console.log(`  Character count: ${bodyText?.length || 0}`);

    // 7. Check for loading indicators
    console.log('\n⏳ Loading indicators:');
    const loadingSelectors = [
      '.loading',
      '.spinner',
      '[data-loading]',
      '.skeleton',
      '[class*="loading"]',
      '[class*="spinner"]'
    ];

    for (const selector of loadingSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`  ${selector}: ${count} elements`);
      }
    }

    // 8. Check for error messages
    console.log('\n❌ Error messages:');
    const errorSelectors = [
      '.error',
      '[data-testid*="error"]',
      '[class*="error"]',
      '.alert-danger'
    ];

    for (const selector of errorSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`  ${selector}: ${count} elements`);

        const elements = page.locator(selector);
        for (let i = 0; i < Math.min(count, 3); i++) {
          const element = elements.nth(i);
          const text = await element.textContent();
          if (text && text.trim()) {
            console.log(`    Error ${i + 1}: ${text.trim()}`);
          }
        }
      }
    }

    // 9. Console errors
    console.log('\n🔍 Console monitoring:');
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    // Wait a bit more to catch any console errors
    await page.waitForTimeout(3000);

    if (consoleErrors.length > 0) {
      console.log(`  Console errors found: ${consoleErrors.length}`);
      consoleErrors.forEach((error, index) => {
        console.log(`    ${index + 1}. ${error}`);
      });
    } else {
      console.log('  ✅ No console errors detected');
    }

    // 10. Generate simple button test
    console.log('\n🧪 Simple button interaction test:');

    // Find any clickable element
    const clickables = await page.locator('button, a[href], [role="button"], [onclick]').all();
    const visibleClickables = [];

    for (let i = 0; i < clickables.length; i++) {
      const element = clickables[i];
      if (await element.isVisible()) {
        visibleClickables.push(element);
      }
    }

    console.log(`  Found ${visibleClickables.length} visible clickable elements`);

    // Test first few clickable elements
    for (let i = 0; i < Math.min(visibleClickables.length, 5); i++) {
      const element = visibleClickables[i];
      try {
        const text = await element.textContent();
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        console.log(`  Testing ${i + 1}. <${tagName}> "${text?.substring(0, 30) || ''}..."`);

        // Check if it has proper click handling
        const hasOnclick = await element.getAttribute('onclick');
        const hasHref = await element.getAttribute('href');
        const hasRole = await element.getAttribute('role');

        console.log(`    Attributes: onclick=${!!hasOnclick}, href=${!!hasHref}, role=${hasRole}`);

        if (hasHref) {
          console.log(`    Link target: ${hasHref}`);
        }

      } catch (error) {
        console.log(`    Error testing element: ${error}`);
      }
    }

  } catch (error) {
    console.error('❌ Exploration failed:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

exploreDashboard().catch(console.error);