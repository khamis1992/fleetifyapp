-- Batch 7 (50 contracts)


-- Process In2018227 / 7078
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7078' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In2018227' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7078', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024114 / 9894
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '9894' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430058936' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'tarak hamlet', '97430058936', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430058936' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'tarak hamlet', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024114' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '9894', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024317 / 11473
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '11473' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466071051' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'imed ayari', '97466071051', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466071051' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'imed ayari', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024317' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '11473', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process 288 / 893410
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '893410' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430403800' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'AMMAR GHOZY', '97430403800', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430403800' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'AMMAR GHOZY', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = '288' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '893410', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024262 / 7067
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7067' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430108811' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ADIL ABDELKARIM', '97430108811', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430108811' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ADIL ABDELKARIM', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024262' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7067', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process In2018171 / 741277
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '741277' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97466463832' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'zafar ullah badshah', '97466463832', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97466463832' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'zafar ullah badshah', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In2018171' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '741277', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202414 / 7034
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7034' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433600885' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'Ghazi Emmad ben meddeb', '97433600885', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433600885' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'Ghazi Emmad ben meddeb', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202414' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7034', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-222397-636 / 862165
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-222397-636' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '862165', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process In2018169 / 749762
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '749762' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97470732908' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'RIZWAN BAHADAR', '97470732908', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97470732908' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'RIZWAN BAHADAR', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In2018169' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '749762', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process In2018170 / 746956
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '746956' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97451145953' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'MUHAMMAD GUL', '97451145953', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97451145953' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'MUHAMMAD GUL', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In2018170' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '746956', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024271 / 10189
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10189' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024271' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10189', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024312 / 4016
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '4016' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97471189859' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ahmed ali mawlod abdalla', '97471189859', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97471189859' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ahmed ali mawlod abdalla', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024312' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '4016', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-592533-558 / 7041
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7041' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97470692014' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'احمد عبدالله محمد', '97470692014', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97470692014' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'احمد عبدالله محمد', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-592533-558' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7041', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202415 / 8214
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '8214' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430330103' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'Zyed Yahmadi', '97430330103', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430330103' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'Zyed Yahmadi', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202415' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '8214', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202477 / 749403
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '749403' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202477' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '749403', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-402280 / 856715
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '856715' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-402280' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '856715', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202494 / 10197
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10197' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97477860733' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'KOSAY HAMMAMI', '97477860733', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97477860733' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'KOSAY HAMMAMI', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202494' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10197', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-424958 / 2766
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2766' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97470007983' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'محمد محمد احمد', '97470007983', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97470007983' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'محمد محمد احمد', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-424958' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2766', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024113 / 893410
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '893410' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024113' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '893410', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024235 / 2773
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2773' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024235' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2773', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process In2018166 / 10669
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10669' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433102862' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'awol ibrahim', '97433102862', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433102862' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'awol ibrahim', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In2018166' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10669', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202502-0426 / 21860
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '21860' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '668168169' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'محمد العويني', '668168169', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '668168169' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'محمد العويني', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202502-0426' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '21860', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process In2018115 / 746956
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '746956' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In2018115' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '746956', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202489 / 754436
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '754436' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455470224' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'samuel yeboah', '97455470224', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455470224' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'samuel yeboah', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202489' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '754436', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202482 / 10855
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10855' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '66929795' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'josef ado', '66929795', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '66929795' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'josef ado', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202482' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10855', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202443 / 8208
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '8208' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97470505396' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'Mohammad ibrar Abdul hanan', '97470505396', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97470505396' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'Mohammad ibrar Abdul hanan', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202443' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '8208', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202479 / 10064
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10064' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97471581990' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'emmanuel darko', '97471581990', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97471581990' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'emmanuel darko', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202479' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10064', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024289 / 2769
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '2769' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '71061952' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mahmoud jassem alsaleh', '71061952', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '71061952' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mahmoud jassem alsaleh', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024289' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '2769', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024237 / 8208
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '8208' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97474498604' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'hany mohamed', '97474498604', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97474498604' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'hany mohamed', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024237' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '8208', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202437 / 676281
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '676281' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97431179706' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'Hamza BADOU', '97431179706', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97431179706' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'Hamza BADOU', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202437' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '676281', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024244 / 856715
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '856715' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024244' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '856715', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process In2018172 / 749403
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '749403' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430228791' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'sead logomo', '97430228791', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430228791' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'sead logomo', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'In2018172' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '749403', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024239 / 10669
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10669' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430383077' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mohamed yousif', '97430383077', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430383077' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mohamed yousif', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024239' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10669', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018208 / 706150
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '706150' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018208' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '706150', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024294 / 756104
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '756104' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97451066888' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ahmed arsheen', '97451066888', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97451066888' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ahmed arsheen', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024294' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '756104', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202454 / 856925
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '856925' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97439912483' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'VARUN KUMAR C CHAUHAN', '97439912483', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97439912483' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'VARUN KUMAR C CHAUHAN', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202454' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '856925', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process Ret-2018229 / 751340
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '751340' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'Ret-2018229' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '751340', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-423180 / 7039
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7039' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430945601' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'عبد الله برهام', '97430945601', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430945601' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'عبد الله برهام', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-423180' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7039', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202504-422586 / 10858
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '10858' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97471109995' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'قسورة عبد الرحيم', '97471109995', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97471109995' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'قسورة عبد الرحيم', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202504-422586' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '10858', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024104 / 847932
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '847932' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433336834' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'ravi ravi', '97433336834', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433336834' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'ravi ravi', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024104' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '847932', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process 330 / 7062
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7062' AND company_id = v_company_id LIMIT 1;
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
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = '330' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7062', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202434 / 8204
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '8204' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433048081' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'Haq Nawaz Rahim Bakhsh', '97433048081', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433048081' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'Haq Nawaz Rahim Bakhsh', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202434' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '8204', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024335 / 7074
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7074' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '71061952' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mahmoud jassem alsaleh', '71061952', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '71061952' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mahmoud jassem alsaleh', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024335' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7074', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process MR202476 / 819027
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '819027' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97433418726' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'clement gyamerah', '97433418726', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97433418726' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'clement gyamerah', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'MR202476' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '819027', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024230 / 722134
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '722134' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97477763707' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'hamdi thabet', '97477763707', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97477763707' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'hamdi thabet', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024230' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '722134', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024134 / 7062
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '7062' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97455521186' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'olusegun onadairo', '97455521186', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97455521186' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'olusegun onadairo', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024134' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '7062', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO20242 / 857045
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '857045' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97430122896' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'AMARA KHARROUBI', '97430122896', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97430122896' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'AMARA KHARROUBI', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO20242' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '857045', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process AGR-202502-0424 / 5891
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '5891' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '71503673' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'مؤسى حيمر', '71503673', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '71503673' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'مؤسى حيمر', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'AGR-202502-0424' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '5891', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO2024256 / 648144
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '648144' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97470083881' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'mohamed abdalla', '97470083881', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97470083881' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'mohamed abdalla', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO2024256' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '648144', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;

-- Process LTO202442 / 846560
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '846560' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '97431308631' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', 'WALID CHOURABI', '97431308631', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '97431308631' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = 'WALID CHOURABI', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = 'LTO202442' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '846560', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;
