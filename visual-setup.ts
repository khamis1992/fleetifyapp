/**
 * Global Setup for Visual Regression Testing
 * Prepares the environment for consistent visual testing
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

async function globalSetup(config: FullConfig) {
  console.log('🎨 Setting up visual regression testing environment...');

  // Ensure snapshot directory exists
  const snapshotDir = path.join(__dirname, '__snapshots__');
  try {
    await fs.access(snapshotDir);
  } catch {
    await fs.mkdir(snapshotDir, { recursive: true });
  }

  // Launch a browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  try {
    // Set up consistent environment variables
    process.env.VISUAL_TESTING = 'true';
    process.env.NODE_ENV = 'test';

    // Create a test user for visual tests
    const page = await context.newPage();

    // Navigate to login page
    await page.goto(`${process.env.BASE_URL || 'http://localhost:5173'}/login`);

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');

    // Take a baseline screenshot of the login page
    await page.screenshot({
      path: path.join(snapshotDir, 'baseline-login.png'),
      fullPage: true,
    });

    console.log('✅ Visual regression environment setup complete');
  } catch (error) {
    console.error('❌ Visual regression setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;