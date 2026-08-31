BEGIN;

CREATE OR REPLACE FUNCTION public.create_contract_with_violation_override_atomic(
  p_company_id uuid,
  p_customer_id uuid,
  p_vehicle_id uuid DEFAULT NULL,
  p_contract_type text DEFAULT 'rental',
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_contract_amount numeric DEFAULT 0,
  p_monthly_amount numeric DEFAULT 0,
  p_description text DEFAULT NULL,
  p_terms text DEFAULT NULL,
  p_cost_center_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_assigned_to_profile_id uuid DEFAULT NULL,
  p_contract_date date DEFAULT CURRENT_DATE,
  p_auto_renew_enabled boolean DEFAULT false,
  p_created_via text DEFAULT 'atomic_billing_graph',
  p_idempotency_key text DEFAULT NULL,
  p_accept_unpaid_violations boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
  v_vehicle_penalty_count integer := 0;
  v_vehicle_penalty_total numeric := 0;
  v_customer_penalty_count integer := 0;
  v_customer_penalty_total numeric := 0;
  v_contract_result jsonb;
  v_contract_id uuid;
BEGIN
  IF p_company_id IS NULL OR p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Company and customer are required' USING ERRCODE = 'P0001';
  END IF;

  SELECT
    count(*)::integer,
    COALESCE(sum(COALESCE(penalty.amount, 0)), 0)
  INTO v_vehicle_penalty_count, v_vehicle_penalty_total
  FROM public.penalties penalty
  WHERE penalty.company_id = p_company_id
    AND p_vehicle_id IS NOT NULL
    AND penalty.vehicle_id = p_vehicle_id
    AND lower(COALESCE(penalty.payment_status, 'unpaid')) NOT IN ('paid', 'completed');

  SELECT
    count(*)::integer,
    COALESCE(sum(COALESCE(penalty.amount, 0)), 0)
  INTO v_customer_penalty_count, v_customer_penalty_total
  FROM public.penalties penalty
  WHERE penalty.company_id = p_company_id
    AND penalty.customer_id = p_customer_id
    AND lower(COALESCE(penalty.payment_status, 'unpaid')) NOT IN ('paid', 'completed');

  IF v_vehicle_penalty_count > 0 OR v_customer_penalty_count > 0 THEN
    IF NOT COALESCE(p_accept_unpaid_violations, false) THEN
      RAISE EXCEPTION
        'توجد مخالفات غير مسددة على المركبة أو العميل. يجب الاطلاع عليها وتأكيد الموافقة قبل إنشاء العقد'
        USING ERRCODE = 'P0001';
    END IF;

    IF NOT v_trusted_direct_session AND v_actor_role <> 'service_role' THEN
      IF v_actor_role <> 'authenticated' OR v_actor IS NULL THEN
        RAISE EXCEPTION 'Authentication is required to accept unpaid violations'
          USING ERRCODE = '42501';
      END IF;
      IF p_created_by IS NOT NULL AND p_created_by IS DISTINCT FROM v_actor THEN
        RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
      END IF;
      IF public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
        RAISE EXCEPTION 'Contract company is outside the active tenant'
          USING ERRCODE = '42501';
      END IF;
      IF NOT EXISTS (
        SELECT 1
        FROM public.employees employee
        WHERE employee.user_id = v_actor
          AND employee.company_id = p_company_id
          AND COALESCE(employee.is_active, false) = true
          AND COALESCE(employee.has_system_access, false) = true
          AND COALESCE(employee.account_status, '') = 'active'
      ) THEN
        RAISE EXCEPTION 'Only an active employee with system access may accept unpaid violations'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  v_contract_result := public.create_contract_with_billing_graph_atomic(
    p_company_id => p_company_id,
    p_customer_id => p_customer_id,
    p_vehicle_id => p_vehicle_id,
    p_contract_type => p_contract_type,
    p_start_date => p_start_date,
    p_end_date => p_end_date,
    p_contract_amount => p_contract_amount,
    p_monthly_amount => p_monthly_amount,
    p_description => p_description,
    p_terms => p_terms,
    p_cost_center_id => p_cost_center_id,
    p_created_by => p_created_by,
    p_assigned_to_profile_id => p_assigned_to_profile_id,
    p_contract_date => p_contract_date,
    p_auto_renew_enabled => p_auto_renew_enabled,
    p_created_via => p_created_via,
    p_idempotency_key => p_idempotency_key
  );

  v_contract_id := NULLIF(v_contract_result ->> 'contract_id', '')::uuid;

  IF COALESCE(p_accept_unpaid_violations, false)
     AND (v_vehicle_penalty_count > 0 OR v_customer_penalty_count > 0)
     AND v_contract_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.audit_logs log
       WHERE log.company_id = p_company_id
         AND log.resource_type = 'contract'
         AND log.resource_id = v_contract_id
         AND log.action = 'contract_unpaid_violations_override'
         AND COALESCE(log.metadata ->> 'idempotency_key', '') = COALESCE(p_idempotency_key, '')
     )
  THEN
    INSERT INTO public.audit_logs (
      user_id,
      company_id,
      action,
      resource_type,
      resource_id,
      entity_name,
      changes_summary,
      old_values,
      new_values,
      metadata,
      severity,
      status,
      notes
    ) VALUES (
      v_actor,
      p_company_id,
      'contract_unpaid_violations_override',
      'contract',
      v_contract_id,
      'Contract',
      'Employee accepted unpaid vehicle/customer violations before contract creation',
      jsonb_build_object('unpaid_violations_accepted', false),
      jsonb_build_object(
        'unpaid_violations_accepted', true,
        'vehicle', jsonb_build_object(
          'id', p_vehicle_id,
          'count', v_vehicle_penalty_count,
          'total', v_vehicle_penalty_total
        ),
        'customer', jsonb_build_object(
          'id', p_customer_id,
          'count', v_customer_penalty_count,
          'total', v_customer_penalty_total
        )
      ),
      jsonb_build_object(
        'idempotency_key', p_idempotency_key,
        'created_via', p_created_via,
        'confirmed_at', clock_timestamp()
      ),
      'medium',
      'success',
      'تم إنشاء العقد بعد موافقة الموظف الصريحة على تنبيه المخالفات غير المسددة.'
    );
  END IF;

  RETURN v_contract_result || jsonb_build_object(
    'unpaid_violations_override_accepted',
      COALESCE(p_accept_unpaid_violations, false)
      AND (v_vehicle_penalty_count > 0 OR v_customer_penalty_count > 0),
    'vehicle_unpaid_violations', jsonb_build_object(
      'count', v_vehicle_penalty_count,
      'total', v_vehicle_penalty_total
    ),
    'customer_unpaid_violations', jsonb_build_object(
      'count', v_customer_penalty_count,
      'total', v_customer_penalty_total
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean
) TO authenticated, service_role;

-- All browser contract creation must pass through the wrapper so the acceptance
-- is revalidated and audited inside the same database transaction.
REVOKE EXECUTE ON FUNCTION public.create_contract_with_billing_graph_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text
) FROM authenticated;

COMMENT ON FUNCTION public.create_contract_with_violation_override_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text,
  uuid, uuid, uuid, date, boolean, text, text, boolean
) IS
  'Creates the canonical atomic contract billing graph and permits unpaid-violation override only after explicit confirmation by an active system employee; accepted overrides are audited.';

COMMIT;
