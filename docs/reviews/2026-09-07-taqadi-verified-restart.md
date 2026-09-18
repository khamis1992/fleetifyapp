# Verified restart after uncertain submission

Implemented for the lawsuit preparation page, including AGR-202504-417240 (`727a7b69-b2a8-43cc-9589-602da0d28001`). Its last observed job `c5d3dd10-6610-4f72-b3cd-6b7b8daa9179` remained `needs_human / SUBMISSION_UNCERTAIN`, attempt 2, with no stored result. No live restart or portal filing was executed during verification.

## Behavior

- The automation menu now offers **إعادة من البداية** for stopped submission-uncertain jobs.
- The dialog opens with an unchecked confirmation and empty review note. The operator must confirm that this specific portal request was not filed and has no reference, and record the review outcome. Known receipts or references direct the operator to record the existing filing.
- Current generated documents are rebuilt and a current memo snapshot is frozen if necessary. The server reuses the production package/source/identity validator and restarts at progress zero, retaining events and artifacts. Prior attempts remain in the audit record; the explicit verified restart resets the attempt counter.
- Authentication, company and contract permission, job version, worker activity, case stage, receipts, preparation references and competing jobs are checked before changing state. The job and case are locked. A lost response can be retried with the same request ID without submitting another restart. Validation errors roll back the uncertainty reset and all dependent writes.
- Existing cases can open the follow-up section even if readiness changes. Actual filing actions continue to require complete documents and valid identity checks.

## Database deployment

Applied in Supabase project `qwhunliohlkkahbspfiu`:

1. `verified_taqadi_restart_after_submission_check` (remote migration version `20260907163944`; local migration `20260907162136`).
2. `isolate_verified_taqadi_restart_implementation` (local migration `20260907164148`).

The public RPC is `SECURITY INVOKER`; its privileged implementation is in `taqadi_private` with an empty search path. Both deny anonymous and worker execution. Authenticated callers must pass the internal tenant and contract authorization checks. The existing ordinary restart guard also blocks the entire `SUBMISSION_UNCERTAIN*` family. Matching rollback scripts are included; reverse isolation first. Rollbacks retain audit events and never undo an actual filing.

Supabase's security advisor reported the public definer exposure on the initial command. After isolating the implementation, its final report had no findings for either new function. Other existing project findings remain outside this change. Privilege and function metadata were verified directly after deployment. See the official [database function security guidance](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker).

## Verification

- 24 Vitest tests passed: confirmation dialog (5), verified command adapter (10), existing menu (3), stop adapter (6).
- 19 PGlite database tests passed: verified restart (13) and cooperative stop (6). The restart suite executes the production restart implementation, exercises the public wrapper as `authenticated` without table grants, and verifies rollback and idempotency. The external package validator is stubbed at its boundary; source-link checks execute inside the production restart.
- Full TypeScript app/node checks passed. Production Vite build passed; final navigation adjustment also passed TypeScript. Existing large-chunk and OpenCV browser-externalization warnings remain.
- Browser verification on the actual contract: all 9 documents ready, 34,000 QAR claim; menu displayed portal, refresh and restart. The restart dialog rendered in RTL, with the submit control disabled until operator verification. No confirmation was supplied by the agent.
- Frontend changes are available on localhost; no Vercel deployment was performed.
