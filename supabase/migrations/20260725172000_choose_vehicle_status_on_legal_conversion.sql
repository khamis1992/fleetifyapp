-- Let the operator decide whether the vehicle was physically returned during
-- legal conversion. The contract already has a canonical vehicle_returned flag;
-- vehicle availability must derive from that fact instead of the legal status alone.

CREATE OR REPLACE FUNCTION public.system_agent_vehicle_derived_state(
  p_vehicle_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle public.vehicles%ROWTYPE;
  v_has_active_contract boolean := false;
  v_has_open_maintenance boolean := false;
  v_has_active_reservation boolean := false;
  v_target_status text;
  v_maximum_mileage numeric := 0;
BEGIN
  SELECT * INTO v_vehicle
  FROM public.vehicles vehicle
  WHERE vehicle.id = p_vehicle_id
    AND vehicle.company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.company_id = p_company_id
      AND contract.vehicle_id = p_vehicle_id
      AND (
        lower(COALESCE(contract.status::text, '')) = 'active'
        OR (
          lower(COALESCE(contract.status::text, '')) = 'under_legal_procedure'
          AND COALESCE(contract.vehicle_returned, false) = false
        )
      )
      AND (contract.start_date IS NULL OR contract.start_date <= CURRENT_DATE)
      AND (contract.end_date IS NULL OR contract.end_date >= CURRENT_DATE)
  ) INTO v_has_active_contract;

  SELECT EXISTS (
    SELECT 1
    FROM public.vehicle_maintenance maintenance
    WHERE maintenance.company_id = p_company_id
      AND maintenance.vehicle_id = p_vehicle_id
      AND lower(COALESCE(maintenance.status::text, '')) = 'in_progress'
  ) INTO v_has_open_maintenance;

  SELECT EXISTS (
    SELECT 1
    FROM public.vehicle_reservations reservation
    WHERE reservation.company_id = p_company_id
      AND reservation.vehicle_id = p_vehicle_id
      AND lower(COALESCE(reservation.status::text, '')) NOT IN (
        'cancelled', 'canceled', 'completed', 'expired'
      )
      AND reservation.start_date <= CURRENT_DATE
      AND reservation.end_date >= CURRENT_DATE
  ) INTO v_has_active_reservation;

  v_target_status := CASE
    WHEN lower(COALESCE(v_vehicle.status::text, '')) IN (
      'maintenance', 'accident', 'stolen', 'police_station',
      'out_of_service', 'reserved_employee', 'municipality'
    ) THEN NULL
    WHEN v_has_open_maintenance THEN 'maintenance'
    WHEN v_has_active_contract THEN 'rented'
    WHEN v_has_active_reservation THEN 'street_52'
    WHEN lower(COALESCE(v_vehicle.status::text, '')) = 'street_52' THEN NULL
    WHEN v_vehicle.is_active = false THEN 'out_of_service'
    ELSE 'available'
  END;

  SELECT GREATEST(
    COALESCE(v_vehicle.current_mileage, 0),
    COALESCE(v_vehicle.odometer_reading, 0),
    COALESCE(MAX(reading.odometer_reading), 0)
  )
  INTO v_maximum_mileage
  FROM public.odometer_readings reading
  WHERE reading.company_id = p_company_id
    AND reading.vehicle_id = p_vehicle_id;

  RETURN jsonb_build_object(
    'target_status', v_target_status,
    'maximum_mileage', round(v_maximum_mileage::numeric, 2),
    'has_active_contract', v_has_active_contract,
    'has_open_maintenance', v_has_open_maintenance,
    'has_active_reservation', v_has_active_reservation
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_vehicle_returned boolean,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_contract public.contracts%ROWTYPE;
  v_case public.legal_cases%ROWTYPE;
  v_case_number text;
  v_penalties numeric;
  v_name text;
  v_phone text;
  v_email text;
  v_vehicle_plate text;
  v_vehicle_old_status text;
  v_value numeric;
  v_state jsonb;
  v_target text;
BEGIN
  v_actor_id := CASE
    WHEN auth.uid() IS NOT NULL THEN auth.uid()
    ELSE p_actor_id
  END;

  IF v_actor_id IS NULL
     OR (
       auth.uid() IS NULL
       AND COALESCE(auth.role(), '') <> 'service_role'
     )
  THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NOT NULL
     AND public.get_user_company_id() IS DISTINCT FROM p_company_id
  THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      p_company_id::text || ':legal-contract:' || p_contract_id::text,
      0
    )
  );

  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract was not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_case
  FROM public.legal_cases
  WHERE company_id = p_company_id
    AND contract_id = p_contract_id
    AND lower(COALESCE(case_status, '')) IN (
      'open', 'active', 'pending', 'on_hold', 'under_review'
    )
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'legal_case', to_jsonb(v_case),
      'case_number', v_case.case_number,
      'total_case_value', v_case.case_value,
      'vehicle_returned', v_contract.vehicle_returned
    );
  END IF;

  SELECT
    COALESCE(
      NULLIF(company_name_ar, ''),
      NULLIF(company_name, ''),
      NULLIF(concat_ws(' ', first_name_ar, last_name_ar), ''),
      NULLIF(concat_ws(' ', first_name, last_name), ''),
      'عميل'
    ),
    phone,
    email
  INTO v_name, v_phone, v_email
  FROM public.customers
  WHERE id = v_contract.customer_id
    AND company_id = p_company_id;

  IF NOT FOUND THEN
    v_name := 'عميل';
    v_phone := NULL;
    v_email := NULL;
  END IF;

  SELECT plate_number, status::text
  INTO v_vehicle_plate, v_vehicle_old_status
  FROM public.vehicles
  WHERE id = v_contract.vehicle_id
    AND company_id = p_company_id;

  SELECT COALESCE(sum(amount), 0)
  INTO v_penalties
  FROM public.penalties
  WHERE company_id = p_company_id
    AND contract_id = p_contract_id
    AND lower(COALESCE(payment_status, '')) <> 'paid'
    AND lower(COALESCE(status, '')) <> 'cancelled';

  v_value :=
    COALESCE(v_contract.balance_due, 0)
    + COALESCE(v_contract.late_fine_amount, 0)
    + v_penalties;
  v_case_number := public.generate_legal_case_number(p_company_id);

  INSERT INTO public.legal_cases(
    company_id,
    contract_id,
    case_number,
    case_title,
    case_title_ar,
    case_type,
    case_status,
    priority,
    client_id,
    client_name,
    client_phone,
    client_email,
    case_value,
    description,
    notes,
    legal_fees,
    court_fees,
    other_expenses,
    total_costs,
    billing_status,
    is_confidential,
    legal_team,
    tags,
    filing_date,
    created_by
  )
  VALUES(
    p_company_id,
    p_contract_id,
    v_case_number,
    'تحصيل مستحقات عقد ' || v_contract.contract_number,
    'تحصيل مستحقات عقد ' || v_contract.contract_number,
    COALESCE(NULLIF(BTRIM(p_case_type), ''), 'payment_collection'),
    'pending',
    COALESCE(NULLIF(BTRIM(p_priority), ''), 'high'),
    v_contract.customer_id,
    v_name,
    v_phone,
    v_email,
    v_value,
    'قضية تحصيل مستحقات للعقد رقم ' || v_contract.contract_number,
    concat_ws(
      E'\n',
      'رقم العقد: ' || v_contract.contract_number,
      'رقم لوحة المركبة: ' || COALESCE(v_vehicle_plate, '-'),
      CASE
        WHEN COALESCE(p_vehicle_returned, false)
          THEN 'حالة المركبة عند التحويل: تم استلامها'
        ELSE 'حالة المركبة عند التحويل: ما زالت لدى العميل'
      END,
      NULLIF(BTRIM(COALESCE(p_notes, '')), '')
    ),
    0,
    0,
    0,
    0,
    'pending',
    false,
    '[]'::jsonb,
    jsonb_build_array('تحويل_من_عقد', v_contract.contract_number),
    CURRENT_DATE,
    v_actor_id
  )
  RETURNING * INTO v_case;

  UPDATE public.contracts
  SET
    status = 'under_legal_procedure',
    suspension_reason = 'تم التحويل للشؤون القانونية - قضية رقم ' || v_case_number,
    vehicle_returned = COALESCE(p_vehicle_returned, false),
    vehicle_status = CASE
      WHEN COALESCE(p_vehicle_returned, false) THEN 'available'
      ELSE 'rented'
    END,
    updated_at = now()
  WHERE id = p_contract_id
    AND company_id = p_company_id;

  IF v_contract.vehicle_id IS NOT NULL THEN
    v_state := public.system_agent_vehicle_derived_state(
      v_contract.vehicle_id,
      p_company_id
    );
    v_target := v_state ->> 'target_status';

    IF v_target IS NOT NULL THEN
      UPDATE public.vehicles
      SET
        status = v_target::public.vehicle_status,
        updated_at = now()
      WHERE id = v_contract.vehicle_id
        AND company_id = p_company_id;
    ELSE
      SELECT status::text
      INTO v_target
      FROM public.vehicles
      WHERE id = v_contract.vehicle_id
        AND company_id = p_company_id;
    END IF;
  END IF;

  INSERT INTO public.contract_operations_log(
    contract_id,
    company_id,
    operation_type,
    operation_details,
    old_values,
    new_values,
    notes,
    performed_by
  )
  VALUES(
    p_contract_id,
    p_company_id,
    'convert_to_legal',
    jsonb_build_object(
      'legal_case_id', v_case.id,
      'legal_case_number', v_case_number,
      'total_case_value', v_value,
      'vehicle_returned', COALESCE(p_vehicle_returned, false)
    ),
    jsonb_build_object(
      'status', v_contract.status,
      'vehicle_returned', v_contract.vehicle_returned,
      'vehicle_status', v_vehicle_old_status
    ),
    jsonb_build_object(
      'status', 'under_legal_procedure',
      'vehicle_returned', COALESCE(p_vehicle_returned, false),
      'vehicle_status', v_target,
      'legal_case_id', v_case.id,
      'legal_case_number', v_case_number
    ),
    CASE
      WHEN COALESCE(p_vehicle_returned, false)
        THEN 'تم التحويل للشؤون القانونية وتسجيل استلام المركبة'
      ELSE 'تم التحويل للشؤون القانونية والمركبة ما زالت لدى العميل'
    END,
    v_actor_id
  );

  RETURN jsonb_build_object(
    'legal_case', to_jsonb(v_case),
    'case_number', v_case_number,
    'total_case_value', v_value,
    'vehicle_returned', COALESCE(p_vehicle_returned, false),
    'vehicle_status', v_target
  );
END;
$$;

-- Compatibility wrapper for already-deployed clients. The safe legacy default
-- is to keep the vehicle unavailable until an operator confirms its return.
CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.convert_contract_to_legal_v1(
    p_company_id,
    p_contract_id,
    p_notes,
    p_priority,
    p_case_type,
    false,
    p_actor_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, uuid
) TO authenticated, service_role;

COMMENT ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) IS
'Atomically creates a legal case and applies the operator-confirmed vehicle return decision.';
