-- Batch 8 (42 contracts)


-- Process LTO202431 / 7061
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7061' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455222976' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'Abdulhanna abulhashem', '97455222976', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455222976' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'Abdulhanna abulhashem', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202431' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7061', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024116 / 5898
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '5898' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97450405018' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ALI ABBAS', '97450405018', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97450405018' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ALI ABBAS', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024116' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '5898', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024290 / 906077
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '906077' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455031297' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'saddam el falah', '97455031297', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455031297' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'saddam el falah', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024290' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '906077', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018207 / 893410
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '893410' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018207' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '893410', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024150 / 8204
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '8204' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466205223' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'HABIB KHELIFI', '97466205223', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466205223' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'HABIB KHELIFI', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024150' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '8204', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024306 / 862169
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '862169' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455039533' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'tarek boutemedjet', '97455039533', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455039533' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'tarek boutemedjet', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024306' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '862169', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process In2018173 / 570468
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '570468' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97470539031' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mubarek golcha', '97470539031', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97470539031' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mubarek golcha', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In2018173' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '570468', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024298 / 754436
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '754436' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024298' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '754436', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-421408 / 2771
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2771' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97470220390' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ماهر مهيري', '97470220390', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97470220390' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ماهر مهيري', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-421408' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2771', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018191 / 2781
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2781' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018191' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2781', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202484 / 816508
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '816508' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430637515' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'foster ngo', '97430637515', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430637515' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'foster ngo', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202484' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '816508', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024238 / 817009
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '817009' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97471348615' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'hamze hussein', '97471348615', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97471348615' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'hamze hussein', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024238' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '817009', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-950558-871 / 9902
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '9902' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97470897519' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'زين العابدين ادريس', '97470897519', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97470897519' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'زين العابدين ادريس', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-950558-871' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '9902', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024308 / 10064
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10064' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433226604' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'wassim chatmen', '97433226604', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433226604' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'wassim chatmen', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024308' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10064', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024325 / 711289
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '711289' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455304449' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mohamed ahmed', '97455304449', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455304449' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mohamed ahmed', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024325' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '711289', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO20243 / 21849
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '21849' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433766022' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'MEDHAT BAKRY', '97433766022', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433766022' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'MEDHAT BAKRY', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO20243' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '21849', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202452 / 9999
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '9999' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97460099391' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'KHALIL CHMENGUI', '97460099391', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97460099391' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'KHALIL CHMENGUI', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202452' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '9999', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202472 / 7056
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7056' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430529501' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'almunzer ali', '97430529501', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430529501' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'almunzer ali', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202472' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7056', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process In2018157 / 10858
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10858' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97471581990' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'prince boateng', '97471581990', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97471581990' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'prince boateng', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In2018157' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10858', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024250 / 7078
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7078' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466981255' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ABUELMAALI ISMAIL', '97466981255', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466981255' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ABUELMAALI ISMAIL', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024250' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7078', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202420 / 7066
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7066' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466947604' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'Awad el karim Abdelmonim', '97466947604', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466947604' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'Awad el karim Abdelmonim', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202420' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7066', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018211 / 721440
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '721440' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018211' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '721440', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR2024121 / 10854
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10854' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97450770260' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'Sofiene Ben salah', '97450770260', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97450770260' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'Sofiene Ben salah', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR2024121' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10854', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024283 / 862165
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '862165' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97471202018' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'fatima akka', '97471202018', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97471202018' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'fatima akka', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024283' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '862165', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR2024110 / 7057
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7057' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430692099' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'riaz khan', '97430692099', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430692099' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'riaz khan', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR2024110' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7057', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202444 / 7072
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7072' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97431466795' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'Saif ur rehman mohammad Ramzan', '97431466795', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97431466795' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'Saif ur rehman mohammad Ramzan', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202444' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7072', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024311 / 4016
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '4016' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97450131342' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mohamed hassen omer mohamed', '97450131342', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97450131342' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mohamed hassen omer mohamed', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024311' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '4016', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018183 / 2782
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2782' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018183' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2782', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202499 / 7035
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7035' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433787589' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'HICHEM ABDERAHIM', '97433787589', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433787589' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'HICHEM ABDERAHIM', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202499' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7035', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024101 / 7076
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7076' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430666450' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'issam hamdani', '97430666450', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430666450' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'issam hamdani', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024101' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7076', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024142 / 7035
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7035' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97477909052' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'MOJEEB AMIN', '97477909052', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97477909052' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'MOJEEB AMIN', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024142' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7035', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202425 / 557098
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '557098' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430532292' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ANOUER MATHLOUTHI', '97430532292', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430532292' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ANOUER MATHLOUTHI', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202425' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '557098', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024260 / 751340
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '751340' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = 'nan' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'MOHAMED KAMEL OSMAN ABDALLA', 'nan', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = 'nan' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'MOHAMED KAMEL OSMAN ABDALLA', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024260' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '751340', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018188 / 10666
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10666' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018188' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10666', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-302522-016 / 7057
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7057' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97470882208' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'بسام فتحي اللوز', '97470882208', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97470882208' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'بسام فتحي اللوز', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-302522-016' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7057', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024177 / 5888
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '5888' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97477024940' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'atef sghairi', '97477024940', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97477024940' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'atef sghairi', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024177' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '5888', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-404457 / 2775
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2775' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97451476442' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'أنور جنبيني', '97451476442', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97451476442' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'أنور جنبيني', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-404457' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2775', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202471 / 7041
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7041' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97431492385' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'abdul basit khan', '97431492385', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97431492385' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'abdul basit khan', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202471' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7041', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024281 / 21860
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '21860' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433333971' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'saeed al-hebabi', '97433333971', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433333971' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'saeed al-hebabi', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024281' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '21860', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024255 / 10672
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10672' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97477179042' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ganga chaudhary', '97477179042', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97477179042' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ganga chaudhary', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024255' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10672', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202456 / 21875
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '21875' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466653585' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'SAID HILALI', '97466653585', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466653585' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'SAID HILALI', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202456' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '21875', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018186 / 10171
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10171' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018186' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10171', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;
