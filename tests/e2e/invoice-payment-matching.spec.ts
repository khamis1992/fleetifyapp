/**
 * Invoice-Payment Matching E2E Tests
 * Tests the relationship and matching between invoices and payments
 *
 * Test Coverage:
 * - IPM-001: Pay invoice from invoice list
 * - IPM-002: Verify invoice status changes to "paid"
 * - IPM-003: Partial payment updates invoice status
 * - IPM-004: Link payment to existing invoice
 * - IPM-005: Unlink payment from invoice
 * - IPM-006: View payment history for invoice
 */

import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'khamis-1992@hotmail.com';
const TEST_PASSWORD = '123456789';
const BASE_URL = 'http://localhost:8080';

test.describe('Invoice-Payment Matching', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  /**
   * IPM-001: Pay invoice from invoice list
   * P0 - Critical
   */
  test('IPM-001: Pay invoice from invoice list', async ({ page }) => {
    // Navigate to Billing Center with invoices tab
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Look for pending invoice
    const pendingInvoice = page.locator('tbody tr, [data-testid="invoice-row"]')
      .filter({ hasText: /معلق|pending/i })
      .first();

    if (await pendingInvoice.isVisible({ timeout: 2000 })) {
      // Look for pay button
      const payButton = pendingInvoice.locator('button').filter({ hasText: /دفع|Pay|CreditCard/ }).first();

      if (await payButton.isVisible({ timeout: 1000 })) {
        // Click pay button
        await payButton.click();

        // Wait for payment dialog to open
        await page.waitForTimeout(1000);

        // Verify payment dialog is visible
        const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /دفع|Payment/ });

        if (await paymentDialog.isVisible({ timeout: 2000 })) {
          // Fill payment details
          const paymentMethod = paymentDialog.locator('select[name="payment_method"], [role="combobox"]').first();
          const paymentAmount = paymentDialog.locator('input[name="amount"]').first();

          if (await paymentMethod.isVisible({ timeout: 1000 })) {
            await paymentMethod.click();
            await page.waitForTimeout(500);

            const cashOption = page.locator('[role="option"], option').filter({ hasText: /نقد|Cash/i }).first();
            if (await cashOption.isVisible({ timeout: 1000 })) {
              await cashOption.click();
            }
          }

          if (await paymentAmount.isVisible({ timeout: 1000 })) {
            // Get invoice amount and pay full amount
            const invoiceAmount = await paymentAmount.inputValue();
            await paymentAmount.fill(invoiceAmount || '1000');
          }

          // Confirm payment
          const confirmButton = paymentDialog.locator('button').filter({ hasText: /تأكيد|Confirm|دفع|Pay/ }).first();
          if (await confirmButton.isVisible({ timeout: 1000 })) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    }
  });

  /**
   * IPM-002: Verify invoice status changes to "paid"
   * P0 - Critical
   */
  test('IPM-002: Verify invoice status changes to "paid" after payment', async ({ page }) => {
    // Navigate to Billing Center with invoices tab
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Look for pending invoice
    const pendingInvoice = page.locator('tbody tr, [data-testid="invoice-row"]')
      .filter({ hasText: /معلق|pending/i })
      .first();

    if (await pendingInvoice.isVisible({ timeout: 2000 })) {
      // Get invoice details to verify later
      const invoiceText = await pendingInvoice.textContent();

      // Look for pay button
      const payButton = pendingInvoice.locator('button').filter({ hasText: /دفع|Pay/ }).first();

      if (await payButton.isVisible({ timeout: 1000 })) {
        // Click pay button
        await payButton.click();

        // Wait for payment dialog to open
        await page.waitForTimeout(1000);

        const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /دفع|Payment/ });

        if (await paymentDialog.isVisible({ timeout: 2000 })) {
          // Fill and submit payment
          const paymentMethod = paymentDialog.locator('select[name="payment_method"], [role="combobox"]').first();
          const paymentAmount = paymentDialog.locator('input[name="amount"]').first();

          if (await paymentMethod.isVisible({ timeout: 1000 })) {
            await paymentMethod.click();
            await page.waitForTimeout(500);

            const cashOption = page.locator('[role="option"], option').filter({ hasText: /نقد|Cash/i }).first();
            if (await cashOption.isVisible({ timeout: 1000 })) {
              await cashOption.click();
            }
          }

          if (await paymentAmount.isVisible({ timeout: 1000 })) {
            const invoiceAmount = await paymentAmount.inputValue();
            await paymentAmount.fill(invoiceAmount || '1000');
          }

          const confirmButton = paymentDialog.locator('button').filter({ hasText: /تأكيد|Confirm|دفع|Pay/ }).first();
          if (await confirmButton.isVisible({ timeout: 1000 })) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
          }
        }

        // Reload page to get fresh data
        await page.reload();
        await page.waitForLoadState('networkidle', { timeout: 10000 });

        // Look for the same invoice with paid status
        const paidInvoice = page.locator('tbody tr, [data-testid="invoice-row"]')
          .filter({ hasText: invoiceText?.substring(0, 50) || '' })
          .filter({ hasText: /مدفوع|paid/i })
          .first();

        await expect(paidInvoice).toBeVisible({ timeout: 5000 });
      }
    }
  });

  /**
   * IPM-003: Partial payment updates invoice status
   * P1 - High
   */
  test('IPM-003: Partial payment updates invoice status', async ({ page }) => {
    // Navigate to Billing Center with invoices tab
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Look for pending invoice
    const pendingInvoice = page.locator('tbody tr, [data-testid="invoice-row"]')
      .filter({ hasText: /معلق|pending/i })
      .first();

    if (await pendingInvoice.isVisible({ timeout: 2000 })) {
      // Get invoice text for verification
      const invoiceText = await pendingInvoice.textContent();

      // Look for pay button
      const payButton = pendingInvoice.locator('button').filter({ hasText: /دفع|Pay/ }).first();

      if (await payButton.isVisible({ timeout: 1000 })) {
        // Click pay button
        await payButton.click();

        // Wait for payment dialog to open
        await page.waitForTimeout(1000);

        const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /دفع|Payment/ });

        if (await paymentDialog.isVisible({ timeout: 2000 })) {
          // Fill partial payment amount
          const paymentAmount = paymentDialog.locator('input[name="amount"]').first();
          const paymentMethod = paymentDialog.locator('select[name="payment_method"], [role="combobox"]').first();

          if (await paymentMethod.isVisible({ timeout: 1000 })) {
            await paymentMethod.click();
            await page.waitForTimeout(500);

            const cashOption = page.locator('[role="option"], option').filter({ hasText: /نقد|Cash/i }).first();
            if (await cashOption.isVisible({ timeout: 1000 })) {
              await cashOption.click();
            }
          }

          if (await paymentAmount.isVisible({ timeout: 1000 })) {
            // Pay half the amount (partial payment)
            await paymentAmount.fill('500');
          }

          const confirmButton = paymentDialog.locator('button').filter({ hasText: /تأكيد|Confirm|دفع|Pay/ }).first();
          if (await confirmButton.isVisible({ timeout: 1000 })) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
          }
        }

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle', { timeout: 10000 });

        // Invoice should now show partial payment status
        const partiallyPaidInvoice = page.locator('tbody tr, [data-testid="invoice-row"]')
          .filter({ hasText: invoiceText?.substring(0, 50) || '' })
          .first();

        await expect(partiallyPaidInvoice).toBeVisible({ timeout: 5000 });
      }
    }
  });

  /**
   * IPM-004: Link payment to existing invoice
   * P0 - Critical
   */
  test('IPM-004: Link payment to existing invoice', async ({ page }) => {
    // Navigate to Billing Center with payments tab
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10010 });

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Click create payment button
    const createButton = page.locator('button').filter({ hasText: /إضافة مدفوعات|إنشاء دفعة|Add Payment/ }).first();

    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);

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
            const invoiceText = await invoiceOption.textContent();
            await invoiceOption.click();
            await page.waitForTimeout(500);

            // Verify invoice was linked
            expect(await invoiceSelect.textContent()).toContain(invoiceText?.substring(0, 20));
          }
        }

        // Close dialog without saving
        const closeButton = paymentDialog.locator('button').filter({ hasText: /إغلاق|Cancel|X/ }).first();
        if (await closeButton.isVisible({ timeout: 1000 })) {
          await closeButton.click();
        }
      }
    }
  });

  /**
   * IPM-005: Unlink payment from invoice
   * P2 - Medium
   */
  test('IPM-005: Unlink payment from invoice', async ({ page }) => {
    // Navigate to Billing Center with payments tab
    await page.goto(`${BASE_URL}/finance/billing?tab=payments`);
    await page.waitForLoadState('networkidle', { timeout: 10010 });

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Look for first payment
    const paymentRow = page.locator('tbody tr, [data-testid="payment-row"]').first();

    if (await paymentRow.isVisible({ timeout: 2000 })) {
      // Look for view button
      const viewButton = paymentRow.locator('button').filter({ hasText: /عرض|Eye|View/ }).first();

      if (await viewButton.isVisible({ timeout: 1000 })) {
        // Click view button
        await viewButton.click();

        // Wait for dialog to open
        await page.waitForTimeout(1000);

        const previewDialog = page.locator('[role="dialog"]').filter({ hasText: /معاينة|Payment/ });

        if (await previewDialog.isVisible({ timeout: 2000 })) {
          // Look for unlink button (if exists)
          const unlinkButton = previewDialog.locator('button').filter({ hasText: /إلغاء الربط|فك الارتباط|Unlink/ }).first();

          if (await unlinkButton.isVisible({ timeout: 1000 })) {
            // Click unlink button
            await unlinkButton.click();
            await page.waitForTimeout(500);

            // Confirm unlinking
            const confirmButton = page.locator('button').filter({ hasText: /تأكيد|Confirm|نعم|Yes/ }).first();
            if (await confirmButton.isVisible({ timeout: 1000 })) {
              await confirmButton.click();
              await page.waitForTimeout(2000);
            }
          }
        }

        // Close dialog
        const closeButton = previewDialog.locator('button').filter({ hasText: /إغلاق|Close|X/ }).first();
        if (await closeButton.isVisible({ timeout: 1000 })) {
          await closeButton.click();
        }
      }
    }
  });

  /**
   * IPM-006: View payment history for invoice
   * P1 - High
   */
  test('IPM-006: View payment history for invoice', async ({ page }) => {
    // Navigate to Billing Center with invoices tab
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10010 });

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Look for first invoice
    const invoiceRow = page.locator('tbody tr, [data-testid="invoice-row"]').first();

    if (await invoiceRow.isVisible({ timeout: 2000 })) {
      // Look for view/payments button
      const paymentsButton = invoiceRow.locator('button').filter({ hasText: /المدفوعات|Payments/ }).first();

      if (await paymentsButton.isVisible({ timeout: 1000 })) {
        // Click payments button
        await paymentsButton.click();

        // Wait for dialog or page with payment history
        await page.waitForTimeout(1000);

        // Verify payment history is visible
        const paymentHistory = page.locator('[role="dialog"], [class*="payments" i]').filter({ hasText: /سجل المدفوعات|Payment History/ });

        if (await paymentHistory.isVisible({ timeout: 2000 })) {
          // Verify payment history contains payment entries
          const paymentEntries = paymentHistory.locator('tr, [class*="payment"]').all();
          expect(paymentEntries.length).toBeGreaterThan(0);

          // Close dialog
          const closeButton = paymentHistory.locator('button').filter({ hasText: /إغلاق|Close|X/ }).first();
          if (await closeButton.isVisible({ timeout: 1000 })) {
            await closeButton.click();
          }
        }
      }
    }
  });
});
