# AGI Transformation Plan: From Reactive Bot to Autonomous System

## Honest Assessment — Current State

### What the system claims to be
"AGI coding loop: understand → plan → dispatch subagents → verify with quality gates → self-heal failures → deliver"

### What it actually is
A **reactive code editor with static analysis only**. Here's the proof:

| Claim | Reality | Evidence |
|-------|---------|----------|
| "Verify with quality gates" | Only runs `tsc --noEmit` and `eslint` | tsc passed but the payments query was broken at runtime |
| "Self-heal failures" | Fixes what the user reports, not what it finds | User reported PaymentRegistrationTable error — I didn't detect it |
| "Check the entire app" | Checked a handful of files, claimed victory | 970 `.from()` calls in codebase, I audited ~15 |
| "Deliver" | Delivered unverified fixes | Said "fixed" without opening the browser |
| "Systematic audit" | Grep + manual scan, not automated | Found `status` vs `payment_status` by reading CLAUDE.md, not by running queries |

### The Core Failure Pattern

```
User reports error → I grep for pattern → I patch one file → I run tsc → tsc passes → I claim "fixed"
                                                                              ↑
                                                                    THIS IS THE FAILURE POINT
                                                                    tsc passing ≠ runtime correctness
                                                                    Especially for Supabase PostgREST queries
```

### What's Missing (The AGI Gap)

1. **No runtime verification** — never opens the browser to test
2. **No systematic sweep** — fixes one instance, doesn't find all 970 queries
3. **No schema-to-code cross-reference** — doesn't check every `.from('table')` against `types.ts`
4. **No error simulation** — doesn't trigger every page and capture console errors
5. **No feedback loop** — fix → test → verify error is gone → move on
6. **No learning** — same bug patterns repeat because there's no error database
7. **No proactive detection** — waits for user to report, never finds errors first

---

## The 5-Layer AGI Architecture

### Layer 1: Schema Truth Engine
**Problem:** 970 Supabase queries, no automated check against actual schema
**Solution:** A script that cross-references every `.from('table')` call against `types.ts`

```typescript
// scripts/audit-supabase-queries.ts
// 1. Parse types.ts → extract every table's actual columns
// 2. Grep all .from('table_name') calls
// 3. For each call, extract the .select('col1, col2') string
// 4. For each column, verify it exists in types.ts for that table
// 5. For each .eq('col', val), verify column exists
// 6. For each .update({col: val}), verify column exists
// 7. For each .insert({col: val}), verify column exists
// 8. Output: violations.json with file:line + wrong column + correct column
```

**Run before any fix session.** This turns "I checked 15 files" into "I checked all 970 queries."

### Layer 2: Runtime Verification Engine
**Problem:** tsc passes but queries fail at runtime
**Solution:** Browser-based page tester that captures console errors

```
// scripts/audit-runtime-errors.ts
// 1. Start dev server (npm run dev)
// 2. Login via Playwright (saved session)
// 3. Navigate to every route from src/routes/index.ts (150 routes)
// 4. For each route:
//    a. Wait 3 seconds for page to load
//    b. Capture all console.error messages
//    c. Capture all network request failures (Supabase 400/500)
//    d. Screenshot the page
// 5. Output: runtime-errors.json with route + error + stack trace
```

**Run after every fix.** This turns "tsc passes" into "the page actually works."

### Layer 3: Fix-Verify Loop
**Problem:** Fix → claim success → user finds it's still broken
**Solution:** Enforced loop: fix → browser test → error gone? → done

```
For each error found:
  1. Read the error message (from Layer 2 output)
  2. Find root cause (systematic-debugging skill)
  3. Apply fix (patch)
  4. Re-run the specific route in browser
  5. Check console for the SAME error
  6. If error gone → mark resolved
  7. If error persists → back to step 2 (max 3 attempts)
  8. If 3 attempts fail → escalate to user with full context
```

**This is non-negotiable.** No fix is "done" until the browser shows zero errors on that page.

