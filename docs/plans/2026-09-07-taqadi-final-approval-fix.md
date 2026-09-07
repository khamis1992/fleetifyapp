# Taqadi final approval incident — 2026-09-07

## Findings

The user reported `[object Object]` after the worker stopped before final approval, and confirmed manually pressing approval for the first case.

- Contract `816f510c-5f0e-4508-acbe-447c388ecc59` (`LTO202429`), job `00c616d5-37d7-45cd-9637-3060c2843183`: portal review completed on 2026-09-06 at 22:21 UTC, but there was no `submitting` event. The persisted package/snapshot both carried QAR 47,500; the server calculator returned QAR 42,700. Three service invoices have one active same-contract, same-month, same-total schedule link; their outstanding amounts are 600, 2,100 and 2,100. The difference is exactly QAR 4,800. The approval gate rejects this mismatch before the portal click. Original error details were lost by `String(error)`, so this is a reproduced incompatible condition, not recovery of the historical error object.
- The first legal case was subsequently recorded as `awaiting_acceptance` with a portal reference at 22:24 UTC. Its historical failed queue row was preserved; no repeat submission was initiated.
- Contract `f2ecdec0-2038-45d3-92ac-3f3d455627bb` (`LTO202436`), job `4eec09fb-f2ce-465a-8d79-a939eb50bdc2`: initially had a stale August package. The current preparation shows QAR 50,800, while the server initially returned QAR 48,700. Its QAR 2,100 service invoice is linked to one matching installment.
- A portal artifact shows the real final control as a link named `إعتماد`; the worker only searched an unaccented button or longer text. Browser regression reproduces this mismatch.
- During this investigation a new attempt for the second job began on the still-running 1.8.0 worker with the refreshed QAR 50,800 package. It stopped at progress 54 (parties), amid Supabase gateway 522/525 errors recorded in worker logs. It did not reach final submission. Current legal stage remains `preparation` with no portal reference.

## Changes

- `error-details.ts` preserves allowlisted PostgREST message/code/details/hint fields without stringifying arbitrary objects. HTML gateway responses receive a concise connectivity message.
- The final approval RPC must confirm `approved`, the exact job, and the exact memo snapshot. Failures become a resumable internal-approval error with structured diagnostics.
- The worker validates the persisted package and current server claim before materializing documents/opening the portal, while retaining final revalidation.
- The portal selector recognizes both Arabic approval spellings and real button/link roles; confirmation remains single-click. A failed submission-progress write no longer implies that the portal button was clicked.
- Resuming a job that reached parties from the portal home requires the existing draft, rather than opening a replacement draft after a worker restart.
- Worker version 1.8.1 is installed and the existing supervisor was used to restart only the verified idle worker.
- Historical opaque/HTML errors now display a readable explanation in the preparation page without altering stored job history. Failed attempts that reached parties offer continuation of the existing draft; the restart action is hidden for those attempts.

## Database deployment

Applied `20260906223503_align_legal_claim_service_rent_classification.sql` to project `qwhunliohlkkahbspfiu`. It patches classification only in the existing read-only v3/v4 legal calculators. A service invoice requires exactly one active company-scoped link, matching contract, month and total. Penalty-linked/TV-prefixed invoices remain excluded. Invoice amounts, receipts, schedules, filed cases and frozen snapshots were not modified.

Original body hashes:

- v3: `4a27cf9dcd1bfd202ffb80834de3f1a9`
- v4: `36b78342a4ecc47adcdc6f9c5825f641`

Verified deployed hashes:

- v3: `5c5211093c5cd8d6fae58618cde44462`
- v4: `5ca5b12767113a97b0e841198b878357`

Both functions retain `SECURITY INVOKER` and their original ACLs. Matching rollback restores the captured original definitions only when the patched hashes match. Other pending canonical-claim migrations with old hash assumptions must be rebased/reviewed before deployment; they were not included in this repair.

Read-only production calls after deployment returned 47,500 and 50,800 respectively, matching the recorded/current preparation amounts.

Also applied the existing reviewed migration `20260903193636_revalidate_taqadi_evidence_on_requeue.sql` after discovering the frontend's `resume_taqadi_filing_job_v2` was absent in production. Verified its existing refresh, resume and evidence-guard prerequisites before applying. The invoker wrapper refreshes the package and resumes atomically, retains company/authentication and submission-reference restrictions, and validates evidence on requeue. Its matching rollback is in `supabase/rollbacks`. Read-only catalog verification confirmed the command and enabled trigger. No jobs were queued by this deployment.

## Verification and limits

- Final full worker suite: 25 files / 216 tests passed.
- Resume/evidence and historical preparation database regression suites: 29 tests passed. These test source linkage and atomicity; their separate full-payload validator is explicitly stubbed.
- Frontend resume command regression suite passed; full application `npm run type-check` passed after the final UI changes.
- Actual captured v3/v4 calculator bodies in PGlite: 24 tests passed, including both reported totals, partial payment, ambiguous links, company isolation, traffic exclusion, future invoices, manual exclusions, unchanged records, ACLs and rollback.
- `npx tsc -p tsconfig.taqadi.json`: passed.
- Current local preparation page reviewed; current total is 50,800, the worker is connected, the historical error has a readable explanation, and the enabled primary action is `متابعة من تقاضي`.
- This patch does not certify unrelated pending legal-engine changes or retroactively mark failed attempts successful. No final portal filing was performed as a test. The second existing portal draft must be reopened for live continuation after the interruption.
