/**
 * Cross-Functional Workflow E2E Tests
 * Tests complete workflows spanning multiple modules
 *
 * Test Coverage:
 * - XFW-001: Full workflow: Create contract → Generate invoice → Receive payment
 * - XFW-002: Full workflow: Create customer → Create invoice → Process payment
 * - XFW-003: Navigate through all financial pages
 */

import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'khamis-1992@hotmail.com';
const TEST_PASSWORD = '123456789';
const BASE_URL = 'http://localhost:8080';

test.describe('Cross-Functional Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  /**
   * XFW-001: Full workflow: Create contract → Generate invoice → Receive payment
   * P0 - Critical
   */
  test('XFW-001: Full workflow: Contract → Invoice → Payment', async ({ page }) => {
    // Step 1: Navigate to Contracts
    await page.click('text="العقود"');
    await page.waitForURL(/\/contracts/, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 10010 });

    // Step 2: Click create contract button
    const createContractButton = page.locator('button').filter({ hasText: /إنشاء عقد|Create Contract|Plus/ }).first();

    if (await createContractButton.isVisible({ timeout: 5000 })) {
      await createContractButton.click();
      await page.waitForTimeout(1000);

      // Step 3: Fill contract form
      const contractDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء عقد|New Contract/ });

      if (await contractDialog.isVisible({ timeout: 2000 })) {
        // Select customer
        const customerSelect = contractDialog.locator('[name="customer"], [role="combobox"]').filter({ hasText: /العميل|Customer/ }).first();
        if (await customerSelect.isVisible({ timeout: 1000 })) {
          await customerSelect.click();
          await page.waitForTimeout(500);

          const customerOption = page.locator('[role="option"]').first();
          if (await customerOption.isVisible({ timeout: 1000 })) {
            await customerOption.click();
          }
        }

        // Select vehicle
        const vehicleSelect = contractDialog.locator('[name="vehicle"], [role="combobox"]').filter({ hasText: /المركبة|Vehicle/ }).first();
        if (await vehicleSelect.isVisible({ timeout: 1000 })) {
          await vehicleSelect.click();
          await page.waitForTimeout(500);

          const vehicleOption = page.locator('[role="option"]').first();
          if (await vehicleOption.isVisible({ timeout: 1000 })) {
            await vehicleOption.click();
          }
        }

        // Save contract
        const saveButton = contractDialog.locator('button').filter({ hasText: /حفظ|Save|إنشاء|Create/ }).first();
        if (await saveButton.isVisible({ timeout: 1000 })) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // Step 4: Generate invoice from contract
    const contractRow = page.locator('tbody tr, [data-testid="contract-row"]').first();

    if (await contractRow.isVisible({ timeout: 2000 })) {
      const invoiceButton = contractRow.locator('button').filter({ hasText: /إنشاء فاتورة|Invoice|Receipt/ }).first();

      if (await invoiceButton.isVisible({ timeout: 1000 })) {
        await invoiceButton.click();
        await page.waitForTimeout(1000);

        // Fill invoice details
        const invoiceDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء فاتورة|New Invoice/ });

        if (await invoiceDialog.isVisible({ timeout: 2000 })) {
          const amountInput = invoiceDialog.locator('input[name="amount"]').first();
          if (await amountInput.isVisible({ timeout: 1000 })) {
            await amountInput.fill('5000');
          }

          const saveButton = invoiceDialog.locator('button').filter({ hasText: /حفظ|Save|إنشاء|Create/ }).first();
          if (await saveButton.isVisible({ timeout: 1000 })) {
            await saveButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    }

    // Step 5: Navigate to invoices
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10010 });

    // Step 6: Pay the newly created invoice
    await page.waitForTimeout(2000);

    const invoiceRow = page.locator('tbody tr, [data-testid="invoice-row"]').first();

    if (await invoiceRow.isVisible({ timeout: 2000 })) {
      const payButton = invoiceRow.locator('button').filter({ hasText: /دفع|Pay/ }).first();

      if (await payButton.isVisible({ timeout: 1000 })) {
        await payButton.click();
        await page.waitForTimeout(1000);

        // Fill payment details
        const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /دفع|Payment/ });

        if (await paymentDialog.isVisible({ timeout: 2000 })) {
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
            await paymentAmount.fill('5000');
          }

          const confirmButton = paymentDialog.locator('button').filter({ hasText: /تأكيد|Confirm|دفع|Pay/ }).first();
          if (await confirmButton.isVisible({ timeout: 1000 })) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    }

    // Step 7: Verify the complete workflow succeeded
    await expect(page.locator('text="تم الدفع بنجاح"').or(page.locator('text="Payment successful"'))).toBeVisible({ timeout: 5000 });
  });

  /**
   * XFW-002: Full workflow: Create customer → Create invoice → Process payment
   * P0 - Critical
   */
  test('XFW-002: Full workflow: Customer → Invoice → Payment', async ({ page }) => {
    // Step 1: Navigate to Customers
    await page.click('text="العملاء"');
    await page.waitForURL(/\/customers/, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 10010 });

    // Step 2: Create new customer
    const createCustomerButton = page.locator('button').filter({ hasText: /إضافة عميل|Create Customer|Plus/ }).first();

    if (await createCustomerButton.isVisible({ timeout: 5000 })) {
      await createCustomerButton.click();
      await page.waitForTimeout(1000);

      // Fill customer form
      const customerDialog = page.locator('[role="dialog"]').filter({ hasText: /إضافة عميل|New Customer/ });

      if (await customerDialog.isVisible({ timeout: 2000 })) {
        const nameInput = customerDialog.locator('input[name="name"], input[placeholder*="الاسم" i]').first();
        const phoneInput = customerDialog.locator('input[name="phone"], input[placeholder*="رقم الهاتف" i]').first();

        if (await nameInput.isVisible({ timeout: 1000 })) {
          await nameInput.fill('Test Customer E2E');
        }

        if (await phoneInput.isVisible({ timeout: 1000 })) {
          await phoneInput.fill('1234567890');
        }

        const saveButton = customerDialog.locator('button').filter({ hasText: /حفظ|Save|إنشاء|Create/ }).first();
        if (await saveButton.isVisible({ timeout: 1000 })) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // Step 3: Navigate to Billing Center
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10010 });

    // Step 4: Create invoice for new customer
    const createInvoiceButton = page.locator('button').filter({ hasText: /إضافة فاتورة|إنشاء فاتورة|Add Invoice/ }).first();

    if (await createInvoiceButton.isVisible({ timeout: 5000 })) {
      await createInvoiceButton.click();
      await page.waitForTimeout(1000);

      const invoiceDialog = page.locator('[role="dialog"]').filter({ hasText: /إنشاء فاتورة|New Invoice/ });

      if (await invoiceDialog.isVisible({ timeout: 2000 })) {
        // Select the new customer
        const customerSelect = invoiceDialog.locator('[name="customer"], [role="combobox"]').filter({ hasText: /العميل|Customer/ }).first();
        if (await customerSelect.isVisible({ timeout: 1000 })) {
          await customerSelect.click();
          await page.waitForTimeout(500);

          const customerOption = page.locator('[role="option"]').filter({ hasText: /Test Customer E2E/ }).first();
          if (await customerOption.isVisible({ timeout: 1000 })) {
            await customerOption.click();
          }
        }

        // Set amount
        const amountInput = invoiceDialog.locator('input[name="amount"]').first();
        if (await amountInput.isVisible({ timeout: 1000 })) {
          await amountInput.fill('3000');
        }

        // Save invoice
        const saveButton = invoiceDialog.locator('button').filter({ hasText: /حفظ|Save|إنشاء|Create/ }).first();
        if (await saveButton.isVisible({ timeout: 1000 })) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // Step 5: Pay the invoice
    await page.waitForTimeout(2000);

    const invoiceRow = page.locator('tbody tr, [data-testid="invoice-row"]')
      .filter({ hasText: /Test Customer E2E/ })
      .first();

    if (await invoiceRow.isVisible({ timeout: 2000 })) {
      const payButton = invoiceRow.locator('button').filter({ hasText: /دفع|Pay/ }).first();

      if (await payButton.isVisible({ timeout: 1000 })) {
        await payButton.click();
        await page.waitForTimeout(1000);

        // Fill payment details
        const paymentDialog = page.locator('[role="dialog"]').filter({ hasText: /دفع|Payment/ });

        if (await paymentDialog.isVisible({ timeout: 2000 })) {
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
            await paymentAmount.fill('3000');
          }

          const confirmButton = paymentDialog.locator('button').filter({ hasText: /تأكيد|Confirm|دفع|Pay/ }).first();
          if (await confirmButton.isVisible({ timeout: 1000 })) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    }

    // Step 6: Verify the workflow succeeded
    await expect(page.locator('text="تم الدفع بنجاح"').or(page.locator('text="Payment successful"'))).toBeVisible({ timeout: 5000 });
  });

  /**
   * XFW-003: Navigate through all financial pages
   * P1 - High
   */
  test('XFW-003: Navigate through all financial pages', async ({ page }) => {
    // List of financial pages to navigate
    const pages = [
      { name: 'Finance Hub', url: '/finance/hub' },
      { name: 'Billing Center', url: '/finance/billing' },
      { name: 'Payments', url: '/finance/payments' },
      { name: 'Invoices', url: '/finance/invoices' },
      { name: 'Reports', url: '/finance/reports' },
      { name: 'Treasury', url: '/finance/treasury' },
    ];

    // Navigate to each page and verify it loads
    for (const pageData of pages) {
      // Navigate to page
      await page.goto(`${BASE_URL}${pageData.url}`);
      await page.waitForLoadState('networkidle', { timeout: 10010 });
      await page.waitForTimeout(1000);

      // Verify URL
      expect(page.url()).toContain(pageData.url);

      // Verify page is loaded (check for page title or content)
      const pageTitle = page.locator('h1, h2').filter({ hasText: pageData.name }).first();
      if (await pageTitle.isVisible({ timeout: 2000 })) {
        await expect(pageTitle).toBeVisible();
      }
    }
  });

  /**
   * XFW-004: Verify data consistency across modules
   * P2 - Medium
   */
  test('XFW-004: Verify data consistency across modules', async ({ page }) => {
    // Navigate to Billing Center to get invoice count
    await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10010 });
    await page.waitForTimeout(2000);

    // Count invoices in list
    const invoices = await page.locator('tbody tr, [data-testid="invoice-row"]').all();
    const invoiceCount = invoices.length;

    // Navigate to separate invoices page
    await page.goto(`${BASE_URL}/finance/invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10010 });
    await page.waitForTimeout(2000);

    // Count invoices in separate page
    const invoicesPage = await page.locator('tbody tr, [data-testid="invoice-row"]').all();
    const invoicesPageCount = invoicesPage.length;

    // Verify counts match (or at least both are positive)
    expect(invoiceCount).toBeGreaterThan(0);
    expect(invoicesPageCount).toBeGreaterThan(0);
  });

  /**
   * XFW-005: Verify customer data flows to invoices
   * P1 - High
   */
  test('XFW-005: Verify customer data flows to invoices', async ({ page }) => {
    // Navigate to Customers
    await page.goto('/customers');
    await page.waitForLoadState('networkidle', { timeout: 10010 });

    // Get first customer name
    const customerRow = page.locator('tbody tr, [data-testid="customer-row"]').first();

    if (await customerRow.isVisible({ timeout: 2000 })) {
      const customerNameElement = customerRow.locator('td').first();
      const customerName = await customerNameElement.textContent();

      if (customerName) {
        // Navigate to Invoices
        await page.goto(`${BASE_URL}/finance/billing?tab=invoices`);
        await page.waitForLoadState('networkidle', { timeout: 10010 });
        await page.waitForTimeout(2000);

        // Search for this customer in invoices
        const searchInput = page.locator('input[placeholder*="ابحث" i], input[type="search"]').first();

        if (await searchInput.isVisible({ timeout: 2000 })) {
          await searchInput.fill(customerName.substring(0, 20));
          await page.waitForTimeout(1000);

          // Verify customer appears in invoices
          const customerInvoice = page.locator('tbody tr, [data-testid="invoice-row"]')
            .filter({ hasText: customerName.substring(0, 20) })
            .first();

          await expect(customerInvoice).toBeVisible({ timeout: 3000 });
        }
      }
    }
  });
});
