# Release Readiness Task Plan

## Goal
Prove that Fleetify is ready to launch as one integrated system, with special emphasis on financial correctness, database integrity, clean browser consoles, and consistent approved UI cards and colors.

## Evidence Gates
- [ ] TypeScript, lint, unit, integration, E2E, and production build gates pass.
- [ ] Contract -> invoice -> payment -> journal workflows are reconciled and tested.
- [ ] Financial reports agree with authoritative ledgers and closed-period rules.
- [ ] Cross-module ownership, company scoping, RLS, and role access are verified.
- [ ] Critical user journeys work on desktop and mobile without console/network errors.
- [ ] Repeated cards use the approved design tokens and layout conventions.
- [ ] Remaining audit findings are either repaired, explicitly accepted, or proven non-blocking.
- [ ] Rollback and deployment verification are documented for changed database behavior.

## Phases
- [x] Phase 1: Establish the current quality baseline and risk inventory.
- [ ] Phase 2: Audit and repair the financial integration chain.
- [ ] Phase 3: Audit cross-module integrations and database security/integrity.
- [ ] Phase 4: Audit and repair UI consistency and browser-console defects.
- [ ] Phase 5: Run launch journeys, regression suites, and completion audit.

## Current Focus
Phase 2: introduce a canonical payment-allocation ledger and repair the 697 imported PBC receipts; payment hardening, posting mappings, and the seven erroneous contract-health cancellations are now deployed and verified.

## Decisions
- Production readiness requires positive evidence for each gate; absence of an observed error is not sufficient.
- Financial stored totals are treated as derived data and must reconcile to invoices, completed receipts, and balanced journal entries.
- Existing user changes in the dirty worktree must be preserved.

## Errors Encountered
- Full lint gate fails with 5,053 warnings and zero ESLint errors because the script permits no warnings.
- Full Vitest gate currently has 56 failed files, 130 failed tests, and 5 unhandled errors.
- Initial Vitest/build attempts inside the sandbox could not read the config; rerunning with approved elevated filesystem access worked.
- The diagnostic process cannot write generated reports under `.codex`; generated evidence is written under `reports/` instead.
- Financial integrity and reconciliation gates fail on live data.

## Status
Active. No launch-readiness claim has been made.
