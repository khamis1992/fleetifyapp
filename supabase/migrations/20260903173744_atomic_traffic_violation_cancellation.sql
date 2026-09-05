BEGIN;

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
     AND public.get_user_company_id() IS DISTINCT FROM v_violation.company_id
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
