# Contract-details quick-edit audit — 2026-09-03

Status: findings verified at the stated scopes; repairs and deployment are **not** complete.

## Local repair continuation

- Added pending migration `20260903185654_preserve_contract_amount_on_nonfinancial_updates.sql` and matching rollback. `sync_contract_amount` no longer writes contract_amount or duplicates the earlier canonical calculator. It only derives balance when monetary inputs change (or on insert); it does not repair historical rows.
- The quick-edit branch now delegates notes to `saveContractNotes`, updates **only description**, requires the exact company/contract/opening timestamp, and verifies the returned record. It no longer reports success for an unconfirmed/zero-row response. The version is captured with the form, not taken from a later background refetch.
- Vehicle changes are now included in the existing protected-terms rejection. This is containment, not a completed vehicle-amendment workflow. Fine/deposit persistence, conflicting-schedule edit UX, and the approved amendment command remain unresolved.
- `npm run test:contract-db`: 11 isolated PostgreSQL tests passed, including unchanged SET lists, legal/closed states, explicit partial-month amounts, missing-amount canonical calculation, financial guard rejection, optimistic timestamp conflict, and rollback/reapply. Minimal schema only; no complete production RLS/trigger graph or multi-session test.
- Vitest: 13 service tests and 3 rendered wizard tests passed. Wizard tests mock lookup/services/date input and retain the actual step navigation and save handler. They verify the opening version survives rerender and rejection does not close/report success. They are not production E2E tests.
- No production migration or customer-data mutation was performed. The previous reproduction script deliberately keeps the old migration for comparison; its reproduction result is not a post-fix test.
- Verification after integration: app/node TypeScript checks passed; production build passed (82 seconds, existing chunk-size/OpenCV/Browserslist warnings); changed service and rendered-test ESLint checks passed. The wizard still has pre-existing lint warnings and a Dialog description accessibility warning. The full Vitest suite and a preview-browser save against a disposable full database have not been rerun for this patch.

Scope: the `SimpleContractWizard` opened by `ContractDetailsPageRedesigned`, and the approved-amendment command suggested by its rejection message. No customer data was changed. Production inspection used catalog SELECTs only.

## P1 — A notes save can recalculate a previously agreed amount

Evidence:

