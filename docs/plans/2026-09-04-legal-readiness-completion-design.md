# Canonical legal readiness persistence — local checkpoint

## Scope and evidence

The previous date-only response restated the unresolved LTO2024276 conflict;
it did not repair that production contract. This continuation resumes the
unfinished readiness-completion boundary in the full contract-page audit.

Read-only production function inspection on 2026-09-04 confirmed:

| Function | Audited body MD5 |
| --- | --- |
| `complete_legal_transfer_readiness_v1_pre_pdf_request_agent` | `bce8a7542ebc1b3a5cd5585c3dae5cd1` |
| `complete_legal_transfer_readiness_with_scope_v1` | `d1c3dc92014e40cc0e292daf87b2eb78` |
| `complete_legal_transfer_readiness_v2` | `5284fa39784cfe5d3bb512d784bdacdd` |

The v2 calculator supplied a corrected statement, but with_scope subsequently
replaced its traffic amount with raw penalties. The bottom command trusted the
supplied amount and counted all legacy traffic rows to decide whether proof was
necessary. Four real-SQL regressions initially failed: 500 instead of 300 after
a 200 receipt, unnecessary proof for company rows, missing proof silently ignored
for standalone penalties, and authority-paid customer debt incorrectly rejected.

## Design choice

Fixing only the screen or only the v2 result leaves an incorrect audit record and
direct legacy entry point. The selected design therefore puts fresh canonical
calculation and validation at the persistence boundary, while retaining existing
document request / blocked-response wrappers. This is a targeted correction, not
replacement of the entire conversion and filing workflow.

Migration `20260904034603` was created with the Supabase CLI. It guards and backs
up the three exact audited definitions in the non-exposed `legal_claim_internal`
schema. Their public replacements are SECURITY INVOKER facades. Two narrowly
granted private DEFINER gateways independently check company, active membership,
actor, permission (NULL denied), and contract existence. The raw guard and legacy
backups are not executable by API roles. No new public table is introduced.

Persistence requires explicit review/custody booleans, authoritative verified
lease and identity helpers, and the canonical v4 reader marker. It derives
amount/components/invoice balances/traffic/proof status from that statement.
Excluded IDs are deduplicated, must still be eligible, and need documented reasons.
Caller amounts and receipt totals are not treated as accounting evidence.
Human exclusion notes are retained separately from canonical invoice audit rows.
Positive customer traffic liability without proof blocks completion even in full
scope. Company, settled, and cancelled traffic rows do not require unnecessary proof.
The audit INSERT and returned claim use the same computed statement.

The existing conversion advisory-lock protocol and a contract row lock are used.
This does NOT prove serializability against all financial/document writers: those
writers do not all participate in that protocol. Conversion must revalidate.

The React wizard now requires `ready: true`, a valid returned claim, agreement
between the returned amount and statement, and agreement with the reviewed total,
components, cutoff and violation count. A null/empty/non-success RPC result can no
longer trigger conversion. Changed amounts refresh both financial queries and
reset review acknowledgements instead of submitting an unreviewed claim.

## Verification and limitations

- Executable PGlite tests use actual frozen legacy SQL, actual pending readers and
  this actual migration. The completion group has 36 tests, including authorization,
  direct-bottom calls, malformed confirmations, exclusions, cancellation, proof,
  conflicting sources, fallback-reader refusal and exact rollback with row preservation.
- Minimal auth/schema fixtures are explicit. Signed-evidence checking is a fixture;
  identity checking is an explicit stub with negative decision tests. Document
  automation wrappers are forwarded/stubbed: this is NOT an OCR, WhatsApp, full
  production RLS, or conversion end-to-end certificate.
- Rendered wizard tests mock all queries, network writes and conversion effects.
  Their date is fixed; completion success now uses the full v4 response shape.
- Current production helper definitions were read to verify parameter order and
  that they consult direct signed-contract evidence. No production function was invoked.
- Supabase function-security documentation was consulted via MCP. The changelog
  Markdown fetch was unavailable (unsupported content type), not silently verified.

Latest local checks: 287 SQL tests across five suites passed (139 combined claim/
readiness, 42 recorded-rent, 48 monthly settlement, 26 arrears, 32 billing graph).
Forty Vitest checks passed (23 payload helpers, 13 rendered controls, four static
exclusion regressions). Full app/node TypeScript checking passed. Targeted ESLint
has no errors and one pre-existing unnecessary-hook-dependencies warning.
Local Vite production build also passed (1m22s), with existing warnings for large
chunks, OpenCV browser externals, mixed static/dynamic imports and stale Browserslist.
No preview/browser or live end-to-end verification was performed in this checkpoint.
Function privilege choices follow the current
[Supabase database-function guidance](https://supabase.com/docs/guides/database/functions).

## Rollout and remaining gates

This migration depends on the canonical settlement/recorded-rent/dual-source
traffic engine (`20260904024349` and predecessors). Roll it back BEFORE those
readers. The paired rollback restores all three audited bodies and permissions
without deleting audit or financial rows. Frontend completion guards are intended
to ship with the corrected backend, not as proof the old backend is fixed.

No deployment, production DML, financial generation, case conversion, or outgoing
message was performed. Do not apply the entire dirty migration folder blindly.

Next gate: the live `auto_verify_legal_transfer_review_v1` still tests raw penalty
government-payment flags and trusts a saved readiness proof flag. Its system-review
snapshot and the full conversion/frozen-claim consumers require current-source
revalidation. They were inspected, not changed or certified here. Native trigger/
RLS/concurrency checks, historical readiness reconciliation, deployment ordering,
LTO2024276 signed-term reconciliation and the rest of the contract-page audit remain
open. Empty/invalid completion-response protection does not itself repair an old
incorrect readiness record or prove every downstream submission path is safe.

### Subsequent local continuation: system review

The automatic-review gap above is now locally addressed by `20260904040649`;
see `2026-09-04-legal-system-review-revalidation-design.md`. Completion validation
was extracted into a shared private invoker builder (no audit write), while its
authorized command still performs the completion INSERT. It now captures customer/
vehicle IDs and a wall-clock operation timestamp. Both remain pending, with
system-review rollback required before completion rollback. Full conversion,
snapshot branches and native concurrency verification remain open.
