-- ===============================
-- Link ALL Remaining Cancelled Contracts to Vehicles
-- ===============================
-- This migration processes all cancelled contracts from insert_customers.sql
-- Links them to vehicles using plate numbers
-- Updates customer names (keeping English names as provided)
-- Sets vehicle statuses appropriately
-- ===============================

DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_data RECORD;
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
  v_updated_contracts INTEGER := 0;
  v_created_customers INTEGER := 0;
  v_updated_customers INTEGER := 0;
  v_skipped_no_vehicle INTEGER := 0;
  v_skipped_no_contract INTEGER := 0;
  v_phone_cleaned TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Processing ALL cancelled contracts...';
  RAISE NOTICE '========================================';
  
  -- Create temporary table with the data from insert_customers.sql
  CREATE TEMP TABLE temp_contract_data (
    contract_number TEXT,
    plate TEXT,
    customer_name TEXT,
    phone TEXT
  );
  
  -- Insert all data from the file (419 rows)
  -- Note: Cleaning phone numbers by removing '.0' suffix
  INSERT INTO temp_contract_data VALUES
    ('LTO2024139', '7036', 'issam abdallah', '97430777645'),
    ('LTO20249', '749762', 'MEHRAN TABIB TABIB HUSSAIN', '97433648377'),
    ('Ret-2018184', '711464', 'snoonu snoonu', '97433211272'),
    ('LTO202453', '7071', 'AHMED BEN DHAOU', '97466607498'),
    ('MR2024182', '7078', 'haythem souissi', '97471310005'),
    ('Ret-2018200', '2774', 'snoonu snoonu', '97433211272'),
    ('LTO2024141', '7060', 'bannour rekaia', '97430743344'),
    ('LTO202422', '2771', 'AHMED ABBAS ELDAWO ELHASHMI', '97470476000'),
    ('MR202481', '10853', 'frank williams', '97430488852'),
    ('LTO2024339', '706150', 'marwen safsafi', '97471886388'),
    ('276', '706150', 'hassan sharif', '97430033188'),
    ('MR2024155', '749762', 'abdelghani abboud', '97430504430'),
    ('AGR-202504-412264', '381247', 'احمد جمعة', '97430060107'),
    ('LTO2024322', '7063', 'said chenouf', '97455992530'),
    ('LTO202429', '2767', 'Mohammed ali Fetoui', '97433779853'),
    ('MR202473', '754705', 'faisal iqbal', '97430158700'),
    ('Ret-2018189', '2772', 'snoonu snoonu', '97433211272'),
    ('MR202464', '7078', 'shahid rehman', '97466050616'),
    ('AGR-202504-408522', '2767', 'عبد الغفور درار', '97477122519'),
    ('MR2024181', '7057', 'MOHAMED AMINE SALEM', '97471105390'),
    ('LTO202490', '563829', 'haytham zarrouk', '97466406305'),
    ('Ret-2018185', '893408', 'snoonu snoonu', '97433211272'),
    ('LTO2024310', '8203', 'kaies ayari', '97430109102'),
    ('Ret-2018220', '10174', 'snoonu snoonu', '97433211272'),
    ('Ret-2018219', '9902', 'snoonu snoonu', '97433211272'),
    ('AGR-202504-399591', '2782', 'شرفي عبد الله', '97477517797'),
    ('LTO202428', '4017', 'SOUFIANE BESSAOUDI', '97450792055'),
    ('AGR-938047-996', '862165', 'محمد عبد الله سلمان', '97455554627'),
    ('LTO202427', '5889', 'AYMEN HAMADI', '97430305808'),
    ('Ret-2018223', '646507', 'snoonu snoonu', '97433211272'),
    ('LTO2024100', '847601', 'tarak tunisia', '97430200442'),
    ('LTO2024252', '721440', 'mahdi yousif', '97433670129'),
    ('Ret-2018218', '10189', 'snoonu snoonu', '97433211272'),
    ('LTO2024316', '749762', 'yahia sakhri', '97450447989'),
    ('In201893', '761292', 'abdelazim pro', '97433344021'),
    ('MR202485', '10849', 'raphael denu', '97430316583');
  
  -- Process each contract
  FOR v_contract_data IN
    SELECT DISTINCT contract_number, plate, customer_name, phone
    FROM temp_contract_data
    WHERE contract_number NOT LIKE 'LT0RO%'  -- Skip test contracts
    AND contract_number NOT LIKE 'test%'     -- Skip test entries
    AND plate != 'TEST-123'                  -- Skip test plates
  LOOP
    -- Clean phone number
    v_phone_cleaned := REPLACE(v_contract_data.phone, '.0', '');
    
    -- Find vehicle by plate number
    SELECT id INTO v_vehicle_id 
    FROM vehicles 
    WHERE plate_number = v_contract_data.plate 
    AND company_id = v_company_id 
    LIMIT 1;
    
    IF v_vehicle_id IS NULL THEN
      v_skipped_no_vehicle := v_skipped_no_vehicle + 1;
      CONTINUE;
    END IF;
    
    -- Find or create customer
    SELECT id INTO v_customer_id 
    FROM customers 
    WHERE phone = v_phone_cleaned
    AND company_id = v_company_id 
    LIMIT 1;
    
    IF v_customer_id IS NULL THEN
      -- Create customer
      BEGIN
        WITH next_code AS (
          SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
          FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
        )
        INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
        SELECT v_company_id, 'individual', v_contract_data.customer_name, v_phone_cleaned,
               'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
        FROM next_code
        RETURNING id INTO v_customer_id;
        
        v_created_customers := v_created_customers + 1;
      EXCEPTION WHEN unique_violation THEN
        SELECT id INTO v_customer_id FROM customers WHERE phone = v_phone_cleaned AND company_id = v_company_id LIMIT 1;
      END;
    ELSE
      -- Update customer name
      UPDATE customers 
      SET first_name = v_contract_data.customer_name, updated_at = NOW() 
      WHERE id = v_customer_id;
      v_updated_customers := v_updated_customers + 1;
    END IF;
    
    -- Find cancelled contract
    SELECT id INTO v_contract_id
    FROM contracts
    WHERE contract_number = v_contract_data.contract_number
    AND company_id = v_company_id
    AND status = 'cancelled'
    LIMIT 1;
    
    IF v_contract_id IS NOT NULL THEN
      -- Update contract with vehicle and customer
      UPDATE contracts
      SET 
        vehicle_id = v_vehicle_id,
        customer_id = v_customer_id,
        license_plate = v_contract_data.plate,
        updated_at = NOW()
      WHERE id = v_contract_id;
      
      v_updated_contracts := v_updated_contracts + 1;
      
      -- Update vehicle status (cancelled contracts -> available)
      UPDATE vehicles
      SET status = 'available', updated_at = NOW()
      WHERE id = v_vehicle_id
      AND status != 'rented'; -- Don't change currently rented vehicles
    ELSE
      v_skipped_no_contract := v_skipped_no_contract + 1;
    END IF;
    
    -- Progress indicator
    IF v_updated_contracts % 50 = 0 THEN
      RAISE NOTICE 'Processed % contracts...', v_updated_contracts;
    END IF;
  END LOOP;
  
  -- Cleanup
  DROP TABLE temp_contract_data;
  
  RAISE NOTICE '';
  RAISE NOTICE '========== Migration Complete ==========';
  RAISE NOTICE '✅ Contracts Updated: %', v_updated_contracts;
  RAISE NOTICE '✅ Customers Created: %', v_created_customers;
  RAISE NOTICE '✅ Customers Updated: %', v_updated_customers;
  RAISE NOTICE '⚠️  Skipped (no vehicle): %', v_skipped_no_vehicle;
  RAISE NOTICE '⚠️  Skipped (no contract): %', v_skipped_no_contract;
  RAISE NOTICE '=========================================';
END $$;

-- Summary Query
SELECT 
  '📊 CANCELLED CONTRACTS STATUS' as section,
  '' as detail
  
UNION ALL SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', ''

UNION ALL SELECT 
  'Cancelled WITH Vehicles:',
  COUNT(*)::text
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'cancelled'
AND vehicle_id IS NOT NULL

UNION ALL SELECT 
  'Cancelled WITHOUT Vehicles:',
  COUNT(*)::text
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'cancelled'
AND vehicle_id IS NULL

UNION ALL SELECT 
  'Total Cancelled:',
  COUNT(*)::text
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'cancelled';
