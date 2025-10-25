-- Batch 1 (50 contracts)


-- Process LTO2024139 / 7036
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7036' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430777645' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'issam abdallah', '97430777645', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430777645' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'issam abdallah', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024139' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7036', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO20249 / 749762
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '749762' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433648377' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'MEHRAN TABIB TABIB HUSSAIN', '97433648377', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433648377' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'MEHRAN TABIB TABIB HUSSAIN', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO20249' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '749762', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018184 / 711464
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '711464' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'snoonu snoonu', '97433211272', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'snoonu snoonu', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018184' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '711464', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202453 / 7071
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7071' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466607498' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'AHMED BEN DHAOU', '97466607498', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466607498' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'AHMED BEN DHAOU', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202453' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7071', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR2024182 / 7078
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7078' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97471310005' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'haythem souissi', '97471310005', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97471310005' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'haythem souissi', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR2024182' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7078', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018200 / 2774
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2774' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'snoonu snoonu', '97433211272', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'snoonu snoonu', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018200' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2774', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024141 / 7060
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7060' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430743344' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'bannour rekaia', '97430743344', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430743344' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'bannour rekaia', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024141' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7060', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202422 / 2771
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2771' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97470476000' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'AHMED ABBAS ELDAWO ELHASHMI', '97470476000', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97470476000' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'AHMED ABBAS ELDAWO ELHASHMI', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202422' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2771', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202481 / 10853
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10853' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430488852' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'frank williams', '97430488852', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430488852' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'frank williams', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202481' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10853', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024339 / 706150
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '706150' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97471886388' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'marwen safsafi', '97471886388', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97471886388' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'marwen safsafi', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024339' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '706150', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process 276 / 706150
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '706150' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430033188' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'hassan sharif', '97430033188', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430033188' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'hassan sharif', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = '276' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '706150', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR2024155 / 749762
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '749762' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430504430' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'abdelghani abboud', '97430504430', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430504430' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'abdelghani abboud', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR2024155' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '749762', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-412264 / 381247
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '381247' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430060107' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'احمد جمعة', '97430060107', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430060107' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'احمد جمعة', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-412264' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '381247', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024322 / 7063
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7063' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455992530' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'said chenouf', '97455992530', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455992530' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'said chenouf', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024322' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7063', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202429 / 2767
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2767' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433779853' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'Mohammed ali Fetoui', '97433779853', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433779853' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'Mohammed ali Fetoui', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202429' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2767', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202473 / 754705
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '754705' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430158700' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'faisal iqbal', '97430158700', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430158700' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'faisal iqbal', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202473' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '754705', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018189 / 2772
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2772' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'snoonu snoonu', '97433211272', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'snoonu snoonu', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018189' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2772', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202464 / 7078
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7078' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466050616' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'shahid rehman', '97466050616', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466050616' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'shahid rehman', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202464' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7078', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024108 / 856589
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '856589' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430092501' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'sajjad gul', '97430092501', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430092501' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'sajjad gul', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024108' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '856589', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-408522 / 2767
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2767' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97477122519' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'عبد الغفور درار', '97477122519', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97477122519' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'عبد الغفور درار', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-408522' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2767', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR2024181 / 7057
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7057' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97471105390' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'MOHAMED AMINE SALEM', '97471105390', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97471105390' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'MOHAMED AMINE SALEM', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR2024181' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7057', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202490 / 563829
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '563829' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466406305' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'haytham zarrouk', '97466406305', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466406305' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'haytham zarrouk', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202490' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '563829', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018185 / 893408
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '893408' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'snoonu snoonu', '97433211272', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'snoonu snoonu', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018185' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '893408', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024310 / 8203
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '8203' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430109102' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'kaies ayari', '97430109102', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430109102' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'kaies ayari', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024310' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '8203', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018220 / 10174
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10174' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'snoonu snoonu', '97433211272', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'snoonu snoonu', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018220' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10174', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018219 / 9902
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '9902' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'snoonu snoonu', '97433211272', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'snoonu snoonu', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018219' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '9902', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-399591 / 2782
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2782' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97477517797' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'شرفي عبد الله', '97477517797', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97477517797' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'شرفي عبد الله', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-399591' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2782', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202428 / 4017
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '4017' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97450792055' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'SOUFIANE BESSAOUDI', '97450792055', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97450792055' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'SOUFIANE BESSAOUDI', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202428' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '4017', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-938047-996 / 862165
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '862165' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455554627' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'محمد عبد الله سلمان', '97455554627', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455554627' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'محمد عبد الله سلمان', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-938047-996' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '862165', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202427 / 5889
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '5889' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430305808' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'AYMEN HAMADI', '97430305808', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430305808' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'AYMEN HAMADI', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202427' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '5889', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018223 / 646507
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '646507' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'snoonu snoonu', '97433211272', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'snoonu snoonu', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018223' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '646507', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024100 / 847601
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '847601' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430200442' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'tarak tunisia', '97430200442', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430200442' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'tarak tunisia', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024100' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '847601', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202426 / 4016
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '4016' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455064714' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'Nacer Lahcene', '97455064714', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455064714' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'Nacer Lahcene', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202426' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '4016', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024252 / 721440
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '721440' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433670129' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mahdi yousif', '97433670129', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433670129' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mahdi yousif', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024252' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '721440', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018218 / 10189
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10189' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'snoonu snoonu', '97433211272', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'snoonu snoonu', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018218' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10189', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024316 / 749762
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '749762' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97450447989' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'yahia sakhri', '97450447989', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97450447989' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'yahia sakhri', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024316' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '749762', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process In201893 / 761292
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '761292' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433344021' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'abdelazim pro', '97433344021', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433344021' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'abdelazim pro', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In201893' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '761292', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202485 / 10849
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10849' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430316583' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'raphael denu', '97430316583', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430316583' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'raphael denu', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202485' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10849', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024341 / 7036
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7036' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430777645' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'issam abdallah', '97430777645', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430777645' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'issam abdallah', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024341' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7036', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024130 / 7056
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7056' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97474488904' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'EIHAB ABDALLA', '97474488904', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97474488904' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'EIHAB ABDALLA', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024130' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7056', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024126 / 8209
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '8209' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430034843' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'MAMOUN AHMED', '97430034843', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430034843' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'MAMOUN AHMED', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024126' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '8209', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-421999 / 10853
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10853' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97450643428' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'عبد الحميد عترون', '97450643428', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97450643428' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'عبد الحميد عترون', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-421999' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10853', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202411 / 4014
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '4014' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97450584650' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'MUHAMMAD ALI KHALID', '97450584650', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97450584650' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'MUHAMMAD ALI KHALID', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202411' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '4014', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018210 / 816508
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '816508' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'snoonu snoonu', '97433211272', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'snoonu snoonu', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018210' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '816508', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024288 / 2634
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2634' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455935204' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ahmed fadil', '97455935204', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455935204' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ahmed fadil', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024288' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2634', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-414082 / 10851
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10851' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455025546' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'اسلام عثمان محمدين', '97455025546', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455025546' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'اسلام عثمان محمدين', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-414082' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10851', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202487 / 741277
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '741277' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430636173' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'eric naiko', '97430636173', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430636173' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'eric naiko', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202487' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '741277', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018199 / 856878
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '856878' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'snoonu snoonu', '97433211272', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433211272' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'snoonu snoonu', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018199' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '856878', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR2024234 / 9902
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '9902' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97471105390' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'MOHAMED AMINE SALEM', '97471105390', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97471105390' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'MOHAMED AMINE SALEM', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR2024234' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '9902', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-406129 / 856718
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '856718' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '66553638' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'حسان بو علاق', '66553638', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '66553638' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'حسان بو علاق', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-406129' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '856718', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;
