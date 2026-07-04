# Fleetify ERP — Financial System Integration Audit (v4 Final)

**Date:** July 5, 2026  
**Scope:** Financial system architecture, DB triggers, integration hooks, reports, controls  
**Method:** Full systematic scan — every financial migration read, every hook operation sequenced, cross-referenced against every trigger  
**Code changes:** NONE  

---

## 1. Executive Summary

The Fleetify financial system has a hardened database layer (26+ control migrations, June 27–July 2, 2026) that enforces double-entry integrity, period locks, immutability, and audit trails. However, the application layer (React hooks) is architecturally misaligned with this database layer.

**The single most critical finding:** Migration `20260627011000` creates a `BEFORE INSERT OR UPDATE OR DELETE` trigger on `journal_entry_lines` that rejects ALL line operations when the parent `journal_entries.status` is `posted`. **All 5 integration hooks create the header as `posted` FIRST, then attempt to insert lines SECOND.** The line insert will fail. The rollback delete will also fail. The result: orphaned posted headers with no lines, silently accumulating.

Only `usePaymentOperations.ts` follows the correct pattern: `draft` → insert lines → `posted`.

**Cannot verify from code alone:** Whether the migrations are actually applied to the production Supabase instance. If they are NOT applied, the hooks work but there are no controls. If they ARE applied, the hooks fail silently. Both scenarios are problematic.

---

## 2. Trigger Matrix — Complete Cross-Reference

### 2.1 All Financial Triggers (Verified by Reading Each Migration File)

| # | Trigger Name | Table | Operation | Timing | Condition | Exception | Source File:Line |
|---|-------------|-------|-----------|--------|-----------|-----------|-------------------|
| T1 | `prevent_payments_hard_delete_trigger` | `payments` | DELETE | BEFORE | Unconditional | `'Payments cannot be deleted permanently. Set payment_status = cancelled instead.'` | `20260627000000:61` / `20260627001000:62` |
| T2 | `enforce_payment_financial_controls_trigger` | `payments` | INSERT, UPDATE | BEFORE | Period open + amount validation | Various | `20260627001000:128` |
| T3 | `prevent_posted_journal_entry_delete_trigger` | `journal_entries` | DELETE | BEFORE | `OLD.status = 'posted'` | `'Posted journal entries cannot be deleted. Create a reversal entry instead.'` | `20260627001000:152` |
| T4 | `enforce_journal_entry_financial_controls_trigger` | `journal_entries` | INSERT, UPDATE | BEFORE | (a) Period open; (b) `ABS(total_debit - total_credit) <= 0.01`; (c) Posted entries immutable (specific fields) | (a) Period locked; (b) Unbalanced; (c) `'Posted journal entries are immutable.'` | `20260627001000:196` |
| T5 | `enforce_invoice_financial_controls_trigger` | `invoices` | INSERT, UPDATE, DELETE | BEFORE | Period open + payments exist + JE linked | Various | `20260627001000:235` |
| **T6** | **`prevent_posted_journal_line_mutation_trigger`** | **`journal_entry_lines`** | **INSERT, UPDATE, DELETE** | **BEFORE** | **`parent.status IN ('posted', 'reversed')`** | **`'Posted journal entry lines cannot be changed. Create a reversal entry instead.'`** | **`20260627011000:32`** |
| T7 | `prevent_invoice_hard_delete_trigger` | `invoices` | DELETE | BEFORE | Has payments or JE linked | `'Invoices with payments cannot be deleted.'` | `20260627010000` |

### 2.2 Bypass Mechanism (Verified)

**Function:** `financial_controls_bypass_enabled()` — `20260627001000:5-11`

```sql
SELECT COALESCE(current_setting('app.financial_controls_bypass', true), '') = 'on';
```

**Key finding:** The bypass is NOT automatic for `service_role`. It requires an explicit `SET app.financial_controls_bypass = 'on'` via `set_config()`. Only SECURITY DEFINER RPCs do this:
- `20260701000002_cancel_invoice_with_reversal.sql:78` — `PERFORM set_config('app.financial_controls_bypass', 'on', true);`
- `20260702000004_fix_duplicate_payment_receipt_lines.sql:7`
- `20260702153000_restore_cancelled_import_payments_and_atomic_cancel.sql:112, 251`

**Client-side hooks (using Supabase JS client) CANNOT activate the bypass.** They run as `authenticated` role with no ability to set `app.financial_controls_bypass`. This means **all 5 integration hooks will hit the triggers with no bypass.**

### 2.3 The Posted-Entry Immutability Field List (T4)

**`20260627001000:175-185`** — The immutability check on UPDATE blocks changes to:
- `entry_number`
- `entry_date`
- `company_id`
- `total_debit`
- `total_credit`
- `reference_type`
- `reference_id`

**`status` is NOT in this list.** This means:
- ✅ Updating `status` from `draft` → `posted` works (the correct pattern in `usePaymentOperations.ts`)
- ✅ Updating `status` from `posted` → `reversed` works (what `useReverseJournalEntry` does)
- ❌ But changing any of the 7 listed fields on a posted entry is blocked

