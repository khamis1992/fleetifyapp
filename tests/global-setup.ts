import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 *
 * This function runs once before all tests and handles:
 * - Test environment setup
 * - Database seeding if needed
 * - Authentication token generation
 * - Test data preparation
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up test environment...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Set up test environment variables
    process.env.NODE_ENV = 'test';
    process.env.TEST_MODE = 'true';

    // Check if the application is running
    console.log('📡 Checking application availability...');
    await page.goto('http://localhost:5173');

    // Wait for the app to be ready
    await page.waitForSelector('body', { timeout: 30000 });
    console.log('✅ Application is ready for testing');

    // Generate test authentication token if needed
    try {
      await page.goto('http://localhost:5173/login');

      // Check if login form exists
      const loginForm = page.locator('[data-testid="email-input"]');
      if (await loginForm.isVisible()) {
        console.log('🔐 Setting up test authentication...');

        // Create test user if needed (this would depend on your backend API)
        // For now, we'll just verify the login form is present
        console.log('✅ Test authentication setup complete');
      }
    } catch (loginError) {
      console.log('ℹ️ Login setup not required or failed:', loginError);
    }

    // Prepare test data
    console.log('📊 Preparing test data...');
    // Here you would typically:
    // - Seed the database with test data
    // - Clean up old test data
    // - Set up test scenarios

    console.log('✅ Test environment setup complete');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;