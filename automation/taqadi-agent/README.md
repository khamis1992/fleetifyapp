# Taqadi Automation Agent

This Windows-side worker files prepared Fleetify legal cases in Taqadi using a
persistent Chrome profile and Playwright. Fleetify and the worker communicate
only through the durable Supabase queue, so closing or refreshing the ERP page
does not lose a filing job.

## Adaptive portal understanding

The worker does not trust its saved step after clicking a portal control.
Every cycle observes the visible URL, headings, active tab, dialogs, controls,
and validation messages; scores all known Taqadi stages; runs one bounded
action; and observes the portal again to verify the expected transition.

When the page is ambiguous or Taqadi rejects a transition, the worker stops
with the evidence it found and creates a resumable human handoff. Observation
details never contain field values, only control identities and `hasValue`
flags. Existing party and document handlers remain idempotent so resuming does
not intentionally create duplicate rows.

Version 1.1 adds three guarantees learned from live filing traces:

- The authenticated `/itc/home` route is a first-class state. During a safe
  pre-submission resume, the worker opens the create-case SPA route instead of
  stopping with an unknown-page message.
- Page identity must remain stable across consecutive DOM observations. The
  selected wizard percentage/step and visible content pane outrank labels from
  hidden panes and permanent navigation.
- Party fields are read only from the currently visible dialog. Hidden old
  dialogs may reuse the same input ids, but can no longer be mistaken for the
  defendant. Grid and dialog readiness also replace fixed ten-second sleeps.

Version 1.2 hardens the authentication boundary:

- NAS callbacks and account-selection prompts are intermediate states, never
  proof that the Taqadi session is authenticated.
- A filing starts only after the worker verifies the `/itc/home` shell. If the
  portal redirects back to `/itc/login`, the worker reports a login problem
  instead of searching that page for case-management menus.
- New cases use the verified SPA create route first. The documented
  case-management menu is an authenticated fallback only, and every path must
  end with visible classification controls before the workflow proceeds.

## Setup

1. Apply migration `20260728120000_taqadi_filing_automation.sql`.
2. Copy `.env.taqadi-agent.example` to `.env.taqadi-agent`.
3. Set the Supabase URL and **service-role key** only on the worker computer.
   When the repository's local `.env` already contains
   `SUPABASE_SERVICE_ROLE_KEY`, the worker reuses it without duplicating the key.
4. Complete the representative contact fields.
5. On Windows, run `npm run taqadi:agent:credentials` once. The username and
   password are stored with Windows DPAPI under `.taqadi-agent`, not in Git or
   the environment file.
6. Run `npm run taqadi:agent`.
7. The worker opens the Tawtheeq card, fills the encrypted credentials, and
   waits only when reCAPTCHA or another human verification is shown. After the
   operator completes that verification, the worker clicks Continue itself.
8. If Taqadi displays the account prompt after login, the worker confirms it
   with Enter without opening or changing the account dropdown.

The Chrome session is stored under `.taqadi-agent/chrome-profile`. Do not share
that folder or commit it to source control.

## Start automatically with Windows

The browser agent must run in the signed-in Windows user's interactive session
so Chrome can be shown when Taqadi requires authentication. Install the
scheduled task once:

```powershell
npm run taqadi:agent:autostart:install
```

The task starts after that Windows user signs in, starts immediately during
installation, ignores duplicate instances, and restarts the agent after an
unexpected exit. It keeps local logs for 30 days in
`.taqadi-agent/logs`.

Check or remove it with:

```powershell
npm run taqadi:agent:autostart:status
npm run taqadi:agent:autostart:uninstall
```

## Start button in the ERP

When the worker is offline, the lawsuit preparation and batch filing pages show
a "تشغيل الوكيل الآن" button. The button opens the custom URL protocol
`fleetify-taqadi://start`, which Windows resolves on the worker computer and
runs `windows/start-agent.ps1` — that starts the scheduled task (or the
supervisor script directly if the task is missing). Register the protocol once
on each worker computer (HKCU only, no admin rights):

```powershell
npm run taqadi:agent:launcher:install
npm run taqadi:agent:launcher:uninstall
```

The button works only from a browser running on the worker computer itself;
from any other device nothing happens. `npm run taqadi:agent:start` triggers
the same start path manually from a terminal.

After a computer restart, sign in to Windows normally. The agent connects
without opening a terminal. Chrome opens only when a filing requires portal
interaction or a fresh Taqadi login.

## Watchdog (self-healing)

Logon kills and unexpected session ends can stop the supervisor silently.
Install the watchdog once on the worker computer; it runs
`start-agent.ps1` every 5 minutes and only acts when the agent health
endpoint is down:

```powershell
npm run taqadi:agent:watchdog:install
npm run taqadi:agent:watchdog:uninstall
```

With the watchdog installed the agent restarts automatically within minutes
of any unexpected stop, and the ERP start button becomes only a backup.

## Safety behavior

- The worker handles one case at a time.
- Page navigation uses «التالي» only — the worker never clicks «حفظ ومتابعة».
  The single page-level «حفظ» happens exactly once on the parties page
  (`savePartiesDraft`): it pins the case draft and enables the parties grid,
  then party registration starts. Each party record is still saved from its
  own dialog's «حفظ» button.
- Every filing has a database idempotency key.
- It adds the company and defendant first, then opens and saves the
  representative record last. This order avoids the intermittent rejection
  observed when Taqadi edits the representative before adding the other
  parties.
- Company order is 1, representative order is 2, and defendant order is 3.
- The defendant email is always `khamis-1992@hotmail.com` and the address is
  always `الدوحة قطر`.
