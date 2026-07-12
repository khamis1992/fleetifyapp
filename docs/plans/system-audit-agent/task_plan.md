# Task Plan: System-Wide Audit Agent

## Goal
Build a system-wide background audit agent that can detect and repair data-integrity problems across Fleetify while keeping every automated mutation auditable, reversible, company-scoped, and respectful of closed accounting periods.

## Phases
- [x] Phase 1: Analyze domains, mutation paths, and current safeguards
- [x] Phase 2: Validate the architecture and repair policy
- [x] Phase 3: Implement the repair registry, domain workers, and audit controls
- [x] Phase 4: Add focused tests and run dry-run verification
- [x] Phase 5: Deploy in controlled batches and verify persisted results

## Key Questions
1. Which system domains and invariants must the agent cover?
2. Which existing RPCs and triggers are the authoritative mutation paths?
3. How will repairs be rolled back and prevented from crossing company boundaries?
4. Which cases must remain approval-gated because they affect closed periods or legal records?

## Decisions Made
- Use comprehensive but reversible authority rather than unrestricted destructive access.
- Record before/after state and a correlation ID for every applied repair.
- Never bypass company isolation or closed-period controls.
- Preserve existing user changes in the dirty worktree.
- Prefer an orchestrator with domain workers and a registered repair-command catalog over a single expanding function.

## Errors Encountered
- Graphify CLI could not start because its Windows Python trampoline points to a missing interpreter. Used the existing graph JSON directly for read-only architecture discovery.
- Vitest could not load its configuration inside the filesystem sandbox (`Cannot read directory ../..`). It was rerun outside the sandbox and all 12 focused tests passed.
- The first temporary migration-history validation could not restore seven malformed historical markers because its filtered workdir omitted their files. Restored all seven immediately from the fetched-history workdir and verified them in the remote list.
- The repository migration history contains seven legacy non-standard versions that block normal `db push`. A fetched, filtered temporary workdir proves that only the two system-agent migrations are pending.

## Status
**Complete** - Orchestrator `2026-07-11.15` (`v10`) and worker `2026-07-11.13` (`v8`) are deployed and scheduled. The final seven-domain dry run completed all jobs with zero planned repairs and zero failures. LongCat persisted 30 triage decisions in a bounded one-batch production probe, and the status endpoint returned all 3,632 findings without truncation.
