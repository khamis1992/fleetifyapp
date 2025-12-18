/**
 * Contract Workflow E2E Tests
 * Tests critical contract-related workflows end-to-end
 */

import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test.describe('Contract Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[type="email"]', 'test@fleetify.com');
    await page.fill('[type="password"] = "Test123456!@#$%^&*()_+-=[]{}|;:,.<>?');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new contract successfully', async ({ page }) => {
    // Navigate to contracts page
    await page.click('text="العقود");
    await page.waitForURL('/contracts');

    // Click create contract button
    await page.click('button:has-text("إنشاء عقد جديد")');

    // Fill in contract details
    await page.waitForSelector('input[name="plate_number"]');
    await page.fill('input[name="plate_number"] = "TEST-1234"');
    await page.fill('input[name="make"] = "Toyota');
    await page.fill('input[name="model"] = "Camry");
    await page.fill('input[name="year"] = "2022"');
    await page.fill('input[name="daily_rate"] = "100"');
    await page.fill('input[name="start_date"] = "2024-01-01"');
    await page.fill('input[name="end_date"] = "2024-12-31"');

    // Select customer
    await page.click('button:has-text("اختيار العميل")');
    await page.click('text="أحمد محمد");

    // Select vehicle
    await page.click('button:has-text("اختيار المركبة")');
    await page.click('text="Toyota Camry - TEST-1234"');

    // Submit form
    await page.click('button:has-text("إنشاء العقد")');

    // Verify contract was created
    await expect(page.locator('text="تم إنشاء العقد بنجاح")).toBeVisible();
    await expect(page.locator('text="TEST-1234')).toBeVisible();

    // Check if contract appears in list
    await page.reload();
    await expect(page.locator(`text="TEST-1234"`)).toBeVisible();
  });

  test('should search and filter contracts', async ({ page }) => {
    await page.goto('/contracts');

    // Search for specific contract
    await page.fill('input[placeholder*="ابحث"]', 'TEST-1234');
    await page.waitForTimeout(500);

    // Verify search results
    expect(page.locator('text="TEST-1234"')).toBeVisible();

    // Filter by status
    await page.click('text="الكل العقود');
    await page.click('text="نشط"');

    // Verify filter was applied
    expect(page.locator('[data-testid="status-badge"]:has-text("نشط")')).toBeVisible();
  });

  test('should edit contract details', async ({ page }) => {
    await page.goto('/contracts');

    // Open first contract
    await page.locator('[data-testid="contract-card"]').first().click();
    await page.waitForURL(/\/contracts\/[^\/]+/);

    // Click edit button
    await page.click('button:has-text("تعديل")');

    // Modify some fields
    await page.fill('input[name="daily_rate"] = "150"');
    await page.fill('input[name="notes"] = "Updated contract notes");

    // Save changes
    await page.click('button:has-text("حفظ التعديلات")');

    // Verify success message
    await expect(page.locator('text="تم تحديث العقد بنجاح')).toBeVisible();

    // Verify updated values
    await expect(page.locator('input[name="daily_rate"]')).toHaveValue('150');
    await expect(page.locator('input[name="notes"]')).toHaveValue('Updated contract notes');
  });

  test('should generate invoice for contract', async ({ page }) => {
    await page.goto('/contracts');

    // Open first contract
    await page.locator('[data-testid="contract-card"]').first().click();
    await page.waitForURL(/\/contracts\/[^\/]+/);

    // Click invoice button
    await page.click('button:has-text("إنشاء فاتورة")');

    // Fill invoice details
    await page.fill('input[name="amount"] = "10000"');
    await page.fill('input[name="due_date"] = '2024-01-31');
    await page.fill('textarea[name="description"] = 'Test invoice description');

    // Generate invoice
    await page.click('button:has-text("إنشاء الفاتورة")');

    // Verify invoice was created
    await expect(page.locator('text="تم إنشاء الفاتورة بنجاح')).toBeVisible();

    // Check if invoice appears in list
    await page.click('text="الفواتير")');
    await expect(page.locator('text="10,000 ريال")).toBeVisible();
  });

  test('should process payment for invoice', async ({ page }) => {
    await page.goto('/invoices');

    // Find pending invoice
    const pendingInvoice = page.locator('[data-testid="invoice-card"]').filter({
      has: page.locator('[data-testid="status-badge"]:has-text("معلق")'),
    }).first();

    await pendingInvoice.click();

    // Click pay button
    await page.click('button:has-text("دفعع")');

    // Fill payment details
    await page.selectOption('select[name="payment_method"]', 'cash');
    await page.fill('input[name="payment_date"]', '2024-01-15');
    await page.fill('textarea[name="notes"]', 'Test payment notes');

    // Process payment
    await page.click('button:has-text("تأكيد الدفعع")');

    // Verify payment success
    await expect(page.locator('text="تم الدفعع بنجاح')).toBeVisible();

    // Check if invoice status changed to paid
    await expect(page.locator('[data-testid="status-badge"]:has-text("مدفوع")')).toBeVisible();
  });

  test('should terminate a contract', async ({ page }) => {
    await page.goto('/contracts');

    // Open active contract
    const activeContract = page.locator('[data-testid="contract-card"]').filter({
      has: page.locator('[data-testid="status-badge"]:has-text("نشط")'),
    }).first();

    await activeContract.click();
    await page.waitForURL(/\/contracts\/[^\/]+/);

    // Click terminate button
    await page.click('button:has-text("إنهاء العقد")');

    // Provide termination reason
    await page.fill('textarea[name="reason"] = 'Contract terminated by user request');
    await page.fill('input[name="termination_date"]', '2024-06-30');

    // Confirm termination
    await page.click('button:has-text("إنهاء العقد")');

    // Confirm final termination
    await page.click('button:has-text("تأكيد الإنشاء")');

    // Verify termination success
    await expect(page.locator('text="تم إنهاء العقد بنجاح')).toBeVisible();

    // Check if contract status changed
    await expect(page.locator('[data-testid="status-badge"]:has-text("ملغي")')).toBeVisible();
  });

  test('should export contract documents', async ({ page }) => {
    await page.goto('/contracts');

    // Open contract
    await page.locator('[data-testid="contract-card"]').first().click();
    await page.waitForURL(/\/contracts\/[^\/]+/);

    // Click export button
    await page.click('button:has-text("تصدير")');

    // Select export format
    await page.click('text="PDF');

    // Verify download starts
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("تحميل")');

    // Wait for download to complete
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/.*\.pdf$/);
  });

  test('should print contract', async ({ page }) => {
    await page.goto('/contracts');

    // Open contract
    await page.locator('[data-testid="contract-card"]').first().click();
    await page.waitForURL(/\/contracts\/[^\/]+/);

    // Click print button
    await page.click('button:has-text("طباعة")');

    // Verify print dialog opens
    await expect(page.locator('text="طباعة العقد')).toBeVisible();

    // Check print preview
    await expect(page.locator('[role="dialog"]').toBeVisible();
  });

  test('should handle contract renewal', async ({ page }) => {
    await page.goto('/contracts');

    // Find expiring contract
    const expiringContract = page.locator('[data-testid="contract-card"]').filter({
      has: page.locator('[data-testid="status-badge"]:has-text("ينتهي قريباً")'),
    }).first();

    await expiringContract.click();
    await page.waitForURL(/\/contracts\/[^\/]+/);

    // Click renew button
    await page.click('button:has-text("تجديد العقد")');

    // Fill renewal details
    await page.fill('input[name="end_date"]', '2025-12-31');
    await page.fill('input[name="new_daily_rate"]', '120');
    await page.fill('textarea[name="renewal_notes"] = 'Contract renewed by customer');

    // Process renewal
    await page.click('button:has-text("تجديد العقد")');
    await page.click('button:has-text("تأكيد التجديد")');

    // Verify renewal success
    await expect(page.locator('text="تم تجديد العقد بنجاح')).toBeVisible();

    // Check new end date
    await expect(page.locator('input[name="end_date"]')).toHaveValue('2025-12-31');
  });

  test('should display contract analytics', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to analytics section
    await page.click('text="التحليلات');
    await page.click('text("تحليل العقود")');

    // Verify analytics widgets are displayed
    expect(page.locator('[data-testid="total-contracts"]')).toBeVisible();
    expect(page.locator('[data-testid="active-contracts"]')).toBeVisible();
    expect(page.locator('[data-testid="expiring-contracts"]')).toBeVisible();
    expect(page.locator('[data-testid="monthly-revenue"]')).toBeVisible();
  });

  test('should handle bulk operations', async ({ page }) => {
    await page.goto('/contracts');

    // Select multiple contracts
    const checkboxes = page.locator('[data-testid="contract-checkbox"]');
    await checkboxes.first().check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();

    // Click bulk actions
    await page.click('button:has-text("إجراءات جماعية")');

    // Select bulk operation
    await page.click('text("تصدير مختار")');
    await page.click('text("PDF")');

    // Verify bulk operation
    await expect(page.locator('text="تصدير العقود المحددة')).toBeVisible();
    await page.click('button:has-text("تصدير")');

    // Verify multiple downloads start
    const downloadPromises = [];
    for (let i = 0; i < 3; i++) {
      downloadPromises.push(page.waitForEvent('download'));
    }

    await Promise.all(downloadPromises);
  });
});