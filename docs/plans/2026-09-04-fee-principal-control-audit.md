# Fee-inclusive receipts and principal controls — 2026-09-04

Status: local SQL repair verified at the RPC/control/allocation boundary. **Not
deployed, not wired to frontend callers, not a full-schema accounting proof.**
The complete contract details audit remains open.

## Problem and selected design

The enabled production financial guard compared the entire new receipt against
the invoice principal before v1 could create separate principal/fee allocations.
An invoice of 1,500 QAR plus 120 QAR assessed fee therefore failed on a valid
1,620-QAR receipt. This reproduction is retained against v1 without context.

Blindly subtracting a user-supplied fee would weaken overpayment protection.
Skipping controls whenever the allocation batch GUC is on would also skip useful
checks. Neither approach is used. The pending migration instead adds a narrowly
scoped, transaction-owned capability and a final allocation proof:

1. After v2 authorization, invoice lock and fee validation, it inserts one
   `invoice_fee_payment_context` row with company, invoice, actor, request key,
   total, fee, date, normalized method and the current PostgreSQL transaction ID.
2. `payment_principal_for_control_v1(payments)` subtracts the fee only if all
   these values match the incoming payment in this transaction. Otherwise it
   returns the full receipt amount, preserving existing behavior.
3. The existing financial guard retains period, immutability and allocation
   checks; only its two uses of the new amount in the principal comparison/error
   are replaced with this helper. The migration refuses an unknown guard body.
4. V1 still inserts the receipt and allocations and invokes financial helpers.
   `assert_invoice_fee_command_allocations_v1` then requires exact active totals,
   exact principal on the intended invoice, exactly one fee allocation, correct
   tenant/assessment/contract identity and an active/paid assessment. Missing,
   negative, foreign-target or unexpected allocations abort the entire command.
5. Context is deleted before storing the immutable request result. Any failure
   rolls back payment, allocations, context and request evidence together.

Both new helpers are invoker functions with empty search paths and no direct API
role execution grants. The existing authorized security-definer RPC/trigger
executes them as its owner. The context table has RLS enabled, no client policies
and no direct PUBLIC/anon/authenticated/service_role privileges. A caller cannot
mint a capability via the Data API or by setting the allocation batch GUC.

The context is not permanent command history; `invoice_fee_payment_requests`
from the preceding migration remains the immutable history. Owner-level schema
tampering is outside this trust boundary. This does not establish the business
policy for calculating a fee supplied without an existing assessment ID.

## Migration and rollback

- CLI-generated migration: `20260903210643_guard_fee_receipt_principal_with_command_context.sql`.
  Its UTC filename precedes the local September 4 calendar date.
- Requires pending replay migration `20260903203807` and the inspected production
  financial guard. No pending migration was applied to production.
- Guard preflight verifies normalized body MD5 `4daf47f4a7f0569e413439c6c130230d`.
  V2 insertion points must occur exactly once; unknown shapes fail atomically.
- Matching rollback disables v2, restores the original guard (verified hash),
  removes only the ephemeral context/helpers and retains receipts and immutable
  request history. It refuses to discard an unexpectedly nonempty context table.
  Re-enabling the command afterward needs a forward migration.

## Evidence and verification

The real allocation validator was added to the integration fixture. Its body
MD5 `128d69bad0495bbd1fbadf1421bd66a4` matches the fresh production read, and the
production allocation trigger listing confirms it is attached. The actual v1
and warning bodies were already verified in the preceding audit.

Command:

```sh
node --test tests/database/invoice-fee-replay.test.mjs tests/database/invoice-fee-v1-integration.test.mjs
```

Result: **80 passing tests and one explicit full-schema TODO (81 total)**.
The 51 base-wrapper tests exercise the preceding replay migration. The expanded
integration suite loads both pending migrations; 29 tests pass and one remains
TODO. Named scenarios now attach the real financial guard, warning trigger and
allocation validator. These tests prove:

- 1,500 principal + 120 fee succeeds with exact allocations; repeating the same
  request returns the same ID without extra writes.
- A new principal overpayment, a closed period, an excessive assessed fee and a
  fee from another contract remain rejected.
- Allocation batch mode alone does not grant the deduction; an old transaction
  context does not grant it either. All API roles lack context insertion/helper
  privileges; an actual authorized authenticated RPC caller succeeds.
- Omitting the fee allocation after the early guard passed aborts all writes.
- Accounting, evidence-write and receipt-value discrepancies roll back without
  leaving a context row. Legacy requests are not guessed or recreated.
- Rollback restores the normalized original guard body and retains history;
  rollback with unexpected context fails without losing it or disabling v2.

The first rollback test compared raw CRLF text against a normalized LF hash and
failed; its comparison was corrected to normalize line endings, matching both
migration and rollback preflight logic. The final run above passes.

## Still unverified / remaining work

- Full production schema: journals, bank balances, approval controls, all 31
  payment triggers and all invoice/allocation triggers. Auth, canonical totals,
  period policy and bank/synchronization helpers remain explicit fixture doubles.
- Multiple-session races, lock ordering against cancellation/waiver and deferred
  constraints. PGlite tests are single-connection and are not concurrency proof.
- `check_payment_overpayment` still emits a false gross-receipt warning in notes;
  immutable identity tolerates it, but the warning arithmetic remains to fix.
  `sync_payment_with_invoice` still needs full-chain verification for its gross
  arithmetic and later canonical recalculation.
- Current frontend callers still invoke v1: production behavior is unchanged.
  Activate v2 only after the above gates, authoritative fee policy, durable
  browser attempt identity and read-only uncertain-result recovery are verified.
- The rest of the full contract-page objective remains open: schedule correction,
  all finance flows, legal/documents, vehicle lifecycle and state consistency.

No real payment, waiver, invoice, customer balance or deployment was performed.
SQL was executed only in the isolated test database. No TypeScript changed, so
this continuation does not claim a new frontend build or browser validation.
