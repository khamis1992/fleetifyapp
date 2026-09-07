# Financial system review and redesign

Requested on 2026-09-06: review the entire financial system, redesign its operation and presentation, and verify integration with all business departments.

## Scope and approach

Preserve existing financial records and the ongoing contract/legal changes in the working tree. Review the live schema using read-only queries. Implement and verify changes locally before considering production rollout.

Three approaches considered: replace the entire ledger (unnecessary migration risk), change only the screens (does not address accounting correctness), or consolidate the existing controlled accounting engine and redesign its entry points around verified data. The third approach is selected.

The ledger remains the source for recognized revenue, expenses and account balances; invoices describe receivables/payables; completed receipts and their allocations describe collection; contracts and legal claims use the existing canonical rental/payment evidence services. Receipt processing must not increment the same invoice or contract again during a refresh. Errors must remain distinguishable from zero balances. All readers and actions must use the selected company.

## Work plan

- [x] Inventory current financial routes, services, database controls and department integrations.
- [x] Record live aggregate integrity evidence, separating existing data issues from code issues.
- [x] Consolidate principal financial reads and remove unsafe repeatable balance writes.
- [x] Redesign the finance workspace around accounting, collection, obligations, controls and department links.
- [x] Verify accounting rules, repeat execution, company isolation, complete datasets and failure behavior in isolated tests.
- [x] Run relevant tests, financial checks, full type-check and production build; inspect the interface.
- [x] Record exact implemented scope, remaining issues and deployment status.
- [ ] Production certification: resolve receipt aggregate synchronization, legacy posting mappings and incomplete classifications, then test complete department workflows and concurrency on a staging copy.

## Initial evidence

- The live project is `qwhunliohlkkahbspfiu`, verified through the Supabase connector.
- Al-Araf has 23,320 posted journal entries, 870 drafts and 82 cancelled journal entries at the first read. Counts are time-dependent.
- Existing finance overview reads aggregate unpaginated invoice/contract datasets, treats some errors as empty data, and represents expenses as literal zero.
- `AccountingService.updateInvoicePaymentStatus` and `updateContractPaymentStatus` increment cached totals using the supplied payment amount. Those methods require replacement with authoritative reads/commands, subject to caller analysis.
- Existing working-tree changes belong to prior/ongoing contract, fleet and legal work and must not be reverted.
- Baseline Vitest startup was blocked by sandbox filesystem access in esbuild, before running tests. Retry using approved execution permissions; do not report this as test failures.

## Acceptance and evidence boundaries

Balanced journal lines, posting account restrictions, period locks, immutable posted records and reversals must remain enforced. Invoice due dates remain prepaid, on the first day of the invoice month. No destructive data repairs or mass reposting are part of this redesign. A local test passing does not certify live historical records or an untested department workflow.

## Delivered review

See [the Arabic audit and rollout requirements](../reviews/financial-system-2026-09-06/README.md), including aggregate evidence and desktop/mobile previews. The new migrations and matching rollbacks were executed in isolated databases; production was read only. Latest local verification: 149 tests in offline financial CI, eight native PostgreSQL concurrency tests, full TypeScript check and production build pass. An earlier 70-case integration run had 65 passes and five explicitly unresolved TODO cases; it is not a complete release gate.

## Continuation: receipt posting and account mapping

The user asked to continue, then requested that we inspect the system and propose the late-fee accounting treatment. Fresh read-only evidence: 332 fee assessments, no positive `payments.late_fee_amount`, but 181 payments with legacy fine fields and 21 rental receipts with `fine`. Those legacy fields are not proof of collection. Account 4200 is level two and has no posted lines. Propose an explicit level-four collected-fee revenue account 4312 under header 431; code unused at inspection, no live account created.

Implemented a guarded local migration that splits gross receipt into principal and collected-fee revenue, fails atomically for invalid/ambiguous mappings, and retains historical receipt/reversal identity. No fees are backfilled. A private helper serializes the journal identity; CASH and BANK no longer substitute for one another. The frontend validates and scopes account mapping commands, handles contra-asset depreciation and legacy fleet display categories, reads complete chart pages, and flags existing invalid mappings.

30 SQL proposal tests and eight multi-session native PostgreSQL tests cover collection, bank effects, actual journal reversal/cancellation functions, replay, period closure and race conditions. Ten new frontend tests cover mapping eligibility and company-scoped writes. Native fixtures still use explicit auth/period/contract/schedule doubles; this is not full-schema certification. See [fee proposal](../reviews/financial-system-2026-09-06/fee-proposal.md) for exact rollout dependencies and unresolved historical reconciliation.

## Continuation: settlement writers and customer collection

Captured 62 live triggers on five settlement tables. Reproduced a 620 receipt (500 rent + 120 fees) leaving the schedule paid at 620 while invoice and contract ended at 500. Added a guarded reversible migration retiring ten conflicting writers, preserving canonical finalization, and synchronizing schedules from final invoice settlement. Seventeen lifecycle tests pass; the eight native concurrency tests now use real contract and schedule helpers and 30 captured triggers before the proposal. Remaining auth/period/numbering doubles and 32 excluded triggers are enumerated in the coverage artifact.

Live read-only comparison found zero principal differences across 5,313 non-cancelled invoices and 4,664 active matching linked schedules. That does not invalidate the synthetic new-fee regression or certify historical provenance. Legacy legal collection has no rows; its unused additive trigger was recorded separately and not changed.

Replaced FinancialTracking's cumulative-document totals and old outstanding-month calculations with an additive invoker-RLS collection snapshot, actual open invoices, strict client validation and explicit failure states. Historical receipts remain viewable and immutable; no aggregation or mass renaming into current financial facts. Added twelve SQL reader tests and thirteen client/component tests, responsive screenshots and runtime checks. Current complete offline suite: 191 tests plus eight native concurrency cases. See [collection reader](../reviews/financial-system-2026-09-06/collection-reader.md) and [settlement proposal](../reviews/financial-system-2026-09-06/settlement-proposal.md).

The workspace, collection and fee command readers remain absent in production. No financial data, account mapping, DDL or deploy was performed there. Staging full-trigger/auth verification, approved fee-account setup, historical provenance and remaining department workflows still gate production certification.

## Continuation: complete interface and sidebar redesign

The user explicitly extended the redesign to every financial subsection and the sidebar. Completed locally: a permission-aware 57-destination registry in ten groups, searchable/collapsible financial sidebar integrated into the current shared sidebar, a common layout for nested and standalone routes, redesigned accounting/billing/treasury/planning/controls/report workspaces, shared leaf-page styles, and canonical legacy redirects. Real specialized forms and reports remain connected to their existing services.

Complete invoice/payment readers, company-specific invoice cache keys, contract filters, register pagination, cross-page selection, correct payment CSV export and explicit integrity failure states were verified. Calculators now handle zero-interest loans and bounded depreciation. No live financial writes or deployment were performed.

Verification: 217 offline finance tests, eight general-sidebar tests, 114 desktop/mobile destination checks and eight browser interaction workflows; full type-check and local production build. See [the interface delivery report](../reviews/financial-system-2026-09-06/interface-redesign.md) for exact coverage, screenshots and remaining production-certification requirements.
