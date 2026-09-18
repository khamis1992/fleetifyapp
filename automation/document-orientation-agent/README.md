# Daily PDF orientation worker

Runs on Node 24 with the repository dependencies installed. PDF rasterization
and Tesseract OSD stay on the worker; no new third-party document processor is
used. It supports either a Windows workstation or a persistent Node server.

The shared `system_agent_controls` kill switch and policy enablement are checked
before runs and inside every saving transaction. On 2026-09-08 the user explicitly
approved this worker during the existing WhatsApp pause. Its policy contains an
exception bound to that exact company, pause reason and pause timestamp. A future
pause, disabling the policy/company, or a kill switch still stops this worker.
The company remains paused for all other agents; never globally unpause it to
run document correction.

Private configuration: `ORIENTATION_SUPABASE_URL` and
`ORIENTATION_SUPABASE_SERVICE_ROLE_KEY` in `.env.document-orientation-agent`.
Existing server configuration in `.env.taqadi-agent` is accepted as a fallback.
Never use a browser session or publish these secrets to the frontend.

```powershell
# Read-only inspection, local report; no document or DB writes
npx tsx automation/document-orientation-agent/index.ts --document-id <uuid>
# Governed application (requires enabled policy and an allowed pause state)
npx tsx automation/document-orientation-agent/index.ts --apply
# Daily at 03:00 Qatar time; catch up when the computer is available
powershell -File automation/document-orientation-agent/windows/install-daily.ps1
# Remove only this scheduled task
powershell -File automation/document-orientation-agent/windows/install-daily.ps1 -Uninstall
```

On Windows the user must be signed in and the machine must be awake/online.
`StartWhenAvailable` catches missed starts after the machine becomes available.
On a server, schedule the `--apply` command at `00:00 UTC` (03:00 Qatar) using
the hosting platform's scheduler. Supabase's Edge runtime alone does not provide
the native PDF rasterization and OCR worker used here.

Default budget: up to 500 documents or four hours per run, with one governed
15-minute lease and one mutation per document. Each page requires two OSD
readings at score >=20 and a verified upright render after correction. Low
confidence pages stay untouched, and human-reviewed versions are preserved.
Encrypted/digitally signed/oversized PDFs are retained for review. Errors retry
daily twice, then weekly; legal filing locks are rechecked daily. Successful
unchanged files reuse their stored result. The database stores per-document
status; the orientation editor displays its latest check and review pages.

Local summary: `.document-orientation-agent/latest-run.json` (gitignored).
Scheduled stdout/stderr: `.document-orientation-agent/daily.stdout.log` and
`daily.stderr.log`. Read scheduled task status with
`Get-ScheduledTaskInfo -TaskName 'Fleetify Daily Document Orientation'`.
On a machine crash, completed per-document results remain in Supabase and the
next run continues pending work. Writes use immutable source hashes and unique
request IDs, and all original/corrected files remain in the revision history.
