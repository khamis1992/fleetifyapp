# Taqadi reliability and latency implementation

Approved by the user's instruction to implement the 2026-09-06 review.

- Keep portal party order, review gates, and single final submission unchanged.
- Persist a verified receipt in an atomic local outbox restricted to the workstation user. Replay completion before stale-job recovery or claiming another job. Retry transport errors with backoff; retain conflicts for verification. Never replay browser submission from the outbox.
- Keep database completion atomic and idempotent, validate receipt identity/reference, and move the case to awaiting acceptance. Supply a matching rollback and execute behavior tests on isolated PGlite before publishing the function.
- Poll final confirmation/receipt readiness within a deadline. Confirm only once, ignore old page labels, and require a usable receipt reference.
- Refresh all dependent React Query data for an already-completed job, independently from toast transition detection.
- Prepare at most two documents concurrently with source-version cache keys, keep portal uploads sequential, remove redundant verified observations, and record timing without blocking portal steps.
- Verify outage/lost-response/restart behavior, delayed receipt/confirmation, conflicting receipts, closed/reopened UI, source cache invalidation, and bounded parallelism. Run type checking and build; activate the worker only when no filing is in flight.

## Implementation and activation

Implemented and activated on 2026-09-06. Local worker `legal-office-1` reports
version **1.8.0**, idle, no current job and no last error. The queue was empty
before restart. No lawsuit was submitted as a test.

Applied to Supabase project `qwhunliohlkkahbspfiu`:

- `20260906064806_advance_completed_taqadi_filing_to_awaiting_acceptance.sql`
- `20260906064817_reliable_taqadi_receipt_completion.sql`

Local migration and rollback filenames were aligned with the versions assigned
by Supabase on deployment. The first migration was previously the unpublished
`20260903062009` candidate. Roll back the reliable completion migration first,
then the awaiting-acceptance migration if required; neither rollback deletes
filing evidence. Live introspection verified the receipt identity guard, the
awaiting-acceptance transition, and execution restricted to `service_role`.

Verification: 38 focused tests, 61 existing portal browser tests, 4 document
materialization tests, 8 isolated SQL behavior tests, 4 migration checks, full application type check,
worker type check (`npx tsc -p tsconfig.taqadi.json`), and production build passed.
Repeated receipt tests also pass with draft-save notifications explicitly rejected.
Build emitted the existing bundle-size and optional-library warnings.
The actual lawsuit page displays the worker as connected. The production preview
loads its login page with no browser errors; authenticated completion behavior is
covered by the React Query test and the isolated SQL/browser tests above.

The source changes are available in the localhost application. The website on
Vercel was not deployed as part of this local-agent change. Real portal latency
has not been measured after activation; timing events now separate preparation,
authentication and portal actions to support comparison on subsequent filings.

Saved receipts live in `TAQADI_AGENT_DATA_DIR/receipt-outbox` (default
`.taqadi-agent/receipt-outbox`), restricted to the workstation account and SYSTEM
on Windows. A pending receipt blocks new claims and is replayed before stale-job
recovery. Transport outages retry with bounded backoff. Lock/identity/reference
conflicts retain the evidence for verification; never clear the receipt or restart
the browser filing to resolve such a conflict. Receipts found in an existing
browser page without a matching contract are referred for human verification.
