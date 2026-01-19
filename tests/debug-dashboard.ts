import { chromium } from 'playwright';

/**
 * Debug script to understand why dashboard is empty
 */

async function debugDashboard() {
  console.log('🐛 Debugging FleetifyApp Dashboard\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track network requests
  const requests: any[] = [];
  const responses: any[] = [];

  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers()
    });
  });

  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
      headers: response.headers()
    });
  });

  try {
    // Navigate to the application
    console.log('🌐 Navigating to application...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });

    console.log('📄 Page Title:', await page.title());
    console.log('🔗 Current URL:', page.url());

    // Get page content
    console.log('\n📝 Page HTML Content (first 1000 chars):');
    const htmlContent = await page.content();
    console.log(htmlContent.substring(0, 1000));

    console.log('\n📝 Full body content:');
    const bodyContent = await page.textContent('body');
    console.log(bodyContent || 'No body content found');

    // Check for React root
    console.log('\n🔍 Checking React app structure:');
    const reactRoot = await page.locator('#root').count();
    console.log(`React root element found: ${reactRoot > 0}`);

    if (reactRoot > 0) {
      const rootContent = await page.locator('#root').textContent();
      console.log(`Root content: ${rootContent}`);

      // Check for error boundaries or loading states
      const errorBoundary = await page.locator('[data-testid*="error"], .error, [class*="error"]').count();
      console.log(`Error boundaries found: ${errorBoundary}`);

      const loadingStates = await page.locator('.loading, [data-loading], .spinner, [class*="loading"]').count();
      console.log(`Loading states found: ${loadingStates}`);
    }

    // Check if we're on a specific route
    console.log('\n🛣️ Route Analysis:');
    const path = new URL(page.url()).pathname;
    console.log(`Current path: ${path}`);

    // Check if we need to try different routes
    const routes = ['/dashboard', '/login', '/auth', '/contracts', '/vehicles'];
    for (const route of routes) {
      console.log(`\n🔍 Trying route: ${route}`);
      try {
        await page.goto(`http://localhost:8080${route}`, { waitUntil: 'networkidle', timeout: 10000 });
        const routeContent = await page.textContent('body');
        console.log(`Content length: ${routeContent?.length || 0}`);

        if (routeContent && routeContent.length > 100) {
          console.log(`First 200 chars: ${routeContent.substring(0, 200)}`);
        }

        // Look for buttons on this route
        const buttonCount = await page.locator('button, [role="button"], a[href]').count();
        console.log(`Interactive elements found: ${buttonCount}`);

        if (buttonCount > 0) {
          console.log(`✅ Route ${route} has interactive content!`);
          break;
        }
      } catch (error) {
        console.log(`❌ Failed to load route ${route}: ${error}`);
      }
    }

    // Network request analysis
    console.log('\n🌐 Network Request Analysis:');
    console.log(`Total requests made: ${requests.length}`);
    console.log(`Total responses received: ${responses.length}`);

    // Show API requests
    const apiRequests = requests.filter(req => req.url.includes('/api/'));
    console.log(`API requests: ${apiRequests.length}`);
    apiRequests.forEach((req, index) => {
      console.log(`  ${index + 1}. ${req.method} ${req.url}`);
    });

    // Show failed requests
    const failedResponses = responses.filter(res => res.status >= 400);
    if (failedResponses.length > 0) {
      console.log(`\n❌ Failed requests: ${failedResponses.length}`);
      failedResponses.forEach((res, index) => {
        console.log(`  ${index + 1}. ${res.status} ${res.url}`);
      });
    }

    // Console log monitoring
    console.log('\n🔍 Console Logs:');
    const consoleMessages: string[] = [];

    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Wait a bit to collect console messages
    await page.waitForTimeout(5000);

    if (consoleMessages.length > 0) {
      consoleMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg}`);
      });
    } else {
      console.log('  No console messages detected');
    }

    // Check for environment variables or missing data
    console.log('\n🔧 Environment Check:');
    try {
      const envCheck = await page.evaluate(() => {
        // Try to access environment variables
        const envVars = {
          VITE_SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL,
          VITE_SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
          NODE_ENV: import.meta.env?.NODE_ENV,
          DEV: import.meta.env?.DEV,
          PROD: import.meta.env?.PROD,
        };

        // Check for React app state
        const reactApp = {
          rootExists: !!document.getElementById('root'),
          bodyChildren: document.body.children.length,
          hasReactContent: document.querySelector('#root > *') !== null
        };

        return { envVars, reactApp };
      });

      console.log('Environment variables:', envCheck.envVars);
      console.log('React app state:', envCheck.reactApp);

    } catch (error) {
      console.log('Could not evaluate environment:', error);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

debugDashboard().catch(console.error);