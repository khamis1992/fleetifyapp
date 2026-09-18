# Canonical rental arrears source — implemented locally, consumer switch pending

The preceding goal turn fixed and tested the rental/TV unique-index alignment
candidate. This turn fills the previously CLI-created empty arrears migration
with a working read-only source. It does not pretend the old receipt-count hook
has been removed: the consumer switch below remains necessary before release.

## Evidence and design

Current `useLatePaymentCustomers` still calculates elapsed 30-day blocks minus
receipt row count, ignores computed payment sums and reads active contracts only.
Two partial receipts can therefore remove two supposed paid months, while real
debt on expired contracts disappears. The selected source uses the shared
per-invoice allocation settlement; no duplicated payment-summing engine, invoice
cache, synthetic monthly amount or receipt-count estimate is used.

Fresh information_schema confirmed the cutoff fields on legal litigation
profiles and cases, including date versus timestamptz types. Contract amount and
date definitions were reviewed in DATABASE_REFERENCE and existing billing v2.
Fresh production lookup confirmed both the shared helper and arrears RPC are
**absent**. Only read-only schema checks were run against production.

## Source behavior

`get_canonical_rental_arrears_v1(company,due_as_of)` returns one JSON envelope with
company/date, `settlement_basis=current_payment_allocations`, `fees_scope=excluded`
and per-contract verified or review rows. It is not a historical payment snapshot:
the supplied date selects due obligations while settlement uses current active
payments. It is also not authorization or a final legal claim computation.

- Due dates are the first of invoice_month (invoice_date fallback), never a legacy
  M+1 due_date. Due today/future invoices are not overdue. Remaining invoice money,
  distinct unpaid months and oldest unpaid month come from actual settlement.
- Includes real invoiced arrears on expired/non-active contracts, not just active
  contracts. Future valid contracts are not falsely marked as overdue.
- Uses documented return, confirmed termination, judgment/outcome and contract
  end cutoffs. Judgment timestamps use Qatar dates. Cancelled cases and other
  companies cannot supply a cutoff. This keeps existing monthly cutoff semantics;
  final within-month legal proration still belongs to the legal claim engine.
- Unknown invoice type/month, invalid payment identity/allocation, duplicate
  monthly invoices/schedules, missing/mismatched links and out-of-period evidence
  are quarantined. The contract schedule must have a valid total matching contract
  amount and contiguous months; a partly imported schedule must not imply paid.
  No month or amount is invented to fill a gap.
- Review rows return NULL financial totals/days/unpaid month count, not zero.
  They remain visible even if known invoices are paid or no billing rows exist.
  Consumers must present and exclude these rows explicitly, not coerce NULL to 0.
- Company membership is checked in the SECURITY DEFINER gateway, empty search_path
  and qualified relations are used, and anonymous/service execution is revoked.
  It calls the owner-only shared source; it creates no financial records.
- Invoice and schedule evidence is grouped once per contract rather than running
  many correlated scans of materialized company-wide data for each contract.
  Real full-schema EXPLAIN/timing and financial role-granularity remain to verify.

## Verification

26 new PGlite SQL tests pass, including 500+500 against a 1500 invoice leaving
500 and one unpaid month; cancelled receipt restoring 1500; fee separation;
prepaid due boundary; expired contracts; confirmed/unconfirmed cutoffs; Qatar
judgment date; malformed/missing/other-company evidence; incomplete and internally
gapped schedules; duplicate month; a 1002-row result; access denial; and rollback.
Combined with the monthly reader and billing graph, **91 tests pass**.

Tests execute the actual pending migration and shared SQL with minimal tables and
explicit auth fixtures. They do not establish full production RLS, trigger,
concurrency or large-real-data performance. No frontend change, browser action,
production migration, invoice generation, legal action or publication occurred.

## Required next integration (do not skip)

1. Add a strict typed response boundary for this envelope: matching company/date,
   unique contract IDs, safe cent amounts and conservation for verified rows,
   real dates/days and enumerated review reasons. Keep review money nullable.
2. Replace the legacy hook with company/user-scoped querying. Do not silently
   fall back to receipts if the new RPC is undeployed or unreadable.
3. Update both DefaultersList and LegalReports: render unresolved cases separately;
   exclude them from sums, batch selection/conversion and printing. Hide cached
   claims on errors/refetch/company changes. Print must escape customer-provided
   text; the present document.write interpolation is unsafe.
4. Do not pass this rent-only total as a complete claim or label excluded fees as
   paid/zero. Adjust or remove old monthly_rent/total_fines/contact assumptions
   through explicit fields and labels, not fake zeros.
5. Revalidate conversion eligibility on the server at action time; replacing the
   list estimator is not sufficient proof of the cached legal claim engine.
6. Verify full-schema query plans, permissions, deployment order and rollback of
   consumers before their source dependency. The full contract-details goal,
   LTO2024276 reconciliation and other existing release gates remain open.

## Consumer integration checkpoint — 2026-09-04

Items 1–4 above now have local implementations: `rentalArrears.ts` validates the
company/date envelope, reviewed-null versus verified money, integer cents,
conservation, unique contracts and due-date arithmetic. The company/user-scoped
hook does not use the receipt-count fallback. Both mounted consumers exclude
review rows and hide cached reports while fetching or after errors. Missing RPC
deployment is an explicit error, not an empty arrears list.

The conversion hook re-reads this source at click time and rejects selected
contracts that have been paid, moved into review, changed customer or become
ineligible. Fresh verified data is passed to the existing conversion service.
This is **not** atomic server-side validation: item 5 remains open, particularly
the cached balances used by the production legal claim engine. An in-flight
company/auth scope change and multi-step conversion races need additional checks.

Mounted tests exposed a real remaining discrepancy: print HTML still called the
document a legal complaint although the screen described a draft. The printable
header now explicitly says draft, rent-only and not legal approval. Counts now
say contracts rather than distinct customers; two contracts of one customer stay
independent. Customer-controlled HTML is escaped. ISO date-only last-payment
values use local calendar parsing to avoid moving to the previous date on
negative-offset devices. Bulk selection controls are disabled during conversion.

Verification at this checkpoint:

- 37 targeted Vitest tests pass (23 parser/service, 4 hook, 2 existing batch UI,
  8 new mounted integration cases). The new cases use real hooks/parser and
  React Query with mocked RPC, conversion and popup/document sinks; they never
  write production data. Initial failures included an incorrect test expectation
  that omitted the header checkbox and the genuine missing printed draft label.
- The same 37 tests passed with `TZ=America/Los_Angeles` before final count-label
  edits; final normal-zone rerun covers those label edits separately.
- 91 actual pending SQL/PGlite tests pass across arrears, monthly summary and
  billing graph. Minimal schema fixtures are not proof of production triggers,
  permissions, concurrency or performance.
- Full app and node TypeScript checks and targeted ESLint pass.
- Production bundle generation completed locally (6,664 modules, 1m23s), with
  existing Browserslist, OpenCV externalization, mixed-import and chunk-size
  warnings. This is a build check, not a deployed browser verification.
- The tests emit a missing test i18n-provider warning and the expected logged
  error in the simulated failed-read case; these are not live backend errors.

No production migration, invoice/payment change, legal conversion, message,
browser action or deployment was performed. The latest separate read-only check
still showed LTO2024276 ending 2027-08-15 with installment 37 on 2027-09-01.
Source RPCs, full-schema validation, signed schedule reconciliation and the
broader contract-details audit remain release gates. This is not completion of
the overall goal or a claim that production is fixed.
