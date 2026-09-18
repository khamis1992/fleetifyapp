DO $$
DECLARE
  v_amendment public.contract_amendments%ROWTYPE;
  v_audit public.legal_filing_repair_audit%ROWTYPE;
  v_case JSONB;
BEGIN
  SELECT * INTO v_amendment
  FROM public.contract_amendments a
  WHERE a.amendment_number = 'LTO2024284-AMD-SYS-20260826'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'System repair amendment was not found';
  END IF;

  SELECT * INTO v_audit
  FROM public.legal_filing_repair_audit a
  WHERE a.company_id = v_amendment.company_id
    AND a.contract_id = v_amendment.contract_id
  ORDER BY a.repaired_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legal filing repair audit was not found';
  END IF;

  FOR v_case IN SELECT value FROM jsonb_array_elements(v_audit.legal_cases_before)
  LOOP
    UPDATE public.legal_cases lc
    SET case_value = (v_case ->> 'case_value')::NUMERIC,
        filing_date = CASE
          WHEN jsonb_typeof(v_case -> 'filing_date') = 'null' THEN NULL
          ELSE (v_case ->> 'filing_date')::DATE
        END,
        updated_at = NOW()
    WHERE lc.id = (v_case ->> 'id')::UUID
      AND lc.company_id = v_audit.company_id
      AND lc.contract_id = v_audit.contract_id;
  END LOOP;

  IF v_audit.created_profile_id IS NOT NULL THEN
    DELETE FROM public.legal_case_litigation_profile p
    WHERE p.id = v_audit.created_profile_id
      AND p.company_id = v_audit.company_id
      AND p.contract_id = v_audit.contract_id;
  END IF;

  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);
  UPDATE public.contracts c
  SET vehicle_id = NULLIF(v_amendment.original_values ->> 'vehicle_id', '')::UUID,
      updated_at = NOW()
  WHERE c.id = v_amendment.contract_id
    AND c.company_id = v_amendment.company_id;

  DELETE FROM public.legal_filing_repair_audit a
  WHERE a.id = v_audit.id;
  DELETE FROM public.contract_amendments a
  WHERE a.id = v_amendment.id;
END;
$$;
