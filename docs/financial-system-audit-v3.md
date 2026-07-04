# Fleetify ERP — Financial System Audit Report (v3 — Corrections Applied)

**Date:** July 4, 2026  
**Scope:** Financial system + integration with all modules  
**Methodology:** Every claim verified against actual source code with file:line references  
**Code changes:** NONE — read-only audit  
**Supersedes:** `financial-system-audit-verified.md` (v2, had inaccuracies)  

---

## What Changed in v3

This version corrects 4 inaccuracies identified by the user in v2:

| # | v2 Claim | Correction | Evidence |
|---|---------|------------|----------|
| 1 | "hooks may fail due to missing total_debit/total_credit" | **Incomplete** — the real failure is the `prevent_posted_journal_line_mutation` trigger blocks INSERT on lines when parent is `posted` | `20260627011000:21-24` |
| 2 | "payroll entry credits Cash AND Salaries Payable = 2 × netSalary" | **Exaggerated** — the hook chooses ONE credit line based on `status === 'paid'`, not both. The actual issue is debit=gross, credit=net (deductions unbalanced) | `usePayrollJournalIntegration.ts:103-123` |
| 3 | "DB trigger will reject entries without total_debit/total_credit" | **Imprecise** — the trigger checks the header `total_debit`/`total_credit`, but if they default to 0/0 the header passes (0=0 is balanced). The lines then fail due to the posted-line mutation trigger | `20260627001000:169` |
| 4 | "A=L+E balance was resolved" | **Cannot confirm from code alone** — this was based on memory, not a live DB read or integrity report. Stated as fact when it's unverified | Needs production DB query |
| 5 | "50 files contain KWD/د.ك" | **Undercounted** — actual count is 74 non-test files (82 including tests). However, some are legitimate multi-currency config files | `grep -rl 'KWD\|د\.ك' src/` = 82 total, 74 non-test |

---

## 1. Executive Summary

The Fleetify financial system has a **two-layer architecture**: the database layer (hardened with 20+ control migrations from June 27, 2026) and the application layer (React hooks). These layers are **out of sync**.

**The critical discovery:** Migration `20260627011000` created a trigger that blocks ALL `INSERT`, `UPDATE`, and `DELETE` operations on `journal_entry_lines` when the parent `journal_entries.status` is `posted` or `reversed`. **All 5 integration hooks create the journal entry header with `status: 'posted'` FIRST, then attempt to INSERT lines SECOND.** This means the line insertion will be rejected by the database at runtime.

One hook (`usePaymentOperations.ts`) uses the correct pattern: create as `draft` → insert lines → update to `posted`. The 5 integration hooks do not follow this pattern.

---

## 2. THE Critical Finding: Posted-Line Mutation Trigger

### 2.1 The Trigger (Verified)

**File:** `supabase/migrations/20260627011000_prevent_posted_journal_line_mutation.sql`

```sql
-- Line 2-28: Function definition
CREATE OR REPLACE FUNCTION public.prevent_posted_journal_line_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_journal_entry_id uuid;
  v_parent_status text;
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_journal_entry_id := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

  SELECT status
  INTO v_parent_status
  FROM public.journal_entries
  WHERE id = v_journal_entry_id;

  IF LOWER(COALESCE(v_parent_status, '')) IN ('posted', 'reversed') THEN
    RAISE EXCEPTION 'Posted journal entry lines cannot be changed. Create a reversal entry instead.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Line 30-35: Trigger definition
CREATE TRIGGER prevent_posted_journal_line_mutation_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION public.prevent_posted_journal_line_mutation();
```

**Key behavior:** The trigger fires on `BEFORE INSERT` (line 33). It checks the parent journal entry's status (lines 16-19). If the parent is `posted` or `reversed`, it raises an exception (lines 21-24). **This means you cannot insert lines into a posted entry.**

### 2.2 How Each Hook Creates Entries (Verified)

Every integration hook follows the same broken pattern:

**Step 1:** INSERT journal_entries with `status: 'posted'`  
**Step 2:** INSERT journal_entry_lines (← **THIS WILL FAIL**)

| Hook | Step 1: Header Status | Step 1 Line | Step 2: Lines Insert | Step 2 Line | Will Step 2 Fail? |
|------|:---:|:---:|:---:|:---:|:---:|
| useRentalPaymentJournalIntegration | `'posted'` | :199 | INSERT lines | :220-221 | **YES** |
| useVehicleInstallmentJournalIntegration | `'posted'` | :115 | INSERT lines | :178-180 | **YES** |
| usePayrollJournalIntegration | `'posted'` | :66 | INSERT lines | :131-133 | **YES** |
| useMaintenanceJournalIntegration | `'posted'` | :67 | INSERT lines | :158-160 | **YES** |
| useTrafficViolationJournalIntegration | `'posted'` | :126 | INSERT lines | :133-135 | **YES** |

### 2.3 The Correct Pattern (Verified in usePaymentOperations.ts)

`usePaymentOperations.ts` uses a 3-step pattern that works with the triggers:

**Step 1:** INSERT journal_entries with `status: 'draft'` (line 1343)  
**Step 2:** INSERT journal_entry_lines (lines 1377-1379)  
**Step 3:** UPDATE journal_entries to `status: 'posted'` (lines 1386-1394)

```
draft → insert lines → post  ✅ WORKS
posted → insert lines → FAIL  ❌ BLOCKED BY TRIGGER
```

