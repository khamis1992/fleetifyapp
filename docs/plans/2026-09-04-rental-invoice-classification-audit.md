# Rental invoice classification and billing command — 2026-09-04

Status: local candidate only, **not release-ready**. Full contract-details goal
remains active. No production DDL/DML, billing run, notifications or deployment.

## Evidence that corrected the earlier design

A read-only production `pg_get_functiondef` of
`system_generate_invoice_for_contract_month_core(uuid,date)` has MD5
`d7972cf4eac7f73a3e1e3d33efb0a2f0`. It **creates rental invoices with type
`service`**, creates rental invoice items and links the invoice to its schedule.
The definition is retained in the database test fixtures, not inferred from a
label. `generate_contract_billing_graph_v2` is still absent from production.

The preceding billing-period design incorrectly called all service invoices
non-rental. That assumption is superseded: traffic charges use `penalty_id` or
a normalized `TV-` reference; `service` alone is ambiguous. Frontend preflight
now preserves service rental evidence when invoice ID, amount and service month
match a linked active schedule; otherwise it explicitly requests reconciliation
instead of dropping it or inventing a rental period. This link is structural
evidence, not proof of the original signed agreement.

## Defects reproduced and repairs

Actual pending v2 SQL plus the captured production core produced **7 failing /
6 passing** cases after correcting a fixture-only missing schema qualifier:

- Rent and traffic in one month were wrongly treated as duplicate rent.
- A traffic invoice with the same amount as the installment was reused as rent.
- A different customer's invoice could be accepted for its amount.
- Unlinked service invoices and null service months were silently accepted.

The pending v2 now filters explicit traffic charges consistently across all
invoice searches, checks customer/month, reconciles ambiguous service invoices,
and validates the actual helper-returned invoice's company, contract, customer,
period, lifecycle and amount before linking it. The new-schedule path uses the
same validation rather than returning through the separate legacy invoice
generator. Recursion is bounded by checking persisted active schedules before
reentry; failures roll back the newly generated schedules as well as invoices.

Migration `20260904003755` patches only the existing core's month-existence guard
to exclude traffic. It leaves invoice type and function ACL/security mode
unchanged. Forward and rollback refuse an unreviewed definition; replay is a
no-op. Rollback restores the exact captured core, including its old limitation.
It does not reverse invoices created after deployment. The unpublished v2's
existing rollback still drops that new command.

## Verification and limits

- **22 SQL tests pass** using PGlite with actual v2 and captured core SQL.
  One is a characterization of a remaining real-index failure, not a successful
  business workflow. The fixture implements real invoice/item/schedule writes;
  journal verification, authorization helpers and schedule generator responses
  are explicit doubles. Therefore this is not full accounting or RLS proof.
- Covers duplicate rent, equal-amount traffic, service rental replay, company
  isolation, wrong customer, missing month, unknown service, closed-period
  rejection, atomic rollback, helper identity, newly generated schedules, false
  generator acknowledgement, migration round-trip/drift refusal, and anonymous
  execute privilege. Multisession races and actual journal triggers are untested.
- **120 Vitest tests pass** across 8 related suites, including mounted details
  with mocked reads. App/node TypeScript checks and targeted ESLint pass.
- Real production invoice-number uniqueness and penalty uniqueness are installed
  in the fixture. Two cases also install the actual rental-month unique index.
- Supabase function documentation was checked for empty search paths and explicit
  execute grants: https://supabase.com/docs/guides/database/functions . The
  changelog markdown fetch failed due unsupported content type; no changelog
  assurance is claimed. No build/preview/live-browser verification this turn.

## Concrete remaining release gates / next work

1. The real `idx_invoices_unique_contract_month` excludes `penalty_id` invoices,
   **not TV-only invoices without that link**. With that index installed,
   generating rent alongside a TV-only orphan still raises a uniqueness error;
   the new characterization proves all invoice/item/schedule writes roll back.
   Do not claim the prefix-only workflow fixed in production. A local guarded
   index-alignment candidate now passes the actual-core workflow and preserves
   rent uniqueness; see `2026-09-04-rental-month-index-alignment-design.md`.
   Full-schema multi-session concurrency and rollout verification remain open.
2. Monthly reader classification is now corrected locally: service-typed rent
   is recognized through a unique active installment link with matching month
   and amount. Ambiguous service invoices remain review evidence. An integration
   test now runs the captured core, pending v2, and real reader through partial
   payment and cancellation with the observed rental-month index installed.
   See the continuation in `2026-09-04-canonical-rental-month-summary-design.md`.
   This is not deployed; audit other readers/classifiers for the same assumption
   before enabling the reader or retiring receipt synchronization.
3. Full schema, finance authorization, journal/fee/receipt triggers, prepaid
   due-date trigger, concurrent billing/cancellation and rollback verification
   remain required before any release. This core patch is not a replacement for
   those checks, nor does it settle the separate LTO2024276 schedule conflict.
4. Unlinked generic service invoices require provenance, not automatic deletion
   or mutation. All broader contract, documents, vehicle and legal audit gates
   remain open.
