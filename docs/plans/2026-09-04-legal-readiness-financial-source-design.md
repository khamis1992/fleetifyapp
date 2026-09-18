# Legal-transfer readiness: canonical financial display

Status: implemented locally, **not deployed**. Part of the active complete
contract-details audit, not a certificate for the whole legal workflow.

## Evidence and design choice

Read-only production source inspection confirmed readiness v2 body hash
`96f660a8b730ac550f12eb184dd297ff`. It selected cached sales-only rental invoices,
ignored the second traffic source and actual customer receipt settlement, and
hardcoded every displayed penalty's responsibility as customer. Its downstream
v1 also performs document-request and operational-alert side effects; it is not
a harmless read-only diagnostic RPC.

The chosen change preserves that established document workflow but composes its
result with a canonical financial adapter. Keeping the old financial arrays
alongside corrected calculator totals leaves contradictory evidence. Replacing
the entire document-agent chain would expand scope unnecessarily. No production
readiness RPC, invoice/payment command, messaging or transfer was executed here.

## Database implementation

Supabase CLI created
`20260904032401_align_legal_readiness_financial_sources.sql`; the matching rollback
restores the exact guarded baseline v2 definition, without financial DML.

- `legal_claim_internal.read_readiness_finances_v1` is a private STABLE INVOKER
  reader. It consumes `canonical_legal_recorded_obligations_v1` and
  `read_traffic_obligations_v5`, not a new receipt or liability formula.
- The pending traffic reader now retains reference and responsibility in its
  audit rows so display metadata comes from the same normalized identities.
- Selectable invoices are included, outstanding rental rows before the legal
  cutoff. Matched service rent is included. Stale invoice paid/balance caches do
  not supply the displayed monetary values. Existing no-edit restrictions for
  journals, receipts, allocations and invoice items are preserved; this does not
  grant new authority to the invoice correction command.
- All normalized traffic rows can be displayed, with original source aliases and
  actual responsibility. Company/cancelled/settled/future rows have zero current
  customer liability; review rows have null liability and explicit reasons.
- `financial_context` carries version, company, contract, Qatar business date,
  independent rental/traffic review flags and reasons, nullable totals, and an
  explicit traffic-proof-required flag. Recorded traffic liability is separate
  from the evidenced claim component, which remains zero until proof exists.
- Private VOLATILE DEFINER gateway `get_readiness_v3` verifies active company
  membership (or trusted service role) plus `can_prepare_contract_for_legal_v1
  IS TRUE` before calling the readers or document automation. No `user_metadata`
  authorization. Public readiness v2 is an INVOKER facade. Raw readers and backup
  definitions are not executable by API roles.
- The legacy payment-record list remains informational, **not a settlement
  source**. Its caption now warns that record totals do not prove paid invoices.
  Unallocated/contract-only receipt evidence and the full payment-record display
  still require a separate audit; this change does not claim to certify them.

## Wizard integration

`legalReadinessFinancialContext.ts` validates source version, identity, date,
strict booleans, null/review semantics, currency values, unique selectable invoice
IDs and row/total agreement. Legacy or malformed responses fail closed. It also
validates the v4 fields rendered by the wizard, avoiding crashes from absent
nested components, and compares separately fetched rental/traffic amounts.

The wizard now:

1. Displays canonical balances and responsibility without the previous
   `liability_amount || total_amount || fine_amount` fallback (zero is real).
2. Shows unknown/review balances explicitly, never converting null into a zero
   or suggesting that an empty selectable list proves no invoices/debt.
3. Requires traffic proof for positive outstanding customer liability, not merely
   because company/settled/cancelled rows exist. Traffic-only scope can reach the
   proof step while its evidenced claim component is still zero.
4. Blocks every continuation/final submission on unavailable, fetching, erroneous
   or inconsistent financial data. Old cached claim amounts are not reused after
   a query error. An explicit recheck action refreshes both sources.
5. Clears review acknowledgements when underlying financial evidence changes,
   rechecks all acknowledgements and document/proof flags at the final step, and
   guards the readiness-completion request with a synchronous in-flight ref plus
   disabled UI state. This fixes the gap before the conversion mutation began.

These are client safety/consistency checks, not a replacement for final server
revalidation or atomic case creation. Server complete-v2 already calls the
canonical calculator after its pending engine migration; the complete
transfer/snapshot/filing chain still needs full-schema verification.

## Verification and limits

- **251 SQL tests pass, no failures/skips/TODOs**, across five actual-SQL PGlite
  suites: 103 calculator/readiness, 42 recorded-reader, 48 shared/monthly,
  26 arrears, 32 billing graph.
- The 15 new readiness SQL cases cover service rent, partial/cancelled receipts,
  cutoff, null review, merged traffic aliases, zero company/settled/cancelled
  liability, proof-pending amount, conflicting sources, public composition,
  inactive membership, null permission, raw-helper denial and exact rollback.
- **35 Vitest tests pass**: 23 financial-boundary assertions, 6 rendered wizard
  interactions, 4 invoice-exclusion wiring checks and 2 cutoff-migration checks.
  Rendered tests exercise real controls with all external queries, document
  automation and conversion effects mocked. They verify final-step fetching/error
  guards, inconsistent amount blocking, zero liability/proof behavior, and one
  completion request during repeated clicks. They are not a live browser/RLS test.
- Full app/node TypeScript checks pass. Production Vite build passes with existing
  warnings about large chunks, OpenCV browser-externalized Node modules, mixed
  imports and stale Browserslist metadata. No React alias/chunk setting changed.
  The final explicit `!claimStatement` submission guard (removing a non-null
  assertion) was subsequently rechecked with full TypeScript and all 35 Vitest
  cases. Targeted ESLint has zero errors and one pre-existing callback-dependency
  warning; the build preceded that final guard-only change.
- Native PostgreSQL/full RLS/trigger graph, concurrent financial writes, actual
  document automation, transfer/snapshot/filing, deployment smoke and real
  historical reconciliation remain unverified.

## Deployment and rollback gate

The adapter depends on the **pending** canonical settlement/recorded-rent/traffic
engine migrations. The private engine schema was still absent in production at
the preceding read-only check. The new local wizard intentionally blocks old
backend financial payloads; it must not be published before its dependencies and
adapter have passed release gates and been deployed. Publish backend first, then
the frontend; coordinate rollback of the frontend with readiness v2 rollback.
Roll back `20260904032401` before `20260904024349` so private adapters do not outlive
their readers. No release was attempted.

Remaining broad-goal gates include the 273 cross-source conflicts touching 64
contracts, LTO2024276 signed-schedule reconciliation, complete rental coverage,
renewal/proration, cutoff/custody labels, receipt-record evidence, and the rest of
the contract page's document, vehicle, cancellation and quick-edit workflows.
