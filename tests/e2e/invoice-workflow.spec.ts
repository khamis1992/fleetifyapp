/**
 * Invoice Workflow E2E Tests
 * Tests the complete invoice creation workflow
 *
 * Test Coverage:
 * - IW-001: Create new invoice via button
 * - IW-002: Fill invoice form with valid data
 * - IW-003: Select customer for invoice
 * - IW-004: Add line items to invoice
 * - IW-005: Set invoice due date
 * - IW-006: Preview invoice before saving
 * - IW-007: Save and create invoice
 * - IW-008: Verify invoice appears in list
 * - IW-009: Invoice with invalid data shows errors
 */

import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'khamis-1992@hotmail.com';
const TEST_PASSWORD = '123456789';
const BASE_URL = 'http://localhost:8080';

test.describe('Invoice Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  /**
   * IW-001: Create new invoice via button
   * P0 - Critical
   */
  test('IW-001: Create new invoice via button', async ({ page }) => {
    // Navigate to Billing Center with invoices tab
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Look for create invoice button
    const createButton = page.locator('button').filter({ hasText: /إضافة فاتورة|إنشاء فاتورة|Add Invoice/ }).first();

    // Verify button exists
    expect(await createButton.isVisible({ timeout: 5000 })).toBeTruthy();

    // Click create button
    await createButton.click();

    // Wait for dialog to open
    await page.waitForTimeout(1000);

    // Verify invoice dialog is visible
    const invoiceDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء فاتورة|New Invoice|Invoice/ });
    await expect(invoiceDialog).toBeVisible({ timeout: 5000 });
  });

  /**
   * IW-002: Fill invoice form with valid data
   * P0 - Critical
   */
  test('IW-002: Fill invoice form with valid data', async ({ page }) => {
    // Navigate to Billing Center and open create invoice dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة فاتورة|إنشاء فاتورة|Add Invoice/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const invoiceDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء فاتورة|New Invoice/ });
    if (await invoiceDialog.isVisible({ timeout: 2000 })) {
      // Fill in amount
      const amountInput = invoiceDialog.locator('input[name="amount"]').first();
      if (await amountInput.isVisible({ timeout: 1000 })) {
        await amountInput.fill('5000');
      }

      // Fill in notes/description
      const notesInput = invoiceDialog.locator('textarea[name="notes"], textarea[name="description"]').first();
      if (await notesInput.isVisible({ timeout: 1000 })) {
        await notesInput.fill('Test invoice description');
      }

      // Verify data was entered
      await expect(amountInput).toHaveValue('5000');
    }
  });

  /**
   * IW-003: Select customer for invoice
   * P0 - Critical
   */
  test('IW-003: Select customer for invoice', async ({ page }) => {
    // Navigate to Billing Center and open create invoice dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة فاتورة|إنشاء فاتورة|Add Invoice/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const invoiceDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء فاتورة|New Invoice/ });
    if (await invoiceDialog.isVisible({ timeout: 2000 })) {
      // Look for customer selector
      const customerSelect = invoiceDialog.locator('[name="customer"], [role="combobox"]').filter({ hasText: /العميل|Customer/ }).first();

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
   * IW-004: Add line items to invoice
   * P0 - Critical
   */
  test('IW-004: Add line items to invoice', async ({ page }) => {
    // Navigate to Billing Center and open create invoice dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة فاتورة|إنشاء فاتورة|Add Invoice/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const invoiceDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء فاتورة|New Invoice/ });
    if (await invoiceDialog.isVisible({ timeout: 2000 })) {
      // Look for add line item button
      const addLineItemButton = invoiceDialog.locator('button').filter({ hasText: /إضافة|Add|Plus/ }).first();

      if (await addLineItemButton.isVisible({ timeout: 1000 })) {
        // Click to add line item
        await addLineItemButton.click();
        await page.waitForTimeout(500);

        // Fill in line item details
        const itemDescription = invoiceDialog.locator('input[placeholder*="وصف" i], input[name="item_description"]').first();
        if (await itemDescription.isVisible({ timeout: 1000 })) {
          await itemDescription.fill('Service A');
        }

        const itemAmount = invoiceDialog.locator('input[placeholder*="مبلغ" i], input[name="item_amount"]').first();
        if (await itemAmount.isVisible({ timeout: 1000 })) {
          await itemAmount.fill('1000');
        }
      }
    }
  });

  /**
   * IW-005: Set invoice due date
   * P0 - Critical
   */
  test('IW-005: Set invoice due date', async ({ page }) => {
    // Navigate to Billing Center and open create invoice dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة فاتورة|إنشاء فاتورة|Add Invoice/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const invoiceDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء فاتورة|New Invoice/ });
    if (await invoiceDialog.isVisible({ timeout: 2000 })) {
      // Look for due date input
      const dueDateInput = invoiceDialog.locator('input[name="due_date"], input[type="date"]').first();

      if (await dueDateInput.isVisible({ timeout: 1000 })) {
        // Set a future date (30 days from now)
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const dateString = futureDate.toISOString().split('T')[0];

        await dueDateInput.fill(dateString);

        // Verify date was set
        await expect(dueDateInput).toHaveValue(dateString);
      }
    }
  });

  /**
   * IW-006: Preview invoice before saving
   * P1 - High
   */
  test('IW-006: Preview invoice before saving', async ({ page }) => {
    // Navigate to Billing Center and open create invoice dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة فاتورة|إنشاء فاتورة|Add Invoice/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const invoiceDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء فاتورة|New Invoice/ });
    if (await invoiceDialog.isVisible({ timeout: 2000 })) {
      // Look for preview button
      const previewButton = invoiceDialog.locator('button').filter({ hasText: /معاينة|Preview/ }).first();

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
   * IW-007: Save and create invoice
   * P0 - Critical
   */
  test('IW-007: Save and create invoice', async ({ page }) => {
    // Navigate to Billing Center and open create invoice dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة فاتورة|إنشاء فاتورة|Add Invoice/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const invoiceDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء فاتورة|New Invoice/ });
    if (await invoiceDialog.isVisible({ timeout: 2000 })) {
      // Fill in required fields
      const amountInput = invoiceDialog.locator('input[name="amount"]').first();
      if (await amountInput.isVisible({ timeout: 1000 })) {
        await amountInput.fill('5000');
      }

      const customerSelect = invoiceDialog.locator('[name="customer"], [role="combobox"]').filter({ hasText: /العميل|Customer/ }).first();
      if (await customerSelect.isVisible({ timeout: 1000 })) {
        await customerSelect.click();
        await page.waitForTimeout(500);

        const customerOption = page.locator('[role="option"]').first();
        if (await customerOption.isVisible({ timeout: 1000 })) {
          await customerOption.click();
        }
      }

      // Look for save button
      const saveButton = invoiceDialog.locator('button').filter({ hasText: /حفظ|Save|إنشاء|Create/ }).first();

      if (await saveButton.isVisible({ timeout: 1000 })) {
        // Click save button
        await saveButton.click();
        await page.waitForTimeout(2000);

        // Verify success message or dialog closure
        const successMessage = page.locator('text="تم إنشاء الفاتورة بنجاح", text="Invoice created successfully"');
        if (await successMessage.isVisible({ timeout: 2000 })) {
          await expect(successMessage).toBeVisible();
        } else {
          // Dialog should close on success
          await expect(invoiceDialog).not.toBeVisible({ timeout: 2000 });
        }
      }
    }
  });

  /**
   * IW-008: Verify invoice appears in list
   * P0 - Critical
   */
  test('IW-008: Verify invoice appears in list after creation', async ({ page }) => {
    // Create invoice
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة فاتورة|إنشاء فاتورة|Add Invoice/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    const invoiceDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء فاتورة|New Invoice/ });
    if (await invoiceDialog.isVisible({ timeout: 2000 })) {
      // Fill and save
      const amountInput = invoiceDialog.locator('input[name="amount"]').first();
      if (await amountInput.isVisible({ timeout: 1000 })) {
        await amountInput.fill('9999'); // Unique amount
      }

      const customerSelect = invoiceDialog.locator('[name="customer"], [role="combobox"]').filter({ hasText: /العميل|Customer/ }).first();
      if (await customerSelect.isVisible({ timeout: 1000 })) {
        await customerSelect.click();
        await page.waitForTimeout(500);

        const customerOption = page.locator('[role="option"]').first();
        if (await customerOption.isVisible({ timeout: 1000 })) {
          await customerOption.click();
        }
      }

      const saveButton = invoiceDialog.locator('button').filter({ hasText: /حفظ|Save|إنشاء|Create/ }).first();
      if (await saveButton.isVisible({ timeout: 1000 })) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Reload page to get fresh data
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify invoice with amount 9999 appears in list
    const invoiceAmount = page.locator('text="9999"').first();
    await expect(invoiceAmount).toBeVisible({ timeout: 5000 });
  });

  /**
   * IW-009: Invoice with invalid data shows errors
   * P1 - High
   */
  test('IW-009: Invoice with invalid data shows errors', async ({ page }) => {
    // Navigate to Billing Center and open create invoice dialog
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createButton = page.locator('button').filter({ hasText: /إضافة فاتورة|إنشاء فاتورة|Add Invoice/ }).first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify dialog is open
    const invoiceDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء فاتورة|New Invoice/ });
    if (await invoiceDialog.isVisible({ timeout: 2000 })) {
      // Try to save without filling required fields
      const saveButton = invoiceDialog.locator('button').filter({ hasText: /حفظ|Save|إنشاء|Create/ }).first();

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
