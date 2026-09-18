-- Rollback: detect_cross_file_duplicate_imported_payments

DROP POLICY IF EXISTS review_cross_file_dups_admin_write
  ON public.review_cross_file_duplicate_payments;
DROP POLICY IF EXISTS review_cross_file_dups_company_read
  ON public.review_cross_file_duplicate_payments;

DROP INDEX IF EXISTS idx_review_cross_file_dups_contract;
DROP INDEX IF EXISTS idx_review_cross_file_dups_company;

DROP TABLE IF EXISTS public.review_cross_file_duplicate_payments;

DROP FUNCTION IF EXISTS public.detect_cross_file_duplicate_payments(uuid, boolean);