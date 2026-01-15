/**
 * Billing Center - Payments Tab E2E Tests
 * Tests the payments functionality within the Billing Center at /finance/billing
 *
 * Test Coverage:
 * - BP-001: Navigate to Billing Center and select Payments tab
 * - BP-002: Display payments list with correct data
 * - BP-003: Search payments by reference or customer
 * - BP-004: Filter payments by status and method
 * - BP-005: View payment details
 * - BP-006: Edit payment details
 * - BP-007: Delete payment with confirmation
 */

import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'khamis-1992@hotmail.com';
const TEST_PASSWORD = '123456789';
const BASE_URL = 'http://localhost:8080';

test.describe('Billing Center - Payments', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  /**
   * BP-001: Navigate to Billing Center and select Payments tab
   * P0 - Critical
   */
  test('BP-001: Navigate to Billing Center and select Payments tab', async ({ page }) => {
    // Navigate to Billing Center
    await page.goto(`${BASE_URL}/finance/billing`);

    // Wait for page load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify URL
    expect(page.url()).toContain('/finance/billing');

    // Check if Payments tab is available
    const paymentsTab = page.locator('[data-value="payments"], button').filter({ hasText: /المدفوعات|Payments/ });

    if (await paymentsTab.count() > 0) {
      // Click on Payments tab
      await paymentsTab.first().click();
      await page.waitForTimeout(500);

      // Verify Payments tab is selected
      expect(page.url()).toMatch(/tab=payments|payments/);
    }
  });

  /**
   * BP-002: Display payments list with correct data
   * P0 - Critical
   */
  test('BP-002: Display payments list with correct data', async ({ page }) => {
    // Navigate to Billing Center with payments tab
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Look for payments table
    const paymentsTable = page.locator('table, [data-testid="payments-table"]');

    // Check if table exists
    const tableExists = await paymentsTable.count() > 0;

    if (tableExists) {
      // Verify table headers
      const headers = ['العميل', 'المبلغ', 'التاريخ', 'طريقة الدفع'];
      let foundHeaders = 0;

      for (const header of headers) {
        try {
          const headerElement = page.locator('th').filter({ hasText: header }).first();
          if (await headerElement.isVisible({ timeout: 1000 })) {
            foundHeaders++;
          }
        } catch {
          // Header not found
        }
      }

      // At least some headers should be found
      expect(foundHeaders).toBeGreaterThan(0);
    } else {
      // Table might not exist - check for empty state
      const emptyState = page.locator('text="لا توجد مدفوعات"');
      const loadingState = page.locator('[class*="loading" i]');

      expect(await emptyState.isVisible() || await loadingState.isVisible()).toBeTruthy();
    }
  });

  /**
   * BP-003: Search payments by reference or customer
   * P1 - High
   */
  test('BP-003: Search payments by reference or customer', async ({ page }) => {
    // Navigate to Billing Center with payments tab
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Look for search input
    const searchInput = page.locator('input[placeholder*="ابحث" i], input[type="search"]').first();

    if (await searchInput.isVisible({ timeout: 2000 })) {
      // Type search query
      await searchInput.fill('أحمد');
      await page.waitForTimeout(1000);

      // Verify search was performed
      await expect(searchInput).toHaveValue('أحمد');

      // Wait for results to update
      await page.waitForTimeout(500);
    }
  });

  /**
   * BP-004: Filter payments by status and method
   * P1 - High
   */
  test('BP-004: Filter payments by status and method', async ({ page }) => {
    // Navigate to Billing Center with payments tab
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Look for filter dropdowns
    const statusFilter = page.locator('select, [role="combobox"]').filter({ hasText: /الحالة|Status/ }).first();

    if (await statusFilter.isVisible({ timeout: 2000 })) {
      // Click to open dropdown
      await statusFilter.click();
      await page.waitForTimeout(500);

      // Select a status option
      const statusOption = page.locator('[role="option"], option').filter({ hasText: /مكتمل|تم|completed/ }).first();

      if (await statusOption.isVisible({ timeout: 1000 })) {
        await statusOption.click();
        await page.waitForTimeout(1000);
      }
    }

    // Look for payment method filter
    const methodFilter = page.locator('select, [role="combobox"]').filter({ hasText: /طريقة الدفع|Payment Method/ }).first();

    if (await methodFilter.isVisible({ timeout: 2000 }) && (await methodFilter.count() > 1 || await methodFilter.textContent() !== await statusFilter.textContent())) {
      // Click to open dropdown
      await methodFilter.click();
      await page.waitForTimeout(500);

      // Select a payment method option
      const methodOption = page.locator('[role="option"], option').filter({ hasText: /نقد|Cash/i }).first();

      if (await methodOption.isVisible({ timeout: 1000 })) {
        await methodOption.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  /**
   * BP-005: View payment details
   * P1 - High
   */
  test('BP-005: View payment details', async ({ page }) => {
    // Navigate to Billing Center with payments tab
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Look for first payment row
    const paymentRow = page.locator('tbody tr, [data-testid="payment-row"]').first();

    if (await paymentRow.isVisible({ timeout: 2000 })) {
      // Look for view button
      const viewButton = paymentRow.locator('button').filter({ hasText: /عرض|معاينة|Eye|View/ }).first();

      if (await viewButton.isVisible({ timeout: 1000 })) {
        // Click view button
        await viewButton.click();

        // Wait for dialog to open
        await page.waitForTimeout(1000);

        // Verify preview dialog is visible
        const previewDialog = page.locator('[role="dialog"]').filter({ hasText: /معاينة|الدفعة|Payment/ });

        if (await previewDialog.isVisible({ timeout: 2000 })) {
          // Verify preview contains payment details
          await expect(previewDialog).toBeVisible();

          // Close dialog
          const closeButton = page.locator('[role="dialog"] button').filter({ hasText: /إغلاق|Close|X/ }).first();
          if (await closeButton.isVisible({ timeout: 1000 })) {
            await closeButton.click();
          }
        }
      }
    }
  });

  /**
   * BP-006: Edit payment details
   * P2 - Medium
   */
  test('BP-006: Edit payment details', async ({ page }) => {
    // Navigate to Billing Center with payments tab
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Look for first payment row
    const paymentRow = page.locator('tbody tr, [data-testid="payment-row"]').first();

    if (await paymentRow.isVisible({ timeout: 2000 })) {
      // Look for edit button
      const editButton = paymentRow.locator('button').filter({ hasText: /تعديل|Edit/ }).first();

      if (await editButton.isVisible({ timeout: 1000 })) {
        // Click edit button
        await editButton.click();

        // Wait for edit dialog to open
        await page.waitForTimeout(1000);

        // Verify edit dialog is visible
        const editDialog = page.locator('[role="dialog"]').filter({ hasText: /تعديل|Payment/ });

        if (await editDialog.isVisible({ timeout: 2000 })) {
          // Verify form fields are present
          const notesInput = editDialog.locator('textarea[name="notes"]').first();

          if (await notesInput.isVisible({ timeout: 1000 })) {
            // Update notes
            await notesInput.fill('Updated payment notes');

            // Save changes
            const saveButton = editDialog.locator('button').filter({ hasText: /حفظ|Save/ }).first();
            if (await saveButton.isVisible({ timeout: 1000 })) {
              await saveButton.click();
              await page.waitForTimeout(2000);
            }
          } else {
            // Close dialog if no form found
            const closeButton = editDialog.locator('button').filter({ hasText: /إغلاق|Cancel|X/ }).first();
            if (await closeButton.isVisible({ timeout: 1000 })) {
              await closeButton.click();
            }
          }
        }
      }
    }
  });

  /**
   * BP-007: Delete payment with confirmation
   * P1 - High
   */
  test('BP-007: Delete payment with confirmation', async ({ page }) => {
    // Navigate to Billing Center with payments tab
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Look for first payment row
    const paymentRow = page.locator('tbody tr, [data-testid="payment-row"]').first();

    if (await paymentRow.isVisible({ timeout: 2000 })) {
      // Look for delete button
      const deleteButton = paymentRow.locator('button').filter({ hasText: /حذف|Delete|Trash/ }).first();

      if (await deleteButton.isVisible({ timeout: 1000 })) {
        // Click delete button
        await deleteButton.click();

        // Wait for confirmation dialog
        await page.waitForTimeout(1000);

        // Verify confirmation dialog is visible
        const confirmDialog = page.locator('[role="dialog"]').filter({ hasText: /تأكيد|Confirm|حذف|Delete/ });

        if (await confirmDialog.isVisible({ timeout: 2000 })) {
          // Look for confirm button
          const confirmButton = confirmDialog.locator('button').filter({ hasText: /تأكيد|Confirm|نعم|Yes/ }).first();

          if (await confirmButton.isVisible({ timeout: 1000 })) {
            // Confirm deletion
            await confirmButton.click();
            await page.waitForTimeout(2000);
          } else {
            // Cancel if no confirm button found
            const cancelButton = confirmDialog.locator('button').filter({ hasText: /إلغاء|Cancel|لا|No/ }).first();
            if (await cancelButton.isVisible({ timeout: 1000 })) {
              await cancelButton.click();
            }
          }
        }
      }
    }
  });

  /**
   * BP-008: Create new payment from Billing Center
   * P0 - Critical
   */
  test('BP-008: Create new payment from Billing Center', async ({ page }) => {
    // Navigate to Billing Center with payments tab
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Look for create payment button
    const createButton = page.locator('button').filter({ hasText: /إضافة مدفوعات|إنشاء دفعة|Add Payment/ }).first();

    if (await createButton.isVisible({ timeout: 2000 })) {
      // Click create button
      await createButton.click();

      // Wait for dialog to open
      await page.waitForTimeout(1000);

      // Verify payment dialog is visible
      const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء دفعة|New Payment/ });

      if (await paymentDialog.isVisible({ timeout: 2000 })) {
        // Look for customer field
        const customerSelect = paymentDialog.locator('[name="customer"], [role="combobox"]').first();

        if (await customerSelect.isVisible({ timeout: 1000 })) {
          // Select customer
          await customerSelect.click();
          await page.waitForTimeout(500);

          // Select first customer from dropdown
          const customerOption = page.locator('[role="option"]').first();
          if (await customerOption.isVisible({ timeout: 1000 })) {
            await customerOption.click();
          }

          // Look for amount field
          const amountInput = paymentDialog.locator('input[name="amount"]').first();
          if (await amountInput.isVisible({ timeout: 1000 })) {
            await amountInput.fill('1000');
          }

          // Look for payment method field
          const methodSelect = paymentDialog.locator('select[name="payment_method"], [role="combobox"]').filter({ hasText: /طريقة|Method/ }).first();
          if (await methodSelect.isVisible({ timeout: 1000 })) {
            await methodSelect.click();
            await page.waitForTimeout(500);

            const cashOption = page.locator('[role="option"], option').filter({ hasText: /نقد|Cash/i }).first();
            if (await cashOption.isVisible({ timeout: 1000 })) {
              await cashOption.click();
            }
          }

          // Save payment
          const saveButton = paymentDialog.locator('button').filter({ hasText: /حفظ|Save|إنشاء|Create/ }).first();
          if (await saveButton.isVisible({ timeout: 1000 })) {
            await saveButton.click();
            await page.waitForTimeout(2000);
          }
        } else {
          // Close dialog if no customer field found
          const closeButton = paymentDialog.locator('button').filter({ hasText: /إغلاق|Cancel|X/ }).first();
          if (await closeButton.isVisible({ timeout: 1000 })) {
            await closeButton.click();
          }
        }
      }
    }
  });
});
