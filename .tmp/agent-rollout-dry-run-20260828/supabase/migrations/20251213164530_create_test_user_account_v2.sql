
-- =====================================================
-- CREATE TEST USER ACCOUNT (V2 - Fixed Constraints)
-- =====================================================
-- This migration creates a complete test user for system testing
-- Email: testuser@autoparts.com
-- Password: TestUser123!
-- =====================================================

DO $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_test_email text := 'testuser@autoparts.com';
  v_test_name text := 'Test User';
  v_test_first_name text := 'Test';
  v_test_last_name text := 'User';
  v_employee_number text := 'EMP-TEST-001';
BEGIN
  -- Get first available company ID
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE business_type = 'car_rental'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company found for test user';
  END IF;

  -- Generate a new user ID
  v_user_id := gen_random_uuid();

  -- Insert into auth.users table
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_test_email,
    crypt('TestUser123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', v_test_name),
    'authenticated',
    'authenticated'
  );

  -- Create user profile
  INSERT INTO public.user_profiles (
    id,
    email,
    name,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_test_email,
    v_test_name,
    now(),
    now()
  );

  -- Create employee record with has_system_access = true
  INSERT INTO public.employees (
    id,
    company_id,
    user_id,
    employee_number,
    first_name,
    last_name,
    first_name_ar,
    last_name_ar,
    email,
    phone,
    position,
    position_ar,
    department,
    department_ar,
    hire_date,
    basic_salary,
    allowances,
    has_system_access,
    account_status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    v_user_id,
    v_employee_number,
    v_test_first_name,
    v_test_last_name,
    'اختبار',
    'مستخدم',
    v_test_email,
    '+966500000000',
    'System Tester',
    'مختبر النظام',
    'IT',
    'تقنية المعلومات',
    CURRENT_DATE,
    5000.00,
    1000.00,
    true, -- IMPORTANT: has_system_access must be true when user_id is set
    'active',
    now(),
    now()
  );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST USER CREATED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email: %', v_test_email;
  RAISE NOTICE 'Password: TestUser123!';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Company ID: %', v_company_id;
  RAISE NOTICE 'Employee Number: %', v_employee_number;
  RAISE NOTICE '========================================';

END $$;
;
