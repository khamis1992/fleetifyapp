/*
 * SQL Script to Fix Cancelled Contracts for Alaraf Company
 * Generated on: 2025-10-26T04:27:09.844Z
 * This script will:
 *  1. Find or create customers with correct information from vehicles_data.sql
 *  2. Update contracts to ensure they have correct monthly amounts
 *  3. Link contracts to the correct customers
 */

-- Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4


-- Vehicle 2766: محمد محمد احمد
-- Expected: Phone 70007983, Start 2025-05-02, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمد محمد احمد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '70007983'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد محمد احمد',
      'individual',
      '70007983',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 70007983) with ID %', 'محمد محمد احمد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 70007983, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمد محمد احمد'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2766'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2766', v_contract_count;
  END IF;

END $$;


-- Vehicle 2767: عبد الغفور دوار
-- Expected: Phone 77122519, Start 2025-09-02, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عبد الغفور دوار
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '77122519'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد الغفور دوار',
      'individual',
      '77122519',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 77122519) with ID %', 'عبد الغفور دوار', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 77122519, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عبد الغفور دوار'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2767'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2767', v_contract_count;
  END IF;

END $$;


-- Vehicle 2768: عبد العزيز محمد
-- Expected: Phone 70342655, Start 2025-01-09, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عبد العزيز محمد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '70342655'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد العزيز محمد',
      'individual',
      '70342655',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 70342655) with ID %', 'عبد العزيز محمد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 70342655, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عبد العزيز محمد'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2768'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2768', v_contract_count;
  END IF;

END $$;


-- Vehicle 2769: وضاح عبد الله
-- Expected: Phone 71953163, Start 2024-12-21, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for وضاح عبد الله
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '71953163'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'وضاح عبد الله',
      'individual',
      '71953163',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 71953163) with ID %', 'وضاح عبد الله', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 71953163, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'وضاح عبد الله'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2769'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2769', v_contract_count;
  END IF;

END $$;


-- Vehicle 2770: خديرب رضا السحامي
-- Expected: Phone 70220390, Start 2025-01-08, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for خديرب رضا السحامي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '70220390'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'خديرب رضا السحامي',
      'individual',
      '70220390',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 70220390) with ID %', 'خديرب رضا السحامي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 70220390, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'خديرب رضا السحامي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2770'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2770', v_contract_count;
  END IF;

END $$;


-- Vehicle 2772: إسماعيل احمد عبد الله
-- Expected: Phone 30400511, Start 2024-07-14, Monthly 1750

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for إسماعيل احمد عبد الله
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30400511'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'إسماعيل احمد عبد الله',
      'individual',
      '30400511',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30400511) with ID %', 'إسماعيل احمد عبد الله', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30400511, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'إسماعيل احمد عبد الله'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1750
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2772'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1750::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2772', v_contract_count;
  END IF;

END $$;


-- Vehicle 2773: مجدي يحيث
-- Expected: Phone 50246458, Start 2025-01-09, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for مجدي يحيث
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '50246458'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مجدي يحيث',
      'individual',
      '50246458',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 50246458) with ID %', 'مجدي يحيث', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 50246458, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'مجدي يحيث'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2773'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2773', v_contract_count;
  END IF;

END $$;


-- Vehicle 2774: ابراهيم رطوب
-- Expected: Phone 30882244, Start 2025-02-01, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for ابراهيم رطوب
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30882244'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ابراهيم رطوب',
      'individual',
      '30882244',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30882244) with ID %', 'ابراهيم رطوب', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30882244, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'ابراهيم رطوب'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2774'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2774', v_contract_count;
  END IF;

END $$;


-- Vehicle 2775: انور جيتوبر
-- Expected: Phone 51476442, Start 2025-01-02, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for انور جيتوبر
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '51476442'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'انور جيتوبر',
      'individual',
      '51476442',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 51476442) with ID %', 'انور جيتوبر', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 51476442, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'انور جيتوبر'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2775'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2775', v_contract_count;
  END IF;

END $$;


