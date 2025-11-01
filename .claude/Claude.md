# Claude Rules

## 0) Goals & Constraints
**Prime directive:** Improve the system safely, incrementally, and reversibly.  
Default to non-breaking changes; use feature flags/config for risky paths.

---

## 1) Discover & Plan
Read the codebase areas relevant to the request, plus `SYSTEM_REFERENCE.md` (update it if outdated).  
Produce a plan in `tasks/todo.md` with:

- Objective, assumptions, out-of-scope  
- Acceptance criteria (observable, verifiable)  
- Impact radius (files/modules touched)  
- Risks + mitigations (flags, fallbacks)

Post the plan for approval before coding.

---

## 2) Pre-Flight Safety Checks
- Typecheck, lint, and unit tests must pass on `main`  
- Build succeeds locally and in CI  
- `.env` and secrets are not hard-coded  
- Confirm correct environment (dev/stage/prod) and feature flag paths  
- If DB/migrations involved: create reversible migrations with down scripts and test on sandbox

---

## 3) Implementation Rules
- Use feature branches: `feat/<slug>` or `fix/<slug>`  
- Keep PRs small (≤ ~300 LOC diff if possible)  
- Apply simplest change that meets acceptance criteria  
- Add/adjust unit/integration/e2e tests  
- Keep secrets out of code  
- Gate risky logic behind flags/config

---

## 4) Commit & PR Hygiene
Follow **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).  
Each PR must include:

- What changed and why (+ screenshots/logs if UI)  
- Impact radius and risk level  
- Testing steps (commands/URLs)  
- Rollback plan (revert / disable flag / down migration)  
- Link to `tasks/todo.md` item(s)

---

## 5) Communication While Working
- After each meaningful step, post a short summary (what changed, why, result)  
- If acceptance criteria need refinement → pause and confirm before proceeding

---

## 6) Post-Work Review & Documentation
Append **Review** section to `tasks/todo.md`:
- What shipped vs. plan  
- Known limitations  
- Follow-ups  

Update `SYSTEM_REFERENCE.md` and READMEs:
- New flags/config  
- New endpoints/APIs  
- Schema diffs  
- Runbooks

---

## 7) Verification & Rollback
- Verify in target env (dev/stage/prod) using test steps  
- If anomalies occur → rollback immediately per plan, then investigate

---

## 8) MCP Usage Rules (Integration Layer)

**Purpose:** Enforce consistent MCP usage per task category in Cursor.

| Task Type | MCP Server | Purpose |
|------------|-------------|----------|
| Database operations (queries, migrations, schema, Supabase tasks) | `supabase mcp` | Execute and manage Supabase DB actions |
| Verification / inspection (files, URLs, browser validation) | `browser mcp` | Validate files, URLs, and external outputs |
| Service creation or modification (new features, APIs, logic) | `thinking mcp` | Perform structured reasoning and feature planning |

### Execution Order (if multiple MCPs needed)
1. `thinking mcp` → Planning and task breakdown  
2. `supabase mcp` → Execution and data operations  
3. `browser mcp` → Validation and verification  

**Fallback Rule:**  
If uncertain which MCP to use → default to `thinking mcp`.

**Large Tasks:**  
Split into smaller parallel segments handled by three agents:
- Agent 1 → Planning (`thinking mcp`)  
- Agent 2 → Execution (`supabase mcp`)  
- Agent 3 → Validation (`browser mcp`)

**UI Consistency:**  
All new features must maintain the same color scheme, button style, and layout as the existing system.

---

## tasks/todo.md Template

```markdown
# Task: <short title>

## Objective
<Outcome and business/user impact>

## Acceptance Criteria
- [ ] <criterion 1>  
- [ ] <criterion 2>

## Scope & Impact Radius
Modules/files likely touched: <list>  
Out-of-scope: <list>

## Risks & Mitigations
- Risk: <...> → Mitigation: <flag, fallback, canary>

## Steps
- [ ] Pre-flight: typecheck/lint/tests/build green  
- [ ] Design small change set (link to diff or plan)  
- [ ] Implement behind flag/config `<FLAG_NAME>`  
- [ ] Add/adjust tests  
- [ ] Update docs (`SYSTEM_REFERENCE.md`)  
- [ ] Open PR with test steps & rollback plan  
- [ ] Verify in <env> and unflag if stable

## Review (after merge)
Summary of changes:  
Known limitations:  
Follow-ups:
