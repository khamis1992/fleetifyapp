/**
 * Visual Regression Tests for Dashboard
 * Ensures dashboard UI remains consistent across changes
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test credentials
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@fleetify.com');
    await page.fill('input[type="password"]', 'Test123456!@#$%^&*()_+-=[]{}|;:,.<>?');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('dashboard layout matches baseline', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="dashboard-container"]');

    // Take full page screenshot
    await expect(page).toHaveScreenshot('dashboard-full.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Test specific sections
    const headerSection = page.locator('[data-testid="dashboard-header"]');
    await expect(headerSection).toBeVisible();
    await expect(headerSection).toHaveScreenshot('dashboard-header.png');

    const widgetsSection = page.locator('[data-testid="dashboard-widgets"]');
    await expect(widgetsSection).toBeVisible();
    await expect(widgetsSection).toHaveScreenshot('dashboard-widgets.png', {
      animations: 'disabled',
    });
  });

  test('dashboard responsive layout', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500); // Allow layout to adjust

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dashboard widgets visual consistency', async ({ page }) => {
    // Test each widget individually
    const widgets = [
      'contracts-widget',
      'vehicles-widget',
      'customers-widget',
      'revenue-widget',
    ];

    for (const widget of widgets) {
      const widgetElement = page.locator(`[data-testid="${widget}"]`);
      await expect(widgetElement).toBeVisible();
      await expect(widgetElement).toHaveScreenshot(`${widget}.png`, {
        animations: 'disabled',
      });
    }
  });

  test('dashboard dark mode', async ({ page }) => {
    // Switch to dark mode
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(500); // Allow theme transition

    // Test dark mode screenshots
    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dashboard loading states', async ({ page }) => {
    // Simulate loading state
    await page.route('**/api/dashboard/stats', (route) => {
      // Delay response to see loading state
      setTimeout(() => route.continue(), 2000);
    });

    await page.reload();

    // Capture loading state
    const loadingElements = page.locator('[data-testid="loading-skeleton"]');
    await expect(loadingElements.first()).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-loading.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dashboard empty states', async ({ page }) => {
    // Mock empty data
    await page.route('**/api/dashboard/stats', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contracts: [],
          vehicles: [],
          customers: [],
          revenue: 0,
        }),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Test empty state visuals
    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toHaveScreenshot('dashboard-empty.png', {
      animations: 'disabled',
    });
  });

  test('dashboard error states', async ({ page }) => {
    // Mock error response
    await page.route('**/api/dashboard/stats', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to load dashboard data',
        }),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Test error state visuals
    const errorState = page.locator('[data-testid="error-state"]');
    await expect(errorState).toBeVisible();
    await expect(errorState).toHaveScreenshot('dashboard-error.png', {
      animations: 'disabled',
    });
  });
});