-- ================================================================
-- FIX CONTRACT AMOUNTS - AUTO CALCULATE FROM MONTHLY RATE × DURATION
-- ================================================================
-- Recalculates contract_amount for all contracts based on:
-- contract_amount = monthly_amount × duration_in_months
-- ================================================================

-- ================================================================
-- FUNCTION 1: Calculate Contract Amount for Single Contract
-- ================================================================
CREATE OR REPLACE FUNCTION calculate_contract_amount(contract_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_duration_days INTEGER;
  v_duration_months DECIMAL(10,2);
  v_calculated_amount DECIMAL(15,3);
BEGIN
  -- Get contract details
  SELECT * INTO v_contract
  FROM contracts
  WHERE id = contract_id_param;

  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contract not found: %', contract_id_param;
  END IF;

  -- Calculate duration in days
  v_duration_days := v_contract.end_date - v_contract.start_date;
  
  -- Calculate duration in months (rounded to 2 decimals)
  v_duration_months := ROUND(v_duration_days::DECIMAL / 30, 2);
  
  -- If duration is less than 1 month, set to 1
  IF v_duration_months < 1 THEN
    v_duration_months := 1;
  END IF;

  -- Calculate contract amount
  -- contract_amount = monthly_amount × duration_in_months
  v_calculated_amount := (v_contract.monthly_amount * v_duration_months);

  -- Update contract
  UPDATE contracts
  SET 
    contract_amount = v_calculated_amount,
    updated_at = NOW()
  WHERE id = contract_id_param;

  RAISE NOTICE 'Contract %: Duration=% days (% months), Monthly=%, Calculated Amount=%',
    v_contract.contract_number, v_duration_days, v_duration_months, 
    v_contract.monthly_amount, v_calculated_amount;
END;
$$;

-- ================================================================
-- FUNCTION 2: Recalculate All Contract Amounts for Company
-- ================================================================
CREATE OR REPLACE FUNCTION recalculate_all_contract_amounts(company_id_param UUID)
RETURNS TABLE (
  contract_id UUID,
  contract_number VARCHAR(50),
  old_amount DECIMAL(15,3),
  new_amount DECIMAL(15,3),
  monthly_amount DECIMAL(15,3),
  duration_months DECIMAL(10,2),
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_count INTEGER := 0;
  v_errors INTEGER := 0;
  v_old_amount DECIMAL(15,3);
  v_new_amount DECIMAL(15,3);
  v_duration_days INTEGER;
  v_duration_months DECIMAL(10,2);
BEGIN
  RAISE NOTICE '🔄 Recalculating contract amounts for company: %', company_id_param;

  -- Loop through all contracts (active and completed)
  FOR v_contract IN
    SELECT *
    FROM contracts
    WHERE company_id = company_id_param
      AND contracts.status IN ('active', 'completed', 'draft', 'suspended')
      AND contracts.monthly_amount > 0 -- Only process contracts with monthly amount
    ORDER BY contract_number
  LOOP
    BEGIN
      v_old_amount := v_contract.contract_amount;
      
      -- Calculate duration
      v_duration_days := v_contract.end_date - v_contract.start_date;
      v_duration_months := ROUND(v_duration_days::DECIMAL / 30, 2);
      
      IF v_duration_months < 1 THEN
        v_duration_months := 1;
      END IF;

      -- Calculate new amount
      v_new_amount := v_contract.monthly_amount * v_duration_months;

      -- Update contract
      UPDATE contracts
      SET 
        contract_amount = v_new_amount,
        updated_at = NOW()
      WHERE id = v_contract.id;

      v_count := v_count + 1;

      -- Return success row
      RETURN QUERY SELECT 
        v_contract.id,
        v_contract.contract_number,
        v_old_amount,
        v_new_amount,
        v_contract.monthly_amount,
        v_duration_months,
        'updated'::TEXT;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING 'Failed to calculate amount for contract %: %', v_contract.contract_number, SQLERRM;
      
      -- Return error row
      RETURN QUERY SELECT 
        v_contract.id,
        v_contract.contract_number,
        v_contract.contract_amount,
        0::DECIMAL(15,3),
        v_contract.monthly_amount,
        0::DECIMAL(10,2),
        ('error: ' || SQLERRM)::TEXT;
    END;
  END LOOP;

  RAISE NOTICE '✅ Completed: % contracts updated, % errors', v_count, v_errors;
END;
$$;

-- ================================================================
-- FUNCTION 3: Auto-trigger to calculate on INSERT/UPDATE
-- ================================================================
CREATE OR REPLACE FUNCTION trigger_calculate_contract_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration_days INTEGER;
  v_duration_months DECIMAL(10,2);
BEGIN
  -- Only recalculate if monthly_amount, start_date, or end_date changed
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       NEW.monthly_amount != OLD.monthly_amount OR
       NEW.start_date != OLD.start_date OR
       NEW.end_date != OLD.end_date
     )) THEN
    
    -- Calculate duration
    v_duration_days := NEW.end_date - NEW.start_date;
    v_duration_months := ROUND(v_duration_days::DECIMAL / 30, 2);
    
    IF v_duration_months < 1 THEN
      v_duration_months := 1;
    END IF;

    -- Auto-calculate contract_amount
    IF NEW.monthly_amount > 0 THEN
      NEW.contract_amount := NEW.monthly_amount * v_duration_months;
      
      RAISE NOTICE 'Auto-calculated contract amount: % (% months × %)',
        NEW.contract_amount, v_duration_months, NEW.monthly_amount;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS auto_calculate_contract_amount ON contracts;

