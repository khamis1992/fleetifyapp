# Signed Lease Guards Implementation Summary

**Date:** 2026-08-23  
**Branch:** `feature/traffic-penalty-rental-guards`  
**Purpose:** Prevent legal/Taqadi transfers without verified matched signed leases (addresses Murad / C-ALF-0096 failure mode)

## Changes Made

### 1. Database Layer (Migration: `20260823002617_signed_lease_legal_guards.sql`)

**Helper Functions:**
- `check_contract_has_verified_signed_lease_v1(p_company_id, p_contract_id)` → boolean
  - Checks for `signed_contract` or `signed_contract_image` in `contract_documents`
  - Requires matching customer_id and non-null file_path
  - SECURITY DEFINER, granted to authenticated users

- `check_contract_identity_verified_v1(p_company_id, p_contract_id)` → boolean
  - Checks for verified status in `customer_verification_tasks`
  - Returns true if no verification system in use (legacy compatibility)
  - SECURITY DEFINER, granted to authenticated users

**RPC Guard:**
- Wrapped existing `convert_contract_to_legal_v1` function
- Renamed original to `convert_contract_to_legal_v1_pre_signed_lease_guard`
- New wrapper enforces HARD GATES:
  - ❌ Block if no signed lease: «لا يمكن التحويل للشؤون القانونية: عقد موقّع مطابق غير موجود»
  - ❌ Block if identity not verified: «لا يمكن التحويل للشؤون القانونية: الهوية غير متحققة»
  - Both raise EXCEPTION with ERRCODE 'P0001'

**Gap List View:**
- `legal_contracts_without_signed_lease` view
- Shows contracts with `status = 'under_legal_procedure'` OR `legal_status IS NOT NULL`
- Filters out contracts that already have signed lease documents
- Includes customer, vehicle, and legal case info
- Granted SELECT to authenticated users

**Rollback:**
- `supabase/rollbacks/20260823002617_signed_lease_legal_guards.rollback.sql`
- Drops view, restores original function, removes helper functions

### 2. Frontend Validation Hook

**File:** `src/hooks/legal/useSignedLeaseValidation.ts`

**Hook:** `useSignedLeaseValidation(contractId, companyId)`

**Returns:**
```typescript
{
  hasSignedLease: boolean;
  hasIdentityMatch: boolean;
  canConvertToLegal: boolean;
  blockingReason?: string; // Arabic message
  isLoading: boolean;
}
```

**Features:**
- Calls both RPC helper functions in parallel
- Caches results for 10 seconds (staleTime)
- Keeps in cache for 1 minute (gcTime)
- Returns combined blocking reason in Arabic
- Handles errors gracefully (logs to console, returns false)

### 3. Legal Conversion Hook Updates

**File:** `src/hooks/useConvertToLegal.ts`

**Changes:**
- Added pre-flight check before calling RPC
- Calls `check_contract_has_verified_signed_lease_v1` and `check_contract_identity_verified_v1`
- Shows better error message before attempting RPC call
- Invalidates `signed-lease-validation` query on success
- Arabic error messages for both failures

### 4. Gap List Page

**File:** `src/pages/legal/ContractsWithoutSignedLease.tsx`

**Features:**
- Shows all contracts in legal status without signed leases
- Search by contract number, customer name, QID, phone, plate, case number
- Card-based UI with color-coded borders (orange for warning)
- Displays: contract info, customer details, vehicle info, balance due
- "إعداد الحزمة" button navigates to lawsuit preparation page
- Badge showing count of contracts missing signed leases
- Warning message: «يجب رفع نسخة العقد الموقع قبل التحديث أو إعادة الرفع»

**Route:** `/legal/contracts-without-signed-lease`
- Added to `src/routes/index.ts`
- Title: «عقود بلا عقد موقع»
- Group: legal
- Priority: 123.5 (between defaulters and batch-filing)
- Protected, requires admin role, uses bento layout

### 5. Lawsuit Preparation Updates

**File:** `src/pages/legal/LawsuitPreparation/components/LegalActions.tsx`

**Changes:**
- Imported `useSignedLeaseValidation` hook
- Called hook with contract ID and company ID from context
- Updated `allReady` check to include `canConvertToLegal`
- Added two new checklist items:
  - ✅ «عقد موقّع مطابق» (Matched signed lease)
  - ✅ «تطابق الهوية» (Identity matched)
- Added warning strip when `canConvertToLegal` is false
  - Orange background with ⛔ icon
  - Shows blocking reason in Arabic
  - Message: «حظر التحويل للقانوني: [reason]. يجب رفع نسخة العقد الموقع والتحقق من الهوية قبل إعادة الرفع أو التحديث»

**File:** `src/pages/legal/LawsuitPreparation/components/TaqadiAutomationPanel.tsx`

**Changes:**
- Added props: `canConvertToLegal?: boolean`, `blockingReason?: string`
- Disabled "إضافة إلى طابور الرفع" button when `!canConvertToLegal`
- Disabled "تحديث الحزمة وإعادة من البداية" button when `!canConvertToLegal`
- Added `title` attribute showing `blockingReason` on hover when disabled
- Passed props from `LegalActions` component

### 6. Documentation

**File:** `docs/DESKTOP_ARCHIVE_FOLDER_CONVENTION.md`

