-- Add unique constraint on customers.national_id for العراف (24bc0b21-4e2d-4413-9842-31719a3669f4)
-- Issue #4: No UNIQUE constraint on national_id (only non-unique index exists)
-- Current state: 0 duplicate non-empty NIDs, 55 blank/null
-- Solution: Partial UNIQUE allowing multiple NULLs/blanks, preventing duplicate non-blank values

-- ================================================================
-- STEP 1: Verify no duplicates exist (safety check)
-- ================================================================
DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_duplicate_count integer;
BEGIN
  RAISE NOTICE '🔍 Checking for duplicate national IDs...';
  
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT 
      national_id,
      COUNT(*) as dup_count
    FROM public.customers
    WHERE company_id = v_company_id
      AND national_id IS NOT NULL
      AND BTRIM(national_id) != ''
    GROUP BY national_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'Found % duplicate national IDs - must be resolved before adding constraint', v_duplicate_count
      USING HINT = 'Run: SELECT national_id, COUNT(*) FROM customers WHERE company_id = ''' || v_company_id || ''' AND national_id IS NOT NULL AND BTRIM(national_id) != '''' GROUP BY national_id HAVING COUNT(*) > 1';
  ELSE
    RAISE NOTICE '✅ No duplicate national IDs found - safe to add constraint';
  END IF;
END $$;

-- ================================================================
-- STEP 2: Add partial unique index (allows multiple NULLs/blanks)
-- ================================================================
-- Drop old non-unique index
DROP INDEX IF EXISTS public.idx_customers_national_id;

-- Create new partial unique index on (company_id, national_id)
-- WHERE national_id is not blank - allows multiple NULLs/empty strings
CREATE UNIQUE INDEX idx_customers_company_national_id_unique
  ON public.customers (company_id, national_id)
  WHERE national_id IS NOT NULL 
    AND BTRIM(national_id) != '';

-- Create non-unique lookup index for NULL/blank values
CREATE INDEX idx_customers_national_id_lookup
  ON public.customers (national_id)
  WHERE national_id IS NOT NULL;

COMMENT ON INDEX public.idx_customers_company_national_id_unique IS
'Ensures unique national_id per company for non-blank values. Allows multiple NULL or blank national_ids.';

-- ================================================================
-- STEP 3: Verification
-- ================================================================
DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_total_customers integer;
  v_with_national_id integer;
  v_blank_national_id integer;
BEGIN
  SELECT COUNT(*) INTO v_total_customers
  FROM public.customers
  WHERE company_id = v_company_id;
  
  SELECT COUNT(*) INTO v_with_national_id
  FROM public.customers
  WHERE company_id = v_company_id
    AND national_id IS NOT NULL
    AND BTRIM(national_id) != '';
  
  SELECT COUNT(*) INTO v_blank_national_id
  FROM public.customers
  WHERE company_id = v_company_id
    AND (national_id IS NULL OR BTRIM(national_id) = '');
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Customer National ID Statistics:';
  RAISE NOTICE '  Total customers: %', v_total_customers;
  RAISE NOTICE '  With national ID: %', v_with_national_id;
  RAISE NOTICE '  Blank/NULL national ID: %', v_blank_national_id;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Unique constraint active for % non-blank national IDs', v_with_national_id;
END $$;
