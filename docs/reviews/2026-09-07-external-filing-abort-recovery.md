# External legal filing: interrupted response and manual-stop handoff

## Confirmed findings

- The reported dialog called `record_external_legal_filing_v1` through the global
  Supabase fetch wrapper's default ten-second timeout and one automatic retry.
  The browser recorded both timeout attempts and surfaced the raw AbortError.
- The reported case `CASE-26-0051` (contract `C-ALF-0042`) still had stage
  `preparation`, with no filing reference or date. A lost acknowledgement must
  never be interpreted as either a confirmed save or a confirmed failure.
- The associated job was `needs_human / manual_stop / MANUALLY_STOPPED`, but kept
  its worker ownership. The external-filing guard rejected every human pause,
  including this acknowledged stop. The cancellation command also returned early
  for this state, leaving no usable handoff to manual filing.
- Background React Query invalidations and a second seven-query workflow refresh
  were awaited as part of saving. A slow or failed refresh could prolong or
  misrepresent an already successful command.

## Implemented behavior

- External filing gets a bounded sixty-second transport window and no HTTP or
  React Query mutation retries. On an ambiguous response it performs a fresh
  company/case-scoped read and checks the exact reference, date and saved stage.
- The Arabic dialog preserves the entered evidence on uncertainty and provides
  a read-only **التحقق من التسجيل** action. An explicit same-input retry is
  available only after a successful read of a case that still allows recording.
  Database row locking and the existing idempotency guard prevent duplicate audit
  entries. Conflicting references/stages cannot be treated as successful saves.
- Saved results immediately update workflow cache; list refreshes run in the
  background. A refresh error is reported as a display refresh issue after saving.
- Migration `20260907183505` releases worker ownership on acknowledged stops and
  permits external filing for the exact confirmed manual-stop state. It repairs
  earlier stale ownership only when a matching stopped event exists, recording a
  separate repair event. Active jobs and uncertain submissions remain blocked.

## Verification

- 13 service tests: lost/empty responses, thrown network failures, exact evidence,
  company/case mismatch, unsuccessful verification and real validation errors.
- 6 transport tests: existing queue behavior plus slow filing, bounded timeout
  and no gateway-error replay.
- 5 component tests: input preservation, read-only recovery, explicit retry and
  successful saves despite pending/failed background refreshes.
- 10 PGlite database tests: authorization, atomicity, idempotency, active-job
  guards, acknowledgement handoff, late-worker-write rejection and rollback.
- `npm run type-check` and `npm run build:ci` passed. Build retains the existing
  large-chunk advisory.
- Applied the migration to the configured project. Read-back confirmed null
  ownership and one repair event for the reported job. The case itself remains
  unfiled in Fleetify; no filing command was executed as a production test.
- Tested the new read-only button in the user's browser with the previously
  entered evidence: it correctly reported no recorded filing and enabled the
  manual approval button. The values remain in the dialog for user review.

## Security review

Function grants were checked live: the stop acknowledgement remains invoker and
service-role only; external filing retains its existing authenticated definer
entry point with company/actor validation and no anonymous execution. The advisor
reports that existing authenticated definer exposure; it is intentional for this
audited command and was not broadened by the migration. Reference:
[Supabase authenticated function exposure check](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

The rollback deliberately retains released ownership and legal audit evidence.
It does not attempt to reopen stopped browser actions or reverse a real filing.
