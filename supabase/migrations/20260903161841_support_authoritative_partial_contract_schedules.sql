-- Generate contract invoices from the persisted payment schedule when that
-- schedule is a complete, internally consistent representation of the signed
-- agreement. This supports contracts whose first and last calendar months are
-- partial installments without inventing an extra full month.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.generate_payment_schedules_for_contract(uuid,boolean)') IS NULL THEN
    RAISE EXCEPTION 'generate_payment_schedules_for_contract(uuid,boolean) is required';
  END IF;
  IF to_regprocedure('public.system_generate_invoice_for_contract_month_core(uuid,date)') IS NULL THEN
    RAISE EXCEPTION 'system_generate_invoice_for_contract_month_core(uuid,date) is required';
  END IF;
  IF to_regprocedure('public.system_invoice_has_single_balanced_posted_journal(uuid,uuid,numeric)') IS NULL THEN
    RAISE EXCEPTION 'system_invoice_has_single_balanced_posted_journal(uuid,uuid,numeric) is required';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_contract_billing_graph_v2(
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_schedule record;
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
  v_allowed boolean := false;
  v_employee_workspace_allowed boolean := false;
  v_active_schedule_count integer := 0;
  v_distinct_schedule_month_count integer := 0;
  v_distinct_installment_count integer := 0;
  v_min_installment integer;
  v_max_installment integer;
  v_schedule_total numeric := 0;
  v_contract_total numeric := 0;
  v_monthly_amount numeric := 0;
  v_contract_start_month date;
  v_contract_end_month date;
  v_first_schedule_month date;
  v_last_schedule_month date;
  v_expected_schedule_month_count integer := 0;
  v_problem_month date;
  v_first_amount numeric;
  v_last_amount numeric;
  v_existing_invoice_id uuid;
  v_invoice_id uuid;
  v_existing_invoice_amount numeric;
  v_created_count integer := 0;
  v_schedule_result jsonb;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract is required to generate the billing graph'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_trusted_direct_session
     AND v_actor_role <> 'service_role'
     AND (v_actor_role <> 'authenticated' OR v_actor IS NULL)
  THEN
    RAISE EXCEPTION 'Authentication is required to generate the billing graph'
      USING ERRCODE = '42501';
  END IF;

  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_trusted_direct_session AND v_actor_role <> 'service_role' THEN
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      v_contract.company_id,
      ARRAY['finance.invoice.create', 'finance.invoices.write'],
      ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']
    );

    IF NOT COALESCE(v_allowed, false) THEN
      v_employee_workspace_allowed :=
        v_actor_role = 'authenticated'
        AND lower(COALESCE(v_contract.status::text, '')) = 'active'
        AND EXISTS (
          SELECT 1
          FROM public.profiles profile
          WHERE profile.user_id = v_actor
            AND profile.company_id = v_contract.company_id
            AND COALESCE(profile.is_active, false) = true
            AND profile.id = v_contract.assigned_to_profile_id
        );

      IF NOT v_employee_workspace_allowed THEN
        RAISE EXCEPTION 'Not authorized to generate billing for this company'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF lower(COALESCE(v_contract.status::text, '')) NOT IN (
    'active', 'under_legal_procedure'
  ) THEN
    RAISE EXCEPTION 'Contract lifecycle does not permit invoice generation'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_contract.start_date IS NULL
     OR v_contract.end_date IS NULL
     OR v_contract.end_date < v_contract.start_date
  THEN
    RAISE EXCEPTION 'Contract requires a valid start and end date'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'contract-billing-graph-v2:' || v_contract.company_id::text || ':' || v_contract.id::text,
      0
    )
  );

  v_contract_start_month := date_trunc('month', v_contract.start_date)::date;
  v_contract_end_month := date_trunc('month', v_contract.end_date)::date;
  v_contract_total := round(COALESCE(v_contract.contract_amount, 0)::numeric, 2);
  v_monthly_amount := round(COALESCE(v_contract.monthly_amount, 0)::numeric, 2);

  PERFORM schedule.id
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  FOR UPDATE;

  SELECT
    count(*)::integer,
    count(DISTINCT date_trunc('month', schedule.due_date))::integer,
    count(DISTINCT schedule.installment_number)::integer,
    min(schedule.installment_number),
    max(schedule.installment_number),
    round(COALESCE(sum(schedule.amount), 0)::numeric, 2),
    min(date_trunc('month', schedule.due_date))::date,
    max(date_trunc('month', schedule.due_date))::date
  INTO
    v_active_schedule_count,
    v_distinct_schedule_month_count,
    v_distinct_installment_count,
    v_min_installment,
    v_max_installment,
    v_schedule_total,
    v_first_schedule_month,
    v_last_schedule_month
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  -- Contracts without an established schedule retain the schedule generator,
  -- but both paths pass the same invoice identity, period and journal checks.
  -- Mid-month boundaries are not guessed: their legal proration must come
  -- from a persisted schedule extracted from or checked against the agreement.
  IF v_active_schedule_count = 0 THEN
    IF v_contract_start_month <> v_contract_end_month
       AND (
         EXTRACT(DAY FROM v_contract.start_date) <> 1
         OR EXTRACT(DAY FROM v_contract.end_date) <> 1
       )
    THEN
      RAISE EXCEPTION
        'Partial-period contract requires an authoritative payment schedule before invoice generation'
        USING ERRCODE = 'P0001';
    END IF;

    v_schedule_result := public.generate_payment_schedules_for_contract(p_contract_id, false);
    IF COALESCE((v_schedule_result ->> 'success')::boolean, false) = false THEN
      RAISE EXCEPTION 'Payment-schedule generation failed: %',
        COALESCE(v_schedule_result ->> 'error', v_schedule_result::text)
        USING ERRCODE = 'P0001';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.contract_payment_schedules schedule
      WHERE schedule.company_id = v_contract.company_id AND schedule.contract_id = v_contract.id
        AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive')
    ) THEN
      RAISE EXCEPTION 'Schedule generator returned success without an active schedule' USING ERRCODE = 'P0001';
    END IF;
    -- Reentrant transaction locks are retained. An error in validation below
    -- rolls back the newly generated schedule as well as all invoices.
    v_schedule_result := public.generate_contract_billing_graph_v2(p_contract_id);
    RETURN v_schedule_result || jsonb_build_object('mode', 'generated_schedule');
  END IF;

  IF v_contract_total <= 0.01 OR v_monthly_amount <= 0.01 THEN
    RAISE EXCEPTION 'Authoritative schedules require positive contract and monthly amounts'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT date_trunc('month', schedule.due_date)::date
  INTO v_problem_month
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND (
      COALESCE(schedule.amount, 0) <= 0.01
      OR schedule.due_date < v_contract.start_date
      OR schedule.due_date > v_contract.end_date
      OR date_trunc('month', schedule.due_date)::date < v_contract_start_month
      OR date_trunc('month', schedule.due_date)::date > v_contract_end_month
    )
  ORDER BY schedule.due_date
  LIMIT 1;

  IF v_problem_month IS NOT NULL THEN
    RAISE EXCEPTION 'Active schedule month % is outside the contract or has a non-positive amount',
      to_char(v_problem_month, 'YYYY-MM')
      USING ERRCODE = 'P0001';
  END IF;

  IF v_distinct_schedule_month_count <> v_active_schedule_count THEN
    RAISE EXCEPTION 'More than one active schedule exists for the same contract month'
      USING ERRCODE = 'P0001';
  END IF;

  v_expected_schedule_month_count := (
    (EXTRACT(YEAR FROM v_last_schedule_month) - EXTRACT(YEAR FROM v_first_schedule_month)) * 12
    + EXTRACT(MONTH FROM v_last_schedule_month)
    - EXTRACT(MONTH FROM v_first_schedule_month)
    + 1
  )::integer;

  IF v_expected_schedule_month_count <> v_active_schedule_count THEN
    RAISE EXCEPTION 'The active payment schedule has missing calendar months'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_distinct_installment_count <> v_active_schedule_count
     OR v_min_installment <> 1
     OR v_max_installment <> v_active_schedule_count
  THEN
    RAISE EXCEPTION 'Installment numbers must be unique and consecutive from 1 through %',
      v_active_schedule_count
      USING ERRCODE = 'P0001';
  END IF;

  IF abs(v_schedule_total - v_contract_total) > 0.01 THEN
    RAISE EXCEPTION 'Payment-schedule total % does not match contract total %',
      v_schedule_total,
      v_contract_total
      USING ERRCODE = 'P0001';
  END IF;

  SELECT date_trunc('month', schedule.due_date)::date
  INTO v_problem_month
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND (
      schedule.amount > v_monthly_amount + 0.01
      OR (
        date_trunc('month', schedule.due_date)::date > v_first_schedule_month
        AND date_trunc('month', schedule.due_date)::date < v_last_schedule_month
        AND abs(schedule.amount - v_monthly_amount) > 0.01
      )
    )
  ORDER BY schedule.due_date
  LIMIT 1;

  IF v_problem_month IS NOT NULL THEN
    RAISE EXCEPTION 'Schedule amount for contract month % conflicts with monthly amount %',
      to_char(v_problem_month, 'YYYY-MM'),
      v_monthly_amount
      USING ERRCODE = 'P0001';
  END IF;

  SELECT schedule.amount
  INTO v_first_amount
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND date_trunc('month', schedule.due_date)::date = v_first_schedule_month
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  LIMIT 1;

  SELECT schedule.amount
  INTO v_last_amount
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND date_trunc('month', schedule.due_date)::date = v_last_schedule_month
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  LIMIT 1;

  IF v_first_schedule_month = v_contract_start_month
     AND EXTRACT(DAY FROM v_contract.start_date) > 1
     AND v_first_amount >= v_monthly_amount - 0.01
  THEN
    RAISE EXCEPTION 'The first installment must be partial when billing starts mid-month'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_first_schedule_month = v_contract_start_month
     AND v_last_schedule_month = v_contract_end_month
     AND EXTRACT(DAY FROM v_contract.end_date) < EXTRACT(
       DAY FROM (date_trunc('month', v_contract.end_date) + INTERVAL '1 month - 1 day')
     )
     AND v_last_amount >= v_monthly_amount - 0.01
  THEN
    RAISE EXCEPTION 'The last installment must be partial when a split schedule ends mid-month'
      USING ERRCODE = 'P0001';
  END IF;

  -- The production core creates rental invoices with invoice_type='service'.
  -- That type is not a non-rental classifier. Require a persisted schedule link
  -- for service invoices; unlinked service charges require explicit review.
  IF EXISTS (
    SELECT 1 FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND invoice.penalty_id IS NULL
      AND upper(btrim(COALESCE(invoice.invoice_number, ''))) NOT LIKE 'TV-%'
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive')
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive')
      AND (invoice.customer_id IS DISTINCT FROM v_contract.customer_id
        OR COALESCE(invoice.invoice_month, invoice.invoice_date) IS NULL)
  ) THEN
    RAISE EXCEPTION 'Rental invoice customer or billing month requires reconciliation' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND invoice.penalty_id IS NULL
      AND upper(btrim(COALESCE(invoice.invoice_number, ''))) NOT LIKE 'TV-%'
      AND lower(btrim(COALESCE(invoice.invoice_type, ''))) = 'service'
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive')
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive')
      AND NOT EXISTS (
        SELECT 1 FROM public.contract_payment_schedules schedule
        WHERE schedule.company_id = v_contract.company_id AND schedule.contract_id = v_contract.id
          AND schedule.invoice_id = invoice.id
          AND date_trunc('month', schedule.due_date) = date_trunc('month', COALESCE(invoice.invoice_month, invoice.invoice_date))
          AND abs(schedule.amount - invoice.total_amount) <= 0.01
          AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive')
      )
  ) THEN
    RAISE EXCEPTION 'Unclassified service invoice requires reconciliation with its rental installment' USING ERRCODE = 'P0001';
  END IF;

  -- Existing rental invoices must describe exactly the same month graph and amounts.
  SELECT date_trunc(
    'month',
    COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
  )::date
  INTO v_problem_month
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id
    AND invoice.penalty_id IS NULL
    AND upper(btrim(COALESCE(invoice.invoice_number, ''))) NOT LIKE 'TV-%'
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  GROUP BY date_trunc(
    'month',
    COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
  )::date
  HAVING count(*) > 1
  ORDER BY 1
  LIMIT 1;

  IF v_problem_month IS NOT NULL THEN
    RAISE EXCEPTION 'More than one active invoice exists for contract month %',
      to_char(v_problem_month, 'YYYY-MM')
      USING ERRCODE = 'P0001';
  END IF;

  v_problem_month := NULL;
  SELECT date_trunc(
    'month',
    COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
  )::date
  INTO v_problem_month
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id
    AND invoice.penalty_id IS NULL
    AND upper(btrim(COALESCE(invoice.invoice_number, ''))) NOT LIKE 'TV-%'
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules schedule
      WHERE schedule.company_id = v_contract.company_id
        AND schedule.contract_id = v_contract.id
        AND date_trunc('month', schedule.due_date)::date = date_trunc(
          'month',
          COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
        )::date
        AND abs(COALESCE(schedule.amount, 0) - COALESCE(invoice.total_amount, 0)) <= 0.01
        AND lower(COALESCE(schedule.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
    )
  ORDER BY 1
  LIMIT 1;

  IF v_problem_month IS NOT NULL THEN
    RAISE EXCEPTION 'Active invoice month % does not match the authoritative schedule',
      to_char(v_problem_month, 'YYYY-MM')
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_schedule IN
    SELECT schedule.*
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    ORDER BY schedule.due_date, schedule.installment_number, schedule.id
    FOR UPDATE OF schedule
  LOOP
    v_existing_invoice_id := NULL;
    v_existing_invoice_amount := NULL;
    SELECT invoice.id, invoice.total_amount
    INTO v_existing_invoice_id, v_existing_invoice_amount
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND invoice.penalty_id IS NULL
      AND upper(btrim(COALESCE(invoice.invoice_number, ''))) NOT LIKE 'TV-%'
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date = date_trunc('month', v_schedule.due_date)::date
      AND COALESCE(invoice.total_amount, 0) > 0.01
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    ORDER BY invoice.id
    LIMIT 1
    FOR UPDATE;

    IF v_existing_invoice_id IS NULL
       AND (
         COALESCE(v_schedule.paid_amount, 0) > 0.01
         OR v_schedule.paid_date IS NOT NULL
         OR lower(COALESCE(v_schedule.status, '')) NOT IN (
           'pending', 'unpaid', 'due', 'overdue', 'scheduled'
         )
       )
    THEN
      RAISE EXCEPTION 'Schedule % has payment history but no active invoice', v_schedule.id
        USING ERRCODE = 'P0001';
    END IF;

    IF v_existing_invoice_id IS NULL
       AND EXISTS (
         SELECT 1
         FROM public.invoices invoice
         WHERE invoice.company_id = v_contract.company_id
           AND invoice.contract_id = v_contract.id
           AND invoice.penalty_id IS NULL
           AND upper(btrim(COALESCE(invoice.invoice_number, ''))) NOT LIKE 'TV-%'
           AND date_trunc(
             'month',
             COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
           )::date = date_trunc('month', v_schedule.due_date)::date
           AND lower(COALESCE(invoice.status, '')) NOT IN (
             'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
           )
           AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
             'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
           )
       )
    THEN
      RAISE EXCEPTION 'Contract month % contains an active non-positive invoice requiring repair',
        to_char(date_trunc('month', v_schedule.due_date), 'YYYY-MM')
        USING ERRCODE = 'P0001';
    END IF;

    IF v_existing_invoice_id IS NULL
       AND public.system_agent_date_in_closed_period(
         v_contract.company_id,
         GREATEST(v_schedule.due_date, v_contract.start_date)
       )
    THEN
      RAISE EXCEPTION 'Contract invoice month % is in a closed accounting period',
        to_char(date_trunc('month', v_schedule.due_date), 'YYYY-MM')
        USING ERRCODE = 'P0001';
    END IF;

    IF v_existing_invoice_id IS NULL THEN
      v_invoice_id := public.system_generate_invoice_for_contract_month_core(
        v_contract.id,
        date_trunc('month', v_schedule.due_date)::date
      );
      IF v_invoice_id IS NULL THEN
        RAISE EXCEPTION 'Canonical invoice generator returned no invoice for %',
          to_char(date_trunc('month', v_schedule.due_date), 'YYYY-MM')
          USING ERRCODE = 'P0001';
      END IF;
      v_created_count := v_created_count + 1;
    ELSE
      v_invoice_id := v_existing_invoice_id;
    END IF;

    -- A helper result is not sufficient evidence of invoice identity.
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices invoice
      WHERE invoice.id = v_invoice_id
        AND invoice.company_id = v_contract.company_id
        AND invoice.contract_id = v_contract.id
        AND invoice.customer_id = v_contract.customer_id
        AND invoice.penalty_id IS NULL
        AND upper(btrim(COALESCE(invoice.invoice_number, ''))) NOT LIKE 'TV-%'
        AND date_trunc('month', COALESCE(invoice.invoice_month, invoice.invoice_date)) = date_trunc('month', v_schedule.due_date)
        AND abs(invoice.total_amount - v_schedule.amount) <= 0.01
        AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive')
        AND lower(COALESCE(invoice.payment_status, '')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive')
    ) THEN
      RAISE EXCEPTION 'Generated rental invoice identity or amount did not match the installment' USING ERRCODE = 'P0001';
    END IF;

    IF NOT public.system_invoice_has_single_balanced_posted_journal(
      v_contract.company_id,
      v_invoice_id,
      v_schedule.amount
    ) THEN
      RAISE EXCEPTION 'Invoice % does not have exactly one balanced posted journal', v_invoice_id
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.contract_payment_schedules schedule
    SET invoice_id = v_invoice_id,
        updated_at = now()
    WHERE schedule.id = v_schedule.id
      AND schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id;

    PERFORM public.system_agent_resolve_invoice_month_findings(
      v_contract.company_id,
      v_contract.id,
      v_invoice_id,
      date_trunc('month', v_schedule.due_date)::date
    );
  END LOOP;

  INSERT INTO public.audit_logs (
    company_id,
    action,
    resource_type,
    resource_id,
    entity_name,
    changes_summary,
    new_values,
    metadata,
    status,
    severity,
    user_id,
    user_name,
    notes
  ) VALUES (
    v_contract.company_id,
    'authoritative_contract_schedule_invoices_generated',
    'contract',
    v_contract.id,
    v_contract.contract_number,
    'تم اعتماد جدول الدفعات الفعّال كمصدر للفواتير بعد التحقق من المدة والمبالغ والتسلسل',
    jsonb_build_object(
      'created_invoices', v_created_count,
      'schedule_count', v_active_schedule_count,
      'schedule_total', v_schedule_total,
      'contract_total', v_contract_total
    ),
    jsonb_build_object(
      'generator', 'generate_contract_billing_graph_v2',
      'mode', 'authoritative_schedule'
    ),
    'completed',
    'info',
    CASE WHEN v_actor_role = 'service_role' THEN NULL ELSE v_actor END,
    CASE WHEN v_actor_role = 'service_role' THEN 'System Agent' ELSE 'Authenticated finance user' END,
    'يدعم أقساط البداية والنهاية الجزئية ولا ينشئ شهراً خارج العقد.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'mode', 'authoritative_schedule',
    'created_invoices', v_created_count,
    'schedule_count', v_active_schedule_count,
    'schedule_total', v_schedule_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_contract_billing_graph_v2(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_contract_billing_graph_v2(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.generate_contract_billing_graph_v2(uuid) IS
'Creates missing rental invoices atomically. Existing and newly generated schedules share identity, period, amount and journal validation; traffic charges do not satisfy rental installments.';

COMMIT;