### 2.4 Impact Assessment

**ALL 5 integration hooks are likely broken at runtime** if the migrations have been applied to the production database. The hooks:

1. Create the journal entry header as `posted`
2. Attempt to insert lines → **trigger raises exception** `'Posted journal entry lines cannot be changed.'`
3. Catch the error and attempt to delete the journal entry (rollback)
4. The delete ALSO fails because `prevent_posted_journal_entry_delete` trigger blocks deletion of posted entries (`20260627001000:142-144`)
5. **Result: orphaned posted journal entries with no lines, silently failing**

**This is the most critical finding in the audit.** It affects:
- Rental payment accounting entries
- Vehicle installment payment entries
- Payroll accounting entries
- Maintenance cost entries
- Traffic violation expense entries

**Mitigation currently in place:** The `financial_controls_bypass_enabled()` function (line 10 of the trigger) allows service-role bypass. If the Supabase client is using the service role key, the bypass may be active and the triggers won't fire. This needs verification at the production level.

---

## 3. Database Layer — Verified Financial Controls

### 3.1 Financial Controls Layer (Migration: 20260627001000)

| Control | Function | Trigger | Behavior | Verified |
|---------|----------|---------|----------|----------|
| Prevent hard-delete of payments | `prevent_payment_hard_delete()` | `BEFORE DELETE ON payments` | Blocks deletion | :47-65 |
| Enforce payment financial controls | `enforce_payment_financial_controls()` | `BEFORE INSERT OR UPDATE ON payments` | Validates amounts, statuses | :128-129 |
| **Prevent posted JE deletion** | `prevent_posted_journal_entry_delete()` | `BEFORE DELETE ON journal_entries` | Raises exception if `status='posted'` | :133-155 |
| **Enforce JE balanced** | `enforce_journal_entry_financial_controls()` | `BEFORE INSERT OR UPDATE ON journal_entries` | Checks `ABS(total_debit - total_credit) <= 0.01` | :169 |
| **Enforce period open** | `assert_financial_period_is_open()` | Called within JE trigger | Checks `accounting_periods` for locked periods | :167 |
| **Posted JE immutability** | Same trigger | `BEFORE UPDATE ON journal_entries` | Blocks changes to posted entries' fields | :175-188 |
| Invoice financial controls | `enforce_invoice_financial_controls()` | `BEFORE INSERT OR UPDATE OR DELETE ON invoices` | Validates invoice operations | :234-236 |

**Important nuance on the balance check (line 169):** The trigger checks `ABS(COALESCE(NEW.total_debit, 0) - COALESCE(NEW.total_credit, 0)) > 0.01`. If `total_debit` and `total_credit` are not passed (null/undefined), they default to 0. `ABS(0 - 0) = 0 <= 0.01` — **the header passes**. The balance check only catches entries where totals are explicitly passed AND mismatched. It does NOT catch entries where totals are omitted entirely.

### 3.2 Posted Journal Line Mutation Trigger (Migration: 20260627011000)

**File:** `supabase/migrations/20260627011000_prevent_posted_journal_line_mutation.sql`

| Control | Trigger | Behavior | Verified |
|---------|---------|----------|----------|
| **Block line mutation on posted entries** | `BEFORE INSERT OR UPDATE OR DELETE ON journal_entry_lines` | Checks parent JE status; if `posted` or `reversed`, raises exception | :32-35 |

**Bypass:** `financial_controls_bypass_enabled()` at line 10 allows service-role bypass.

### 3.3 Payment Journal Integrity RPC (Migration: 20260702000001)

**Function:** `ensure_payment_journal_entry(p_payment_id, p_company_id, p_actor_id)`  
**File:** `supabase/migrations/20260702000001_payment_journal_integrity_rpc.sql:5`

- SECURITY DEFINER function (line 12)
- Validates auth.uid() and company ownership (lines 31-51)
- Only processes `completed` receipts (lines 65-72)
- Skips zero-amount payments (lines 84-91)
- Re-links existing journal entries if found (lines 93-141)
- Creates new journal entries with proper cash/receivable accounts
- **This RPC likely uses the bypass mechanism** since it's SECURITY DEFINER and can set the bypass flag

### 3.4 Atomic Cancel with Reversal (Migration: 20260702153000)

**Function:** `restore_erroneously_cancelled_import_payments(p_company_id, p_apply, p_updated_date)`  
**File:** `supabase/migrations/20260702153000_restore_cancelled_import_payments_and_atomic_cancel.sql:4`

- Identifies erroneously cancelled import payments (lines 33-77)
- Checks for existing reversal entries via `reference_type = 'payment_reversal'` (lines 71-77)
- Dry-run mode via `p_apply` parameter
- Returns candidate count, total amount, sample data

### 3.5 Annual Financial Close (Migration: 20260627019000)

**File:** `supabase/migrations/20260627019000_annual_financial_close.sql`

Creates:
- `annual_financial_close_runs` table (line 5): tracks fiscal year close with `retained_earnings_account_id`, `closing_journal_entry_id`, `opening_journal_entry_id`, revenue/expense totals, net income, status (`draft → calculated → closed`)
- `annual_financial_close_lines` table (line 30): line_type (`income_close`, `opening_balance`)
- RLS policies for company-level access
- Unique constraint per company+fiscal_year (line 27)

