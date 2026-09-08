# Lawsuit preparation and explanatory memorandum alignment

## Requested outcome

Apply the user's Arabic template to the explanatory memorandum and align all related preparation pages, claim amounts and exports. The supplied template ends after the gross rent / counted payments / net unpaid rent paragraph. A question requesting any remaining template sections is pending; do not invent additional monetary entitlements.

## Verified findings

- `buildMemoDocumentData` supplies individual preparation and bulk exports.
- It currently uses the latest invoice due date for the end of the claimed period. Due dates are prepaid first-of-month dates, not service end dates.
- `loadLegalClaimProjection` reads cached invoice balances and schedule paid amounts. It also casts the v4 statement as the older breakdown shape, although v4 returns `components` and `cutoff_date`; this can omit legal extension rent and return cutoffs.
- Live inspection on 2026-09-08 confirms `calculate_legal_claim_statement_v4` remains the older invoker implementation. `canonical_legal_recorded_obligations_v1` is absent in the live public schema. Local 20260904 canonical integration migrations are not proof of deployment. Do not wire the UI to an absent or private function.
- The HTML generator did not render `caseNumber`, and reused filingDate as memo date with ambiguous date parsing.
- Article 7 verified against https://www.almeezan.qa/LawArticles.aspx?LawArticleID=82663&LawID=8760&language=ar . The supplied jurisdiction paragraph is used; no additional legal opinion inferred.

## Completion gates (all required)

- [ ] Supplied template fields, introduction and factual paragraphs rendered; preserve evidence-dependent termination/return and traffic-only paths.
- [ ] Distinguish memo date, official court case number and internal case reference; preserve frozen snapshots.
- [ ] Determine documented service coverage dates separately from payment due dates, including partial months and legal extensions.
- [ ] Gross rent minus counted completed allocations equals net rent; distinguish deposits, credits, extension rent, traffic, documented compensation and damages without double counting.
- [ ] Align live calculation, overview, invoices, claims statement, facts/requests, snapshots, bulk exports and worker payload.
- [ ] Inspect live schema and data and implement reversible database changes if required; do not silently deploy old migrations with unknown dependencies.
- [ ] Regression tests for partial payments, cancellations, partial periods, extensions, deposits, traffic-only scope, unknown custody and snapshots.
- [ ] Type check, relevant financial checks, rendered memo and browser verification.

## Work in progress

Initial template headings and jurisdiction updated. Added independent memoDate field and displayed caseNumber. Further implementation and tests remain; this is not a completed rollout.

### Implemented first pass

- Template introduction and gross/paid/net paragraph updated, including zero paid amounts.
- Internal CASE-/LC- references suppressed in court case-number field; actual case number displayed when provided.
- Memo date set independently in live payload and excluded from financial snapshot equivalence checks. Historical snapshots lacking memoDate still need an explicit preserved-date policy.
- New `summarizeRentClaim` handles prepaid month ends, partial contract periods, explicit extension periods and integer-cent totals. Used in memo and overview.
- Overview shows gross/countable payments/retention/deposit and two currency decimals.
- `loadLegalClaimProjection` now reads v4 `components.legal_extension_rent` and `cutoff_date`. For older v4 lacking extension start, reads v3 at same cutoff and requires equal extension amount before using its metadata. Live v3 definition inspected and does provide extension_start_date.
- Regression suites: legalClaimSources, rentClaimSummary, documentGenerators, legal-document-generator. First 60 tests passed; rerun adds memo-date test. Type-check passed before final test addition.

### Next work remains

Do not mark complete: allocation-backed amounts and all consumers are not aligned yet. The runtime still uses cached balances, and the shared helper labels service coverage based on billing month; audit real partial-month evidence before final approval. Review penalties paid partially, exclusion handling, endpoint ownership, immutable snapshots, claims statement period columns, Taqadi facts and batch worker payload. Avoid throwing from `buildMemoDocumentData` solely for transient stale calculations: context invokes it during effects before calculations update. Add a readiness/generation gate with explicit loading handling instead. Pending user question about the rest of the supplied template is not a reason to stop independent financial work.

## Second implementation pass (verified progress)

