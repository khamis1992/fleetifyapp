# Contract payment feedback and refresh audit — 2026-09-03

Status: local repairs and targeted verification; full audit not complete.
No production database calls, payments, waivers, deletions, messages or deployment
were performed. The preceding billing-evidence continuation made concrete code
and verification progress; this is not a repeated blocked/wait turn.

## Verified defects

1. The production build included `use-toast-mock`. Direct source inspection
   found it returned a logger and an empty toast list rather than notifying the
   application's real `Toaster`. Five runtime consumers used it: contract list,
   signed-agreement upload, customer invoices, permanent contract deletion and
   invoice payment. The payment hook separately emits Sonner notifications, so
   **not all payment errors were silent**. The dialog's direct fee-waiver errors
   and other locally raised messages were disabled.
2. `PayInvoiceDialog.onSubmit` wrapped both payment mutation and the parent's
   refresh callback in the same catch. A synchronous exception from that
   callback became "خطأ في تسجيل الدفع" even after the payment resolved.
   An asynchronous callback was not awaited at all.
3. The details page's `onPaymentCreated` callback explicitly refreshed invoices
   only and did not await that refresh. Its payment list, schedule, contract
   summary and audit history depended on other hooks' incidental invalidation.

## Local changes

- All five consumers import the real `use-toast` hook. The old compatibility
  module now re-exports the same real store rather than remaining a silent
  logger. No React alias or chunking configuration was changed.
- Separate the command failure boundary from post-save work. A rejected
  payment leaves the form open with its values. After mutation success, close
  and reset the form, await the optional refresh callback, and distinguish a
  refresh failure using "تم تسجيل الدفعة، وتعذر تحديث العرض" plus an explicit
  instruction not to record another payment. This boundary does not prove a
  transport failure inside the payment command means rollback.
- Added the missing accessible `DialogDescription` for the invoice number.
- Added `refreshContractFinancialQueries`, integrated in the details page's
  payment callback. It invalidates/awaits active readers for contract details
  (both number and UUID route keys), invoices, payments, schedules and audit.
  Inactive queries become stale. It uses `throwOnError: true` and waits for all
  reads to settle, so a failed refresh reaches the distinct post-save warning.
  It does not write fabricated paid balances or invalidate the
  `contract-financial-refresh` RPC-backed query. Other contracts and companies'
  explicitly scoped details/audit readers are not targeted.

## Verification and limits

- The first three new rendered tests all failed before repair. Their logs
  showed the disabled-toast logger, and a committed mock payment followed by
  a synchronous parent exception reproduced the false payment-failure branch.
- **10 tests now pass**: six rendered/compatibility tests and four real
  QueryClient/QueryObserver tests. The dialog, React Hook Form, Radix controls,
  real toast hook and real Toaster are exercised in jsdom. Mutation/backend
  calls are mocked; no actual customer payment or waiver is created.
- Tests cover visible waiver rejection retaining the fee, payment rejection
  retaining entered amount, synchronous/asynchronous refresh rejection after
  success, normal success, compatibility store identity, both details route
  keys, cache isolation, awaited fresh reader data, failed reads, and incomplete
  scope without broad invalidation.
- App/node type checks pass. Targeted ESLint: zero errors, 35 existing warnings
  across the larger touched files (mostly `any` and unused imports/locals).
  Tracked-file whitespace check passes with CRLF notices.
- The combined billing/payment regression run passes **62 tests in seven
  files**, including the prior 52 billing/date/snapshot checks. Expected error
  logs are from the injected rejection cases, not live backend failures.
- A fresh `npm run build:ci` passed in 1m 30s (6,650 modules), with existing
  OpenCV externals, mixed import and large-chunk warnings. A build or jsdom
  render is not production-browser/preview verification. No deployment occurred.

## Findings recorded before the fee-read follow-up below

- Payment late-fee reads catch an error and return an empty array; allocation
  read errors continue with zero paid allocations. These can misrepresent
  unknown amounts. The submit button does not wait for those reads to succeed.
- The dialog computes a hardcoded daily fee of 120 capped at 3,000, uses only
  the newest active fee, and the local waiver flag resets on `open`, not invoice
  identity. Verify current contract rules, backend fee allocation and waiver
  authority before changing amounts or persisting corrective records.
- The details **invoice** query still filters on `due_date >= contract start
  month`. The prior repair removed this filter from the schedule query only.
  Audit canonical invoice-month precedence, historical/undated invoice visibility
  and payment linking before changing the invoice display/collection scope.
- Several invoice/payment cache keys omit company IDs even though their reads
  apply company filters. Do not describe this helper as a complete cache-tenant
  isolation fix; it preserves the currently used key shapes.
- Validate callback failures and post-commit uncertainty inside all payment
  hooks, double submission, stale balance handling, dialog close/reopen and
  switching invoices while a command is pending. The new tests do not establish
  end-to-end idempotency or backend rollback.
- Invoice generation still has its separate success/refresh sequence. Reuse
  the proven outcome separation only after checking its real reader keys and
  ambiguous-response handling. Do not automatically rerun a financial command.
- Other restored toast consumers need their own rendered workflow tests;
  import changes plus a shared-store test are not full functional coverage.
- Layered payment hooks already emit Sonner messages; audit duplicate feedback
  ownership separately. Restoring local feedback does not prove deduplication.