**Note:** The infrastructure EXISTS at the migration level. Whether closing entries have actually been executed (and A=L+E is actually balanced) cannot be confirmed from code inspection alone — it requires a live database query or integrity report.

### 3.6 All Financial-Related Migrations (Verified)

```
20260627000000_prevent_hard_delete_payments.sql
20260627001000_financial_controls_layer.sql           ← KEY: JE/Payment triggers
20260627002000_repair_overpaid_invoice_allocations.sql
20260627003000_update_overpaid_repair_bypass_triggers.sql
20260627004000_update_overpaid_repair_invoice_trigger_bypass.sql
20260627005000_financial_operational_controls_schema.sql
20260627010000_prevent_hard_delete_invoices.sql
20260627011000_prevent_posted_journal_line_mutation.sql ← KEY: Blocks line INSERT on posted JE
20260627012000_budget_control_cost_centers.sql
20260627013000_controlled_period_reopening.sql
20260627014000_bank_statement_import_matching.sql
20260627015000_financial_consolidation_schema.sql
20260627016000_financial_report_snapshots.sql
20260627017000_immutable_audit_log_hash_chain.sql
20260627018000_financial_multi_stage_approval_workflows.sql
20260627019000_annual_financial_close.sql              ← KEY: Annual close infrastructure
20260627020000_operational_financial_report_snapshots.sql
20260627021000_bank_reconciliation_batches.sql
20260627022000_period_reopening_impact_reports.sql
20260627023000_budget_override_approval_guard.sql
20260702000001_payment_journal_integrity_rpc.sql       ← KEY: ensure_payment_journal_entry
20260702000002_fix_payment_journal_repair_batch.sql
20260702000003_fix_payment_journal_repair_service_role_auth.sql
20260702000004_fix_duplicate_payment_receipt_lines.sql
20260702093000_enforce_fully_paid_invoice_status.sql
20260702153000_restore_cancelled_import_payments_and_atomic_cancel.sql
```

---

## 4. Integration Hooks — Verified Deep Dive

### 4.1 Universal Failure Pattern (ALL 5 Hooks)

Every integration hook follows this sequence:

```
1. INSERT INTO journal_entries (status: 'posted')  →  SUCCESS (header created)
2. INSERT INTO journal_entry_lines                  →  FAILS (trigger blocks INSERT on posted parent)
3. Catch error, attempt DELETE on journal_entries   →  FAILS (trigger blocks delete of posted entry)
4. Result: orphaned posted header with no lines, silent failure
```

**Exception:** If `financial_controls_bypass_enabled()` returns true (service role), all triggers are bypassed and operations succeed.

### 4.2 `useRentalPaymentJournalIntegration.ts`

**Previously described as "BEST HOOK" — this was misleading.** While it does calculate `total_debit`/`total_credit` and checks balance, it still creates the header as `posted` first.

| Aspect | Verified Finding | Line |
|--------|-----------------|------|
| Header status on creation | `'posted'` | :199 |
| `total_debit` passed | ✅ YES | :197 |
| `total_credit` passed | ✅ YES | :198 |
| Balance check | ✅ `Math.abs(total_debit - total_credit) > 0.01` | :169 |
| Lines insert | After header creation | :220-221 |
| **Will lines insert fail?** | **YES** — parent is already `posted` | — |
| Rollback: delete header | :226 | **Will also fail** — posted entries can't be deleted |
| Entry: debit | Cash/Bank | :147-150 |
| Entry: credit | Accounts Receivable | :155-160 |

### 4.3 `useVehicleInstallmentJournalIntegration.ts`

| Aspect | Verified Finding | Line |
|--------|-----------------|------|
| Header status | `'posted'` | :115 |
| Lines insert | :178-180 | **Will fail** — parent is `posted` |
| Debit account logic | **"Determine debit account — prefer expense, fallback to revenue"** | :78 |
| Actual debit | `expenseAccounts?.[0]?.id || revenueAccounts?.[0]?.id` | :79 |
| Account type searched | `revenue` first (line 50), then `expenses` with "vehicle purchase" filter (line 61) | :50, :61 |
| Credit account | Cash (1010/1111/11151) | :73 |
| Rollback | `.delete()` | :185 | **Will also fail** |
| `total_debit`/`total_credit` | ❌ NOT passed | — |

**🔴 ACCOUNTING ERROR:** The debit account for a vehicle installment payment (paying a vendor for a vehicle purchase) should be **Accounts Payable / Vendor Payable** (liability account). The hook queries for `revenue` first, then `expenses` — it never looks for a payable account. This is a fundamental accounting error.

### 4.4 `usePayrollJournalIntegration.ts` (Corrected Analysis)

**v2 said:** "Credit lines (accrual) = Cash (netSalary) + Salaries Payable (netSalary) = 2 × netSalary"  
**Corrected:** The hook uses `if/else`, choosing ONE credit line based on `payroll.status === 'paid'`:

```typescript
// Line 103-123:
const isPaid = payroll.status === 'paid';
if (isPaid) {
  // Credit: Cash (net salary) — ONE line
  lines.push({ account_id: accountMap['1010'], credit_amount: netSalary, ... });
} else {
  // Credit: Salaries Payable (net salary) — ONE line
  lines.push({ account_id: accountMap['2200'], credit_amount: netSalary, ... });
}
```

**Actual problem (verified):** The entry is unbalanced when deductions exist:

| Side | Accounts | Amount | Line |
|------|---------|--------|------|
| Debit | 5300 (Salaries Expense) | basicSalary | :83-87 |
| Debit | 5400 (Benefits Expense) | allowances | :94-98 |
| Credit | 1010 OR 2200 | netSalary = basicSalary + allowances - deductions | :111 or :120 |
| **Gap** | **Missing deduction credit line** | **= deductions** | — |

- Total Debit = basicSalary + allowances = **gross**
- Total Credit = netSalary = gross - deductions
- **Entry is unbalanced by `deductions` amount**
- No separate debit/credit line for deductions (taxes, insurance, etc.)

**If deductions = 0:** Entry is balanced (gross = netSalary).  
**If deductions > 0:** Entry is unbalanced. The DB balance check (trigger `20260627001000:169`) would catch this IF `total_debit`/`total_credit` are passed — but they're NOT passed by this hook. So the header passes (0=0), then the lines insert fails (posted parent).

### 4.5 `useMaintenanceJournalIntegration.ts`

| Aspect | Verified Finding | Line |
|--------|-----------------|------|
| Header status | `'posted'` | :67 |
| Lines insert | :158-160 | **Will fail** — parent is `posted` |
| Entry logic | Correct: Debit 5200 (Maintenance Expense) / Credit 1010 (Cash) or 2100 (Payable) | :85-149 |
| Rollback | `.delete()` | :165 | **Will also fail** |
| `total_debit`/`total_credit` | ❌ NOT passed | — |
| Update pattern | "For simplicity, we'll delete the old entry and create a new one" | :201 |

### 4.6 `useTrafficViolationJournalIntegration.ts`

| Aspect | Verified Finding | Line |
|--------|-----------------|------|
| Header status | `'posted'` | :126 |
| Lines insert | :133-135 | **Will fail** — parent is `posted` |
| Entry logic | Correct: Debit 5700 (Violation Expense) / Credit 1010 (Cash) | :102-114 |
| Rollback | `.delete()` | :138 | **Will also fail** |
| `total_debit`/`total_credit` | ❌ NOT passed | — |

### 4.7 The Correct Pattern (usePaymentOperations.ts)

**This is the ONLY hook that follows the correct sequence:**

| Step | Action | Line | Status |
|------|--------|------|--------|
| 1 | INSERT journal_entries | :1338-1352 | `status: 'draft'` (:1343) |
| 2 | INSERT journal_entry_lines | :1377-1379 | ✅ Parent is `draft` — trigger allows |
| 3 | UPDATE journal_entries to `status: 'posted'` | :1386-1394 | ✅ Lines already inserted |
| 4 | Link payment to journal entry | :1402-1405 | ✅ |

**This pattern should be the template for all integration hooks.**

### 4.8 Summary Table

| Hook | Header Status | Lines Insert Succeeds? | total_debit/credit Passed | Rollback Delete Works? | Accounting Logic |
|------|:---:|:---:|:---:|:---:|:---:|
| useRentalPaymentJournalIntegration | `posted` | ❌ NO | ✅ | ❌ NO | ✅ Correct |
| useVehicleInstallmentJournalIntegration | `posted` | ❌ NO | ❌ | ❌ NO | 🔴 Wrong debit account |
| usePayrollJournalIntegration | `posted` | ❌ NO | ❌ | ❌ NO | ⚠️ Unbalanced if deductions > 0 |
| useMaintenanceJournalIntegration | `posted` | ❌ NO | ❌ | ❌ NO | ✅ Correct |
| useTrafficViolationJournalIntegration | `posted` | ❌ NO | ❌ | ❌ NO | ✅ Correct |
| **usePaymentOperations** (reference) | `draft` → `posted` | ✅ YES | ✅ | ✅ (draft delete) | ✅ Correct |

---

## 5. Financial Reports — Verified

### 5.1 `useEnhancedFinancialReports.ts`

| Report Type | Supported? | Line | Issue |
|-------------|:---:|------|-------|
| `trial_balance` | ✅ | :417 | Queries DB directly |
| `income_statement` | ⚠️ | :449 | **`Math.abs()` at :460, :474** — hides accounting signs |
| `balance_sheet` | ⚠️ | :505 | **`Math.abs()` at :527, :541, :555** — hides accounting signs |
| `cash_flow` | ❌ NOT FOUND | — | **No `cash_flow` case in the hook** — search returned 0 matches for `cash_flow` |

**Note:** A separate `CashFlowStatementReport.tsx` component was reportedly remediated (per supermemory context from 3 days ago), replacing mock data with live Supabase queries. However, `useEnhancedFinancialReports.ts` itself does not handle `cash_flow` — the cash flow report may be a separate component/hook path.

### 5.2 `Math.abs()` Usage (27 Occurrences Across 10 Files)

| File | Count | Key Lines |
|------|:---:|---------|
| `useGeneralLedger.ts` | 10 | :633, :636, :639, :642, :645, :701, :704, :707, :710, :713 |
| `useEnhancedFinancialReports.ts` | 5 | :460, :474, :527, :541, :555 |
| `useCreateCustomerWithAccount.ts` | 4 | — |
| `useFinance.ts` | 2 | — |
| Others | 6 | — |

**Impact:** `Math.abs()` treats credit balances (negative) as positive, inflating asset/revenue figures and masking abnormal balances.

### 5.3 `useReverseJournalEntry` (useGeneralLedger.ts:831)

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

