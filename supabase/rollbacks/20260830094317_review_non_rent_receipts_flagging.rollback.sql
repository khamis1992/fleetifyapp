-- Rollback: review_non_rent_receipts

DROP POLICY IF EXISTS review_non_rent_admin_write ON public.review_non_rent_receipts;
DROP POLICY IF EXISTS review_non_rent_company_read ON public.review_non_rent_receipts;
DROP INDEX IF EXISTS idx_review_non_rent_contract;
DROP INDEX IF EXISTS idx_review_non_rent_company;
DROP TABLE IF EXISTS public.review_non_rent_receipts;