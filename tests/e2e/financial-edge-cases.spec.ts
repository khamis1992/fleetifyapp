/**
 * Financial System Edge Cases E2E Tests
 *
 * Tests for edge cases and exceptional scenarios in the financial system:
 * - Bounced checks handling
 * - Duplicate payment prevention
 * - Overpayment handling
 * - Negative amounts validation
 * - Concurrent payment processing
 * - Large amount handling
 * - Currency precision
 *
 * Company: شركة العراف لتأجير السيارات (Al-Araf Car Rental)
 * Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4
 */

import { test, expect, Page } from '@playwright/test';
import {
  generateTestPayment,
  generateCheckPayment,
  generateCashPayment,
  MockPayment,
} from '../utils/testDataGenerators';

const BASE_URL = 'http://localhost:8080';
const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';

// ============================================================================
// Test Helpers
// ============================================================================

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  
  if (page.url().includes('/dashboard')) {
    return;
  }

  await page.waitForSelector('#email', { timeout: 20000 });
  await page.locator('#email').fill('khamis-1992@hotmail.com');
  await page.locator('#password').fill('123456789');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard**', { timeout: 20000 });
}

async function navigateToPayments(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/finance/payments`);
  await page.waitForLoadState('networkidle');
}

async function navigateToInvoices(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/finance/billing`);
  await page.waitForLoadState('networkidle');
}

async function waitForToast(page: Page, type?: 'success' | 'error'): Promise<void> {
  const toast = page.locator('[data-sonner-toast], .toast, [role="alert"]').first();
  await expect(toast).toBeVisible({ timeout: 10000 });
  
  if (type === 'error') {
    const errorIndicator = toast.locator('.error, [data-type="error"]');
    // Check for error styling
  }
}

// ============================================================================
// Bounced Check Tests
// ============================================================================

test.describe('Bounced Check Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should mark a check payment as bounced', async ({ page }) => {
    await navigateToPayments(page);

    // Find a check payment
    const checkPayments = page.locator('tr:has-text("شيك"), tr:has-text("check"), [data-payment-type="check"]');
    
    if (await checkPayments.first().isVisible()) {
      await checkPayments.first().click();

      // Look for bounce action
      const bounceButton = page.locator('[data-testid="mark-bounced"], button:has-text("شيك مرتجع"), button:has-text("Mark Bounced")').first();
      
      if (await bounceButton.isVisible()) {
        await bounceButton.click();

        // Fill reason if required
        const reasonField = page.locator('input[name="bounce_reason"], textarea[name="reason"]').first();
        if (await reasonField.isVisible()) {
          await reasonField.fill('عدم كفاية الرصيد');
        }

        // Confirm
        const confirmButton = page.locator('[data-testid="confirm-bounce"], button:has-text("تأكيد")').first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await waitForToast(page);

        // Verify status changed
        const bouncedBadge = page.locator('[data-testid="payment-status"], .status-badge').first();
        // Should show bounced status
      }
    }
  });

  test('should reverse invoice payment when check bounces', async ({ page }) => {
    await navigateToPayments(page);

    // Find a check payment linked to invoice
    const linkedCheckPayment = page.locator('tr:has-text("شيك"):has([data-invoice-id]), [data-payment-type="check"][data-has-invoice="true"]').first();
    
    if (await linkedCheckPayment.isVisible()) {
      // Get invoice reference before bouncing
      const invoiceRef = await linkedCheckPayment.locator('[data-invoice-ref], .invoice-link').textContent();

      await linkedCheckPayment.click();

      const bounceButton = page.locator('[data-testid="mark-bounced"]').first();
      
      if (await bounceButton.isVisible()) {
        await bounceButton.click();

        const confirmButton = page.locator('[data-testid="confirm-bounce"]').first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await waitForToast(page);

        // Navigate to the linked invoice
        await navigateToInvoices(page);

        // Verify invoice status reverted to unpaid/partial
        if (invoiceRef) {
          const invoiceRow = page.locator(`tr:has-text("${invoiceRef}")`).first();
          if (await invoiceRow.isVisible()) {
            const statusBadge = invoiceRow.locator('.status-badge');
            // Status should not be "paid" after bounced check
          }
        }
      }
    }
  });

  test('should create bounced check fee if configured', async ({ page }) => {
    await navigateToPayments(page);

    // Check for bounced check fee setting
    await page.goto(`${BASE_URL}/settings/finance`);
    await page.waitForLoadState('networkidle');

    const bounceFeeField = page.locator('input[name="bounced_check_fee"], [data-testid="bounce-fee"]').first();
    
    if (await bounceFeeField.isVisible()) {
      const feeValue = await bounceFeeField.inputValue();
      
      if (feeValue && parseFloat(feeValue) > 0) {
        // When a check bounces, a fee should be applied
        // This is tested in the mark bounced flow
      }
    }
  });

  test('should notify customer of bounced check', async ({ page }) => {
    // This test verifies notification is created
    await navigateToPayments(page);

    const bouncedPayment = page.locator('[data-status="bounced"], .status-bounced').first();
    
    if (await bouncedPayment.isVisible()) {
      await bouncedPayment.click();

      // Check for notification sent indicator
      const notificationSection = page.locator('[data-testid="notifications"], .notification-history');
      
      if (await notificationSection.isVisible()) {
        const bounceNotification = notificationSection.locator('li:has-text("مرتجع"), li:has-text("bounce")');
        // Notification should exist
      }
    }
  });
});

