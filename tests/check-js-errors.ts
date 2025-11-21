import { chromium } from 'playwright';

/**
 * Check for JavaScript errors preventing app from rendering
 */

async function checkJSErrors() {
  console.log('🔍 Checking for JavaScript errors in FleetifyApp\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect all console messages
  const consoleMessages: Array<{type: string, text: string, timestamp: Date}> = [];
  const pageErrors: Array<{message: string, timestamp: Date}> = [];

  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date()
    });
  });

  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      timestamp: new Date()
    });
  });

  try {
    // Navigate to the application
    await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });

    console.log('📄 Page loaded, waiting for potential errors...');

    // Wait longer to catch any delayed errors
    await page.waitForTimeout(10000);

    // Check if React app has rendered anything
    const rootElement = await page.locator('#root');
    const rootContent = await rootElement.innerHTML();
    const hasChildren = await rootElement.evaluate(el => el.children.length > 0);

    console.log(`\n📊 React App State:`);
    console.log(`Root element exists: ${await rootElement.count() > 0}`);
    console.log(`Root has children: ${hasChildren}`);
    console.log(`Root content length: ${rootContent.length}`);

    if (!hasChildren) {
      console.log('\n🚨 React app is NOT rendering!');
    }

    // Show console messages
    console.log(`\n📝 Console Messages (${consoleMessages.length} total):`);
    if (consoleMessages.length === 0) {
      console.log('  No console messages detected');
    } else {
      consoleMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.type}] ${msg.text}`);
      });
    }

    // Show page errors
    console.log(`\n❌ Page Errors (${pageErrors.length} total):`);
    if (pageErrors.length === 0) {
      console.log('  No page errors detected');
    } else {
      pageErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.message}`);
      });
    }

    // Try to check for specific common React errors
    console.log('\n🔍 Checking for specific React errors...');

    try {
      // Check if React is loaded
      const reactLoaded = await page.evaluate(() => {
        return typeof window.React !== 'undefined' ||
               typeof window.ReactDOM !== 'undefined' ||
               document.querySelector('script[src*="react"]') !== null;
      });

      console.log(`React library loaded: ${reactLoaded}`);

      if (reactLoaded) {
        // Try to check React error boundaries
        const errorBoundaryCheck = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('[class*="error"], [data-testid*="error"]');
          return Array.from(errorElements).map(el => ({
            text: el.textContent,
            classes: el.className,
            testId: el.getAttribute('data-testid')
          }));
        });

        console.log('Error boundaries found:', errorBoundaryCheck.length);
        errorBoundaryCheck.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.text} (${error.testId || error.classes})`);
        });
      }

    } catch (error) {
      console.log('Could not check React state:', error);
    }

    // Check for any network issues that might prevent loading
    console.log('\n🌐 Checking network resources...');

    const resources = await page.evaluate(() => {
      const images = Array.from(document.images).map(img => ({
        src: img.src,
        loaded: img.complete && img.naturalHeight !== 0
      }));

      const scripts = Array.from(document.scripts).map(script => ({
        src: script.src,
        loaded: true // If script tag exists, it was loaded
      }));

      return { images, scripts };
    });

    console.log(`Images loaded: ${resources.images.filter(img => img.loaded).length}/${resources.images.length}`);
    console.log(`Scripts loaded: ${resources.scripts.length}`);

    // Check for missing resources
    const failedImages = resources.images.filter(img => !img.loaded);
    if (failedImages.length > 0) {
      console.log('Failed images:', failedImages.map(img => img.src));
    }

    // Final screenshot for visual debugging
    await page.screenshot({ path: 'js-error-debug-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot saved as: js-error-debug-screenshot.png');

  } catch (error) {
    console.error('❌ Error checking failed:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

checkJSErrors().catch(console.error);