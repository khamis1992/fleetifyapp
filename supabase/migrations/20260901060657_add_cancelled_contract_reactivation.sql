-- Allow one explicitly confirmed cancelled-contract reactivation to pass the
-- unpaid-violation guard. The transaction-local context is bound to the exact
-- contract/customer/vehicle tuple and consumed by the trigger.
CREATE OR REPLACE FUNCTION public.trg_enforce_rental_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_vehicle_status text;
  v_count integer;
  v_total numeric;
BEGIN
  IF COALESCE(current_setting('fleetify.vehicle_identity_repair', true), '') = 'on'
     AND session_user IN ('postgres', 'supabase_admin')
  THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'contracts'
     AND TG_OP = 'UPDATE'
     AND lower(COALESCE(OLD.status::text, '')) = 'under_legal_procedure'
     AND lower(COALESCE(NEW.status::text, '')) = 'active'
     AND NEW.vehicle_id IS NOT DISTINCT FROM OLD.vehicle_id
     AND NEW.customer_id IS NOT DISTINCT FROM OLD.customer_id
     AND NOT EXISTS (
       SELECT 1
       FROM public.legal_cases legal_case
       WHERE legal_case.company_id = NEW.company_id
         AND legal_case.contract_id = NEW.id
         AND lower(COALESCE(legal_case.case_status, '')) IN (
           'open', 'active', 'pending', 'on_hold', 'under_review'
         )
     )
  THEN
    RETURN NEW;
  END IF;

  IF lower(COALESCE(NEW.status::text, '')) NOT IN ('active', 'pending', 'confirmed')
     OR NEW.vehicle_id IS NULL
  THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'vehicle_reservations' AND NEW.customer_id IS NULL THEN
    RAISE EXCEPTION 'لا يمكن إنشاء الحجز دون اختيار عميل مسجل للتحقق من المخالفات'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT lower(COALESCE(vehicle.status::text, ''))
  INTO v_vehicle_status
  FROM public.vehicles vehicle
  WHERE vehicle.id = NEW.vehicle_id
    AND vehicle.company_id = NEW.company_id;
  IF v_vehicle_status IN ('street_52', 'police_station', 'stolen') THEN
    RAISE EXCEPTION 'لا يمكن تأجير هذه المركبة لأنها محجوزة أو غير متاحة قانونياً (%)', v_vehicle_status
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_TABLE_NAME = 'contracts'
     AND TG_OP = 'UPDATE'
     AND lower(COALESCE(OLD.status::text, '')) IN ('cancelled', 'canceled')
     AND lower(COALESCE(NEW.status::text, '')) = 'active'
     AND current_user IN ('postgres', 'supabase_admin')
     AND COALESCE(current_setting('fleetify.atomic_contract_creation', true), '') = 'on'
     AND COALESCE(current_setting('fleetify.confirmed_contract_reactivation', true), '') = 'on'
     AND COALESCE(current_setting('fleetify.confirmed_contract_reactivation_company_id', true), '') = NEW.company_id::text
     AND COALESCE(current_setting('fleetify.confirmed_contract_reactivation_contract_id', true), '') = NEW.id::text
     AND COALESCE(current_setting('fleetify.confirmed_contract_reactivation_customer_id', true), '') = COALESCE(NEW.customer_id::text, '')
     AND COALESCE(current_setting('fleetify.confirmed_contract_reactivation_vehicle_id', true), '') = COALESCE(NEW.vehicle_id::text, '')
  THEN
    PERFORM pg_catalog.set_config('fleetify.confirmed_contract_reactivation', 'off', true);
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'contracts'
     AND TG_OP = 'INSERT'
     AND current_user IN ('postgres', 'supabase_admin')
     AND COALESCE(current_setting('fleetify.atomic_contract_creation', true), '') = 'on'
     AND COALESCE(current_setting('fleetify.confirmed_violation_override', true), '') = 'on'
     AND COALESCE(current_setting('fleetify.confirmed_violation_override_company_id', true), '') = NEW.company_id::text
     AND COALESCE(current_setting('fleetify.confirmed_violation_override_customer_id', true), '') = COALESCE(NEW.customer_id::text, '')
     AND COALESCE(current_setting('fleetify.confirmed_violation_override_vehicle_id', true), '') = COALESCE(NEW.vehicle_id::text, '')
     AND COALESCE(current_setting('fleetify.confirmed_violation_override_idempotency_key', true), '') = COALESCE(NEW.creation_idempotency_key, '')
  THEN
    PERFORM pg_catalog.set_config('fleetify.confirmed_violation_override', 'off', true);
    RETURN NEW;
  END IF;

  SELECT count(*), COALESCE(sum(penalty.amount), 0)
  INTO v_count, v_total
  FROM public.penalties penalty
  WHERE penalty.company_id = NEW.company_id
    AND penalty.vehicle_id = NEW.vehicle_id
    AND lower(COALESCE(penalty.payment_status, '')) NOT IN ('paid', 'completed');
  IF v_count >= 3 OR v_total >= 500 THEN
    RAISE EXCEPTION 'لا يمكن تأجير هذه المركبة: عليها % مخالفة غير مسددة بإجمالي % ر.ق', v_count, trim(to_char(v_total, 'FM999G999G999G990D00'))
      USING ERRCODE = 'P0001';
  END IF;
  IF NEW.customer_id IS NOT NULL THEN
    SELECT count(*), COALESCE(sum(penalty.amount), 0)
    INTO v_count, v_total
    FROM public.penalties penalty
    WHERE penalty.company_id = NEW.company_id
      AND penalty.customer_id = NEW.customer_id
      AND lower(COALESCE(penalty.payment_status, '')) NOT IN ('paid', 'completed');
    IF v_count > 0 THEN
      RAISE EXCEPTION 'لا يمكن بدء الإيجار: العميل عليه % مخالفة غير مسددة بإجمالي % ر.ق', v_count, trim(to_char(v_total, 'FM999G999G999G990D00'))
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reactivate_cancelled_contract_atomic_v1(
  p_contract_id uuid,
  p_accept_unpaid_violations boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_contract public.contracts%ROWTYPE;
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
  v_invoice_count_before bigint;
  v_invoice_total_before numeric;
  v_schedule_count_before bigint;
  v_schedule_total_before numeric;
  v_payment_count_before bigint;
  v_payment_total_before numeric;
  v_invoice_count_after bigint;
  v_invoice_total_after numeric;
  v_schedule_count_after bigint;
  v_schedule_total_after numeric;
  v_payment_count_after bigint;
  v_payment_total_after numeric;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'العقد مطلوب لإعادة التفعيل' USING ERRCODE = '22023';
  END IF;
  IF NOT v_trusted_direct_session AND v_actor_role <> 'service_role' THEN
    IF v_actor_role <> 'authenticated' OR v_actor IS NULL THEN
      RAISE EXCEPTION 'يجب تسجيل الدخول لإعادة تفعيل العقد' USING ERRCODE = '42501';
    END IF;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('contract-reactivation:' || p_contract_id::text, 0)
  );

  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE OF contract;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على العقد' USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_trusted_direct_session AND v_actor_role <> 'service_role' THEN
    IF public.get_user_company_id() IS DISTINCT FROM v_contract.company_id THEN
      RAISE EXCEPTION 'العقد خارج الشركة النشطة' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.employees employee
      WHERE employee.user_id = v_actor
        AND employee.company_id = v_contract.company_id
        AND COALESCE(employee.is_active, false) = true
        AND COALESCE(employee.has_system_access, false) = true
        AND COALESCE(employee.account_status, '') = 'active'
    ) THEN
      RAISE EXCEPTION 'فقط الموظف النشط الذي يملك دخولاً للنظام يمكنه إعادة تفعيل العقد'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF lower(COALESCE(v_contract.status::text, '')) = 'active' THEN
    RETURN jsonb_build_object(
      'success', true,
      'contract_id', v_contract.id,
      'status', 'active',
      'idempotent_replay', true,
      'unpaid_violations_override_accepted', false
    );
  END IF;
  IF lower(COALESCE(v_contract.status::text, '')) NOT IN ('cancelled', 'canceled') THEN
    RAISE EXCEPTION 'يمكن إعادة تفعيل العقود الملغاة فقط' USING ERRCODE = 'P0001';
  END IF;
  IF v_contract.customer_id IS NULL
     OR v_contract.start_date IS NULL
     OR v_contract.end_date IS NULL
     OR v_contract.end_date < CURRENT_DATE
     OR v_contract.end_date < v_contract.start_date
     OR COALESCE(v_contract.contract_amount, 0) <= 0
  THEN
    RAISE EXCEPTION 'بيانات العقد أو مدته لا تسمح بإعادته إلى نشط' USING ERRCODE = 'P0001';
  END IF;

  PERFORM 1
  FROM public.customers customer
  WHERE customer.id = v_contract.customer_id
    AND customer.company_id = v_contract.company_id
    AND COALESCE(customer.is_active, true) = true
  FOR SHARE OF customer;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'العميل غير موجود أو غير نشط' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.legal_cases legal_case
    WHERE legal_case.company_id = v_contract.company_id
      AND legal_case.contract_id = v_contract.id
      AND lower(COALESCE(legal_case.case_status, '')) IN (
        'open', 'active', 'pending', 'on_hold', 'under_review'
      )
  ) THEN
    RAISE EXCEPTION 'لا يمكن إعادة تفعيل العقد مع وجود قضية قانونية نشطة'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_contract.vehicle_id IS NOT NULL THEN
    PERFORM 1
    FROM public.vehicles vehicle
    WHERE vehicle.id = v_contract.vehicle_id
      AND vehicle.company_id = v_contract.company_id
      AND COALESCE(vehicle.is_active, true) = true
      AND lower(COALESCE(vehicle.status::text, '')) IN (
        'available', 'reserved', 'reserved_employee', 'rented'
      )
    FOR UPDATE OF vehicle;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'المركبة غير متاحة لإعادة تفعيل العقد' USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.contracts other_contract
      WHERE other_contract.company_id = v_contract.company_id
        AND other_contract.vehicle_id = v_contract.vehicle_id
        AND other_contract.id <> v_contract.id
        AND lower(COALESCE(other_contract.status::text, '')) IN (
          'active', 'under_legal_procedure', 'pending', 'confirmed'
        )
        AND daterange(other_contract.start_date, other_contract.end_date, '[]')
            && daterange(v_contract.start_date, v_contract.end_date, '[]')
    ) THEN
      RAISE EXCEPTION 'المركبة مرتبطة بعقد نشط أو متداخل خلال مدة العقد'
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  SELECT count(*)::bigint, COALESCE(sum(invoice.total_amount), 0)
  INTO v_invoice_count_before, v_invoice_total_before
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id;
  SELECT count(*)::bigint, COALESCE(sum(schedule.amount), 0)
  INTO v_schedule_count_before, v_schedule_total_before
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id;
  SELECT count(*)::bigint, COALESCE(sum(payment.amount), 0)
  INTO v_payment_count_before, v_payment_total_before
  FROM public.payments payment
  WHERE payment.company_id = v_contract.company_id
    AND (
      payment.contract_id = v_contract.id
      OR payment.invoice_id IN (
        SELECT invoice.id
        FROM public.invoices invoice
        WHERE invoice.company_id = v_contract.company_id
          AND invoice.contract_id = v_contract.id
      )
    );

  SELECT count(*)::integer, COALESCE(sum(COALESCE(penalty.amount, 0)), 0)
  INTO v_vehicle_penalty_count, v_vehicle_penalty_total
  FROM public.penalties penalty
  WHERE penalty.company_id = v_contract.company_id
    AND v_contract.vehicle_id IS NOT NULL
    AND penalty.vehicle_id = v_contract.vehicle_id
    AND lower(COALESCE(penalty.payment_status, 'unpaid')) NOT IN ('paid', 'completed');
  SELECT count(*)::integer, COALESCE(sum(COALESCE(penalty.amount, 0)), 0)
  INTO v_customer_penalty_count, v_customer_penalty_total
  FROM public.penalties penalty
  WHERE penalty.company_id = v_contract.company_id
    AND penalty.customer_id = v_contract.customer_id
    AND lower(COALESCE(penalty.payment_status, 'unpaid')) NOT IN ('paid', 'completed');

  IF (v_vehicle_penalty_count > 0 OR v_customer_penalty_count > 0)
     AND NOT COALESCE(p_accept_unpaid_violations, false)
  THEN
    RAISE EXCEPTION
      'على المركبة أو العميل مخالفات غير مسددة. راجع التنبيه ووافق عليه قبل إعادة التفعيل'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.set_config('fleetify.atomic_contract_creation', 'on', true);
  IF v_vehicle_penalty_count > 0 OR v_customer_penalty_count > 0 THEN
    PERFORM pg_catalog.set_config('fleetify.confirmed_contract_reactivation', 'on', true);
    PERFORM pg_catalog.set_config('fleetify.confirmed_contract_reactivation_company_id', v_contract.company_id::text, true);
    PERFORM pg_catalog.set_config('fleetify.confirmed_contract_reactivation_contract_id', v_contract.id::text, true);
    PERFORM pg_catalog.set_config('fleetify.confirmed_contract_reactivation_customer_id', COALESCE(v_contract.customer_id::text, ''), true);
    PERFORM pg_catalog.set_config('fleetify.confirmed_contract_reactivation_vehicle_id', COALESCE(v_contract.vehicle_id::text, ''), true);
  END IF;

  UPDATE public.contracts contract
  SET status = 'active',
      suspension_reason = NULL,
      updated_at = now()
  WHERE contract.id = v_contract.id
    AND contract.company_id = v_contract.company_id
    AND lower(COALESCE(contract.status::text, '')) IN ('cancelled', 'canceled');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'تغيرت حالة العقد أثناء إعادة التفعيل؛ لم يتم حفظ أي تغيير'
      USING ERRCODE = '40001';
  END IF;
  PERFORM pg_catalog.set_config('fleetify.confirmed_contract_reactivation', 'off', true);

  SELECT count(*)::bigint, COALESCE(sum(invoice.total_amount), 0)
  INTO v_invoice_count_after, v_invoice_total_after
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id;
  SELECT count(*)::bigint, COALESCE(sum(schedule.amount), 0)
  INTO v_schedule_count_after, v_schedule_total_after
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id;
  SELECT count(*)::bigint, COALESCE(sum(payment.amount), 0)
  INTO v_payment_count_after, v_payment_total_after
  FROM public.payments payment
  WHERE payment.company_id = v_contract.company_id
    AND (
      payment.contract_id = v_contract.id
      OR payment.invoice_id IN (
        SELECT invoice.id
        FROM public.invoices invoice
        WHERE invoice.company_id = v_contract.company_id
          AND invoice.contract_id = v_contract.id
      )
    );

  IF (v_invoice_count_after, v_invoice_total_after,
      v_schedule_count_after, v_schedule_total_after,
      v_payment_count_after, v_payment_total_after)
     IS DISTINCT FROM
     (v_invoice_count_before, v_invoice_total_before,
      v_schedule_count_before, v_schedule_total_before,
      v_payment_count_before, v_payment_total_before)
  THEN
    RAISE EXCEPTION 'تغيرت المستندات المالية أثناء إعادة التفعيل؛ تم التراجع عن العملية'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.contract_operations_log (
    contract_id, company_id, operation_type, operation_details,
    performed_by, old_values, new_values, notes
  ) VALUES (
    v_contract.id,
    v_contract.company_id,
    'cancelled_contract_reactivated',
    jsonb_build_object(
      'financial_documents_preserved', true,
      'invoices', jsonb_build_object('count', v_invoice_count_after, 'total', v_invoice_total_after),
      'schedules', jsonb_build_object('count', v_schedule_count_after, 'total', v_schedule_total_after),
      'payments', jsonb_build_object('count', v_payment_count_after, 'total', v_payment_total_after),
      'vehicle_unpaid_violations', jsonb_build_object('count', v_vehicle_penalty_count, 'total', v_vehicle_penalty_total),
      'customer_unpaid_violations', jsonb_build_object('count', v_customer_penalty_count, 'total', v_customer_penalty_total),
      'unpaid_violations_override_accepted', COALESCE(p_accept_unpaid_violations, false)
    ),
    v_actor,
    jsonb_build_object('status', v_contract.status),
    jsonb_build_object('status', 'active'),
    'إعادة تفعيل عقد ملغي مع الحفاظ على المستندات المالية القائمة'
  );

  IF COALESCE(p_accept_unpaid_violations, false)
     AND (v_vehicle_penalty_count > 0 OR v_customer_penalty_count > 0)
  THEN
    INSERT INTO public.audit_logs (
      user_id, company_id, action, resource_type, resource_id, entity_name,
      changes_summary, old_values, new_values, metadata, severity, status, notes
    ) VALUES (
      v_actor,
      v_contract.company_id,
      'cancelled_contract_reactivation_violation_override',
      'contract',
      v_contract.id,
      'Contract',
      'Employee accepted unpaid vehicle/customer violations before cancelled contract reactivation',
      jsonb_build_object('status', v_contract.status),
      jsonb_build_object('status', 'active'),
      jsonb_build_object(
        'vehicle', jsonb_build_object('id', v_contract.vehicle_id, 'count', v_vehicle_penalty_count, 'total', v_vehicle_penalty_total),
        'customer', jsonb_build_object('id', v_contract.customer_id, 'count', v_customer_penalty_count, 'total', v_customer_penalty_total),
        'confirmed_at', clock_timestamp()
      ),
      'high',
      'success',
      'وافق الموظف صراحة على تنبيه المخالفات غير المسددة قبل إعادة تفعيل العقد.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract.id,
    'status', 'active',
    'financial_documents_preserved', true,
    'idempotent_replay', false,
    'unpaid_violations_override_accepted',
      COALESCE(p_accept_unpaid_violations, false)
      AND (v_vehicle_penalty_count > 0 OR v_customer_penalty_count > 0),
    'vehicle_unpaid_violations', jsonb_build_object('count', v_vehicle_penalty_count, 'total', v_vehicle_penalty_total),
    'customer_unpaid_violations', jsonb_build_object('count', v_customer_penalty_count, 'total', v_customer_penalty_total)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reactivate_cancelled_contract_atomic_v1(uuid, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_cancelled_contract_atomic_v1(uuid, boolean)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.reactivate_cancelled_contract_atomic_v1(uuid, boolean) IS
  'Reactivates one cancelled contract atomically, preserves its financial documents, blocks legal/vehicle conflicts, and records any explicit unpaid-violation override.';