- Preserved legal_accrual source in the individual context and batch calculation; previously both dropped it and could charge contractual late compensation on synthetic rent.
- Claims statement now carries/render service dates and uses a claim-statement title for synthetic obligations. Damages require both verification and evidence_document_id, matching the memo.
- Individual and batch Taqadi facts now derive from the actual memo facts through buildLegalMemoFactsText. Removed duplicate narrative builders from these two consumers.
- Day-first return dates no longer go through ambiguous Date(string). Frozen memo previews/exports use memoDate or original facts_as_of_date, without mutating stored snapshots.
- Export/filing entry points assert net rent equals gross minus paid without throwing during transient React calculations.
- The memo accounting table shows gross and counted payments even when counted payments are zero.
- Type-check passed. Latest focused suites: 71 tests across legalClaimSources, rentClaimSummary, documentGenerators, legal-document-generator and batchFiling (see .tmp/memo-tests.log).
- Live browser: MR202467 overview shows 18,400 rent + 6,400 traffic = 24,800, with period/payment summary; Taqadi facts visibly contain the same rent and period. No filing/submission was initiated.
- Live audit of 100 active invoices attached to legal cases: 0 paid-cache mismatches, 0 balance-cache mismatches, 0 overallocations against tenant-scoped completed receipt allocations plus unallocated direct receipts. This is a sample, not full financial certification.
- Live canonical_invoice_paid_amount exists but is not executable by the connector role or authenticated role. Reading its definition was allowed; a direct audit call was denied. The subsequent audit used already-readable scoped tables, without changing permissions.
- Live 20260903–04 migration ledger does not contain the local canonical reader/integration chain. Do not deploy that chain blindly: the live v3/v4 bodies have newer service-rent classification changes that a string-replacement migration must preserve.

### Remaining acceptance work

1. Atomic allocation-backed financial projection/API shared with server finalization (existing runtime still reads caches). Inspect schema, create reversible tested migration if needed; no permission widening of raw private helpers.
2. Validate partial invoice service coverage against actual billing evidence; contract bounds alone are not proof of a prorated service period.
3. Align traffic customer partial receipts, exclusions, deposits and legal extension totals end-to-end with server snapshot/worker reads and financial delinquency page.
4. Render the complete exported memo/claims artifact, test all related export paths and run financial checks/build after final integration.
5. Any remaining user-supplied template sections (question pending); preserve existing evidenced requests until clarified.

### Receipt migration verification — 2026-09-09

- Fixed duplicate auth fixture setup and parenthesized the PL/pgSQL CASE comparison so the migration installs in PGlite.
- Fixed numeric assertion and savepoint handling after expected authorization errors.
- Restricted the gateway to profiles explicitly marked active; null activity is denied.
- `node --test tests/database/legal-memo-receipt-settlement.test.mjs`: 11 passed, including actual authenticated role access, private helper denial, inactive/null profile denial, gross/paid/net, allocations, cross-customer rejection, exclusions and exact rollback.
- Migration remains undeployed. Frontend projection still reads cached invoices/schedules; atomic server settlement consumption, unlinked schedule and traffic receipt alignment remain required before rollout. These local tests do not establish full goal completion.

### Atomic rent projection — 2026-09-09

- Migration now discloses included unlinked schedule rows from the same v3 CTE used for its amount, and suppresses them for traffic-only scope. No duplicate client reconstruction for the new response.
- Frontend consumes disclosed invoice and schedule gross/paid/net rows when settlement_source is completed_receipt_allocations_v1. Rejects missing detail, duplicate rows, invalid amounts, future due dates and any net total mismatch. Legacy reader remains only for servers without the new marker pending coordinated rollout.
- Vitest legalClaimSources: 29 passed. PGlite receipt settlement: 12 passed including schedule metadata and scope. Type-check passed.
- Remaining: schedule paid values still use existing cached schedule amounts inside v3; must reconcile their receipt evidence before rollout. Traffic receipt accounting and overall components/frozen filing alignment still required. Migration not deployed.

### Traffic customer receipt alignment — 2026-09-09

- Live schema verified for penalties, traffic_violations and installment_number. Company payment_allocations currently contains invoice allocations only (4346); no evidence of direct schedule allocation semantics. Unlinked schedule paid caches remain an unresolved source issue.
- Reused audited traffic source identity/responsibility logic from the pending canonical migration in the new private schema, replacing its absent canonical settlement dependency with the new validated invoice receipt reader. Preserves government payments as separate from customer receipts, identifies matching source mirrors, rejects conflicts and missing customer-paid evidence.
- v4 includes traffic_settlement detail and uses its amount. Individual context, batch preparation and refresh-for-document-generation prefer these same rows; context dispatch now uses an effect so legacy query completion cannot overwrite canonical traffic.
- PGlite: 18 passed (new cases government payment, partial customer receipt, company responsibility, unsupported paid cache, identical/conflicting mirrors). Vitest: 49 passed across legalClaimSources, batchFiling and documentGenerators. Type-check and diff-check passed.
- Still undeployed. Required next: direct tests for traffic response mapper/loading; preserve violation descriptive metadata; reconcile unlinked schedules without inventing receipt amounts; audit v3 callers/overall components/cutoffs and frozen filings; production-like schema and render/full rollout validation.

