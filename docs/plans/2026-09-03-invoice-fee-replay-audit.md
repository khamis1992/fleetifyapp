# Invoice fee receipt replay — audit and release gates

Status: **not ready for deployment or frontend activation**. The September 4
continuation repairs command identity in the still-unpublished migration. No
frontend callers, production balances, invoices, waivers or customer records
were changed. The entire contract details audit remains open.

## Latest follow-up — scoped principal guard (2026-09-04)

The following [principal control audit](2026-09-04-fee-principal-control-audit.md)
adds pending migration `20260903210643`, fixes the early gross-amount rejection
for validated v2 commands and adds the real allocation validator to tests.
It supersedes the earlier open principal-guard finding only at that tested
boundary; full-schema/trigger/bank/concurrency and frontend gates remain open.
Current combined result is 80 passing tests plus one full-schema TODO. Neither
migration is deployed. The historical counts and findings below are preserved.

## Earlier continuation — immutable command identity (2026-09-04)

The actual-warning regression first failed on the intended behavior: returning
the original payment ID after the warning appended text to the receipt's notes.
The pending v2 now atomically stores the original normalized request together
with the confirmed payment ID in `invoice_fee_payment_requests`. Later replays
compare the immutable payload, not the receipt's current notes. Changing the
original amount, date, invoice, actor, method, reference, note or fee ID is still
rejected. A generated-fee/null ID remains distinct from an explicit assessment.

This was selected over dropping the notes comparison, which would weaken input
identity. It does not modify the existing financial control or warning trigger.
The principal/fee overpayment blocker below is still reproduced and remains a
TODO release gate. No financial bypass was introduced.

The new table is company/key unique, has RLS enabled with no client policies and
revokes every direct table privilege from PUBLIC, anon, authenticated and
service_role. Only the authorized security-definer command writes it. A guard
checks tenant/invoice/actor/key and actual receipt amount, fee amount, date,
method and reference before accepting evidence; notes are intentionally separate.
UPDATE/DELETE/TRUNCATE are rejected even for ordinary owner DML. Foreign keys
retain the referenced invoice and payment; indexes support those references.

If either accounting or evidence insertion fails, both roll back in the same
transaction. The rollback disables v2 but retains request history, its guards,
and payment records. Re-enabling after rollback needs a forward migration, not
re-running the original CREATE TABLE. Privileged schema-owner DDL can still
disable/drop guards: this is application-level immutability, not WORM storage.

Legacy v1 receipts are adopted only when all persisted request fields match.
The system cannot reconstruct original notes once an old trigger changed them;
that case fails closed without a replacement payment and needs read-only
reconciliation. New v2 receipts do not have that limitation. Replays also reject
a receipt reassigned to a different invoice/company outside the command.

The current local run passes **67 tests with one TODO release gate** (68 total):
51 wrapper/ACL/history/rollback tests and 16 actual-v1 integration tests. This
includes the one intentionally reproduced, still-open gross-amount guard defect.
RLS is exercised under an actual authenticated role even after an accidental
SELECT grant; direct ledger privileges for all three API roles are absent.
Owner DML mutation, bad tenant/payload identity, parent deletion, downstream
failures, failed evidence insertion, and a trigger changing the actual receipt
amount are tested. Production access was read-only: ledger and v2 were absent.

The SQL migration is executed directly by PGlite 17 tests; no TypeScript or
frontend behavior was changed, so no new frontend build is claimed. Full-schema
RLS/trigger/journal/bank verification, concurrency and durable client identity
remain open. Current Supabase RLS guidance supports explicit enablement plus
restricted grants: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
The changelog markdown fetch failed on unsupported content type; official docs
were obtained via the Supabase documentation search instead.

The sections below preserve the preceding audit findings and historical counts;
the latest status and repair above supersede their unimplemented-identity gate.

## Verified production evidence (read-only, 2026-09-03)

`create_invoice_payment_with_late_fee_v1` checks the financial period, invoice
state and principal overpayment before it checks the idempotency key. Repeating
a completed receipt can therefore fail even with an unchanged key and payload.
Its explicit-fee lookup also falls through to a new assessment when the supplied
fee is missing or no longer pending/applied, and its amount cap does not subtract
prior active fee allocations.

The pending additive migration `20260903203807` provides a v2 wrapper. It checks
authorization and invoice/company identity, locks the invoice, restores matching
prior results before current period/balance checks, validates active assessment
remaining value, rejects stale calculated-fee quotes and rejects fractions beyond
the two decimal places persisted in payment amounts. It preserves v1 for actual
financial writes. Its rollback removes only v2, retaining records and v1.

The production `to_regprocedure` lookup for the full v2 signature returned NULL.
The frontend has not been switched to it. A production trigger listing also
showed 31 non-internal triggers on `payments`, not merely the RPC body.

For the following source bodies, normalized-LF local MD5 equals the production
`md5(pg_proc.prosrc)`. These hashes identify the reviewed code, not a security
proof or a guarantee about future deployment state:

| Function | Body MD5 | Source used by test |
| --- | --- | --- |
| `create_invoice_payment_with_late_fee_v1` | `463a29a610288377a20c1d880cc02be5` | migration `20260725170000` |
| `enforce_payment_financial_controls` | `4daf47f4a7f0569e413439c6c130230d` | migration `20260712052300` |
| `check_payment_overpayment` | `b364c8e94c3d51e0a02cb0cb2a4658a5` | read-only snapshot fixture |

Both reviewed payment triggers have `tgenabled = 'O'` in production. The bypass
helper checks `app.financial_controls_bypass`, not allocation batch mode, so v1's
`app.payment_allocation_batch_mode = 'on'` does not skip the financial guard.

## Newly reproduced release blockers

### 1. Gross receipt is treated as invoice principal

For an invoice of 1,500 QAR and an assessed fee, a receipt of 1,620 QAR correctly
separates 1,500 principal and 120 fee in v1. Before allocations are inserted,
`enforce_payment_financial_controls` instead adds the whole `NEW.amount` to the
previous principal and raises `Payment would overpay invoice by QAR 120`.

This was reproduced with the unchanged v1 body, pending v2 body, real financial
guard and real warning trigger. No receipt or allocations survived the rejected
transaction. The guard remains essential; bypassing it is not a fix.

### 2. A trigger changes the proposed replay identity

With the same 1,500-QAR invoice, intentional receipts of 620 (500+120) and 1,000
(880+120) produce principal of 1,380 QAR. The warning trigger sums gross receipts
instead (1,620), adds an overpayment warning to `payments.notes`, and v2 then
rejects an identical replay because the saved note differs from the original.

The test enables both real triggers for this scenario. It proves the earlier
wrapper-only tests were insufficient: there need not be any later employee edit
for notes-based replay identity to fail.

`sync_payment_with_invoice` also uses gross `NEW.amount` in the read production
definition. Its final effect with every other recalculation trigger is not yet
reproduced. Treat it as an additional investigation target, not a proven final
balance corruption claim.

## Repair direction and alternatives

Recommended: an immutable, company-scoped command record containing original
normalized input and resulting payment ID, plus one canonical principal/fee
allocation definition used by validation, posting, synchronization and warnings.
Capture command identity independently of mutable receipt notes, preserve
permissions for replay, and retain cancellation as a final historical result.
Validate all fee allocations against their invoice, tenant and assessed balance;
do not merely trust a fee amount supplied by a client to evade overpayment checks.

Removing the notes comparison alone would lose command-payload validation and
would not fix principal-versus-fee arithmetic. Disabling financial controls would
also drop period, immutability and allocation protections. Neither is selected.
Replacing the whole accounting engine immediately would enlarge risk; migrate
the allocation invariant with matching rollback and real-trigger tests first.

The recommended repair is **not implemented by this continuation**. Keep v2
unwired until these blockers are resolved; no release is authorized by green
tests that intentionally reproduce the known defects.

## Local verification

Run:

```sh
node --test tests/database/invoice-fee-replay.test.mjs tests/database/invoice-fee-v1-integration.test.mjs
```

- 36 wrapper/ACL/rollback tests use an explicit simplified v1.
- 13 further passing tests execute the unchanged actual v1 and pending v2,
  including receipt/principal/fee rows, partial payments, replay after closure,
  cancellation, fee-only receipts, downstream failure rollback, and the two
  **known-defect reproductions**. Two additional TODOs state unresolved release
  behavior instead of presenting the suite as production-ready.
- PostgreSQL major 17 is asserted in PGlite. It is single-connection testing.
- Auth, period policy, canonical totals and bank/synchronization functions in the
  integration adapter remain explicit test doubles; effect logs prove invocation
  and rollback, not actual journals, bank balances or production RLS.
- Full production triggers are NOT installed. Only the two named controls are
  enabled in the defect reproductions. No browser test, full-schema integration,
  concurrency test or deployment is claimed. This turn changes tests/docs only;
  it does not require rebuilding unchanged TypeScript application code.

## Remaining gates

1. Resolve the remaining gross-principal trigger blocker and replace its TODO
   release gate with a passing desired-behavior test, retaining no-bypass
   assertions. Immutable identity is now locally repaired as documented above.
2. Test real journals, bank movements, totals, approvals, RLS, cancellation and
   all payment/allocation/invoice triggers in a disposable full schema.
3. Prove multi-session duplicate-key, fee waiver/collection and cancellation
   races; invoice locking in one test connection is not concurrency evidence.
4. Add durable client attempt identity, read-only recovery after lost response,
   and correct handling across invoice/account switching and browser reload.
5. Resolve authoritative fee quote/policy and the third-decimal fee assessment
   versus cent-denominated receipts; do not silently alter customer balances.
6. Only then consider approved migration deployment and caller activation.
7. Continue the wider dates/schedules, vehicle, documents/legal, quick-edit and
   financial integrity audit. LTO2024276's out-of-period schedule remains intact.