---

## 3. Hook Operation Sequences — Verified Against Trigger Matrix

### 3.1 The Universal Broken Pattern (5 Hooks)

```
Step 1: INSERT INTO journal_entries (status: 'posted')
         → T4 checks: period open? ✅ (if period is open)
         → T4 checks: balanced? ABS(0 - 0) = 0 ≤ 0.01 ✅ (if totals omitted — loophole)
         → T4 checks: posted immutability? N/A (this is INSERT, not UPDATE)
         → RESULT: Header created as 'posted' ✅

Step 2: INSERT INTO journal_entry_lines (journal_entry_id: <posted header>)
         → T6 checks: parent.status = 'posted'? YES
         → T6 RAISES EXCEPTION: 'Posted journal entry lines cannot be changed.'
         → RESULT: Lines insert FAILS ❌

Step 3: Error handler: DELETE FROM journal_entries WHERE id = <posted header>
         → T3 checks: OLD.status = 'posted'? YES
         → T3 RAISES EXCEPTION: 'Posted journal entries cannot be deleted.'
         → RESULT: Rollback delete FAILS ❌

FINAL STATE: Orphaned posted header with zero lines, silent failure
```

### 3.2 Per-Hook Verification

| Hook | Step 1: Status | Step 1 Line | Step 2: Lines Insert | Step 2 Line | T6 Blocks? | Step 3: Rollback | Step 3 Line | T3 Blocks? | Totals Passed? |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| useRentalPaymentJournalIntegration | `posted` | :199 | INSERT lines | :220-221 | **YES** | `.delete()` | :226 | **YES** | ✅ :197-198 |
| useVehicleInstallmentJournalIntegration | `posted` | :115 | INSERT lines | :178-180 | **YES** | `.delete()` | :185 | **YES** | ❌ |
| usePayrollJournalIntegration | `posted` | :66 | INSERT lines | :131-133 | **YES** | `.delete()` | :138 | **YES** | ❌ |
| useMaintenanceJournalIntegration | `posted` | :67 | INSERT lines | :158-160 | **YES** | `.delete()` | :165 | **YES** | ❌ |
| useTrafficViolationJournalIntegration | `posted` | :126 | INSERT lines | :133-135 | **YES** | `.delete()` | :138 | **YES** | ❌ |
| **useConvertToLegalCase** | `posted` | :282 | INSERT lines | :293 | **YES** | N/A | — | N/A | ✅ :280-281 |
| **usePaymentOperations** (reference) | `draft` :1343 | INSERT lines :1377-1379 → UPDATE to `posted` :1388-1389 | **NO** (parent is `draft` when lines insert) | `.delete()` :1382 | **NO** (draft can be deleted) | ✅ :1347-1348 |

### 3.3 The Balance Check Loophole (T4)

**`20260627001000:169`:** `IF ABS(COALESCE(NEW.total_debit, 0) - COALESCE(NEW.total_credit, 0)) > 0.01`

When `total_debit` and `total_credit` are NOT passed by the hook:
- `COALESCE(NULL, 0) = 0`
- `ABS(0 - 0) = 0 ≤ 0.01` → **passes**
- The header is created successfully as `posted`

When `total_debit` and `total_credit` ARE passed but mismatched:
- `ABS(X - Y) > 0.01` → **blocked**
- This is what `useRentalPaymentJournalIntegration.ts:169` catches (it checks balance client-side)

**Impact:** The balance check is a **header-only** check. It doesn't verify that the sum of individual line debits equals `total_debit`. If the header passes (0=0 loophole), the lines are still blocked by T6.

---

## 4. Accounting Logic Per Hook — Verified

### 4.1 useRentalPaymentJournalIntegration ✅ Correct Logic, Wrong Pattern

| Account | Debit | Credit | Line |
|---------|:---:|:---:|------|
| Cash/Bank | rent_amount | — | :147-150 |
| Accounts Receivable | — | rent_amount | :155-160 |
| (if fine) Late Fee Expense | fine | — | :128-129 |
| (if fine) Cash/Bank | — | fine | :137-138 |
| (if total_paid) Cash/Bank | total_paid | — | :149-150 |
| (if total_paid) AR | — | total_paid | :158-159 |

**Balance check:** ✅ Client-side `Math.abs(total_debit - total_credit) > 0.01` at :169  
**Totals passed to DB:** ✅ `total_debit` :197, `total_credit` :198  
**Accounting logic:** ✅ Correct  
**Pattern:** ❌ `posted` first, then lines → T6 blocks lines  

### 4.2 useVehicleInstallmentJournalIntegration 🔴 Wrong Accounting + Wrong Pattern

| Account | Debit | Credit | Line |
|---------|:---:|:---:|------|
| Revenue OR Expense (first match) | totalPayment | — | :129-132 |
| Cash (1010/1111) | — | totalPayment | :137-141 |
| (if interest) Interest Expense | interestAmount | — | :166-169 |

