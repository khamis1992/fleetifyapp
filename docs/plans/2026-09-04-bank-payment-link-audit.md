# Bank payment link audit — 2026-09-04

Status: pending local repair and isolated integration verification; not deployed.
Follow-up: [receipt journal integration](2026-09-04-receipt-journal-integration-audit.md)
now includes the actual receipt and bank journal/balance handlers and documents
an unresolved fee-distribution assertion. The earlier test counts below are historical.
Previous goal turn made progress (fee-only linkage implementation and tests).
This continuation expands financial verification; the full page goal is open.

## Fresh evidence

Read-only production schema and function checks confirmed the local functions:

| Function | Normalized body MD5 |
| --- | --- |
| create_payment_bank_transaction | 23701bf3aca679e8e5f308be19df4a6e |
| recalculate_bank_balance | 250bd1d530a4bdc88c3810ed4403da3e |
| resolve_payment_bank_id | ddb16436e298f6a90fb8b03d878b6d34 |
| payment_method_uses_bank | 516dafb4a6a10c8fba52ecde8f634d4f |

The existing helper finds the first orphan bank movement with matching
company/bank/direction/amount and either the internal or external reference.
It neither checks completed status/date nor rejects multiple candidates.
The new test reproduced adoption of a cancelled movement: 27 passed / 1 failed.
This is an isolated reproduction using the real helper, not a live payment.
The live payment-link trigger also lacks status/date checks; it was subsequently
included in the test runner unchanged from its migration.

## Chosen repair

Pending CLI-generated migration `20260903213117` replaces only the verified
legacy-adoption branch. Lock all matching reference candidates in ID order;
reject ambiguity, rather than choosing the first or creating a duplicate.
A unique candidate must match the internal payment number, completed status,
date, bank, amount, direction and journal ID (including NULL consistency).
An external reference alone requires reconciliation; it cannot prove that a
movement belongs to this particular payment. Adding only a completed-status
filter would silently hide cancelled evidence and permit a duplicate deposit.

The new-payment, already-linked replay and authorization branches are unchanged.
No production table writes, API grants or frontend activation were performed.
Rollback verifies exact patched/original hashes and preserves all financial
rows. No new dependencies were installed.

## Verification

The expanded canonical suite now executes actual bank selection, bank movement,
bank balance calculation and bank payment-link guard, in addition to the actual
invoice/fee/allocation functions. Tests cover full/partial/fee-only bank receipts,
cash without a bank movement, replay with one deposit, invalid/ambiguous bank
configuration, failure during real balance update with full receipt rollback,
valid legacy reattachment, cancelled/different-date/amount/direction/journal or
external-only legacy evidence, duplicate candidates and rollback/ACL retention.

Auth, financial-period policy and contract totals remain doubles. Bank schema
is an explicit adapter, not a full production dump. In particular the actual
bank journal and activity triggers are NOT yet in the fixture. Source inspection
found `handle_bank_transaction_changes` attached twice (BEFORE INSERT/UPDATE
and AFTER INSERT); whether journaling is correctly deduplicated is a required
next investigation, not an established bug from the trigger count alone.
The balance-update trigger and full production constraints/RLS also remain
to be integrated. Multi-session concurrency and browser end-to-end tests remain
unproven. No TypeScript change, build, deployment, live payment or waiver.

Run: `node --test tests/database/invoice-fee-canonical-state.test.mjs
tests/database/invoice-fee-v1-integration.test.mjs
tests/database/invoice-fee-replay.test.mjs`: 117 passed, zero failed, one full-schema
TODO (118 total); canonical-state suite has 37 passing tests.
