-- Fix for Duplicate Customer Code Error
-- Problem: Customer with code "IND-25-0709" already exists
-- Solution: Check if customer exists first, or generate new unique code

DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_customer_id UUID;
  v_customer_code TEXT;
  v_attempt INT := 0;
  v_max_code INT;
BEGIN
  -- Option 1: Try to find existing customer by phone
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = v_company_id
    AND phone = '50529648'
  LIMIT 1;

  IF v_customer_id IS NOT NULL THEN
    RAISE NOTICE 'Customer already exists with ID: %', v_customer_id;
    -- You can return the existing customer ID instead of creating new
    RETURN;
  END IF;

  -- Option 2: Generate a new unique customer code
  -- Find the next available code in the sequence
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 
    0
  ) INTO v_max_code
  FROM customers
  WHERE company_id = v_company_id
    AND customer_code LIKE 'IND-25-%';

  -- Generate new code
  v_customer_code := 'IND-25-' || LPAD((v_max_code + 1)::TEXT, 4, '0');

  RAISE NOTICE 'Generated new customer code: %', v_customer_code;

  -- Insert with the new unique code
  INSERT INTO customers (
    id,
    company_id,
    first_name_ar,
    customer_type,
    phone,
    customer_code,  -- IMPORTANT: Include customer_code
    is_active,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'هيثم خليفة يعلي',
    'individual',
    '50529648',
    v_customer_code,  -- Use the generated code
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_customer_id;

  RAISE NOTICE 'Created new customer with ID: % and code: %', v_customer_id, v_customer_code;

EXCEPTION
  WHEN unique_violation THEN
    -- If still duplicate (race condition), try one more time with timestamp
    v_customer_code := 'IND-25-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
    
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      customer_code,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_company_id,
      'هيثم خليفة يعلي',
      'individual',
      '50529648',
      v_customer_code,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created customer with timestamp-based code: %', v_customer_code;
END;
$$;
