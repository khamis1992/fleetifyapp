# Contract details review — LTO202410

## Delivered

- Light contract dossier layout: financial summary, contextual actions, desktop section navigation and horizontally scrollable mobile navigation. Follow-up and communication have their own section.
- Legal reversal keeps its reason, pending state and inline failure visible; retries use an idempotency key. Restored the missing live v2 RPC through migration `20260906044426_contract_details_legal_reversal_runtime.sql`.
- The reversal accepts legacy conversion-generated filing dates only with matching audit provenance. Actual filing references, court activity, submission evidence and unsafe worker states remain blocked. A matching rollback is provided.
- Cancelled contracts expose reactivation as their primary action. Expired contracts explain the required date amendment. Backend errors remain readable and a successful response must reference the requested contract.
- Contract-linked recorded penalties now appear alongside traffic violations. This contract has 11 unpaid penalties totaling QAR 5,700. Cancelled penalty invoices do not clear the underlying responsibility.
- Schedule-linked service invoices are correctly grouped as rental installments in the collection ledger. Explicit penalty invoices retain priority as charges.
- Legal/cancellation/add-violation dialogs fit mobile viewports. Invoice timeline entries use invoice dates rather than treating cache updates as payments.

## Live verification and restoration

The legal reversal was executed successfully on the requested contract, then its original operating state was restored while the cancellation decision remained pending:

- Contract: `under_legal_procedure`, legal status `under_legal_action`.
- Vehicle: `maintenance`.
- Case: `pending`, workflow `preparation`, original filing date and notes restored.
- Contract, vehicle, invoices, payments, schedules, delinquency, violations, jobs and preparations match the baseline when excluding update timestamps.
- Reopen metadata and audit records remain intentionally as an accurate history of the test.
- No live payment, invoice, penalty or document was added or deleted in this review.

Browser checks covered overview, financial summary, invoices, payment dialog loading, collection ledger, schedules, vehicle/custody, violations and add dialog, legal reversal, cancellation preflight, follow-up, documents, official preview and timeline. The collection ledger shows 36 rental installments and 5 receipts. Mobile width 390px showed no page-level horizontal overflow. Browser viewport override was reset.

## Validation

- TypeScript: passed after final edits.
- Production build: passed; existing bundle/chunk warnings remain. Frontend was not deployed.
- Focused ESLint: no errors; 7 warnings remain.
- Final focused Vitest run: 7 files, 105 tests passed.
- Legal reversal isolated PostgreSQL tests: 33 passed.
- Earlier broader database checks had 12 fixture failures. The daily-readiness continuation fixed the missing canonical-reader fixture dependencies: the five financial suites now execute 186 cases, 180 ordinary passes, zero unexpected failures, and **6 executed failing TODOs** reproducing known live financial defects. These TODOs are not a release pass. The deployed legal-reversal and violation migrations do not repair the invoice-to-receipt trigger or fee posting.

## Pending user decision

Cancellation was not committed. The current cancellation workflow requires transferring the 11 unpaid penalties (QAR 5,700) to company responsibility. The user was asked whether to authorize that transfer or keep responsibility with the customer and stop cancellation. Original operating state was restored pending the answer. Payment creation/deletion and cancellation/reactivation round trips on live data therefore remain unexecuted.

## Daily-readiness continuation (2026-09-06)

- Found that the manual violation creation and cancellation RPCs were absent from the live database. Applied `20260906060348_contract_violation_commands_runtime.sql` after 14 executable PostgreSQL tests (actual command SQL; minimal isolated dependent tables). Its rollback removes the entry points but retains request identities/provenance.
- Verified creation and cancellation through the signed-in browser on LTO202410: test violation `QA-LTO202410-20260906`, QAR 1, date 2026-01-31, id `c60a6b26-213d-4247-9e97-16605e038910`. Confirmed pending creation, cancellation, one cancellation audit, no linked payments and no recognized liability. Deleted only that cancelled QA record under exact company/contract/id/request/time guards. No message was sent.
- Full business-field comparison against the initial baseline passed for contract, vehicle, all 47 invoices, 5 payments, 37 schedules and zero traffic-violation rows, excluding `updated_at`. Existing 11 `penalties` remain untouched. Legal reopening metadata from the earlier test and creation/cancellation audits are intentionally retained.
- Add-violation form keeps errors and input after failure, prevents repeated submission and dismissal during saving, defaults within an expired contract and validates contract dates. Notification is unchecked by default and uses the audited Edge command instead of the retired browser provider. Failed notification does not repeat or roll back the saved violation. Delivery was not exercised against a real recipient.
- Cancellation checks the returned violation id, keeps failures visible, prevents dismissal during submission, and refuses active payments, recognized liabilities and inactive company users. Duplicate violation numbers with conflicting amounts/types are rejected.
- Invoice/violation preview, cancellation and grid/table controls have accessible names.
- Validation: 137 focused Vitest tests passed, followed by the expanded violation suite (6 tests, adding 2 cancellation checks); 14 new PostgreSQL cases passed. TypeScript and production build passed after transient unrelated in-progress vehicle edits settled. Frontend not deployed.
- Supabase security advisor flags the two RPCs as authenticated SECURITY DEFINER entry points, as intended. Their empty search paths, revoked anonymous access and tenant/actor checks were reviewed and exercised. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Other existing project advisories are outside this change; no global security-clean claim.

