-- One-contract operational repair. Apply only after explicit operator approval.
-- The business key is globally unique in the verified production preflight;
-- all assertions fail closed and PostgreSQL rolls the transaction back.
DO $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_contract_count INTEGER;
  v_vehicle_id UUID;
  v_vehicle_count INTEGER;
  v_profile_count INTEGER;
  v_case_count INTEGER;
  v_amendment_id UUID;
  v_repair_result JSONB;
BEGIN
  SELECT COUNT(*) INTO v_contract_count
  FROM public.contracts
  WHERE contract_number = 'LTO2024284';
  IF v_contract_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one contract LTO2024284, found %', v_contract_count;
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts
  WHERE contract_number = 'LTO2024284'
  FOR UPDATE;
  IF v_contract.vehicle_id IS NOT NULL THEN
    RAISE EXCEPTION 'Contract LTO2024284 already has a canonical vehicle; manual review required';
  END IF;

  SELECT COUNT(*), (ARRAY_AGG(v.id ORDER BY v.id))[1]
    INTO v_vehicle_count, v_vehicle_id
  FROM public.vehicles v
  WHERE v.company_id = v_contract.company_id
    AND regexp_replace(
      translate(COALESCE(v.plate_number, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'),
      '[^0-9A-Za-z]', '', 'g'
    ) = regexp_replace(
      translate(COALESCE(v_contract.license_plate, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'),
      '[^0-9A-Za-z]', '', 'g'
    );
  IF v_vehicle_count <> 1 OR v_vehicle_id IS NULL THEN
    RAISE EXCEPTION 'Expected exactly one same-company vehicle matching the legacy plate, found %', v_vehicle_count;
  END IF;

  SELECT COUNT(*) INTO v_profile_count
  FROM public.legal_case_litigation_profile p
  WHERE p.company_id = v_contract.company_id
    AND p.contract_id = v_contract.id;
  IF v_profile_count <> 0 THEN
    RAISE EXCEPTION 'Expected no existing litigation profile, found %', v_profile_count;
  END IF;

  SELECT COUNT(*) INTO v_case_count
  FROM public.legal_cases lc
  WHERE lc.company_id = v_contract.company_id
    AND lc.contract_id = v_contract.id
    AND lc.workflow_stage = 'preparation';
  IF v_case_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one preparation case, found %', v_case_count;
  END IF;

  INSERT INTO public.contract_amendments (
    company_id,
    contract_id,
    amendment_number,
    amendment_type,
    amendment_reason,
    original_values,
    new_values,
    changes_summary,
    amount_difference,
    requires_payment_adjustment,
    status,
    approved_at,
    approval_notes,
    requires_customer_signature,
    customer_signed,
    effective_date
  ) VALUES (
    v_contract.company_id,
    v_contract.id,
    v_contract.contract_number || '-AMD-SYS-20260826',
    'change_vehicle',
    'تصحيح ربط سجل المركبة المفقود للعقد القديم وفق تطابق لوحة وحيد داخل الشركة؛ لا يغير المقابل المالي أو مدة العقد.',
    jsonb_build_object('vehicle_id', v_contract.vehicle_id),
    jsonb_build_object('vehicle_id', v_vehicle_id),
    jsonb_build_object(
      'vehicle_id', jsonb_build_object('old', v_contract.vehicle_id, 'new', v_vehicle_id),
      'source', 'legal_filing_readiness_repair',
      'plate_match', v_contract.license_plate
    ),
    0,
    FALSE,
    'approved',
    NOW(),
    'اعتماد إداري لتصحيح رابط بيانات مفقود؛ المركبة مطابقة وحيدة داخل الشركة ولا يوجد تغيير مالي.',
    FALSE,
    FALSE,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::DATE
  )
  RETURNING id INTO v_amendment_id;

  -- This is the audited atomic amendment path: the row is approved, locked,
  -- has zero financial impact, and the target vehicle is same-company/unique.
  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);
  UPDATE public.contracts c
  SET vehicle_id = v_vehicle_id,
      updated_at = NOW()
  WHERE c.id = v_contract.id
    AND c.company_id = v_contract.company_id
    AND c.vehicle_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The contract changed concurrently; repair aborted';
  END IF;

  UPDATE public.contract_amendments a
  SET applied_at = NOW(),
      updated_at = NOW()
  WHERE a.id = v_amendment_id
    AND a.company_id = v_contract.company_id;

  v_repair_result := public.repair_legal_preparation_case_v1(
    v_contract.company_id,
    v_contract.id,
    NULL
  );
  IF (v_repair_result ->> 'claim_amount')::NUMERIC <> 36000
     OR COALESCE((v_repair_result ->> 'vehicle_linked')::BOOLEAN, FALSE) IS NOT TRUE
     OR COALESCE((v_repair_result ->> 'profile_created')::BOOLEAN, FALSE) IS NOT TRUE
     OR (v_repair_result ->> 'preparation_cases_repaired')::INTEGER <> 1 THEN
    RAISE EXCEPTION 'Unexpected repair result: %', v_repair_result;
  END IF;
END;
$$;

;
