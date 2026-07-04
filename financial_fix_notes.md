# Notes: Financial Integrity Fixes

## 2026-07-02 Diagnostics

Report files:
- `reports/finance-integrity-diagnostics-24bc0b21-4e2d-4413-9842-31719a3669f4-2026-07-02T08-05-43-076Z.json`
- `reports/finance-integrity-diagnostics-24bc0b21-4e2d-4413-9842-31719a3669f4-2026-07-02T08-05-43-076Z.md`

Confirmed:
- Journal entries: 9477.
- Journal entry lines: 18962.
- Header-unbalanced journal entries: 0.
- Line-unbalanced journal entries: 0.
- Journal entries without lines: 0.
- Active invoices needing journal creation: 0.
- Active invoices needing relink only: 0.
- Completed receipt payments needing journal creation: 1.
- Completed receipt payments needing relink only: 43.
- Exact duplicate payment groups: 0.

Account candidates used for repair:
- Cash/bank: account code `11151`.
- Receivables: account code `11211`.
- Revenue: account code `4101`.

Conclusion:
- The earlier count of 2319 invoices without direct `journal_entry_id` was misleading because active invoices have reference journal entries or are not in the active repair set.
- Payment repair should focus on relinking existing reference journals and creating one missing receipt journal.

## 2026-07-02 Execution Result

Applied database migrations:
- `supabase/migrations/20260702000001_payment_journal_integrity_rpc.sql`
- `supabase/migrations/20260702000002_fix_payment_journal_repair_batch.sql`
- `supabase/migrations/20260702000003_fix_payment_journal_repair_service_role_auth.sql`

Application hardening:
- `src/hooks/business/usePaymentOperations.ts` now ensures a completed payment has a journal entry before returning success.
- Existing duplicate/idempotent payment returns also call the same journal assurance path, so imported Excel rows that already exist are not silently returned without accounting linkage.

Data repair performed:
- Created 1 missing payment journal entry.
- Relinked 43 completed receipt payments to their existing payment journal entries.

Final verification report:
- `reports/finance-integrity-diagnostics-24bc0b21-4e2d-4413-9842-31719a3669f4-2026-07-02T08-31-18-668Z.json`
- `reports/finance-integrity-diagnostics-24bc0b21-4e2d-4413-9842-31719a3669f4-2026-07-02T08-31-18-668Z.md`

Final counts:
- Active invoices needing journal creation: 0.
- Active invoices needing relink only: 0.
- Completed receipt payments needing journal creation: 0.
- Completed receipt payments needing relink only: 0.
- Unbalanced journal entries: 0.
- Journal entries without lines: 0.
- Exact duplicate payment groups: 0.
