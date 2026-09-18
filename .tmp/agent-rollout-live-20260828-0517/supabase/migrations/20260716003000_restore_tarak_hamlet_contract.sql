DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_customer_id uuid := '7e28b728-2b1e-4ad4-9ff8-989400011400';
  v_contract_id uuid := 'c6a9657a-c206-467e-bb42-82b2b2e3f32a';
  v_vehicle_id uuid;
BEGIN
  SELECT id
  INTO v_vehicle_id
  FROM public.vehicles
  WHERE company_id = v_company_id
    AND regexp_replace(plate_number, '[^0-9]', '', 'g') = '9894'
  ORDER BY created_at
  LIMIT 1;

  IF v_vehicle_id IS NULL THEN
    RAISE EXCEPTION 'Cannot restore LTO2024114: company vehicle 9894 was not found';
  END IF;

  SELECT id
  INTO v_customer_id
  FROM public.customers
  WHERE company_id = v_company_id
    AND (
      national_id = '27901200323'
      OR regexp_replace(phone, '[^0-9]', '', 'g') IN ('30058936', '97430058936')
    )
  ORDER BY created_at
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    v_customer_id := '7e28b728-2b1e-4ad4-9ff8-989400011400';
    INSERT INTO public.customers (
      id,
      company_id,
      customer_code,
      customer_type,
      first_name,
      last_name,
      first_name_ar,
      last_name_ar,
      phone,
      national_id,
      is_active,
      notes
    ) VALUES (
      v_customer_id,
      v_company_id,
      'HIST-XLS-TARAK-9894',
      'individual',
      'tarak',
      'hamlet',
      'طارق',
      'هملت',
      '97430058936',
      '27901200323',
      true,
      'Restored from the legacy agreement registry and verified Excel workbook.'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts
    WHERE company_id = v_company_id
      AND contract_number = 'LTO2024114'
  ) THEN
    INSERT INTO public.contracts (
      id,
      company_id,
      customer_id,
      vehicle_id,
      contract_type,
      contract_number,
      contract_date,
      start_date,
      end_date,
      monthly_amount,
      contract_amount,
      description,
      status,
      payment_status,
      vehicle_returned,
      created_via,
      license_plate,
      make,
      model,
      year
    ) VALUES (
      v_contract_id,
      v_company_id,
      v_customer_id,
      v_vehicle_id,
      'rent_to_own',
      'LTO2024114',
      DATE '2023-01-01',
      DATE '2023-01-01',
      DATE '2026-01-01',
      375,
      13500,
      'Historical contract restored for Excel payment import. Legacy registry amount was QAR 350; workbook amount is QAR 375.',
      'cancelled',
      'unpaid',
      true,
      'excel_import_recovery',
      '9894',
      'Bestune',
      'T33',
      2022
    );
  END IF;
END;
$$;