The complete objective remains dates/billing, allocations/cancellations,
vehicle lifecycle, documents/identity, legal workflows, quick edits and reliable
automatic synchronization. Pending migrations, real financial reconciliation,
full-schema/concurrency and browser validation are still open.

## Fee-read and waiver confirmation follow-up — 2026-09-03

The date explanation preceding this continuation made evidence progress: a fresh
read-only production query confirmed LTO2024276 dates 2024-08-15–2027-08-15 and a
pending 1,500 QAR schedule on 2027-09-01 outside that period. No schedule or
contract was corrected. The present continuation performs local implementation
and tests plus read-only live schema verification; no real waiver/payment,
deployment, message or financial reconciliation was performed.

### Chosen behavior and alternatives

Use successful, company-scoped reads as the collection gate and returned,
identity-checked mutation rows as waiver acknowledgement. Returning empty fees
on a read error would treat unknown amounts as zero; displaying stale cached
fees during a failed refresh would still permit collection on unverified data.
Likewise, suppressing all fees using a local boolean after a waiver cannot prove
which persisted fee changed. These alternatives were rejected without changing
the configured financial terms or bypassing server permissions.

### Implemented locally

- Late-fee and allocation query errors now propagate. Collection, amount actions
  and waiver controls wait for successful reads and remain blocked during
  loading/error/company initialization or an explicit invoice/company mismatch.
  Unknown aggregate amounts display as unverified. The retry button reads only.
- Both reads and the fee query key include company scope. Partial entered
  amounts survive a failed background read and retry; automatic full amounts
  follow refreshed balances. The initial amount is populated after reading.
- Waiver updates filter company, invoice, exact fee and active fee status, then
  request the returned row. Calculated-waiver inserts also request a returned
  row. Both branches check company/invoice/status/ID; absent or mismatched
  acknowledgements do not announce success. The existing-fee branch also checks
  the returned fee ID equals the requested ID. Optional invoice-owner lookup is
  company-scoped. This does not replace server-side authorization or provide
  transaction/idempotency guarantees.
- Removed the local waiver override. After confirmed mutation, await fee-reader
  invalidation with error propagation. Persisted rows now decide what remains
  payable; a confirmed waiver followed by failed reading displays a distinct
  refresh warning, not a definite waiver failure, and keeps payment blocked.

### Verification

- Rendered tests exercise the real dialog/form/toaster with mocked backend:
  initial fee/allocation failures, pending reads, company initialization and
  mismatch, partial-entry preservation, allocation subtraction, rejected waiver,
  missing/wrong fee acknowledgement, both waiver branches, confirmed waiver
  followed by failed reading, and an old invoice waiver resolving after the
  dialog switched to another invoice. No customer mutations were used to test.
- The pre-implementation run had 4 failures/10 passes: three new acknowledgement
  scenarios and the existing rejection test whose mock was upgraded to the new
  query shape. After implementation, the two remaining failures were ambiguous
  text selectors (title and description), corrected to match the exact warning.
- The background-refresh test now waits for React Query observer rendering
  before checking the disabled control; previously its immediate assertion ran
  before notification. The control is still asserted disabled before retry.
- The combined run currently passes 70 tests in six files. A requested seventh
  snapshot path was not matched; do not treat that run as snapshot coverage.
- App/node TypeScript checks passed after runtime changes. Targeted ESLint
  reports zero errors and three existing `any` warnings. Build and final combined
  validation are recorded separately below once complete.

Current Supabase documentation confirms mutation rows are not returned by
default and `.select()` requests them:
[Return modified rows](https://supabase.com/docs/reference/javascript/using-modifiers-select).
Live information_schema SELECT verified the fee identity, company, invoice,
status and waiver columns against the local types/reference. No live UPDATE or
INSERT was issued.

### Still not established

The hardcoded 120/day, 3,000 cap, only-newest-active-fee selection and treatment
of payment dates need reconciliation with authoritative backend rules. Successful
reads do not prove that formula correct. A production function inspection in
the earlier continuation found differing calculation paths; do not wire an
arbitrary function into collection as a guessed authoritative quote.

Still open: server-authorized atomic/idempotent waiver and payment operations,
concurrent staff actions, full query pagination, stale invoice balance and
post-commit transport ambiguity, all form fields when changing invoice, and
actual browser/full-schema verification. An unconfirmed mutation warns against
blind retry but is not an automatic idempotent reconciliation mechanism. The
entire contract-details audit and pending migrations remain unfinished.

### Final local verification for this follow-up

- **78 tests pass in seven files**: payment dialog (22), financial refresh (4),
  billing service (27), schedule hook (7), date/billing validation (10), financial
  snapshot/token tests (5), migration source checks (3). The snapshot suite's
  actual path is `contract-details-v3/__tests__/tokens.test.ts` and was included
  in this final rerun. No mock test is presented as live SQL verification.
- A new app/node TypeScript check completed and the production build passed
  in 1m 22s (6,650 modules). Existing Browserslist, OpenCV browser externals,
  mixed import and large-chunk warnings remain. No deployment or browser smoke
  test was performed. The final test-only acknowledgement cases do not alter
  the built runtime source.
- The remaining audit priorities above are not resolved by these green checks;
  specifically the fee formula and authoritative collection command need work.
