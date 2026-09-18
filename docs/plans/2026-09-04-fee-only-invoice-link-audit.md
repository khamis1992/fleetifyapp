# Fee-only receipt invoice-link audit — 2026-09-04

Status: isolated local fix, not deployed. The complete contract-details audit
remains open. No production financial records changed in this continuation.

## Evidence and diagnosis

The previous user-facing date investigation verified live LTO2024276 dates
2024-08-15 to 2027-08-15 and its pending QAR 1,500 schedule on 2027-09-01.
This is a real unresolved schedule conflict, not missing dates. This continuation
does not repair that contract or generate invoices.

The fee receipt regression was reproduced again: 3 passes / 1 failure before
the fix. Real synchronization only counted `invoice` allocations, clearing
`payments.invoice_id` for a receipt allocated entirely to `late_fee`. The new
immutable request ledger then correctly rejected inconsistent receipt evidence.
The live synchronization body's normalized MD5 was rechecked read-only:
`ce8a7175fe46f375080b854ed2f62fd5`; its ACL allows postgres/service_role only.
Live schema and local types were checked for the joined columns.

## Design and implementation

Selected approach: derive the link from complete active allocation evidence,
not a stale payment field. Leaving the old link unchanged could preserve a
wrong identity; clearing it unconditionally breaks valid fee-only receipts.

Pending CLI-created migration `20260903211652` patches only the verified
synchronization body. A completed receipt, fully allocated to fees for exactly
one invoice, receives that invoice link. Every active row must resolve through
matching allocation/fee/invoice company, contract and customer. LEFT JOIN and
matching counts prevent invalid rows from silently disappearing from evidence.
Unallocated, partly allocated, mixed-invoice or mismatched evidence cannot
acquire a fee-only link. Existing principal-allocation behavior is unchanged.

The canonical invoice paid-amount function already excludes fee allocations
and does not double-count legacy invoice links when active allocations exist.
Therefore retaining a fee-only link contributes zero rent principal.

No new API grants, automatic data repair or client activation. The original
helper's ACL and locks remain unchanged. Rollback requires the exact patched
body and restores the verified original; receipts, allocations and immutable
request evidence remain. It refuses intervening changes inside or outside the
patch. Permission review follows the official
[Supabase function guidance](https://supabase.com/docs/guides/database/functions).
The changelog index could not be fetched (unsupported text/markdown response).

## Verification and limits

The canonical-state suite executes the real v1/v2 RPC, principal guard,
allocation validator, autoseeding, synchronization and invoice recalculation.
It covers full/partial/fee-only receipts, replay, fee after full rent payment,
company/customer/contract mismatch, voided/partial allocations, several fees
on one or multiple invoices, invalid evidence, ACL preservation and rollback.
Auth, period policy, contract rollup and bank helpers remain explicit doubles.
Tests simulating corrupt historical rows deliberately bypass only the fixture
allocation validator; they are not examples of permitted application writes.

`node --test tests/database/invoice-fee-canonical-state.test.mjs
tests/database/invoice-fee-v1-integration.test.mjs
tests/database/invoice-fee-replay.test.mjs`: 99 passed, zero failed, one
full-schema TODO (100 total). The canonical-state suite has 19 passing cases.

Not proven: all production triggers/constraints, bank and journal effects,
multi-session concurrency, browser retry recovery, deployment, or the broader
page audit. Gross-amount overpayment warning text remains a separate issue.
No TypeScript or UI changes in this continuation, and no new build claimed.
