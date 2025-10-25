-- ===============================
-- Link Cancelled Contracts to Vehicles
-- ===============================
-- This migration links cancelled contracts to vehicles using plate numbers
-- and updates customer names to Arabic
-- ===============================

DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_data RECORD;
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
  v_updated_contracts INTEGER := 0;
  v_updated_customers INTEGER := 0;
BEGIN
  RAISE NOTICE 'Linking cancelled contracts to vehicles for العراف...';
  
  -- Process each cancelled contract
  FOR v_contract_data IN
    SELECT * FROM (VALUES
      ('LTO2024326', '8208', 'عصام احمد عيد الدابر', '66276263'),
      ('LTO202444', '7072', 'يوسف العويدي لخليل', '72119703'),
      ('LTO2024312', '4016', 'سلمى عبد الله', '30534902'),
      ('LTO2024139', '7036', 'عصام ابراهيم عبد الله', '30777645'),
      ('MR202475', '7038', 'ثامر السعيد', '30067536'),
      ('LTO2024276', '8209', 'سعيد الهلالي', '33333971'),
      ('LTO202430', '8205', 'حمزة سرونجا', '50795709'),
      ('LTO202412', '8212', 'ريجب كارت', '74462697'),
      ('LTO2024281', '21860', 'محمد العريشي', '66816813'),
      ('LTO202433', '8203', 'محمد عماد النعماني', '51230549'),
      ('LTO2024108', '856589', 'سجاد جول', '30092501'),
      ('LTO202457', '5898', 'محمد سراج الدين', '31184659'),
      ('LTO2024126', '8209', 'مأمون احمد', '30034843'),
      ('LTO202426', '4016', 'ناصر لحسن', '55064714'),
      ('LTO202417', '8213', 'يحي هلال الصغري', '31310330'),
      ('LTO202443', '8208', 'محمد ابرار عبد الحنان', '70505396'),
      ('LTO202411', '4014', 'محمد علي خالد', '50584650'),
      ('LTO2024290', '906077', 'صدام الفلاح', '55031297'),
      ('LTO2024311', '4016', 'محمد حسن عمر محمد', '50131342'),
      ('Ret-2018202', '8207', 'حسن الفكي', '33211272'),
      ('LTO202434', '8204', 'حق نواز رحيم بخش', '33048081'),
      ('LTO2024267', '8208', 'حمزة حسين', '71348615')
    ) AS t(contract_number, plate, customer_name, phone)
  LOOP
    -- Find vehicle
    SELECT id INTO v_vehicle_id 
    FROM vehicles 
    WHERE plate_number = v_contract_data.plate 
    AND company_id = v_company_id 
    LIMIT 1;
    
    IF v_vehicle_id IS NULL THEN
      RAISE NOTICE 'Vehicle not found for plate: %', v_contract_data.plate;
      CONTINUE;
    END IF;
    
    -- Find or create customer
    SELECT id INTO v_customer_id 
    FROM customers 
    WHERE phone = v_contract_data.phone 
    AND company_id = v_company_id 
    LIMIT 1;
    
    IF v_customer_id IS NULL THEN
      -- Create customer with Arabic name
      BEGIN
        WITH next_code AS (
          SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
          FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
        )
        INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
        SELECT v_company_id, 'individual', v_contract_data.customer_name, v_contract_data.phone, 
               'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
        FROM next_code
        RETURNING id INTO v_customer_id;
        
        v_updated_customers := v_updated_customers + 1;
      EXCEPTION WHEN unique_violation THEN
        SELECT id INTO v_customer_id FROM customers WHERE phone = v_contract_data.phone AND company_id = v_company_id LIMIT 1;
        UPDATE customers SET first_name = v_contract_data.customer_name, updated_at = NOW() WHERE id = v_customer_id;
        v_updated_customers := v_updated_customers + 1;
      END;
    ELSE
      -- Update customer name to Arabic
      UPDATE customers 
      SET first_name = v_contract_data.customer_name, updated_at = NOW() 
      WHERE id = v_customer_id;
      v_updated_customers := v_updated_customers + 1;
    END IF;
    
    -- Find and update cancelled contract
    SELECT id INTO v_contract_id
    FROM contracts
    WHERE contract_number = v_contract_data.contract_number
    AND company_id = v_company_id
    AND status = 'cancelled'
    LIMIT 1;
    
    IF v_contract_id IS NOT NULL THEN
      -- Update contract with vehicle and customer links
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
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========== Cancelled Contracts Linking Complete ==========';
  RAISE NOTICE '✅ Updated Contracts: %', v_updated_contracts;
  RAISE NOTICE '✅ Updated Customers: %', v_updated_customers;
  RAISE NOTICE '===========================================================';
END $$;

-- Summary
SELECT 
  'Updated Cancelled Contracts Summary' as metric,
  '' as value
  
UNION ALL SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', ''

UNION ALL SELECT 
  'Cancelled Contracts WITH Vehicles:',
  COUNT(*)::text
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'cancelled'
AND vehicle_id IS NOT NULL

UNION ALL SELECT 
  'Cancelled Contracts WITHOUT Vehicles:',
  COUNT(*)::text
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'cancelled'
AND vehicle_id IS NULL

UNION ALL SELECT 
  'Total Cancelled Contracts:',
  COUNT(*)::text
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'cancelled';