-- Vehicle 2776: هيثم خليفة يعلي
-- Expected: Phone 50529648, Start 2025-04-09, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for هيثم خليفة يعلي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '50529648'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'هيثم خليفة يعلي',
      'individual',
      '50529648',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 50529648) with ID %', 'هيثم خليفة يعلي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 50529648, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'هيثم خليفة يعلي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2776'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2776', v_contract_count;
  END IF;

END $$;


-- Vehicle 2778: بلال البوقري
-- Expected: Phone 70400898, Start 2025-07-15, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for بلال البوقري
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '70400898'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'بلال البوقري',
      'individual',
      '70400898',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 70400898) with ID %', 'بلال البوقري', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 70400898, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'بلال البوقري'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2778'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2778', v_contract_count;
  END IF;

END $$;


-- Vehicle 2780: كمال ياسين سرحان
-- Expected: Phone 71002048, Start 2023-12-29, Monthly 2100

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for كمال ياسين سرحان
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '71002048'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'كمال ياسين سرحان',
      'individual',
      '71002048',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 71002048) with ID %', 'كمال ياسين سرحان', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 71002048, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'كمال ياسين سرحان'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 2100
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2780'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 2100::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2780', v_contract_count;
  END IF;

END $$;


-- Vehicle 2783: صدام مصطفى سعد
-- Expected: Phone 77068310, Start 2025-01-07, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for صدام مصطفى سعد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '77068310'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'صدام مصطفى سعد',
      'individual',
      '77068310',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 77068310) with ID %', 'صدام مصطفى سعد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 77068310, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'صدام مصطفى سعد'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2783'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2783', v_contract_count;
  END IF;

END $$;


-- Vehicle 2784: عثمان عويريزة
-- Expected: Phone 30770117, Start 2024-01-08, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عثمان عويريزة
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30770117'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عثمان عويريزة',
      'individual',
      '30770117',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30770117) with ID %', 'عثمان عويريزة', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30770117, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عثمان عويريزة'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '2784'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 2784', v_contract_count;
  END IF;

END $$;


-- Vehicle 4015: ابراهيم خضر
-- Expected: Phone 33750040, Start 2025-09-01, Monthly 1000

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for ابراهيم خضر
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '33750040'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ابراهيم خضر',
      'individual',
      '33750040',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 33750040) with ID %', 'ابراهيم خضر', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 33750040, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'ابراهيم خضر'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1000
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '4015'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1000::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 4015', v_contract_count;
  END IF;

END $$;


-- Vehicle 4016: سلمى عبد الله
-- Expected: Phone 30534902, Start 2025-01-19, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for سلمى عبد الله
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30534902'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'سلمى عبد الله',
      'individual',
      '30534902',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30534902) with ID %', 'سلمى عبد الله', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30534902, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'سلمى عبد الله'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '4016'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 4016', v_contract_count;
  END IF;

END $$;


-- Vehicle 4018: عبد الرحيم شاكر
-- Expected: Phone 31310330, Start 2024-08-02, Monthly 1700

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عبد الرحيم شاكر
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '31310330'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد الرحيم شاكر',
      'individual',
      '31310330',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 31310330) with ID %', 'عبد الرحيم شاكر', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 31310330, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عبد الرحيم شاكر'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1700
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '4018'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1700::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 4018', v_contract_count;
  END IF;

END $$;


-- Vehicle 5889: ايمن خليفة جلاب
-- Expected: Phone 30303088, Start 2023-11-20, Monthly 2100

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for ايمن خليفة جلاب
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30303088'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ايمن خليفة جلاب',
      'individual',
      '30303088',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30303088) with ID %', 'ايمن خليفة جلاب', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30303088, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'ايمن خليفة جلاب'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 2100
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '5889'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 2100::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 5889', v_contract_count;
  END IF;

END $$;


-- Vehicle 5890: عبد العزيز جرلان
-- Expected: Phone 33767961, Start 2024-01-12, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عبد العزيز جرلان
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '33767961'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد العزيز جرلان',
      'individual',
      '33767961',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 33767961) with ID %', 'عبد العزيز جرلان', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 33767961, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عبد العزيز جرلان'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '5890'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 5890', v_contract_count;
  END IF;

END $$;


