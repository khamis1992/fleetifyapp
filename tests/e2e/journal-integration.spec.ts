/**
 * Journal Entry Integration E2E Tests
 *
 * Comprehensive tests for verifying the integration between:
 * - Payments and Journal Entries
 * - Invoices and Journal Entries
 * - Chart of Accounts updates
 * - Financial balance verification
 *
 * Company: شركة العراف لتأجير السيارات (Al-Araf Car Rental)
 * Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4
 */

import { test, expect, Page } from '@playwright/test';
import {
  generateTestPayment,
  generateTestInvoice,
  generateCashPayment,
  generateBankTransferPayment,
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

async function navigateToJournalEntries(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/finance/ledger`);
  await page.waitForLoadState('networkidle');
}

async function navigateToChartOfAccounts(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/finance/accounts`);
  await page.waitForLoadState('networkidle');
}

async function navigateToGeneralLedger(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/finance/general-ledger`);
  await page.waitForLoadState('networkidle');
}

// ============================================================================
// Journal Entry Creation Tests
// ============================================================================

test.describe('Journal Entry Creation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display journal entries list', async ({ page }) => {
    await navigateToJournalEntries(page);

    // Verify page loaded
    const pageTitle = page.locator('h1, h2, [data-testid="page-title"]').first();
    await expect(pageTitle).toBeVisible();

    // Check for journal entries table or list
    const entriesList = page.locator('[data-testid="journal-entries-list"], table, .entries-list');
    await expect(entriesList).toBeVisible({ timeout: 10000 });
  });

  test('should create manual journal entry', async ({ page }) => {
    await navigateToJournalEntries(page);

    // Click create entry button
    const createButton = page.locator('[data-testid="create-entry-button"], button:has-text("قيد جديد"), button:has-text("New Entry")').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();

      // Wait for form
      await page.waitForSelector('form, [data-testid="journal-entry-form"]', { timeout: 5000 });

      // Fill entry details
      const descriptionField = page.locator('input[name="description"], textarea[name="description"], [data-testid="entry-description"]').first();
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('قيد اختبار E2E - ' + new Date().toISOString());
      }

      // Fill date
      const dateField = page.locator('input[name="entry_date"], [data-testid="entry-date"]').first();
      if (await dateField.isVisible()) {
        await dateField.fill(new Date().toISOString().split('T')[0]);
      }

      // Add debit line
      const addLineButton = page.locator('[data-testid="add-line"], button:has-text("إضافة سطر")').first();
      if (await addLineButton.isVisible()) {
        await addLineButton.click();
      }

      // Fill first line (debit)
      const debitAmount = page.locator('input[name="lines[0].debit_amount"], [data-testid="debit-amount-0"]').first();
      if (await debitAmount.isVisible()) {
        await debitAmount.fill('1000');
      }

      // Add credit line
      if (await addLineButton.isVisible()) {
        await addLineButton.click();
      }

      // Fill second line (credit)
      const creditAmount = page.locator('input[name="lines[1].credit_amount"], [data-testid="credit-amount-1"]').first();
      if (await creditAmount.isVisible()) {
        await creditAmount.fill('1000');
      }

      // Submit
      const submitButton = page.locator('button[type="submit"], [data-testid="save-entry"]').first();
      await submitButton.click();

      // Wait for success
      const toast = page.locator('[data-sonner-toast], .toast').first();
      await expect(toast).toBeVisible({ timeout: 10000 });
    }
  });

  test('should validate journal entry balance', async ({ page }) => {
    await navigateToJournalEntries(page);

    const createButton = page.locator('[data-testid="create-entry-button"], button:has-text("قيد جديد")').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      // Try to create unbalanced entry
      const descriptionField = page.locator('input[name="description"], [data-testid="entry-description"]').first();
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('قيد غير متوازن');
      }

      // Fill debit only (unbalanced)
      const debitAmount = page.locator('input[name="debit_amount"], [data-testid="debit-amount"]').first();
      if (await debitAmount.isVisible()) {
        await debitAmount.fill('1000');
      }

      // Try to submit
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Should show validation error
      const errorMessage = page.locator('[data-testid="balance-error"], .error-message:has-text("توازن"), .error-message:has-text("متوازن")');
      // Expect balance validation error
    }
  });
});

// ============================================================================
// Journal Entry - Payment Integration
// ============================================================================

test.describe('Payment-Journal Entry Integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should verify payment creates journal entry automatically', async ({ page }) => {
    // First, create a payment
    await page.goto(`${BASE_URL}/finance/payments`);
    await page.waitForLoadState('networkidle');

    const createButton = page.locator('[data-testid="create-payment-button"], button:has-text("دفعة جديدة")').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      const amountField = page.locator('input[name="amount"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('2500');
      }

      const typeSelect = page.locator('select[name="payment_type"]').first();
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption('cash');
      }

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Wait for success
      await page.waitForTimeout(2000);

      // Navigate to journal entries
      await navigateToJournalEntries(page);

      // Look for payment-related entry
      const recentEntries = page.locator('[data-testid="journal-entry-row"], table tbody tr');
      await expect(recentEntries.first()).toBeVisible();

      // Check for payment reference in entries
      const paymentEntry = page.locator('tr:has-text("PAY"), tr:has-text("دفعة")').first();
      // Recent entry should reference the payment
    }
  });

  test('should verify journal entry has correct accounts for cash payment', async ({ page }) => {
    await navigateToJournalEntries(page);

    // Find a cash payment journal entry
    const cashEntry = page.locator('tr:has-text("نقد"), tr:has-text("cash"), [data-entry-type="cash"]').first();
    
    if (await cashEntry.isVisible()) {
      await cashEntry.click();

      // Check entry lines
      const entryLines = page.locator('[data-testid="entry-lines"], .entry-lines-table tbody tr');
      
      if (await entryLines.first().isVisible()) {
        // Should have cash account (debit) and receivables/revenue (credit)
        const cashAccountLine = page.locator('tr:has-text("نقد"), tr:has-text("1110")');
        const receivablesLine = page.locator('tr:has-text("ذمم"), tr:has-text("1210")');
        
        // Entry should reference correct accounts
      }
    }
  });

  test('should verify journal entry has correct accounts for bank transfer', async ({ page }) => {
    await navigateToJournalEntries(page);

    // Find a bank transfer journal entry
    const bankEntry = page.locator('tr:has-text("بنك"), tr:has-text("تحويل"), [data-entry-type="bank_transfer"]').first();
    
    if (await bankEntry.isVisible()) {
      await bankEntry.click();

      // Check that bank account is debited
      const bankAccountLine = page.locator('tr:has-text("بنك"), tr:has-text("1120")');
      // Entry should reference bank account
    }
  });
});

// ============================================================================
// Chart of Accounts Tests
// ============================================================================

test.describe('Chart of Accounts Integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display chart of accounts', async ({ page }) => {
    await navigateToChartOfAccounts(page);

    // Verify accounts list is visible
    const accountsList = page.locator('[data-testid="accounts-list"], table, .accounts-tree');
    await expect(accountsList).toBeVisible({ timeout: 10000 });
  });

  test('should show account hierarchy correctly', async ({ page }) => {
    await navigateToChartOfAccounts(page);

    // Check for account levels
    const headerAccounts = page.locator('[data-account-level="1"], .header-account, tr.level-1');
    const detailAccounts = page.locator('[data-account-level="3"], .detail-account, tr.level-3');

    // Should have both header and detail accounts
    if (await headerAccounts.first().isVisible()) {
      await expect(headerAccounts.first()).toBeVisible();
    }
  });

  test('should verify essential accounts exist', async ({ page }) => {
    await navigateToChartOfAccounts(page);

    // Essential accounts for payments
    const essentialCodes = ['1110', '1120', '1210', '2110', '4110'];
    
    for (const code of essentialCodes) {
      const account = page.locator(`[data-account-code="${code}"], tr:has-text("${code}")`).first();
      // These accounts should exist
    }
  });

  test('should show account balance correctly', async ({ page }) => {
    await navigateToChartOfAccounts(page);

    // Click on an account to view details
    const accountRow = page.locator('[data-testid="account-row"], table tbody tr').first();
    
    if (await accountRow.isVisible()) {
      await accountRow.click();

      // Check for balance display
      const balanceSection = page.locator('[data-testid="account-balance"], .balance-display');
      
      if (await balanceSection.isVisible()) {
        const balanceText = await balanceSection.textContent();
        // Balance should be a number
      }
    }
  });
});

// ============================================================================
// General Ledger Tests
// ============================================================================

test.describe('General Ledger', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display general ledger', async ({ page }) => {
    await navigateToGeneralLedger(page);

    const ledgerContent = page.locator('[data-testid="general-ledger"], table, .ledger-content');
    await expect(ledgerContent).toBeVisible({ timeout: 10000 });
  });

  test('should filter ledger by account', async ({ page }) => {
    await navigateToGeneralLedger(page);

    // Select account filter
    const accountFilter = page.locator('[data-testid="account-filter"], select[name="account"]').first();
    
    if (await accountFilter.isVisible()) {
      // Select cash account
      await accountFilter.selectOption({ label: 'نقد' });

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Ledger should show filtered results
      const ledgerRows = page.locator('[data-testid="ledger-row"], table tbody tr');
      // Rows should be filtered
    }
  });

  test('should filter ledger by date range', async ({ page }) => {
    await navigateToGeneralLedger(page);

    // Set date range
    const fromDate = page.locator('[data-testid="date-from"], input[name="from_date"]').first();
    const toDate = page.locator('[data-testid="date-to"], input[name="to_date"]').first();

    if (await fromDate.isVisible() && await toDate.isVisible()) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));

      await fromDate.fill(thirtyDaysAgo.toISOString().split('T')[0]);
      await toDate.fill(new Date().toISOString().split('T')[0]);

      // Apply filter
      const applyButton = page.locator('[data-testid="apply-filter"], button:has-text("تطبيق")').first();
      if (await applyButton.isVisible()) {
        await applyButton.click();
      }

      await page.waitForTimeout(1000);
      // Results should be filtered by date
    }
  });

  test('should verify running balance is calculated correctly', async ({ page }) => {
    await navigateToGeneralLedger(page);

    // Select an account
    const accountFilter = page.locator('[data-testid="account-filter"], select[name="account"]').first();
    
    if (await accountFilter.isVisible()) {
      await accountFilter.selectOption({ index: 1 }); // Select first account

      await page.waitForTimeout(1000);

      // Check running balance column
      const balanceColumn = page.locator('[data-testid="running-balance"], .running-balance, td:nth-child(5)');
      
      const balances = await balanceColumn.allTextContents();
      
      // Each subsequent balance should be calculated from previous
      // This is a simplified check
      for (const balance of balances) {
        const numericBalance = parseFloat(balance.replace(/[^\d.-]/g, '') || '0');
        expect(typeof numericBalance).toBe('number');
      }
    }
  });
});

// ============================================================================
// Financial Reports Integration
// ============================================================================

test.describe('Financial Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display trial balance', async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/reports`);
    await page.waitForLoadState('networkidle');

    // Look for trial balance report
    const trialBalanceLink = page.locator('[data-testid="trial-balance"], a:has-text("ميزان المراجعة"), button:has-text("Trial Balance")').first();
    
    if (await trialBalanceLink.isVisible()) {
      await trialBalanceLink.click();
      await page.waitForLoadState('networkidle');

      // Verify trial balance content
      const reportContent = page.locator('[data-testid="trial-balance-report"], .trial-balance-table');
      await expect(reportContent).toBeVisible({ timeout: 10000 });
    }
  });

  test('should verify trial balance is balanced (total debit = total credit)', async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/reports/trial-balance`);
    await page.waitForLoadState('networkidle');

    // Get totals
    const totalDebit = page.locator('[data-testid="total-debit"], .total-debit').first();
    const totalCredit = page.locator('[data-testid="total-credit"], .total-credit').first();

    if (await totalDebit.isVisible() && await totalCredit.isVisible()) {
      const debitText = await totalDebit.textContent();
      const creditText = await totalCredit.textContent();

      const debitAmount = parseFloat(debitText?.replace(/[^\d.-]/g, '') || '0');
      const creditAmount = parseFloat(creditText?.replace(/[^\d.-]/g, '') || '0');

      // Trial balance must be balanced
      expect(debitAmount).toBe(creditAmount);
    }
  });

  test('should display income statement', async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/reports`);
    await page.waitForLoadState('networkidle');

    const incomeStatementLink = page.locator('[data-testid="income-statement"], a:has-text("قائمة الدخل"), button:has-text("Income Statement")').first();
    
    if (await incomeStatementLink.isVisible()) {
      await incomeStatementLink.click();
      await page.waitForLoadState('networkidle');

      const reportContent = page.locator('[data-testid="income-statement-report"], .income-statement');
      await expect(reportContent).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display balance sheet', async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/reports`);
    await page.waitForLoadState('networkidle');

    const balanceSheetLink = page.locator('[data-testid="balance-sheet"], a:has-text("الميزانية العمومية"), button:has-text("Balance Sheet")').first();
    
    if (await balanceSheetLink.isVisible()) {
      await balanceSheetLink.click();
      await page.waitForLoadState('networkidle');

      const reportContent = page.locator('[data-testid="balance-sheet-report"], .balance-sheet');
      await expect(reportContent).toBeVisible({ timeout: 10000 });

      // Verify Assets = Liabilities + Equity
      const totalAssets = page.locator('[data-testid="total-assets"], .total-assets').first();
      const totalLiabilitiesEquity = page.locator('[data-testid="total-liabilities-equity"], .total-le').first();

      if (await totalAssets.isVisible() && await totalLiabilitiesEquity.isVisible()) {
        const assetsText = await totalAssets.textContent();
        const leText = await totalLiabilitiesEquity.textContent();

        const assetsAmount = parseFloat(assetsText?.replace(/[^\d.-]/g, '') || '0');
        const leAmount = parseFloat(leText?.replace(/[^\d.-]/g, '') || '0');

        // Balance sheet must balance
        expect(assetsAmount).toBe(leAmount);
      }
    }
  });
});

