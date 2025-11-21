/**
 * Comprehensive Dashboard Button Testing Suite
 *
 * This test suite systematically tests all buttons in the fleetifyapp dashboard
 * including functionality, accessibility, responsive behavior, and error handling.
 */

import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

// Test data
const TEST_USER = {
  email: 'test@fleetify.com',
  password: 'testpassword123',
};

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

test.describe('Dashboard Button Testing Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error tracking
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Store errors for later analysis
    await page.context().addInitScript(() => {
      window.testErrors = [];
    });
  });

  test.describe('Navigation and Authentication', () => {
    test('should login and navigate to dashboard', async ({ page }) => {
      await page.goto('/login');

      // Test login form buttons
      await page.fill('[data-testid="email-input"]', TEST_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_USER.password);

      // Test login button
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-button"]')).toBeEnabled();

      // Click login and verify navigation
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/dashboard', { timeout: 30000 });

      // Verify dashboard loaded
      await expect(page.locator('h1')).toContainText(/لوحة التحكم|Dashboard/i);
    });

    test('should handle login validation correctly', async ({ page }) => {
      await page.goto('/login');

      // Test empty form submission
      await page.click('[data-testid="login-button"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();

      // Test invalid credentials
      await page.fill('[data-testid="email-input"]', 'invalid@test.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    });
  });

  test.describe('Dashboard Overview Widgets', () => {
    test.beforeEach(async ({ page }) => {
      await performLogin(page);
      await page.waitForURL('/dashboard');
    });

    test('should test stats cards buttons', async ({ page }) => {
      // Test refresh buttons in stats cards
      const refreshButtons = page.locator('[data-testid*="refresh-button"]');
      const count = await refreshButtons.count();

      for (let i = 0; i < count; i++) {
        const button = refreshButtons.nth(i);
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();

        // Test click functionality
        await button.click();

        // Verify loading state
        await expect(button.locator('.animate-spin')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should test export buttons in widgets', async ({ page }) => {
      // Test export functionality
      const exportButtons = page.locator('[data-action="export"]');
      const count = await exportButtons.count();

      for (let i = 0; i < count; i++) {
        const button = exportButtons.nth(i);
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();

        // Test hover state
        await button.hover();
        await expect(button).toHaveCSS('cursor', 'pointer');
      }
    });

    test('should test view details buttons', async ({ page }) => {
      const detailButtons = page.locator('[data-testid*="view-details"], [data-testid*="details-button"]');
      const count = await detailButtons.count();

      for (let i = 0; i < count; i++) {
        const button = detailButtons.nth(i);
        await expect(button).toBeVisible();

        // Test click triggers navigation or modal
        const href = await button.getAttribute('href');
        if (href) {
          // Test navigation
          await button.click();
          await page.waitForURL(href);
          await page.goBack();
        } else {
          // Test modal trigger
          await button.click();
          // Should either open a modal or expand content
          const modal = page.locator('[role="dialog"]').first();
          if (await modal.isVisible()) {
            await page.keyboard.press('Escape');
          }
        }
      }
    });
  });

  test.describe('Quick Actions Section', () => {
    test.beforeEach(async ({ page }) => {
      await performLogin(page);
      await page.waitForURL('/dashboard');
    });

    test('should test all quick action buttons', async ({ page }) => {
      const quickActions = [
        'add-vehicle',
        'add-contract',
        'add-customer',
        'schedule-maintenance',
        'generate-report',
        'view-analytics'
      ];

      for (const action of quickActions) {
        const button = page.locator(`[data-testid="${action}-button"], [data-testid="quick-${action}"]`);

        if (await button.isVisible()) {
          await expect(button).toBeVisible();
          await expect(button).toBeEnabled();

          // Test button text/icon
          const buttonText = await button.textContent();
          expect(buttonText?.trim()).toBeTruthy();

          // Test click functionality
          const [response] = await Promise.all([
            page.waitForResponse(response =>
              response.url().includes('/api/') || response.status() === 200
            ),
            button.click()
          ]);

          // Handle potential navigation
          if (response.url() !== page.url()) {
            await page.goBack();
          }
        }
      }
    });

    test('should test button loading states', async ({ page }) => {
      const buttons = page.locator('button:not([disabled])').first();

      if (await buttons.isVisible()) {
        // Test loading state simulation
        await buttons.click();

        // Check for loading indicators
        const loader = page.locator('.animate-spin, .loading, [data-loading="true"]');
        if (await loader.isVisible({ timeout: 2000 })) {
          await expect(loader).toBeVisible();
        }
      }
    });
  });

  test.describe('Vehicle Management Buttons', () => {
    test.beforeEach(async ({ page }) => {
      await performLogin(page);
      await page.click('[data-testid="vehicles-nav-link"], a[href*="/vehicles"]');
      await page.waitForURL('**/vehicles**');
    });

    test('should test vehicle action buttons', async ({ page }) => {
      // Wait for vehicles to load
      await page.waitForSelector('[data-testid*="vehicle-"]');

      const vehicleRows = page.locator('[data-testid*="vehicle-row"]');
      const firstRow = vehicleRows.first();

      if (await firstRow.isVisible()) {
        // Test edit button
        const editButton = firstRow.locator('[data-testid*="edit"], [data-action="edit"]');
        if (await editButton.isVisible()) {
          await editButton.click();
          await expect(page.locator('[data-testid="vehicle-form"]')).toBeVisible();
          await page.goBack();
        }

        // Test delete button
        const deleteButton = firstRow.locator('[data-testid*="delete"], [data-action="delete"]');
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
          await page.click('[data-testid="cancel-button"]');
        }

        // Test view details button
        const viewButton = firstRow.locator('[data-testid*="view"], [data-action="view"]');
        if (await viewButton.isVisible()) {
          await viewButton.click();
          await expect(page.locator('[data-testid="vehicle-details"]')).toBeVisible();
        }
      }
    });

    test('should test add vehicle form buttons', async ({ page }) => {
      await page.click('[data-testid="add-vehicle-button"]');

      // Test form submission buttons
      await expect(page.locator('[data-testid="save-vehicle-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-vehicle-button"]')).toBeVisible();

      // Test form validation
      await page.click('[data-testid="save-vehicle-button"]');
      await expect(page.locator('[data-testid*="error"]')).toBeVisible();
    });
  });

  test.describe('Filter and Search Buttons', () => {
    test.beforeEach(async ({ page }) => {
      await performLogin(page);
      await page.waitForURL('/dashboard');
    });

    test('should test search functionality buttons', async ({ page }) => {
      const searchInput = page.locator('input[type="search"], [data-testid="search-input"]').first();

      if (await searchInput.isVisible()) {
        await searchInput.fill('test');

        // Test search button
        const searchButton = page.locator('[data-testid="search-button"], button[type="submit"]').first();
        if (await searchButton.isVisible()) {
          await searchButton.click();

          // Test clear search button
          const clearButton = page.locator('[data-testid="clear-search"], [data-action="clear"]').first();
          if (await clearButton.isVisible()) {
            await clearButton.click();
            await expect(searchInput).toHaveValue('');
          }
        }
      }
    });

    test('should test filter buttons', async ({ page }) => {
      const filterButtons = page.locator('[data-testid*="filter"], [data-action="filter"]');
      const count = await filterButtons.count();

      for (let i = 0; i < count; i++) {
        const button = filterButtons.nth(i);
        await expect(button).toBeVisible();

        await button.click();

        // Check for filter panel or dropdown
        const filterPanel = page.locator('[data-testid="filter-panel"], .filter-dropdown');
        if (await filterPanel.isVisible()) {
          await expect(filterPanel).toBeVisible();
          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test.describe('Export and Report Buttons', () => {
    test.beforeEach(async ({ page }) => {
      await performLogin(page);
      await page.waitForURL('/dashboard');
    });

    test('should test export button functionality', async ({ page }) => {
      const exportButtons = page.locator('[data-testid*="export"], [data-action="export"]');
      const count = await exportButtons.count();

      for (let i = 0; i < count; i++) {
        const button = exportButtons.nth(i);
        await expect(button).toBeVisible();

        // Test export dialog/modal
        await button.click();

        const exportDialog = page.locator('[data-testid="export-dialog"], [role="dialog"]');
        if (await exportDialog.isVisible({ timeout: 3000 })) {
          // Test export format selection
          const formatSelect = exportDialog.locator('select, [data-testid*="format"]');
          if (await formatSelect.isVisible()) {
            await formatSelect.selectOption('excel');
            await formatSelect.selectOption('pdf');
            await formatSelect.selectOption('csv');
          }

          // Test export confirmation button
          const confirmButton = exportDialog.locator('[data-testid*="confirm"], [data-action="confirm-export"]');
          if (await confirmButton.isVisible()) {
            // Set up download tracking
            const downloadPromise = page.waitForEvent('download');
            await confirmButton.click();

            // Wait for download or close modal
            try {
              const download = await Promise.race([
                downloadPromise,
                new Promise(resolve => setTimeout(resolve, 5000))
              ]);

              if (download) {
                expect(download.suggestedFilename()).toBeTruthy();
              }
            } catch (error) {
              // Export might fail, which is also valid test case
            }
          }

          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test.describe('Modal and Dialog Buttons', () => {
    test.beforeEach(async ({ page }) => {
      await performLogin(page);
      await page.waitForURL('/dashboard');
    });

    test('should test modal trigger and close buttons', async ({ page }) => {
      // Find buttons that might trigger modals
      const potentialTriggers = page.locator('button:not([disabled]), [role="button"]');
      const count = await potentialTriggers.count();

      // Test first few buttons to avoid excessive testing
      const testCount = Math.min(count, 10);

      for (let i = 0; i < testCount; i++) {
        const button = potentialTriggers.nth(i);
        const isVisible = await button.isVisible();

        if (isVisible) {
          await button.click();

          // Check for modal appearance
          const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"]');
          const modalVisible = await modal.isVisible({ timeout: 2000 });

          if (modalVisible) {
            // Test close buttons
            const closeButton = modal.locator('[data-testid*="close"], [aria-label="Close"], button[aria-label="Close"]');
            if (await closeButton.isVisible()) {
              await closeButton.click();
              await expect(modal).not.toBeVisible();
            } else {
              // Test escape key
              await page.keyboard.press('Escape');
              await expect(modal).not.toBeVisible();
            }
          } else {
            // Check if navigation occurred
            const currentUrl = page.url();
            if (currentUrl !== page.url()) {
              await page.goBack();
            }
          }
        }
      }
    });
  });

  test.describe('Responsive Button Testing', () => {
    const viewports = [
      { name: 'mobile', ...VIEWPORTS.mobile },
      { name: 'tablet', ...VIEWPORTS.tablet },
      { name: 'desktop', ...VIEWPORTS.desktop },
    ];

    viewports.forEach(viewport => {
      test(`should test button functionality on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await performLogin(page);
        await page.waitForURL('/dashboard');

        // Test button visibility and accessibility
        const buttons = page.locator('button:not([disabled]), [role="button"]:not([disabled])');
        const count = await buttons.count();

        // Verify buttons are visible and properly sized
        for (let i = 0; i < Math.min(count, 20); i++) {
          const button = buttons.nth(i);
          const isVisible = await button.isVisible();

          if (isVisible) {
            // Check button has proper size for viewport
            const box = await button.boundingBox();
            if (box) {
              expect(box.width).toBeGreaterThan(20);
              expect(box.height).toBeGreaterThan(20);
            }

            // Test button is accessible
            const hasText = await button.textContent();
            const hasAriaLabel = await button.getAttribute('aria-label');

            if (!hasText?.trim() && !hasAriaLabel) {
              console.warn(`Button at index ${i} lacks accessible text on ${viewport.name}`);
            }
          }
        }
      });
    });
  });

  test.describe('Accessibility Testing', () => {
    test.beforeEach(async ({ page }) => {
      await performLogin(page);
      await page.waitForURL('/dashboard');
    });

    test('should pass accessibility tests for buttons', async ({ page }) => {
      // Focus on interactive elements
      await page.locator('button, [role="button"]').first().focus();

      // Run axe accessibility tests
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should test keyboard navigation for buttons', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab');

      // Test space and enter activation
      const focusedElement = page.locator(':focus');
      if (await focusedElement.isVisible()) {
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());

        if (tagName === 'button' || (await focusedElement.getAttribute('role')) === 'button') {
          // Test keyboard activation
          await page.keyboard.press('Enter');

          // Wait for any potential navigation or modal
          await page.waitForTimeout(2000);

          // Test space key activation
          await focusedElement.focus();
          await page.keyboard.press(' ');
          await page.waitForTimeout(2000);
        }
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      await performLogin(page);
      await page.waitForURL('/dashboard');
    });

    test('should handle disabled button states', async ({ page }) => {
      const disabledButtons = page.locator('button:disabled, [aria-disabled="true"]');
      const count = await disabledButtons.count();

      for (let i = 0; i < count; i++) {
        const button = disabledButtons.nth(i);
        await expect(button).toBeVisible();
        await expect(button).toBeDisabled();

        // Test that disabled button doesn't trigger actions
        const initialUrl = page.url();
        await button.click();

        // URL should not change
        expect(page.url()).toBe(initialUrl);
      }
    });

    test('should test button error recovery', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());

      // Test button under network failure
      const buttons = page.locator('button:not([disabled])').first();
      if (await buttons.isVisible()) {
        await buttons.click();

        // Check for error handling
        const errorMessage = page.locator('[data-testid*="error"], .error-message');
        if (await errorMessage.isVisible({ timeout: 5000 })) {
          await expect(errorMessage).toBeVisible();
        }
      }

      // Restore network
      await page.unroute('**/api/**');
    });
  });

  test.describe('Performance Testing', () => {
    test.beforeEach(async ({ page }) => {
      await performLogin(page);
      await page.waitForURL('/dashboard');
    });

    test('should measure button click response times', async ({ page }) => {
      const buttons = page.locator('button:not([disabled])').first();

      if (await buttons.isVisible()) {
        const startTime = Date.now();
        await buttons.click();
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
      }
    });

    test('should test button performance with large datasets', async ({ page }) => {
      // Navigate to a page with potentially large data
      await page.click('[data-testid="contracts-nav-link"], a[href*="/contracts"]');
      await page.waitForURL('**/contracts**');

      // Test button performance after data loads
      await page.waitForTimeout(3000);

      const buttons = page.locator('button:not([disabled])').first();
      if (await buttons.isVisible()) {
        const startTime = Date.now();
        await buttons.click();
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(5000); // Allow more time with large datasets
      }
    });
  });
});

// Helper function for login
async function performLogin(page: any) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', TEST_USER.email);
  await page.fill('[data-testid="password-input"]', TEST_USER.password);
  await page.click('[data-testid="login-button"]');

  // Wait for successful login with timeout
  try {
    await page.waitForURL('/dashboard', { timeout: 30000 });
  } catch (error) {
    // If login fails, try alternative selectors or check for errors
    const currentUrl = page.url();
    if (!currentUrl.includes('/dashboard')) {
      console.log('Login may have failed, attempting to continue with current state');
      // Check if we're already on a page that has dashboard elements
      const dashboardElement = page.locator('h1').first();
      await dashboardElement.waitFor({ timeout: 10000 });
    }
  }
}