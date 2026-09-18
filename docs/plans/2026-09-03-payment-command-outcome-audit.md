# Contract payment command outcome audit — 2026-09-03

Status: local implementation and verification, not production remediation or
completion of the contract-details objective. The previous continuation made
concrete code/test progress. No production payment, waiver, invoice, message,
deployment or financial correction was performed here.

## Fresh evidence and priority

Read-only `pg_proc` inspection of the deployed functions confirmed:

- `create_invoice_payment_with_late_fee_v1` accepts `p_late_fee_amount` from the
  client, creates a `payment_assessed` fee if necessary, and returns a payment
  UUID. It does not recalculate the fee from a single authoritative policy.
- The dialog calculates delay through today, not the editable payment date.
  `calculate_rental_delay_fine` uses the payment's day within its month, whereas
  `calculate_smart_late_fee` accumulates capped 30-day periods. These are not
  equivalent to the dialog's single 3,000 cap. No formula was changed or chosen
  as authoritative in this continuation.
- Source tracing exposed a more direct duplicate-command mechanism: both
  payment hooks read the created row after the server returns its UUID. Read
  errors were thrown as command failures. `App.tsx` and `lib/query-client.ts`
  configure `mutations.retry: 1`; both hooks inherited this behavior. The fee
  path generates a new UUID idempotency key inside every mutation attempt.
- With the actual retry default enabled in the isolated hook tests, **three
  tests failed because the RPC was called twice instead of once** despite a
  successful command acknowledgement. This proves the client retry mechanism,
  not that a specific historical customer's duplicate was caused by it.

## Design and local repair

Use explicit command boundaries and preserve acknowledged payment identity.
Do not fabricate a full payment row from input, treat a failed read as rollback,
or change the global retry default for unrelated operations. Scoped commands
must override blanket retry until a persistent, replay-safe protocol exists.

- Added `readPaymentAfterCommit` and `PaymentRecordedReadError`. A valid UUID
  acknowledgement is required before classifying the outcome as committed.
  The subsequent read must match payment ID and company. Returned errors,
  thrown network errors, missing rows and mismatched rows preserve the committed
  identity in a typed error; no command or read retry is performed by the helper.
  Malformed acknowledgements explicitly remain unconfirmed, not successful.
- Both the fee-inclusive unified hook and central payment hook use the helper
  after their successful RPC response. The central hook's subsequent read can
  no longer enter the pre-commit number-collision retry loop, even when a
  synthetic read error has code 23505.
- Both creation hooks set `retry: false`, overriding the actual app default.
  The central hook's explicit pre-commit duplicate-number retry behavior is
  retained; its broader classification still needs a separate audit.
- Both hooks distinguish confirmed-but-unreadable payments in their warnings
  and invalidate readers. The dialog preserves the warning and payment ID,
  closes the submitted form and invokes the parent's read refresh. A failed
  parent refresh does not cause another payment command.
- A display-context token changes when invoice, company or open state changes.
  An earlier successful/confirmed-unreadable payment cannot reset or close a
  newer invoice session. Its original refresh callback still runs.

## Verification and boundaries

- Helper tests verify matching rows, missing/wrong-company/wrong-ID rows,
  returned/thrown read failures, preserved acknowledgement identity, and invalid
  acknowledgements without an unjustified commitment claim.
- Hook tests run the real unified and central hooks with mocked backend/auth,
  real React Query and `mutations.retry: 1`. They cover fee-inclusive, direct
  principal, and nested unified-to-central principal paths, a rejected command,
  and a post-commit read with a collision-like error code. All assert one RPC
  where appropriate; no real payment is created.
- Rendered dialog tests cover successful/failed parent refresh after a confirmed
  unreadable payment and both readable/unreadable old payments resolving after
  switching invoices. They assert the newer partial entry survives and the new
  form is not closed.
- The initial two central-hook failures were an incomplete mock of payment-
  number availability lookup, corrected by supporting the actual `limit` query.
  The later three double-RPC failures under app retry defaults reproduced a
  production-code defect and passed after the scoped retry override.
- The combined run passed **97 tests in nine files** before adding the nested
  principal case; the updated five-case hook suite then passed separately.
  Final combined and build status are recorded below after completion.
- App/node type checks passed. Targeted ESLint has zero errors and 28 warnings
  in existing large files (`any`, unused locals, non-null assertions). No new
  helper or test lint warning was reported.

## Final verification

- **98 tests pass in nine files**: helper (11), real hooks with mocked backend
  (5), rendered dialog (26), financial refresh (4), billing service (27),
  schedule hook (7), date calculation (10), snapshot (5), migration source (3).
- Final app/node type-check succeeded; fresh local production build succeeded
  in 1m 22s with 6,651 modules. Existing Browserslist, OpenCV externals, mixed
  imports and chunk-size warnings remain. Whitespace checks pass; new helper
  and test files pass ESLint. No deploy or browser verification is claimed.
- No old audit artifact or a passing helper test is being used as proof of
  server transaction/replay safety. The operational gaps below remain open.

## Remaining requirements — goal stays active

1. **Unacknowledged transport failures:** if the command response itself is lost,
   commitment is still unknown. No automatic retry is performed, but a durable
   attempt key/reconciliation UI across manual retry, close and reload remains
   required. A user can still manually repeat an unresolved attempt.
2. **Backend replay safety:** the inspected fee RPC checks financial period and
   principal overpayment before its idempotency lookup, and compares only a
   subset of payload fields. Do not claim safe end-to-end replay from this
   frontend containment.
3. **Post-commit financial/link failures:** missing journal IDs and legal-case
   linking errors after successful principal reads are distinct from this read
   failure boundary. Their repair and outcome semantics still need review.
4. **Other central-hook consumers:** they receive the typed, explicitly committed
   error but their own catch blocks/form behavior need workflow tests. Only the
   contract invoice dialog is specifically adapted here. Nested hooks/toasters
   can still produce duplicate warning notifications.
5. **Fee authority:** editable payment dates, contract-specific enablement/rates,
   waived/paid/multiple assessments and cap semantics remain unresolved. No
   historical financial terms have been inferred or overwritten.
6. **Full verification:** actual browser, complete-schema/RLS/triggers,
   multi-session concurrency, pending migrations and deployment are not proven
   by mocked hook tests. The complete dates/billing, payment/cancellation,
   vehicle, documents/identity, legal and synchronization audit remains open.