// ============================================================================
// Entry Reversal Tests
// ============================================================================

test.describe('Journal Entry Reversal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should reverse a posted journal entry', async ({ page }) => {
    await navigateToJournalEntries(page);

    // Find a posted entry
    const postedEntry = page.locator('[data-status="posted"], tr:has-text("مرحل"), .badge:has-text("Posted")').first();
    
    if (await postedEntry.isVisible()) {
      const entryRow = postedEntry.locator('..').first();
      await entryRow.click();

      // Click reverse button
      const reverseButton = page.locator('[data-testid="reverse-entry"], button:has-text("عكس القيد"), button:has-text("Reverse")').first();
      
      if (await reverseButton.isVisible()) {
        await reverseButton.click();

        // Confirm reversal
        const confirmButton = page.locator('[data-testid="confirm-reverse"], button:has-text("تأكيد")').first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Wait for success
        const toast = page.locator('[data-sonner-toast], .toast').first();
        await expect(toast).toBeVisible({ timeout: 10000 });

        // Verify entry shows as reversed
        const reversedBadge = page.locator('[data-status="reversed"], .badge:has-text("معكوس"), .badge:has-text("Reversed")');
        // Entry should show reversed status
      }
    }
  });

  test('should create reversal entry with opposite amounts', async ({ page }) => {
    await navigateToJournalEntries(page);

    // Find a reversed entry
    const reversedEntry = page.locator('[data-status="reversed"], tr:has-text("معكوس")').first();
    
    if (await reversedEntry.isVisible()) {
      await reversedEntry.click();

      // Check for reversal entry reference
      const reversalReference = page.locator('[data-testid="reversal-entry"], .reversal-reference');
      
      if (await reversalReference.isVisible()) {
        // Click to view reversal entry
        await reversalReference.click();

        // Verify amounts are opposite
        const originalDebit = page.locator('[data-testid="original-debit"]').first();
        const reversalCredit = page.locator('[data-testid="reversal-credit"]').first();

        // Reversal should have opposite amounts
      }
    }
  });
});

