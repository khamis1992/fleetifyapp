# Fleetify — Repo Analysis, Cleanup, and UX Improvement Plan

> **Status:** SAVED — not yet executed. Continue on user request.
> **Saved at:** 2026-06-17
> **Repo:** `C:\Users\khamis\Documents\fleetifyapp`

---

## Goal

1. تحليل الريبو كامل (full repository analysis).
2. ترتيب الريبو وإزالة الملفات الميتة/الغير مستخدمة (repo cleanup & reorganization).
3. تحليل النظام كامل (full system analysis).
4. تقديم مقترحات لتحسين تجربة المستخدم (UX improvement proposals).

---

## Phase 1: Full Repository Analysis

**Objectives:**
- Build complete mental model of the Fleetify codebase.
- Identify languages, file counts, architecture, entry points, layers.
- Detect dependency graph, circular dependencies, hub files, orphans.
- Map tests to source files and estimate coverage.
- Highlight duplicate/outdated code patterns.

**Tools:**
- `repo-intelligence` skill: `understand_codebase()`, `build_dependency_graph()`, `map_tests_to_source()`, `pack_context()`.
- `search_files` for specific patterns.
- `read_file` for key configs: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/routes/index.ts`, `src/App.tsx`, `src/integrations/supabase/types.ts`.

**Deliverable:** Repository intelligence report (architecture, dead-file candidates, dependency issues, test gaps).

---

## Phase 2: Repo Cleanup & Reorganization

**Objectives:**
- Remove or archive genuinely dead/orphaned files (not imported anywhere).
- Consolidate duplicated components/pages.
- Fix barrel `index.ts` files after deletions.
- Reorganize domain folders if needed (components, hooks, pages, utils).
- Ensure build and type-check still pass after each cleanup batch.

**Approach (per `repo-intelligence` cleanup rules):**
1. Detect orphans via import graph.
2. Archive (don't delete first): move dead scripts/reports/screenshots/PDFs/old markdown to `.archive/`.
3. Delete only provably duplicated component/page files not referenced by anyone.
4. Fix barrel files immediately.
5. Re-run `npm run build:ci` and `npm run type-check` after every batch.
6. Triage ESLint parse errors if exposed by cleanup.

**Deliverable:** Cleaner repo structure, `.archive/` with moved files, passing build.

---

## Phase 3: Full System Analysis

**Objectives:**
- Map the complete ERP system modules: contracts, customers, fleet, finance, legal, admin, dashboard.
- Review route registry, auth/roles, company multi-tenancy, Supabase schema integration.
- Audit financial module correctness (chart of accounts, journal entries naming per `DATABASE_REFERENCE.md` and `CLAUDE.md`).
- Review data flow with React Query, contexts, providers.
- Check mobile/Capacitor readiness and RTL/i18n implementation.
- Run production-readiness audit.

**Tools:**
- `production-readiness-audit` skill.
- Review route registry, provider tree, key pages.
- Inspect `DATABASE_REFERENCE.md` and schema types.
- Run `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:ci`.

**Deliverable:** System analysis report with risk areas, correctness issues, performance bottlenecks, security gaps.

---

## Phase 4: UX Improvement Proposals

**Objectives:**
- Identify UX pain points across key workflows.
- Propose prioritized UX enhancements.
- Consider Arabic/RTL quality, mobile experience, navigation, dashboards, forms, loading/error states.

**Method:**
- Use `browser_navigate` + `browser_vision` to audit live app at `https://www.alaraf.online` (if available) or local dev build.
- Review route groups and page hierarchy for navigation clarity.
- Identify heavy pages needing skeletons/optimistic UI.
- Propose design-system consistency improvements (shadcn usage, color, spacing).

**Deliverable:** Prioritized UX proposal list with rationale, estimated effort, and suggested implementation order.

---

## Execution Notes

- Use `autonomous-coding` pipeline: UNDERSTAND → PLAN → ARCHITECT → CODE → TEST → REVIEW → SHIP → LEARN.
- Since this is a large multi-phase task, consider Kanban orchestration after Phase 1 analysis.
- Do not skip ARCHITECT even for documentation/planning changes (user enforces this).
- On Windows: avoid `terminal` if Bash service is down; use Python subprocess via `execute_code` for npm scripts if needed.
- Save learnings as skills/memory after completion.

---

## Next Step on Continue

Run Phase 1 repository intelligence to produce the initial analysis report, then present findings and ask whether to proceed with cleanup, system analysis, or UX audit next.
