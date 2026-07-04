# Plan: Perform a comprehensive VERIFIED audit of the financial system in the Fleetify ERP project at C:\Users\khamis\Documents\fleetifyapp. This is a READ-ONLY audit — NO code changes. Every claim must be verified against the actual current code.

## Context from user feedback (these are KNOWN corrections to a previous flawed report)
The previous report had these errors that MUST be corrected:
1. It said `deposits` table doesn't exist — but the system uses `customer_deposits` table (see useDeposits.ts:48, present in types.ts). VERIFY this.
2. It said `payroll` table doesn't have `journal_entry_id` — but this field EXISTS at types.ts:13712. VERIFY this.
3. It said RPCs like `ensure_payment_journal_entry` and `cancel_payment_with_reversal` "may not be published" — but recent migrations create them: `20260702000001_payment_journal_integrity_rpc.sql` and `20260702153000_restore_cancelled_import_payments_and_atomic_cancel.sql`. VERIFY these migrations exist and what they do.
4. It said direct deletion affects posted journal entries — but migration `20260627001000_financial_controls_layer.sql` adds a control layer preventing deletion of `posted` journal_entries. VERIFY this. The accurate statement is: some hooks STILL ATTEMPT deletion, but they will FAIL at runtime due to the control layer.

## What to audit (READ-ONLY, no code changes)

### Phase 1: Database Schema & Types Verification
- Read `src/integrations/supabase/types.ts` and extract ALL financial tables and their actual columns
- Cross-reference: payments (does it have approved_by/approved_at/cancelled_at/cancelled_by?), payroll (does it have journal_entry_id?), customer_deposits (exists?), journal_entries, journal_entry_lines, chart_of_accounts, invoices, banks, bank_transactions, etc.
- Read ALL migration files in `supabase/migrations/` that relate to financial system — especially:
  - `20260627001000_financial_controls_layer.sql`
  - `20260702000001_payment_journal_integrity_rpc.sql`
  - `20260702153000_restore_cancelled_import_payments_and_atomic_cancel.sql`
  - Any others with "financial", "journal", "payment", "rpc", "control" in the name
- Document what each migration actually does (triggers, RPCs, constraints)

### Phase 2: Integration Hooks Deep Dive
- Read EVERY file matching `*JournalIntegration*` in src/hooks/:
  - useRentalPaymentJournalIntegration.ts
  - useTrafficViolationJournalIntegration.ts
  - useMaintenanceJournalIntegration.ts
  - useVehicleInstallmentJournalIntegration.ts
  - usePayrollJournalIntegration.ts
- For EACH hook, document:
  - Does it create journal entries as `posted` directly or `draft`?
  - Does it pass `total_debit` and `total_credit`?
  - Does it attempt to DELETE entries on reversal (vs creating a reversal entry)?
  - Does it have a reverse-link field (maintenance_id, violation_id, etc.) in journal_entries?
  - Does it check for locked accounting periods?
  - What is the actual accounting entry (debit account, credit account)?
  - For vehicle installments specifically: is the debit account a revenue/expense account instead of a payable? VERIFY the actual account codes used.

### Phase 3: Financial Reports Verification
- Read `useEnhancedFinancialReports.ts` — does it support `cash_flow` report type? What does it return for cash flow?
- Read `useFinancialIntegrityReport.ts` — what does it actually check? Does it verify A=L+E?
- Check for `Math.abs()` usage in financial calculations — WHERE exactly is it used and what does it hide?
- Read the trial balance RPC — is it a DB function or hook calculation?