### Operational acceptance matrix

| Service | Evidence | Remaining acceptance gap |
| --- | --- | --- |
| Page, financial totals, invoices, schedules, ledger | Browser and focused component tests | Full financial write round trip |
| Legal reversal | Live success and restored business state | None for this tested unfiled case; filed cases correctly blocked |
| Manual violation creation/cancellation | Live browser success, DB assertions, cleanup | Real WhatsApp delivery deliberately not sent |
| Payment registration/reversal | Isolated financial suites; live RPC/trigger inspection | Old aggregate trigger still rewrites receipt history; fee journal credits gross rather than principal |
| Cancel/reactivate contract | UI, cancellation preflight and service tests | Live round trip; decision on QAR 5,700 customer/company liability |
| Invoice create/cancel/bulk cancel | Read/view controls and isolated billing suites | Live write/restore round trip |
| Amendment/renewal/termination | UI and existing local suites | End-to-end acceptance of every lifecycle variant |
| Documents, pickup/return, CRM | Read/preview/navigation checks | Upload/delete, custody and CRM write round trips not certified here |

**Not yet approved for unrestricted daily operations.** The active fee journal helper credits the entire receipt to RECEIVABLES (example: 620 instead of 500 when 120 is a fee). Live active mappings have CASH/BANK/RECEIVABLES but no late-fee revenue mapping. Asked the user for the approved fee account; no answer recorded. Also pending: invoice aggregate receipt-writer retirement with reader/provenance validation. Do not equate passing UI tests or successful build with completion of these financial gates.

## Read-only page refresh and cancellation deployment checkpoint

- Removed the automatic financial-write query from the details page. Mount, reload and successful invoice cancellation no longer invalidate/run the financial-refresh command. Display remains based on canonical payment evidence, and the existing financial-review warning remains visible when cached balances disagree.
- Manual refresh reloads scoped readers, including previously omitted recorded penalties, awaits them, displays failures and permits read-only retry. It does not invoke the financial repair RPC. The separate synchronization service remains available for explicit maintenance callers/tests, but the details page no longer imports it.
- 16 mounted-page/cache refresh tests passed; full type-check and production build passed (1m50s). This reduces write risk during viewing; it does not fix the old database trigger on actual financial writes.
- Added 8 executable PostgreSQL tests for the pending cancellation/return orchestration: atomic success, rollback on invalid mileage/fuel/date/condition, preserving return evidence on replay, cancellation without return, and anonymous execute denial. Actual pending command SQL is executed; cancellation financial effects and operational-status resolution are explicit doubles. This is not full-schema certification.
- Reconfirmed that `cancel_contract_with_return_and_penalties_v2` and `record_contract_vehicle_return_v1` remain absent live. [The earlier deployment report](2026-09-06-cancellation-rpc-404.md) records an automatic approval-review rejection for creating a SECURITY DEFINER RPC and changing persistent execution grants. No retry or alternate deployment path was attempted here. Explicit schema-deployment approval is required before applying those two already prepared migrations.
- No live financial write, liability transfer, cancellation or customer message occurred in this continuation. The two schema migrations would not themselves cancel a contract or transfer penalties.

## Approved cancellation/return deployment

The user explicitly approved the two schema migrations. Both were applied successfully on 2026-09-06 as live versions `20260906114803` and `20260906114814`. Exact signatures and execute permissions were verified; PostgREST resolved both functions and returned the expected authentication/invalid-payload errors from nonmutating probes. This supersedes the missing-RPC deployment blocker above. See [deployment evidence](2026-09-06-cancellation-rpc-404.md).

The financial-row baseline comparison still passes (47 invoices, 5 payments, 37 schedules, zero traffic violations), but the contract now has active status and cleared legal status/suspension reason compared with the earlier snapshot. We did not overwrite this intervening state. No live cancellation, return or liability transfer was executed in this deployment. Full daily-operation acceptance and the financial write blockers remain separate from RPC availability.
