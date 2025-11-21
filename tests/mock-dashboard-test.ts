import { chromium, Page } from 'playwright';

/**
 * Mock dashboard testing that bypasses Supabase requirements
 * This approach focuses on UI button testing without requiring a real database
 */

const TEST_CONFIG = {
  baseUrl: 'http://localhost:8080',
  viewports: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 },
  },
};

// Mock Supabase client script to bypass database requirements
const MOCK_SUPABASE_SCRIPT = `
  // Mock Supabase client to prevent errors during UI testing
  window.mockSupabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
      signOut: () => Promise.resolve({ data: {}, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          data: [],
          error: null,
        }),
        data: [],
        error: null,
      }),
      data: [],
      error: null,
    }),
    rpc: () => Promise.resolve({ data: [], error: null }),
  };

  // Override import.meta.env to provide required variables
  window.importMetaEnv = {
    VITE_SUPABASE_URL: 'https://mock.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'mock-key',
  };

  // Mock the environment check
  Object.defineProperty(window, 'importMetaEnv', {
    value: {
      VITE_SUPABASE_URL: 'https://mock.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'mock-key',
    }
  });
`;

async function testDashboardWithMock(page: Page): Promise<any> {
  // Inject mock Supabase before any script execution
  await page.addInitScript(MOCK_SUPABASE_SCRIPT);

  // Also intercept the Supabase client request
  await page.route('**/integrations/supabase/client.js', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: MOCK_SUPABASE_SCRIPT + `
        export const supabase = window.mockSupabase;
      `
    });
  });

  return page;
}