**The accounting error:** Paying a vehicle installment to a vendor should debit **Accounts Payable / Vendor Liability** (reducing what the company owes). Instead, the hook debits:
1. First tries: `account_type = 'revenue'` (line 50) — **wrong**
2. Fallback: `account_type = 'expenses'` with "vehicle purchase" filter (line 61) — **also wrong**

It never queries for a liability/payable account. This debits revenue (reducing income) or an expense (increasing costs) when it should reduce a liability.

**Correct entry:** Debit: Accounts Payable / Vehicle Payable, Credit: Cash  
**Totals passed to DB:** ❌  
**Pattern:** ❌ `posted` first  

### 4.3 usePayrollJournalIntegration ⚠️ Unbalanced If Deductions > 0 + Wrong Pattern

**Accrual entry (status ≠ 'paid'):**

| Account | Debit | Credit | Line |
|---------|:---:|:---:|------|
| 5300 (Salaries Expense) | basicSalary | — | :83-87 |
| 5400 (Benefits Expense) | allowances | — | :94-98 |
| 2200 (Salaries Payable) | — | netSalary | :116-120 |

- Total Debit = basicSalary + allowances = **gross**
- Total Credit = netSalary = gross - deductions
- **If deductions > 0:** entry is unbalanced by `deductions` amount
- **If deductions = 0:** entry is balanced (gross = net)

**The missing line:** There should be a credit line for the deduction (e.g., Credit: 2300 Taxes Payable for `deductions` amount) to balance the entry.

**Payment entry (status = 'paid'):**

| Account | Debit | Credit | Line |
|---------|:---:|:---:|------|
| 2200 (Salaries Payable) | netSalary | — | :223-226 |
| 1010 (Cash) | — | netSalary | :231-234 |

- This entry IS balanced (netSalary = netSalary) ✅

**Totals passed to DB:** ❌  
**Pattern:** ❌ `posted` first  

### 4.4 useMaintenanceJournalIntegration ✅ Correct Logic, Wrong Pattern

**Fully paid:**

| Account | Debit | Credit | Line |
|---------|:---:|:---:|------|
| 5200 (Maintenance Expense) | cost | — | :85-89 |
| 1010 (Cash) | — | cost | :91-97 |

**Partially paid:**

| Account | Debit | Credit | Line |
|---------|:---:|:---:|------|
| 5200 | cost | — | :103-107 |
| 1010 | — | amount_paid | :112-118 |
| 2100 (Accounts Payable) | — | remaining | :124-130 |

**Not paid:**

| Account | Debit | Credit | Line |
|---------|:---:|:---:|------|
| 5200 | cost | — | :136-140 |
| 2100 | — | cost | :142-148 |

All three scenarios are balanced ✅  
**Totals passed to DB:** ❌  
**Pattern:** ❌ `posted` first, then lines → T6 blocks  
**Update method:** Delete and recreate (:201) → T3 blocks delete of posted  

### 4.5 useTrafficViolationJournalIntegration ✅ Correct Logic, Wrong Pattern

| Account | Debit | Credit | Line |
|---------|:---:|:---:|------|
| 5700 (Violation Expense) | amount | — | :102-106 |
| 1010 (Cash) | — | amount | :108-113 |

Balanced ✅  
**Totals passed to DB:** ❌  
**Pattern:** ❌ `posted` first  

### 4.6 useConvertToLegalCase 🔴 Same Pattern + Hardcoded IDs

**Transfer entry (:272-310):**

| Account | Debit | Credit | Line |
|---------|:---:|:---:|------|
| `'1203'` (hardcoded) | total_debt | — | :296-299 |
| `'1200'` (hardcoded) | — | total_debt | :304-308 |

**Provision entry (:314-345):**

| Account | Debit | Credit | Line |
|---------|:---:|:---:|------|
| `'5401'` (hardcoded) | provisionAmount | — | :337-340 |
| `'1204'` (hardcoded) | — | provisionAmount | :345-348 |

- Status: `posted` at :282 and :324 → T6 blocks lines
- Account IDs: hardcoded strings (`'1203'`, `'1200'`, `'5401'`, `'1204'`) passed as `account_id` (should be UUIDs)
- TODO comments confirm the developer knew this was wrong

---

## 5. Financial Reports — Verified

### 5.1 Report Type Support Map

| Report Type | Supported In | Hook/Component | Math.abs()? | Line Refs |
|-------------|:---:|---------|:---:|---------|
| Trial Balance | ✅ | `useEnhancedFinancialReports.ts:417` | ❌ | :417 |
| Income Statement | ⚠️ | `useEnhancedFinancialReports.ts:449` | ✅ :460, :474 | — |
| Balance Sheet | ⚠️ | `useEnhancedFinancialReports.ts:505` | ✅ :527, :541, :555 | — |
| Cash Flow | ✅ (separate) | `CashFlowStatementReport.tsx` + `ledgerCashFlowReportRules.ts` + `useAdvancedFinancialAnalytics.ts` | See below | — |
| Financial Integrity | ✅ | RPC `get_financial_integrity_report` (`20260627001000:240`) | N/A (DB-side) | — |