- An 11-digit foreign passport identifier is entered as `رخصة مقيم`, and
  nationality adjectives are mapped to the country names used by Taqadi.
- Every attachment is normalized to an A4 PDF before upload.
- Uploads are bound only to visible document slots and each selected file is
  verified before continuing.
- The final review must contain the case title, defendant, contract number,
  and exact claim amount.
- Final approval is automatic when all three approval flags are true.
- A temporary `The requested URL was rejected` response is retried from the
  beginning before final submission.
- CAPTCHA, expired login, changed portal fields, and mismatched review data stop
  the case with `needs_human`. The worker can fill Tawtheeq credentials but
  never attempts to solve or bypass reCAPTCHA.

## Level 2 — verified self-healing and navigation advisor

When an API key is configured (`TAQADI_HEALER_API_KEY` or
`ANTHROPIC_API_KEY`), two LLM helpers assist the deterministic pipeline, each
gated by deterministic verification — never by model confidence alone:

- **Selector auto-heal**: a failed field lookup still produces a
  `heal_proposal` artifact. If the suggestion is high-confidence AND the
  proposed control verifiably exists on the live page (visible, enabled,
  matched by control id or normalized Arabic label), it is applied as a
  **session-only override** and the pipeline resumes from the live page
  position (never through a new draft). Session overrides are never written
  to disk — permanent ratification still happens by hand in
  `selector-overrides.json`. One auto-heal retry per job; a second failure
  returns to `needs_human`.
- **Navigation advisor**: when the perception loop cannot classify the page
  at all (`unknown`), the advisor may click ONE visible button/link whose
  text matches exactly, is high-confidence, and is not on the deterministic
  deny-list (approval, submission, deletion, payment). At most
  `TAQADI_ADVISOR_MAX_CLICKS` (default 2) advisor clicks per job.

Both actions are logged as job events (`auto_heal_applied`,
`auto_heal_rejected`, `advisor_navigation`, `advisor_rejected`) so the ERP
panel shows exactly what the agent decided and why. Final approval, party
ordering, and claim-amount checks stay fully deterministic.
- An error after clicking final approval is never retried automatically. The
  operator must verify Taqadi first to avoid a duplicate lawsuit.
- After an unexpected Windows restart, stale work before submission is safely
  returned to the queue. A task interrupted during final submission is never
  retried and is marked for human verification.

Set `TAQADI_STOP_AFTER_PARTIES=true` only for diagnostics. Production must use
`TAQADI_STOP_AFTER_PARTIES=false` and `TAQADI_FINAL_APPROVAL=true`.

Full Playwright screenshots and DOM snapshots are disabled during normal jobs
to avoid slowing every browser action and generating very large trace files.
Set `TAQADI_TRACE_SNAPSHOTS=true` temporarily only when diagnosing a portal
regression; failure screenshots and the current accessibility snapshot remain
available while it is disabled.

## Canary check

`npm run taqadi:agent:canary` queues a dry-run that clones the most recently
filed job, marks it `canary`, and walks Taqadi up to the parties page without
approving anything. It ends as `cancelled` with step `canary_passed` on
success, so a canary can never be mistaken for a real lawsuit. If Taqadi
changed its UI, the canary fails first and uploads a Playwright trace plus a
heal-proposal snapshot for review.

Schedule it daily on the worker computer (07:00 example):

```powershell
schtasks /Create /TN "TaqadiCanary" /SC DAILY /ST 07:00 /TR "cmd /c cd /d C:\Users\khamis\Documents\fleetifyapp && npm run taqadi:agent:canary"
```

Only one canary is created per day (idempotency key `taqadi:canary:<date>`),
and it is skipped automatically while a real filing is active on the same
case.

## Failure diagnostics

Every job records a Playwright trace (screenshots + DOM snapshots). When a job
ends in `needs_human` or `failed`, the worker uploads `trace.zip` as an
artifact — open it with `npx playwright show-trace trace.zip` to replay
exactly what the agent saw. Unexpected failures also upload a
`heal_proposal` JSON artifact containing the page URL and accessibility tree,
so a reviewer (or an LLM assistant) can propose updated selectors without
re-running the filing. Successful jobs discard their trace.

## Selector healing (propose mode)

When Taqadi renames or moves a form field, the worker stops with
`TAQADI_UI_CHANGED` and uploads a `heal_proposal` artifact containing the
page's accessibility snapshot. If `TAQADI_HEALER_API_KEY` (or
`ANTHROPIC_API_KEY`) is set, the worker also asks Claude
(`TAQADI_HEALER_MODEL`, default `claude-opus-4-8`) to read that snapshot and
suggest the field's new label and control id. The suggestion appears in the
ERP panel and inside the artifact.

**The worker never applies a suggestion automatically.** To ratify one, review
the proposal and copy its `overridesEntry` into
`.taqadi-agent/selector-overrides.json` on the worker computer:

```json
{
  "fields": {
    "رقم السجل التجاري": {
      "labels": ["رقم السجل التجاري الجديد"],
      "controlIds": ["officialRegistrationNumber"]
    }
  }
}
```

Overrides only add lookup candidates — the original labels keep working — and
the file is re-read automatically, so no worker restart is needed. Healing is
never attempted after final approval has started, and leaving the API key
unset disables the LLM step entirely (the snapshot artifact is still
recorded).

## Health check

`http://127.0.0.1:4317/health`

The ERP reads worker heartbeat from Supabase, not from this local endpoint.
