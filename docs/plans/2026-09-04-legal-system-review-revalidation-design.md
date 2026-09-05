# Current-source automatic legal review — local candidate

## Objective and evidence

This continues the full contract-details audit; the preceding turn made concrete
progress on readiness persistence and frontend completion-response validation.
It did not certify the later system review or whole conversion graph.

Read-only production inspection on 2026-09-04 verified the automatic review body
hash `107bd62565b43a6a7151a9f45ade1c86`, service-only execution ACL, and the 22
columns of `legal_transfer_employee_reviews`. Existing local Supabase generated
types/reference do not enumerate this newer table; the live information_schema
query, not guessed columns, supplied the fixture and replacement definition.

Three executable regressions against the actual old automatic-review body failed:

1. A cancelled 500 receipt left a 1000 request snapshot instead of current 1500.
2. Removing traffic proof after readiness still produced `system_verified`.
3. Changing the contract customer after readiness still allowed verification.

The current function counted raw penalties by government payment state and trusted
a saved proof flag. It copied stale readiness JSON into the review. Its contract/
customer/invoice timestamp metadata did not make the financial snapshot current.

## Design and trade-offs

Selected: recalculate and validate using the same canonical builder used by
readiness completion, preserving claim scope and documented exclusions. Automatically
update the review's financial snapshot when receipts change; do not require another
human approval merely for deterministic recalculation. Reject changed customer/
vehicle identity, missing/invalid evidence, ambiguous accounting and invalid scope.

Rejecting every timestamp change would unnecessarily stop automation; trusting
saved readiness would continue the proven defect. Sharing validation also avoids
maintaining a second traffic/responsibility/settlement implementation.

Pending completion migration `20260904034603` is refactored locally to expose a
PRIVATE INVOKER builder `prepare_readiness_snapshot_v3`. It authorizes, locks the
contract, validates choices and current evidence, and computes the canonical JSON
without writing audit rows. Completion's narrow DEFINER command still performs
its original INSERT. The snapshot now includes customer and vehicle IDs, and its
audit timestamp uses `clock_timestamp()` so multiple completions in a transaction
are not deliberately assigned the same transaction-start timestamp.

New migration `20260904040649` was created using Supabase CLI. It guards and backs
up the exact live review function and installs a private authorized DEFINER review
gateway with an INVOKER public facade. The deployed service-only ACL is preserved:
authenticated users still enter through the existing conversion command, not by
calling this internal review stage or raw builder directly.

The new review uses the latest completion record, including an invalid latest
record (it must not fall back to an older success). It checks canonical provenance,
scoped IDs, current contact and vehicle, and calls the shared builder with the
original documented exclusion reasons. The refreshed snapshot and immutable review
audit event carry the same current claim. Original readiness audit rows are not
rewritten or replaced. Pending manual reviews are cancelled only after all gates
pass. A review for an earlier customer is cancelled, not reused under that old
customer ID. Repeated successful review reuses the current system-review row but
retains distinct verification audit events.

## Verification scope

Tests extend `tests/database/legal-claim-canonical-integration.test.mjs` using the
actual frozen old review definition, pending canonical reader/completion migrations,
and actual new migration. The initial three failing regressions now pass. There are
35 system-review tests: receipt additions/cancellations, proof removal/new traffic,
responsibility, ambiguity, scope/exclusions, changed customer/vehicle/contact,
signed evidence, latest-record selection, authorization, private grants, repeated
review, failure atomicity, exact rollback and changed-baseline refusal.
The final run passed 322 SQL tests across five suites (174 claim/readiness/review,
42 recorded-rent, 48 monthly settlement, 26 arrears, 32 billing graph). The completion
rollback also refuses an unsafe dependency order, and reverse-order rollback was
executed successfully without deleting audit records. No frontend code changed in
this continuation; the prior TypeScript/build results were not rerun or counted as
new verification. Changed tracked files passed `git diff --check`.

The schema/auth fixtures are minimal, explicitly marked, and the conversion caller
is a test-only forwarding function. Signed-identity decisions remain fixture-backed.
These tests do not certify OCR, WhatsApp, native production RLS/triggers, real
conversion side effects, or concurrent financial/document writes. The shared
advisory and contract row locks coordinate completion/review/conversion commands,
but not all other writers. No broader serializability guarantee is claimed.

## Rollout and remaining gates

Neither migration is deployed. No live financial mutation, review approval,
conversion, filing, or outgoing message was performed. Rollback `20260904040649`
before `20260904034603`, then roll back its canonical reader dependencies. The
rollback restores the exact original body/service-only ACL and preserves review,
audit and financial records. Existing legacy readiness records require a fresh
canonical readiness completion; this migration does not silently bless old cached
JSON. Do not batch-apply the dirty migration directory.

The full objective is still open. Next inspect and exercise the actual
`convert_contract_to_legal_collection_v2` branches and `freeze_legal_claim_snapshot_v1`:
the local source has an early existing-case return and a separate expired/cancelled
path, so replacing auto-review alone does not protect every branch. Read-only live
hashes were `fe4d133302804c1b4ca1dedc6f2f1927` and
`de5d6ce330f9a4049a12f3c69988416c`, respectively. Full-scope zero claims and final
claim/proof consistency also need end-to-end checks. LTO2024276 reconciliation,
historical provenance cleanup, native concurrency checks, deployment sequencing,
and all other contract-page domains remain in the full audit scope.
