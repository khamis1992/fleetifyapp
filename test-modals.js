import { chromium } from 'playwright';

async function testModalsAndInteractions() {
  console.log('🎯 Starting comprehensive modal and interactive elements testing...');

  const browser = await chromium.launch({
    headless: false, // Set to true for headless mode
    slowMo: 1000 // Slow down actions for better visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // Track errors
  const errors = [];
  const modalTests = [];
  const interactiveElements = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({
        type: 'console_error',
        message: msg.text(),
        location: msg.location()
      });
    }
  });

  page.on('pageerror', (error) => {
    errors.push({
      type: 'page_error',
      message: error.message,
      stack: error.stack
    });
  });

  try {
    // Navigate to the app
    console.log('📱 Navigating to fleetifyapp...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Give time for the app to load
    await page.waitForTimeout(3000);

    // Test 1: Check if we can see the main app
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);

    // Look for auth page or main dashboard
    const authPage = await page.locator('text=Login').isVisible().catch(() => false);
    const mainApp = await page.locator('[data-testid="dashboard"], .dashboard, main').isVisible().catch(() => false);

    if (authPage) {
      console.log('🔐 Auth page detected - looking for demo/trial options...');
      // Try demo trial button
      const demoButton = page.locator('text=Demo Trial, text=demo, text=trial').first();
      if (await demoButton.isVisible()) {
        console.log('🎮 Clicking demo trial button...');
        await demoButton.click();
        await page.waitForTimeout(2000);
      }
    } else if (mainApp) {
      console.log('🏠 Main app detected - proceeding with modal testing...');
    } else {
      console.log('⚠️ Could not determine page state, proceeding with general testing...');
    }

    // Test 2: Look for common modal triggers
    console.log('🔍 Scanning for modal triggers...');

    const modalTriggers = [
      'button:has-text("Add")',
      'button:has-text("Edit")',
      'button:has-text("Delete")',
      'button:has-text("Create")',
      'button:has-text("New")',
      'button:has-text("Upload")',
      'button:has-text("Export")',
      'button:has-text("Settings")',
      'button:has-text("Help")',
      'button:has-text("Info")',
      'button[aria-haspopup="dialog"]',
      'button[aria-haspopup="menu"]',
      'button[aria-expanded]',
      '[data-testid*="modal"]',
      '[data-testid*="dialog"]',
      '[data-testid*="button"]'
    ];

    let foundButtons = [];
    for (const selector of modalTriggers) {
      try {
        const buttons = await page.locator(selector).all();
        if (buttons.length > 0) {
          console.log(`✅ Found ${buttons.length} elements matching: ${selector}`);
          foundButtons.push(...buttons);
        }
      } catch (err) {
        console.log(`❌ Error with selector ${selector}: ${err.message}`);
      }
    }

    console.log(`📊 Total interactive buttons found: ${foundButtons.length}`);

    // Test 3: Try clicking on safe buttons first
    const safeButtons = [
      'button:has-text("Help")',
      'button:has-text("Info")',
      'button:has-text("Settings")',
      'button[aria-label*="help"]',
      'button[aria-label*="info"]',
      '[title*="help"]',
      '[title*="info"]'
    ];

    for (const selector of safeButtons) {
      try {
        const buttons = await page.locator(selector).all();
        for (let i = 0; i < Math.min(buttons.length, 3); i++) { // Test max 3 of each type
          const button = buttons[i];
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();

          if (isVisible && isEnabled) {
            console.log(`🖱️ Testing button: ${selector} #${i + 1}`);

            // Get button text for logging
            const buttonText = await button.textContent();
            console.log(`   Text: "${buttonText}"`);

            // Click the button
            await button.click();
            await page.waitForTimeout(1000);

            // Look for modal/dialog that might have opened
            const modalVisible = await page.locator('[role="dialog"], .modal, .dialog').isVisible().catch(() => false);
            const alertDialogVisible = await page.locator('[role="alertdialog"]').isVisible().catch(() => false);

            if (modalVisible || alertDialogVisible) {
              console.log('   🎉 Modal opened successfully!');

              modalTests.push({
                trigger: selector,
                buttonText: buttonText,
                modalOpened: true,
                timestamp: new Date().toISOString()
              });

              // Test modal close functionality
              const closeButton = page.locator('button[aria-label="Close"], button:has-text("Close"), button:has-text("Cancel"), button[aria-label="Cancel"]').first();
              const escapeKey = page.keyboard.press('Escape');

              if (await closeButton.isVisible()) {
                console.log('   ❌ Clicking close button...');
                await closeButton.click();
              } else {
                console.log('   ⌨️  Pressing Escape key...');
                await page.keyboard.press('Escape');
              }

              await page.waitForTimeout(500);

              // Check if modal closed
              const modalStillVisible = await page.locator('[role="dialog"], .modal, .dialog').isVisible().catch(() => false);
              if (!modalStillVisible) {
                console.log('   ✅ Modal closed successfully');
              } else {
                console.log('   ⚠️ Modal may still be open');
              }
            } else {
              console.log('   ℹ️ No modal detected after click');
            }
          }
        }
      } catch (err) {
        console.log(`❌ Error testing ${selector}: ${err.message}`);
      }
    }

    // Test 4: Navigation to specific pages for more testing
    console.log('🧭 Attempting navigation to key pages...');

    const keyRoutes = [
      '/dashboard',
      '/contracts',
      '/customers',
      '/fleet',
      '/finance'
    ];

    for (const route of keyRoutes) {
      try {
        console.log(`📍 Trying to navigate to: ${route}`);
        await page.goto(`http://localhost:5173${route}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Quick scan for buttons on this page
        const pageButtons = await page.locator('button').all();
        console.log(`   Found ${pageButtons.length} buttons on ${route}`);

        interactiveElements.push({
          route: route,
          buttonCount: pageButtons.length,
          timestamp: new Date().toISOString()
        });

      } catch (err) {
        console.log(`❌ Error navigating to ${route}: ${err.message}`);
        errors.push({
          type: 'navigation_error',
          route: route,
          message: err.message
        });
      }
    }

    // Test 5: Keyboard navigation
    console.log('⌨️ Testing keyboard navigation...');
    try {
      await page.goto('http://localhost:5173/dashboard');
      await page.waitForTimeout(2000);

      // Tab through elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);

        const focusedElement = await page.evaluate(() => {
          const element = document.activeElement;
          return {
            tagName: element.tagName,
            type: element.type,
            className: element.className,
            textContent: element.textContent?.substring(0, 50)
          };
        });

        console.log(`   Tab ${i + 1}: ${focusedElement.tagName} - ${focusedElement.textContent || focusedElement.type}`);
      }

      // Test Escape key
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

    } catch (err) {
      console.log(`❌ Keyboard navigation test failed: ${err.message}`);
    }

  } catch (error) {
    console.error('💥 Critical error during testing:', error);
    errors.push({
      type: 'critical_error',
      message: error.message,
      stack: error.stack
    });
  }

  // Generate report
  console.log('\n📊 TESTING REPORT');
  console.log('='.repeat(50));
  console.log(`✅ Modals tested: ${modalTests.length}`);
  console.log(`🔘 Interactive elements found: ${interactiveElements.reduce((sum, item) => sum + item.buttonCount, 0)}`);
  console.log(`❌ Errors encountered: ${errors.length}`);

  if (modalTests.length > 0) {
    console.log('\n🎉 SUCCESSFUL MODAL TESTS:');
    modalTests.forEach((test, index) => {
      console.log(`   ${index + 1}. ${test.trigger} - "${test.buttonText}" - Modal: ${test.modalOpened ? '✅' : '❌'}`);
    });
  }

  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.type}: ${error.message}`);
    });
  }

  // Take final screenshot
  try {
    await page.screenshot({ path: 'modal-test-final-state.png', fullPage: true });
    console.log('📸 Final screenshot saved as modal-test-final-state.png');
  } catch (err) {
    console.log('❌ Could not save screenshot:', err.message);
  }

  await browser.close();
  console.log('\n🏁 Testing completed!');

  return {
    modalTests,
    interactiveElements,
    errors
  };
}

// Run the test
testModalsAndInteractions().catch(console.error);