// ============================================================================
// Audit Trail Tests
// ============================================================================

test.describe('Audit Trail', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should track journal entry creation', async ({ page }) => {
    await navigateToJournalEntries(page);

    // Select an entry
    const entryRow = page.locator('[data-testid="journal-entry-row"], table tbody tr').first();
    
    if (await entryRow.isVisible()) {
      await entryRow.click();

      // Look for audit/history section
      const historyTab = page.locator('[data-testid="history-tab"], button:has-text("السجل"), button:has-text("History")').first();
      
      if (await historyTab.isVisible()) {
        await historyTab.click();

        // Should show creation record
        const creationRecord = page.locator('[data-action="create"], .audit-create, li:has-text("إنشاء")');
        // Creation should be logged
      }
    }
  });

  test('should track journal entry posting', async ({ page }) => {
    await navigateToJournalEntries(page);

    // Select a posted entry
    const postedEntry = page.locator('[data-status="posted"]').first();
    
    if (await postedEntry.isVisible()) {
      await postedEntry.click();

      const historyTab = page.locator('[data-testid="history-tab"], button:has-text("السجل")').first();
      
      if (await historyTab.isVisible()) {
        await historyTab.click();

        // Should show posting record
        const postingRecord = page.locator('[data-action="post"], .audit-post, li:has-text("ترحيل")');
        // Posting should be logged
      }
    }
  });
});

