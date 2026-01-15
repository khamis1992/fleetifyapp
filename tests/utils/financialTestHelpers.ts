/**
 * Financial Test Helpers
 *
 * Utility functions for financial system E2E testing.
 * Provides common operations for payments, invoices, and journal entries testing.
 */

import { Page, expect } from '@playwright/test';
import testAccounts from '../fixtures/financial-test-accounts.json';

const BASE_URL = 'http://localhost:8080';
const COMPANY_ID = testAccounts.companyId;

// ============================================================================
// Types
// ============================================================================

export interface PaymentData {
  amount: number;
  paymentType: string;
  paymentMethod?: string;
  referenceNumber?: string;
  checkNumber?: string;
  notes?: string;
  customerId?: string;
  invoiceId?: string;
  contractId?: string;
}

export interface InvoiceData {
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  customerId: string;
  contractId?: string;
  dueDate?: string;
  notes?: string;
}

export interface JournalEntryData {
  description: string;
  entryDate: string;
  lines: JournalEntryLineData[];
}

export interface JournalEntryLineData {
  accountCode: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
}

export interface TestDataIds {
  customerId?: string;
  vehicleId?: string;
  contractId?: string;
  invoiceIds: string[];
  paymentIds: string[];
  journalEntryIds: string[];
}

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Login as admin user
 */
