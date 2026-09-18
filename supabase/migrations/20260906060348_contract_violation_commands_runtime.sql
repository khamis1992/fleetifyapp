BEGIN;
ALTER TABLE public.traffic_violations
  ADD COLUMN IF NOT EXISTS manual_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_traffic_violations_company_manual_request
  ON public.traffic_violations(company_id, manual_request_id)
  WHERE manual_request_id IS NOT NULL;

COMMENT ON COLUMN public.traffic_violations.manual_request_id IS
  'Stable client request UUID used to make manual contract-violation creation retry-safe.';

CREATE OR REPLACE FUNCTION public.create_manual_contract_traffic_violation_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_vehicle_id uuid,
  p_violation_type text,
  p_violation_date date,
  p_fine_amount numeric,
  p_idempotency_key uuid,
  p_violation_number text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_description text DEFAULT NULL
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
  v_contract public.contracts%ROWTYPE;
  v_existing public.traffic_violations%ROWTYPE;
  v_created public.traffic_violations%ROWTYPE;
  v_violation_number text;
  v_violation_type text := BTRIM(COALESCE(p_violation_type, ''));
  v_location text := NULLIF(BTRIM(COALESCE(p_location, '')), '');
  v_description text := NULLIF(BTRIM(COALESCE(p_description, '')), '');
  v_amount numeric := round(COALESCE(p_fine_amount, 0)::numeric, 2);
