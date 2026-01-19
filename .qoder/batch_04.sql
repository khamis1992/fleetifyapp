-- Batch 4 (50 contracts)


-- Process LTO2024263 / 7053
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7053' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430138501' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'MAHDI HAMID', '97430138501', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430138501' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'MAHDI HAMID', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024263' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7053', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024149 / 7037
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7037' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97477907750' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mokhtar alil', '97477907750', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97477907750' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mokhtar alil', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024149' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7037', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process In2018159 / 10854
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10854' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433326932' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'awuah baffour', '97433326932', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433326932' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'awuah baffour', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In2018159' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10854', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024251 / 10174
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10174' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430796407' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'KIBROM AREGAWI WELDEKIDAN', '97430796407', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430796407' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'KIBROM AREGAWI WELDEKIDAN', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024251' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10174', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202448 / 8206
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '8206' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97477884170' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'Abdemoniem ismail mahmoud Mohamed', '97477884170', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97477884170' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'Abdemoniem ismail mahmoud Mohamed', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202448' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '8206', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018204 / 7073
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7073' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018204' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7073', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024265 / 856878
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '856878' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433389695' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'GIRISHKUMAR KARTHIKEYAN', '97433389695', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433389695' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'GIRISHKUMAR KARTHIKEYAN', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024265' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '856878', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024248 / 2772
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2772' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430400511' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ismail mohamed', '97430400511', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430400511' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ismail mohamed', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024248' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2772', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-055405-212 / 7063
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7063' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430623322' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'مهند حمود الظاهر', '97430623322', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430623322' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'مهند حمود الظاهر', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-055405-212' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7063', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024270 / 10197
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10197' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97450118063' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ahmed elwasila', '97450118063', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97450118063' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ahmed elwasila', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024270' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10197', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202498 / 10189
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10189' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202498' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10189', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018205 / 7039
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7039' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018205' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7039', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202483 / 751340
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '751340' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '50131833' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'prince nkansah', '50131833', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '50131833' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'prince nkansah', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202483' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '751340', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process In2018160 / 10668
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10668' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455076981' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'shadrack saky', '97455076981', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455076981' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'shadrack saky', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In2018160' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10668', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202491 / 893411
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '893411' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430004696' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'radhwan mdini', '97430004696', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430004696' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'radhwan mdini', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202491' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '893411', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018217 / 381247
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '381247' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018217' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '381247', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024297 / 556199
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '556199' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97431008858' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'yosr chamkhi', '97431008858', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97431008858' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'yosr chamkhi', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024297' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '556199', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR2024232 / 10669
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10669' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97450623375' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ABDELJALIL HATTACH', '97450623375', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97450623375' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ABDELJALIL HATTACH', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR2024232' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10669', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR2024102 / 821873
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '821873' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97450088482' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'OASIM HALDER', '97450088482', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97450088482' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'OASIM HALDER', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR2024102' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '821873', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024140 / 5895
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '5895' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466172920' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'amir ben fredj', '97466172920', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466172920' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'amir ben fredj', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024140' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '5895', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024320 / 5894
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '5894' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97472034609' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mohammed houssem dib', '97472034609', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97472034609' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mohammed houssem dib', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024320' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '5894', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-403859 / 2779
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2779' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97477227716' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'مختار عليل', '97477227716', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97477227716' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'مختار عليل', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-403859' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2779', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024247 / 548682
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '548682' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97450446192' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'QFORCE SECURITY SERVICE', '97450446192', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97450446192' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'QFORCE SECURITY SERVICE', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024247' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '548682', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-810033-532 / 8205
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '8205' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '2345654' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'dtrgfgdfg', '2345654', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '2345654' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'dtrgfgdfg', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-810033-532' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '8205', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process 308 / 381247
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '381247' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97470555993' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mustafa almustafa', '97470555993', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97470555993' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mustafa almustafa', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = '308' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '381247', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018216 / 648144
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '648144' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018216' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '648144', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024315 / 739649
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '739649' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466918182' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mohamed ncibi', '97466918182', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466918182' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mohamed ncibi', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024315' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '739649', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-463481-549 / 4014
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '4014' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430797703' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'محمد علي سليم', '97430797703', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430797703' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'محمد علي سليم', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-463481-549' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '4014', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024138 / 7040
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7040' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '31215469' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'RAFIK BELKACEM', '31215469', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '31215469' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'RAFIK BELKACEM', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024138' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7040', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202455 / 10856
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10856' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97450171785' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'AYMEN NASRA', '97450171785', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97450171785' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'AYMEN NASRA', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202455' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10856', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-418432 / 5891
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '5891' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97471503673' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'موسى حيمر', '97471503673', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97471503673' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'موسى حيمر', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-418432' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '5891', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024243 / 9999
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '9999' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433781937' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mohamed elnakhli', '97433781937', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433781937' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mohamed elnakhli', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024243' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '9999', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202468 / 7039
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7039' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97439989880' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'abrar zaib', '97439989880', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97439989880' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'abrar zaib', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202468' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7039', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202492 / 722134
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '722134' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430059056' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mouheb ouni', '97430059056', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430059056' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mouheb ouni', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202492' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '722134', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024285 / 857051
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '857051' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430586471' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'CHIHEB HEDHLI', '97430586471', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430586471' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'CHIHEB HEDHLI', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024285' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '857051', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024293 / 2774
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2774' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97451076544' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'saber dhibi', '97451076544', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97451076544' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'saber dhibi', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024293' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2774', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024338 / 2779
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2779' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466230309' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ahmed abdalla mahmoud abdalla mahmoud abdalla', '97466230309', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466230309' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ahmed abdalla mahmoud abdalla mahmoud abdalla', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024338' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2779', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024118 / 9891
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '9891' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455984233' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'DEO SSENYANJA', '97455984233', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455984233' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'DEO SSENYANJA', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024118' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '9891', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024342 / 7065
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7065' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '9745578515' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'azhari hakim khalid hakim', '9745578515', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '9745578515' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'azhari hakim khalid hakim', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024342' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7065', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024147 / 548682
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '548682' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466104053' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'salah masaad', '97466104053', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466104053' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'salah masaad', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024147' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '548682', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018225 / 893409
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '893409' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018225' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '893409', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018228 / 725473
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '725473' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018228' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '725473', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR2024236 / 2770
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2770' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97471027960' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'syed jan', '97471027960', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97471027960' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'syed jan', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR2024236' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2770', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-411671 / 5894
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '5894' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97470897519' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'عبد اللله العلواني', '97470897519', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97470897519' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'عبد اللله العلواني', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-411671' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '5894', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018221 / 822389
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '822389' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018221' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '822389', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024326 / 8208
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '8208' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97431103801' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'MOHAMMAD ADNAN SWAID', '97431103801', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97431103801' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'MOHAMMAD ADNAN SWAID', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024326' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '8208', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process In2018167 / 10850
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10850' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97477579524' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'MOHAMMED ULLAH', '97477579524', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97477579524' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'MOHAMMED ULLAH', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In2018167' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10850', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-403263 / 21849
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '21849' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466043445' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'فادي السعيدي', '97466043445', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466043445' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'فادي السعيدي', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-403263' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '21849', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024333 / 10664
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10664' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455165658' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'achraf saadaoui', '97455165658', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455165658' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'achraf saadaoui', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024333' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10664', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO20248 / 846485
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '846485' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97431115657' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'HOSSEM DHAHRI 2', '97431115657', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97431115657' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'HOSSEM DHAHRI 2', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO20248' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '846485', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;
