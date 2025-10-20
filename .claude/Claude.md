Claude rules

0) Goals & Constraints

Prime directive: Improve the system safely, incrementally, and reversibly.

Default to non-breaking changes; use feature flags/config for risky paths.

1) Discover & Plan

Read the codebase areas relevant to the request, plus SYSTEM_REFERENCE.md (update it if outdated).

Produce a plan in tasks/todo.md with:

Objective, assumptions, out-of-scope.

Acceptance criteria (observable, verifiable).

Impact radius (files/modules touched).

Risks + mitigations (flags, fallbacks).

Post the plan for approval (do not start coding until I confirm).

2) Pre-Flight Safety Checks (must pass before coding)

typecheck, lint, and unit tests green on the current main branch.

Build succeeds locally/CI.

Verify **.env/secrets are not hardcoded; confirm envs (dev/stage/prod) and feature flag path.

If DB/migrations involved: create a reversible migration with down scripts and test on a sandbox.

3) Implementation Rules

Work on a feature branch: feat/<short-slug> or fix/<short-slug>.

Prefer small, composable PRs (≤ ~300 LOC diff if possible).

Each change should be the simplest that meets the acceptance criteria.

Add/adjust tests (unit/integration/e2e as appropriate).

Keep secrets out of code; use env/parameter stores.

Gate risky behavior behind feature flags or config.

4) Commit & PR Hygiene

Conventional commits (feat: …, fix: …, chore: …, docs: …, refactor: …, test: …).

PR must include:

What changed & why, screenshots or logs if UI/CLI.

Impact radius & risk level.

How to test (exact commands/URLs).

Rollback plan (revert commit / disable flag / down migration).

Link to tasks/todo.md item(s).

5) Communication While Working

After each meaningful step, post a high-level summary: what changed, why, and result (tests/build).

If acceptance criteria need refinement, pause and ask before proceeding.

6) Post-Work Review & Documentation

Append a Review section to tasks/todo.md:

What shipped vs. plan, known limitations, follow-ups.

Update SYSTEM_REFERENCE.md and any module READMEs:

New flags/config, new endpoints/APIs, schema diffs, runbooks.

7) Verification & Rollback

Verify in the target env (dev/stage/prod) using the PR’s How to test steps.

If anomalies occur, roll back immediately per the PR rollback plan, then investigate.

tasks/todo.md Template (use this each task)
# Task: <short title>
## Objective
<What outcome we want, business/user impact>

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

## Scope & Impact Radius
Modules/files likely touched: <list>
Out-of-scope: <list>

## Risks & Mitigations
- Risk: <...> → Mitigation: <flag, fallback, canary>

## Steps
- [ ] Pre-flight: typecheck/lint/tests/build green on main
- [ ] Design small change set (link to diff or plan)
- [ ] Implement behind flag/config `<FLAG_NAME>`
- [ ] Add/adjust tests
- [ ] Update docs (SYSTEM_REFERENCE.md)
- [ ] Open PR with test steps & rollback plan
- [ ] Verify in <env> and unflag if stable

## Review (fill after merge)
Summary of changes:
Known limitations:
Follow-ups:

PR Checklist (paste into PR)

 Conventional commit title & clear description

 Acceptance criteria met & demonstrated

 Tests added/updated and passing

 Build passes in CI

 Feature flag or non-breaking path

 Rollback plan included

 Docs updated (SYSTEM_REFERENCE.md)

Suggested Commit Message Style
feat: add X behind FLAG_X; update docs and tests

- Implements <short summary>
- Guarded by FLAG_X (default off)
- Adds tests in <paths>
- Updates SYSTEM_REFERENCE.md with <section>

Refs: tasks/todo.md#<slug>

please note there is a documentation for the system in this path fleetifyapp-3\.qoder\repowiki\en\content


if the task are big allways break them into smaller tasks and devide them into 3 agaentsto work on them on the same time