**Problem:** The DB trigger (`20260627001000:175-188`) blocks updates to posted entries' fields. However, `status` is NOT in the list of blocked fields (the trigger blocks changes to `entry_number`, `entry_date`, `company_id`, `total_debit`, `total_credit`, `reference_type`, `reference_id` — not `status`). So the status update to `reversed` may succeed, but **no reversal entry is created**. The original entry's lines remain in the balances, and no offsetting entry exists.

### 5.4 `useExportLedgerData` (useGeneralLedger.ts:917)

```typescript
// Line 928-930:
// For now, return a success message
// In full implementation, would generate and download the file
return `Export request for ${format} format has been queued for processing.`
```

**Verified:** Export is a stub. Returns fake success message. No file generated.

### 5.5 `useFinancialIntegrityReport.ts`

**Verified:** Calls RPC `get_financial_integrity_report` (line 51). Checks:
- `completed_payments_without_journal`
- `unbalanced_journal_entries`
- `invoice_paid_amount_mismatches`
- `overpaid_invoices`

Does NOT check A=L+E (no assets/liabilities/equity fields in the report type, lines 11-23). Falls back to empty report if RPC doesn't exist (lines 56-67).

---

## 6. Payment Operations — Verified

### 6.1 `payments` Table Schema (types.ts:13327)

**VERIFIED columns:** account_id, agreement_number, allocation_status, amount, amount_paid, bank_account, bank_id, check_number, company_id, contract_id, cost_center_id, created_at, created_by, currency, customer_id, days_overdue, description_type, due_date, id, invoice_id, journal_entry_id (:13349), late_fee_*, linking_confidence, monthly_amount, notes, original_due_date, payment_completion_status, payment_date, payment_method, payment_month, payment_number, payment_status (:13366), payment_type, processing_notes, processing_status, reconciliation_status, reference_number, remaining_amount, transaction_type, updated_at, vendor_id

**MISSING columns (NOT in types.ts):**
- `approved_by` — ❌ NOT in Row type
- `approved_at` — ❌ NOT in Row type
- `cancelled_at` — ❌ NOT in Row type
- `cancelled_by` — ❌ NOT in Row type
- `posted_by` — ❌ NOT in Row type (but `usePaymentOperations.ts:1390` writes it)
- `posted_at` — ❌ NOT in Row type (but `usePaymentOperations.ts:1391` writes it)

### 6.2 Column Mismatch in usePaymentOperations.ts

| Line | Column Written | Exists in types.ts? |
|------|---------------|:---:|
| :772 | `approved_at` | ❌ NO |
| :773 | `approved_by` | ❌ NO |
| :1390 | `posted_by` | ❌ NO |
| :1391 | `posted_at` | ❌ NO |

**Note:** The code at line 941-942 explicitly acknowledges the missing cancel columns:
```typescript
// Update payment status. The payments table does not currently expose
// cancelled_at/cancelled_by columns, so keep the audit note in existing fields.
```

---

## 7. Controls & Compliance — Verified

### 7.1 Approval Workflows

**Verified:** `useApprovalWorkflows.ts` creates approval requests with steps. Each step has `approver_type` ('role', 'user', 'any_role') and `approver_value` (lines 268-272).

**❌ NOT VERIFIED:** No check that the current user matches the assigned approver before accepting/rejecting. The hook creates steps but there's no visible validation of `auth.uid() == step.approver_value` in the approval/rejection flow.

### 7.2 Audit Trail — Two Tables Confirmed

**Verified:** Two separate tables are used:
- `useAuditTrail.ts:86` — reads from `audit_logs` for display
- `useAuditTrail.ts:190` — writes to `audit_trail` for recording
- `useAuditLog.ts:54,92,170,228` — all operations on `audit_logs`

The hook at line 42 explicitly maps between the two formats: `"Map action names from audit_logs to audit_trail format"`.

### 7.3 Annual/Period Closing

**Annual close infrastructure:** Migration `20260627019000` creates the full infrastructure — tables, RLS, closing/opening journal entries, retained earnings account.

**A=L+E status:** **CANNOT BE CONFIRMED FROM CODE INSPECTION ALONE.** This requires either:
- A live database query (`SELECT get_financial_integrity_report(...)`)
- Reading the `annual_financial_close_runs` table for executed close runs
- Running a trial balance and verifying assets = liabilities + equity

v2 incorrectly stated this as a confirmed fact based on memory. This was a mistake — memory is not a substitute for verified data.

### 7.4 Period Lock Enforcement

**At DB level:** Migration `20260627001000:167` — `assert_financial_period_is_open()` is called within the JE INSERT/UPDATE trigger. This checks `accounting_periods` for locked periods.

**At hook level:** ❌ None of the 5 integration hooks check for locked periods before creating journal entries. The DB trigger will catch it, but the hook won't provide a user-friendly error.

---

## 8. Mock/Stale Data — Verified

### 8.1 Hardcoded Account IDs

**Verified:** `useConvertToLegalCase.ts` contains hardcoded account IDs with TODO comments:

| Line | Code |
|------|------|
| :296 | `account_id: '1203', // TODO: look up UUID from chart_of_accounts by account_code` |
| :304 | `account_id: '1200', // TODO: look up UUID from chart_of_accounts by account_code` |
| :337 | `account_id: '5401', // TODO: look up UUID from chart_of_accounts by account_code` |
| :345 | `account_id: '1204', // TODO: look up UUID from chart_of_accounts by account_code` |

