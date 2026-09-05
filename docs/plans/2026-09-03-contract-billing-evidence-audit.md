# Contract details billing evidence audit — 2026-09-03

Status: local repairs verified by targeted tests. Full contract-page audit remains
open. No production queries, invoice creation, billing corrections or deployment
were performed in this continuation.

## Findings and chosen repair

1. **The page hid evidence before validating it.** `ContractDetailsPageRedesigned`
   passed the contract's first month to `useContractPaymentSchedules`, which adds
   `gte(due_date, minDueDate)`. Earlier and undated rows could not reach the date,
   amount or schedule validator. The page now requests the unfiltered contract
   schedule with the existing company and contract predicates. Other consumers
   may still deliberately request the hook's optional date filter. Financial
   display exclusions remain in `buildContractFinancialSnapshotV3`; reading an
   out-of-period row does not add it to the in-period totals.
2. **Malformed generation acknowledgements looked successful.** The shared
   `generateContractBillingGraph` service accepted `{success:true}` and coerced
   missing, invalid or nonfinite counts to zero, then callers displayed "no
   missing invoices". It also guessed an unknown mode as `generated_schedule`.
   The service now requires a recognized mode and explicit nonnegative safe
   integer counts. The authoritative branch must return a finite nonnegative
   schedule total. The generated branch in pending migration `20260903161841`
   omits that total, so its result is `null`, not an invented zero. There is no
   legacy RPC fallback or automatic mutation retry on an uncertain response.
3. **Some server errors were mislabelled as missing deployment.** A regex that
   matched a function name also matched `permission denied for function ...`.
   Only PostgREST `PGRST202` selects the missing-command message now; permission
   and billing-validation failures preserve their actual server message.

The selected repair retains contradictory rows for validation and keeps the
database command authoritative. Extending contract dates, dropping rows from
the database or generating around a contradiction would alter financial terms;
none was done. Merely rewording the error would leave the missing-evidence and
false-success paths intact.

The existing validator already distinguishes invalid contract dates from valid
dates with schedule conflicts. The LTO2024276 synthetic regression still detects
2027-09 outside the 2024-08-15–2027-08-15 period. This is a fixture and the earlier
checkpoint observation, not a fresh read of that customer's current data.

## Verification

- Before the repair, the new suites produced **22 failures / 11 passes**:
  the page wiring assertion and malformed acknowledgement cases reproduced the
  defects. Hook results themselves used a mocked backend, not live SQL.
- After the repair, **52 tests pass** across five suites: service (27), hook (7),
  date calculation (10), financial snapshot (5), migration source checks (3).
- The hook tests execute the real hook with a QueryClient and mock Supabase:
  verify company/contract predicates, no default date filter, explicit optional
  filtering, failed reads, and initialization gating. Their returned rows feed
  the real date validator. A source assertion verifies page wiring; it is not a
  rendered-page or browser test. The snapshot regression verifies earlier rows
  remain flagged but excluded from in-period totals.
- The service tests exercise both response branches, a genuine zero created
  count, malformed counts/totals/modes, missing RPC, permission failure and
  validation failure. Each failure makes just one RPC call.
- App/node TypeScript checks passed. Targeted ESLint had zero errors and one
  existing `any` warning at the page's financial refresh RPC.
- `npm run build:ci` completed successfully in 1m 23s (6,650 modules). Warnings
  concern old Browserslist data, OpenCV browser externals, mixed static/dynamic
  imports and large chunks. The sandbox initially blocked reading Vite's config;
  the authorized local retry succeeded. Build output alone does not verify the
  rendered app; no preview/browser verification or deployment is claimed.

Reference: Supabase documents `gte` as a row filter, not a presentation filter:
[JavaScript gte](https://supabase.com/docs/reference/javascript/using-filters-gte).
The changelog markdown fetch failed with unsupported content-type; the current
filter documentation was obtained through the official docs search instead.

## Remaining gates within the full objective

- Reconcile actual contract terms and persisted schedules against signed
  evidence before creating invoices; no customer records were corrected here.
- Verify the pending atomic billing command against a complete disposable
  schema with real financial triggers, permissions, concurrent callers and
  rollback. Static migration tests do not prove these properties.
- The current RPC response has no company/contract acknowledgement identifier;
  this patch validates its shape and values, not independent record identity.
- Check automatic refresh and ambiguous transport outcomes across both invoice
  generation interfaces. No reattempt should create a duplicate, and a local
  error after a committed command must not be represented as definite rollback.
- Verify full-data pagination, expired/closed-period behavior and browser UI.
  Removing one date filter does not prove every possible data source complete.
- Keep the wider payment cancellation/allocation, vehicle lifecycle, document
  identity/retention, legal workflow and quick-edit audit gates open.

Operational audit note: `scripts/run-finance-ci.cjs` loads environment files and,
when DB credentials exist, adds live checks plus a health-snapshot publishing
step even without `--require-db`. It was inspected but not run as a purportedly
offline check. Targeted tests above used mocks/synthetic data only.
