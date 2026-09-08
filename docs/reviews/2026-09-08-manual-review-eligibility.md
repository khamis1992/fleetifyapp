# Manual contract review eligibility — 2026-09-08

## Report and cause

The manual-review dialog for lawsuit preparation `9074489e-0ea4-4139-9537-85cf98132ba8`
(contract C-ALF-0018) rejected a signed copy that explicitly required human review.
The document was quarantined/unverified with `tenant_name_conflict`. The private
review RPC accepted quarantined/unverified documents only for
`insufficient_identity_evidence`, while the UI offered a review action more broadly.

## Correction

- Deployed migration `20260908114123_align_manual_identity_review_reasons.sql`
  to project `qwhunliohlkkahbspfiu`; confirmed its version in migration history.
- The RPC now also permits human review for `tenant_name_conflict`,
  `low_ocr_confidence`, and `incomplete_scan`, retaining the required
  quarantined/unverified state. This permits review, not automatic approval.
- Added a shared frontend eligibility helper used by the contract library and
  lawsuit matching workspace. Ineligible copies explain the required action.
- Included the existing `legal_identity_details` column in the document query.
- Failed previews provide retry and return-to-copies actions.
- Matching rollback restores the prior policy without deleting completed reviews.

Authorization, company/contract scope, row locking, revision validation, the full
matching observed identity number, explicit attestation, reason, conflicting-copy
guard and atomic audit remain enforced by the server. Quarantined confirmed
mismatches, ambiguous evidence, missing/unknown reasons and superseded copies
remain excluded. Existing active-copy review behavior is preserved.

## Validation

- PostgreSQL regression suite: 16 passed, including new review reasons, rejected
  identity/attestation attempts, preview without approval, audit and rollback.
- Vitest: 34 passed across eligibility, lawsuit workspace, manual review and
  customer attachment suites.
- `npm run type-check`: passed.
- `npm run build:ci`: passed; existing large-chunk warning remains.
- Browser verification in the user's current authenticated session: opened this
  contract's signed copy through the lawsuit workspace. The preview RPC succeeded,
  the eight-page PDF loaded, and the identity/reason/attestation form appeared.
  Approval was disabled with empty inputs. Left the form open for the reviewer;
  no document was approved and no lawsuit was submitted during verification.

The security advisor reports an informational no-policy notice for the private
`identity_reviews` audit table. This is intentional: browser roles have no direct
table access and writes go through the authorized command. No grants or policies
were broadened. [Supabase explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

This correction addresses access to human review; it does not change OCR name
normalization or automatically certify document contents.
