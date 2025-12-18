/**
 * Cleanup Test for Visual Regression
 * Cleans up test data and state after visual testing
 */

import { test, expect } from '@playwright/test';

test.describe('Visual Cleanup', () => {
  test('cleanup test data', async ({ page }) => {
    // Navigate to settings to clean up
    await page.goto('/settings');

    // Clear test data if needed
    await page.evaluate(() => {
      localStorage.removeItem('test-state');
      sessionStorage.clear();
    });

    // Verify cleanup
    const testData = await page.evaluate(() => localStorage.getItem('test-state'));
    expect(testData).toBeNull();
  });
});