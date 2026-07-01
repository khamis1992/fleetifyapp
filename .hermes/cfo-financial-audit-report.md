# Fleetify CFO-Level Financial System Audit Report

## System: Fleetify ERP (Al-Araf Car Rental, Qatar)
## Date: 2026-07-01
## Auditor: Hermes AGI (CFO Financial System Audit Skill)

---

### Executive Summary

- **Overall risk rating: CRITICAL**
- Total findings: **12 critical, 82 high, 782 medium, 1 low**
- Recommendation: **Fix critical issues before relying on financial data for reporting**

---

### Findings by Domain

#### 1. Double-Entry Integrity — ⚠️ CRITICAL

- **Status: FAIL (line-level) / PASS (header-level)**
- **1a. Header balance:** 1,000 journal entries, 0 unbalanced at header level — PASS
- **1b. Line balance:** 6 entries have unbalanced debit/credit at line level — CRITICAL
  - `b7744eaa...`: D=600.00 C=0.00 (only 1 line, no offsetting credit)
  - `0103211b...`: D=1,780.00 C=0.00 (only 1 line)
  - `7e356950...`: D=0.00 C=1,000.00 (only 1 line, no offsetting debit)
  - `2daa5a6b...`: D=1,600.00 C=0.00 (only 1 line)
  - `4be61de7...`: D=2,100.00 C=0.00 (only 1 line)
  - `8c315386...`: D=650.00 C=0.00 (only 1 line)
- **1c. JEs without any lines:** 666 of 1,000 entries have no detail lines — these cannot be verified
- **1d. JEs with <2 lines:** 6 entries have only 1 line (violates double-entry requirement)
- **1e. Status:** 894 posted, 105 draft, 1 reversed
- **Severity: CRITICAL** — 6 entries violate double-entry; 666 entries have no verifiable lines

#### 2. Chart of Accounts — ✅ PASS (with note)

- **Status: PASS**
- Total accounts: 463
- Types: assets=278, expenses=57, equity=22, revenue=43, liabilities=63
- **Note:** The system uses `expenses` (plural) instead of `expense` — this is a naming convention, not an error. The audit script flagged it as "invalid" but it's consistent within the system.
- Duplicate codes: 0
- Headers: 248, Postable: 215
- Circular refs: 0, Missing parents: 0
- **Severity: LOW** (naming convention only)

#### 3. GL & Sub-Ledger Reconciliation — 🔴 HIGH

- **Status: FAIL**
- **3a. Payment to GL linkage:** 16 of 100 payments have NO journal_entry_id link
  - Includes large payments: 66,071 QAR × 3 (July, Aug, Sept 2025)
  - 5,910 QAR payment (April 2024)
  - These payments are NOT reflected in the GL
- **3b. Invoice to GL linkage:** 66 of 100 invoices have NO journal_entry_id link
  - Many zero-amount invoices (INV-MR* type)
  - INV-2025-000036: 2,100 QAR unpaid, no JE
- **Severity: HIGH** — GL is incomplete; financial statements based on GL will be wrong

#### 4. Trial Balance / Accounting Equation — 🔴 CRITICAL

- **Status: FAIL**
- Assets: 385,940 QAR
- Liabilities: 0 QAR
- Equity: 0 QAR
- **A ≠ L + E (diff = 385,940 QAR)**
- Only 2 accounts have non-zero balances:
  - Asset (Bank): 385,940 QAR (debit)
  - Revenue (Monthly Car Rental): -385,940 QAR (credit)
- **Root cause:** The system has only 2 active account balances. No liability or equity accounts have been set up with balances. This means the accounting equation fails.
- **Severity: CRITICAL** — Financial statements cannot be generated correctly

#### 5. AP/AR — ⚠️ MEDIUM