**Risk:** These pass account_code values as `account_id` (UUID field). If the `chart_of_accounts` table uses UUID IDs, these string codes will fail to link or link to the wrong account.

### 8.2 Mock Data in Hooks

| Hook | Line | Finding |
|------|------|---------|
| `useCostCenterReports.ts` | :134 | `"// Monthly trends (mock data for now - would need more complex query)"` — mock trend data |
| `useFinancialSystemAnalysis.ts` | :124 | `"50 * 0.10) // AI score placeholder"` — AI score is a hardcoded calculation |
| `useFinancialSystemAnalysis.ts` | :164-227 | Score calculations are heuristic formulas, not from DB data |
| `useRecentReports.ts` | :3 | `"Currently returns mock implementation - will be enhanced later"` — mock/stub |

### 8.3 Export Function Stub

**Verified:** `useGeneralLedger.ts:928-930` — fake success, no file generated.

---

## 9. Currency Display — Verified (Corrected Count)

### 9.1 Actual Count

| Scope | File Count |
|-------|:---:|
| Total files matching `KWD\|د.ك` in `src/` | 82 |
| Excluding test files (`__tests__/`, `*.test.*`) | **74** |

### 9.2 Context: Multi-Currency System (Not Pure Error)

**Verified:** The system has a multi-currency architecture:
- `src/utils/currencyConfig.ts` defines configs for KWD, QAR, SAR, AED, OMR, etc. (lines 8-30)
- `src/hooks/useCompanyCurrency.ts` reads the company's currency from the DB, defaulting to QAR (line 42)

**The problem is NOT that KWD exists in the codebase** — it's that many components **hardcode KWD for display** instead of using `useCompanyCurrency()`:

**Example — `ARAgingReport.tsx`:**
- Line 157: `${summary?.total_ar_amount || 0).toFixed(3)} KWD` — hardcoded KWD
- Line 160: `'Amount (KWD)'` — hardcoded column header
- Line 293: `د.ك` — hardcoded Arabic symbol
- Line 571: `{amount.toFixed(3)} د.ك` — hardcoded Arabic symbol

**Should be:** Use `useCompanyCurrency()` to get the active currency and format accordingly.

### 9.3 Affected Financial Components (Non-Test, Non-Config)

**Hardcoded KWD display (should use dynamic currency):**
- `ARAgingReport.tsx` — 4 occurrences
- `PayablesReport.tsx` — multiple
- `ReceivablesReport.tsx` — multiple
- `AdvancedFinancialReports.tsx` — multiple
- `InvoiceForm.tsx`, `InvoiceCard.tsx`, `InvoiceEditDialog.tsx` — multiple
- `DepositForm.tsx`, `UnifiedPaymentForm.tsx` — multiple
- `JournalEntryForm.tsx` — multiple
- Various fleet/HR/contract components — 1-2 each

**Legitimate references (multi-currency config, not errors):**
- `currencyConfig.ts` — defines all currency configs
- `useCompanyCurrency.ts` — currency hook with all currencies in map
- `types/payment-enums.ts` — enum definition

---

