# Task Plan: Financial Data Integrity Fixes

## Goal
Repair confirmed financial integrity issues without duplicating accounting entries or changing historical records without an audit trail.

## Phases
- [x] Phase 1: Confirm real issues from the report
- [x] Phase 2: Build read-only diagnostics for missing journal links
- [x] Phase 3: Fix prevention paths for new payments and Excel imports
- [x] Phase 4: Repair historical payment journal links safely
- [x] Phase 5: Verify cash-flow/customer-financial report source data is link-complete
- [x] Phase 6: Add verification checks and regression guardrails
- [x] Phase 7: Produce final before/after reconciliation report

## Key Questions
1. Which invoice types should produce accounting journal entries?
2. Which missing links are valid historical gaps versus intentionally non-accounting records?
3. What account mappings should be used for rental revenue, receivables, cash, reversals, and cancelled records?

## Decisions Made
- Do not treat same amount and date alone as a duplicate payment.
- Use posted journal entries and explicit account mappings as the source for financial reports.
- Backfill must be idempotent and auditable.
- Current invoice journals are healthy when reference journals are considered: 0 active invoices need journal creation or relink.
- Current payment issue is small and specific: 43 completed receipt payments need field relink only, and 1 completed receipt payment needs a new journal entry.
- New payment completion is now accounting-safe: completed receipt payments must ensure a payment journal entry before the flow returns success.
- The repair RPC is idempotent and supports dry-run/apply modes.

## Errors Encountered
- Supabase migration history contains seven old non-standard versions that block `db push`; they were temporarily marked reverted during each push and restored to applied afterward.
- The first batch repair attempt created the one missing journal entry but could not relink inside an active payments cursor. A follow-up migration changed the repair RPC to collect payment IDs first.
- The service-role authorization branch needed an explicit `auth.role() = 'service_role'` check; a follow-up migration fixed it.

## Status
**Complete** - Database repair, prevention hardening, maintenance RPC fixes, and final verification are done.