-- Vehicle 5893: ايمن محمد شوشان
-- Expected: Phone 50131342, Start 2024-09-16, Monthly 1750

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for ايمن محمد شوشان
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '50131342'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ايمن محمد شوشان',
      'individual',
      '50131342',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 50131342) with ID %', 'ايمن محمد شوشان', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 50131342, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'ايمن محمد شوشان'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1750
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '5893'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1750::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 5893', v_contract_count;
  END IF;

END $$;


-- Vehicle 5896: مختار الامين
-- Expected: Phone 50129848, Start 2025-01-09, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for مختار الامين
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '50129848'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مختار الامين',
      'individual',
      '50129848',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 50129848) with ID %', 'مختار الامين', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 50129848, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'مختار الامين'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '5896'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 5896', v_contract_count;
  END IF;

END $$;


-- Vehicle 5898: محمد سراج الدين
-- Expected: Phone 31184659, Start 2024-05-08, Monthly 1700

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمد سراج الدين
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '31184659'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد سراج الدين',
      'individual',
      '31184659',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 31184659) with ID %', 'محمد سراج الدين', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 31184659, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمد سراج الدين'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1700
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '5898'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1700::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 5898', v_contract_count;
  END IF;

END $$;


-- Vehicle 5901: حسام سلمي الطاهري
-- Expected: Phone 31115657, Start 2023-12-23, Monthly 2100

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for حسام سلمي الطاهري
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '31115657'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'حسام سلمي الطاهري',
      'individual',
      '31115657',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 31115657) with ID %', 'حسام سلمي الطاهري', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 31115657, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'حسام سلمي الطاهري'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 2100
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '5901'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 2100::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 5901', v_contract_count;
  END IF;

END $$;


-- Vehicle 7034: محمد احمد عمر متعافي
-- Expected: Phone 50225055, Start 2025-10-07, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمد احمد عمر متعافي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '50225055'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد احمد عمر متعافي',
      'individual',
      '50225055',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 50225055) with ID %', 'محمد احمد عمر متعافي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 50225055, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمد احمد عمر متعافي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7034'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7034', v_contract_count;
  END IF;

END $$;


-- Vehicle 7036: عصام ابراهيم عبد الله
-- Expected: Phone 30777645, Start 2024-12-12, Monthly 1550

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عصام ابراهيم عبد الله
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30777645'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عصام ابراهيم عبد الله',
      'individual',
      '30777645',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30777645) with ID %', 'عصام ابراهيم عبد الله', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30777645, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عصام ابراهيم عبد الله'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1550
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7036'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1550::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7036', v_contract_count;
  END IF;

END $$;


-- Vehicle 7039: عبد الله عمر برهان
-- Expected: Phone 30945601, Start 2025-01-04, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عبد الله عمر برهان
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30945601'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد الله عمر برهان',
      'individual',
      '30945601',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30945601) with ID %', 'عبد الله عمر برهان', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30945601, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عبد الله عمر برهان'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7039'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7039', v_contract_count;
  END IF;

END $$;


-- Vehicle 7041: الصحبي البشير اليماني
-- Expected: Phone 33173763, Start 2025-01-09, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for الصحبي البشير اليماني
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '33173763'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'الصحبي البشير اليماني',
      'individual',
      '33173763',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 33173763) with ID %', 'الصحبي البشير اليماني', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 33173763, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'الصحبي البشير اليماني'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7041'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7041', v_contract_count;
  END IF;

END $$;


-- Vehicle 7043: حمزة البشير يحيى
-- Expected: Phone 55260218, Start 2024-08-21, Monthly 1750

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for حمزة البشير يحيى
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '55260218'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'حمزة البشير يحيى',
      'individual',
      '55260218',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 55260218) with ID %', 'حمزة البشير يحيى', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 55260218, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'حمزة البشير يحيى'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1750
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7043'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1750::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7043', v_contract_count;
  END IF;

END $$;


-- Vehicle 7053: مهدي اسامة حامد
-- Expected: Phone 30138501, Start 2024-07-30, Monthly 1800

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for مهدي اسامة حامد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30138501'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مهدي اسامة حامد',
      'individual',
      '30138501',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30138501) with ID %', 'مهدي اسامة حامد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30138501, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'مهدي اسامة حامد'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1800
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7053'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1800::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7053', v_contract_count;
  END IF;

