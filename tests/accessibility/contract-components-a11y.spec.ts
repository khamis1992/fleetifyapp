/**
 * Contract Components Accessibility Tests
 *
 * Comprehensive accessibility testing for contract management components
 * using axe-core to ensure WCAG 2.1 AA compliance.
 */

import { test, expect } from '@playwright/test';
import { injectAxe, getViolations, checkA11y } from 'axe-playwright';

test.describe('Contract Components Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.setViewportSize({ width: 1280, height: 720 });

    // Login for authenticated components
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Inject axe for accessibility testing
    await injectAxe(page);
  });

  test('should have no accessibility violations on contracts list page', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForSelector('[data-testid="contracts-list"]');

    // Check for accessibility violations
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      rules: {
        // Enable WCAG 2.1 AA compliance
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true },
        'aria-labels': { enabled: true },
        'heading-order': { enabled: true },
        'landmark-roles': { enabled: true },
        'list-order': { enabled: true },
        'skip-link': { enabled: true },
      }
    });
  });

  test('should have accessible contract cards', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForSelector('[data-testid="contract-card"]');

    // Test first contract card
    const contractCard = page.locator('[data-testid="contract-card"]').first();

    await checkA11y(contractCard, null, {
      detailedReport: true,
      rules: {
        'color-contrast': { enabled: true },
        'aria-labels': { enabled: true },
        'button-name': { enabled: true },
        'link-name': { enabled: true },
        'image-alt': { enabled: true },
      }
    });
  });

  test('should have accessible contract creation form', async ({ page }) => {
    await page.goto('/contracts/create');
    await page.waitForSelector('[data-testid="contract-creation-form"]');

    // Test form accessibility
    await checkA11y(page, null, {
      detailedReport: true,
      rules: {
        'label-title-only': { enabled: true },
        'input-button-name': { enabled: true },
        'select-name': { enabled: true },
        'textarea-name': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'fieldset': { enabled: true },
        'legend': { enabled: true },
      }
    });
  });

  test('should have accessible form validation messages', async ({ page }) => {
    await page.goto('/contracts/create');

    // Try to submit empty form to trigger validation
    await page.click('[data-testid="create-contract-submit"]');

    // Wait for validation errors to appear
    await page.waitForSelector('[data-testid="validation-error"]', { timeout: 5000 });

    // Check validation messages for accessibility
    await checkA11y(page, null, {
      detailedReport: true,
      rules: {
        'aria-valid-attr-value': { enabled: true },
        'aria-input-field-name': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-required-children': { enabled: true },
        'aria-roles': { enabled: true },
      }
    });
  });

  test('should have accessible contract filters', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForSelector('[data-testid="contract-filters"]');

    // Test filter components
    await checkA11y(page.locator('[data-testid="contract-filters"]'), null, {
      detailedReport: true,
      rules: {
        'button-name': { enabled: true },
        'select-name': { enabled: true },
        'aria-labels': { enabled: true },
        'focus-management': { enabled: true },
      }
    });
  });

  test('should have accessible contract search', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForSelector('[data-testid="contract-search"]');

    // Test search accessibility
    const searchContainer = page.locator('[data-testid="contract-search-container"]');
    await checkA11y(searchContainer, null, {
      detailedReport: true,
      rules: {
        'input-button-name': { enabled: true },
        'aria-labels': { enabled: true },
        'autocomplete-valid': { enabled: true },
        'aria-allowed-attr': { enabled: true },
      }
    });
  });

  test('should have accessible contract details page', async ({ page }) => {
    await page.goto('/contracts/AGR-ACCESSIBILITY-TEST');
    await page.waitForSelector('[data-testid="contract-details"]');

    // Test entire contract details page
    await checkA11y(page, null, {
      detailedReport: true,
      rules: {
        'heading-order': { enabled: true },
        'landmark-roles': { enabled: true },
        'region': { enabled: true },
        'aria-labelledby': { enabled: true },
        'aria-describedby': { enabled: true },
      }
    });
  });

  test('should have accessible contract tabs', async ({ page }) => {
    await page.goto('/contracts/AGR-ACCESSIBILITY-TEST');
    await page.waitForSelector('[data-testid="contract-tabs"]');

    // Test tab accessibility
    await checkA11y(page.locator('[data-testid="contract-tabs"]'), null, {
      detailedReport: true,
      rules: {
        'aria-tabs': { enabled: true },
        'tabindex': { enabled: true },
        'focus-management': { enabled: true },
        'keyboard-navigation': { enabled: true },
      }
    });

    // Test keyboard navigation through tabs
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      await tabs.nth(i).focus();
      await expect(tabs.nth(i)).toBeFocused();

      // Check if tab is selectable with keyboard
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
    }
  });

  test('should have accessible contract action buttons', async ({ page }) => {
    await page.goto('/contracts/AGR-ACCESSIBILITY-TEST');
    await page.waitForSelector('[data-testid="contract-actions"]');

    // Test action buttons accessibility
    const actionsContainer = page.locator('[data-testid="contract-actions"]');
    await checkA11y(actionsContainer, null, {
      detailedReport: true,
      rules: {
        'button-name': { enabled: true },
        'aria-labels': { enabled: true },
        'focus-management': { enabled: true },
        'aria-pressed': { enabled: true },
      }
    });

    // Test keyboard accessibility of action buttons
    const actionButtons = actionsContainer.locator('button');
    const buttonCount = await actionButtons.count();

    for (let i = 0; i < buttonCount; i++) {
      await actionButtons.nth(i).focus();
      await expect(actionButtons.nth(i)).toBeFocused();

      // Test button activation with keyboard
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
    }
  });

  test('should have accessible contract status badges', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForSelector('[data-testid="contract-status-badge"]');

    // Test status badges accessibility
    const statusBadges = page.locator('[data-testid="contract-status-badge"]');
    const badgeCount = await statusBadges.count();

    for (let i = 0; i < badgeCount; i++) {
      const badge = statusBadges.nth(i);
      await checkA11y(badge, null, {
        detailedReport: true,
        rules: {
          'color-contrast': { enabled: true },
          'aria-labels': { enabled: true },
          'button-name': { enabled: true },
        }
      });
    }
  });

  test('should have accessible contract pagination', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForSelector('[data-testid="contracts-list"]');

    // Check if pagination exists
    const pagination = page.locator('[data-testid="contracts-pagination"]');
    const isPaginationVisible = await pagination.isVisible();

    if (isPaginationVisible) {
      await checkA11y(pagination, null, {
        detailedReport: true,
        rules: {
          'button-name': { enabled: true },
          'aria-labels': { enabled: true },
          'focus-management': { enabled: true },
          'link-name': { enabled: true },
        }
      });

      // Test keyboard navigation through pagination
      const paginationButtons = pagination.locator('button, [role="button"]');
      const buttonCount = await paginationButtons.count();

      for (let i = 0; i < buttonCount; i++) {
        await paginationButtons.nth(i).focus();
        await expect(paginationButtons.nth(i)).toBeFocused();
      }
    }
  });

  test('should have accessible contract modals and dialogs', async ({ page }) => {
    await page.goto('/contracts/AGR-ACCESSIBILITY-TEST');

    // Test cancellation dialog
    await page.click('[data-testid="cancel-contract-button"]');
    await page.waitForSelector('[data-testid="cancel-contract-dialog"]');

    await checkA11y(page.locator('[data-testid="cancel-contract-dialog"]'), null, {
      detailedReport: true,
      rules: {
        'aria-dialog': { enabled: true },
        'focus-management': { enabled: true },
        'aria-labelledby': { enabled: true },
        'aria-describedby': { enabled: true },
        'keyboard-navigation': { enabled: true },
      }
    });

    // Test focus management in modal
    await expect(page.locator('[data-testid="cancel-contract-dialog"]')).toBeFocused();

    // Test tabbing through modal
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Test escape key closes modal
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="cancel-contract-dialog"]', { state: 'hidden' });
  });

  test('should have accessible contract data tables', async ({ page }) => {
    await page.goto('/contracts/AGR-ACCESSIBILITY-TEST');
    await page.click('[data-testid="payments-tab"]');
    await page.waitForSelector('[data-testid="payment-history-table"]');

    // Test table accessibility
    const table = page.locator('[data-testid="payment-history-table"]');
    await checkA11y(table, null, {
      detailedReport: true,
      rules: {
        'table-headers': { enabled: true },
        'th-has-data-cells': { enabled: true },
        'td-headers-attr': { enabled: true },
        'scope-attr-valid': { enabled: true },
        'caption': { enabled: true },
      }
    });

    // Test keyboard navigation in table
    const tableRows = table.locator('tbody tr');
    const firstRow = tableRows.first();
    await firstRow.focus();

    // Test arrow key navigation
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
  });

  test('should have accessible contract file uploads', async ({ page }) => {
    await page.goto('/contracts/AGR-ACCESSIBILITY-TEST');
    await page.click('[data-testid="documents-tab"]');
    await page.waitForSelector('[data-testid="document-upload"]');

    // Test file upload accessibility
    const uploadContainer = page.locator('[data-testid="document-upload-container"]');
    await checkA11y(uploadContainer, null, {
      detailedReport: true,
      rules: {
        'input-button-name': { enabled: true },
        'aria-labels': { enabled: true },
        'focus-management': { enabled: true },
      }
    });

    // Test keyboard accessibility of file upload
    const fileInput = page.locator('[data-testid="document-upload"]');
    await fileInput.focus();
    await expect(fileInput).toBeFocused();
  });

  test('should have accessible contract forms with proper error handling', async ({ page }) => {
    await page.goto('/contracts/create');

    // Test form field labels and descriptions
    const formFields = [
      '[data-testid="agreement-number"]',
      '[data-testid="customer-select"]',
      '[data-testid="vehicle-select"]',
      '[data-testid="monthly-rate"]',
      '[data-testid="start-date"]',
      '[data-testid="end-date"]',
    ];

    for (const fieldSelector of formFields) {
      const field = page.locator(fieldSelector);
      const isVisible = await field.isVisible();

      if (isVisible) {
        await checkA11y(field, null, {
          detailedReport: true,
          rules: {
            'label-title-only': { enabled: true },
            'input-button-name': { enabled: true },
            'aria-input-field-name': { enabled: true },
          }
        });

        // Test field focus
        await field.focus();
        await expect(field).toBeFocused();
      }
    }
  });

  test('should have accessible contract notifications and toasts', async ({ page }) => {
    await page.goto('/contracts/create');

    // Trigger a notification
    await page.click('[data-testid="create-contract-submit"]');
    await page.waitForSelector('[data-testid="notification"]', { timeout: 5000 });

    // Test notification accessibility
    const notification = page.locator('[data-testid="notification"]');
    await checkA11y(notification, null, {
      detailedReport: true,
      rules: {
        'aria-live': { enabled: true },
        'aria-atomic': { enabled: true },
        'role-alert': { enabled: true },
        'color-contrast': { enabled: true },
      }
    });

    // Test screen reader announcements
    const isAriaLive = await notification.getAttribute('aria-live');
    expect(isAriaLive).toBeTruthy();
  });

  test('should have accessible contract export functionality', async ({ page }) => {
    await page.goto('/contracts');
    await page.click('[data-testid="export-contracts-button"]');
    await page.waitForSelector('[data-testid="export-contracts-dialog"]');

    // Test export dialog accessibility
    await checkA11y(page.locator('[data-testid="export-contracts-dialog"]'), null, {
      detailedReport: true,
      rules: {
        'aria-dialog': { enabled: true },
        'focus-management': { enabled: true },
        'input-button-name': { enabled: true },
        'select-name': { enabled: true },
      }
    });

    // Test export options accessibility
    const exportOptions = [
      '[data-testid="export-format-select"]',
      '[data-testid="export-date-range-start"]',
      '[data-testid="export-date-range-end"]',
      '[data-testid="export-include-options"]',
    ];

    for (const optionSelector of exportOptions) {
      const option = page.locator(optionSelector);
      const isVisible = await option.isVisible();

      if (isVisible) {
        await checkA11y(option, null, {
          detailedReport: true,
          rules: {
            'input-button-name': { enabled: true },
            'select-name': { enabled: true },
            'checkbox-label': { enabled: true },
          }
        });
      }
    }
  });

  test('should have accessible contract charts and data visualizations', async ({ page }) => {
    await page.goto('/contracts/AGR-ACCESSIBILITY-TEST');
    await page.click('[data-testid="analytics-tab"]');
    await page.waitForSelector('[data-testid="contract-analytics"]');

    // Test charts accessibility
    await checkA11y(page.locator('[data-testid="contract-analytics"]'), null, {
      detailedReport: true,
      rules: {
        'image-alt': { enabled: true },
        'aria-labels': { enabled: true },
        'color-contrast': { enabled: true },
        'link-name': { enabled: true },
      }
    });

    // Check if charts have alternative text or descriptions
    const charts = page.locator('[data-testid^="chart-"]');
    const chartCount = await charts.count();

    for (let i = 0; i < chartCount; i++) {
      const chart = charts.nth(i);
      const hasAlt = await chart.getAttribute('aria-label') !== null;
      const hasDescription = await chart.getAttribute('aria-describedby') !== null;

      // Charts should have either aria-label or aria-describedby
      expect(hasAlt || hasDescription).toBeTruthy();
    }
  });

  test('should have accessible loading and error states', async ({ page }) => {
    // Mock slow loading to test loading state
    await page.route('**/api/contracts', route => {
      setTimeout(() => route.fulfill({ status: 200 }), 2000);
    });

    await page.goto('/contracts');
    await page.waitForSelector('[data-testid="contracts-loading"]');

    // Test loading state accessibility
    await checkA11y(page.locator('[data-testid="contracts-loading"]'), null, {
      detailedReport: true,
      rules: {
        'aria-live': { enabled: true },
        'aria-busy': { enabled: true },
        'role-status': { enabled: true },
      }
    });

    // Mock error state
    await page.unroute('**/api/contracts');
    await page.route('**/api/contracts', route => {
      route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await page.goto('/contracts');
    await page.waitForSelector('[data-testid="contracts-error"]');

    // Test error state accessibility
    await checkA11y(page.locator('[data-testid="contracts-error"]'), null, {
      detailedReport: true,
      rules: {
        'role-alert': { enabled: true },
        'aria-live': { enabled: true },
        'color-contrast': { enabled: true },
      }
    });
  });

  test('should have accessible keyboard navigation throughout', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForSelector('[data-testid="contracts-list"]');

    // Test tab order through the page
    let currentElement = await page.locator('body');
    await page.keyboard.press('Tab');

    // Verify focus moves through interactive elements
    const interactiveSelectors = [
      '[data-testid="contract-search"]',
      '[data-testid="status-filter"]',
      '[data-testid="type-filter"]',
      '[data-testid="contract-card"] button',
      '[data-testid="create-contract-button"]',
    ];

    for (const selector of interactiveSelectors) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');

      // Check if any of our target elements is focused
      for (const targetSelector of interactiveSelectors) {
        const targetElement = page.locator(targetSelector);
        const isTargetFocused = await focusedElement.evaluate(
          (el, target) => el === target,
          await targetElement.elementHandle()
        );

        if (isTargetFocused) {
          break;
        }
      }
    }

    // Test escape key functionality
    await page.keyboard.press('Escape');

    // Test enter key activation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
  });
});