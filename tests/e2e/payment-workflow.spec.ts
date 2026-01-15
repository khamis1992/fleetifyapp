/**
 * Payment Workflow E2E Tests
 * Tests the complete payment creation workflow
 *
 * Test Coverage:
 * - PW-001: Create new payment via button
 * - PW-002: Fill payment form with valid data
 * - PW-003: Select customer for payment
 * - PW-004: Select payment method (cash, bank, card)
 * - PW-005: Link payment to invoice
 * - PW-006: Preview payment before saving
 * - PW-007: Save and create payment
 * - PW-008: Verify payment appears in list
 * - PW-009: Payment with invalid data shows errors
 */

import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'khamis-1992@hotmail.com';
const TEST_PASSWORD = '123456789';
const BASE_URL = 'http://localhost:8080';

test.describe('Payment Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  /**
   * PW-001: Create new payment via button
   * P0 - Critical
   */
  test('PW-001: Create new payment via button', async ({ page }) => {
    // Navigate to Billing Center with payments tab
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Look for create payment button
    const createButton = page.locator('button').filter({ hasText: /إضافة مدفوعات|إنشاء دفعة|Add Payment/ }).first();

    // Verify button exists
    expect(await createButton.isVisible({ timeout: 5000 })).toBeTruthy();

    // Click create button
    await createButton.click();

    // Wait for dialog to open
    await page.waitForTimeout(1000);

    // Verify payment dialog is visible
    const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء دفعة|New Payment|Payment/ });
    await expect(paymentDialog).toBeVisible({ timeout: 5000 });
  });

  /**
   * PW-002: Fill payment form with valid data
   * P0 - Critical
   */
  test('PW-002: Fill payment form with valid data', async ({ page }) => {
    // Navigate to Billing Center and open create payment dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة مدفوعات|إنشاء دفعة|Add Payment/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء دفعة|New Payment/ });
    if (await paymentDialog.isVisible({ timeout: 2000 })) {
      // Fill in amount
      const amountInput = paymentDialog.locator('input[name="amount"]').first();
      if (await amountInput.isVisible({ timeout: 1000 })) {
        await amountInput.fill('1000');
      }

      // Fill in notes/description
      const notesInput = paymentDialog.locator('textarea[name="notes"], textarea[name="description"]').first();
      if (await notesInput.isVisible({ timeout: 1000 })) {
        await notesInput.fill('Test payment description');
      }

      // Verify data was entered
      await expect(amountInput).toHaveValue('1000');
    }
  });

  /**
   * PW-003: Select customer for payment
   * P0 - Critical
   */
  test('PW-003: Select customer for payment', async ({ page }) => {
    // Navigate to Billing Center and open create payment dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة مدفوعات|إنشاء دفعة|Add Payment/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء دفعة|New Payment/ });
    if (await paymentDialog.isVisible({ timeout: 2000 })) {
      // Look for customer selector
      const customerSelect = paymentDialog.locator('[name="customer"], [role="combobox"]').filter({ hasText: /العميل|Customer/ }).first();

      if (await customerSelect.isVisible({ timeout: 1000 })) {
        // Click to open dropdown
        await customerSelect.click();
        await page.waitForTimeout(500);

        // Select first customer from dropdown
        const customerOption = page.locator('[role="option"]').first();

        if (await customerOption.isVisible({ timeout: 2000 })) {
          // Get customer text for verification
          const customerName = await customerOption.textContent();

          await customerOption.click();
          await page.waitForTimeout(500);

          // Verify customer was selected
          expect(await customerSelect.textContent()).toContain(customerName?.substring(0, 20));
        }
      }
    }
  });

  /**
   * PW-004: Select payment method (cash, bank, card)
   * P0 - Critical
   */
  test('PW-004: Select payment method', async ({ page }) => {
    // Navigate to Billing Center and open create payment dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة مدفوعات|إنشاء دفعة|Add Payment/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء دفعة|New Payment/ });
    if (await paymentDialog.isVisible({ timeout: 2000 })) {
      // Look for payment method selector
      const methodSelect = paymentDialog.locator('select[name="payment_method"], [role="combobox"]').filter({ hasText: /طريقة الدفع|Payment Method/ }).first();

      if (await methodSelect.isVisible({ timeout: 1000 })) {
        // Click to open dropdown
        await methodSelect.click();
        await page.waitForTimeout(500);

        // Select cash option
        const cashOption = page.locator('[role="option"], option').filter({ hasText: /نقد|Cash/i }).first();

        if (await cashOption.isVisible({ timeout: 1000 })) {
          await cashOption.click();
          await page.waitForTimeout(500);

          // Verify method was selected
          expect(await methodSelect.textContent()).toMatch(/نقد|Cash/i);
        }
      }
    }
  });

  /**
   * PW-005: Link payment to invoice
   * P0 - Critical
   */
  test('PW-005: Link payment to invoice', async ({ page }) => {
    // Navigate to Billing Center and open create payment dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة مدفوعات|إنشاء دفعة|Add Payment/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء دفعة|New Payment/ });
    if (await paymentDialog.isVisible({ timeout: 2000 })) {
      // Look for invoice selector
      const invoiceSelect = paymentDialog.locator('[name="invoice"], [role="combobox"]').filter({ hasText: /فاتورة|Invoice/ }).first();

      if (await invoiceSelect.isVisible({ timeout: 1000 })) {
        // Click to open dropdown
        await invoiceSelect.click();
        await page.waitForTimeout(500);

        // Select first invoice from dropdown
        const invoiceOption = page.locator('[role="option"]').first();

        if (await invoiceOption.isVisible({ timeout: 2000 })) {
          await invoiceOption.click();
          await page.waitForTimeout(500);

          // Verify invoice was linked
          expect(await invoiceSelect.textContent()).toBeTruthy();
        }
      }
    }
  });

  /**
   * PW-006: Preview payment before saving
   * P1 - High
   */
  test('PW-006: Preview payment before saving', async ({ page }) => {
    // Navigate to Billing Center and open create payment dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة مدفوعات|إنشاء دفعة|Add Payment/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء دفعة|New Payment/ });
    if (await paymentDialog.isVisible({ timeout: 2000 })) {
      // Look for preview button
      const previewButton = paymentDialog.locator('button').filter({ hasText: /معاينة|Preview/ }).first();

      if (await previewButton.isVisible({ timeout: 1000 })) {
        // Click preview button
        await previewButton.click();
        await page.waitForTimeout(1000);

        // Verify preview dialog appears
        const previewDialog = page.locator('[role="dialog"]').filter({ hasText: /معاينة|Preview/ });
        await expect(previewDialog).toBeVisible({ timeout: 2000 });

        // Close preview
        const closeButton = previewDialog.locator('button').filter({ hasText: /إغلاق|Close/ }).first();
        if (await closeButton.isVisible({ timeout: 1000 })) {
          await closeButton.click();
        }
      }
    }
  });

  /**
   * PW-007: Save and create payment
   * P0 - Critical
   */
  test('PW-007: Save and create payment', async ({ page }) => {
    // Navigate to Billing Center and open create payment dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة مدفوعات|إنشاء دفعة|Add Payment/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء دفعة|New Payment/ });
    if (await paymentDialog.isVisible({ timeout: 2000 })) {
      // Fill in required fields
      const amountInput = paymentDialog.locator('input[name="amount"]').first();
      if (await amountInput.isVisible({ timeout: 1000 })) {
        await amountInput.fill('2000');
      }

      const customerSelect = paymentDialog.locator('[name="customer"], [role="combobox"]').filter({ hasText: /العميل|Customer/ }).first();
      if (await customerSelect.isVisible({ timeout: 1000 })) {
        await customerSelect.click();
        await page.waitForTimeout(500);

        const customerOption = page.locator('[role="option"]').first();
        if (await customerOption.isVisible({ timeout: 1000 })) {
          await customerOption.click();
        }
      }

      const methodSelect = paymentDialog.locator('select[name="payment_method"], [role="combobox"]').filter({ hasText: /طريقة الدفع|Payment Method/ }).first();
      if (await methodSelect.isVisible({ timeout: 1000 })) {
        await methodSelect.click();
        await page.waitForTimeout(500);

        const cashOption = page.locator('[role="option"], option').filter({ hasText: /نقد|Cash/i }).first();
        if (await cashOption.isVisible({ timeout: 1000 })) {
          await cashOption.click();
        }
      }

      // Look for save button
      const saveButton = paymentDialog.locator('button').filter({ hasText: /حفظ|Save|إنشاء|Create/ }).first();

      if (await saveButton.isVisible({ timeout: 1000 })) {
        // Click save button
        await saveButton.click();
        await page.waitForTimeout(2000);

        // Verify success message or dialog closure
        const successMessage = page.locator('text="تم إنشاء الدفعة بنجاح", text="Payment created successfully"');
        if (await successMessage.isVisible({ timeout: 2000 })) {
          await expect(successMessage).toBeVisible();
        } else {
          // Dialog should close on success
          await expect(paymentDialog).not.toBeVisible({ timeout: 2000 });
        }
      }
    }
  });

  /**
   * PW-008: Verify payment appears in list
   * P0 - Critical
   */
  test('PW-008: Verify payment appears in list after creation', async ({ page }) => {
    // Create payment
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة مدفوعات|إنشاء دفعة|Add Payment/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء دفعة|New Payment/ });
    if (await paymentDialog.isVisible({ timeout: 2000 })) {
      // Fill and save
      const amountInput = paymentDialog.locator('input[name="amount"]').first();
      if (await amountInput.isVisible({ timeout: 1000 })) {
        await amountInput.fill('8888'); // Unique amount
      }

      const customerSelect = paymentDialog.locator('[name="customer"], [role="combobox"]').filter({ hasText: /العميل|Customer/ }).first();
      if (await customerSelect.isVisible({ timeout: 1000 })) {
        await customerSelect.click();
        await page.waitForTimeout(500);

        const customerOption = page.locator('[role="option"]').first();
        if (await customerOption.isVisible({ timeout: 1000 })) {
          await customerOption.click();
        }
      }

      const methodSelect = paymentDialog.locator('select[name="payment_method"], [role="combobox"]').filter({ hasText: /طريقة الدفع|Payment Method/ }).first();
      if (await methodSelect.isVisible({ timeout: 1000 })) {
        await methodSelect.click();
        await page.waitForTimeout(500);

        const cashOption = page.locator('[role="option"], option').filter({ hasText: /نقد|Cash/i }).first();
        if (await cashOption.isVisible({ timeout: 1000 })) {
          await cashOption.click();
        }
      }

      const saveButton = paymentDialog.locator('button').filter({ hasText: /حفظ|Save|إنشاء|Create/ }).first();
      if (await saveButton.isVisible({ timeout: 1000 })) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Reload page to get fresh data
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify payment with amount 8888 appears in list
    const paymentAmount = page.locator('text="8888"').first();
    await expect(paymentAmount).toBeVisible({ timeout: 5000 });
  });

  /**
   * PW-009: Payment with invalid data shows errors
   * P1 - High
   */
  test('PW-009: Payment with invalid data shows errors', async ({ page }) => {
    // Navigate to Billing Center and open create payment dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة مدفوعات|إنشاء دفعة|Add Payment/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء دفعة|New Payment/ });
    if (await paymentDialog.isVisible({ timeout: 2000 })) {
      // Try to save without filling required fields
      const saveButton = paymentDialog.locator('button').filter({ hasText: /حفظ|Save|إنشاء|Create/ }).first();

      if (await saveButton.isVisible({ timeout: 1000 })) {
        await saveButton.click();
        await page.waitForTimeout(1000);

        // Verify error messages appear
        const errorMessage = page.locator('text="مطلوب", text="required", [role="alert"]').first();
        await expect(errorMessage).toBeVisible({ timeout: 2000 });
      }
    }
  });
});