**Correction from v2/v3:** Cash flow IS supported, but through a separate path, not via `useEnhancedFinancialReports`. The component `CashFlowStatementReport.tsx` exists. The rules engine `ledgerCashFlowReportRules.ts` classifies lines into operating/investing/financing based on account codes (:31-38).

**However:** `useAdvancedFinancialAnalytics.ts:267-269` uses **estimated ratios** for cash flow categories:
```typescript
operatingCashFlow: netCashFlow * 0.8, // تقدير
investingCashFlow: netCashFlow * 0.1, // تقدير
financingCashFlow: netCashFlow * 0.1, // تقدير
```
This is NOT real cash flow analysis — it's a proportional estimate.

### 5.2 Math.abs() Usage (Verified — 27 Occurrences in 10 Files)

| File | Count | Lines |
|------|:---:|-------|
| `useGeneralLedger.ts` | 10 | :633, :636, :639, :642, :645, :701, :704, :707, :710, :713 |
| `useEnhancedFinancialReports.ts` | 5 | :460, :474, :527, :541, :555 |
| `useCreateCustomerWithAccount.ts` | 4 | — |
| `useFinance.ts` | 2 | — |
| `useRentalPaymentJournalIntegration.ts` | 1 | :169 (balance check — legitimate use) |
| Others | 5 | — |

**Impact in reports:** `Math.abs(balance)` at :460/:474/:527/:541/:555 treats ALL balances as positive regardless of sign. A credit balance on an asset account (abnormal) appears as a positive asset. A debit balance on a revenue account (abnormal) appears as positive revenue. This masks accounting errors.

**Legitimate use:** `useRentalPaymentJournalIntegration.ts:169` — `Math.abs(total_debit - total_credit) > 0.01` is correct (checking that two positive numbers are equal).

### 5.3 useReverseJournalEntry (useGeneralLedger.ts:831-865)

```typescript
// Line 837-847:
// For now, just update the status to reversed
// In full implementation, would create a reversal entry
const { data, error } = await supabase
  .from("journal_entries")
  .update({ status: 'reversed', reversed_by: user?.id, reversed_at: ... })
  .eq("id", entryId)
  .eq("status", "posted")
```

**T4 analysis:** The trigger at `20260627001000:175-185` blocks UPDATE to posted entries for specific fields. `status` is NOT in the blocked list. So this update **succeeds** at the DB level.

**The problem:** No reversal entry is created. The original debit/credit lines remain in the balances. The status changes to `reversed` but the financial impact is NOT reversed. This means:
- Account balances still include the reversed entry's amounts
- Trial balance includes the reversed entry
- A=L+E is corrupted

### 5.4 useExportLedgerData (useGeneralLedger.ts:917-939)

```typescript
// Line 928-930:
return `Export request for ${format} format has been queued for processing.`
```

**Verified:** Fake stub. Returns a string message, shows success toast, generates no file.

### 5.5 useDeleteJournalEntry (useGeneralLedger.ts:868-895)

**Verified:** Checks `entry.status !== 'draft'` at :880 and throws: `"Only draft journal entries can be deleted. Posted entries must be reversed."`  
This is a **client-side check**. The DB trigger (T3) is the real enforcement. If the client check is bypassed (e.g., via direct API call), T3 catches it.

### 5.6 get_financial_integrity_report RPC (20260627001000:240-341)

**Verified by reading the full function.** It checks:
1. `completed_payment_without_journal` — payments with status `completed` but no JE linked (:283-288)
2. `unbalanced_journal_entries` — JEs where `ABS(total_debit - total_credit) > 0.01` (:291-296)
3. `invoice_paid_amount_mismatch` — invoice.paid_amount ≠ sum of completed payments (:298-303)
4. `overpaid_invoices` — actual_paid > total_amount (:305-310)

**Does NOT check:** A=L+E (no assets/liabilities/equity comparison)

---

## 6. Approval Workflow — Verified

### 6.1 Verification Logic EXISTS But Is NOT Wired In

**`financialApprovalWorkflowRules.ts:110-139`** — `canActorApproveFinancialStep()`:
- Checks requester ≠ approver (`requester_cannot_approve` — :120)
- Checks no duplicate approval (`duplicate_step_approval` — :124)
- Checks role match (`role_mismatch` — :128)
- Checks branch scope (`branch_mismatch` — :132, `head_office_required` — :136)

**BUT:** This function is only called in test files (`financialApprovalWorkflowRules.test.ts:74,88,102,117`). It is **NOT called from any hook, component, or runtime code path.** The verification logic exists but is **not wired into the actual approval flow.**

### 6.2 useApprovalWorkflows.ts