### Phase 4: Payment Operations
- Read `usePaymentOperations.ts` — what columns does it try to write to `payments`? Do those columns exist in types.ts?
- Check `prevent_overpayment_trigger` — does it exist in a migration? What does it do?
- How many unlinked payments exist? (check if there's a query for this)

### Phase 5: Controls & Compliance
- Read approval workflow hooks — do they verify the current user is the assigned approver?
- Read audit trail hooks — are there really two different tables (`audit_logs` vs `audit_trail`)?
- Read the monthly closing logic — does it create a closing entry?
- Check bank reconciliation — does it verify matched amounts?

### Phase 6: Mock/Stale Data Detection
- Search for hardcoded account IDs (like '1203', '1200', '5401') in hooks
- Search for mock data in financial hooks (useCostCenterReports, useFinancialSystemAnalysis, useEnhancedAccountSuggestions, useRecentReports)
- Check if export functions actually export or just return fake success

### Phase 7: Currency Display
- Search for KWD/د.ك in financial components — should be QAR/ر.ق

## Deliverable
Write a comprehensive audit report to `C:\Users\khamis\Documents\fleetifyapp\docs\financial-system-audit-verified.md` in English with:
1. Executive summary
2. Verified findings (each tagged VERIFIED with file:line reference)
3. Corrections to previous report (explicitly listing what was wrong before)
4. Integration map (each module → financial tables, with verified field mappings)
5. Risk assessment (Critical/High/Medium with evidence)
6. Recommendations (no code changes, just recommendations)
7. Appendix: all financial tables with actual columns from types.ts

EVERY finding must have a file:line reference proving it was checked against current code. No unverified claims.

## Reasoning
The audit has 6 independent investigation areas (schema/types, migrations, integration hooks, financial reports, payment operations/controls, mock/currency detection) that can all run in parallel since they read different files. The final report compilation depends on all 6. I've grouped the 6 investigations in parallel_group 0 and the report writer in parallel_group 1.

## Risk Level
low

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: hooks-audit, migrations-audit, mock-currency-audit, payments-controls-audit, reports-audit, schema-types-audit
- Acceptance criteria:
  - For each of the 5 hooks: documented JE creation status (posted/draft), total_debit/credit handling, reversal method (delete vs reversal entry), reverse-link field usage, locked period check, actual debit/credit account codes with file:line references. Vehicle installment account code issue explicitly verified.
  - Every financial migration file found, read, and documented with: filename, what it creates (triggers/RPCs/constraints), and exact line references. Explicit verification that the 3 named migrations exist and what they do. prevent_overpayment_trigger existence confirmed or denied with evidence.
  - All hardcoded account IDs listed with file:line. Mock data in each named hook confirmed/denied with evidence. Export function real vs fake behavior documented. Every KWD/د.ك occurrence found with file:line. All findings tagged VERIFIED.
  - Payment operations column mapping verified against types.ts. Approval workflow approver verification confirmed/denied. audit_logs vs audit_trail table existence verified. Monthly closing entry creation confirmed. Bank reconciliation amount verification confirmed. All with file:line references.
  - Cash flow support confirmed/denied with line ref. Integrity report checks documented with line refs. Every Math.abs() usage in financial files listed with file:line and what it potentially hides. Trial balance implementation source identified (RPC vs hook) with evidence.
  - Complete list of all financial tables with every column name and its types.ts line number. Explicit VERIFIED tags on: customer_deposits existence, payroll.journal_entry_id, payments approval/cancellation columns, journal_entries reverse-link fields.

### Parallel group 2
- Subtasks: write-audit-report
- Acceptance criteria:
  - Report file exists at docs/financial-system-audit-verified.md with all 7 sections. Every finding has a VERIFIED tag and file:line reference. The 4 known corrections are explicitly addressed. Integration map covers all 5 hooks. Risk assessment has evidence-based ratings. Appendix lists all financial tables with columns.

## DAG
- `hooks-audit` group=0 deps=none: Read EVERY file matching *JournalIntegration* in src/hooks/. For EACH hook (useRentalPaymentJournalIntegration, useTrafficViolationJournalIntegration, useMaintenanceJournalIntegration, useVehicleInstallmentJournalIntegration, usePayrollJournalIntegration), document with file:line references: (1) Does it create JEs as 'posted' directly or 'draft'? (2) Does it pass total_debit and total_credit? (3) Does it attempt DELETE on reversal vs creating a reversal entry? (4) Does it use a reverse-link field on journal_entries? (5) Does it check for locked accounting periods? (6) What are the actual debit/credit accounts used? (7) For vehicle installments specifically: is the debit account a revenue/expense account instead of a payable? Verify the actual account codes.
- `migrations-audit` group=0 deps=none: Read ALL migration files in supabase/migrations/ related to the financial system. Specifically find and analyze: 20260627001000_financial_controls_layer.sql (does it prevent deletion of posted journal_entries? what triggers/constraints does it add?), 20260702000001_payment_journal_integrity_rpc.sql (does it create ensure_payment_journal_entry RPC?), 20260702153000_restore_cancelled_import_payments_and_atomic_cancel.sql (does it create cancel_payment_with_reversal RPC?). Also search for any other migrations with 'financial', 'journal', 'payment', 'rpc', 'control', 'trigger', 'prevent_overpayment' in filename or content. Document what each migration actually creates (triggers, RPCs, constraints, policies).
- `mock-currency-audit` group=0 deps=none: Search for hardcoded account IDs (like '1203', '1200', '5401') in all hooks and components. Search for mock/fake data in financial hooks: useCostCenterReports, useFinancialSystemAnalysis, useEnhancedAccountSuggestions, useRecentReports — do they return real data or hardcoded mock arrays? Check if export functions actually export or just return fake success. Search for KWD/د.ك in financial components — should be QAR/ر.ق. All with file:line references.
- `payments-controls-audit` group=0 deps=none: Read usePaymentOperations.ts — document every column it writes to the payments table and cross-reference against types.ts (do those columns exist?). Read approval workflow hooks — do they verify the current user is the assigned approver? Read audit trail hooks — are there two different tables (audit_logs vs audit_trail)? Read monthly closing logic — does it create a closing entry? Check bank reconciliation — does it verify matched amounts? All with file:line references.
- `reports-audit` group=0 deps=none: Read useEnhancedFinancialReports.ts — verify if it supports cash_flow report type and what it returns. Read useFinancialIntegrityReport.ts — document what it actually checks, does it verify A=L+E? Search for Math.abs() usage in financial calculation files and document exactly where and what it hides. Find the trial balance implementation — is it a DB RPC function or a hook-side calculation? Document with file:line references.
- `schema-types-audit` group=0 deps=none: Read src/integrations/supabase/types.ts and extract ALL financial tables with their actual columns. Specifically verify: payments table has approved_by/approved_at/cancelled_at/cancelled_by columns; payroll table has journal_entry_id field (around line 13712); customer_deposits table exists; journal_entries, journal_entry_lines, chart_of_accounts, invoices, banks, bank_transactions tables and all their columns. Document exact line numbers for each verified field. Also check for reverse-link fields (maintenance_id, violation_id, etc.) on journal_entries.
- `write-audit-report` group=1 deps=schema-types-audit, migrations-audit, hooks-audit, reports-audit, payments-controls-audit, mock-currency-audit: Compile all findings from the 6 audit subtasks into a comprehensive audit report at docs/financial-system-audit-verified.md. Structure: (1) Executive summary, (2) Verified findings each tagged VERIFIED with file:line reference, (3) Corrections to previous report explicitly listing the 4 known errors and their corrections, (4) Integration map (each module → financial tables with verified field mappings), (5) Risk assessment (Critical/High/Medium with evidence), (6) Recommendations (no code changes), (7) Appendix: all financial tables with actual columns from types.ts. EVERY finding must have a file:line reference. No unverified claims.