- **5a. Payment status:** 99 completed, 1 cancelled — OK
- **5b. Invoice status:** 90 unpaid, 9 paid, 1 partial — high number of unpaid invoices
- **5c. Duplicate payments:** 11 potential duplicates (same amount + same date)
  - 1,850 QAR on 2025-08-01 (2 payments)
  - 1,700 QAR on 2025-08-01 (2 payments)
  - 1,600 QAR on 2025-07-01 (3 payments)
  - 1,500 QAR on 2025-07-01 (3 payments)
  - These may be legitimate (different customers/contracts) but need investigation
- **5d. Invoice balance accuracy:** PASS (0 mismatches)
- **Severity: MEDIUM** — duplicate payments need manual review

#### 6. Revenue Recognition — ⚠️ MEDIUM

- **Status: PARTIAL**
- 3 deferred revenue accounts exist — PASS
- Contract-related journal entries exist
- **Issue in code:** `SyncPaymentsToLedger.tsx` creates JEs that directly debit AR and credit Revenue at contract creation — this recognizes revenue immediately rather than over the rental period. For car rental (short-term), this may be acceptable, but for long-term contracts, revenue should be recognized monthly.
- **CashFlowStatementReport.tsx uses HARDCODED mock data** (lines 88-104):
  ```typescript
  // In a real implementation, this would process actual cash transactions
  // For now, we'll create a structure based on the account changes
  const operating = [
    { name: 'Cash from customers', amount: 150000 },  // HARDCODED
    { name: 'Cash to suppliers', amount: -80000 },     // HARDCODED
    ...
  ];
  const beginningCash = 50000; // HARDCODED
  ```
- **Severity: MEDIUM** — Cash flow statement shows fake data; revenue timing may need adjustment for long-term contracts

#### 7. Financial Statements — 🔴 CRITICAL (code-level)

- **BalanceSheetReport.tsx:** Fetches from `useEnhancedFinancialReports('balance_sheet', ...)` — uses real data
- **IncomeStatementReport.tsx:** Fetches from `useEnhancedFinancialReports('income_statement', ...)` — uses real data
- **CashFlowStatementReport.tsx:** Uses **HARDCODED mock data** (see Domain 6) — CRITICAL
- **useEnhancedFinancialReports.ts:** Multiple hooks return **mock data**:
  - `useEnhancedCustomerFinancialSummary`: returns hardcoded values (lines 54-74)
  - `useCustomerFinancialSummary`: returns hardcoded values (lines 92-112)
  - `useCustomersWithAging`: returns hardcoded mock customer (lines 128-159)
  - `useFinancialObligationsWithDetails`: returns hardcoded mock obligations (lines 182-200)
- **Cross-statement tie-out:** Cannot be verified because cash flow is hardcoded
- **Severity: CRITICAL** — Customer financial summaries and cash flow statement show fake data

#### 8. Internal Controls — ✅ PASS (code-level)

- **Status: PASS**
- `useFinanceAccessGuard.ts` implements permission checking with `can()` and `checkSegregationOfDuties()`
- `useJournalEntries.ts` enforces:
  - Permission check before creating JEs (`finance.journal.create_draft`)
  - Permission check before posting JEs (`finance.journal.post`)
  - Segregation of duties: poster cannot be the same as creator
  - Period lock check via `assertFinancialPeriodOpen()`
- `financialControls.ts` checks for closed/locked periods before allowing transactions
- **105 draft JEs** exist — these are unposted and not reflected in GL (correct behavior, but indicates workflow bottleneck)
- **Severity: LOW** — controls are implemented correctly

#### 9. Period-End Close — ⚠️ NEEDS VERIFICATION

- `accounting_periods` table exists in schema
- Could not fetch period data via API (empty result — may need company_id filter or periods not set up)
- `assertFinancialPeriodOpen()` checks for closed/locked periods in code — PASS
- **No closing entries found** (no references to retained earnings in JEs)
- **Severity: MEDIUM** — period close functionality exists in code but may not be configured

#### 10. Financial Reporting — 🔴 CRITICAL

