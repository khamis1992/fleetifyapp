# Contract overlap and atomic vehicle handoff

## Findings

C-ALF-0041 ends on 2026-02-01; HIST-XLS-T77-5900 starts on that same day. Both records were under legal procedure during inspection. The inclusive overlap guard sees their shared date. Legal reversal previously restored every contract to active, including expired contracts, causing this overlap error. The records include historical imports; this inspection does not establish the precise original import path.

## Changes

- Legal reversal restores an expired contract to `expired` using the Qatar calendar date. Filing evidence, permissions and case-outcome guards remain intact.
- The status window offers cancellation separately from legal reversal. Cancellation retains the legal file and customer liabilities.
- The creation wizard lists available and rented vehicles, checks company-scoped overlapping contracts, and requires a reason and explicit consent before cancelling a predecessor at submission.
- Cancellation and creation execute in `create_contract_with_vehicle_handoff_v1` as one transaction. Failure of the creator's billing result raises an exception and rolls back cancellation and its audit. Retries validate the original payload, predecessor and reason.
- Vehicle row locks serialize assignment. A changed predecessor version, multiple conflicts or a legal predecessor blocks handoff. Existing financial/eligibility checks still run.
- Handoff does not fabricate a vehicle return inspection or transfer customer penalties to the company.

## Deployment and verification

Applied `20260906184734_fix_expired_legal_reversal_and_vehicle_handoff.sql` to the connected Supabase project on 2026-09-06. Verified the RPC, anonymous execution restriction, expiry fix and row lock in the installed definitions. Frontend changes are local; no Vercel deployment was performed.

Nine isolated PostgreSQL/PGlite tests cover cancellation/creation, rollback on billing failure, idempotency, changed inputs/versions, company scope, legal and multiple-conflict blocks, unsupported deposits, and exact restoration of the original functions by the rollback. The creator in these tests is a fixture; real financial creation has not been executed against production data.

Twenty-seven targeted frontend/service tests pass. Type checking and production build pass. The actual C-ALF-0041 status dialog shows the expired outcome and separate cancellation action. In the live local wizard, selecting vehicle 21860 showed its occupying contract CNT-26-0106, the two outstanding penalties totalling QAR 600, and the required handoff consent. No customer contract was cancelled during verification.

The optional security-deposit creator migration is not installed on the connected backend. Zero deposits work with either signature; nonzero deposits are never silently discarded, and an unsupported deposit aborts handoff with the predecessor unchanged.

Rollback: `supabase/rollbacks/20260906184734_fix_expired_legal_reversal_and_vehicle_handoff.rollback.sql`. It restores functions and removes the new RPC; it does not undo completed business transactions.
