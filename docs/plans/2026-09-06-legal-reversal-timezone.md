# Legal reversal false filing guard

## Verified evidence

The open browser contract C-ALF-0053 has a pending case CASE-26-0032 in preparation. Its filing date is 2026-08-22, with no complaint/reference, outcome, hearing, filing job or lawsuit preparation returned by the scoped checks. The exact-case `convert_to_legal` operation is timestamped 2026-08-22T21:31:09.591274Z: August 22 in UTC and August 23 in Qatar. The live reversal guard accepts only the Qatar date, so it incorrectly rejects this documented legacy conversion date as filing evidence.

## Database correction — deployed after explicit approval

`20260906181944_fix_legal_reversal_legacy_conversion_timezone.sql` changes only that date comparison inside the existing company/contract/exact-case conversion-provenance predicate to accept either UTC or Qatar calendar dates. It preserves preparation/pending/outcome requirements and the independent filing reference, workflow stage, submitted job/preparation, hearing and financial guards. No contract or case is updated by applying the migration. Matching rollback restores the previous comparison.

The initial automatic approval review required explicit authorization. The user subsequently approved this exact date comparison correction, and `apply_migration` succeeded on 2026-09-06. Comparing the complete live function definition before and after confirmed that only the approved date predicate changed; execute privileges are unchanged.

A read-only check confirms the conversion date for C-ALF-0053 is now recognized by the corrected predicate. The contract remains under legal procedure and CASE-26-0032 remains pending/in preparation: no reversal or case closure was performed during deployment. The migration notified PostgREST to reload its schema cache.

## Local UX changes

- Translate the filed-case server rejection to actionable Arabic for all reversal callers.
- Correct the status dialog's promise that all open cases can be closed by reversal.
- Link to the contract-filtered case register, with a visible removable filter.

## Verification

- TypeScript and production build passed.
- 20 service tests and the new scoped navigation component test passed.
- Four read-only PostgreSQL fixtures passed: UTC rollover, Qatar rollover, ordinary day and unrelated-date rejection.
- Full status-dialog suite: 4 failures outside the modified legal flow (existing cancellation-consent/authorization expectations and duplicate close-button name); 15 tests passed. These failures were not hidden by changing expectations.
- No live legal reversal or business-record mutation was executed. Full authenticated acceptance requires the user's next reversal submission; independent financial and legal guards still apply.
