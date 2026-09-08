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
