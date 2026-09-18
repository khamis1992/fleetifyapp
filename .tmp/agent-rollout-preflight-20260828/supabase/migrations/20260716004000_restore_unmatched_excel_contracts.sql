DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_row record;
  v_vehicle_id uuid;
BEGIN
  CREATE TEMP TABLE excel_contract_recovery (
    customer_id uuid,
    contract_id uuid,
    customer_code text,
    contract_number text,
    first_name text,
    last_name text,
    phone text,
    national_id text,
    plate text,
    monthly_amount numeric,
    start_date date,
    end_date date,
    make text,
    model text
  ) ON COMMIT DROP;

  INSERT INTO excel_contract_recovery VALUES
    ('ba9628c8-aff8-4ac0-a510-b64c9a754154', '5009cf17-9299-4eb5-a6c5-0e051002cc25', 'HIST-XLS-SUFIAN-648144', 'HIST-XLS-B70-648144', 'سفيان', 'المختار الصالح', '50428348', '29050401901', '648144', 1500, DATE '2026-05-01', DATE '2027-12-01', 'Bestune', 'B70'),
    ('42c92a86-d50d-4a70-a138-d9e4ae51f8b0', '2732d28f-d460-4d25-8a1e-b7da3ae32323', 'HIST-XLS-ELIAS-706150', 'HIST-XLS-B70-706150', 'ألياس', 'يعقوبي', '70704543', '29678801036', '706150', 1600, DATE '2025-01-01', DATE '2027-12-01', 'Bestune', 'B70'),
    ('8b1f4665-32c5-4cff-a369-c473c7b528ae', '3a9c492e-70af-414b-b627-a5cc7c67fc71', 'HIST-XLS-MAHMOUD-893406', 'HIST-XLS-B70-893406', 'محمود', 'جاسم الصالح', '66684460', '28076000743', '893406', 1600, DATE '2026-02-01', DATE '2027-12-01', 'Bestune', 'B70'),
    ('bce84d00-5b27-4bca-a071-6f19d2b07590', '6dbc94e2-b900-4052-aa0a-a2b29a7179a0', 'HIST-XLS-MEHDI-7038', 'HIST-XLS-T77-7038', 'مهدي', 'محمد القاطري', '51332508', '29478802992', '7038', 1600, DATE '2026-01-01', DATE '2027-12-01', 'Bestune', 'T77 pro'),
    ('87004aeb-f02a-456d-8160-4f8e0338712f', '9613f5b7-6cee-41de-901e-54b8ee6edb64', 'HIST-XLS-OMAR-7054', 'HIST-XLS-T77-7054', 'عمر', 'عبد المولى مبروكي', '31598966', '27978800113', '7054', 1650, DATE '2025-01-01', DATE '2027-12-01', 'Bestune', 'T77 pro'),
    ('3bca27ed-64d8-44d1-a44b-ba2f6099e03f', 'a07e1fea-1171-408c-81b6-51584f40595a', 'HIST-XLS-MOHSEN-5900', 'HIST-XLS-T77-5900', 'محمد عزيز', 'محسن جلالي', '50328969', '30278800821', '5900', 1500, DATE '2026-02-01', DATE '2027-12-01', 'Bestune', 'T77 pro'),
    ('a45a3087-63e1-4797-a911-9129613e8232', '164a3a2b-65a1-471f-884b-b5441baf5c8e', 'HIST-XLS-HAMZA-7071', 'HIST-XLS-T77-7071', 'حمزة', 'زمكيل', '55312830', NULL, '7071', 1500, DATE '2026-03-01', DATE '2027-12-01', 'Bestune', 'T77 pro'),
    ('a07a44c5-a8ca-4bc9-b7f8-07b87e491fb8', '6f1a74e8-0801-4674-98db-229c007fda09', 'HIST-XLS-YOSRI-8213', 'HIST-XLS-GAC-8213', 'يسري', 'بوز عيبة', '51039263', '29778801608', '8213', 1500, DATE '2026-02-01', DATE '2027-12-01', 'GAC', 'GS3');

  FOR v_row IN SELECT * FROM excel_contract_recovery LOOP
    SELECT id
    INTO v_vehicle_id
    FROM public.vehicles
    WHERE company_id = v_company_id
      AND regexp_replace(plate_number, '[^0-9]', '', 'g') = v_row.plate
    ORDER BY created_at
    LIMIT 1;

    IF v_vehicle_id IS NULL THEN
      RAISE EXCEPTION 'Cannot restore %: vehicle % was not found', v_row.contract_number, v_row.plate;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.customers WHERE id = v_row.customer_id
    ) THEN
      INSERT INTO public.customers (
        id, company_id, customer_code, customer_type,
        first_name, last_name, first_name_ar, last_name_ar,
        phone, national_id, is_active, notes
      ) VALUES (
        v_row.customer_id, v_company_id, v_row.customer_code, 'individual',
        v_row.first_name, v_row.last_name, v_row.first_name, v_row.last_name,
        v_row.phone, v_row.national_id, true,
        'Historical customer recovered from a verified Excel payment workbook.'
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.contracts
      WHERE company_id = v_company_id
        AND contract_number = v_row.contract_number
    ) THEN
      INSERT INTO public.contracts (
        id, company_id, customer_id, vehicle_id,
        contract_type, contract_number, contract_date, start_date, end_date,
        monthly_amount, contract_amount, description, status, payment_status,
        vehicle_returned, created_via, license_plate, make, model
      ) VALUES (
        v_row.contract_id, v_company_id, v_row.customer_id, v_vehicle_id,
        'rent_to_own', v_row.contract_number, v_row.start_date, v_row.start_date, v_row.end_date,
        v_row.monthly_amount,
        v_row.monthly_amount * (
          (date_part('year', age(v_row.end_date, v_row.start_date)) * 12)
          + date_part('month', age(v_row.end_date, v_row.start_date)) + 1
        ),
        'Historical contract isolated from current vehicle assignments for verified Excel payment import.',
        'cancelled', 'unpaid', true, 'excel_import_recovery',
        v_row.plate, v_row.make, v_row.model
      );
    END IF;
  END LOOP;
END;
$$;