END $$;


-- Vehicle 7054: محمود جاسم الصالح
-- Expected: Phone 66684460, Start 2025-01-16, Monthly 1650

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمود جاسم الصالح
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '66684460'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمود جاسم الصالح',
      'individual',
      '66684460',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 66684460) with ID %', 'محمود جاسم الصالح', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 66684460, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمود جاسم الصالح'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1650
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7054'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1650::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7054', v_contract_count;
  END IF;

END $$;


-- Vehicle 7056: مجدي محمد عيس
-- Expected: Phone 33557425, Start 2025-01-05, Monthly 1650

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for مجدي محمد عيس
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '33557425'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مجدي محمد عيس',
      'individual',
      '33557425',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 33557425) with ID %', 'مجدي محمد عيس', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 33557425, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'مجدي محمد عيس'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1650
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7056'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1650::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7056', v_contract_count;
  END IF;

END $$;


-- Vehicle 7058: محمد فؤاد شوشان
-- Expected: Phone 55146873, Start 2024-09-25, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمد فؤاد شوشان
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '55146873'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد فؤاد شوشان',
      'individual',
      '55146873',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 55146873) with ID %', 'محمد فؤاد شوشان', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 55146873, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمد فؤاد شوشان'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7058'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7058', v_contract_count;
  END IF;

END $$;


-- Vehicle 7059: عمر مرابحي
-- Expected: Phone 31299557, Start 2025-01-15, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عمر مرابحي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '31299557'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عمر مرابحي',
      'individual',
      '31299557',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 31299557) with ID %', 'عمر مرابحي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 31299557, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عمر مرابحي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7059'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7059', v_contract_count;
  END IF;

END $$;


-- Vehicle 7061: في عبد الحنان الحجز
-- Expected: Phone 55222976, Start 2025-03-16, Monthly 2100

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for في عبد الحنان الحجز
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '55222976'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'في عبد الحنان الحجز',
      'individual',
      '55222976',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 55222976) with ID %', 'في عبد الحنان الحجز', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 55222976, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'في عبد الحنان الحجز'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 2100
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7061'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 2100::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7061', v_contract_count;
  END IF;

END $$;


-- Vehicle 7062: محمد المختار بشاشة
-- Expected: Phone 30788438, Start 2025-10-05, Monthly 1700

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمد المختار بشاشة
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30788438'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد المختار بشاشة',
      'individual',
      '30788438',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30788438) with ID %', 'محمد المختار بشاشة', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30788438, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمد المختار بشاشة'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1700
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7062'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1700::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7062', v_contract_count;
  END IF;

END $$;


-- Vehicle 7063: مهند حمودة الظاهر
-- Expected: Phone 30623322, Start 2025-01-12, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for مهند حمودة الظاهر
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30623322'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مهند حمودة الظاهر',
      'individual',
      '30623322',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30623322) with ID %', 'مهند حمودة الظاهر', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30623322, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'مهند حمودة الظاهر'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7063'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7063', v_contract_count;
  END IF;

END $$;


-- Vehicle 7069: عصام الدزوقي
-- Expected: Phone 74700503, Start 2024-08-26, Monthly 1800

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عصام الدزوقي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '74700503'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عصام الدزوقي',
      'individual',
      '74700503',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 74700503) with ID %', 'عصام الدزوقي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 74700503, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عصام الدزوقي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1800
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7069'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1800::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7069', v_contract_count;
  END IF;

END $$;


-- Vehicle 7072: يوسف العويدي لخليل
-- Expected: Phone 72119703, Start 2024-07-28, Monthly 1750

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for يوسف العويدي لخليل
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '72119703'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'يوسف العويدي لخليل',
      'individual',
      '72119703',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 72119703) with ID %', 'يوسف العويدي لخليل', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 72119703, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'يوسف العويدي لخليل'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1750
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7072'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1750::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7072', v_contract_count;
  END IF;

END $$;