async function main() {
  console.log('🧪 Starting Mock Dashboard Button Testing Suite\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });

  const context = await browser.newContext({
    viewport: TEST_CONFIG.viewports.desktop,
    ignoreHTTPSErrors: true,
    recordVideo: { dir: 'test-videos/' },
  });

  try {
    const page = await context.newPage();

    // Set up console error tracking
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Test 1: Mock Supabase setup and dashboard access
    console.log('🔧 Setting up mock environment...');
    await testDashboardWithMock(page);

    console.log('🌐 Accessing dashboard...');
    await page.goto(TEST_CONFIG.baseUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Wait for React to render

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Try different routes if main page is empty
    if (currentUrl === TEST_CONFIG.baseUrl + '/') {
      console.log('🔄 Trying dashboard route...');
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);
    }

    // Test 2: Find and analyze all buttons
    console.log('\n🔍 Searching for buttons and interactive elements...');

    const buttonSelectors = [
      'button',
      'input[type="button"]',
      'input[type="submit"]',
      '[role="button"]',
      'a[href]',
      '.btn',
      '[class*="button"]',
      '[data-testid*="button"]',
      '[data-action]',
      '[onclick]'
    ];

    let totalElements = 0;
    const foundElements: Array<{selector: string, count: number, examples: string[]}> = [];

    for (const selector of buttonSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      totalElements += count;

      if (count > 0) {
        const examples: string[] = [];
        // Get first few examples
        for (let i = 0; i < Math.min(count, 3); i++) {
          const element = elements.nth(i);
          try {
            const text = await element.textContent();
            const tag = await element.evaluate(el => el.tagName.toLowerCase());
            examples.push(`<${tag}> ${text?.substring(0, 30) || 'No text'}`);
          } catch (e) {
            examples.push(`Error getting example: ${e}`);
          }
        }

        foundElements.push({
          selector,
          count,
          examples
        });
      }
    }

    console.log(`\n📊 ELEMENT ANALYSIS RESULTS:`);
    console.log(`Total interactive elements found: ${totalElements}`);

    if (foundElements.length === 0) {
      console.log('❌ No interactive elements found. The app may not be rendering properly.');

      // Take a screenshot for debugging
      await page.screenshot({ path: 'no-elements-screenshot.png', fullPage: true });
      console.log('📸 Screenshot saved as: no-elements-screenshot.png');

      // Check page content
      const pageContent = await page.content();
      console.log(`\n📝 Page HTML length: ${pageContent.length}`);
      console.log('First 500 characters of page content:');
      console.log(pageContent.substring(0, 500));
    } else {
      console.log('\n✅ FOUND INTERACTIVE ELEMENTS:');
      foundElements.forEach(item => {
        console.log(`\n  🔹 ${item.selector}: ${item.count} elements`);
        item.examples.forEach((example, index) => {
          console.log(`    ${index + 1}. ${example}`);
        });
      });

      // Test 3: Button functionality testing
      console.log('\n🧪 TESTING BUTTON FUNCTIONALITY...');

      let workingButtons = 0;
      let failedButtons = 0;
      const testResults: Array<{selector: string, status: string, error?: string}> = [];

      // Test first few buttons to avoid excessive testing
      const elementsToTest = Math.min(totalElements, 10);
      let elementsTested = 0;

      for (const item of foundElements) {
        if (elementsTested >= elementsToTest) break;

        const elements = page.locator(item.selector);
        const count = await elements.count();
        const elementsToTestInGroup = Math.min(count, elementsToTest - elementsTested);

        for (let i = 0; i < elementsToTestInGroup; i++) {
          const element = elements.nth(i);
          const isVisible = await element.isVisible();

          if (isVisible && elementsTested < elementsToTest) {
            try {
              // Test click functionality
              const beforeUrl = page.url();
              await element.click();
              await page.waitForTimeout(1000);

              const afterUrl = page.url();
              const modalAppeared = await page.locator('[role="dialog"], .modal, [role="alert"]').isVisible({ timeout: 1000 });

              if (afterUrl !== beforeUrl || modalAppeared) {
                workingButtons++;
                testResults.push({
                  selector: item.selector,
                  status: 'WORKING'
                });
              } else {
                testResults.push({
                  selector: item.selector,
                  status: 'NO_RESPONSE'
                });
              }

              // Go back if navigation occurred
              if (afterUrl !== beforeUrl) {
                await page.goBack();
                await page.waitForTimeout(1000);
              }

              // Close modal if opened
              if (modalAppeared) {
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
              }

            } catch (error) {
              failedButtons++;
              testResults.push({
                selector: item.selector,
                status: 'ERROR',
                error: error instanceof Error ? error.message : String(error)
              });
            }

            elementsTested++;
          }
        }
      }

      // Test 4: Responsive testing
      console.log('\n📱 TESTING RESPONSIVE BEHAVIOR...');
      const responsiveResults: Array<{viewport: string, elements: number}> = [];

      for (const [deviceName, viewport] of Object.entries(TEST_CONFIG.viewports)) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(1000);

        let deviceElementCount = 0;
        for (const selector of buttonSelectors) {
          deviceElementCount += await page.locator(selector).count();
        }

        responsiveResults.push({
          viewport: deviceName,
          elements: deviceElementCount
        });

        console.log(`  ${deviceName} (${viewport.width}x${viewport.height}): ${deviceElementCount} elements`);
      }

      // Generate comprehensive report
      console.log('\n📋 COMPREHENSIVE TESTING REPORT:');
      console.log('=====================================');

      console.log(`\n📊 SUMMARY:`);
      console.log(`• Total interactive elements found: ${totalElements}`);
      console.log(`• Buttons tested: ${elementsTested}`);
      console.log(`• Working buttons: ${workingButtons}`);
      console.log(`• Failed buttons: ${failedButtons}`);
      console.log(`• Console errors: ${errors.length}`);

      if (errors.length > 0) {
        console.log(`\n❌ CONSOLE ERRORS:`);
        errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }

      console.log(`\n🧪 BUTTON TEST RESULTS:`);
      testResults.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.selector}: ${result.status}`);
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
      });

      console.log(`\n📱 RESPONSIVE TEST RESULTS:`);
      responsiveResults.forEach(result => {
        console.log(`  • ${result.viewport}: ${result.elements} interactive elements`);
      });

      // Final recommendations
      console.log(`\n🔧 RECOMMENDATIONS:`);
      if (totalElements === 0) {
        console.log('• The application is not rendering properly - check for JavaScript errors');
        console.log('• Ensure Supabase configuration is correct');
        console.log('• Check if authentication is blocking access');
      } else if (workingButtons < elementsTested) {
        console.log('• Some buttons are not responding - check event handlers');
        console.log('• Verify that button click handlers are properly attached');
      } else {
        console.log('✅ Button functionality appears to be working correctly');
      }

      // Save detailed report
      const reportContent = `
# FleetifyApp Button Testing Report

## Summary
- Total interactive elements: ${totalElements}
- Buttons tested: ${elementsTested}
- Working buttons: ${workingButtons} (${((workingButtons/elementsTested)*100).toFixed(1)}%)
- Failed buttons: ${failedButtons}
- Console errors: ${errors.length}

## Element Types Found
${foundElements.map(item => `
- ${item.selector}: ${item.count} elements
  Examples: ${item.examples.join(', ')}
`).join('\n')}

## Button Test Results
${testResults.map((result, index) =>
  `${index + 1}. ${result.selector}: ${result.status}${result.error ? ` - Error: ${result.error}` : ''}`
).join('\n')}

## Responsive Test Results
${responsiveResults.map(result =>
  `- ${result.viewport}: ${result.elements} elements`
).join('\n')}

## Console Errors
${errors.length > 0 ? errors.map((error, index) => `${index + 1}. ${error}`).join('\n') : 'No console errors detected'}

## Recommendations
${totalElements === 0 ?
  'The application is not rendering properly. Check for JavaScript errors and authentication issues.' :
  workingButtons < elementsTested ?
  'Some buttons are not responding. Check event handlers and React component mounting.' :
  'Button functionality appears to be working correctly.'
}
      `;

      const fs = require('fs');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportFile = `mock-dashboard-test-report-${timestamp}.md`;

      fs.writeFileSync(reportFile, reportContent);
      console.log(`\n📄 Detailed report saved to: ${reportFile}`);
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(console.error);