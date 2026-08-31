-- Rollback: Unique constraint on customers.national_id

-- Drop unique index
DROP INDEX IF EXISTS public.idx_customers_company_national_id_unique;
DROP INDEX IF EXISTS public.idx_customers_national_id_lookup;

-- Restore original non-unique index
CREATE INDEX IF NOT EXISTS idx_customers_national_id 
  ON public.customers(national_id) 
  WHERE national_id IS NOT NULL;