- Creates approval requests with steps (:268-272) — each step has `approver_type` and `approver_value`
- **No approve/reject mutation hook exists in this file** — the file only has create/update/query hooks
- No `auth.uid()` verification before approving or rejecting

---

## 7. Audit Trail — Verified

**Two separate tables confirmed:**

| Operation | Table | File:Line |
|-----------|-------|-----------|
| Read (display) | `audit_logs` | `useAuditTrail.ts:86` |
| Write (record) | `audit_trail` | `useAuditTrail.ts:190` |
| Read (log viewer) | `audit_logs` | `useAuditLog.ts:54,92,170,228` |

The hook at `useAuditTrail.ts:42` explicitly acknowledges this: `"Map action names from audit_logs to audit_trail format"`

**Impact:** Audit data is split across two tables. Records written to `audit_trail` are not visible when reading from `audit_logs`, and vice versa.

---

## 8. Payment Operations — Verified

### 8.1 payments Table Missing Columns

**Verified from types.ts:13327-13376** — the `Row` type does NOT include:

| Column | Written By | Line | Exists in types.ts? |
|--------|-----------|------|:---:|
| `approved_by` | `usePaymentOperations.ts:773` | — | ❌ |
| `approved_at` | `usePaymentOperations.ts:772` | — | ❌ |
| `posted_by` | `usePaymentOperations.ts:1390` | — | ❌ |
| `posted_at` | `usePaymentOperations.ts:1391` | — | ❌ |
| `cancelled_at` | Acknowledged missing at :941-942 | — | ❌ |
| `cancelled_by` | Acknowledged missing at :941-942 | — | ❌ |

### 8.2 usePaymentOperations.ts — The Correct Pattern

**Lines 1337-1400:**

```
Step 1: INSERT journal_entries (status: 'draft', total_debit: amount, total_credit: amount)  :1338-1352
Step 2: INSERT journal_entry_lines (2 lines: debit cash, credit receivable)                :1377-1379
Step 3: UPDATE journal_entries SET status: 'posted'                                         :1386-1394
Step 4: UPDATE payments SET journal_entry_id: <entry_id>                                   :1402-1405
```

**T4 at Step 1:** INSERT with `status: 'draft'`, `total_debit = total_credit = amount` → balanced ✅, period open ✅ → passes  
**T6 at Step 2:** Parent status is `draft` (not `posted` or `reversed`) → passes ✅  
**T4 at Step 3:** UPDATE `status` from `draft` → `posted`. T4 checks immutability only when `OLD.status = 'posted'`. Here `OLD.status = 'draft'` → no immutability check → passes ✅  
**T4 at Step 3 (balance):** `ABS(total_debit - total_credit) = ABS(amount - amount) = 0` → passes ✅

**This is the correct pattern that all 5 integration hooks should follow.**

### 8.3 Cancellation Flow (usePaymentOperations.ts:935-962)

```
Step 1: Call reverseJournalEntry(paymentId)  :935
Step 2: If reversal fails → throw 'تعذر إنشاء قيد عكسي محاسبي'  :938
Step 3: UPDATE payments SET payment_status: 'cancelled', processing_notes: <audit note>  :943-957
```

The cancellation calls a reversal function before updating the payment status. If the reversal fails, the entire cancellation is blocked. This is proper atomic behavior. The code explicitly acknowledges missing columns (:941-942) and uses `processing_notes` for the audit trail instead.

---

## 9. Currency Display — Verified (Corrected)

### 9.1 File Counts

| Scope | Count | Verified By |
|-------|:---:|------------|
| Total files matching `KWD\|د.ك` in `src/` | 82 | `grep -rl` |
| Excluding test files | **74** | `grep -v __tests__ | grep -v .test.` |
| Finance components only | **25** | `grep -rl src/components/finance/` |

### 9.2 Multi-Currency Architecture

The system has a **legitimate multi-currency architecture**:
- `currencyConfig.ts:8-30` — defines configs for KWD, QAR, SAR, AED, OMR, etc.
- `useCompanyCurrency.ts:21-57` — reads company currency from DB, defaults to QAR (:27, :42)

**The problem:** 25 finance components **hardcode KWD for display** instead of using `useCompanyCurrency()`. Example — `ARAgingReport.tsx`:
- :157 — ``${(summary?.total_ar_amount || 0).toFixed(3)} KWD``
- :160 — `'Amount (KWD)'`
- :293 — `د.ك`
- :571 — `{amount.toFixed(3)} د.ك`

**Should use:** `useCompanyCurrency()` to get the active company's currency dynamically.

---

## 10. Annual Close & A=L+E Status

### 10.1 Infrastructure (Verified)

**`20260627019000_annual_financial_close.sql:1-80`:**
- `annual_financial_close_runs` table: fiscal year, period, retained earnings account, closing/opening JE IDs, revenue/expense totals, net income, status (`draft → calculated → closed`)
- `annual_financial_close_lines` table: line_type (`income_close`, `opening_balance`) with debit/credit
- RLS policies for company-level access
- Unique constraint per company+fiscal_year

