# Explicit reporting cutoff locks

Migration `20260918003000_financial_reporting_period_locks.sql` depends on the authorization and actor-name helpers from `20260918001000_professional_balance_sheets.sql`. The live schema, accounting-period constraints and journal triggers were inspected read-only before implementation. This feature was built and tested locally; installing it does not create or close any period and does not alter ledger entries.

An authorized user explicitly locks dates through an inclusive cutoff. The command requires `balance_sheet_private.has_access(company, 'approve')`, which also requires current company scope, active profile, report view access, and no overriding permission or system-access denial. The reason must contain 20–4000 trimmed characters. The cutoff must be a finite date between 0001-01-01 and today in Asia/Qatar. Report approval never calls this command automatically.

The lock creates one managed cumulative row in the existing `accounting_periods` table, with the range 0001-01-01 through the selected date and status `locked`. State and history are held separately from financial amounts. Extending the cutoff retains the same managed period and records another event. Reducing a cutoff requires an explicit unlock first. Unlocking changes only this managed row to `open`; ordinary periods previously marked `closed` or `locked` remain protected.

## API contract

- `list_financial_reporting_period_locks_v1(p_company uuid)` returns `{ company_id, managed_lock, other_closed_periods, history, can_manage }`. `managed_lock` is null when no managed cutoff has ever been set. Ordinary closed periods are returned without a row limit. History returns the latest 100 events; the database retains all events.
- `lock_financial_reporting_period_v1(p_company uuid, p_locked_through date, p_reason text)` returns the current managed lock record.
- `unlock_financial_reporting_period_v1(p_company uuid, p_reason text)` returns the same record with status `unlocked`.

Managed record fields are `id`, `company_id`, `accounting_period_id`, `locked_through`, `status` (`locked` or `unlocked`), `changed_by`, `changed_by_name`, `changed_at`, and `reason`. An unlocked record retains its previous cutoff for history; it does not imply that those dates are now unrestricted by other periods.

History fields are `id`, `lock_id`, `company_id`, `action` (`locked` or `unlocked`), `locked_through`, `actor_id`, `actor_name`, `reason`, and `created_at`. All financial-period mutations require a fresh authorized RPC call; clients cannot write state, history, or the private transaction capability. The private capability prevents older SECURITY DEFINER reopening functions from changing the managed period. User-settable financial bypass settings do not bypass the new ledger guards. Audit events cannot be updated, deleted or truncated.

## Enforcement and concurrency

Guards cover header and line insertion, deletion, and accounting changes. Header checks examine both the old and new company/date. Moving a line checks both parent entries and locks those parents while validating their dates. Status, amount, accounting date, company, references (including `reference_type` used by closing reports), reversal links, and accounting dimensions cannot change within a closed period. Draft entries are protected too.

Description/review-note updates do not introduce additional period restrictions. Existing posted-line immutability and other pre-existing accounting checks continue to apply independently. A later-dated adjusting entry remains possible, but a workflow that also changes accounting fields on an older locked entry requires authorized reopening. The cutoff is a posting guard, not a freeze of chart classification, disclosure text or other report inputs; saved-report source verification remains necessary.

Period mutations take SHARE locks on `journal_entries`, then `journal_entry_lines`. These conflict with source writers and last until commit. Commands also take a company advisory transaction lock to serialize first creation and later changes. Guard queries see newly committed period status under READ COMMITTED. Accounting writes and lock/unlock commands under REPEATABLE READ or SERIALIZABLE fail with SQLSTATE `40001`, rather than trusting an older snapshot. PostgreSQL treats READ UNCOMMITTED as READ COMMITTED. Lock commands and parent checks have a five-second lock timeout; a timeout rolls back the command and its audit changes. Ordinary accounting-period boundary/status mutations use the same ledger table-lock ordering.

## Verification and rollback

`node --test tests/database/financial-reporting-period-locks.test.mjs` runs 13 isolated synthetic SQL tests against the real migrations and canonical authorization helper. They cover cutoff/reason validation, tenant isolation, permissions, old/new dates and companies, line movements, bypass rejection, protected state/history, harmless metadata, preserved existing closed periods and rollback.

Set `FINANCIAL_PERIOD_NATIVE_CONCURRENCY=1` to add the native PostgreSQL race test. The test helper creates a new temporary cluster under the workspace, accepts no external database URL, and removes only its verified temporary directory. It proves that first lock creation waits for an earlier writer and that a writer queued during cutoff extension is rejected after the extension commits.

The matching operational rollback revokes lock/unlock commands while preserving read access, existing managed periods, all state/history, and ledger enforcement. It never reopens accounting dates implicitly. Restore command grants through a reviewed forward migration when re-enabling the feature. No live cutoff was locked or unlocked during development.