- `src/components/contracts/SimpleContractWizard.tsx:1262` sends `start_date`, `end_date`, `monthly_amount`, and `contract_amount` even when only `description` changed.
- Production `trg_require_atomic_contract_billing_graph` runs before `trg_sync_contract_amount`, alphabetically. The guard compares incoming financial terms against OLD and accepts unchanged values.
- Production `sync_contract_amount()` still contains the inclusive calendar-month formula (`month difference + 1`) from `20260827143500_preserve_explicit_contract_amount_in_legacy_sync.sql`. Outside the atomic-command flag it overwrites an explicit positive amount.
- A column-specific trigger runs when a column is named in SET, even if its value is unchanged; same-event triggers run in name order. See [PostgreSQL 17 CREATE TRIGGER](https://www.postgresql.org/docs/17/sql-createtrigger.html).

Reproduction: `node scripts/audits/reproduce-contract-quick-edit-amount-drift.mjs`.

| Synthetic update | Contract amount | Balance |
| --- | ---: | ---: |
| Before | 64,800 | 63,000 |
| Description column only | 64,800 | 63,000 |
| Current wizard-shaped update, same dates/amount | 66,600 | 64,800 |

The script executes the actual two relevant function bodies and verified trigger order on PGlite/PostgreSQL 17.5. Production reports 17.4. It deliberately reproduces the defect, so exit code 0 is **not** a green regression gate. Other production triggers, RLS, ledger writes and agents are not simulated. This does not establish that a particular customer's existing amount was caused by this path.

Repair direction: send only changed permitted fields; preserve agreed amounts in the database even when unchanged date fields appear in SET; make financial changes go through a command that validates and reconciles the complete billing graph. Add regression coverage with all production trigger ordering, partial first/last months, same-month contracts, legal/closed states, and ordinary notes updates. Do not repair history using a monthly quotient alone.

## P1 — Approved amendment bypasses billing guard without reconciling invoices/schedules

Production `apply_contract_amendment(uuid)` matches `20260826094500_fix_contract_amendment_atomic_guard.sql`: it enables `fleetify.atomic_contract_creation`, updates the contract, then marks the amendment applied. Its body does not reconcile schedules, invoices, allocations or a frozen legal claim. The inspected contract trigger list contains no dedicated billing-graph reconciliation trigger; generic monitoring/audit effects have not all been traced. Full downstream graph behavior therefore remains an integration gate, not a proven successful atomic financial amendment.

It also locks the current contract without comparing `original_values` against it. An approved but stale amendment can apply after intervening edits. Permission checking verifies the actor's current company against the amendment, but the manager-role EXISTS is not filtered by that company's ID; active profile status is not checked here. Cross-company-role behavior must be tested before reusing this command as the safe alternative.

Repair direction: same-company active authorization, field-scoped optimistic concurrency, idempotent application, graph reconciliation and legal-evidence checks in one transaction, with complete rollback on any failure. A transaction containing only contract and amendment writes is insufficient.

## P2 — Quick edit can report success with no changed row

`SimpleContractWizard.tsx:1262–1285` reads only `{ error }` from UPDATE filtered by ID/company. It requests no returned row and checks no affected count. A missing/inaccessible row can therefore take the success path. There is no version predicate to detect a newer save. The existing database trigger does provide some protection against changed financial terms on billable contracts; this is not a claim that every stale write bypasses it.

Repair direction: return and verify the exact contract ID/version; reject zero rows and stale state; do not overwrite fields that the user did not edit. Tests: deleted row, company mismatch, lost permissions, concurrent note change, database error, retry after an uncertain response.

## P2 — Vehicle change is offered but omitted from client protection

`billingDefinitionChanged` compares customer/type/dates/amounts but not `vehicle_id`. The wizard then writes `vehicle_id` directly. Production's billable-contract guard **does** include vehicle ID, so active/legal contract changes are rejected by the database rather than completing through this UI. For nonbillable contracts the guard's state predicate differs; other vehicle-identity/rental guards also exist and must not be bypassed.

Repair direction: route vehicle changes to a verified atomic substitution/amendment workflow, including old/new occupancy, cost center, signed identity and case association. Merely removing the database guard is not a fix.

## P2 — Fine controls are not persisted by this edit branch

The wizard exposes `late_fines_enabled`, `late_fine_rate` and grace period, and displays them on its review step. The internal edit UPDATE omits these fields. It can show success after saving other fields while discarding the fine changes. In addition, initialization can map `late_fine_per_day` into a control labeled as a percentage, mixing units. This finding is specific to the internal save branch used by the details page; externally supplied onSubmit paths require separate tracing.

Repair direction: use the authoritative fine-policy model and explicit currency/percentage units, apply changes through the appropriate audited command, and reload persisted values before reporting success. Do not infer a customer's accepted fine terms from the UI default.

## P2 — Inconsistent refresh after amendment

`useContractAmendments.ts:277` invalidates `contract-amendments` and `contracts`, but the details page reads `contract-details`, `contract-invoices`, `contract-payments`, `payment-schedules` and other separate keys. This does not directly refresh those observers. Whether another background event eventually repairs the view is not guaranteed by this mutation.

Repair direction: one shared invalidation helper for contract/financial/legal/vehicle changes, driven by the affected IDs and actual command result. Verify rendered details immediately after success and after an error/retry.

## Next order of work

1. Prevent unintended amount drift at both the quick-edit payload and database layers; verify before deployment.
2. Verify and harden the suggested amendment alternative, rather than treating its name as evidence of complete financial atomicity.
3. Correct misleading controls, acknowledgement and refresh semantics.
4. Resume the remaining document, payment, vehicle and legal-concurrency gates in the main checkpoint. No finding here closes that broader audit.