**Contents:**
- English/Arabic bilingual documentation
- Three-folder structure: مربوطة (Matched), بلا_عقد (No Contract), تحتاج_مراجعة (Needs Review)
- File naming convention: `[ContractNumber]_[CustomerQID]_[PlateNumber]_signed.pdf`
- Safety warnings (DO NOT delete, auto-move, or trust plate-only matching)
- Integration notes with Fleetify system
- Workflow steps for contract activation, document receipt, legal transfer, and weekly maintenance
- References to optional helper scripts (not implemented yet)

### 7. Tests

**File:** `src/__tests__/migrations/signedLeaseGuards.test.ts`

**Coverage:**
- Migration contains both helper functions
- Migration wraps convert_contract_to_legal_v1
- Enforces signed lease requirement
- Enforces identity verification
- Creates gap list view
- Checks for correct document types
- Grants appropriate permissions
- Uses SECURITY DEFINER
- Filters contracts in legal status
- Rollback drops view, restores function, removes helpers

**File:** `src/hooks/legal/__tests__/useSignedLeaseValidation.test.ts`

**Coverage:**
- Returns false when no contract/company ID
- Returns true when both checks pass
- Returns blocking reason when signed lease missing
- Returns blocking reason when identity verification missing
- Returns combined blocking reason when both fail
- Handles errors gracefully
- Calls correct RPC functions with correct parameters

## Test Plan

### Manual Testing

1. **Create test contract without signed lease:**
   - Activate new contract
   - Do NOT upload signed_contract document
   - Attempt to convert to legal → Should be blocked with Arabic message
   - Attempt to queue for Taqadi → Button should be disabled with tooltip

2. **Upload signed lease and retry:**
   - Upload signed_contract document to contract_documents
   - Refresh lawsuit preparation page
   - Check "عقد موقّع مطابق" should now be ✅ green
   - Convert to legal → Should succeed (if identity verified)
   - Queue for Taqadi → Button should be enabled

3. **Gap list page:**
   - Navigate to `/legal/contracts-without-signed-lease`
   - Should show contracts in legal status without signed leases
   - Search functionality should work
   - Click on contract card → Should navigate to lawsuit preparation page

4. **Identity verification:**
   - Create contract without verified customer identity
   - Upload signed lease
   - Attempt to convert to legal → Should be blocked with identity message
   - Verify customer identity via verification tasks
   - Retry → Should succeed

### Automated Testing

```bash
# Run migration tests
npm run test:run -- src/__tests__/migrations/signedLeaseGuards.test.ts

# Run validation hook tests
npm run test:run -- src/hooks/legal/__tests__/useSignedLeaseValidation.test.ts

# Run full test suite
npm run test:run
```

### Database Testing

```sql
-- Test helper function: signed lease check
SELECT public.check_contract_has_verified_signed_lease_v1(
  'company-id'::uuid,
  'contract-id'::uuid
);

-- Test helper function: identity verification check
SELECT public.check_contract_identity_verified_v1(
  'company-id'::uuid,
  'contract-id'::uuid
);

-- Test gap list view
SELECT * FROM public.legal_contracts_without_signed_lease
WHERE company_id = 'company-id'::uuid;

-- Test legal conversion with guard (should fail without signed lease)
SELECT public.convert_contract_to_legal_v1(
  'company-id'::uuid,
  'contract-id-without-lease'::uuid,
  'test notes',
  'high',
  'payment_collection',
  false,
  'actor-id'::uuid
);
-- Expected: ERROR: لا يمكن التحويل للشؤون القانونية: عقد موقّع مطابق غير موجود
```

## Rollback Instructions

If issues arise, rollback using:

```bash
# Apply rollback SQL
psql -h DB_HOST -U postgres -d fleetify < supabase/rollbacks/20260823002617_signed_lease_legal_guards.rollback.sql

# Restore frontend code
git revert [commit-hash]
```

## Future Enhancements

1. **Enhanced Matching:**
   - Extract QID from scanned documents using OCR
   - Extract contract number from document text
   - Match on multiple data points (QID + contract_number + customer_id)
   - Deprioritize plate-only matching

2. **Helper Scripts:**
   - PowerShell script for Windows desktop organization
   - Node.js script for cross-platform support
   - Automated suggestions (without auto-moving files)
   - Validation reports

3. **UI Improvements:**
   - Inline signed lease upload in legal conversion dialog
   - Visual indicator on contracts list showing signed lease status
   - Dashboard widget showing gap list count
   - Notification/alert when trying to activate contract without signed lease

4. **Audit Trail:**
   - Log all signed lease uploads to audit_logs
   - Track who verified each document match
   - Report on historical contracts that were converted without signed leases

## Related Issues

- Murad / C-ALF-0096 incident (contract sent to legal without signed lease)
- Traffic penalty rental guards (existing on this branch)
- Legal transfer readiness wizard (20260727013000)

## Success Metrics

- ✅ Zero contracts converted to legal without signed lease after this deployment
- ✅ Gap list identifies all existing problem contracts
- ✅ UI blocks Taqadi queue/restart without signed lease
- ✅ Clear Arabic error messages guide users to resolution
- ✅ Tests pass for all new validation logic

---

**Implementation Complete:** 2026-08-23  
**Ready for PR:** Yes  
**Tested:** Unit tests created, manual testing required post-deployment
