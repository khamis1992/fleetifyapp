# Billing period evidence sources — 2026-09-04

Correction from subsequent live-source inspection: the production rental core
writes `invoice_type='service'`. The initial non-rental-service assumption below
was incorrect and is superseded by
[the rental classification audit](2026-09-04-rental-invoice-classification-audit.md).
Current preflight verifies matching schedule links for service invoices and flags
unclassified ones; it no longer silently excludes all service invoices.

Scope: local correction of the shared contract-period preflight, not changes to
contract terms, schedules, invoices, or the production database. The complete
contract-details audit remains open.

## Evidence and chosen behavior

`ContractDetailsPageRedesigned` passes complete invoices and schedules into
`analyzeContractBillingPeriod`. The financial snapshot and diagnosis in
`contract-details-v3/tokens.ts` use the same utility. It previously chose
`due_date || invoice_month || invoice_date` for both entity types. This could
incorrectly include or exclude start-month rent. Traffic/service invoices could
also expand the rental window. Undated schedules could appear valid through an
invoice-date fallback, and an unknown rental invoice month was silently ignored.

The chosen design keeps sources distinct:

- Invoice service period: `invoice_month`, falling back to `invoice_date` only
  when the former is absent. An invalid explicit month requires reconciliation;
  a deadline cannot repair it. Calendar validation rejects impossible days.
- Schedule period: `due_date` only. Invoice metadata is not schedule evidence.
- Known non-rental charges (`penalty_id`, `TV-` references, `service` type) never
  establish a rental start month. This follows existing application markers;
  it is not a claim that every possible invoice type has been classified.
- Invalid active rental invoice dates block preflight, including when an
  otherwise valid schedule exists. Inactive invoices remain excluded.

Alternatives rejected: merely changing warning text would preserve incorrect
month counts; copying an invoice deadline into its service period or adjusting
contract dates would change accounting evidence without authority.

## Verification

- Ten new behavioral regression cases failed against the old implementation;
  the ten existing calculation tests passed. All ten regressions pass after the
  correction. Five additional boundary cases cover inactive/non-rental records,
  valid schedules with invalid invoice evidence, and conflicting date fields.
- Initial related run: 57 passing tests across calculations, real mounted
  details (mock data sources), financial summary, schedule reads, and renewals.
- App and node TypeScript checks passed after the implementation.
- Full Vitest run: 2,215 passed, one failed across 282 files (130.32 seconds).
  The failure was a stale source-string assertion in
  `preventPartialPaymentInvoiceSplitting.test.ts` requiring a local waiver flag
  that the existing payment dialog deliberately no longer uses. Reviewed the
  actual persisted-only implementation and existing mounted late-response and
  invoice-switch tests before updating that assertion; production behavior was
  not changed to satisfy the old test. Focused rerun of the source guard, actual
  mocked payment dialog, calculations and financial snapshot: all 81 tests pass.
  The entire suite was not rerun after this test-only adjustment. The full suite
  emits existing mock API errors (e.g. missing `abortSignal`) even in passing
  tests, so pass counts are not proof that those mock paths are healthy.
- Targeted ESLint and diff whitespace checks passed. No production build,
  browser check of the running app, SQL execution or deployment in this turn.

These tests do not invoke production mutations or prove live deployment.
The earlier read-only confirmation of LTO2024276 still shows start 2024-08-15,
end 2027-08-15, and pending installment 37 for 1,500 QAR on 2027-09-01. This patch
does not resolve that persisted contradiction.

## Remaining work

Verify all invoice-type semantics and validation parity with the actual database
billing command; complete full-schema/concurrency and browser verification;
reconcile signed terms before correcting customer data. Financial refresh,
payment reversal/fees, document identity, vehicle and legal workflow audit and
pending deployment gates remain open. No release-readiness claim is made here.

Concrete next defect found during review: pending migration
`20260903161841_support_authoritative_partial_contract_schedules.sql` groups all
active invoices by service month when detecting duplicates (around line 342),
and compares all active invoice amounts to schedules (around line 370), without
excluding traffic/service charges. A rent invoice plus a traffic invoice in one
month can therefore block this command despite not being duplicate rent. Audit
all its invoice lookups consistently and reproduce using actual SQL before
repairing/deploying; changing only the UI would not resolve this server issue.