BEGIN
  IF p_company_id IS NULL
     OR p_contract_id IS NULL
     OR p_vehicle_id IS NULL
     OR p_violation_date IS NULL
     OR p_idempotency_key IS NULL
  THEN
    RAISE EXCEPTION 'Company, contract, vehicle, violation date, and idempotency key are required'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_trusted_direct_session
     AND v_actor_role <> 'service_role'
     AND (v_actor_role <> 'authenticated' OR v_actor IS NULL)
  THEN
    RAISE EXCEPTION 'Authentication is required to create a traffic violation'
      USING ERRCODE = '42501';
  END IF;

  IF NOT v_trusted_direct_session
     AND v_actor_role <> 'service_role'
     AND NOT EXISTS (
       SELECT 1
       FROM public.profiles profile
       WHERE profile.user_id = v_actor
         AND profile.company_id = p_company_id
         AND COALESCE(profile.is_active, false) = true
     )
  THEN
    RAISE EXCEPTION 'The current user is not an active member of this company'
      USING ERRCODE = '42501';
  END IF;

  IF v_violation_type = '' OR length(v_violation_type) > 120 THEN
    RAISE EXCEPTION 'A valid violation type is required'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_amount <= 0 OR v_amount > 999999999.99 THEN
    RAISE EXCEPTION 'The violation amount must be greater than zero'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_violation_date > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN
    RAISE EXCEPTION 'A traffic violation cannot be dated in the future'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_company_id::text || ':manual-contract-violation:' || p_idempotency_key::text,
      0
    )
  );

  SELECT violation.*
  INTO v_existing
  FROM public.traffic_violations violation
  WHERE violation.company_id = p_company_id
    AND violation.manual_request_id = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.contract_id IS DISTINCT FROM p_contract_id
       OR v_existing.vehicle_id IS DISTINCT FROM p_vehicle_id
       OR v_existing.violation_date IS DISTINCT FROM p_violation_date
       OR v_existing.violation_type IS DISTINCT FROM v_violation_type
       OR round(COALESCE(v_existing.fine_amount, 0)::numeric, 2) IS DISTINCT FROM v_amount
    THEN
      RAISE EXCEPTION 'This idempotency key was already used for a different traffic violation'
        USING ERRCODE = 'P0001';
    END IF;

    RETURN pg_catalog.jsonb_build_object(
      'success', true,
      'created', false,
      'duplicate_reason', 'idempotency_key',
      'violation_id', v_existing.id,
      'violation_number', v_existing.violation_number
    );
  END IF;

  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
    AND contract.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The contract does not belong to the selected company'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_contract.vehicle_id IS DISTINCT FROM p_vehicle_id THEN
    RAISE EXCEPTION 'The selected vehicle does not belong to this contract'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_violation_date < v_contract.start_date OR p_violation_date > v_contract.end_date THEN
    RAISE EXCEPTION 'The violation date is outside the contract period'
      USING ERRCODE = 'P0001';
  END IF;

  v_violation_number := NULLIF(BTRIM(COALESCE(p_violation_number, '')), '');
  IF v_violation_number IS NULL THEN
    v_violation_number := CONCAT(
      'TV-',
      left(pg_catalog.regexp_replace(v_contract.contract_number, '[^[:alnum:]]', '', 'g'), 24),
      '-',
      left(pg_catalog.replace(p_idempotency_key::text, '-', ''), 10)
    );
  END IF;

  IF length(v_violation_number) > 120 THEN
    RAISE EXCEPTION 'The violation number is too long'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT violation.*
  INTO v_existing
  FROM public.traffic_violations violation
  WHERE violation.company_id = p_company_id
    AND violation.vehicle_id = p_vehicle_id
    AND violation.violation_number = v_violation_number
    AND violation.violation_date = p_violation_date
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.contract_id IS DISTINCT FROM p_contract_id THEN
      RAISE EXCEPTION 'This violation number and date are already linked to another contract'
        USING ERRCODE = '23505';
    END IF;

    IF v_existing.violation_type IS DISTINCT FROM v_violation_type
       OR round(COALESCE(v_existing.fine_amount, 0)::numeric, 2) IS DISTINCT FROM v_amount THEN
      RAISE EXCEPTION 'This violation number and date already exist with different details'
        USING ERRCODE = '23505';
    END IF;

    RETURN pg_catalog.jsonb_build_object(
      'success', true,
      'created', false,
      'duplicate_reason', 'vehicle_number_date',
      'violation_id', v_existing.id,
      'violation_number', v_existing.violation_number
    );
  END IF;

  INSERT INTO public.traffic_violations (
    company_id,
    contract_id,
    vehicle_id,
    violation_number,
    violation_type,
    violation_date,
    fine_amount,
    total_amount,
    location,
    violation_description,
    import_source,
    match_confidence,
    status,
    responsibility_party,
    responsibility_reason,
    responsibility_decided_at,
    responsibility_decided_by,
    responsible_customer_id,
    original_contract_number,
    manual_request_id
  ) VALUES (
    p_company_id,
    p_contract_id,
    p_vehicle_id,
    v_violation_number,
    v_violation_type,
    p_violation_date,
    v_amount,
    v_amount,
    v_location,
    v_description,
    'manual',
    'high',
    'pending',
    'customer',
    'Created from the contract details page for a date inside the verified contract period.',
    pg_catalog.now(),
    v_actor,
    v_contract.customer_id,
    v_contract.contract_number,
    p_idempotency_key
  )
  RETURNING * INTO v_created;

  INSERT INTO public.audit_logs (
    company_id,
    user_id,
    action,
    resource_type,
    resource_id,
    entity_name,
    changes_summary,
    new_values,
    severity,
    status,
    metadata
  ) VALUES (
    p_company_id,
    v_actor,
    'create_manual_contract_traffic_violation_v1',
    'traffic_violation',
    v_created.id,
    v_created.violation_number,
    'Created one retry-safe manual traffic violation from the contract details page.',
    pg_catalog.jsonb_build_object(
      'contract_id', p_contract_id,
      'contract_number', v_contract.contract_number,
      'vehicle_id', p_vehicle_id,
      'violation_date', p_violation_date,
      'fine_amount', v_amount,
      'responsibility_party', 'customer'
    ),
    'medium',
    'completed',
    pg_catalog.jsonb_build_object('idempotency_key', p_idempotency_key)
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'created', true,
    'violation_id', v_created.id,
    'violation_number', v_created.violation_number
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_manual_contract_traffic_violation_v1(
  uuid, uuid, uuid, text, date, numeric, uuid, text, text, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_manual_contract_traffic_violation_v1(
  uuid, uuid, uuid, text, date, numeric, uuid, text, text, text
) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_manual_contract_traffic_violation_v1(
  uuid, uuid, uuid, text, date, numeric, uuid, text, text, text
) IS 'Atomically validates and creates one contract-linked traffic violation; safe to retry with the same request UUID.';


CREATE OR REPLACE FUNCTION public.cancel_traffic_violation_atomic_v1(
  p_violation_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_id uuid := COALESCE(auth.uid(), p_actor_id);
  v_violation public.traffic_violations%ROWTYPE;
  v_has_active_payments boolean := false;
  v_is_super_admin boolean := false;
  v_note text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'CANCELLATION_REASON_REQUIRED' USING ERRCODE = '23514';
  END IF;

  SELECT violation.*
  INTO v_violation
  FROM public.traffic_violations violation
  WHERE violation.id = p_violation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRAFFIC_VIOLATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles role
    WHERE role.user_id = v_actor_id
      AND role.role::text = 'super_admin'
  ) INTO v_is_super_admin;

  IF NOT v_is_super_admin
     AND (public.get_user_company_id() IS DISTINCT FROM v_violation.company_id
       OR NOT EXISTS (SELECT 1 FROM public.profiles profile
         WHERE profile.user_id = v_actor_id AND profile.company_id = v_violation.company_id
           AND profile.is_active = true))
  THEN
    RAISE EXCEPTION 'COMPANY_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  IF lower(COALESCE(v_violation.status, '')) IN (
    'cancelled', 'canceled', 'void', 'voided', 'deleted'
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'violation_id', v_violation.id,
      'status', v_violation.status,
      'idempotent_replay', true
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.traffic_violation_payments payment
    WHERE payment.company_id = v_violation.company_id
      AND payment.traffic_violation_id = v_violation.id
      AND lower(COALESCE(payment.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'reversed'
      )
  )
  INTO v_has_active_payments;

  IF lower(COALESCE(v_violation.status, '')) = 'paid' OR v_has_active_payments THEN
    RAISE EXCEPTION 'TRAFFIC_VIOLATION_HAS_ACTIVE_PAYMENTS'
      USING ERRCODE = '23514',
            DETAIL = 'Reverse or cancel the linked violation payments before cancelling the violation.';
  END IF;

  IF v_violation.liability_journal_entry_id IS NOT NULL OR COALESCE(v_violation.liability_amount, 0) > 0 THEN
    RAISE EXCEPTION 'TRAFFIC_VIOLATION_HAS_RECOGNIZED_LIABILITY'
      USING ERRCODE = '23514',
            DETAIL = 'Reverse the recognized liability through the financial workflow before cancelling this violation.';
  END IF;

  v_note := format(
    '[ملغاة بتاريخ %s] %s',
    to_char(clock_timestamp(), 'DD/MM/YYYY HH24:MI'),
    btrim(p_reason)
  );

  UPDATE public.traffic_violations violation
  SET status = 'cancelled',
      notes = concat_ws(E'\n\n', NULLIF(btrim(violation.notes), ''), v_note),
      updated_at = now()
  WHERE violation.id = v_violation.id
    AND violation.company_id = v_violation.company_id;

  IF v_violation.contract_id IS NOT NULL THEN
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
      v_violation.contract_id,
      v_violation.company_id,
      'traffic_violation_cancelled',
      jsonb_build_object(
        'violation_id', v_violation.id,
        'violation_number', v_violation.violation_number,
        'reason', btrim(p_reason)
      ),
      jsonb_build_object('status', v_violation.status),
      jsonb_build_object('status', 'cancelled'),
      v_note,
      v_actor_id
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'violation_id', v_violation.id,
    'status', 'cancelled',
    'idempotent_replay', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_traffic_violation_atomic_v1(uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_traffic_violation_atomic_v1(uuid, text, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.cancel_traffic_violation_atomic_v1(uuid, text, uuid) IS
'Cancels an unpaid traffic violation atomically, rejects active payment links, and records the contract audit event.';


COMMIT;