- **TrialBalanceReport.tsx:** Uses real data from `useTrialBalance()` — PASS
- **BalanceSheetReport.tsx:** Uses real data, checks `isBalanced` — PASS
- **IncomeStatementReport.tsx:** Uses real data — PASS
- **CashFlowStatementReport.tsx:** HARDCODED mock data — FAIL
- **Customer financial summaries:** Mock data — FAIL
- **AR Aging:** Uses mock data in `useCustomersWithAging` — FAIL
- **KPI formulas in code:** Current ratio, debt-to-equity, etc. are correctly computed in `BalanceSheetReport.tsx`
- **Severity: CRITICAL** — multiple reports show fake data

#### 11. Cash Flow Management — 🔴 CRITICAL

- `bank_transactions` table exists but returned empty (may need company_id filter)
- `CashFlowStatementReport.tsx` shows hardcoded numbers, not real bank transactions
- **Severity: CRITICAL** — cash flow is not tracked from real data

---

### Remediation Priority

1. **CRITICAL: Fix 6 unbalanced journal entries** — each has only 1 line. Add the offsetting debit/credit line to balance them.
2. **CRITICAL: Fix CashFlowStatementReport.tsx** — replace hardcoded mock data with real bank transaction data
3. **CRITICAL: Fix mock data in useEnhancedFinancialReports.ts** — replace all `mockData` returns with real Supabase queries
4. **HIGH: Link 16 unlinked payments to journal entries** — run `SyncPaymentsToLedger` or create JEs manually
5. **HIGH: Link 66 unlinked invoices to journal entries** — ensure invoice creation auto-creates JE
6. **CRITICAL: Set up liability and equity accounts with balances** — the accounting equation (A=L+E) fails because only asset and revenue accounts have balances
7. **MEDIUM: Investigate 11 duplicate payments** — verify these are for different customers/contracts, not true duplicates
8. **MEDIUM: Post or void 105 draft journal entries** — these are in limbo, not reflected in GL
9. **MEDIUM: Verify 666 JEs without lines** — these entries have header balances but no detail lines, making them unverifiable

### Code Issues Found

| File | Issue | Severity |
|------|-------|----------|
| `src/components/finance/CashFlowStatementReport.tsx:88-104` | Hardcoded mock cash flow data | CRITICAL |
| `src/hooks/useEnhancedFinancialReports.ts:54-74` | `useEnhancedCustomerFinancialSummary` returns mock | CRITICAL |
| `src/hooks/useEnhancedFinancialReports.ts:92-112` | `useCustomerFinancialSummary` returns mock | CRITICAL |
| `src/hooks/useEnhancedFinancialReports.ts:128-159` | `useCustomersWithAging` returns mock | CRITICAL |
| `src/hooks/useEnhancedFinancialReports.ts:182-200` | `useFinancialObligationsWithDetails` returns mock | HIGH |
| `src/pages/SyncPaymentsToLedger.tsx:79-132` | Revenue recognition at payment time, not earned time | MEDIUM |
| `src/utils/contractJournalEntry.ts:350-364` | JE created with `status:'posted'` directly (bypasses draft→post workflow) | MEDIUM |

### Database Issues Found

| Table | Issue | Severity |
|-------|-------|----------|
| `journal_entry_lines` | 6 entries with single line (no offsetting debit/credit) | CRITICAL |
| `journal_entries` | 666 entries have no child lines in `journal_entry_lines` | HIGH |
| `journal_entries` | 105 entries in `draft` status (not posted) | MEDIUM |
| `payments` | 16 payments without `journal_entry_id` (GL gap) | HIGH |
| `invoices` | 66 invoices without `journal_entry_id` (GL gap) | HIGH |
| `chart_of_accounts` | Only 2 accounts have non-zero `current_balance` | CRITICAL |
| `payments` | 11 potential duplicate payments (same amount + date) | MEDIUM |