**The infrastructure exists for proper closing entries that transfer net income to retained earnings.**

### 10.2 A=L+E Status — CANNOT VERIFY

**Cannot be confirmed from code inspection.** Requires either:
- A live database query (`SELECT get_financial_integrity_report(...)`)
- Reading `annual_financial_close_runs` for executed close runs
- Running a trial balance and verifying assets = liabilities + equity

Previous reports (v2) incorrectly stated this as confirmed based on memory. This was wrong — memory is not a substitute for verified production data.

---

## 11. Mock/Stale Data — Verified

| Source | File:Line | Finding |
|--------|-----------|---------|
| Hardcoded account IDs | `useConvertToLegalCase.ts:296,304,337,345` | Account codes (`'1203'`, `'1200'`, `'5401'`, `'1204'`) passed as UUID `account_id` |
| Mock monthly trends | `useCostCenterReports.ts:134` | `"// Monthly trends (mock data for now)"` |
| AI score placeholder | `useFinancialSystemAnalysis.ts:124` | `"50 * 0.10) // AI score placeholder"` |
| Mock recent reports | `useRecentReports.ts:3` | `"Currently returns mock implementation"` |
| Export stub | `useGeneralLedger.ts:928-930` | Returns fake success message, no file generated |
| Cash flow estimates | `useAdvancedFinancialAnalytics.ts:267-269` | `operatingCashFlow: netCashFlow * 0.8` — proportional estimate, not real calculation |

---

## 12. Integration Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│ SOURCE MODULES                                                           │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┤
│ Contracts    │ Vehicles     │ Maintenance  │ Violations   │ Payroll      │
│ (payments)   │ (installments│ (maintenance)│ (traffic_viol│ (payroll)    │
│               │ )            │              │ ations)      │              │
│ + Legal Cases │              │              │              │              │
└──────┬───────┴──────┬──────┴──────┬──────┴──────┬───────┴──────┬───────┘
       │              │             │              │              │
       ▼              ▼             ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ INTEGRATION HOOKS (6 total — ALL use posted-first pattern)               │
│                                                                          │
│ BROKEN PATTERN (all 6):                                                  │
│   1. INSERT journal_entries (status='posted')  → T4: header passes       │
│   2. INSERT journal_entry_lines               → T6: BLOCKS (posted)      │
│   3. ROLLBACK: DELETE journal_entries          → T3: BLOCKS (posted)    │
│   Result: orphaned posted header, no lines, silent failure                │
│                                                                          │
│ CORRECT PATTERN (usePaymentOperations only):                              │
│   1. INSERT journal_entries (status='draft')   → T4: passes              │
│   2. INSERT journal_entry_lines                → T6: passes (draft)      │
│   3. UPDATE journal_entries (status='posted')  → T4: passes (not posted)│
├────────────────┬──────────────────┬────────────────┬────────────────────┤
│ useRental       │ useVehicle       │ useMaintenance │ usePayroll         │
│ PaymentJournal   │ Installment      │ Journal         │ Journal            │
│ ✅ totals       │ ❌ no totals     │ ❌ no totals   │ ❌ no totals       │
│ ✅ balance chk  │ 🔴 wrong debit   │ ✅ correct     │ ⚠️ unbalanced      │
│ ✅ correct acct │    account       │    acct logic  │    if deductions>0│
│ ❌ posted-first │ ❌ posted-first  │ ❌ posted-first│ ❌ posted-first    │
├────────────────┤    │              │                │                    │
│ useTraffic      │    │              │                │                    │
│ ViolationJournal │    │              │                │                    │
│ ✅ correct acct │    │              │                │                    │
│ ❌ posted-first │    │              │                │                    │
│ ❌ no totals    │    │              │                │                    │
├────────────────┤    │              │                │                    │
│ useConvertTo    │    │              │                │                    │
│ LegalCase       │    │              │                │                    │
│ ✅ totals       │    │              │                │                    │
│ 🔴 hardcoded    │    │              │                │                    │
│    account IDs  │    │              │                │                    │
│ ❌ posted-first │    │              │                │                    │
└────────┬───────┴────┴──────────────┴────────────────┴────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ DATABASE TRIGGERS (7 triggers — all verified by reading migration files)  │
├──────────────────────────────────────────────────────────────────────────┤
│ T1: payments DELETE        → Block hard delete (unconditional)           │
│ T2: payments INSERT/UPDATE  → Enforce financial controls (period, etc.)   │
│ T3: journal_entries DELETE  → Block if status='posted'                    │
│ T4: journal_entries INS/UPD → Period open + balanced + posted immutability│
│ T5: invoices INS/UPD/DEL   → Period + payment/JE existence checks         │
│ T6: journal_entry_lines    → Block ALL ops if parent is 'posted'/'reversed'│
│ T7: invoices DELETE         → Block if has payments                       │
│                                                                          │
│ Bypass: SET app.financial_controls_bypass = 'on'                         │
│   → Only SECURITY DEFINER RPCs activate this (cancel_invoice, etc.)     │
│   → Client-side hooks CANNOT bypass — they run as 'authenticated'        │
│                                                                          │
│ RPCs:                                                                    │
│   ensure_payment_journal_entry()      — SECURITY DEFINER, bypasses ctrl   │
│   restore_cancelled_import_payments() — SECURITY DEFINER, bypasses ctrl   │
│   get_financial_integrity_report()    — Checks 4 issues (not A=L+E)      │
│                                                                          │
│ Annual Close:                                                             │
│   annual_financial_close_runs/lines tables — infrastructure exists       │
│   Execution status: CANNOT VERIFY from code alone                         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Risk Assessment

