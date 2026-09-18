# Taqadi filing package validation repair

## Verified outcome

Deployed `align_taqadi_violation_document_requirements` to Supabase project `qwhunliohlkkahbspfiu` on 2026-09-07. Local migration: `20260907151151_align_taqadi_violation_document_requirements.sql`; matching rollback is in `supabase/rollbacks/`.

Authenticated browser preflight on C-ALF-0061, contract `b4c78c3b-e8bf-4dca-a70a-59b878849139`, returned: **اجتازت الحافظة فحص الخادم. لم تبدأ إجراءات الرفع.** The actual seven-document package and rental claim of QAR 26,575 were accepted by the same validator used by the filing queue. The 49 unpaid penalty records totaling QAR 24,700 remain stored and excluded from this claim because no official proof is attached. No filing job was started.

## Changes

- Package validation derives violation requirements from the canonical server claim statement and stored case scope. Client-supplied zero counts cannot suppress server-required proof.
- Traffic-only cases and requests carrying traffic documents still require the generated violation statement and official evidence. Registered evidence IDs are checked against the same company and contract. Legacy payloads without source IDs remain supported when registered proof exists.
- Existing company authorization, signed-contract identity, seven base documents, and subsequent financial approval guards remain in place. No financial records or claim values were changed.
- One frontend predicate now serves readiness, packaging and document controls. A positive amount with a stale zero count remains subject to evidence requirements; an empty evidence array cannot pass packaging.
- Missing package keys are shown with Arabic document/field names and completion guidance, including at the initial enqueue error handler.
- Added a read-only **فحص جاهزية الحافظة** action under the document portfolio.

## Verification

- 46 Vitest tests passed across payload generation, readiness, error messages and the preflight button.
- 12 PGlite PostgreSQL tests passed: original regression, supported claims, absent/foreign/mismatched proof, legacy compatibility, paid/cancelled/void/zero penalties, traffic-only scope, identity/company checks and rollback. The canonical calculation boundary uses synthetic persisted records; the package validator and outer identity wrapper execute their real SQL.
- Full `npm run type-check` passed (app and Node configurations).
- `npm run build:ci` passed; existing dependency/chunk size warnings remain.
- Supabase security advisors: no new findings compared with the pre-deployment baseline.
- Production validator definition was compared with the captured baseline before replacement to avoid overwriting concurrent changes.

The backend repair is live for all contracts. Frontend changes were tested on localhost; this task did not publish a Vercel frontend deployment. The live check validates the filing package only and does not approve or submit a lawsuit.