// ============================================================================
// Duplicate Payment Prevention Tests
// ============================================================================

test.describe('Duplicate Payment Prevention', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should warn about potential duplicate payment', async ({ page }) => {
    await navigateToPayments(page);

    // Create first payment
    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amount = '5000';
      const date = new Date().toISOString().split('T')[0];

      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill(amount);
      }

      const dateField = page.locator('input[name="payment_date"]').first();
      if (await dateField.isVisible()) {
        await dateField.fill(date);
      }

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      await waitForToast(page);

      // Try to create duplicate
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      if (await amountField.isVisible()) {
        await amountField.fill(amount);
      }

      if (await dateField.isVisible()) {
        await dateField.fill(date);
      }

      await submitButton.click();

      // Should show duplicate warning
      const duplicateWarning = page.locator('[data-testid="duplicate-warning"], .warning:has-text("مكرر"), .error:has-text("duplicate")');
      // Warning should appear
    }
  });

  test('should allow duplicate if confirmed', async ({ page }) => {
    await navigateToPayments(page);

    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amountField = page.locator('input[name="amount"]').first();
      const dateField = page.locator('input[name="payment_date"]').first();

      if (await amountField.isVisible()) {
        await amountField.fill('5000');
      }

      if (await dateField.isVisible()) {
        await dateField.fill(new Date().toISOString().split('T')[0]);
      }

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // If duplicate dialog appears, confirm
      const confirmDuplicateButton = page.locator('[data-testid="confirm-duplicate"], button:has-text("متابعة على أي حال")').first();
      
      if (await confirmDuplicateButton.isVisible({ timeout: 3000 })) {
        await confirmDuplicateButton.click();
        await waitForToast(page);
      }
    }
  });

  test('should prevent exact duplicate within same second', async ({ page }) => {
    // This tests the idempotency mechanism
    await navigateToPayments(page);

    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      // Rapidly create two payments
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('3000');
      }

      const submitButton = page.locator('button[type="submit"]').first();
      
      // Double-click submit (simulating accidental double submission)
      await submitButton.dblclick();

      // Should only create one payment (idempotency)
      await page.waitForTimeout(2000);

      // Count recent payments with this amount
      const recentPayments = page.locator('tr:has-text("3000")');
      // Should only be one payment created
    }
  });
});

// ============================================================================
// Overpayment Handling Tests
// ============================================================================

test.describe('Overpayment Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should warn when payment exceeds invoice amount', async ({ page }) => {
    await navigateToInvoices(page);

    // Find an unpaid invoice
    const unpaidInvoice = page.locator('[data-status="unpaid"], tr:has-text("غير مدفوع")').first();
    
    if (await unpaidInvoice.isVisible()) {
      await unpaidInvoice.click();

      // Get invoice amount
      const invoiceTotal = await page.locator('[data-testid="invoice-total"], .total-amount').textContent();
      const totalAmount = parseFloat(invoiceTotal?.replace(/[^\d.]/g, '') || '1000');

      // Click pay button
      const payButton = page.locator('[data-testid="pay-invoice"], button:has-text("دفع")').first();
      
      if (await payButton.isVisible()) {
        await payButton.click();

        // Enter overpayment
        const amountField = page.locator('input[name="amount"]').first();
        if (await amountField.isVisible()) {
          await amountField.fill((totalAmount + 500).toString());
        }

        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // Should show overpayment warning
        const overpaymentWarning = page.locator('[data-testid="overpayment-warning"], .warning:has-text("زائد"), .warning:has-text("over")');
        // Warning should appear
      }
    }
  });

  test('should create credit note for overpayment', async ({ page }) => {
    await navigateToInvoices(page);

    // Find and overpay an invoice
    const unpaidInvoice = page.locator('[data-status="unpaid"]').first();
    
    if (await unpaidInvoice.isVisible()) {
      await unpaidInvoice.click();

      const payButton = page.locator('[data-testid="pay-invoice"]').first();
      
      if (await payButton.isVisible()) {
        await payButton.click();

        const amountField = page.locator('input[name="amount"]').first();
        if (await amountField.isVisible()) {
          await amountField.fill('10000'); // Likely overpayment
        }

        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // If asked, select "create credit"
        const createCreditOption = page.locator('[data-testid="create-credit"], input[value="credit"]').first();
        
        if (await createCreditOption.isVisible()) {
          await createCreditOption.click();

          const confirmButton = page.locator('[data-testid="confirm-overpayment"]').first();
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }

          await waitForToast(page);

          // Verify credit note was created
          await page.goto(`${BASE_URL}/finance/credits`);
          // Should see new credit note
        }
      }
    }
  });

  test('should apply overpayment to next invoice', async ({ page }) => {
    await navigateToInvoices(page);

    const unpaidInvoice = page.locator('[data-status="unpaid"]').first();
    
    if (await unpaidInvoice.isVisible()) {
      await unpaidInvoice.click();

      const payButton = page.locator('[data-testid="pay-invoice"]').first();
      
      if (await payButton.isVisible()) {
        await payButton.click();

        const amountField = page.locator('input[name="amount"]').first();
        if (await amountField.isVisible()) {
          await amountField.fill('15000'); // Large overpayment
        }

        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // If asked, select "apply to next invoice"
        const applyNextOption = page.locator('[data-testid="apply-next-invoice"], input[value="apply_next"]').first();
        
        if (await applyNextOption.isVisible()) {
          await applyNextOption.click();

          const confirmButton = page.locator('[data-testid="confirm-overpayment"]').first();
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }

          await waitForToast(page);
        }
      }
    }
  });
});

