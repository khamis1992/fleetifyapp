# Agent Audit Remediation — Production Rollout Runbook

## Preconditions

- Obtain the explicit operational approval recorded in the task plan.
- Confirm no `system_agent_jobs` or Taqadi desktop filing job is actively writing.
- Do not paste or export any Vault/Graph secret into SQL output, logs, Git, or chat.
- Keep every matching rollback file available before starting.

## Stage 1 — Database controls and task bridges

Apply, in order:

1. `20260827093000_server_side_system_audit_review_task_sync.sql`
2. `20260827094000_system_audit_control_plane.sql`
3. `20260827095000_retire_overlapping_legacy_mutating_agents.sql`
4. `20260827096000_taqadi_human_review_task_bridge.sql`
5. `20260827096100_backfill_taqadi_human_review_tasks.sql`
6. `20260827099000_agent_operational_alerts_foundation.sql`
7. `20260827099100_schedule_agent_operational_alerts.sql`
8. `20260827100000_stagger_legacy_read_only_agent_schedules.sql`

Checkpoints:

- `daily-audit-agent` and `safe-auto-repair` are inactive.
- legal guard is `20 3 * * *`; nightly ops remains `30 2 * * *`.
- 15 Taqadi `needs_human` jobs have exactly one linked open task each.
- first review sync creates the expected current tasks; a stale task is only
  cancelled after absence from two distinct completed full runs.

## Stage 2 — System-audit Edge rollout

Deploy the canonical sources under these release slugs:

- `system-audit-dashboard`
- `system-audit-orchestrator-v14`
- `system-audit-worker-v12`

Checkpoints:

- dashboard reports versions `2026-08-27.3`, `2026-08-27.32`, and
  `2026-08-27.55` where applicable.
- pause prevents new claims, cancel cooperatively stops a claimed job, and the
  kill switch cancels queued/retry work and requests cancellation of running work.
- every control change creates an immutable `system_agent_control_events` row.

## Stage 3 — Shared-secret identity cutover

This stage is deliberately ordered to avoid a mixed old/new authentication
window:

1. Apply `20260827100500_pause_shared_secret_agents_for_identity_cutover.sql`.
2. Verify all seven listed cron jobs are inactive.
3. Deploy the hardened functions:
   - `violation-inbox-processor`
   - `nightly-ops-auditor`
   - `smart-contract-assigner`
   - `customer-duplicate-detector`
   - `contract-id-scanner`
   - `customer-proposal-ai-reviewer`
   - `contract-terms-scanner`
   - `safe-auto-repair` (kept unscheduled, but hardened for manual rollback)
4. Apply `20260827101000_agent_specific_invocation_identities.sql`.

Checkpoints:

- seven distinct `agent_secret_*` names exist in Vault without reading their values.
- active cron commands use `x-agent-id` and their matching Vault name; none
  reference `contract_scanner_secret`.
- a successful scheduled call produces one `agent_invocation_events` row.
- nightly contract terms scanning only creates proposals and never auto-applies.
- disable/pause/kill in `system_agent_controls` rejects all seven scheduled
  identities before they read or write business data.
- both contract scanner batches carry the explicit company id and return no
  candidates from another company.

If deployment fails between steps 1 and 4, leave the schedules paused. Use the
`27100500` rollback only after restoring the old Edge versions; never reactivate
old shared-secret schedules against hardened functions.

## Stage 4 — Traffic mail

Apply/deploy only after Microsoft Graph secrets are configured securely:

1. `20260814143000_add_moi_traffic_mail_ingest.sql`
2. `20260827097000_lock_traffic_mail_synchronization.sql`
3. deploy `ingest-traffic-mail`
4. verify manual `status`, then one manual `sync`
5. verify `invoke_traffic_mail_ingest_v2()` exists after the containment migration
6. only then schedule `*/15 * * * *` to call `public.invoke_traffic_mail_ingest_v2()`

Do not enable the scheduler if Graph configuration is missing or the manual
canary fails. Do not use the retired `MOI_MAIL_SECRET`/v1 invoker. First connection establishes a current watermark and intentionally
does not import historical mail.

## Final verification

- No active cron command contains a raw JWT or the legacy shared scanner secret.
- RLS/security advisors are re-run and new findings are triaged.
- No duplicate review/Taqadi/alert tasks exist for one logical key.
- No jobs remain `running` beyond their lease/heartbeat threshold.
- Observe two complete nightly cycles before considering deletion of old Edge
  release slugs. Deletion is a separate destructive approval.

## Stage 5 — Agent safety kernel and failure containment

Do not apply these files as ad-hoc SQL while leaving migration history out of
sync. First reconcile the repository/remote history with an exported inventory;
do not use a blind `migration repair`.

The content reconciliation is recorded in
`production-migration-reconciliation.md`. Re-run
`npm run agents:audit-migration-history` against a fresh isolated fetch before
deployment. The controlled dry-run must propose exactly these three migrations:

1. `20260827152147_integrity_guard_pack.sql`
2. `20260827204249_agent_safety_kernel.sql`
3. `20260828113000_agent_failure_containment_and_escalation.sql`

1. Pause the mutating agent schedules and confirm no Taqadi filing is active.
2. Apply the three-file manifest above through the controlled migration path.
3. Deploy every function that imports `_shared/agent.ts`, plus
   `missing-contract-pdf-agent`, `upload-missing-contract-pdf`,
   `legal-notice-agent`, `smart-contract-assigner`, `contract-id-scanner`, and
   the retired `safe-auto-repair` endpoint.
4. Run `npm run agents:verify-safety`. Do not resume schedules unless the JSON
   result is `ready: true` and the anonymous inventory RPC check is denied.
5. Run one company-scoped canary for each mutating agent, confirm its execution
   ledger and postcondition, then resume staggered schedules.

Rollback requires the matching rollback file for stage 5 and the previously
deployed Edge versions. If any schema/ACL/data check fails, keep schedules paused
and do not attempt a partial manual patch in production.
