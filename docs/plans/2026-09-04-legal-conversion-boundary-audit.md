# Contract legal conversion boundary audit — 2026-09-04

Local repairs only. The previous continuation made concrete SQL/UI progress on
monthly settlement. This continuation traced the actual contract-to-legal hooks
and their batch consumer. The full contract-details goal is still incomplete.
No production mutation, legal conversion, filing, message, migration or deployment
was executed. The production command definition was read, not invoked.

## Evidence and chosen design

`usePaymentLegalIntegration` still estimates arrears as elapsed 30-day periods
minus the number of receipt rows, then multiplies by monthly rent. Its `totalPaid`
sum is unused. Multiple partial receipts may therefore look like fully paid
months. It selects only active contracts and has an unscoped cache key. This
reader and the dependent LegalReports calculations are **not fixed by this turn**.

The same file's batch action used to insert legal_cases directly, without a
contract_id, using the browser's estimated case_value. Existing-case detection
was by customer and ignored query errors. That path bypassed readiness and could
confuse separate contracts for one customer. Meanwhile the details hook accepted
truthy malformed verification data and returned success with absent case identity
or an invented zero amount. Eight mounted-hook regressions failed before repair.

Selected design: reuse the existing guarded server conversion, not duplicate its
business writes in a batch loop or merely improve the frontend amount formula.
A shared service now serves both the details hook and the batch action. It:

- validates selected contract ID, company, customer, status, claim scope and a
  known boolean vehicle-custody decision before issuing requests;
- requires exact boolean true for signed-lease and customer-identity checks;
- preserves the Supabase rpc receiver (`this.rest`);
- sends no browser-calculated balance to the command;
- validates returned case company/contract/customer, case number, requested claim
  scope, and finite nonnegative cent-precision amount;
- reports blocked or uncertain outcomes without inventing zero or claiming that
  a command rolled back; automatic mutation retries are explicitly disabled.

Fresh read-only `pg_get_functiondef` confirms the production
`convert_contract_to_legal_collection_v2` returns full legal_case JSON, case_number,
total_case_value and claim_scope, including its existing-case branch. It checks
authorization, locks the contract, reuses a same-contract case, and retains
readiness, lease, identity and vehicle-custody checks. This is source evidence,
not runtime verification of every nested function, trigger or accounting amount.

The client permits an under_legal_procedure record to reach this same command for
server-owned existing-case reuse after an uncertain earlier outcome. It does not
create a second case itself. A different returned claim scope is not silently
accepted. Missing custody is a specific review error, not an assumption that the
vehicle is still with the customer. The details dialog already passes its explicit
custody choice; the batch reads the persisted field.

## Batch behavior and read refresh

Each selected contract is re-read with company and contract predicates and checked
against its selected customer. Duplicate identical selections are de-duplicated;
contradictory selections fail before any operation. The existing 30-day UI filter
is retained, explicitly **not** treated as proof of arrears. The server remains
responsible for readiness and claim calculation. No case-number RPC or direct
legal_cases insert remains in this exported batch action.

Partial outcomes contain converted and failed contract identities. The UI shows
each failure and keeps only failed contracts selected. A batch-level error retains
the selection. Success wording says conversion was confirmed, not that a new case
was necessarily created. The batch does not retry failed/uncertain commands.

Both hooks invalidate details, existing-case, legal-case and the actual
manual-legal-delinquency queue/count/candidate keys after settlement, including
errors. Synchronous and asynchronous cache failures are contained and reported
separately; they do not discard a command result or trigger a financial-sync RPC.

## Verification

- Eight new mounted-hook regressions first failed, then passed for truthy nonboolean
  approvals, selected-ID mismatch and malformed/mismatched conversion responses.
- Shared batch tests run the real conversion service with mocked Supabase,
  checking two contracts for one customer, repeated selection, forged browser
  amounts, wrong company/customer/contract, unknown custody, partial failures,
  missing records, failed document checks, invalid input, no automatic retries,
  server-owned existing-case reuse and claim-scope mismatch.
- Mounted DefaultersList tests exercise actual buttons and partial/batch error
  feedback. An initial harness failure came from returning a mock function from
  beforeEach (Vitest invokes it as cleanup); fixed the hook to return void.
- Current focused suite: **51 tests pass across six files** (conversion hook 11,
  batch service 12, read refresh 3, rendered failure feedback 2, existing legal
  reversal 19 and invoice-exclusion 4). The hook suite configures a global
  two-retry policy, proving the conversion's explicit retry=false override.
- App/node TypeScript checks passed. Targeted ESLint has no errors; remaining
  warnings are in the untouched legacy reader and existing list imports. No full
  test suite, build, live-browser workflow or production deployment is claimed.

## Remaining integrated repair / next steps

1. Replace the receipt-count arrears reader with allocation-backed, due-date-aware
   obligations, retaining unknown/missing invoice evidence as review rows. Scope
   its cache to authenticated company/user and handle incomplete reads explicitly.
   Do not deploy these batch changes as a complete financial-automation fix while
   the selection list remains inaccurate.
2. The existing server claim calculator still references cached invoice balances;
   validate it against the canonical settlement source and full financial triggers.
   Sharing its command prevents bypass, but does not certify the underlying claim.
3. Automatic readiness/document recovery is not added here. Failed preflight does
   not prove that a PDF request was sent. Keep the existing readiness controls;
   unify recovery with the autonomous agent before claiming hands-off completion.
4. `useRemoveFromLegalCases` is exported but has no found consumers; it still has
   unsafe customer-wide closure logic. It was not invoked or repaired here.
   `useCalculateCaseValue` still uses cached balances; LegalReports still ignores
   read errors and interpolates customer text into printable HTML. Audit these
   separately, including safe export escaping and case/contract scope.
5. Full database concurrency, authorization/trigger integration, browser behavior,
   historical record reconciliation, LTO2024276's signed schedule, and the broader
   vehicle/document/payment audit gates remain open.

Skills used: behavior design chose a shared command rather than another write
implementation; debugging traced the actual consumers; Supabase source inspection
confirmed the command contract; code review checked identity, uncertain outcomes,
cache refresh and preserved financial/legal guards. No subagents were used.
