# Daily orientation implementation and activation state

Implemented a portable Node 24 worker with PDF.js/native canvas and Tesseract
OSD. Two render-size readings must agree at score >=20; a third reading of the
rotated PDF must confirm upright orientation. Uncertain pages stay unchanged.
The worker preserves human-reviewed corrected files and current identity status.

Supabase deployed:
- `automatic_contract_document_orientation`, local version 20260907202529,
  remote version 20260907204120.
- `correct-contract-document-orientation`, version 2, ACTIVE, JWT verification on.
- Server-only automated RPC, governed per-document lease and one-mutation budget,
  machine provenance, immutable originals, source revisions/hashes, filing locks.
- Company-scoped scan result table; editor supports last-check and review-page status.

Validation:
- 16 PGlite transaction tests passed, including existing manual saves, machine
  authorization, expired leases, global pause, evidence disagreement, source
  conflicts, filing locks, human corrections and incremental scan selection.
- 19 Vitest tests passed (policy 4, PDF 10, editor 5).
- Real synthetic 4-page PDF corrected /Rotate 90/180/270 to 270/180/90 respectively;
  all corrected pages re-detected upright. Scores roughly 21.5–23.8.
- An earlier lower-confidence fixture correctly stayed unchanged; production
  thresholds were not lowered to force a correction.
- Full app/node type-check, standalone worker/Edge type-check and build:ci passed.
- Remote RLS enabled, authenticated writes/RPC execute denied, service execute allowed.
- Security advisors reported no orientation-specific finding.
- Read-only target document check skipped the human-corrected current version.
- Browser editor opened all seven pages and existing history without errors.
- No automatic document corrections were performed.

Historical state at the end of 2026-09-07 (superseded by
`2026-09-08-daily-orientation-activation.md`): activation was pending. The Windows installer was prepared for 03:00
Qatar time with StartWhenAvailable, but had not been installed. A permanent Node
server is another option; no server was provisioned. The user was asked which
hosting environment they prefer and has not yet answered.

Live `system_agent_controls` for this company is paused, since 2026-08-28, with
reason `whatsapp_number_banned_after_bulk_send_20260828`. This implementation
honors that pause. No control was unpaused and no exception was added. Enabling
the new worker must not accidentally restart the existing messaging agents.

The rollback disables the new policy/RPC while retaining machine audit history
and all preserved originals. The frontend was validated locally, not published
to Vercel in this task.
