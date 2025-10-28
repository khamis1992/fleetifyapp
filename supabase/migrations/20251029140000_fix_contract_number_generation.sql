-- ================================================================
-- FIX CONTRACT NUMBER GENERATION
-- ================================================================
-- Changes contract number format from long to short
-- Old: CNT-1760811949736-H60Z96
-- New: CNT-25-0001
-- ================================================================

-- Create or replace function to generate short contract numbers
CREATE OR REPLACE FUNCTION generate_contract_number(company_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_contract_number TEXT;
BEGIN
  -- Get current year (2 digits)
  v_year := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Count contracts for this company in current year
  SELECT COUNT(*) + 1 INTO v_count
  FROM contracts
  WHERE company_id = company_id_param
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Generate number: CNT-YY-XXXX (e.g., CNT-25-0001)
  v_contract_number := 'CNT-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
  
  RETURN v_contract_number;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_contract_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_contract_number(UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION generate_contract_number IS 'Generates short contract numbers in format CNT-YY-XXXX';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ CONTRACT NUMBER GENERATION FUNCTION CREATED';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Format: CNT-YY-XXXX';
  RAISE NOTICE '   Example: CNT-25-0001, CNT-25-0002, CNT-25-0003';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Usage:';
  RAISE NOTICE '   SELECT generate_contract_number(''company_id_here'');';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
END $$;