-- Vehicle 7074: محمود جاسم الصالح
-- Expected: Phone 30531131, Start 2024-11-14, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمود جاسم الصالح
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30531131'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمود جاسم الصالح',
      'individual',
      '30531131',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30531131) with ID %', 'محمود جاسم الصالح', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30531131, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمود جاسم الصالح'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7074'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7074', v_contract_count;
  END IF;

END $$;


-- Vehicle 7075: مطلوب الابراهيم
-- Expected: Phone 50446192, Start 2024-05-02, Monthly 1800

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for مطلوب الابراهيم
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '50446192'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مطلوب الابراهيم',
      'individual',
      '50446192',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 50446192) with ID %', 'مطلوب الابراهيم', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 50446192, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'مطلوب الابراهيم'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1800
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7075'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1800::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7075', v_contract_count;
  END IF;

END $$;


-- Vehicle 7077: ادم صالح جبريل
-- Expected: Phone 50066411, Start 2023-12-22, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for ادم صالح جبريل
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '50066411'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ادم صالح جبريل',
      'individual',
      '50066411',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 50066411) with ID %', 'ادم صالح جبريل', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 50066411, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'ادم صالح جبريل'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '7077'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 7077', v_contract_count;
  END IF;

END $$;


-- Vehicle 8203: محمد عماد النعماني
-- Expected: Phone 51230549, Start 2025-04-10, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمد عماد النعماني
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '51230549'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد عماد النعماني',
      'individual',
      '51230549',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 51230549) with ID %', 'محمد عماد النعماني', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 51230549, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمد عماد النعماني'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '8203'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 8203', v_contract_count;
  END IF;

END $$;


-- Vehicle 8206: محمد صالح فرج حامد
-- Expected: Phone 55449463, Start 2025-10-07, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمد صالح فرج حامد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '55449463'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد صالح فرج حامد',
      'individual',
      '55449463',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 55449463) with ID %', 'محمد صالح فرج حامد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 55449463, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمد صالح فرج حامد'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '8206'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 8206', v_contract_count;
  END IF;

END $$;


-- Vehicle 8207: حسن الفكي
-- Expected: Phone 51060253, Start 2025-04-15, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for حسن الفكي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '51060253'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'حسن الفكي',
      'individual',
      '51060253',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 51060253) with ID %', 'حسن الفكي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 51060253, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'حسن الفكي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '8207'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 8207', v_contract_count;
  END IF;

END $$;


-- Vehicle 8208: عصام احمد عيد الدابر
-- Expected: Phone 66276263, Start 2025-02-02, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عصام احمد عيد الدابر
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '66276263'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عصام احمد عيد الدابر',
      'individual',
      '66276263',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 66276263) with ID %', 'عصام احمد عيد الدابر', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 66276263, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عصام احمد عيد الدابر'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '8208'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 8208', v_contract_count;
  END IF;

END $$;


-- Vehicle 8211: محمد سالم
-- Expected: Phone 30757703, Start 2025-01-07, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمد سالم
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30757703'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد سالم',
      'individual',
      '30757703',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30757703) with ID %', 'محمد سالم', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30757703, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمد سالم'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '8211'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 8211', v_contract_count;
  END IF;

END $$;


-- Vehicle 8213: يحي هلال الصغري
-- Expected: Phone 504P47989, Start 2025-01-06, Monthly 1700

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for يحي هلال الصغري
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '504P47989'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'يحي هلال الصغري',
      'individual',
      '504P47989',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 504P47989) with ID %', 'يحي هلال الصغري', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 504P47989, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'يحي هلال الصغري'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1700
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '8213'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1700::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 8213', v_contract_count;
  END IF;

END $$;


-- Vehicle 9255: علام الدين حسين
-- Expected: Phone 77456423, Start 2023-06-21, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for علام الدين حسين
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '77456423'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'علام الدين حسين',
      'individual',
      '77456423',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 77456423) with ID %', 'علام الدين حسين', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 77456423, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'علام الدين حسين'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '9255'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 9255', v_contract_count;
  END IF;

END $$;


