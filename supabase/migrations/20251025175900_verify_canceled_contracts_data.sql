-- ===============================
-- Verification: Check Canceled Contracts Have Full Information
-- ===============================
-- Purpose: Ensure all canceled contracts have complete data for viewing
-- Date: 2025-10-25
-- ===============================

-- Check for canceled contracts with missing critical information
DO $$
DECLARE
  v_missing_customer INTEGER := 0;
  v_missing_vehicle INTEGER := 0;
  v_missing_dates INTEGER := 0;
  v_missing_amounts INTEGER := 0;
  v_total_canceled INTEGER := 0;
  v_contract RECORD;
BEGIN
  -- Count total canceled contracts
  SELECT COUNT(*) INTO v_total_canceled
  FROM contracts
  WHERE status = 'cancelled';
  
  RAISE NOTICE '====== Canceled Contracts Verification ======';
  RAISE NOTICE 'Total canceled contracts: %', v_total_canceled;
  
  -- Check for missing customer information
  SELECT COUNT(*) INTO v_missing_customer
  FROM contracts
  WHERE status = 'cancelled'
  AND customer_id IS NULL;
  
  IF v_missing_customer > 0 THEN
    RAISE WARNING '% canceled contracts missing customer information', v_missing_customer;
    
    -- List them
    FOR v_contract IN
      SELECT id, contract_number, contract_date
      FROM contracts
      WHERE status = 'cancelled'
      AND customer_id IS NULL
      LIMIT 10
    LOOP
      RAISE WARNING '  - Contract %: No customer linked', v_contract.contract_number;
    END LOOP;
  ELSE
    RAISE NOTICE '✓ All canceled contracts have customer information';
  END IF;
  
  -- Check for missing vehicle information
  SELECT COUNT(*) INTO v_missing_vehicle
  FROM contracts
  WHERE status = 'cancelled'
  AND vehicle_id IS NULL;
  
  IF v_missing_vehicle > 0 THEN
    RAISE WARNING '% canceled contracts missing vehicle information', v_missing_vehicle;
    
    -- List them
    FOR v_contract IN
      SELECT id, contract_number, contract_date, customer_id
      FROM contracts
      WHERE status = 'cancelled'
      AND vehicle_id IS NULL
      LIMIT 10
    LOOP
      RAISE WARNING '  - Contract %: No vehicle linked', v_contract.contract_number;
    END LOOP;
  ELSE
    RAISE NOTICE '✓ All canceled contracts have vehicle information';
  END IF;
  
  -- Check for missing dates
  SELECT COUNT(*) INTO v_missing_dates
  FROM contracts
  WHERE status = 'cancelled'
  AND (start_date IS NULL OR end_date IS NULL);
  
  IF v_missing_dates > 0 THEN
    RAISE WARNING '% canceled contracts missing date information', v_missing_dates;
    
    -- List them
    FOR v_contract IN
      SELECT id, contract_number, start_date, end_date
      FROM contracts
      WHERE status = 'cancelled'
      AND (start_date IS NULL OR end_date IS NULL)
      LIMIT 10
    LOOP
      RAISE WARNING '  - Contract %: Start: %, End: %', 
        v_contract.contract_number, v_contract.start_date, v_contract.end_date;
    END LOOP;
  ELSE
    RAISE NOTICE '✓ All canceled contracts have date information';
  END IF;
  
  -- Check for missing amounts
  SELECT COUNT(*) INTO v_missing_amounts
  FROM contracts
  WHERE status = 'cancelled'
  AND (monthly_amount IS NULL OR monthly_amount = 0);
  
  IF v_missing_amounts > 0 THEN
    RAISE WARNING '% canceled contracts missing amount information', v_missing_amounts;
    
    -- List them
    FOR v_contract IN
      SELECT id, contract_number, monthly_amount, contract_amount
      FROM contracts
      WHERE status = 'cancelled'
      AND (monthly_amount IS NULL OR monthly_amount = 0)
      LIMIT 10
    LOOP
      RAISE WARNING '  - Contract %: Monthly: %, Total: %', 
        v_contract.contract_number, v_contract.monthly_amount, v_contract.contract_amount;
    END LOOP;
  ELSE
    RAISE NOTICE '✓ All canceled contracts have amount information';
  END IF;
  
  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '====== Summary ======';
  RAISE NOTICE 'Total Issues Found: %', v_missing_customer + v_missing_vehicle + v_missing_dates + v_missing_amounts;
  
  IF v_missing_customer + v_missing_vehicle + v_missing_dates + v_missing_amounts = 0 THEN
    RAISE NOTICE '✓ All canceled contracts have complete information';
  ELSE
    RAISE WARNING '⚠ Some canceled contracts need data fixes';
  END IF;
  RAISE NOTICE '=====================';
END $$;

-- Create a detailed view of all canceled contracts for review
CREATE OR REPLACE VIEW canceled_contracts_details AS
SELECT 
  c.id,
  c.contract_number,
  c.contract_date,
  c.start_date,
  c.end_date,
  c.status,
  c.monthly_amount,
  c.contract_amount,
  
  -- Customer details
  CASE 
    WHEN cust.customer_type = 'individual' 
    THEN cust.first_name || ' ' || COALESCE(cust.last_name, '')
    ELSE cust.company_name
  END as customer_name,
  cust.phone as customer_phone,
  cust.email as customer_email,
  
  -- Vehicle details
  v.plate_number as vehicle_plate,
  v.make as vehicle_make,
  v.model as vehicle_model,
  v.year as vehicle_year,
  v.status as vehicle_status,
  
  -- Data completeness check
  CASE WHEN c.customer_id IS NULL THEN '❌ Missing Customer' ELSE '✓' END as customer_check,
  CASE WHEN c.vehicle_id IS NULL THEN '❌ Missing Vehicle' ELSE '✓' END as vehicle_check,
  CASE WHEN c.start_date IS NULL THEN '❌ Missing Start Date' ELSE '✓' END as start_date_check,
  CASE WHEN c.end_date IS NULL THEN '❌ Missing End Date' ELSE '✓' END as end_date_check,
  CASE WHEN c.monthly_amount IS NULL OR c.monthly_amount = 0 THEN '❌ Missing Amount' ELSE '✓' END as amount_check
  
FROM contracts c
LEFT JOIN customers cust ON c.customer_id = cust.id
LEFT JOIN vehicles v ON c.vehicle_id = v.id
WHERE c.status = 'cancelled'
ORDER BY c.updated_at DESC;

-- Add comment
COMMENT ON VIEW canceled_contracts_details IS 'Detailed view of all canceled contracts with completeness checks';

-- Query to show summary statistics
SELECT 
  COUNT(*) as total_canceled,
  SUM(CASE WHEN customer_id IS NULL THEN 1 ELSE 0 END) as missing_customer,
  SUM(CASE WHEN vehicle_id IS NULL THEN 1 ELSE 0 END) as missing_vehicle,
  SUM(CASE WHEN start_date IS NULL THEN 1 ELSE 0 END) as missing_start_date,
  SUM(CASE WHEN end_date IS NULL THEN 1 ELSE 0 END) as missing_end_date,
  SUM(CASE WHEN monthly_amount IS NULL OR monthly_amount = 0 THEN 1 ELSE 0 END) as missing_amount
FROM contracts
WHERE status = 'cancelled';
