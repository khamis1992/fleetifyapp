/**
 * Setup Test for Visual Regression
 * Ensures the application is in a consistent state for visual testing
 */

import { test, expect } from '@playwright/test';

test.describe('Visual Setup', () => {
  test('setup application state', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the app to be fully loaded
    await page.waitForLoadState('networkidle');

    // Set consistent theme
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('language', 'ar');
      localStorage.setItem('fontSize', 'medium');
    });

    // Reload to apply settings
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify application is ready
    const appElement = page.locator('[data-testid="app-root"]');
    await expect(appElement).toBeVisible();

    // Take a reference screenshot
    await expect(page).toHaveScreenshot('app-ready.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});