-- Vehicle 10172: انور محمد ابراهيم
-- Expected: Phone 70561365, Start 2025-04-15, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for انور محمد ابراهيم
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '70561365'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'انور محمد ابراهيم',
      'individual',
      '70561365',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 70561365) with ID %', 'انور محمد ابراهيم', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 70561365, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'انور محمد ابراهيم'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '10172'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 10172', v_contract_count;
  END IF;

END $$;


-- Vehicle 10197: احمد الشاعر الصديق
-- Expected: Phone 50118063, Start 2024-10-08, Monthly 1250

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for احمد الشاعر الصديق
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '50118063'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'احمد الشاعر الصديق',
      'individual',
      '50118063',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 50118063) with ID %', 'احمد الشاعر الصديق', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 50118063, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'احمد الشاعر الصديق'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1250
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '10197'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1250::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 10197', v_contract_count;
  END IF;

END $$;


-- Vehicle 10665: احمد الطاهر الريس
-- Expected: Phone 77013644, Start 2024-08-14, Monthly 1750

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for احمد الطاهر الريس
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '77013644'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'احمد الطاهر الريس',
      'individual',
      '77013644',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 77013644) with ID %', 'احمد الطاهر الريس', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 77013644, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'احمد الطاهر الريس'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1750
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '10665'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1750::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 10665', v_contract_count;
  END IF;

END $$;


-- Vehicle 10666: جاسم محمد الصالح
-- Expected: Phone 30047797, Start 2025-01-07, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for جاسم محمد الصالح
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30047797'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'جاسم محمد الصالح',
      'individual',
      '30047797',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30047797) with ID %', 'جاسم محمد الصالح', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30047797, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'جاسم محمد الصالح'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '10666'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 10666', v_contract_count;
  END IF;

END $$;


-- Vehicle 10667: وليد شراس اجار عادي
-- Expected: Phone 31308631, Start 2025-09-07, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for وليد شراس اجار عادي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '31308631'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'وليد شراس اجار عادي',
      'individual',
      '31308631',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 31308631) with ID %', 'وليد شراس اجار عادي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 31308631, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'وليد شراس اجار عادي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '10667'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 10667', v_contract_count;
  END IF;

END $$;


-- Vehicle 10668: عبد المنعم حمدي
-- Expected: Phone 70184904, Start 2025-01-03, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عبد المنعم حمدي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '70184904'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد المنعم حمدي',
      'individual',
      '70184904',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 70184904) with ID %', 'عبد المنعم حمدي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 70184904, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عبد المنعم حمدي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '10668'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 10668', v_contract_count;
  END IF;

END $$;


-- Vehicle 10669: اجار ورداد مسعودي عادي
-- Expected: Phone 50818558, Start 2025-02-09, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for اجار ورداد مسعودي عادي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '50818558'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'اجار ورداد مسعودي عادي',
      'individual',
      '50818558',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 50818558) with ID %', 'اجار ورداد مسعودي عادي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 50818558, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'اجار ورداد مسعودي عادي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '10669'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 10669', v_contract_count;
  END IF;

END $$;


-- Vehicle 11473: عمد العواري
-- Expected: Phone 66071051, Start 2025-09-19, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عمد العواري
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '66071051'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عمد العواري',
      'individual',
      '66071051',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 66071051) with ID %', 'عمد العواري', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 66071051, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عمد العواري'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '11473'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 11473', v_contract_count;
  END IF;

END $$;


-- Vehicle 21849: فادي السعيد
-- Expected: Phone 66043445, Start 2025-08-02, Monthly 1750

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for فادي السعيد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '66043445'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'فادي السعيد',
      'individual',
      '66043445',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 66043445) with ID %', 'فادي السعيد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 66043445, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'فادي السعيد'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1750
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '21849'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1750::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 21849', v_contract_count;
  END IF;

END $$;


-- Vehicle 21860: محمد العريشي
-- Expected: Phone 66816813, Start 2025-02-16, Monthly 1700

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمد العريشي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '66816813'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد العريشي',
      'individual',
      '66816813',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 66816813) with ID %', 'محمد العريشي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 66816813, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمد العريشي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1700
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '21860'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1700::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 21860', v_contract_count;
  END IF;

END $$;