### Unlinked obligation and stale-error handling — 2026-09-09

- Live company-scoped audit found 92 active due unlinked schedules across 4 cancelled contracts, all with paid cache zero and no same-month/same-amount active invoice. No financial records modified and no claim/waiver decision inferred.
- v4 now refuses full rent approval when its v3 included schedule rows have no linked invoice, returns an Arabic reconciliation error with row details, and permits traffic-only scope independently. No unpaid amount is inferred as collectible merely from a cancelled contract schedule. v3 remains a lower-level reader; direct-v3 call sites still require audit before deployment.
- Context now captures projection failure, clears stale calculations and Taqadi data, and reducer prevents stale asynchronous updates from re-enabling them. Export/filing consistency gate also refuses financialClaimError. Overview shows an Arabic remediation panel linking to the contract and allowing refetch. Successful explicit document refresh clears prior error.
- DB tests: 18 passed including unlinked-schedule refusal and traffic-only independence. Reducer/rent tests: 23 passed; type-check passed. Need rendered UI check and API error/load mapper integration tests. Migration remains undeployed.

### All monetary components and save-time total — 2026-09-09

- Live pg_proc inspection confirmed only public calculate_legal_claim_amount_v1 and v4 call v3. Amount-v1 still had an independent traffic calculation and used v3 total. Reviewed live hash a47895ed19eebe02f19fec8b0a8d1ecd; new migration backs it up and redirects to scoped v4 total; rollback restores exact original.
- Added authoritativeAmounts for all 7 financial fields to projection summary. Strict cent validation verifies server component sum and total, then verifies rent and traffic detail totals. Context, batch and canonical refresh consume these same amounts. Export consistency guard rejects later numeric drift.
- recordQuerySynchronization already invalidates legal-claim-projection on legal record changes; verified rather than adding redundant invalidations.
- PGlite: 18 passed including amount-v1 agreement and exact rollback. Vitest: 63 passed across 4 affected suites. Type-check passed before final detail equality addition (needs final run).
- Remaining immediate: align documentary detail for retention/damages/deposit/compensation with authoritative amounts and periods, preserve traffic location/type, add loader integration tests, render complete synthetic memo and compare supplied template, then deployment audit/full validation. No migration applied.

### Template rendering and calculation detail — 2026-09-09

- Added requested party separator and explicit contract/vehicle heading; removed orphaned facts numbering 4/6/7 and duplicate default-breach paragraph. Preserved evidence-dependent paths and requests.
- New legal-memo-template-render.test.ts covers supplied identity/address/contract/vehicle/jurisdiction/gross-paid-net fields and canonical facts. Optional FLEETIFY_MEMO_PREVIEW=1 writes synthetic .tmp/memo-review/template.html.
- Browser IAB tab 3 rendered template at http://localhost:8080/.tmp/memo-review/template.html. AX and screenshots verified header, contract fields, jurisdiction, facts and table: gross5100-paid500=net4600 plus traffic300=4900. Company address complete, no clipping observed in inspected sections. This is HTML display verification, not yet PDF pagination verification.
- v3/v4 now disclose retention start/end/daily rate and contractual compensation units. Loader validates period-days-rate against amount; summary passes exact retention detail to memo and units to all calculation consumers.
- Tests: template/document generator 28 passed; DB 19 passed including retention 7days*20=140 and monthly compensation 1*50=50; type-check passed. Still pending loader integration tests, documentary evidence/detail drift guard, complete build/finance/PDF validation and reviewed deployment. No migration applied.

### Build and broader verification — 2026-09-09

- build:ci passed (2m27s); existing large-chunk/externalized-opencv warnings, no build failure.
- Loader integration suite 5 passed: single RPC/no cached table reads; reconciliation errors never fall back; retention period mismatch, traffic component/detail mismatch and invalid units rejected.
- finance:ci reached live controls after passing source integrity, permissions, finance types, finance Vitest suites (72+53+49), PGlite lifecycle suites (70), and finance:integrity. It failed on journal_entries fetch in checkCancellationReversals. HTTPS unauthenticated connectivity to the expected Supabase host returned401, but a targeted finance:controls retry failed at the same fetch. Do not claim live controls/reconciliation/health snapshot completed. No indefinite polling; both CI and retry are terminal.
- Verified traffic violation_type/location columns exist in both source tables; need carry them through private traffic reader rather than discarding descriptions.
