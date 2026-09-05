# Contract document lifecycle audit — 2026-09-03

Status: cache repair and stronger last-document guard implemented locally; full document lifecycle protection remains incomplete. No production data, stored files, legal cases or messages were changed.

## Verified cache defect and local repair

The live source reader `useContractDocuments` used `[contract-documents, companyId, contractId, customerId, vehicleId]`, while its create/delete callbacks invalidated `[contract-documents, contractId]`. React Query prefix matching does not match those keys. The new test first demonstrates this mismatch using a real QueryClient, then verifies the shared helper reaches the actual reader.

`src/utils/contractDocumentQueries.ts` now owns the list prefix and invalidates the contract's document list, transfer readiness, signed-document selection, lawsuit contract/violation evidence, pending scan count, and the company's legal queue/employee document list. It invalidates/refetches; it never sets matched/ready locally. The legacy pending scan key is contract-only, whereas the other targets carry explicit company scope.

Integrated paths:

- Generic document creation/deletion and exported condition diagrams.
- Contract-details document reclassification.
- Enhanced creation used by generated-contract saving (the mutation result carries the actual company/contract scope).
- Transfer-wizard identity verification.
- Lawsuit evidence upload.
- Contract-document identity scanning.

The helper awaits active refetches where mutation callbacks await it. Disabled/inactive queries become stale and load on subsequent use; this does not force a disabled scanner to run. A refresh is not proof that backend identity evidence is correct.

Verification: 43 targeted tests passed, comprising 10 new cache/mutation tests and 33 existing document-selection, routing, filing-readiness and legal-transfer tests. The new mutation tests mock the backend and use a real QueryClient. An active QueryObserver test proves that changed readiness comes from its query function, not a fabricated local success value. Tests cover tenant/contract isolation, confirmed create/delete, rejected delete retaining stored bytes, and failed creation without success. TypeScript app/node checks passed; targeted ESLint passed. No production E2E save/delete was attempted and the previous build result predates this patch.

## Unresolved deletion/replacement risks

Production catalog SELECT on `public.contract_documents` returned seven user triggers (binding, identity, lifecycle, canonical link and PDF-request processing). It did **not** contain `trg_protect_last_legal_signed_contract`. This specifically confirms the new local protection is not active there; it does not assert no other permission or storage policy can prevent a particular deletion.

The initial pending `20260903173353_protect_last_legal_signed_contract.sql` had the following defects (the next section records the local repair; production remains unchanged):

1. Its replacement predicate requires another signed-type row with a nonempty file path, but does not require `legal_identity_match_status = matched` or active, non-quarantined evidence. The header's claim of a "verified replacement" is stronger than the actual predicate.
2. It has no shared contract/evidence locking protocol. Two sessions could each see the other's document as a replacement before deleting both. This needs a true concurrent PostgreSQL test, not a source-string assertion.
3. Its case-status allowlist may miss preparation or unfamiliar nonterminal case states. Contract legal status covers many cases, but cancelled collection contracts need an explicit case/preparation/job-based rule.
4. Changing a nonempty file path to another nonempty path is not itself classified as removal by this trigger. Existing binding/identity guards must be traced and tested before declaring replacement safe.
5. Deletion removes the metadata row first, then attempts storage cleanup. A cleanup failure leaves orphaned bytes; a thrown transport exception can also make a committed row deletion appear failed before its success callback. Shared file-path references and bucket selection (condition diagrams use a different bucket) need a dedicated deletion command/cleanup design. Do not reorder storage deletion before the database permission/evidence checks.

The initial migration tests inspected strings only. Their passing status did not prove replacement identity, concurrency or safe storage cleanup.

## Last-evidence guard continuation

Read-only production schema/function checks reconfirmed the pending migration and trigger are absent. They also confirmed that `guard_signed_contract_evidence_integrity_v1` already rejects changing the file path, company, contract or signed document type on an existing signed row. The new guard retains this stronger rule; it does not introduce an in-place replacement bypass.

The pending migration was strengthened (not deployed):

- Replacement must be a signed PDF/image row marked `matched`, active, not superseded, with a check timestamp, no expired validation, and a nonblank independent file path. A duplicated metadata row for the same path is not a replacement. These are recorded evidence predicates, not a fresh OCR or storage-existence check.
- Locks the affected contract rows with `FOR NO KEY UPDATE NOWAIT`, the replacement document with `FOR SHARE NOWAIT`, and confirmed canonical links with a shared NOWAIT lock. Conflicts produce `SIGNED_CONTRACT_EVIDENCE_BUSY`, for which the hook now displays a refresh/retry message rather than a generic deletion failure. No automatic retry or storage deletion is performed when the metadata DELETE is rejected.
- Preserves every affected direct/canonical legal contract, including evidence on a nonlegal document alias. Replacement aliases require a confirmed same-company/source/target link that is rechecked under lock. Proposed/rejected or inconsistent links do not qualify.
- Treats case states other than `closed`/`cancelled` as nonterminal, so new/preparation statuses cannot bypass protection on an administratively cancelled contract.
- Truthful identity demotion and quarantine remain allowed. Preserving false `matched` evidence is not an acceptable way to satisfy a readiness invariant.