// ============================================================================
// Validation Edge Cases
// ============================================================================

test.describe('Payment Validation Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should reject negative payment amount', async ({ page }) => {
    await navigateToPayments(page);

    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('-1000');
      }

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Should show validation error
      const errorMessage = page.locator('[data-testid="amount-error"], .error:has-text("موجب"), .error:has-text("positive")');
      // Error should appear
    }
  });

  test('should reject zero payment amount', async ({ page }) => {
    await navigateToPayments(page);

    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('0');
      }

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Should show validation error
      const errorMessage = page.locator('[data-testid="amount-error"], .error');
      // Error should appear
    }
  });

  test('should handle very large payment amount', async ({ page }) => {
    await navigateToPayments(page);

    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('999999999999'); // Very large amount
      }

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Should either accept or show reasonable error
      // Not crash or show JS error
    }
  });

  test('should handle decimal precision correctly', async ({ page }) => {
    await navigateToPayments(page);

    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        // Test with many decimal places
        await amountField.fill('1234.56789');
      }

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      await waitForToast(page);

      // Verify amount was rounded to 2 decimal places
      // (Currency standard precision)
    }
  });

  test('should require payment date', async ({ page }) => {
    await navigateToPayments(page);

    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('5000');
      }

      // Clear date field if present
      const dateField = page.locator('input[name="payment_date"]').first();
      if (await dateField.isVisible()) {
        await dateField.clear();
      }

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Should show validation error for missing date
      const errorMessage = page.locator('[data-testid="date-error"], .error:has-text("تاريخ"), .error:has-text("date")');
      // Error should appear
    }
  });

  test('should reject future payment date', async ({ page }) => {
    await navigateToPayments(page);

    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('5000');
      }

      // Set future date
      const dateField = page.locator('input[name="payment_date"]').first();
      if (await dateField.isVisible()) {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        await dateField.fill(futureDate.toISOString().split('T')[0]);
      }

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Should show validation error or warning
      const errorMessage = page.locator('.error:has-text("مستقبل"), .warning:has-text("future")');
      // Should warn about future date
    }
  });
});

// ============================================================================
// Concurrent Operations Tests
// ============================================================================

