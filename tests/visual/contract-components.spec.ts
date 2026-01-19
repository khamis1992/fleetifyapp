/**
 * Contract Components Visual Regression Tests
 *
 * Visual regression tests for contract-related UI components to ensure
 * consistent appearance across different screen sizes, themes, and states.
 */

import { test, expect } from '@playwright/test';

test.describe('Contract Components Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable visual testing mode
    await page.goto('/login');
    await page.setViewportSize({ width: 1280, height: 720 });

    // Login for authenticated components
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should render contract card component correctly', async ({ page }) => {
    await page.goto('/contracts');

    // Wait for contract cards to load
    await page.waitForSelector('[data-testid="contract-card"]');

    // Take screenshot of contract card
    await expect(page.locator('[data-testid="contract-card"]').first()).toHaveScreenshot('contract-card-default.png', {
      animations: 'disabled',
      caret: 'hide',
    });
  });

  test('should render contract card in different states', async ({ page }) => {
    await page.goto('/contracts');

    // Test different contract states
    const contractStates = ['active', 'expired', 'draft', 'cancelled', 'suspended'];

    for (const state of contractStates) {
      // Filter by state
      await page.click('[data-testid="status-filter"]');
      await page.click(`[data-testid="status-filter-${state}"]`);

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Take screenshot
      await expect(page.locator('[data-testid="contract-card"]').first()).toHaveScreenshot(
        `contract-card-${state}.png`,
        {
          animations: 'disabled',
          caret: 'hide',
        }
      );
    }
  });

  test('should render contract creation form correctly', async ({ page }) => {
    await page.goto('/contracts/create');

    // Wait for form to load
    await page.waitForSelector('[data-testid="contract-creation-form"]');

    // Screenshot of empty form
    await expect(page.locator('[data-testid="contract-creation-form"]')).toHaveScreenshot(
      'contract-creation-form-empty.png',
      {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      }
    );

    // Fill form with test data
    await page.fill('[data-testid="agreement-number"]', 'AGR-VISUAL-TEST-001');
    await page.fill('[data-testid="monthly-rate"]', '1500');
    await page.fill('[data-testid="deposit-amount"]', '3000');
    await page.selectOption('[data-testid="contract-type"]', 'rental');

    // Screenshot of filled form
    await expect(page.locator('[data-testid="contract-creation-form"]')).toHaveScreenshot(
      'contract-creation-form-filled.png',
      {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract details page correctly', async ({ page }) => {
    await page.goto('/contracts/AGR-VISUAL-TEST-001');

    // Wait for page to load
    await page.waitForSelector('[data-testid="contract-details"]');

    // Full page screenshot
    await expect(page.locator('[data-testid="contract-details"]')).toHaveScreenshot(
      'contract-details-full.png',
      {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract details tabs correctly', async ({ page }) => {
    await page.goto('/contracts/AGR-VISUAL-TEST-001');

    const tabs = ['overview', 'payments', 'documents', 'history', 'analytics'];

    for (const tab of tabs) {
      await page.click(`[data-testid="${tab}-tab"]`);
      await page.waitForTimeout(500); // Wait for tab content to load

      await expect(page.locator('[data-testid="contract-details-content"]')).toHaveScreenshot(
        `contract-tab-${tab}.png`,
        {
          animations: 'disabled',
          caret: 'hide',
        }
      );
    }
  });

  test('should render contract payment history correctly', async ({ page }) => {
    await page.goto('/contracts/AGR-VISUAL-TEST-001');
    await page.click('[data-testid="payments-tab"]');

    // Wait for payment history to load
    await page.waitForSelector('[data-testid="payment-history"]');

    // Screenshot of payment history
    await expect(page.locator('[data-testid="payment-history"]')).toHaveScreenshot(
      'contract-payment-history.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract documents section correctly', async ({ page }) => {
    await page.goto('/contracts/AGR-VISUAL-TEST-001');
    await page.click('[data-testid="documents-tab"]');

    // Wait for documents to load
    await page.waitForSelector('[data-testid="contract-documents"]');

    // Screenshot of documents section
    await expect(page.locator('[data-testid="contract-documents"]')).toHaveScreenshot(
      'contract-documents.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract analytics charts correctly', async ({ page }) => {
    await page.goto('/contracts/AGR-VISUAL-TEST-001');
    await page.click('[data-testid="analytics-tab"]');

    // Wait for charts to render
    await page.waitForSelector('[data-testid="contract-analytics-charts"]');

    // Screenshot of analytics section
    await expect(page.locator('[data-testid="contract-analytics-charts"]')).toHaveScreenshot(
      'contract-analytics-charts.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should handle responsive design correctly', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 },  // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1280, height: 720 }, // Desktop
      { width: 1920, height: 1080 }, // Large desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/contracts');
      await page.waitForSelector('[data-testid="contracts-list"]');

      await expect(page.locator('[data-testid="contracts-list"]')).toHaveScreenshot(
        `contracts-list-${viewport.width}x${viewport.height}.png`,
        {
          fullPage: true,
          animations: 'disabled',
          caret: 'hide',
        }
      );
    }
  });

  test('should render contract filters correctly', async ({ page }) => {
    await page.goto('/contracts');

    // Screenshot of filters in default state
    await expect(page.locator('[data-testid="contract-filters"]')).toHaveScreenshot(
      'contract-filters-default.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );

    // Apply filters and screenshot
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="status-filter-active"]');
    await page.click('[data-testid="type-filter"]');
    await page.click('[data-testid="type-filter-rental"]');

    await expect(page.locator('[data-testid="contract-filters"]')).toHaveScreenshot(
      'contract-filters-applied.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract search correctly', async ({ page }) => {
    await page.goto('/contracts');

    // Screenshot of search input
    await expect(page.locator('[data-testid="contract-search-container"]')).toHaveScreenshot(
      'contract-search-empty.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );

    // Fill search and screenshot
    await page.fill('[data-testid="contract-search"]', 'AGR-VISUAL');

    await expect(page.locator('[data-testid="contract-search-container"]')).toHaveScreenshot(
      'contract-search-filled.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );

    // Screenshot of search results
    await expect(page.locator('[data-testid="contracts-list"]')).toHaveScreenshot(
      'contract-search-results.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract status badges correctly', async ({ page }) => {
    await page.goto('/contracts');

    // Find all status badges and screenshot them
    const statusBadges = await page.locator('[data-testid="contract-status-badge"]').all();

    for (let i = 0; i < statusBadges.length; i++) {
      await expect(statusBadges[i]).toHaveScreenshot(
        `contract-status-badge-${i}.png`,
        {
          animations: 'disabled',
          caret: 'hide',
        }
      );
    }
  });

  test('should render contract action buttons correctly', async ({ page }) => {
    await page.goto('/contracts');

    // Hover over contract card to reveal actions
    await page.hover('[data-testid="contract-card"]').first();

    // Screenshot of action buttons
    await expect(page.locator('[data-testid="contract-actions"]').first()).toHaveScreenshot(
      'contract-actions-hover.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract forms validation states correctly', async ({ page }) => {
    await page.goto('/contracts/create');

    // Try to submit empty form to trigger validation
    await page.click('[data-testid="create-contract-submit"]');

    // Screenshot of validation errors
    await expect(page.locator('[data-testid="contract-creation-form"]')).toHaveScreenshot(
      'contract-form-validation-errors.png',
      {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      }
    );

    // Fill with invalid data to trigger specific validation
    await page.fill('[data-testid="agreement-number"]', '');
    await page.fill('[data-testid="monthly-rate"]', '-100');
    await page.click('[data-testid="create-contract-submit"]');

    await expect(page.locator('[data-testid="contract-creation-form"]')).toHaveScreenshot(
      'contract-form-specific-errors.png',
      {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract loading states correctly', async ({ page }) => {
    // Simulate slow network to see loading states
    await page.route('**/api/contracts', route => {
      setTimeout(() => route.fulfill({ status: 200 }), 2000);
    });

    await page.goto('/contracts');

    // Screenshot of loading state
    await expect(page.locator('[data-testid="contracts-loading"]')).toHaveScreenshot(
      'contracts-loading.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract error states correctly', async ({ page }) => {
    // Mock API error
    await page.route('**/api/contracts', route => {
      route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await page.goto('/contracts');

    // Screenshot of error state
    await expect(page.locator('[data-testid="contracts-error"]')).toHaveScreenshot(
      'contracts-error.png',
      {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract empty state correctly', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/contracts', route => {
      route.fulfill({ status: 200, body: '[]' });
    });

    await page.goto('/contracts');

    // Screenshot of empty state
    await expect(page.locator('[data-testid="contracts-empty"]')).toHaveScreenshot(
      'contracts-empty.png',
      {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract pagination correctly', async ({ page }) => {
    await page.goto('/contracts');

    // Look for pagination component
    const pagination = page.locator('[data-testid="contracts-pagination"]');
    if (await pagination.isVisible()) {
      await expect(pagination).toHaveScreenshot(
        'contracts-pagination.png',
        {
          animations: 'disabled',
          caret: 'hide',
        }
      );
    }
  });

  test('should render contract bulk actions correctly', async ({ page }) => {
    await page.goto('/contracts');

    // Select some contracts to trigger bulk actions
    await page.check('[data-testid="select-contract-AGR-VISUAL-001"]');
    await page.check('[data-testid="select-contract-AGR-VISUAL-002"]');

    // Screenshot of bulk actions bar
    await expect(page.locator('[data-testid="bulk-actions-bar"]')).toHaveScreenshot(
      'contract-bulk-actions.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract export dialog correctly', async ({ page }) => {
    await page.goto('/contracts');

    // Click export button
    await page.click('[data-testid="export-contracts-button"]');

    // Wait for dialog to open
    await page.waitForSelector('[data-testid="export-contracts-dialog"]');

    // Screenshot of export dialog
    await expect(page.locator('[data-testid="export-contracts-dialog"]')).toHaveScreenshot(
      'contracts-export-dialog.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract cancellation dialog correctly', async ({ page }) => {
    await page.goto('/contracts/AGR-VISUAL-TEST-001');

    // Click cancel button
    await page.click('[data-testid="cancel-contract-button"]');

    // Wait for dialog to open
    await page.waitForSelector('[data-testid="cancel-contract-dialog"]');

    // Screenshot of cancellation dialog
    await expect(page.locator('[data-testid="cancel-contract-dialog"]')).toHaveScreenshot(
      'contract-cancellation-dialog.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('should render contract renewal dialog correctly', async ({ page }) => {
    await page.goto('/contracts/AGR-VISUAL-TEST-001');

    // Click renew button
    await page.click('[data-testid="renew-contract-button"]');

    // Wait for dialog to open
    await page.waitForSelector('[data-testid="renew-contract-dialog"]');

    // Screenshot of renewal dialog
    await expect(page.locator('[data-testid="renew-contract-dialog"]')).toHaveScreenshot(
      'contract-renewal-dialog.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });
});