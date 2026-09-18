# Signed Lease Verification Guards Implementation Plan

## Overview
Implement safeguards to prevent contracts from being sent to legal/Taqadi without a verified matched signed lease document, addressing the Murad / C-ALF-0096 failure mode.

## Background Context
- Branch: `feature/traffic-penalty-rental-guards` already has partial traffic penalty guards
- Migration `20260813072633_traffic_penalty_rental_invoice_legal_guards.sql` exists on this branch
- Migration `20260727013000_require_legal_transfer_readiness_wizard.sql` has readiness checks
- Hook `useConvertToLegal` calls RPC `convert_contract_to_legal_v1` for legal conversion
- Component `LawsuitPreparation` page handles Taqadi filing workflow
- Table `contract_documents` stores documents with `document_type` field
- Verification system exists via `customer_verification_tasks` table

---

## Tasks Breakdown

### 1. Database Schema & Helper Functions
- [ ] **Create helper function to check signed contract match**
  - Function: `check_contract_has_verified_signed_lease_v1(p_company_id uuid, p_contract_id uuid)`
  - Returns: boolean
  - Logic: Query `contract_documents` for `document_type IN ('signed_contract', 'signed_contract_image')` AND matching customer_id/plate/contract_number
  - Add test in `src/__tests__/migrations/` directory

- [ ] **Create helper function for identity verification check**
  - Function: `check_contract_identity_verified_v1(p_company_id uuid, p_contract_id uuid)`
  - Returns: boolean
  - Logic: Check verification status from existing identity verification system
  - Coordinate with existing verification checks in readiness wizard

- [ ] **Create SQL migration file**
  - File: `supabase/migrations/YYYYMMDDHHMMSS_signed_lease_legal_guards.sql`
  - Add both helper functions above
  - Add rollback file: `supabase/rollbacks/YYYYMMDDHHMMSS_signed_lease_legal_guards.rollback.sql`

### 2. Update Legal Conversion RPC Guards
- [ ] **Modify `convert_contract_to_legal_v1` RPC**
  - Add checks at beginning using new helper functions
  - Raise exception with Arabic message if checks fail
  - Error code: 'P0001' (business rule violation)
  - Error message: «لا يمكن التحويل للشؤون القانونية: عقد موقّع مطابق غير موجود أو الهوية غير متحققة»
  - Update in migration file

- [ ] **Add validation tests**
  - Test file: `src/__tests__/migrations/signedLeaseGuards.test.ts`
  - Test cases: conversion blocked without signed lease, conversion allowed with signed lease

### 3. Frontend UI Guards
- [ ] **Create validation hook**
  - File: `src/hooks/legal/useSignedLeaseValidation.ts`
  - Hook: `useSignedLeaseValidation(contractId: string)`
  - Returns: `{ hasSignedLease: boolean, hasIdentityMatch: boolean, canConvertToLegal: boolean, blockingReason?: string }`
  - Uses Supabase RPC to call helper functions

- [ ] **Update `useConvertToLegal` hook**
  - File: `src/hooks/useConvertToLegal.ts` (already exists)
  - Add pre-flight check using `useSignedLeaseValidation`
  - Show Arabic toast error before attempting RPC call

- [ ] **Update LawsuitPreparation page**
  - File: `src/pages/legal/LawsuitPreparation/components/LegalActions.tsx`
  - Disable Taqadi restart/queue buttons when validation fails
  - Show blocking reason in Arabic with clear UI indicator
  - Add to legal readiness checklist

- [ ] **Update legal readiness checklist**
  - File: `src/pages/legal/LawsuitPreparation/components/LegalOverview.tsx`
  - Add checklist items:
    - ✅ «عقد موقّع مطابق» (Matched signed lease)
    - ✅ «إثبات المخالفات إن وجدت» (Violations proof if required)
    - ✅ «تطابق الهوية» (Identity matched)
    - ✅ «اكتمال الحزمة 100%» (Package 100%)
  - Block restart/queue until all green

### 4. Gap List Feature
- [ ] **Create gap list query**
  - File: `src/hooks/legal/useContractsWithoutSignedLease.ts`
  - Query contracts in legal statuses without matched signed lease
  - Filter: `legal_status IS NOT NULL OR status = 'under_legal_procedure'`
  - Check: No `contract_documents` with `document_type IN ('signed_contract', 'signed_contract_image')`

- [ ] **Create gap list page component**
  - File: `src/pages/legal/ContractsWithoutSignedLease.tsx`
  - Title: «عقود تحت القانوني بلا عقد موقّع مطابق»
  - Show: contract_number, customer name, plate, status, link to prepare page
  - Add filters and search

- [ ] **Add route for gap list**
  - File: `src/routes/index.ts`
  - Path: `/legal/contracts-without-signed-lease`
  - Group: `legal`
  - Add navigation link in legal section

- [ ] **Add navigation menu item**
  - File: Update legal menu navigation
  - Add link to gap list under "إدارة المتعثرات" or "متابعة القضايا"

### 5. Contract Activation Guards
- [ ] **Add signed lease upload prompt on activation**
  - File: `src/hooks/contracts/useContractActivation.ts` (or similar)
  - Show modal/dialog prompting signed lease upload
  - Option 1: Upload now (preferred)
  - Option 2: Activate but block legal transfer later (show warning)
  - Do not break existing historical contracts

- [ ] **Update contract creation workflow**
  - File: Contract creation components
  - Add signed lease upload step or warning
  - Make it clear legal transfer will be blocked without it

### 6. Matching Rules & Documentation
- [ ] **Strengthen document matching logic**
  - File: `src/pages/legal/LawsuitPreparation/utils/contractDocumentSelection.ts` (already exists)
  - Update `scoreContractDocument` function
  - Prefer: QID + contract_number extracted from document + customer_id match
  - Deprioritize: Plate-only matching
  - Add comments explaining matching rules

- [ ] **Create archive folder convention doc**
  - File: `docs/DESKTOP_ARCHIVE_FOLDER_CONVENTION.md`
  - Document folder structure: `عقود/مربوطة`, `عقود/بلا_عقد`, `عقود/تحتاج_مراجعة`
  - Explain purpose of each folder
  - Include English translations

- [ ] **Optional: Create PowerShell helper script**
  - File: `scripts/organize-desktop-contracts.ps1`
  - Script to help organize Desktop files into folders
  - DO NOT auto-move files, only suggest/assist
  - Include instructions and safety warnings

- [ ] **Optional: Create Node.js helper script**
  - File: `scripts/organize-desktop-contracts.js`
  - Alternative to PowerShell for cross-platform use
  - Same safety constraints

### 7. Translation Strings
- [ ] **Add Arabic UI strings**
  - File: `src/locales/ar/legal.json`
  - Add all new UI strings:
    - «لا يمكن التحويل للشؤون القانونية: عقد موقّع مطابق غير موجود»
    - «الهوية غير متحققة»
    - «عقود تحت القانوني بلا عقد موقّع مطابق»
    - «عقد موقّع مطابق»
    - «إثبات المخالفات إن وجدت»
    - «تطابق الهوية»
    - «اكتمال الحزمة»
    - etc.

- [ ] **Add English translations**
  - File: `src/locales/en/legal.json`
  - Add English equivalents for all Arabic strings

### 8. Testing
- [ ] **Create unit tests for validation hook**
  - File: `src/hooks/legal/__tests__/useSignedLeaseValidation.test.ts`
  - Test: Returns false when no signed lease
  - Test: Returns true when signed lease exists
  - Test: Returns false when identity not verified

- [ ] **Create integration tests**
  - File: `src/__tests__/integration/legalTransferGuards.test.tsx`
  - Test: Cannot convert to legal without signed lease
  - Test: Cannot queue Taqadi without signed lease
  - Test: Can convert to legal with signed lease and identity match

- [ ] **Create SQL migration tests**
  - File: `src/__tests__/migrations/signedLeaseGuards.test.ts`
  - Test helper functions work correctly
  - Test RPC guards block conversion

### 9. Documentation
- [ ] **Update AGENTS.md**
  - Add note about signed lease requirement for legal transfer
  - Add link to archive folder convention doc

- [ ] **Update CLAUDE.md**
  - Same as AGENTS.md (keep in sync)

- [ ] **Create implementation summary**
  - File: `docs/SIGNED_LEASE_GUARDS_IMPLEMENTATION.md`
  - Document all changes made
  - Include test plan
  - Include rollback instructions

### 10. Pull Request
- [ ] **Commit all changes**
  - Use clear commit messages
  - Group related changes in logical commits

- [ ] **Push to branch**
  - `git push origin feature/traffic-penalty-rental-guards`

- [ ] **Create pull request**
  - Title: «Implement signed lease verification guards for legal/Taqadi transfers»
  - Description: Detailed summary of changes and test plan
  - Link to issue/requirement
  - Mark as ready for review

---

## Success Criteria

✅ **Hard Gate Before Legal + Taqadi**
- Cannot convert to `under_legal_procedure` without verified signed lease
- Cannot enqueue or retry Taqadi filing without verified signed lease
- UI buttons disabled with clear Arabic reason
- Server/RPC paths blocked with proper error messages

✅ **Gap List Available**
- Managers can see list of contracts in legal status without signed lease
- List shows contract details and link to prepare page

✅ **Mandatory Signed Lease on Activation**
- New contract activation prompts for signed lease upload
- Warning shown if activating without signed lease
- Legal transfer blocked later if not uploaded

✅ **Strong Matching Rules**
- QID + contract_number + customer_id matching preferred
- Plate-only matching not sufficient for auto-attach
- Clear comments documenting matching logic

✅ **Archive Folder Convention Documented**
- Clear documentation for organizing Desktop files
- Optional helper scripts provided
- Safety warnings included

✅ **Legal Readiness Checklist Complete**
- Checklist includes all required items
- Restart/queue blocked until all items green
- Clear visual indicators for each item status

✅ **Tests Pass**
- Unit tests for validation logic
- Integration tests for UI guards
- SQL migration tests for RPC guards

✅ **PR Opened**
- All changes committed and pushed
- PR created with clear description
- Ready for review

---

## Notes

- **Arabic UI**: All user-facing messages must be in Arabic
- **No Force Cancel**: Do not invent Qatar law or force-cancel contracts
- **Historical Contracts**: Do not break existing contracts, focus on gating legal/Taqadi
- **Simplicity**: Keep changes as simple as possible, minimize code impact
- **Testing**: Add tests for all new validation logic

---

## Review Section
_To be filled in after implementation_

### Changes Made

### Test Results

### Known Issues / Future Work