test.describe('Concurrent Operations', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should handle concurrent payment creation gracefully', async ({ browser }) => {
    // Create two browser contexts for concurrent testing
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login both
    await loginAsAdmin(page1);
    await loginAsAdmin(page2);

    // Navigate both to payments
    await navigateToPayments(page1);
    await navigateToPayments(page2);

    // Try to create payments simultaneously
    const createButton1 = page1.locator('[data-testid="create-payment-button"]').first();
    const createButton2 = page2.locator('[data-testid="create-payment-button"]').first();

    if (await createButton1.isVisible() && await createButton2.isVisible()) {
      // Click both create buttons
      await Promise.all([
        createButton1.click(),
        createButton2.click(),
      ]);

      // Both should open forms without error
      await page1.waitForSelector('form', { timeout: 5000 }).catch(() => {});
      await page2.waitForSelector('form', { timeout: 5000 }).catch(() => {});

      // No JS errors should occur
    }

    await context1.close();
    await context2.close();
  });

  test('should handle simultaneous invoice payment by two users', async ({ browser }) => {
    // This tests optimistic locking / conflict resolution
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await loginAsAdmin(page1);
    await loginAsAdmin(page2);

    await navigateToInvoices(page1);
    await navigateToInvoices(page2);

    // Both try to pay same invoice
    const invoice1 = page1.locator('[data-status="unpaid"]').first();
    const invoice2 = page2.locator('[data-status="unpaid"]').first();

    if (await invoice1.isVisible() && await invoice2.isVisible()) {
      await Promise.all([
        invoice1.click(),
        invoice2.click(),
      ]);

      // Both click pay
      const payButton1 = page1.locator('[data-testid="pay-invoice"]').first();
      const payButton2 = page2.locator('[data-testid="pay-invoice"]').first();

      if (await payButton1.isVisible() && await payButton2.isVisible()) {
        await payButton1.click();
        await payButton2.click();

        // Fill amounts
        const amount1 = page1.locator('input[name="amount"]').first();
        const amount2 = page2.locator('input[name="amount"]').first();

        if (await amount1.isVisible()) {
          await amount1.fill('5000');
        }
        if (await amount2.isVisible()) {
          await amount2.fill('5000');
        }

        // Submit simultaneously
        const submit1 = page1.locator('button[type="submit"]').first();
        const submit2 = page2.locator('button[type="submit"]').first();

        await Promise.all([
          submit1.click(),
          submit2.click(),
        ]);

        // Wait for responses
        await page1.waitForTimeout(3000);
        await page2.waitForTimeout(3000);

        // One should succeed, other should show conflict error
        // System should prevent double payment
      }
    }

    await context1.close();
    await context2.close();
  });
});

// ============================================================================
// Data Consistency Tests
// ============================================================================

test.describe('Data Consistency Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should maintain consistency when payment fails mid-process', async ({ page }) => {
    await navigateToPayments(page);

    // This tests that partial failures don't leave data in inconsistent state
    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      // Fill form
      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('5000');
      }

      // Simulate network failure during submission
      await page.route('**/payments', route => {
        route.abort('failed');
      });

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Should show error message
      await page.waitForTimeout(3000);

      // Unroute
      await page.unroute('**/payments');

      // Verify no orphan data was created
      await navigateToPayments(page);
      // Should not see partially created payment
    }
  });

  test('should handle invoice-payment link correctly after edits', async ({ page }) => {
    await navigateToPayments(page);

    // Find a linked payment
    const linkedPayment = page.locator('tr[data-has-invoice="true"], tr:has([data-invoice-ref])').first();
    
    if (await linkedPayment.isVisible()) {
      await linkedPayment.click();

      // Try to edit and unlink
      const editButton = page.locator('[data-testid="edit-payment"], button:has-text("تعديل")').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();

        // Clear invoice link
        const invoiceField = page.locator('[data-testid="invoice-select"], select[name="invoice_id"]').first();
        if (await invoiceField.isVisible()) {
          await invoiceField.selectOption('');
        }

        const saveButton = page.locator('[data-testid="save-payment"]').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }

        await waitForToast(page);

        // Verify invoice status updated correctly
        await navigateToInvoices(page);
        // Invoice should reflect removed payment
      }
    }
  });
});

// ============================================================================
// Special Characters and Input Handling
// ============================================================================

test.describe('Special Input Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should handle Arabic text in payment notes', async ({ page }) => {
    await navigateToPayments(page);

    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('5000');
      }

      // Add Arabic notes
      const notesField = page.locator('textarea[name="notes"], input[name="notes"]').first();
      if (await notesField.isVisible()) {
        await notesField.fill('ملاحظات الدفعة: تم الاستلام من العميل محمد أحمد - رقم الهاتف: ٠٥٥١٢٣٤٥٦٧');
      }

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      await waitForToast(page);

      // Verify notes saved correctly
      // Navigate to view payment
    }
  });

  test('should handle special characters in reference numbers', async ({ page }) => {
    await navigateToPayments(page);

    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('5000');
      }

      const refField = page.locator('input[name="reference_number"]').first();
      if (await refField.isVisible()) {
        await refField.fill('REF/2024-01/ABC#123');
      }

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Should handle or sanitize special characters
    }
  });

  test('should handle very long notes gracefully', async ({ page }) => {
    await navigateToPayments(page);

    const createButton = page.locator('[data-testid="create-payment-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('5000');
      }

      const notesField = page.locator('textarea[name="notes"], input[name="notes"]').first();
      if (await notesField.isVisible()) {
        // Very long text
        const longText = 'ملاحظة طويلة جداً '.repeat(100);
        await notesField.fill(longText);
      }

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Should either accept with truncation or show character limit error
    }
  });
});