-- Vehicle 381247: قصعادي عقبة
-- Expected: Phone 50409220, Start 2025-01-07, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for قصعادي عقبة
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '50409220'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'قصعادي عقبة',
      'individual',
      '50409220',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 50409220) with ID %', 'قصعادي عقبة', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 50409220, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'قصعادي عقبة'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '381247'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 381247', v_contract_count;
  END IF;

END $$;


-- Vehicle 556199: محمد جمعة
-- Expected: Phone 66816813, Start 2025-01-08, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمد جمعة
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '66816813'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد جمعة',
      'individual',
      '66816813',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 66816813) with ID %', 'محمد جمعة', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 66816813, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمد جمعة'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '556199'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 556199', v_contract_count;
  END IF;

END $$;


-- Vehicle 706150: مروان باكير
-- Expected: Phone 51024665, Start 2025-11-07, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for مروان باكير
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '51024665'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مروان باكير',
      'individual',
      '51024665',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 51024665) with ID %', 'مروان باكير', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 51024665, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'مروان باكير'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '706150'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 706150', v_contract_count;
  END IF;

END $$;


-- Vehicle 721894: شرف الدين الموجود
-- Expected: Phone 71101506, Start 2025-03-06, Monthly 1000

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for شرف الدين الموجود
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '71101506'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'شرف الدين الموجود',
      'individual',
      '71101506',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 71101506) with ID %', 'شرف الدين الموجود', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 71101506, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'شرف الدين الموجود'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1000
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '721894'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1000::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 721894', v_contract_count;
  END IF;

END $$;


-- Vehicle 856715: دانور الجيتوني (حمزة)
-- Expected: Phone 66934949, Start 2025-01-04, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for دانور الجيتوني (حمزة)
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '66934949'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'دانور الجيتوني (حمزة)',
      'individual',
      '66934949',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 66934949) with ID %', 'دانور الجيتوني (حمزة)', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 66934949, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'دانور الجيتوني (حمزة)'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '856715'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 856715', v_contract_count;
  END IF;

END $$;


-- Vehicle 856718: حسان بو علاقي
-- Expected: Phone 66553638, Start 2025-02-14, Monthly 1700

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for حسان بو علاقي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '66553638'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'حسان بو علاقي',
      'individual',
      '66553638',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 66553638) with ID %', 'حسان بو علاقي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 66553638, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'حسان بو علاقي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1700
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '856718'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1700::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 856718', v_contract_count;
  END IF;

END $$;


-- Vehicle 856878: محمد مسلم
-- Expected: Phone 55001662, Start 2025-01-08, Monthly 2100

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for محمد مسلم
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '55001662'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد مسلم',
      'individual',
      '55001662',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 55001662) with ID %', 'محمد مسلم', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 55001662, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'محمد مسلم'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 2100
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '856878'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 2100::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 856878', v_contract_count;
  END IF;

END $$;


-- Vehicle 856925: عاطف منصور
-- Expected: Phone 74446588, Start 2024-05-08, Monthly 1850

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عاطف منصور
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '74446588'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عاطف منصور',
      'individual',
      '74446588',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 74446588) with ID %', 'عاطف منصور', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 74446588, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عاطف منصور'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1850
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '856925'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1850::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 856925', v_contract_count;
  END IF;

END $$;


-- Vehicle 857045: عميرة الخروبي
-- Expected: Phone 30122896, Start 2024-02-01, Monthly 2000

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عميرة الخروبي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30122896'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عميرة الخروبي',
      'individual',
      '30122896',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30122896) with ID %', 'عميرة الخروبي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30122896, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عميرة الخروبي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 2000
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '857045'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 2000::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 857045', v_contract_count;
  END IF;

END $$;


-- Vehicle 862165: مهدي الشريف
-- Expected: Phone 33670129, Start 2025-01-09, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for مهدي الشريف
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '33670129'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مهدي الشريف',
      'individual',
      '33670129',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 33670129) with ID %', 'مهدي الشريف', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 33670129, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'مهدي الشريف'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '862165'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 862165', v_contract_count;
  END IF;

END $$;


