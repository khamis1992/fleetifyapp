# Daily orientation activation

The user approved activating only the document orientation worker, scheduling
it on this workstation at 03:00 Qatar time, and running it immediately.

Activated:
- Windows task: `Fleetify Daily Document Orientation`, limited interactive user,
  hidden worker, overlapping task instances ignored, missed start catch-up,
  network required, six-hour execution limit.
- Started via Task Scheduler at 2026-09-08 07:28:36 +03:00.
- Verified task state Running and next start 2026-09-09 03:00:00 +03:00.
- Local activation migration 20260908042549; remote version 20260908042807.
- Local linked-contract selection fix 20260908043146; remote 20260908043304.

The company's global pause remains true, with unchanged timestamp
2026-08-28T15:37:06.279996Z and WhatsApp pause reason. The new worker's policy
contains a user-approved exception matching this exact company, pause timestamp
and reason. Kill switch, disabling the policy/company and any future pause still
stop it. No other policy or global control was enabled or changed.

The first live run exposed legacy signed uploads with null contract_id. These
failed inspection before a save and could not enter the per-contract result
table. Candidate selection now joins a same-company contract, with a matching
worker guard. Initial failed execution audit rows are retained. The already
running first batch may still contain its original candidate snapshot; later
selections and future runs use the corrected query.

Validation:
- 18 database tests passed, including exact pause authorization, future stops,
  case locks, provenance, incremental selection, unlinked documents and company scope.
- Worker TypeScript check passed; Task Scheduler exercised the actual hidden runner.
- Source/corrected SHA-256 and every PDF page rotation verified on live revision
  b2ea87c3-096b-490a-bed8-314aa47eff91. Its second page changed from upside down
  to upright; visually reviewed both renders. All seven PDF pages retained.
- No identity/evidence-state differences found for corrected documents.
- During verification: 38 documents recorded, 7 pages corrected across 4 PDFs,
  one active execution. The bulk scan remains running; these are interim counts.
- Sample contract for user inspection: C-ALF-0030, second page of signed PDF.

Scheduled stdout/stderr live in the gitignored `.document-orientation-agent`
directory. New runs also write incremental progress summaries, and the final
summary is `latest-run.json`. The computer must be running and the user signed
in; StartWhenAvailable catches a missed schedule once available.
