# Contract identity matching v2

## Scope delivered

- Deterministic decisions distinguish exact complete QID agreement, QID conflict and insufficient/ambiguous evidence. Name-only agreement does not establish legal identity.
- Arabic/Persian digits and established Arabic compound-name spacing are normalized. Incomplete identifiers and OCR letter substitutions are never repaired into a match.
- Legal clauses are excluded as tenant names. Multiple tenant candidates require review. LLM fallback must supply an exact source quote whose labelled extraction independently agrees.
- Missing OCR pages, provider response errors and uncertain digit recognition do not produce a confirmed conflict. Legacy 5,000-character proposal excerpts cannot certify a complete contract.
- Full PDF rechecks compare the submitted page count against the original PDF in Storage. File SHA-256, source page/crop, raw/normalized values and available OCR confidence are retained. PDF rasterization resolution increased to 3× / maximum 3,000 pixels.
- Database decisions and history are atomic, company scoped and versioned. A context revision detects changes during a scan. Customer identity changes and reassignment require a new review.
- Frontend and lawsuit selection use the stored decision. The contract document offers a comparison dialog, original-file preview, source-page navigation, full recheck and the latest 10 history records.
- Existing manual review remains available. Replacing an automated decision clears stale automated details; history retains the previous evidence.

## Validation

- `npm run type-check` and `npm run build:ci`.
- Identity rules, Unicode inputs, ambiguous sources and lawsuit evidence selection regression tests.
- `node scripts/audits/check-contract-identity-edge.mjs`: checks Edge source and shared modules using installed SDK types and an in-memory Deno declaration. This is an offline TypeScript check, not a Deno runtime simulation.
- `node scripts/audits/test-contract-identity-v2.mjs`: isolated PGlite/PostgreSQL tests cover atomic audit, stale revision rejection, conflicting IDs, company isolation, Unicode identifiers, read-only history and rollback retaining history.

## Deployment and limits

Migration: `20260907132349_contract_identity_evidence_audit.sql`. Rollback is in `supabase/rollbacks/` and intentionally retains history. The previous guard definition is restored on rollback.

Supabase project: `qwhunliohlkkahbspfiu`; Edge Function `contract-id-scanner`, version 31, decision engine `2026-09-07.2`, extractor `2026-09-07.labelled-qid.2`. Existing custom agent authentication/governance is preserved.

The OCR provider remains Google Vision. The 0.90 recognition review threshold is conservative and has not been calibrated against a labelled production benchmark. Confidence is OCR recognition confidence, not the probability that a customer identity is correct. Native PDF text/layout extraction and provider benchmarking remain follow-up work; no accuracy percentage is claimed. PDF pages are rendered by the authenticated client; the server verifies the original file and page count, but does not independently render and compare every submitted image.

Historical approvals are not bulk overwritten based on a new version alone. Rechecks write a new audited decision; previously unmeasured evidence is labelled in the dialog. LTO2024252 already had its legacy result corrected by a separate migration before this deployment.

The live 13-page LTO2024252 test exposed two additional extraction pitfalls: arbitrary eleven-digit attachment numbers were included in conflict detection, and continuation lines in deposit/notice clauses were treated as tenant names. Candidate QIDs are now bound to explicit identity labels, and a clause beginning with a tenant reference cannot fall through into the next line as if it were a blank name field. Both actual clause patterns are regression fixtures. Each live comparison is retained in the audit history, including intermediate review outcomes.

Final live verification: LTO2024252 is `matched` with `exact_identity_number`, complete 13-page evidence and a SHA-256 fingerprint. The Arabic spelling variants normalize consistently; the source name is on page 1 and the explicitly labelled QID evidence is on page 9. The final extraction revision is saved on the document. Four audited scans were present at verification (including two intermediate review decisions); the last two scans with the final extractor both matched. The final stored check was `2026-09-07T14:09:32.874618Z`.

The targeted regression set contains 105 passing cases across the completed runs, plus 9 isolated PostgreSQL checks. App TypeScript, offline Edge TypeScript and the final production build passed. Frontend changes are in the local workspace; this task deployed only the relevant Supabase migration and Edge Function, not the other uncommitted work to Vercel.
