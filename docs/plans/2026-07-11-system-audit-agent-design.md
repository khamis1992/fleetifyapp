# System-Wide Audit Agent Design

## Architecture

The system uses a small orchestrator and seven specialized domain workers: contracts, accounting, fleet, customers, inventory, legal, and employees. The orchestrator creates a run, adds one resumable job per selected company and domain, and dispatches bounded worker batches. It never edits business records. Each worker reads only its company-scoped slice, evaluates explicit invariants, and creates typed findings with evidence, confidence, severity, and a registered repair command. Jobs retain their cursor, attempt count, lease, and heartbeat so an interrupted run can continue without repeating completed work.

## Repair And AI Boundary

Workers cannot issue arbitrary mutation queries. Repairs go through a server-side command registry implemented as privileged transactional database functions. Each command verifies the run, job, company, entity, optimistic before-state, and accounting-period status. The transaction records the before and after states and rollback metadata together with the mutation. The AI layer uses LongCat to prioritize or classify ambiguous findings and may choose only from commands already attached to those findings. It cannot invent SQL, add a new command, cross company boundaries, open a closed period, hard-delete records, or modify protected legal identity fields. Low-confidence, irreversible, closed-period, and legal-evidence cases remain approval-gated.

## Failure Handling And Verification

Workers claim jobs with short leases, send heartbeats, and release or retry failed batches with bounded backoff. One domain failure does not stop the other domains. Repeated failures are preserved with their error text and create an alert. Run totals are derived from jobs and findings rather than trusted from an AI response. Rollback uses the saved before-state only when the entity still matches the repair's after-state, preventing an old rollback from overwriting newer user work. Verification includes TypeScript checks, SQL static validation, dry-run execution, targeted apply on known records, persisted-state rereads, rollback tests, company-isolation tests, closed-period tests, and bounded production rollout.

## Deployment Result

The production deployment uses orchestrator `2026-07-11.15` (`v10`) with worker `2026-07-11.13` (`v8`). It is scoped to the primary company and runs daily at 00:30 UTC. Resume-only recovery runs every five minutes during the overnight processing window and hourly afterward; it cannot create an early run and dispatches jobs only from the matching run. A final seven-domain dry run completed with zero automatic repair plans and zero failures. LongCat triage is bounded to 30 review findings per eligible batch, disables extended thinking, caps output, strips identifiers from evidence, and cannot execute a repair command. Status reads paginate findings so monitoring totals are not truncated by the API row limit.
