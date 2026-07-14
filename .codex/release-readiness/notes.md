# Release Readiness Notes

## Verified So Far
- The configured root `npm run type-check` exits successfully but is not a valid gate because the root TypeScript project has no files or references. A real `tsc -p tsconfig.app.json --noEmit` currently stops on the pre-existing syntax error at `src/__tests__/unit/PaymentService.test.ts:416`.
- Focused ESLint passed for the new dashboard, hook, and tasks page.
- `npm run build:ci` passed; existing bundle-size and mixed-import warnings remain.
- The authenticated system-agent dashboard loads after a full refresh on desktop and mobile without console errors.
- The dashboard endpoint rejects unauthenticated requests with HTTP 401.

## Current System-Agent Evidence
- 3,258 applied repair records exist for the active company.
- The latest full audit scanned 17,815 records across 7 of 7 domains.
- 3,632 findings remain in review status and are not proof of launch readiness.
- The latest full run reported zero execution failures and zero automatically pending repairs.

## Open Risks
- The meaning and launch impact of the 3,632 review-only findings must be assessed.
- Full test/lint/E2E baselines have not yet been captured in this readiness pass.
- Financial report agreement and end-to-end posting flows are not yet proven.
- UI token/card consistency has not yet been measured across the full application.
- Database migration/RLS drift between local references and production is not yet proven absent.

## Baseline Results - 2026-07-12
- Full ESLint: 0 errors, 5,053 warnings; gate fails because `--max-warnings 0` is configured.
- Full Vitest: 21 files passed, 56 failed; 386 tests passed, 130 failed; 5 unhandled errors.
- Focused finance tests: 14 files and 72 tests passed.
- Finance permission coverage: 12 critical actions, 6 field guards, 7 separation-of-duty rules, and 61 enforcement files passed.
- Live financial integrity: 2 of 4 companies unhealthy.
- Al-Araf live blockers: 141 overpaid invoices and 7 cancelled payments with accounting entries but no reversal.
- Secondary-company blocker: 2 generated invoices record paid amounts without direct completed-payment links.
- Operational warnings: 63 bank-like payments and 1 completed bank transaction remain unreconciled.
- Posted journals are balanced and completed payments all have journal entries.

## High-Risk Code Finding
- Historical migrations defined `link_payment_journal_entry_bypass`, which disabled all user triggers on `payments`. The current production API no longer exposes that function, and the pending hardening migration drops it defensively if it still exists internally.
- Production does not expose `payment_allocations`, while generated TypeScript/database references claim it exists and historical migrations define incompatible table shapes. Payment-allocation architecture is therefore not currently trustworthy.

## Financial Root Cause - 2026-07-12
- All 141 overpaid invoices are tied to imported `PBCFULL-*` receipts; no non-PBC completed receipt currently overpays an invoice.
- A legacy repair script linked imported receipts to the first invoice in a contract, producing 450 cross-month links among 697 imported receipts.
- A read-only FIFO plan allocates QAR 639,061 and leaves QAR 389,490 as unapplied customer credit; 240 receipts require split allocations, so a single `payments.invoice_id` cannot represent the real ledger.
- The 7 cancelled receipts were cancelled by the contract auto-fix path even though they are real receipts with posted journals. Their correct repair is restoration/reassignment, not cash reversal.
- `ContractHealthAnalysis` and `PaymentStateMachine` have been changed locally so completed receipts are no longer cancelled by direct status updates and completed cancellations use the atomic accounting RPC.

## Payment Hardening Package
- `20260712050000_harden_payment_repair_paths.sql` parsed successfully at the migration level and for all seven PL/pgSQL functions.
- The migration removes trigger-bypass paths, enforces company/customer/contract/invoice consistency, blocks overpayment and closed-period posting, persists journal links, posts unapplied receipts to customer advances, and makes cancellation/reversal atomic and idempotent.
- Production OpenAPI was checked against every referenced table and column; notably, production has no `payment_allocations` table and no cancellation audit columns on `payments`.
- The isolated deployment package is byte-for-byte identical to the reviewed migration.
- Supabase history contains 14 legacy non-standard versions. A reversible test cycle temporarily hid them, dry-ran the package, restored all 14, and removed all temporary placeholders.
- The dry run proved that `20260712050000_harden_payment_repair_paths.sql` is the only migration that would be applied.

## Applied Financial Repairs - 2026-07-12
- `20260712050000_harden_payment_repair_paths.sql` was deployed with Supabase CLI 2.109.1 after the older 2.67.2 CLI failed safely inside the migration transaction. All 14 legacy migration-history versions were restored and the new migration is recorded remotely.
- Anonymous-role probes for payment creation, cancellation, journal reversal, journal assurance, overpayment repair, and historical restoration all return HTTP 401 / PostgreSQL `42501`.
- `20260712050500_harden_payment_posting_mappings.sql` repaired exactly five mappings and captured their previous values. All 13 configured BANK/CASH/RECEIVABLES/CUSTOMER_ADVANCES mappings now point to active level-3-or-deeper posting accounts with the correct debit/credit category.
- `20260712051000_restore_contract_health_cancelled_receipts.sql` restored all seven genuine receipts, preserved all original posted journals, reconciled six invoices exactly, and reclassified QAR 168 of unapplied cash from receivables to customer advances with a balanced posted journal.
- The cancelled-payment audit now reports zero cancelled payments with a posted journal missing a reversal; the prior blocker amount fell from QAR 9,000 to QAR 0.
- `20260712051500_remove_stale_payment_journal_trigger.sql` removed exactly one undocumented trigger: `trigger_payment_changes` -> `handle_payment_changes`. Its complete definition is retained in `database_trigger_cleanup_log` for rollback.
- `ensure_payment_journal_entry` returned `already_linked` and the original journal id for a restored receipt, proving the canonical path is idempotent.
- Reusable verification: `.codex/release-readiness/verify-restored-receipts.cjs` passes with 7 payments, 6 invoices, 7 snapshots, and one balanced QAR 168 reclassification.

## Production Database Footprint
- `system_logs` is approximately 1.64 GB with about 991,525 rows; retention and indexing need launch review.
- `contract_operations_log` is approximately 407 MB with about 169,861 rows.
- `system_agent_findings` is approximately 43 MB with about 51,301 rows.
- `profiles` and `user_roles` show tens of millions of sequential scans, indicating a material database-performance risk.
- Production exposes `payment_allocation_rules` but not `payment_allocations`, confirming schema/reference drift.
