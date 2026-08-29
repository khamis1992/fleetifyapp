-- Keep the billing-graph guard active for all direct writes. Only the existing
-- audited amendment command opts in after its approval and integrity checks.
CREATE OR REPLACE FUNCTION public.apply_contract_amendment(p_amendment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_amendment public.contract_amendments%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_unknown_keys text[];
  v_start_date date;
  v_end_date date;
  v_contract_amount numeric;
  v_monthly_amount numeric;
  v_vehicle_id uuid;
BEGIN
  IF p_amendment_id IS NULL THEN
    RAISE EXCEPTION 'Amendment is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_amendment
  FROM public.contract_amendments amendment
  WHERE amendment.id = p_amendment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Amendment not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    IF auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM v_amendment.company_id THEN
      RAISE EXCEPTION 'Not authorized to apply amendments for this company' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles role
      WHERE role.user_id = auth.uid()
        AND role.role::text IN ('company_admin', 'manager', 'super_admin')
    ) THEN
      RAISE EXCEPTION 'Manager permission is required to apply amendments' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_amendment.status <> 'approved' THEN
    RAISE EXCEPTION 'Amendment must be approved before applying' USING ERRCODE = 'P0001';
  END IF;
  IF v_amendment.applied_at IS NOT NULL THEN
    RAISE EXCEPTION 'Amendment has already been applied' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(v_amendment.requires_customer_signature, false)
     AND NOT COALESCE(v_amendment.customer_signed, false)
  THEN
    RAISE EXCEPTION 'Customer signature is required before applying this amendment' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_typeof(v_amendment.new_values) <> 'object' OR v_amendment.new_values = '{}'::jsonb THEN
    RAISE EXCEPTION 'Amendment changes must be a non-empty object' USING ERRCODE = 'P0001';
  END IF;

  SELECT array_agg(key)
  INTO v_unknown_keys
  FROM jsonb_object_keys(v_amendment.new_values) AS fields(key)
  WHERE key NOT IN (
    'start_date', 'end_date', 'contract_amount', 'monthly_amount',
    'description', 'terms', 'vehicle_id', 'contract_type'
  );
  IF v_unknown_keys IS NOT NULL THEN
    RAISE EXCEPTION 'Unsupported amendment fields: %', array_to_string(v_unknown_keys, ', ')
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_amendment.contract_id
    AND contract.company_id = v_amendment.company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Amendment contract not found in the same company' USING ERRCODE = 'P0001';
  END IF;

  v_start_date := CASE WHEN v_amendment.new_values ? 'start_date'
    THEN NULLIF(v_amendment.new_values ->> 'start_date', '')::date ELSE v_contract.start_date END;
  v_end_date := CASE WHEN v_amendment.new_values ? 'end_date'
    THEN NULLIF(v_amendment.new_values ->> 'end_date', '')::date ELSE v_contract.end_date END;
  v_contract_amount := CASE WHEN v_amendment.new_values ? 'contract_amount'
    THEN (v_amendment.new_values ->> 'contract_amount')::numeric ELSE v_contract.contract_amount END;
  v_monthly_amount := CASE WHEN v_amendment.new_values ? 'monthly_amount'
    THEN (v_amendment.new_values ->> 'monthly_amount')::numeric ELSE v_contract.monthly_amount END;
  v_vehicle_id := CASE WHEN v_amendment.new_values ? 'vehicle_id'
    THEN NULLIF(v_amendment.new_values ->> 'vehicle_id', '')::uuid ELSE v_contract.vehicle_id END;

  IF v_start_date IS NULL OR v_end_date IS NULL OR v_end_date < v_start_date THEN
    RAISE EXCEPTION 'Amendment contract dates are invalid' USING ERRCODE = 'P0001';
  END IF;
  IF v_contract_amount <= 0 OR v_monthly_amount <= 0 THEN
    RAISE EXCEPTION 'Amendment amounts must be positive' USING ERRCODE = 'P0001';
  END IF;
  IF v_vehicle_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.vehicles vehicle
    WHERE vehicle.id = v_vehicle_id
      AND vehicle.company_id = v_amendment.company_id
  ) THEN
    RAISE EXCEPTION 'Amendment vehicle does not belong to the contract company' USING ERRCODE = 'P0001';
  END IF;

  -- The amendment has passed approval, tenant, signature, value and vehicle checks.
  -- Opt into the billing-graph guard for this transaction only.
  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);

  UPDATE public.contracts contract
  SET start_date = v_start_date,
      end_date = v_end_date,
      contract_amount = v_contract_amount,
      monthly_amount = v_monthly_amount,
      balance_due = greatest(0, v_contract_amount - COALESCE(contract.total_paid, 0)),
      description = CASE WHEN v_amendment.new_values ? 'description'
        THEN CASE WHEN jsonb_typeof(v_amendment.new_values -> 'description') = 'null'
          THEN NULL ELSE v_amendment.new_values ->> 'description' END
        ELSE contract.description END,
      terms = CASE WHEN v_amendment.new_values ? 'terms'
        THEN CASE WHEN jsonb_typeof(v_amendment.new_values -> 'terms') = 'null'
          THEN NULL ELSE v_amendment.new_values ->> 'terms' END
        ELSE contract.terms END,
      vehicle_id = v_vehicle_id,
      contract_type = CASE WHEN v_amendment.new_values ? 'contract_type'
        THEN v_amendment.new_values ->> 'contract_type' ELSE contract.contract_type END,
      updated_at = now()
  WHERE contract.id = v_contract.id
    AND contract.company_id = v_amendment.company_id;

  UPDATE public.contract_amendments amendment
  SET applied_at = now(), updated_at = now()
  WHERE amendment.id = v_amendment.id
    AND amendment.company_id = v_amendment.company_id;

  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract.id,
    'amendment_id', v_amendment.id,
    'applied_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.apply_contract_amendment(UUID)
  IS 'Applies an approved contract amendment atomically after tenant, approval, signature, value, and vehicle validation.';

;
