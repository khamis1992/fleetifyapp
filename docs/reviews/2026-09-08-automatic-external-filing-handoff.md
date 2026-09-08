# Automatic external filing handoff

Status: implemented, locally tested, deployed and verified through the live approval button after explicit user approval on 2026-09-08.

## Cause

The affected case's worker had reached `needs_human / SUBMISSION_UNCERTAIN` after failing to capture the receipt. Its former worker lock remained. The external filing command accepts only terminal jobs or acknowledged manual stops; the ordinary cancellation command intentionally rejects uncertain submissions. Thus the user could neither register the known reference nor finish the handoff with the approval button.

## Change

`record_external_legal_filing_v2` coordinates handoff and the existing audited filing transaction. Active browser work receives a cooperative stop request; the command returns a pending result so locks are released while the worker acknowledges. The frontend continues the same command every two seconds only after a confirmed pending result, with a bounded wait and Arabic progress messages.

Queued, failed and human-paused tasks can be retired inside the same transaction that records the user's historical filing attestation. Old state/error/worker and actor/reference/date are retained in the task event. A paused uncertain task is resolved by the attestation; it is never restarted, and no successful automation receipt is fabricated. Late worker writes lose ownership. A matching pending receipt waits for synchronization; a conflicting or malformed receipt blocks registration.

Authorization is unchanged: authenticated user, matching company, and the existing workflow actor check. The API facade is an invoker; the privileged implementation resides in the existing private schema. No table, role, RLS or schema usage grants change. Installing the migration itself changes no case/job rows. Its rollback removes only the new functions, preserving audit and legal evidence.

The client retains read-back recovery after ambiguous responses, never blindly retries a possibly committed write, and retains the previous RPC during staged deployment when PostgREST definitively reports the new function missing.

## Verification

- PostgreSQL/PGlite: external filing and cooperative stop suites, 24 tests passed, including atomic rollback, isolation, no duplicate events, real worker acknowledgement, stale active lock, conflicting receipt and late worker rejection.
- Vitest: service, transport and dialog suites, 30 tests passed; coverage includes automatic continuation, uncertain network response, bounded stop wait, retained dialog inputs and staged deployment fallback.
- Type check passed. Production build passed (1m 41s), with the existing large-chunk advisory.
- Live schema and original command/permissions inspected. No live button save was performed before migration approval.

## Activation

Applied `20260908063143_automatic_external_filing_handoff.sql` after explicit user approval. Live permission checks confirm authenticated access, no anonymous execution and an invoker public facade. The dialog records an already filed request; it does not create another Taqadi submission. Verify the case/job/audit after the UI approval before any retry.

## Live result

The approval dialog closed successfully and the case workflow displayed the user-supplied reference with status `awaiting_acceptance`. A company-scoped database read confirmed the reference/date, exactly one external filing attestation, and the previous uncertain task retired with `EXTERNAL_FILING_RECORDED` and no worker ownership. The worker decision log displayed the automatic handoff event. No separate stop action or second filing submission was used.

The task panel now describes this state as recorded filing with a closed worker task, hides its obsolete progress/error presentation, and removes restart/resume actions for the external handoff state. This distinguishes ending automation from cancelling the lawsuit. Type checking and the final production build (2m 5s) passed after the display correction. The success workflow and reference were verified in the live UI before that display-only correction; the subsequent page reload was slow while fetching case data.
