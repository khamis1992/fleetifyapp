# Contract details read synchronization audit — 2026-09-04

Status: frontend repair implemented and tested locally in the following continuation;
not deployed. The original reproduction below is retained as historical evidence.
This is part of the complete contract-details audit, not a narrower replacement
for that goal. The previous date investigation revalidated the live schedule
conflict but did not repair it; this continuation adds independent test evidence.

## Follow-up implementation and current deployment gate

The active-goal continuation implemented the preferred explicit post-success
refresh in `src/services/contractFinancialSynchronization.ts` and wired the
actual details page to its query options. It no longer depends on changes to a
boolean or on a cache timestamp. Each validated RPC completion reloads the
contract's financial readers, including identical consecutive results and
`changed: false` results. Missing scope or mismatched/malformed acknowledgement
is rejected without automatically resubmitting the command.

`refreshContractFinancialQueries` gained an opt-in `cancelInFlight` mode. This
is necessary for initial requests with no cached data: ordinary invalidation
can join an older in-flight request instead of issuing a post-command read.
The synchronization operation uses this mode; existing payment callers retain
their previous default. The contract list is also refreshed as before. The sync
query is never invalidated by its own follow-up reads.

Post-command read failures return an explicit warning result instead of throwing
back into the RPC retry loop. Both the fail-closed financial-source screen and
the secondary-read warning provide a read-only retry path. That path preserves
the warning on repeated failure and clears it after recovery without an RPC.
Ordinary RPC errors retain the prior bounded retry policy; missing RPC codes
PGRST202/42883 and invalid acknowledgement do not retry automatically.

**Fresh production evidence (2026-09-04):** read-only `pg_proc` queries on project
`qwhunliohlkkahbspfiu` found no `public.refresh_contract_financial_state_v1`.
A second query returned `refresh_rpc_exists=false`, `contracts_table_exists=true`,
database `postgres`. No remote function was invoked. This contradicts any
assumption that the locally present restoration migration is already deployed.
The generated local TypeScript declaration follows the local migration's
`p_contract_id uuid -> jsonb` signature and explicitly notes the separate
deployment requirement. It is not evidence of a deployed function.

Latest targeted verification:

- 42 ordinary passing tests, **no expected failures in these four files**:
  22 real QueryClient/QueryObserver tests, 12 mounted page tests, 4 existing
  read-refresh utility tests, 4 existing static gateway migration tests.
- Query scheduling tests cover delayed command/read completion, replacing an
  unfinished initial read, late stale response suppression, identical boolean
  results, invoice-only refresh, failed-read recovery, malformed acknowledgements,
  missing RPC, bounded other RPC errors, no self-invalidation loop, fresh remount,
  contract navigation while the previous command remains in flight, invalid scope.
- Mounted-page tests execute the wired queryFn against a mocked RPC, retain
  fail-closed financial read checks and verify the read-only retry controls.
- TypeScript app/node passed after adding the local RPC type; targeted ESLint
  passed without diagnostics. `npm run build:ci` completed in 1m23s. It reports
  outdated Browserslist data, OpenCV browser-externalized fs/crypto imports,
  mixed static/dynamic imports and large chunks. Build success is not browser
  runtime validation and does not deploy the missing RPC.
- Diff whitespace checks passed (line-ending notices only).

These are frontend lifecycle tests, not production SQL, RLS, posting, end-to-end
browser, or multi-session database proofs. Existing broader financial TODOs
remain unresolved. No deployment or customer financial operation occurred.
The missing gateway must be reviewed with its real prerequisites and deployed
before automatic financial synchronization can work on production. Its local
migration alone, or a successful frontend build, cannot establish that outcome.

## Original reproduction (before the local repair)

## Current implementation inspected

- `src/components/contracts/ContractDetailsPageRedesigned.tsx` calls the financial
  refresh RPC in a React Query query, then uses an effect to invalidate readers.
- The effect returns unless `financialSyncResult?.changed` is true. Its dependency
  list includes that boolean, not a success event/revision. It does not consume
  the query's `dataUpdatedAt`.
- The inspected gateway source is
  `supabase/migrations/20260903085138_restore_authenticated_contract_financial_refresh.sql`.
  It recalculates invoices before the contract, but its `changed` result only
  compares contract total_paid, balance_due and payment_status. Therefore that
  field is not a statement that every invoice remained unchanged. This is source
  evidence, not a fresh deployed-function inspection or full-schema SQL test.
- `handleRefresh` invalidates readers and the refresh RPC concurrently. A reader
  can finish before the financial refresh. A subsequent refresh of that reader
  is necessary when the command completes; the current effect cannot guarantee it.

## Executed mounted-component tests

File: `src/components/contracts/__tests__/contractDetailsSourceFailures.test.tsx`.
The tests mount the actual page and execute its actual effect with controlled
query snapshots. The query client identity stays stable across renders, as in
the real provider. Query functions and financial child dialogs are not executed.
There are no API calls, payment writes, customer messages or legal operations.

Seven ordinary assertions pass:

1. Failed invoice read blocks the financial page and explains the missing source.
2. Failed payment read does the same.
3. Failed traffic-violation read does the same.
4. Failed complete schedule read does the same.
5. Initial loading renders a skeleton, not a usable zero-balance page.
6. The first `changed: true` response invalidates invoice reads.
7. Unrelated re-render does not repeat that invalidation.

Two additional `it.fails` cases execute their desired assertions and reproduce
known defects (Vitest counts them as passing because failure is expected):

1. Two distinct successful refresh responses both have `changed: true`. Even
   with a new result object and dataUpdatedAt, invoice invalidation count remains
   one instead of two.
2. Successful refresh returns `changed: false` because contract aggregates did
   not change. Invoice invalidation count remains zero instead of one. This
   matches the gateway's limited meaning of `changed`.

**Do not report the displayed 9/9 as nine healthy production behaviors.** The
tests establish seven passing behaviors and two executed known failures. They
do not prove actual query scheduling, browser interaction, RLS, SQL recalculation,
multi-session behavior or financial correctness.

## Repair design to carry forward

Preferred: make reloading the contract's financial readers an explicit
post-success step of the synchronization operation, independent of the
aggregate `changed` flag. Validate the acknowledgement's contract identity and
boolean fields first; malformed/mismatched acknowledgement is not success.
Reuse the existing scoped `refreshContractFinancialQueries` utility, which does
not invalidate the synchronization command itself, to avoid a refresh loop.
Keep a post-command read failure distinct from command failure so an already
completed command is not automatically resubmitted because a reader failed.
Retain the existing fail-closed page for missing financial sources.

Alternative: key a guarded effect to successful query completions. A dependency
on the result object alone remains vulnerable to structural sharing; a timestamp
alone needs same-millisecond and remount coverage. The explicit operation is
easier to test for ordering, acknowledgement and failure boundaries.

Before claiming repair, convert both expected failures to ordinary passing
regressions and add real QueryClient/QueryObserver tests with delayed readers
and delayed command completion. Include sequential identical results,
invoice-only correction, wrong-contract/null acknowledgement, unmount/remount,
contract navigation, failed post-command read, no invalidation loop, and no
cross-contract invalidation. Do not silently retry financial commands to recover
from read errors. No runtime implementation was changed in this audit.

## Verification

- Targeted Vitest: 9 reported passes = 7 ordinary + 2 expected failures, 2026-09-04.
- `npm run type-check`: app and node checks passed.
- Targeted ESLint: passed with no diagnostics.
- No production data changes, migration deployment, browser mutations or build.
- Existing fee-accounting decision, full-schema/concurrency verification,
  LTO2024276 schedule reconciliation and the broader page audit remain open.
