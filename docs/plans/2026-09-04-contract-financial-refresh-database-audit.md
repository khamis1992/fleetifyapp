# Contract financial refresh gateway — database integration audit

Status: partial verification, **not safe to declare deployment ready**.

Follow-up: [receipt semantics audit](2026-09-04-invoice-receipt-semantics-audit.md)
extends the executed suite to **14 passes and 4 failing TODOs** and identifies
monthly/legal report and legacy ledger-migration dependencies. The 14+1 result
below is the earlier run, not the current release gate. Live legacy receipt
counts require reconciliation; they are not authorization to delete payments.

The previous continuation repaired the frontend stale-read lifecycle. This
continuation examined the pending gateway and its dependencies on the actual
configured database, using read-only catalog/schema/aggregate queries only.
No gateway, financial command, payment cancellation or customer message was
executed on production. All mutations below were isolated PGlite fixtures.

## Deployed dependencies versus missing gateway

The gateway `public.refresh_contract_financial_state_v1(uuid)` remains a pending
local restoration. Its four helper functions exist with service-role-only
EXECUTE privileges (besides owner). Ordinary authenticated callers must use an
authorized gateway, not call the helpers directly.

Read-only production body fingerprints on 2026-09-04:

| Helper | MD5 of prosrc |
| --- | --- |
| canonical_invoice_paid_amount | 90984ae9d90e663ed1e355dd3f17e44b |
| canonical_contract_paid_amount | 3c1d786f1ca26c117a7c0ff20f1ccba9 |
| recalculate_invoice_financial_state | 901d9bfce4f34b0fef8a5ba159a86ec6 |
| recalculate_contract_financial_state | 26e1d042941b2d30e09d68f1abd987e9 |

The contract recalculator is the **20260725170500 capped-principal version**,
not the older 20260712052300 version. The harness checks these fingerprints
after loading source from local migrations (normalizing CRLF before execution).
It does not replace a mismatch with an assertion against a guessed algorithm.

## Executed verification

Command: `node --test tests/database/contract-financial-refresh.test.mjs`.

Result: **14 passing cases + 1 executed failing TODO**. Process exit zero is not
release approval. Syntax and whitespace checks also pass.

The 14 passing cases exercise the actual restoration SQL with the four actual
helpers: ordered invoice-before-contract recalculation; correct before/after
acknowledgement; invoice repair even when contract aggregates and changed=false
are unchanged; repeated calls without new financial facts; principal-versus-fee
allocation; cancelled payment/invoice handling; unrelated-contract exclusion;
inactive/wrong-company/missing-user denial; anonymous/helper ACL isolation;
service-role invocation; invalid target rejection; preserving rows on rollback.
Two cases inject failure in the second invoice update or final contract update
and confirm every earlier write rolls back and the bypass flag returns to off.

The fixture has verified column names/types, with payment transaction_type as a
text adapter for the production enum's receipt comparison. RLS is enabled without
application table grants; authenticated gateway execution exercises the actual
SECURITY DEFINER tenant checks. Auth UID/JWT providers and update-event/failure
triggers are explicit test adapters, not production authentication or policies.
This is **not** the complete production schema or multi-session concurrency.

## New trigger conflict reproduced

Production has both:

- `trg_sync_receipt_on_invoice_update` on invoice paid_amount/payment_status:
  copies the invoice's cumulative paid total to every linked rental receipt.
- `a_guard_canonical_rental_receipt_v1` on receipt UPDATE/DELETE: forbids changing
  a receipt linked to a canonical payment outside its authorized command path.

Their inspected snapshots are retained in
`tests/database/fixtures/live-invoice-receipt-triggers-20260904.sql`, with tested
body fingerprints `330e1ba91be25f6b05f7c265d4e59484` and
`1786bc264a42aedc98a6543c931bc58e` respectively.

The executed TODO seeds two synthetic payments/receipts of QAR 500 each against
one invoice, attaches both real triggers, and invokes the gateway. Recalculation
correctly derives QAR 1,000 for the invoice, but the receipt-sync trigger tries to
write QAR 1,000 into **each individual QAR 500 receipt**. The immutability guard
raises SQLSTATE 42501 and the entire gateway call rolls back. The test's desired
outcome is successful aggregate refresh with both receipts still QAR 500.

**Live impact was not assumed:** a same-company read-only aggregate found zero
invoice-linked rental receipts with canonical_payment_id for the company at
inspection time. This proves a supported-path conflict in the deployed functions,
not an existing affected customer, a production loss, or the explanation for a
specific prior customer error.

## Required next work

Keep canonical receipt immutability. Do not set the authorization GUC or weaken
the guard to make aggregate refresh pass. Separate invoice cumulative summaries
from individual payment receipts; invoice recalculation must not overwrite or
fabricate those receipt amounts. Review legacy/mixed receipt semantics before
changing the old synchronization trigger, then add a reversible targeted
migration and convert the failing TODO into an ordinary passing regression.

Other actual invoice triggers also need integration: two triggers invoke the
month-based `sync_payment_schedule_with_invoice`, another invokes
`sync_schedule_with_invoice`, plus invoice normalization, duplicate-month guards,
budget updates, reminders and audit. Contract updates additionally run account,
company-isolation and audit/monitoring hooks. This audit inventories them; it
does not claim they have all been executed in the fixture.

Before gateway deployment, verify the full trigger chain and payment/cancellation
lock ordering in a disposable full-schema multi-session environment. Preserve
the pending frontend repair and its explicit missing-gateway warning. The broader
contract-details goal, fee-accounting decision, LTO2024276 schedule correction,
and production publication remain open.
