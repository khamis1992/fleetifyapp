-- ================================================================
-- UPDATE EXISTING CONTRACT NUMBERS TO SHORT FORMAT
-- ================================================================
-- Changes all existing contract numbers from long to short format
-- Old: CNT-1760811949736-H60Z96 (23 chars)
-- New: CNT-25-0001 (11 chars)
-- ================================================================

-- ================================================================
-- STEP 1: Create backup table for old contract numbers
-- ================================================================
CREATE TABLE IF NOT EXISTS contract_number_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  old_contract_number VARCHAR(100) NOT NULL,
  new_contract_number VARCHAR(50) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by TEXT DEFAULT 'migration_20251029150000'
);

CREATE INDEX IF NOT EXISTS idx_contract_number_history_contract ON contract_number_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_number_history_old_number ON contract_number_history(old_contract_number);

COMMENT ON TABLE contract_number_history IS 'Backup of old contract numbers before migration to short format';

-- ================================================================
-- STEP 2: Update contract numbers company by company
-- ================================================================
DO $$
DECLARE
  v_company RECORD;
  v_contract RECORD;
  v_company_count INTEGER := 0;
  v_total_updated INTEGER := 0;
  v_counter INTEGER;
  v_year TEXT;
  v_new_number TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🔄 UPDATING CONTRACT NUMBERS TO SHORT FORMAT...';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  
  -- Get current year
  v_year := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Loop through all companies
  FOR v_company IN
    SELECT id, name FROM companies
    ORDER BY created_at
  LOOP
    v_company_count := v_company_count + 1;
    v_counter := 0;
    
    RAISE NOTICE '📊 Processing company: % (ID: %)', v_company.name, v_company.id;
    
    -- Loop through all contracts for this company
    FOR v_contract IN
      SELECT id, contract_number, created_at
      FROM contracts
      WHERE company_id = v_company.id
      ORDER BY created_at, id
    LOOP
      v_counter := v_counter + 1;
      
      -- Generate new short contract number: CNT-YY-XXXX
      v_new_number := 'CNT-' || v_year || '-' || LPAD(v_counter::TEXT, 4, '0');
      
      -- Check if contract number needs updating (not already in short format)
      IF v_contract.contract_number != v_new_number AND 
         NOT v_contract.contract_number ~ '^CNT-\d{2}-\d{4}$' THEN
        
        -- Backup old number
        INSERT INTO contract_number_history (
          contract_id,
          old_contract_number,
          new_contract_number
        ) VALUES (
          v_contract.id,
          v_contract.contract_number,
          v_new_number
        );
        
        -- Update to new number
        UPDATE contracts
        SET 
          contract_number = v_new_number,
          updated_at = NOW()
        WHERE id = v_contract.id;
        
        v_total_updated := v_total_updated + 1;
        
        -- Log every 50 updates
        IF v_total_updated % 50 = 0 THEN
          RAISE NOTICE '   ✅ Updated % contracts so far...', v_total_updated;
        END IF;
      END IF;
    END LOOP;
    
    RAISE NOTICE '   ✓ Company "%": % contracts processed', v_company.name, v_counter;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ CONTRACT NUMBER UPDATE COMPLETED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Total Companies: %', v_company_count;
  RAISE NOTICE 'Total Contracts Updated: %', v_total_updated;
  RAISE NOTICE '';
  RAISE NOTICE '📋 New Format: CNT-YY-XXXX';
  RAISE NOTICE '   Example: CNT-25-0001, CNT-25-0002';
  RAISE NOTICE '';
  RAISE NOTICE '💾 Backup Table: contract_number_history';
  RAISE NOTICE '   Query old numbers: SELECT * FROM contract_number_history;';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 FUTURE CONTRACTS:';
  RAISE NOTICE 'All new contracts will use short format automatically!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

-- ================================================================
-- STEP 3: Verify results
-- ================================================================
DO $$
DECLARE
  v_short_format_count INTEGER;
  v_long_format_count INTEGER;
  v_total_count INTEGER;
BEGIN
  -- Count contracts with short format
  SELECT COUNT(*) INTO v_short_format_count
  FROM contracts
  WHERE contract_number ~ '^CNT-\d{2}-\d{4}$';
  
  -- Count contracts with long format
  SELECT COUNT(*) INTO v_long_format_count
  FROM contracts
  WHERE contract_number !~ '^CNT-\d{2}-\d{4}$';
  
  -- Total contracts
  SELECT COUNT(*) INTO v_total_count
  FROM contracts;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '📊 VERIFICATION RESULTS:';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Total Contracts: %', v_total_count;
  RAISE NOTICE 'Short Format (CNT-YY-XXXX): % ✅', v_short_format_count;
  RAISE NOTICE 'Long Format (Old): % %', v_long_format_count, 
    CASE WHEN v_long_format_count = 0 THEN '✅' ELSE '⚠️' END;
  RAISE NOTICE '';
  
  IF v_long_format_count > 0 THEN
    RAISE NOTICE '⚠️ WARNING: % contracts still have long format', v_long_format_count;
    RAISE NOTICE 'Run this query to see them:';
    RAISE NOTICE '  SELECT contract_number FROM contracts WHERE contract_number !~ ''^CNT-\d{2}-\d{4}$'';';
  ELSE
    RAISE NOTICE '🎉 SUCCESS: All contracts now use short format!';
  END IF;
  
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

-- ================================================================
-- ROLLBACK INSTRUCTIONS (for documentation)
-- ================================================================
-- To rollback and restore old contract numbers:
-- 
-- UPDATE contracts c
-- SET contract_number = h.old_contract_number
-- FROM contract_number_history h
-- WHERE c.id = h.contract_id;
--
-- ================================================================