export async function loginAsAdmin(page: Page): Promise<void> {
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

/**
 * Navigate to finance hub
 */
export async function navigateToFinanceHub(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/finance`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to payments page
 */
export async function navigateToPayments(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/finance/payments`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to quick payment page
 */
export async function navigateToQuickPayment(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/quick-payment`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to invoices/billing page
 */
export async function navigateToInvoices(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/finance/billing`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to journal entries/ledger page
 */
export async function navigateToJournalEntries(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/finance/ledger`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to chart of accounts
 */
export async function navigateToChartOfAccounts(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/finance/accounts`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to customers
 */
export async function navigateToCustomers(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/customers`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to fleet/vehicles
 */
export async function navigateToFleet(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/fleet`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to contracts
 */
export async function navigateToContracts(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/contracts`);
  await page.waitForLoadState('networkidle');
}

// ============================================================================
// UI Interaction Helpers
// ============================================================================

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, options?: {
  type?: 'success' | 'error' | 'warning';
  text?: string;
  timeout?: number;
}): Promise<void> {
  const { type, text, timeout = 10000 } = options || {};

  const toast = page.locator('[data-sonner-toast], .toast, [role="alert"]').first();
  await expect(toast).toBeVisible({ timeout });

  if (text) {
    await expect(toast).toContainText(text);
  }

  if (type === 'error') {
    const errorToast = toast.locator('[data-type="error"], .error');
    // Optionally verify it's an error toast
  }
}

/**
 * Wait for form to be ready
 */
export async function waitForForm(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForSelector('form, [data-testid*="form"]', { timeout });
}

/**
 * Fill form field by multiple possible selectors
 */
export async function fillFormField(
  page: Page,
  selectors: string[],
  value: string
): Promise<boolean> {
  for (const selector of selectors) {
    const field = page.locator(selector).first();
    if (await field.isVisible({ timeout: 1000 }).catch(() => false)) {
      await field.fill(value);
      return true;
    }
  }
  return false;
}

/**
 * Select option from dropdown
 */
export async function selectOption(
  page: Page,
  selectors: string[],
  value: string
): Promise<boolean> {
  for (const selector of selectors) {
    const select = page.locator(selector).first();
    if (await select.isVisible({ timeout: 1000 }).catch(() => false)) {
      await select.selectOption(value);
      return true;
    }
  }
  return false;
}

/**
 * Click button by multiple possible selectors
 */
export async function clickButton(
  page: Page,
  selectors: string[],
  options?: { timeout?: number }
): Promise<boolean> {
  const { timeout = 5000 } = options || {};

  for (const selector of selectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: Math.min(timeout, 2000) }).catch(() => false)) {
      await button.click();
      return true;
    }
  }
  return false;
}

// ============================================================================
// Payment Helpers
// ============================================================================

/**
 * Create a payment via UI
 */
export async function createPaymentViaUI(
  page: Page,
  data: PaymentData
): Promise<boolean> {
  await navigateToPayments(page);

  // Click create button
  const createClicked = await clickButton(page, [
    '[data-testid="create-payment-button"]',
    'button:has-text("دفعة جديدة")',
    'button:has-text("New Payment")',
    'button:has-text("إضافة")',
  ]);

  if (!createClicked) {
    return false;
  }

  await waitForForm(page);

  // Fill amount
  await fillFormField(page, [
    'input[name="amount"]',
    '[data-testid="payment-amount"]',
  ], data.amount.toString());

  // Select payment type
  await selectOption(page, [
    'select[name="payment_type"]',
    '[data-testid="payment-type"]',
  ], data.paymentType);

  // Fill optional fields
  if (data.referenceNumber) {
    await fillFormField(page, [
      'input[name="reference_number"]',
      '[data-testid="reference-number"]',
    ], data.referenceNumber);
  }

  if (data.checkNumber) {
    await fillFormField(page, [
      'input[name="check_number"]',
      '[data-testid="check-number"]',
    ], data.checkNumber);
  }

  if (data.notes) {
    await fillFormField(page, [
      'textarea[name="notes"]',
      'input[name="notes"]',
      '[data-testid="payment-notes"]',
    ], data.notes);
  }

  // Submit
  const submitClicked = await clickButton(page, [
    'button[type="submit"]',
    '[data-testid="submit-payment"]',
  ]);

  if (submitClicked) {
    await waitForToast(page);
    return true;
  }

  return false;
}

/**
 * Cancel a payment via UI
 */
export async function cancelPaymentViaUI(page: Page, paymentNumber: string): Promise<boolean> {
  await navigateToPayments(page);

  // Find payment row
  const paymentRow = page.locator(`tr:has-text("${paymentNumber}")`).first();
  if (!await paymentRow.isVisible()) {
    return false;
  }

  await paymentRow.click();

  // Click cancel button
  const cancelClicked = await clickButton(page, [
    '[data-testid="cancel-payment"]',
    'button:has-text("إلغاء")',
    'button:has-text("Cancel")',
  ]);

  if (!cancelClicked) {
    return false;
  }

  // Confirm
  await clickButton(page, [
    '[data-testid="confirm-cancel"]',
    'button:has-text("تأكيد")',
    'button:has-text("Confirm")',
  ]);

  await waitForToast(page);
  return true;
}

/**
 * Mark check as bounced via UI
 */
export async function markCheckAsBounced(page: Page, paymentNumber: string): Promise<boolean> {
  await navigateToPayments(page);

  const paymentRow = page.locator(`tr:has-text("${paymentNumber}")`).first();
  if (!await paymentRow.isVisible()) {
    return false;
  }

  await paymentRow.click();

  const bounceClicked = await clickButton(page, [
    '[data-testid="mark-bounced"]',
    'button:has-text("شيك مرتجع")',
    'button:has-text("Mark Bounced")',
  ]);

  if (!bounceClicked) {
    return false;
  }

  await clickButton(page, [
    '[data-testid="confirm-bounce"]',
    'button:has-text("تأكيد")',
  ]);

  await waitForToast(page);
  return true;
}

// ============================================================================
// Invoice Helpers
// ============================================================================

/**
 * Pay invoice via UI
 */
export async function payInvoiceViaUI(
  page: Page,
  invoiceNumber: string,
  amount: number,
  paymentType: string = 'cash'
): Promise<boolean> {
  await navigateToInvoices(page);

  const invoiceRow = page.locator(`tr:has-text("${invoiceNumber}")`).first();
  if (!await invoiceRow.isVisible()) {
    return false;
  }

  await invoiceRow.click();

  const payClicked = await clickButton(page, [
    '[data-testid="pay-invoice"]',
    'button:has-text("دفع")',
    'button:has-text("Pay")',
  ]);

  if (!payClicked) {
    return false;
  }

  await waitForForm(page);

  await fillFormField(page, [
    'input[name="amount"]',
    '[data-testid="payment-amount"]',
  ], amount.toString());

  await selectOption(page, [
    'select[name="payment_type"]',
    '[data-testid="payment-type"]',
  ], paymentType);

  await clickButton(page, [
    'button[type="submit"]',
    '[data-testid="submit-payment"]',
  ]);

  await waitForToast(page);
  return true;
}

/**
 * Get invoice status from UI
 */
export async function getInvoiceStatus(page: Page, invoiceNumber: string): Promise<string | null> {
  await navigateToInvoices(page);

  const invoiceRow = page.locator(`tr:has-text("${invoiceNumber}")`).first();
  if (!await invoiceRow.isVisible()) {
    return null;
  }

  const statusBadge = invoiceRow.locator('.status-badge, [data-testid="invoice-status"]').first();
  return await statusBadge.textContent();
}

// ============================================================================
// Journal Entry Helpers
// ============================================================================

/**
 * Create journal entry via UI
 */
export async function createJournalEntryViaUI(
  page: Page,
  data: JournalEntryData
): Promise<boolean> {
  await navigateToJournalEntries(page);

  const createClicked = await clickButton(page, [
    '[data-testid="create-entry-button"]',
    'button:has-text("قيد جديد")',
    'button:has-text("New Entry")',
  ]);

  if (!createClicked) {
    return false;
  }

  await waitForForm(page);

  // Fill description
  await fillFormField(page, [
    'input[name="description"]',
    'textarea[name="description"]',
    '[data-testid="entry-description"]',
  ], data.description);

  // Fill date
  await fillFormField(page, [
    'input[name="entry_date"]',
    '[data-testid="entry-date"]',
  ], data.entryDate);

  // Add lines (simplified - actual implementation depends on UI)
  // ...

  await clickButton(page, [
    'button[type="submit"]',
    '[data-testid="save-entry"]',
  ]);

  await waitForToast(page);
  return true;
}

/**
 * Post journal entry via UI
 */
export async function postJournalEntry(page: Page, entryNumber: string): Promise<boolean> {
  await navigateToJournalEntries(page);

  const entryRow = page.locator(`tr:has-text("${entryNumber}")`).first();
  if (!await entryRow.isVisible()) {
    return false;
  }

  await entryRow.click();

  const postClicked = await clickButton(page, [
    '[data-testid="post-entry"]',
    'button:has-text("ترحيل")',
    'button:has-text("Post")',
  ]);

  if (!postClicked) {
    return false;
  }

  await clickButton(page, [
    '[data-testid="confirm-post"]',
    'button:has-text("تأكيد")',
  ]);

  await waitForToast(page);
  return true;
}

/**
 * Reverse journal entry via UI
 */
export async function reverseJournalEntry(page: Page, entryNumber: string): Promise<boolean> {
  await navigateToJournalEntries(page);

  const entryRow = page.locator(`tr:has-text("${entryNumber}")`).first();
  if (!await entryRow.isVisible()) {
    return false;
  }

  await entryRow.click();

  const reverseClicked = await clickButton(page, [
    '[data-testid="reverse-entry"]',
    'button:has-text("عكس القيد")',
    'button:has-text("Reverse")',
  ]);

  if (!reverseClicked) {
    return false;
  }

  await clickButton(page, [
    '[data-testid="confirm-reverse"]',
    'button:has-text("تأكيد")',
  ]);

  await waitForToast(page);
  return true;
}

// ============================================================================
// Verification Helpers
// ============================================================================

/**
 * Verify payment exists in list
 */
export async function verifyPaymentExists(
  page: Page,
  paymentNumber: string
): Promise<boolean> {
  await navigateToPayments(page);

  const paymentRow = page.locator(`tr:has-text("${paymentNumber}")`);
  return await paymentRow.isVisible();
}

/**
 * Verify invoice payment status
 */
export async function verifyInvoicePaymentStatus(
  page: Page,
  invoiceNumber: string,
  expectedStatus: 'unpaid' | 'partial' | 'paid'
): Promise<boolean> {
  await navigateToInvoices(page);

  const invoiceRow = page.locator(`tr:has-text("${invoiceNumber}")`).first();
  if (!await invoiceRow.isVisible()) {
    return false;
  }

  const statusText = await invoiceRow.locator('.payment-status, [data-testid="payment-status"]').textContent();
  return statusText?.toLowerCase().includes(expectedStatus) ?? false;
}

/**
 * Verify journal entry is balanced
 */
export async function verifyJournalEntryBalanced(
  page: Page,
  entryNumber: string
): Promise<boolean> {
  await navigateToJournalEntries(page);

  const entryRow = page.locator(`tr:has-text("${entryNumber}")`).first();
  if (!await entryRow.isVisible()) {
    return false;
  }

  await entryRow.click();

  const totalDebit = await page.locator('[data-testid="total-debit"], .total-debit').textContent();
  const totalCredit = await page.locator('[data-testid="total-credit"], .total-credit').textContent();

  const debitAmount = parseFloat(totalDebit?.replace(/[^\d.-]/g, '') || '0');
  const creditAmount = parseFloat(totalCredit?.replace(/[^\d.-]/g, '') || '0');

  return debitAmount === creditAmount;
}

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Format amount as QAR currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-QA', {
    style: 'currency',
    currency: 'QAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse currency string to number
 */
export function parseCurrency(currencyString: string): number {
  return parseFloat(currencyString.replace(/[^\d.-]/g, '') || '0');
}

// ============================================================================
// Test Data Management
// ============================================================================

/**
 * Generate unique test identifier
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate payment number for testing
 */
export function generateTestPaymentNumber(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `PAY-E2E-${year}-${seq}`;
}

/**
 * Generate invoice number for testing
 */
export function generateTestInvoiceNumber(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INV-E2E-${year}${month}-${seq}`;
}

/**
 * Get test accounts configuration
 */
export function getTestAccounts() {
  return testAccounts;
}

/**
 * Get company ID for testing
 */
export function getCompanyId(): string {
  return COMPANY_ID;
}

// ============================================================================
// Export all helpers
// ============================================================================

export default {
  loginAsAdmin,
  navigateToFinanceHub,
  navigateToPayments,
  navigateToQuickPayment,
  navigateToInvoices,
  navigateToJournalEntries,
  navigateToChartOfAccounts,
  navigateToCustomers,
  navigateToFleet,
  navigateToContracts,
  waitForToast,
  waitForForm,
  fillFormField,
  selectOption,
  clickButton,
  createPaymentViaUI,
  cancelPaymentViaUI,
  markCheckAsBounced,
  payInvoiceViaUI,
  getInvoiceStatus,
  createJournalEntryViaUI,
  postJournalEntry,
  reverseJournalEntry,
  verifyPaymentExists,
  verifyInvoicePaymentStatus,
  verifyJournalEntryBalanced,
  formatCurrency,
  parseCurrency,
  generateTestId,
  generateTestPaymentNumber,
  generateTestInvoiceNumber,
  getTestAccounts,
  getCompanyId,
};