## 10. Integration Map (Verified)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ SOURCE MODULES                                                           │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┤
│ Contracts    │ Vehicles     │ Maintenance  │ Violations   │ Payroll      │
│ (payments)   │ (installments│ (maintenance)│ (traffic_viol│ (payroll)    │
└──────┬───────┴──────┬──────┴──────┬──────┴──────┬───────┴──────┬───────┘
       │              │             │              │              │
       ▼              ▼             ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ INTEGRATION HOOKS — ALL BROKEN AT RUNTIME (if triggers active)            │
│                                                                           │
│ Pattern used (WRONG):                                                      │
│   1. INSERT journal_entries (status='posted')  ← header created OK         │
│   2. INSERT journal_entry_lines               ← FAILS (trigger blocks)     │
│   3. DELETE journal_entries (rollback)        ← FAILS (trigger blocks)    │
│   Result: orphaned posted header, no lines, silent failure                 │
│                                                                           │
│ Correct pattern (usePaymentOperations.ts):                                │
│   1. INSERT journal_entries (status='draft')   ← header created OK        │
│   2. INSERT journal_entry_lines               ← OK (parent is draft)     │
│   3. UPDATE journal_entries (status='posted')  ← OK (lines already in)    │
├────────────────────┬───────────────────┬────────────────┬────────────────┤
│ useRentalPayment   │ useVehicleInstall │ useMaintenance │ usePayroll     │
│ JournalIntegration │ mentJournal       │ JournalIntegr  │ JournalIntegr  │
│ ✅ totals passed   │ ❌ no totals      │ ❌ no totals   │ ❌ no totals   │
│ ✅ balance check   │ 🔴 wrong debit    │ ✅ correct     │ ⚠️ unbalanced  │
│ ❌ posted-first    │    account        │    entry logic │    if deduct>0│
│                    │ ❌ posted-first   │ ❌ posted-first│ ❌ posted-first│
├────────────────────┤    │              │                │                │
│ useTrafficViolation│    │              │                │                │
│ JournalIntegration │    │              │                │                │
│ ✅ correct entry   │    │              │                │                │
│ ❌ posted-first    │    │              │                │                │
│ ❌ no totals       │    │              │                │                │
└─────────┬──────────┴────┴──────────────┴────────────────┴────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ DATABASE LAYER (Hardened — Triggers Active)                               │
├──────────────────────────────────────────────────────────────────────────┤
│ Trigger: prevent_posted_journal_line_mutation                             │
│   BEFORE INSERT OR UPDATE OR DELETE ON journal_entry_lines               │
│   IF parent.status IN ('posted', 'reversed') → RAISE EXCEPTION            │
│   Bypass: financial_controls_bypass_enabled() (service role)             │
│                                                                           │
│ Trigger: prevent_posted_journal_entry_delete                              │
│   BEFORE DELETE ON journal_entries                                        │
│   IF status = 'posted' → RAISE EXCEPTION                                  │
│                                                                           │
│ Trigger: enforce_journal_entry_financial_controls                         │
│   BEFORE INSERT OR UPDATE ON journal_entries                              │
│   Checks: period open + ABS(total_debit - total_credit) <= 0.01          │
│   NOTE: If totals are NULL/0, 0-0=0 passes the check                      │
│                                                                           │
│ Trigger: enforce_journal_entry_financial_controls (UPDATE)                │
│   Blocks mutation of posted entries' fields (not status field)            │
│                                                                           │
│ RPC: ensure_payment_journal_entry — SECURITY DEFINER (can bypass)        │
│ RPC: restore_erroneously_cancelled_import_payments — atomic cancel       │
│ RPC: get_financial_integrity_report — health check                       │
│                                                                           │
│ Annual Close: annual_financial_close_runs + lines + retained earnings    │
│   (Infrastructure exists — execution status unknown without DB query)    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Risk Assessment

### 🔴 Critical (Must Fix Before Production)

| # | Risk | Evidence | Impact |
|---|------|----------|--------|
| 1 | **ALL 5 integration hooks create JE header as `posted` BEFORE inserting lines — line insert will fail due to `prevent_posted_journal_line_mutation` trigger** | Hooks: :199/:115/:66/:67/:126 (header `posted`); Trigger: `20260627011000:21-24` (blocks INSERT on posted parent) | All automated journal entries fail silently at runtime; orphaned posted headers with no lines |
| 2 | **Rollback deletion of posted headers also fails** — `prevent_posted_journal_entry_delete` trigger blocks it | Hooks: :226/:185/:138/:165/:248 (delete rollback); Trigger: `20260627001000:142-144` | Orphaned posted journal entries accumulate; cannot be cleaned up without bypass |
| 3 | **Vehicle installment debit account is revenue/expense, not payable** | `useVehicleInstallmentJournalIntegration.ts:78-79` | Accounting entries fundamentally wrong — assets and revenue misstated |
| 4 | **Payroll entries unbalanced when deductions > 0** (debit=gross, credit=net, no deduction offset line) | `usePayrollJournalIntegration.ts:52, 83-120` | Even if line insert succeeds (via bypass), entry is unbalanced |
| 5 | **`useReverseJournalEntry` only changes status, doesn't create reversal entry** | `useGeneralLedger.ts:837-847` | Original lines remain in balances; no offsetting entry; A=L+E corrupted |
| 6 | **Hardcoded account IDs in `useConvertToLegalCase.ts`** | Lines 296, 304, 337, 345 | Account codes passed as UUIDs — will link to wrong accounts or fail |
| 7 | **Export function is a fake stub** | `useGeneralLedger.ts:928-930` | Users see "success" but no file is generated |
| 8 | **`approved_by`/`approved_at`/`posted_by`/`posted_at` written to payments but columns don't exist in types** | `usePaymentOperations.ts:772-773, 1390-1391` vs `types.ts:13327` | Writes may silently fail |

### ⚠️ High (Should Fix in Next Sprint)

| # | Risk | Evidence | Impact |
|---|------|----------|--------|
| 9 | **`Math.abs()` in financial calculations** (27 occurrences in 10 files) | `useGeneralLedger.ts:633-645, 701-713`; `useEnhancedFinancialReports.ts:460, 474, 527, 541, 555` | Hides accounting signs; inflates totals; masks abnormal balances |
| 10 | **No `cash_flow` report type in `useEnhancedFinancialReports`** | Search returned 0 matches for `cash_flow` | Cash flow statement not supported in this hook (may exist as separate component) |
| 11 | **4 hooks use delete pattern instead of reversal** | All hooks use `.delete()` on posted entries | Will fail at runtime; need to switch to reversal entries |
| 12 | **Approval workflow doesn't verify current user is assigned approver** | `useApprovalWorkflows.ts` — no auth.uid() check in approve/reject | Any user can approve/reject |
| 13 | **Two separate audit tables** (`audit_logs` vs `audit_trail`) | `useAuditTrail.ts:86` reads `audit_logs`, `:190` writes `audit_trail` | Audit data fragmented |
| 14 | **74 non-test files reference KWD/د.ك instead of dynamic currency** | `grep -rl 'KWD\|د\.ك' src/` = 82 total, 74 non-test | Hardcoded KWD in financial reports instead of using `useCompanyCurrency()` |
| 15 | **No period lock check in integration hooks** | None of the 5 hooks check locked periods | DB trigger catches it, but no user-friendly error |
| 16 | **4 of 5 hooks don't pass `total_debit`/`total_credit`** — header balance check passes (0=0) but lines are still wrong | Verified across all hooks | DB balance check is ineffective when totals are omitted |

### 🟡 Medium (Backlog)

| # | Risk | Evidence | Impact |
|---|------|----------|--------|
| 17 | Mock data in `useCostCenterReports.ts:134` | Monthly trends are mock | Reports show fake trend data |
| 18 | AI score placeholder in `useFinancialSystemAnalysis.ts:124` | Hardcoded calculation | Analysis score is artificial |
| 19 | `useRecentReports.ts:3` — mock implementation | Stub return | Recent reports feature not functional |
| 20 | `useFinancialIntegrityReport.ts` doesn't check A=L+E | No assets/liabilities/equity fields (lines 11-23) | Missing integrity check |
| 21 | Integration hooks create entries as `posted` directly | All 5 hooks use `status: 'posted'` | No approval workflow for automated journal entries |

---

## 12. Recommendations (No Code Changes)

### 🔴 Critical Priority

1. **Fix the insert order in ALL 5 integration hooks** — change from `posted` → insert lines to: `draft` → insert lines → update to `posted`. Follow the pattern in `usePaymentOperations.ts:1343-1394`.
2. **Fix vehicle installment debit account** — change from revenue/expense to Accounts Payable (liability account). Entry should be: Debit: Vehicle Asset or Accounts Payable, Credit: Cash.
3. **Fix payroll deductions** — add a debit line for deductions (e.g., debit 2300 Taxes Payable) and a credit line so the entry balances. Or restructure: Debit: gross expense, Credit: net cash + deductions payable.
4. **Implement proper reversal entry creation** in `useReverseJournalEntry` — create a new entry with reversed debit/credit, not just a status update.
5. **Replace hardcoded account IDs** in `useConvertToLegalCase.ts` with dynamic lookup from `chart_of_accounts`.
6. **Implement actual export** in `useExportLedgerData` or remove the fake success message.
7. **Add `approved_by`/`approved_at`/`posted_by`/`posted_at` columns to `payments` table** or remove the writes from `usePaymentOperations.ts`.

### ⚠️ High Priority

8. **Remove `Math.abs()` from all financial calculations** — use signed balances with proper account-type logic.
9. **Verify cash flow report path** — check if `CashFlowStatementReport.tsx` handles it separately or if `useEnhancedFinancialReports` needs a `cash_flow` case.
10. **Switch all hooks from delete pattern to reversal entry pattern**.
11. **Add approver verification** in the approval accept/reject flow.
12. **Consolidate audit tables** to a single table.
13. **Replace hardcoded KWD in 74 files** with `useCompanyCurrency()` dynamic currency.
14. **Add period lock checks in integration hooks** before creating journal entries.
15. **Pass `total_debit`/`total_credit` in all hooks** — even though the balance check has a 0=0 loophole, passing correct totals is good practice.

### 🟡 Medium Priority

16. Replace mock data in `useCostCenterReports` and `useFinancialSystemAnalysis` with real DB queries.
17. Implement `useRecentReports` with actual report history.
18. Add A=L+E check to `useFinancialIntegrityReport`.
19. Consider creating automated journal entries as `draft` first, requiring approval before posting.
20. **Verify A=L+E balance with a live database query** — cannot confirm from code inspection alone.

---

## 13. Honest Assessment

### What v2 Got Wrong

| # | v2 Claim | Why It Was Wrong |
|---|---------|-----------------|
| 1 | "hooks may fail due to missing total_debit/total_credit" | **Incomplete** — the real failure is the posted-line mutation trigger, not the balance check. The balance check has a 0=0 loophole. |
| 2 | "payroll credits Cash AND Salaries Payable = 2 × netSalary" | **Exaggerated** — the hook uses if/else, choosing ONE credit line. The actual issue is debit=gross vs credit=net (deductions unbalanced). |
| 3 | "DB trigger will reject entries without total_debit/total_credit" | **Imprecise** — the trigger defaults nulls to 0, and 0=0 passes. The lines fail due to a different trigger. |
| 4 | "A=L+E balance was resolved" | **Unverified** — stated as fact based on memory, not a live DB read. Cannot confirm from code alone. |
| 5 | "50 files contain KWD/د.ك" | **Undercounted** — actual count is 74 non-test files. Some are legitimate multi-currency config. |

### What v3 Does Differently

1. **Identified the posted-line mutation trigger as THE primary failure mechanism** — this changes the assessment from "some hooks may fail" to "ALL 5 hooks will fail if triggers are active"
2. **Corrected the payroll analysis** — it's a conditional credit (if/else), not a double credit. The real issue is the deductions gap.
3. **Corrected the balance check analysis** — 0=0 passes; the check is ineffective when totals are omitted
4. **Downgraded A=L+E claim from "confirmed" to "cannot verify from code alone"**
5. **Corrected file count from 50 to 74 non-test files** with context about multi-currency architecture
6. **Identified `usePaymentOperations.ts` as the correct reference pattern** (draft → lines → post)

### Remaining Uncertainty

- **Whether migrations are applied to production Supabase** — can only verify via DB connection
- **Whether `financial_controls_bypass_enabled()` is active** — if service role is used, all triggers are bypassed and hooks work (but controls are ineffective)
- **Whether the hooks fail silently or produce visible errors** — requires browser testing
- **A=L+E balance** — requires live DB query or integrity report execution
- **Cash flow report** — may exist as a separate component path (`CashFlowStatementReport.tsx`)

---

*End of v3 audit report. Every finding verified with file:line reference.*