-- Vehicle 862169: عبد الرحيم شاكر
-- Expected: Phone 31310330, Start 2025-01-07, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عبد الرحيم شاكر
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '31310330'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد الرحيم شاكر',
      'individual',
      '31310330',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 31310330) with ID %', 'عبد الرحيم شاكر', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 31310330, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عبد الرحيم شاكر'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '862169'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 862169', v_contract_count;
  END IF;

END $$;


-- Vehicle 893406: سيف الدين محمد صالح
-- Expected: Phone 70692947, Start 2025-01-04, Monthly 1700

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for سيف الدين محمد صالح
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '70692947'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'سيف الدين محمد صالح',
      'individual',
      '70692947',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 70692947) with ID %', 'سيف الدين محمد صالح', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 70692947, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'سيف الدين محمد صالح'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1700
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '893406'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1700::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 893406', v_contract_count;
  END IF;

END $$;


-- Vehicle 893409: عبد الصمد بن عزوز
-- Expected: Phone 33478097, Start 2025-01-03, Monthly 1600

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عبد الصمد بن عزوز
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '33478097'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد الصمد بن عزوز',
      'individual',
      '33478097',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 33478097) with ID %', 'عبد الصمد بن عزوز', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 33478097, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عبد الصمد بن عزوز'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1600
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '893409'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1600::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 893409', v_contract_count;
  END IF;

END $$;


-- Vehicle 893410: عمار عبد العزيز الغزي
-- Expected: Phone 30403800, Start 2024-04-09, Monthly 1750

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for عمار عبد العزيز الغزي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '30403800'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عمار عبد العزيز الغزي',
      'individual',
      '30403800',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 30403800) with ID %', 'عمار عبد العزيز الغزي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 30403800, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'عمار عبد العزيز الغزي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1750
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '893410'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1750::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 893410', v_contract_count;
  END IF;

END $$;


-- Vehicle 185 513: الصادق دياب
-- Expected: Phone 70075544, Start 2024-01-03, Monthly 1800

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for الصادق دياب
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '70075544'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'الصادق دياب',
      'individual',
      '70075544',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 70075544) with ID %', 'الصادق دياب', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 70075544, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'الصادق دياب'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1800
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '185 513'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1800::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 185 513', v_contract_count;
  END IF;

END $$;


-- Vehicle 185 573: ايهاب عبد الله
-- Expected: Phone 3100 966, Start 2025-01-04, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for ايهاب عبد الله
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '3100 966'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ايهاب عبد الله',
      'individual',
      '3100 966',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 3100 966) with ID %', 'ايهاب عبد الله', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 3100 966, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = 'ايهاب عبد الله'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '185 573'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 185 573', v_contract_count;
  END IF;

END $$;


-- Vehicle 603 353: 5892مصطفى بالقايد
-- Expected: Phone 31245752, Start 2025-01-07, Monthly 1700

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for 5892مصطفى بالقايد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '31245752'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      '5892مصطفى بالقايد',
      'individual',
      '31245752',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 31245752) with ID %', '5892مصطفى بالقايد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 31245752, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = '5892مصطفى بالقايد'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1700
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '603 353'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1700::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 603 353', v_contract_count;
  END IF;

END $$;


-- Vehicle 599 720: 7055 انور الدهبي
-- Expected: Phone 50234083, Start 2025-01-05, Monthly 1800

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for 7055 انور الدهبي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '50234083'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      '7055 انور الدهبي',
      'individual',
      '50234083',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 50234083) with ID %', '7055 انور الدهبي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 50234083, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = '7055 انور الدهبي'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1800
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '599 720'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1800::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 599 720', v_contract_count;
  END IF;

END $$;


-- Vehicle 153 974: 7065زهري حكيم
-- Expected: Phone 55578515, Start 2025-01-01, Monthly 1500

DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for 7065زهري حكيم
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '55578515'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      '7065زهري حكيم',
      'individual',
      '55578515',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: 55578515) with ID %', '7065زهري حكيم', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone 55578515, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = '7065زهري حكيم'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = 1500
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '153 974'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != 1500::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 153 974', v_contract_count;
  END IF;

END $$;



-- End of script
-- Total vehicles processed: 77