Verification: `npm run test:documents-db` passes **36** tests executing the actual new migration, rollback, and existing binding/identity/lifecycle functions on PGlite/PostgreSQL 17. The minimal schema uses synthetic rows and a fixture tenant RLS policy, not the full production schema/policies. It covers invalid replacements, direct/canonical scope, different companies/contracts, nonterminal states, immutable bindings, atomic bulk-delete rollback, legitimate identity correction, client RPC privilege revocation, cross-company DELETE denial, and rollback/reapplication preserving a business row. The five migration-source checks and five mutation/cache tests also pass (**10** Vitest tests); the latter mock backend responses. TypeScript app/node checks and targeted ESLint pass. No fresh production build or deployment was performed for this continuation.

Remaining gates: actual two-session contention/retry tests (single-connection PGlite cannot prove concurrency); full production triggers/RLS and canonical routing writers; legal preparation/job states without an open `legal_cases` row; immutable filed-package references; revalidation when customer identity changes; object existence/content integrity, and safe shared-path/bucket cleanup. The last-row rule does not claim that a valid replacement can justify deleting a specific document already embedded in a submitted case package.

Local executable discovery found no `psql` or `postgres` on PATH. The earlier Docker engine failure remains an environment limitation for full-session tests, not a blocker to the remaining source/isolated audit work.

## Remaining scope

### Referenced legal evidence continuation

Production catalog inspection found stronger existing protection than the
earlier last-row fixture modeled: both `lawsuit_preparations` and
`taqadi_filing_jobs` have composite direct-source foreign keys with `ON DELETE
RESTRICT`. Their referenced signed documents cannot simply be deleted while
those references remain. Do not claim those paths lack all database protection.

However, **eleven** other validated foreign keys on five legal tables use
`ON DELETE SET NULL`. A generic document deletion can preserve the business row
but erase its proof link. The impacted fields are listed in DATABASE_REFERENCE.
New CLI-created migration `20260903192847_preserve_referenced_legal_evidence`
changes only these delete actions to `RESTRICT`, atomically with a five-second
lock timeout. Matching rollback restores the old actions and does not recover
links already lost before the migration. No new permissions, functions, table
columns, nullability changes or business-data rewrites were added. The hook now
explains SQLSTATE `23503` without deleting stored bytes or suggesting success.

`tests/database/legal-evidence-references.test.mjs` adds **20** PostgreSQL tests:
reproduces old SET NULL loss on all eleven relationships; executes the real
migration against an independent catalog-derived schema fixture; verifies all
eleven new restrictions and the two existing direct-source restrictions;
checks an unrelated replacement does not justify deleting a referenced
original; leaves unreferenced files deletable; preserves nullable references;
tests bulk-operation rollback, migration rollback/reapply and atomic migration
failure on a missing late prerequisite. This fixture does not include full
production RLS, agent triggers, storage, or two concurrent sessions.

Current verification after this continuation: **56** isolated database tests
pass across both document suites; **11** targeted Vitest tests pass (six
mutation/cache tests plus five static migration checks). App/node TypeScript,
targeted ESLint and tracked-file whitespace checks pass. Neither a fresh
production build nor a deployment was attempted. No data or stored bytes were
modified outside the synthetic fixtures.

Aggregate read-only job inspection for this company returned 19 jobs: 2
cancelled, 1 failed and 16 needs_human. **18** have no relational
`source_document_id` (2/1/15 respectively). All 18 have a contract URL in
`payload.documents`, and none has a contract `sourceDocumentId` there. This is
evidence of a legacy URL-only linkage gap, not proof that their objects are
missing or that these jobs were successfully filed. Do not backfill by plate,
filename alone, or another customer's document; verify the actual stored path,
company, contract and identity before any repair. No jobs were changed/requeued.

Remaining immutability work: preserve legacy URL-only and historical submitted
package references; prevent an authorized edit from silently detaching evidence
already used in a filing; preserve bytes during overwrite/cleanup and archive
operations; verify against a complete disposable schema and real concurrent
sessions. Restrictive foreign keys solve generic deletion detachment, not those
broader requirements.

Audit the separate signed-agreement uploader's unbound/matched upload lifecycle, customer/vehicle document sources, and full production document guards. Complete immutable filed-case evidence semantics and storage cleanup, then verify in a disposable database with full triggers/RLS and separate sessions. Keep these gates separate from the tested frontend cache-key correction and isolated last-row guard.
