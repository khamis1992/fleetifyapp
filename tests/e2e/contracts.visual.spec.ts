/**
 * Visual Regression Tests for Contracts
 * Ensures contract-related UI components remain consistent
 */

import { test, expect } from '@playwright/test';

test.describe('Contracts Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@fleetify.com');
    await page.fill('input[type="password"]', 'Test123456!@#$%^&*()_+-=[]{}|;:,.<>?');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('contracts list view', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForLoadState('networkidle');

    // Test full contracts page
    await expect(page).toHaveScreenshot('contracts-list.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Test contract cards
    const contractCards = page.locator('[data-testid="contract-card"]');
    await expect(contractCards.first()).toBeVisible();
    await expect(contractCards.first()).toHaveScreenshot('contract-card.png');
  });

  test('contract creation form', async ({ page }) => {
    await page.goto('/contracts');

    // Click create button
    await page.click('button:has-text("إنشاء عقد جديد")');
    await page.waitForSelector('[data-testid="contract-form"]');

    // Test form layout
    await expect(page).toHaveScreenshot('contract-form.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Test form fields
    const formFields = page.locator('[data-testid="form-field"]');
    await expect(formFields.first()).toBeVisible();
    await expect(formFields.first()).toHaveScreenshot('form-field.png');
  });

  test('contract details view', async ({ page }) => {
    await page.goto('/contracts');

    // Open first contract
    await page.locator('[data-testid="contract-card"]').first().click();
    await page.waitForURL(/\/contracts\/[^\\/]+/);
    await page.waitForLoadState('networkidle');

    // Test contract details
    await expect(page).toHaveScreenshot('contract-details.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Test contract header
    const header = page.locator('[data-testid="contract-header"]');
    await expect(header).toBeVisible();
    await expect(header).toHaveScreenshot('contract-header.png');
  });

  test('contract status badges', async ({ page }) => {
    await page.goto('/contracts');

    // Find contracts with different statuses
    const statusBadges = page.locator('[data-testid="status-badge"]');

    if (await statusBadges.count() > 0) {
      // Test each status badge type
      const statuses = ['نشط', 'ملغي', 'معلق', 'منتهي'];

      for (const status of statuses) {
        const badge = page.locator(`[data-testid="status-badge"]:has-text("${status}")`);
        if (await badge.count() > 0) {
          await expect(badge.first()).toHaveScreenshot(`status-${status}.png`);
        }
      }
    }
  });

  test('contract export dialog', async ({ page }) => {
    await page.goto('/contracts');

    // Click export button
    await page.click('button:has-text("تصدير")');
    await page.waitForSelector('[data-testid="export-dialog"]');

    // Test export dialog
    await expect(page.locator('[data-testid="export-dialog"]')).toHaveScreenshot('export-dialog.png', {
      animations: 'disabled',
    });

    // Test export options
    const exportOptions = page.locator('[data-testid="export-option"]');
    if (await exportOptions.count() > 0) {
      await expect(exportOptions.first()).toHaveScreenshot('export-option.png');
    }
  });

  test('contract search and filters', async ({ page }) => {
    await page.goto('/contracts');

    // Test search bar
    const searchBar = page.locator('[data-testid="search-bar"]');
    await expect(searchBar).toBeVisible();
    await expect(searchBar).toHaveScreenshot('search-bar.png');

    // Test filter dropdown
    await page.click('[data-testid="filter-button"]');
    await page.waitForSelector('[data-testid="filter-dropdown"]');
    await expect(page.locator('[data-testid="filter-dropdown"]')).toHaveScreenshot('filter-dropdown.png', {
      animations: 'disabled',
    });
  });

  test('contract pagination', async ({ page }) => {
    await page.goto('/contracts');

    // Check if pagination exists
    const pagination = page.locator('[data-testid="pagination"]');

    if (await pagination.isVisible()) {
      await expect(pagination).toHaveScreenshot('pagination.png');

      // Test pagination states
      const pageButtons = pagination.locator('button');
      if (await pageButtons.count() > 0) {
        await expect(pageButtons.first()).toHaveScreenshot('page-button.png');
      }
    }
  });

  test('contract table view', async ({ page }) => {
    await page.goto('/contracts');

    // Switch to table view if available
    const tableViewBtn = page.locator('button:has-text("جدول")');
    if (await tableViewBtn.isVisible()) {
      await tableViewBtn.click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('contracts-table.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('contract empty state', async ({ page }) => {
    // Mock empty contracts response
    await page.route('**/api/contracts*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ contracts: [], total: 0 }),
      });
    });

    await page.goto('/contracts');
    await page.waitForLoadState('networkidle');

    // Test empty state
    const emptyState = page.locator('[data-testid="empty-state"]');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toHaveScreenshot('contracts-empty.png', {
        animations: 'disabled',
      });
    }
  });

  test('contract error state', async ({ page }) => {
    // Mock error response
    await page.route('**/api/contracts*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to load contracts',
        }),
      });
    });

    await page.goto('/contracts');
    await page.waitForLoadState('networkidle');

    // Test error state
    const errorState = page.locator('[data-testid="error-state"]');
    if (await errorState.isVisible()) {
      await expect(errorState).toHaveScreenshot('contracts-error.png', {
        animations: 'disabled',
      });
    }
  });

  test('RTL layout for contracts', async ({ page }) => {
    // Ensure RTL layout
    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    });

    await page.goto('/contracts');
    await page.waitForLoadState('networkidle');

    // Test RTL layout
    await expect(page).toHaveScreenshot('contracts-rtl.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});