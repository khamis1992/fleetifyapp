# Receipt journal integration audit — 2026-09-04

Status: verification expanded; newly reproduced fee-posting defect remains open.
This turn changed test fixtures/tests/docs only. No runtime migration, production
data correction, deployment, actual payment or waiver was performed.
Previous goal turn was progress (bank legacy-link fix and integration tests).

## Actual execution path now tested

Loaded the unchanged `create_payment_receipt_journal` and
`trg_payment_journal_entry_fn` from the canonical payment migration. Live body
hashes were verified read-only: `5f8ce69bb7149a64ccd441dd699a11bd` and
`451868d045e2cf8f5730a6a3dd7b54f0` respectively. Added an explicit journal,
account-mapping and chart-of-accounts schema adapter to the isolated PGlite test.

The new snapshot fixture stores the actual live bank journal handlers and
balance-update trigger function, not proposed code. Both BEFORE/AFTER bank
journal triggers and the AFTER bank-balance trigger are installed in the test,
alongside the real bank payment-link guard and existing allocation functions.

Full, partial and fee-only bank receipts carry the SAME journal ID on payment
and bank movement, exactly one journal, and two balanced lines. Replays do not
repost, including after the period is closed. The existence of two bank-journal
triggers therefore does NOT by itself prove duplicate journals for this path:
the payment journal is set before bank insertion, so both handlers skip it.

Missing mappings, header accounts, account level below 3, and injected posting
failure roll back without partial journals/payments/allocations/bank movements.
Failure during real bank balance recalculation also rolls back the journal.
Auth, period-policy and contract-rollup helpers are still doubles; the test
does not reproduce all journal approval/budget/activity/RLS constraints.

## New release blocker: fee principal and general-ledger classification diverge

An EXECUTED test creates a new fee assessment with a QAR 620 receipt split into
QAR 500 invoice principal and QAR 120 fee. Canonical invoice principal is correct,
but the real journal credits RECEIVABLES by 620, not 500. The assertion fails
`620 !== 500`. It is explicitly marked TODO so the limitation is visible; a zero
process exit is NOT proof that financial release criteria have been met.

Live read-only checks found no non-internal triggers on `late_fees` and no
configured default late-fee revenue type among fee/penalty types. The company
has account `4200`, “إيرادات الغرامات”, ID
`4fe8adb9-d169-47ca-8d10-4ca62ce3aa82`, active revenue, is_header=false,
account_level=2. This is not an eligible posting leaf under project rules
(requires account_level >=3). Traffic-fine expense/payable accounts are not a
substitute. A suitable approved posting account and fee-recognition treatment
must be resolved before implementing automatic journal distribution. Do not
reinterpret earlier accruals or modify posted journals without reconciliation.

No claim is made that every historical fee lacks an accrual: this test is for a
new assessment created inside the receipt command, and source/schema checks are
not a complete audit of historical journal records.

## Separate legacy bank fallback risk

`create_bank_transaction_journal_entry_from_record` references
`chart_of_accounts.account_id`, which does not exist in the live schema, and
catches errors by warning/returning NULL. It also selects accounts by name.
The actual definition is retained in the test snapshot. The normal contract
receipt path above skips it because a payment journal already exists. Repairing
the fallback safely requires examining manual-bank posting entry points and
their intended accounting mappings; simply renaming the column is insufficient.
Its broad function ACL also needs a separate authorization review before reuse.

## Results and remaining scope

Combined command: `node --test tests/database/invoice-fee-canonical-state.test.mjs
tests/database/invoice-fee-v1-integration.test.mjs
tests/database/invoice-fee-replay.test.mjs`.

122 passing tests, 2 TODOs (124 total): one executed failing fee-distribution
assertion and one unimplemented full-schema/concurrency release gate.
The canonical suite has 42 passing tests and the executed fee TODO.
No new TypeScript/build results claimed. Full production triggers, concurrency,
browser recovery, deployment, contract schedule reconciliation and the rest of
the contract-details audit remain open.