### Layer 4: Pattern Learning Database
**Problem:** Same bug patterns repeat across the codebase
**Solution:** Error pattern database that warns before editing

```
// Known patterns to check before every edit:
// - payments table: use payment_status NOT status
// - journal_entry_lines: use line_description NOT description
// - journal_entry_lines: use debit_amount/credit_amount NOT debit/credit
// - journal_entry_lines: use line_number (required), NO company_id
// - chart_of_accounts: use account_level NOT level
// - chart_of_accounts: use parent_account_code NOT parent_code
// - payments: use created_by NOT recorded_by
// - payments: use reconciliation_status NOT reconciled
// - Any table with multiple FKs to same table: use !fk_name disambiguation
// - Any !inner join on nullable FK: will drop rows, use left join
```

Every time a new pattern is discovered, it gets added to this database and to the audit script.

### Layer 5: Proactive Nightly Audit
**Problem:** System only runs when user complains
**Solution:** Cron job that runs the full audit every night

```
# .hermes/cron/nightly-audit.md
# Every night at 3 AM:
# 1. Run schema audit (Layer 1) → new violations?
# 2. Run runtime audit (Layer 2) → new console errors?
# 3. Compare against last night's results → regressions?
# 4. If new issues found → fix them automatically (Layer 3)
# 5. Report summary to user in the morning
```

---

## Execution Plan — Phases

### Phase 1: Build the Schema Audit Script (Today)
- [ ] Write `scripts/audit-supabase-queries.ts`
- [ ] Parse `types.ts` to extract table → column mapping
- [ ] Grep all 970 `.from()` calls
- [ ] Cross-reference columns
- [ ] Output violations report
- [ ] Fix ALL violations (not just the one the user reported)

### Phase 2: Build the Runtime Tester (Tomorrow)
- [ ] Write `scripts/audit-runtime-errors.ts`
- [ ] Login via Playwright with saved session
- [ ] Visit all 150 routes
- [ ] Capture console errors + network failures
- [ ] Output report
- [ ] Fix ALL runtime errors found

### Phase 3: Enforce the Fix-Verify Loop (Day 3)
- [ ] Update self-verifying-coder skill to include browser verification
- [ ] No fix is "done" until: tsc passes + browser shows no error
- [ ] Add `record_error` calls for every bug pattern discovered
- [ ] Update `systematic-debugging` skill with Supabase-specific pitfalls

### Phase 4: Nightly Audit Cron (Day 4)
- [ ] Create cron job that runs audit scripts nightly
- [ ] Compare against previous night's baseline
- [ ] Auto-fix simple violations (column name mismatches)
- [ ] Report complex issues to user

### Phase 5: Pattern Database (Day 5)
- [ ] Consolidate all discovered patterns into `scripts/known-patterns.json`
- [ ] Pre-edit check: before any `.from()` edit, validate against patterns
- [ ] Post-edit check: after any fix, verify the pattern isn't violated

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Console errors on any page | Unknown (not measured) | 0 |
| Schema violations in codebase | Unknown (only 15 files checked) | 0 (all 970 queries audited) |
| Fixes verified in browser | ~0% | 100% |
| Proactive error detection | 0% (waits for user) | 100% (nightly audit) |
| Repeat bug patterns | High (no pattern DB) | 0 (pattern DB prevents) |
| "I checked the entire app" claim | False (checked 15/970) | True (all 970 audited + runtime tested) |

---

## The Iron Rules

1. **No fix is done until the browser shows zero errors on that page**
2. **No "I checked the entire app" until the audit script runs against all 970 queries**
3. **No claim of success without running the verification script**
4. **Every discovered bug pattern goes into the pattern database immediately**
5. **The audit runs nightly, not when the user complains**

---

*This plan exists because the user correctly identified that the system is NOT AGI — it's a reactive bot that guesses, patches, and claims victory without verifying. The transformation requires building the verification infrastructure that should have existed from the start.*