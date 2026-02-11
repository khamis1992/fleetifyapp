# Fix Missing Invoices For Contract `CON-25-5FEMJQ`

## Goal
Fix the invoice generation flow with the smallest possible code change so contracts like `CON-25-5FEMJQ` always get invoices when created.

## Todo Plan

- [x] 1. Update `src/hooks/useContractCreation.ts` to ensure payment schedules are generated before calling `generate_invoices_from_payment_schedule`.
- [x] 2. Keep the change minimal: only add the pre-check/generation step and reuse existing error handling style (non-fatal warning, do not fail contract creation).
- [x] 3. Run quick validation (`npm run type-check` or targeted check) to confirm no new TypeScript issues.
- [x] 4. Sanity-check behavior by reviewing the invoice creation path and confirm it still preserves current success/warning toasts.

## Review

### What Changed
1. **`src/hooks/useContractCreation.ts`**: Added pre-step to call `generate_payment_schedules_for_contract` before `generate_invoices_from_payment_schedule`.
2. **`src/components/contracts/ContractDetailsPageRedesigned.tsx`**: 
   - Added `handleGenerateMissingInvoices` handler
   - Added "إنشاء الفواتير الناقصة" button in contract invoices tab
   - Updated invoice query to include cancelled invoices (for full visibility)
3. **`src/components/contracts/ContractInvoicesTabRedesigned.tsx`**: 
   - Added props for `onGenerateMissingInvoices` and `isGeneratingMissingInvoices`
   - Added "إنشاء الفواتير الناقصة" button in header and empty state
4. **`src/components/payments/QuickPaymentRecording.tsx`**: 
   - Added `handleGenerateMissingInvoices` function
   - Added "إنشاء الفواتير الناقصة" button in Quick Payment page when no invoices exist
5. **`INVOICE_FIX_SQL.sql`**: Created SQL script to fix `generate_invoices_from_payment_schedule` to skip existing invoices (prevents duplicate errors)

### Why It Was Needed
- Contracts like `CON-25-5FEMJQ` had no invoices because invoice generation depends on payment schedules.
- User needed quick way to generate missing invoices from both contract details page and quick payment page.
- The RPC function was throwing duplicate errors when invoices already existed.

### Verification
- Ran `npm run type-check` successfully (no TypeScript errors).
- Added detailed error logging in handlers.
- SQL script ready to apply in Supabase Dashboard.

### Next Steps
1. Apply `INVOICE_FIX_SQL.sql` in Supabase Dashboard SQL Editor
2. Test "إنشاء الفواتير الناقصة" button in both pages

### Additional completed task (Lawsuit documents list)
- Updated `src/pages/legal/LawsuitPreparation/utils/documentGenerators.ts`.
- Adjusted the generated `كشف بالمستندات المرفوعة` document to list exactly these 7 items in this order:
  1. البطاقة الشخصية للمخول بالتوقيع
  2. كشف المطالبات المالية
  3. نسخة من عقد الايجار
  4. مذكرة شارحة
  5. نسخة من السجل التجاري
  6. صورة من قيد المنشاءه
  7. شهادة IBAN
- Kept logic simple: each item is shown as `مرفق` or `غير مرفق` based on availability.
- Removed unrelated extra items from this specific lawsuit document list.

### Follow-up fix (missing 2 items)
- Root cause: `كشف المطالبات المالية` و`مذكرة شارحة` were only marked attached when their UI state was already `ready`.
- Fix: in `generateDocumentsList`, both documents are now generated fresh when case data is available, then included as attached items in the required list.
- Result: the uploaded-documents statement now includes the full requested set (including claims statement + explanatory memo) when lawsuit preparation data exists.

## New Todo Plan (Document size optimization)

- [x] 1. Review how embedded document pages are appended in `src/utils/official-letters/documents-list.ts`.
- [x] 2. Keep only `كشف المطالبات المالية` and `مذكرة شارحة` as embedded pages in the final generated document.
- [x] 3. Prevent embedding these files as pages (while keeping them listed in the table):  
  - نسخة من عقد الايجار  
  - البطاقة الشخصية للمخول بالتوقيع  
  - شهادة IBAN  
  - نسخة من السجل التجاري  
  - صورة من قيد المنشاءه
- [x] 4. Ensure table rows and `مرفق/غير مرفق` status remain unchanged.
- [x] 5. Run quick lint check on edited files and update this review section.

### Review update (Document size optimization)
- Updated `src/utils/official-letters/documents-list.ts` only.
- Changed embedded-pages filter to allow embedding only:
  - `كشف المطالبات المالية`
- All other lawsuit files remain listed in the main table, but are no longer rendered as extra attached pages in the same document.
- Lint check completed successfully for the edited file.

### Follow-up update
- Applied the same rule to `مذكرة شارحة`: it is now listed in the table only and no longer embedded as a full attached section in the generated document.

### Final follow-up update
- Applied the same rule to `كشف المطالبات المالية`: it is now listed in the table only and no longer embedded as an attached section.
- Result: all required documents are mentioned in the table only, with no extra embedded copies inside `كشف بالمستندات المرفوعة`.

## New Todo Plan (Explanatory memo request #3)

- [x] 1. Update the closing requests text in `src/utils/legal-document-generator.ts` so request #3 explicitly states the total traffic violations amount.
- [x] 2. Apply the same wording update in `src/utils/official-letters/explanatory-memo.ts` to keep both memo generators consistent.
- [x] 3. Keep change minimal: update text only, no logic or numbering changes.
- [x] 4. Run lint check on edited files and document the review result here.

### Review update (Explanatory memo request #3)
- Updated request wording in:
  - `src/utils/legal-document-generator.ts`
  - `src/utils/official-letters/explanatory-memo.ts`
- Change made: request #3 now explicitly states the total traffic violations amount.
- Numbering remains coherent in violations cases (fees/costs request moved to the next item).
- Lint check passed for both edited files.