-- Create trigger
CREATE TRIGGER auto_calculate_contract_amount
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_contract_amount();

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================
GRANT EXECUTE ON FUNCTION calculate_contract_amount(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_all_contract_amounts(UUID) TO authenticated;

-- ================================================================
-- COMMENTS
-- ================================================================
COMMENT ON FUNCTION calculate_contract_amount IS 'Calculates contract amount based on monthly_amount × duration';
COMMENT ON FUNCTION recalculate_all_contract_amounts IS 'Recalculates amounts for all contracts in a company';
COMMENT ON FUNCTION trigger_calculate_contract_amount IS 'Auto-trigger to calculate contract amount on insert/update';

-- ================================================================
-- AUTO-RUN: RECALCULATE ALL EXISTING CONTRACTS
-- ================================================================
DO $$
DECLARE
  v_company RECORD;
  v_total_updated INTEGER := 0;
  v_company_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🔄 AUTO-RECALCULATING ALL EXISTING CONTRACTS...';
  RAISE NOTICE '====================================================================';
  
  -- Loop through all companies
  FOR v_company IN
    SELECT id, name FROM companies
  LOOP
    v_company_count := v_company_count + 1;
    RAISE NOTICE '📊 Processing company: % (ID: %)', v_company.name, v_company.id;
    
    -- Recalculate all contracts for this company
    DECLARE
      v_result RECORD;
      v_updated_count INTEGER := 0;
    BEGIN
      FOR v_result IN
        SELECT * FROM recalculate_all_contract_amounts(v_company.id)
      LOOP
        IF v_result.status = 'updated' THEN
          v_updated_count := v_updated_count + 1;
          v_total_updated := v_total_updated + 1;
        END IF;
      END LOOP;
      
      RAISE NOTICE '✅ Company %: % contracts updated', v_company.name, v_updated_count;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ AUTO-RECALCULATION COMPLETED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Total Companies Processed: %', v_company_count;
  RAISE NOTICE 'Total Contracts Updated: %', v_total_updated;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 FUTURE CONTRACTS:';
  RAISE NOTICE 'All new contracts will auto-calculate via trigger!';
  RAISE NOTICE 'Formula: contract_amount = monthly_amount × (duration_days / 30)';
  RAISE NOTICE '====================================================================';
END $$;

