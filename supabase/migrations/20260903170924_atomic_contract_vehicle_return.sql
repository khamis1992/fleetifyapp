-- Record a contract vehicle return and reconcile the contract/vehicle state in
-- one database transaction. Repeated submissions update the same checkout
-- report instead of creating duplicates.

BEGIN;

CREATE OR REPLACE FUNCTION public.record_contract_vehicle_return_v1(
  p_contract_id uuid,
  p_inspection_date timestamptz,
  p_mileage_reading integer,
  p_fuel_level numeric,
  p_overall_condition text,
  p_condition_items jsonb DEFAULT '{}'::jsonb,
  p_damage_points jsonb DEFAULT '[]'::jsonb,
  p_damage_items jsonb DEFAULT '[]'::jsonb,
  p_photos jsonb DEFAULT '[]'::jsonb,
  p_notes text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_id uuid := COALESCE(auth.uid(), p_actor_id);
  v_contract public.contracts%ROWTYPE;
  v_vehicle public.vehicles%ROWTYPE;
  v_report_id uuid;
  v_operational_state jsonb;
  v_applied_status text;
  v_maximum_mileage numeric;
  v_is_super_admin boolean := false;
  v_idempotent_replay boolean := false;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles role
    WHERE role.user_id = v_actor_id
      AND role.role::text = 'super_admin'
  ) INTO v_is_super_admin;

  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONTRACT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_is_super_admin
     AND public.get_user_company_id() IS DISTINCT FROM v_contract.company_id
  THEN
    RAISE EXCEPTION 'COMPANY_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  IF v_contract.vehicle_id IS NULL THEN
    RAISE EXCEPTION 'CONTRACT_VEHICLE_MISSING' USING ERRCODE = '23514';
  END IF;

  SELECT vehicle.*
  INTO v_vehicle
  FROM public.vehicles vehicle
  WHERE vehicle.id = v_contract.vehicle_id
    AND vehicle.company_id = v_contract.company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VEHICLE_NOT_FOUND_FOR_CONTRACT' USING ERRCODE = 'P0002';
  END IF;

  SELECT report.id
  INTO v_report_id
  FROM public.vehicle_condition_reports report
  WHERE report.company_id = v_contract.company_id
    AND report.contract_id = v_contract.id
    AND report.inspection_type = 'check_out'
  ORDER BY report.inspection_date DESC, report.created_at DESC, report.id DESC
  LIMIT 1
  FOR UPDATE;

  v_idempotent_replay := v_contract.vehicle_returned IS TRUE AND v_report_id IS NOT NULL;

  IF NOT v_idempotent_replay THEN
    IF p_inspection_date IS NULL OR p_inspection_date > now() + interval '15 minutes' THEN
      RAISE EXCEPTION 'INVALID_RETURN_DATE' USING ERRCODE = '22007';
    END IF;

    IF p_mileage_reading IS NULL OR p_mileage_reading <= 0 THEN
      RAISE EXCEPTION 'INVALID_MILEAGE' USING ERRCODE = '22003';
    END IF;

    v_maximum_mileage := GREATEST(
      COALESCE(v_vehicle.current_mileage, 0),
      COALESCE(v_vehicle.odometer_reading, 0)
    );

    IF p_mileage_reading < v_maximum_mileage THEN
      RAISE EXCEPTION 'MILEAGE_BELOW_CURRENT:%', v_maximum_mileage
        USING ERRCODE = '23514';
    END IF;

    IF p_fuel_level IS NOT NULL AND (p_fuel_level < 0 OR p_fuel_level > 100) THEN
      RAISE EXCEPTION 'INVALID_FUEL_LEVEL' USING ERRCODE = '22003';
    END IF;

    IF COALESCE(btrim(p_overall_condition), '') NOT IN ('good', 'fair', 'poor') THEN
      RAISE EXCEPTION 'INVALID_OVERALL_CONDITION' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_idempotent_replay THEN
    -- A committed return may be retried after a lost HTTP response. Preserve the
    -- authoritative report and its photo references instead of overwriting it.
    NULL;
  ELSIF v_report_id IS NULL THEN
    INSERT INTO public.vehicle_condition_reports (
      contract_id,
      vehicle_id,
      company_id,
      inspector_id,
      inspection_type,
      inspection_date,
      mileage_reading,
      fuel_level,
      overall_condition,
      condition_items,
      damage_points,
      damage_items,
      photos,
      notes,
      status
    ) VALUES (
      v_contract.id,
      v_contract.vehicle_id,
      v_contract.company_id,
      v_actor_id,
      'check_out',
      p_inspection_date,
      p_mileage_reading,
      p_fuel_level,
      p_overall_condition,
      COALESCE(p_condition_items, '{}'::jsonb),
      COALESCE(p_damage_points, '[]'::jsonb),
      COALESCE(p_damage_items, '[]'::jsonb),
      COALESCE(p_photos, '[]'::jsonb),
      NULLIF(btrim(p_notes), ''),
      'approved'
    )
    RETURNING id INTO v_report_id;
  ELSE
    UPDATE public.vehicle_condition_reports report
    SET vehicle_id = v_contract.vehicle_id,
        inspector_id = v_actor_id,
        inspection_date = p_inspection_date,
        mileage_reading = p_mileage_reading,
        fuel_level = p_fuel_level,
        overall_condition = p_overall_condition,
        condition_items = COALESCE(p_condition_items, '{}'::jsonb),
        damage_points = COALESCE(p_damage_points, '[]'::jsonb),
        damage_items = COALESCE(p_damage_items, '[]'::jsonb),
        photos = COALESCE(p_photos, '[]'::jsonb),
        notes = NULLIF(btrim(p_notes), ''),
        status = 'approved',
        updated_at = now()
    WHERE report.id = v_report_id;
  END IF;

  IF NOT v_idempotent_replay THEN
    UPDATE public.vehicles vehicle
    SET current_mileage = p_mileage_reading,
        odometer_reading = p_mileage_reading,
        updated_at = now()
    WHERE vehicle.id = v_contract.vehicle_id
      AND vehicle.company_id = v_contract.company_id;
  END IF;

  UPDATE public.contracts contract
  SET vehicle_returned = true,
      updated_at = now()
  WHERE contract.id = v_contract.id
    AND contract.company_id = v_contract.company_id;

  v_operational_state := public.refresh_vehicle_operational_status_v1(
    v_contract.vehicle_id,
    v_contract.company_id
  );
  v_applied_status := COALESCE(
    NULLIF(v_operational_state ->> 'applied_status', ''),
    v_vehicle.status::text
  );

  UPDATE public.contracts contract
  SET vehicle_status = v_applied_status,
      updated_at = now()
  WHERE contract.id = v_contract.id
    AND contract.company_id = v_contract.company_id;

  IF NOT v_idempotent_replay THEN
    INSERT INTO public.contract_operations_log (
      contract_id,
      company_id,
      operation_type,
      operation_details,
      old_values,
      new_values,
      notes,
      performed_by
    ) VALUES (
      v_contract.id,
      v_contract.company_id,
      'vehicle_return_recorded',
      jsonb_build_object(
        'report_id', v_report_id,
        'vehicle_id', v_contract.vehicle_id,
        'inspection_date', p_inspection_date,
        'mileage_reading', p_mileage_reading,
        'fuel_level', p_fuel_level,
        'overall_condition', p_overall_condition
      ),
      jsonb_build_object(
        'vehicle_returned', COALESCE(v_contract.vehicle_returned, false),
        'vehicle_status', v_contract.vehicle_status
      ),
      jsonb_build_object(
        'vehicle_returned', true,
        'vehicle_status', v_applied_status
      ),
      'تم تسجيل إرجاع المركبة وتحديث حالتها التشغيلية ذرياً',
      v_actor_id
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'report_id', v_report_id,
    'contract_id', v_contract.id,
    'vehicle_id', v_contract.vehicle_id,
    'vehicle_status', v_applied_status,
    'vehicle_returned', true,
    'idempotent_replay', v_idempotent_replay,
    'operational_state', v_operational_state
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_contract_vehicle_return_v1(
  uuid, timestamptz, integer, numeric, text, jsonb, jsonb, jsonb, jsonb, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_contract_vehicle_return_v1(
  uuid, timestamptz, integer, numeric, text, jsonb, jsonb, jsonb, jsonb, text, uuid
) TO authenticated, service_role;

COMMENT ON FUNCTION public.record_contract_vehicle_return_v1(
  uuid, timestamptz, integer, numeric, text, jsonb, jsonb, jsonb, jsonb, text, uuid
) IS 'Atomically records an idempotent checkout inspection, marks the contract vehicle returned, and derives the safe operational vehicle status.';

COMMIT;