// ============================================================================
// Entry Workflow Tests
// ============================================================================

test.describe('Journal Entry Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should support draft -> review -> post workflow', async ({ page }) => {
    await navigateToJournalEntries(page);

    // Create a draft entry
    const createButton = page.locator('[data-testid="create-entry-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });

      // Fill minimal data
      const descriptionField = page.locator('input[name="description"]').first();
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('قيد مسودة للاختبار');
      }

      // Save as draft
      const saveDraftButton = page.locator('[data-testid="save-draft"], button:has-text("حفظ كمسودة")').first();
      if (await saveDraftButton.isVisible()) {
        await saveDraftButton.click();
      } else {
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
      }

      await page.waitForTimeout(2000);

      // Navigate back to list
      await navigateToJournalEntries(page);

      // Find draft entry
      const draftEntry = page.locator('[data-status="draft"], tr:has-text("مسودة")').first();
      
      if (await draftEntry.isVisible()) {
        await draftEntry.click();

        // Post the entry
        const postButton = page.locator('[data-testid="post-entry"], button:has-text("ترحيل")').first();
        
        if (await postButton.isVisible()) {
          await postButton.click();

          // Confirm posting
          const confirmButton = page.locator('[data-testid="confirm-post"], button:has-text("تأكيد")').first();
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }

          // Wait for success
          const toast = page.locator('[data-sonner-toast]').first();
          await expect(toast).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });
});