### 🔴 Critical

| # | Risk | Evidence | Impact |
|---|------|----------|--------|
| 1 | **All 6 integration hooks create header as `posted` before inserting lines — T6 blocks line INSERT** | Hooks: :199/:115/:66/:67/:126/:282 (header `posted`); Trigger: `20260627011000:21-24` | All automated journal entries fail silently; orphaned posted headers accumulate |
| 2 | **Rollback DELETE of posted headers also fails — T3 blocks** | Hooks: :226/:185/:138/:165; Trigger: `20260627001000:142-144` | Orphaned headers cannot be cleaned up without DB-level bypass |
| 3 | **Vehicle installment debit account is revenue/expense, not payable** | `useVehicleInstallmentJournalIntegration.ts:50,61,78-79` | Fundamentally wrong accounting — revenue/expense misstated |
| 4 | **Payroll accrual entry unbalanced when deductions > 0** (debit=gross, credit=net, no deduction offset) | `usePayrollJournalIntegration.ts:52,83-120` | Even if line insert succeeds (via bypass), entry is unbalanced |
| 5 | **`useReverseJournalEntry` changes status only, no reversal entry created** | `useGeneralLedger.ts:837-847` | Original lines remain in balances; A=L+E corrupted |
| 6 | **Hardcoded account IDs in `useConvertToLegalCase.ts`** (account codes as UUIDs) | :296, :304, :337, :345 | Will link to wrong accounts or fail FK constraint |
| 7 | **Export function is a fake stub** | `useGeneralLedger.ts:928-930` | Users see "success" but no file generated |
| 8 | **`approved_by`/`approved_at`/`posted_by`/`posted_at` written to payments but columns don't exist** | `usePaymentOperations.ts:772-773,1390-1391` vs `types.ts:13327` | Writes may silently fail |

### ⚠️ High

| # | Risk | Evidence | Impact |
|---|------|----------|--------|
| 9 | **`Math.abs()` in financial reports** (27 occurrences in 10 files) | `useGeneralLedger.ts:633-713`; `useEnhancedFinancialReports.ts:460,474,527,541,555` | Hides accounting signs; inflates totals; masks abnormal balances |
| 10 | **Cash flow analysis uses estimated ratios, not real calculation** | `useAdvancedFinancialAnalytics.ts:267-269` (`* 0.8`, `* 0.1`, `* 0.1`) | Cash flow categories are fake estimates |
| 11 | **4 of 6 hooks don't pass `total_debit`/`total_credit`** — T4 balance check passes via 0=0 loophole | Verified across all hooks | DB balance check is ineffective when totals omitted |
| 12 | **Approval verification logic exists but is NOT wired in** | `financialApprovalWorkflowRules.ts:110-139` — only called in tests | Any user can approve/reject; no runtime verification |
| 13 | **Two separate audit tables** (`audit_logs` vs `audit_trail`) | `useAuditTrail.ts:86` vs `:190` | Audit data fragmented |
| 14 | **25 finance components hardcode KWD** instead of `useCompanyCurrency()` | `grep` count: 25 in `src/components/finance/` | Wrong currency in reports for QAR-based companies |
| 15 | **No period lock check in integration hooks** | None of the 6 hooks check locked periods | DB catches it (T4), but no user-friendly error |
| 16 | **Hooks use delete-and-recreate pattern instead of reversal** | `useMaintenanceJournalIntegration.ts:201`; all hooks `.delete()` on rollback | T3 blocks delete of posted entries; pattern is architecturally wrong |

### 🟡 Medium

| # | Risk | Evidence | Impact |
|---|------|----------|--------|
| 17 | Mock data in `useCostCenterReports.ts:134` | Monthly trends are mock | Fake trend data in reports |
| 18 | AI score placeholder in `useFinancialSystemAnalysis.ts:124` | Hardcoded calculation | Artificial analysis score |
| 19 | `useRecentReports.ts:3` — mock implementation | Stub | Recent reports not functional |
| 20 | `useFinancialIntegrityReport` doesn't check A=L+E | `20260627001000:240-341` — no assets/liabilities/equity fields | Missing fundamental integrity check |
| 21 | Hooks create entries as `posted` directly | All 6 hooks | No approval workflow for automated entries |

