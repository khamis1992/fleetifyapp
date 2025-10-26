/*
 * SQL Script to Fix Cancelled Contracts for Alaraf Company
 * Generated on: 2025-10-26T04:21:51.904Z
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
  -- Find or create customer for محمد محمد احمد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمد محمد احمد'
      OR phone = '70007983'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد محمد احمد',
      '70007983',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمد محمد احمد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمد محمد احمد', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '70007983',
        name = 'محمد محمد احمد'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for عبد الغفور دوار
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عبد الغفور دوار'
      OR phone = '77122519'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد الغفور دوار',
      '77122519',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عبد الغفور دوار', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عبد الغفور دوار', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '77122519',
        name = 'عبد الغفور دوار'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for عبد العزيز محمد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عبد العزيز محمد'
      OR phone = '70342655'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد العزيز محمد',
      '70342655',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عبد العزيز محمد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عبد العزيز محمد', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '70342655',
        name = 'عبد العزيز محمد'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for وضاح عبد الله
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'وضاح عبد الله'
      OR phone = '71953163'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'وضاح عبد الله',
      '71953163',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'وضاح عبد الله', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'وضاح عبد الله', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '71953163',
        name = 'وضاح عبد الله'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for خديرب رضا السحامي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'خديرب رضا السحامي'
      OR phone = '70220390'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'خديرب رضا السحامي',
      '70220390',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'خديرب رضا السحامي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'خديرب رضا السحامي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '70220390',
        name = 'خديرب رضا السحامي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for إسماعيل احمد عبد الله
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'إسماعيل احمد عبد الله'
      OR phone = '30400511'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'إسماعيل احمد عبد الله',
      '30400511',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'إسماعيل احمد عبد الله', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'إسماعيل احمد عبد الله', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30400511',
        name = 'إسماعيل احمد عبد الله'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1750
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
  -- Find or create customer for مجدي يحيث
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'مجدي يحيث'
      OR phone = '50246458'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مجدي يحيث',
      '50246458',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'مجدي يحيث', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'مجدي يحيث', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '50246458',
        name = 'مجدي يحيث'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for ابراهيم رطوب
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'ابراهيم رطوب'
      OR phone = '30882244'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ابراهيم رطوب',
      '30882244',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'ابراهيم رطوب', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'ابراهيم رطوب', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30882244',
        name = 'ابراهيم رطوب'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for انور جيتوبر
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'انور جيتوبر'
      OR phone = '51476442'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'انور جيتوبر',
      '51476442',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'انور جيتوبر', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'انور جيتوبر', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '51476442',
        name = 'انور جيتوبر'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for هيثم خليفة يعلي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'هيثم خليفة يعلي'
      OR phone = '50529648'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'هيثم خليفة يعلي',
      '50529648',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'هيثم خليفة يعلي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'هيثم خليفة يعلي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '50529648',
        name = 'هيثم خليفة يعلي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for بلال البوقري
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'بلال البوقري'
      OR phone = '70400898'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'بلال البوقري',
      '70400898',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'بلال البوقري', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'بلال البوقري', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '70400898',
        name = 'بلال البوقري'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for كمال ياسين سرحان
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'كمال ياسين سرحان'
      OR phone = '71002048'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'كمال ياسين سرحان',
      '71002048',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'كمال ياسين سرحان', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'كمال ياسين سرحان', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '71002048',
        name = 'كمال ياسين سرحان'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 2100
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
  -- Find or create customer for صدام مصطفى سعد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'صدام مصطفى سعد'
      OR phone = '77068310'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'صدام مصطفى سعد',
      '77068310',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'صدام مصطفى سعد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'صدام مصطفى سعد', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '77068310',
        name = 'صدام مصطفى سعد'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for عثمان عويريزة
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عثمان عويريزة'
      OR phone = '30770117'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عثمان عويريزة',
      '30770117',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عثمان عويريزة', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عثمان عويريزة', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30770117',
        name = 'عثمان عويريزة'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for ابراهيم خضر
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'ابراهيم خضر'
      OR phone = '33750040'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ابراهيم خضر',
      '33750040',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'ابراهيم خضر', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'ابراهيم خضر', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '33750040',
        name = 'ابراهيم خضر'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1000
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
  -- Find or create customer for سلمى عبد الله
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'سلمى عبد الله'
      OR phone = '30534902'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'سلمى عبد الله',
      '30534902',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'سلمى عبد الله', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'سلمى عبد الله', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30534902',
        name = 'سلمى عبد الله'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for عبد الرحيم شاكر
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عبد الرحيم شاكر'
      OR phone = '31310330'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد الرحيم شاكر',
      '31310330',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عبد الرحيم شاكر', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عبد الرحيم شاكر', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '31310330',
        name = 'عبد الرحيم شاكر'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1700
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
  -- Find or create customer for ايمن خليفة جلاب
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'ايمن خليفة جلاب'
      OR phone = '30303088'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ايمن خليفة جلاب',
      '30303088',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'ايمن خليفة جلاب', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'ايمن خليفة جلاب', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30303088',
        name = 'ايمن خليفة جلاب'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 2100
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
  -- Find or create customer for عبد العزيز جرلان
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عبد العزيز جرلان'
      OR phone = '33767961'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد العزيز جرلان',
      '33767961',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عبد العزيز جرلان', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عبد العزيز جرلان', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '33767961',
        name = 'عبد العزيز جرلان'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for ايمن محمد شوشان
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'ايمن محمد شوشان'
      OR phone = '50131342'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ايمن محمد شوشان',
      '50131342',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'ايمن محمد شوشان', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'ايمن محمد شوشان', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '50131342',
        name = 'ايمن محمد شوشان'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1750
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
  -- Find or create customer for مختار الامين
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'مختار الامين'
      OR phone = '50129848'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مختار الامين',
      '50129848',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'مختار الامين', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'مختار الامين', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '50129848',
        name = 'مختار الامين'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for محمد سراج الدين
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمد سراج الدين'
      OR phone = '31184659'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد سراج الدين',
      '31184659',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمد سراج الدين', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمد سراج الدين', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '31184659',
        name = 'محمد سراج الدين'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1700
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
  -- Find or create customer for حسام سلمي الطاهري
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'حسام سلمي الطاهري'
      OR phone = '31115657'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'حسام سلمي الطاهري',
      '31115657',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'حسام سلمي الطاهري', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'حسام سلمي الطاهري', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '31115657',
        name = 'حسام سلمي الطاهري'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 2100
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
  -- Find or create customer for محمد احمد عمر متعافي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمد احمد عمر متعافي'
      OR phone = '50225055'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد احمد عمر متعافي',
      '50225055',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمد احمد عمر متعافي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمد احمد عمر متعافي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '50225055',
        name = 'محمد احمد عمر متعافي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for عصام ابراهيم عبد الله
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عصام ابراهيم عبد الله'
      OR phone = '30777645'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عصام ابراهيم عبد الله',
      '30777645',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عصام ابراهيم عبد الله', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عصام ابراهيم عبد الله', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30777645',
        name = 'عصام ابراهيم عبد الله'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1550
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
  -- Find or create customer for عبد الله عمر برهان
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عبد الله عمر برهان'
      OR phone = '30945601'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد الله عمر برهان',
      '30945601',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عبد الله عمر برهان', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عبد الله عمر برهان', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30945601',
        name = 'عبد الله عمر برهان'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for الصحبي البشير اليماني
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'الصحبي البشير اليماني'
      OR phone = '33173763'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'الصحبي البشير اليماني',
      '33173763',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'الصحبي البشير اليماني', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'الصحبي البشير اليماني', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '33173763',
        name = 'الصحبي البشير اليماني'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for حمزة البشير يحيى
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'حمزة البشير يحيى'
      OR phone = '55260218'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'حمزة البشير يحيى',
      '55260218',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'حمزة البشير يحيى', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'حمزة البشير يحيى', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '55260218',
        name = 'حمزة البشير يحيى'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1750
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
  -- Find or create customer for مهدي اسامة حامد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'مهدي اسامة حامد'
      OR phone = '30138501'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مهدي اسامة حامد',
      '30138501',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'مهدي اسامة حامد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'مهدي اسامة حامد', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30138501',
        name = 'مهدي اسامة حامد'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1800
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
  -- Find or create customer for محمود جاسم الصالح
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمود جاسم الصالح'
      OR phone = '66684460'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمود جاسم الصالح',
      '66684460',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمود جاسم الصالح', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمود جاسم الصالح', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '66684460',
        name = 'محمود جاسم الصالح'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1650
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
  -- Find or create customer for مجدي محمد عيس
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'مجدي محمد عيس'
      OR phone = '33557425'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مجدي محمد عيس',
      '33557425',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'مجدي محمد عيس', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'مجدي محمد عيس', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '33557425',
        name = 'مجدي محمد عيس'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1650
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
  -- Find or create customer for محمد فؤاد شوشان
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمد فؤاد شوشان'
      OR phone = '55146873'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد فؤاد شوشان',
      '55146873',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمد فؤاد شوشان', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمد فؤاد شوشان', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '55146873',
        name = 'محمد فؤاد شوشان'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for عمر مرابحي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عمر مرابحي'
      OR phone = '31299557'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عمر مرابحي',
      '31299557',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عمر مرابحي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عمر مرابحي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '31299557',
        name = 'عمر مرابحي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for في عبد الحنان الحجز
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'في عبد الحنان الحجز'
      OR phone = '55222976'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'في عبد الحنان الحجز',
      '55222976',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'في عبد الحنان الحجز', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'في عبد الحنان الحجز', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '55222976',
        name = 'في عبد الحنان الحجز'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 2100
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
  -- Find or create customer for محمد المختار بشاشة
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمد المختار بشاشة'
      OR phone = '30788438'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد المختار بشاشة',
      '30788438',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمد المختار بشاشة', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمد المختار بشاشة', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30788438',
        name = 'محمد المختار بشاشة'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1700
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
  -- Find or create customer for مهند حمودة الظاهر
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'مهند حمودة الظاهر'
      OR phone = '30623322'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مهند حمودة الظاهر',
      '30623322',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'مهند حمودة الظاهر', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'مهند حمودة الظاهر', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30623322',
        name = 'مهند حمودة الظاهر'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for عصام الدزوقي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عصام الدزوقي'
      OR phone = '74700503'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عصام الدزوقي',
      '74700503',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عصام الدزوقي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عصام الدزوقي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '74700503',
        name = 'عصام الدزوقي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1800
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
  -- Find or create customer for يوسف العويدي لخليل
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'يوسف العويدي لخليل'
      OR phone = '72119703'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'يوسف العويدي لخليل',
      '72119703',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'يوسف العويدي لخليل', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'يوسف العويدي لخليل', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '72119703',
        name = 'يوسف العويدي لخليل'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1750
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
  -- Find or create customer for محمود جاسم الصالح
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمود جاسم الصالح'
      OR phone = '30531131'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمود جاسم الصالح',
      '30531131',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمود جاسم الصالح', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمود جاسم الصالح', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30531131',
        name = 'محمود جاسم الصالح'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for مطلوب الابراهيم
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'مطلوب الابراهيم'
      OR phone = '50446192'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مطلوب الابراهيم',
      '50446192',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'مطلوب الابراهيم', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'مطلوب الابراهيم', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '50446192',
        name = 'مطلوب الابراهيم'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1800
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
  -- Find or create customer for ادم صالح جبريل
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'ادم صالح جبريل'
      OR phone = '50066411'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ادم صالح جبريل',
      '50066411',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'ادم صالح جبريل', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'ادم صالح جبريل', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '50066411',
        name = 'ادم صالح جبريل'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for محمد عماد النعماني
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمد عماد النعماني'
      OR phone = '51230549'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد عماد النعماني',
      '51230549',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمد عماد النعماني', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمد عماد النعماني', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '51230549',
        name = 'محمد عماد النعماني'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for محمد صالح فرج حامد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمد صالح فرج حامد'
      OR phone = '55449463'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد صالح فرج حامد',
      '55449463',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمد صالح فرج حامد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمد صالح فرج حامد', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '55449463',
        name = 'محمد صالح فرج حامد'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for حسن الفكي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'حسن الفكي'
      OR phone = '51060253'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'حسن الفكي',
      '51060253',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'حسن الفكي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'حسن الفكي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '51060253',
        name = 'حسن الفكي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for عصام احمد عيد الدابر
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عصام احمد عيد الدابر'
      OR phone = '66276263'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عصام احمد عيد الدابر',
      '66276263',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عصام احمد عيد الدابر', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عصام احمد عيد الدابر', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '66276263',
        name = 'عصام احمد عيد الدابر'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for محمد سالم
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمد سالم'
      OR phone = '30757703'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد سالم',
      '30757703',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمد سالم', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمد سالم', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30757703',
        name = 'محمد سالم'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for يحي هلال الصغري
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'يحي هلال الصغري'
      OR phone = '504P47989'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'يحي هلال الصغري',
      '504P47989',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'يحي هلال الصغري', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'يحي هلال الصغري', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '504P47989',
        name = 'يحي هلال الصغري'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1700
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
  -- Find or create customer for علام الدين حسين
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'علام الدين حسين'
      OR phone = '77456423'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'علام الدين حسين',
      '77456423',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'علام الدين حسين', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'علام الدين حسين', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '77456423',
        name = 'علام الدين حسين'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for انور محمد ابراهيم
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'انور محمد ابراهيم'
      OR phone = '70561365'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'انور محمد ابراهيم',
      '70561365',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'انور محمد ابراهيم', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'انور محمد ابراهيم', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '70561365',
        name = 'انور محمد ابراهيم'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for احمد الشاعر الصديق
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'احمد الشاعر الصديق'
      OR phone = '50118063'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'احمد الشاعر الصديق',
      '50118063',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'احمد الشاعر الصديق', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'احمد الشاعر الصديق', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '50118063',
        name = 'احمد الشاعر الصديق'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1250
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
  -- Find or create customer for احمد الطاهر الريس
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'احمد الطاهر الريس'
      OR phone = '77013644'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'احمد الطاهر الريس',
      '77013644',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'احمد الطاهر الريس', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'احمد الطاهر الريس', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '77013644',
        name = 'احمد الطاهر الريس'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1750
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
  -- Find or create customer for جاسم محمد الصالح
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'جاسم محمد الصالح'
      OR phone = '30047797'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'جاسم محمد الصالح',
      '30047797',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'جاسم محمد الصالح', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'جاسم محمد الصالح', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30047797',
        name = 'جاسم محمد الصالح'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for وليد شراس اجار عادي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'وليد شراس اجار عادي'
      OR phone = '31308631'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'وليد شراس اجار عادي',
      '31308631',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'وليد شراس اجار عادي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'وليد شراس اجار عادي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '31308631',
        name = 'وليد شراس اجار عادي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for عبد المنعم حمدي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عبد المنعم حمدي'
      OR phone = '70184904'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد المنعم حمدي',
      '70184904',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عبد المنعم حمدي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عبد المنعم حمدي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '70184904',
        name = 'عبد المنعم حمدي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for اجار ورداد مسعودي عادي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'اجار ورداد مسعودي عادي'
      OR phone = '50818558'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'اجار ورداد مسعودي عادي',
      '50818558',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'اجار ورداد مسعودي عادي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'اجار ورداد مسعودي عادي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '50818558',
        name = 'اجار ورداد مسعودي عادي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for عمد العواري
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عمد العواري'
      OR phone = '66071051'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عمد العواري',
      '66071051',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عمد العواري', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عمد العواري', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '66071051',
        name = 'عمد العواري'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for فادي السعيد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'فادي السعيد'
      OR phone = '66043445'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'فادي السعيد',
      '66043445',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'فادي السعيد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'فادي السعيد', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '66043445',
        name = 'فادي السعيد'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1750
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
  -- Find or create customer for محمد العريشي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمد العريشي'
      OR phone = '66816813'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد العريشي',
      '66816813',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمد العريشي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمد العريشي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '66816813',
        name = 'محمد العريشي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1700
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
  -- Find or create customer for قصعادي عقبة
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'قصعادي عقبة'
      OR phone = '50409220'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'قصعادي عقبة',
      '50409220',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'قصعادي عقبة', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'قصعادي عقبة', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '50409220',
        name = 'قصعادي عقبة'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for محمد جمعة
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمد جمعة'
      OR phone = '66816813'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد جمعة',
      '66816813',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمد جمعة', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمد جمعة', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '66816813',
        name = 'محمد جمعة'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for مروان باكير
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'مروان باكير'
      OR phone = '51024665'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مروان باكير',
      '51024665',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'مروان باكير', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'مروان باكير', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '51024665',
        name = 'مروان باكير'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for شرف الدين الموجود
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'شرف الدين الموجود'
      OR phone = '71101506'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'شرف الدين الموجود',
      '71101506',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'شرف الدين الموجود', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'شرف الدين الموجود', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '71101506',
        name = 'شرف الدين الموجود'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1000
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
  -- Find or create customer for دانور الجيتوني (حمزة)
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'دانور الجيتوني (حمزة)'
      OR phone = '66934949'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'دانور الجيتوني (حمزة)',
      '66934949',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'دانور الجيتوني (حمزة)', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'دانور الجيتوني (حمزة)', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '66934949',
        name = 'دانور الجيتوني (حمزة)'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for حسان بو علاقي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'حسان بو علاقي'
      OR phone = '66553638'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'حسان بو علاقي',
      '66553638',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'حسان بو علاقي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'حسان بو علاقي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '66553638',
        name = 'حسان بو علاقي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1700
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
  -- Find or create customer for محمد مسلم
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'محمد مسلم'
      OR phone = '55001662'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'محمد مسلم',
      '55001662',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'محمد مسلم', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'محمد مسلم', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '55001662',
        name = 'محمد مسلم'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 2100
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
  -- Find or create customer for عاطف منصور
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عاطف منصور'
      OR phone = '74446588'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عاطف منصور',
      '74446588',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عاطف منصور', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عاطف منصور', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '74446588',
        name = 'عاطف منصور'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1850
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
  -- Find or create customer for عميرة الخروبي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عميرة الخروبي'
      OR phone = '30122896'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عميرة الخروبي',
      '30122896',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عميرة الخروبي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عميرة الخروبي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30122896',
        name = 'عميرة الخروبي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 2000
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
  -- Find or create customer for مهدي الشريف
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'مهدي الشريف'
      OR phone = '33670129'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'مهدي الشريف',
      '33670129',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'مهدي الشريف', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'مهدي الشريف', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '33670129',
        name = 'مهدي الشريف'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for عبد الرحيم شاكر
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عبد الرحيم شاكر'
      OR phone = '31310330'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد الرحيم شاكر',
      '31310330',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عبد الرحيم شاكر', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عبد الرحيم شاكر', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '31310330',
        name = 'عبد الرحيم شاكر'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for سيف الدين محمد صالح
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'سيف الدين محمد صالح'
      OR phone = '70692947'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'سيف الدين محمد صالح',
      '70692947',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'سيف الدين محمد صالح', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'سيف الدين محمد صالح', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '70692947',
        name = 'سيف الدين محمد صالح'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1700
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
  -- Find or create customer for عبد الصمد بن عزوز
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عبد الصمد بن عزوز'
      OR phone = '33478097'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عبد الصمد بن عزوز',
      '33478097',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عبد الصمد بن عزوز', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عبد الصمد بن عزوز', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '33478097',
        name = 'عبد الصمد بن عزوز'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1600
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
  -- Find or create customer for عمار عبد العزيز الغزي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'عمار عبد العزيز الغزي'
      OR phone = '30403800'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'عمار عبد العزيز الغزي',
      '30403800',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'عمار عبد العزيز الغزي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'عمار عبد العزيز الغزي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '30403800',
        name = 'عمار عبد العزيز الغزي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1750
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
  -- Find or create customer for الصادق دياب
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'الصادق دياب'
      OR phone = '70075544'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'الصادق دياب',
      '70075544',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'الصادق دياب', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'الصادق دياب', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '70075544',
        name = 'الصادق دياب'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1800
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
  -- Find or create customer for ايهاب عبد الله
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = 'ايهاب عبد الله'
      OR phone = '3100 966'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ايهاب عبد الله',
      '3100 966',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', 'ايهاب عبد الله', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', 'ايهاب عبد الله', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '3100 966',
        name = 'ايهاب عبد الله'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
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
  -- Find or create customer for 5892مصطفى بالقايد
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = '5892مصطفى بالقايد'
      OR phone = '31245752'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      '5892مصطفى بالقايد',
      '31245752',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', '5892مصطفى بالقايد', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', '5892مصطفى بالقايد', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '31245752',
        name = '5892مصطفى بالقايد'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1700
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
  -- Find or create customer for 7055 انور الدهبي
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = '7055 انور الدهبي'
      OR phone = '50234083'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      '7055 انور الدهبي',
      '50234083',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', '7055 انور الدهبي', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', '7055 انور الدهبي', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '50234083',
        name = '7055 انور الدهبي'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1800
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
  -- Find or create customer for 7065زهري حكيم
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND (
      name = '7065زهري حكيم'
      OR phone = '55578515'
    )
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      name,
      phone,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      '7065زهري حكيم',
      '55578515',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % with ID %', '7065زهري حكيم', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer % with ID %', '7065زهري حكيم', v_customer_id;

    -- Update customer phone if missing
    UPDATE customers
    SET phone = '55578515',
        name = '7065زهري حكيم'
    WHERE id = v_customer_id
      AND (phone IS NULL OR phone = '' OR name IS NULL OR name = '');
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
      OR monthly_amount != 1500
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle 153 974', v_contract_count;
  END IF;

END $$;



-- End of script
-- Run this script in your Supabase SQL editor