---

## 14. Recommendations (No Code Changes)

### 🔴 Critical

1. **Change ALL 6 integration hooks to follow the `draft → lines → posted` pattern.** Template: `usePaymentOperations.ts:1337-1394`.
2. **Fix vehicle installment debit account** — query for liability/payable account, not revenue/expense.
3. **Fix payroll deductions** — add a credit line for deductions (e.g., Credit: 2300 Taxes Payable) so debit=gross=credit.
4. **Implement reversal entry creation** in `useReverseJournalEntry` — create a new JE with reversed debit/credit lines, not just a status update.
5. **Replace hardcoded account IDs** in `useConvertToLegalCase.ts` with dynamic lookup from `chart_of_accounts`.
6. **Implement actual export** in `useExportLedgerData` or remove the fake success message.
7. **Add missing columns** (`approved_by`, `approved_at`, `posted_by`, `posted_at`, `cancelled_at`, `cancelled_by`) to `payments` table or remove the writes.

### ⚠️ High

8. **Remove `Math.abs()` from financial report calculations** — use signed balances with account-type-aware logic.
9. **Replace cash flow estimates** in `useAdvancedFinancialAnalytics.ts:267-269` with real categorization from `ledgerCashFlowReportRules.ts`.
10. **Pass `total_debit`/`total_credit` in all hooks** — don't rely on the 0=0 loophole.
11. **Wire `canActorApproveFinancialStep()` into the actual approval flow** — it exists but is only called in tests.
12. **Consolidate audit tables** to a single table.
13. **Replace hardcoded KWD in 25 finance components** with `useCompanyCurrency()`.
14. **Add period lock checks in integration hooks** before creating journal entries.
15. **Switch hooks from delete-and-recreate to reversal entry pattern.**

### 🟡 Medium

16. Replace mock data in `useCostCenterReports` and `useFinancialSystemAnalysis`.
17. Implement `useRecentReports` with actual report history.
18. Add A=L+E check to `get_financial_integrity_report` RPC.
19. Consider creating automated entries as `draft` first, requiring approval before posting.
20. **Verify A=L+E balance with a live database query** — cannot confirm from code alone.

---

## 15. Methodology Statement

### What This Report Did

1. **Read every financial migration file** (26 listed + 10 additional found by search = 36 total) and extracted every trigger, function, constraint, and table definition
2. **Built a trigger matrix** mapping each trigger to: table, operation, timing, condition, exception
3. **Read every integration hook** and traced the exact operation sequence (which table, which operation, in what order, with what status)
4. **Cross-referenced each hook operation against the trigger matrix** — asking "will this operation trigger this trigger? what will happen?"
5. **Verified the bypass mechanism** — reading `financial_controls_bypass_enabled()` and searching for all `set_config('app.financial_controls_bypass', ...)` calls
6. **Read types.ts directly** for each financial table's column list
7. **Read every financial report hook** for Math.abs() usage, report type support, and reversal/export logic
8. **Read the approval workflow hook AND the approval rules utility** — discovering the verification logic exists but is unwired
9. **Counted currency references** with exact grep commands

### What Previous Reports Got Wrong and Why

| Error | Root Cause |
|-------|-----------|
| v1: "deposits table doesn't exist" | Trusted subagent summary, didn't read `useDeposits.ts:48` |
| v1: "payroll has no journal_entry_id" | Trusted subagent summary, didn't read `types.ts:13712` |
| v1: "RPCs may not be published" | Didn't read migration files `20260702000001` and `20260702153000` |
| v1: "posted entries can be deleted" | Read `20260627001000` but not `20260627011000` |
| v2: "hooks may fail due to missing total_debit/total_credit" | Didn't identify T6 as the primary failure mechanism — focused on T4's balance check only |
| v2: "payroll credits Cash AND Salaries Payable = 2 × netSalary" | Didn't read the if/else at :103-123 carefully — it's one or the other, not both |
| v2: "DB trigger will reject entries without total_debit/total_credit" | Didn't notice the `COALESCE(NEW.total_debit, 0)` defaults to 0, making 0=0 pass |
| v2: "A=L+E balance was resolved" | Stated as fact based on memory, not verifiable from code |
| v2: "50 files contain KWD" | Used search_files with a limit instead of grep -rl — actual count is 74 non-test |
| v2/v3: "approval workflow doesn't verify approver" | Didn't search for `canActorApproveFinancialStep` in utility files — it exists but is unwired |
| v2/v3: "cash_flow not supported" | Only searched `useEnhancedFinancialReports`, didn't find `CashFlowStatementReport.tsx` + `ledgerCashFlowReportRules.ts` |
| v3: "useRentalPaymentJournalIntegration is BEST HOOK" | Misleading — it has correct accounting logic but still uses the broken posted-first pattern |

---

*End of v4 final audit report. Every finding verified with file:line reference read directly by the auditor.*