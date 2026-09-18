-- Harden the two legacy contract billing generators and break their circular
-- no-op for newly created contracts. Contract months are schedule months;
-- invoice due dates remain payment deadlines and never identify invoice month.

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_payment_schedules_for_contract(
  p_contract_id uuid,
  p_dry_run boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
  v_allowed boolean := false;
  v_employee_workspace_allowed boolean := false;
  v_contract_start_month date;
  v_month date;
  v_contract_end_month date;
  v_expected_last_month date;
  v_has_start_month_billing boolean := false;
  v_ambiguous_month date;
  v_outside_expected_month date;
  v_invalid_amount_month date;
  v_validation_month date;
  v_validation_installment integer;
  v_expected_contract_amount numeric;
  v_existing_schedule_amount numeric;
  v_existing_invoice_amount numeric;
  v_planned_amount numeric;
  v_has_contract_financial_basis boolean;
  v_schedule_due_date date;
  v_available_month_count integer;
  v_financial_installment_count integer;
  v_month_count integer;
  v_installment_number integer := 0;
  v_existing_schedule_id uuid;
  v_invoice_id uuid;
  v_invoice_number text;
  v_invoice_date date;
  v_invoice_total numeric;
  v_invoice_paid numeric;
  v_invoice_payment_status text;
  v_contract_total numeric;
  v_monthly_amount numeric;
  v_even_amount numeric;
  v_schedule_amount numeric;
  v_schedule_status text;
  v_paid_amount numeric;
  v_paid_date date;
  v_results jsonb := jsonb_build_object(
    'success', false,
    'contract_id', p_contract_id,
    'invoices_processed', 0,
    'schedules_created', 0,
    'schedules_skipped', 0,
    'errors', '[]'::jsonb,
    'warnings', '[]'::jsonb,
    'created_schedules', '[]'::jsonb,
    'dry_run', COALESCE(p_dry_run, false)
  );
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract is required to generate payment schedules'
      USING ERRCODE = 'P0001';
  END IF;

  -- pg_cron invokes this function directly as a trusted database owner and
  -- therefore has no request JWT. All API callers still require a service-role
  -- or authenticated JWT and are checked against the contract company below.
  IF NOT v_trusted_direct_session
     AND v_actor_role <> 'service_role'
     AND (v_actor_role <> 'authenticated' OR v_actor IS NULL)
  THEN
    RAISE EXCEPTION 'Authentication is required to generate payment schedules'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
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
        RAISE EXCEPTION 'Not authorized to generate payment schedules for this company'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF lower(COALESCE(v_contract.status::text, '')) NOT IN (
    'active', 'under_legal_procedure'
  ) THEN
    RAISE EXCEPTION 'Contract lifecycle does not permit payment schedule generation'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_contract.start_date IS NULL
     OR v_contract.end_date IS NULL
     OR v_contract.end_date < v_contract.start_date
  THEN
    RAISE EXCEPTION 'Contract requires a valid start and end date'
      USING ERRCODE = 'P0001';
  END IF;

  -- The contract row lock serializes both RPCs. The advisory key also makes
  -- idempotency explicit for callers that participate in this generator.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'contract-payment-schedules:' || v_contract.company_id::text || ':' || v_contract.id::text,
      0
    )
  );

  v_contract_start_month := date_trunc(
    'month',
    v_contract.start_date::timestamp without time zone
  )::date;
  v_contract_end_month := date_trunc(
    'month',
    v_contract.end_date::timestamp without time zone
  )::date;

  -- New contracts follow the established recurring convention and begin in
  -- the month after contract start. Preserve the start-month convention for a
  -- historical partial graph when an active canonical invoice or schedule
  -- already establishes it. Inactive rows never select a convention.
  SELECT
    EXISTS (
      SELECT 1
      FROM public.invoices invoice
      WHERE invoice.company_id = v_contract.company_id
        AND invoice.contract_id = v_contract.id
        AND COALESCE(invoice.total_amount, 0) > 0.01
        AND date_trunc(
          'month',
          COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
        )::date = v_contract_start_month
        AND lower(COALESCE(invoice.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
        AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules schedule
      WHERE schedule.company_id = v_contract.company_id
        AND schedule.contract_id = v_contract.id
        AND COALESCE(schedule.amount, 0) > 0.01
        AND date_trunc(
          'month',
          schedule.due_date::timestamp without time zone
        )::date = v_contract_start_month
        AND lower(COALESCE(schedule.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
    )
  INTO v_has_start_month_billing;

  v_month := CASE
    WHEN v_has_start_month_billing THEN v_contract_start_month
    ELSE date_trunc(
    'month',
    (v_contract.start_date + INTERVAL '1 month')::timestamp without time zone
    )::date
  END;

  IF v_month > v_contract_end_month THEN
    -- A contract wholly contained in its start month still has one billable
    -- month, provided its financial terms require no more than one installment.
    v_month := v_contract_start_month;
    v_contract_end_month := v_month;
  END IF;

  v_available_month_count := (
    (EXTRACT(YEAR FROM v_contract_end_month) - EXTRACT(YEAR FROM v_month)) * 12
    + EXTRACT(MONTH FROM v_contract_end_month)
    - EXTRACT(MONTH FROM v_month)
    + 1
  )::integer;
  -- Use persisted currency precision consistently. A remainder of one dirham
  -- cent is folded into the final normal installment instead of creating an
  -- unusable extra 0.01 schedule.
  v_monthly_amount := round(COALESCE(v_contract.monthly_amount, 0)::numeric, 2);
  v_contract_total := round(COALESCE(v_contract.contract_amount, 0)::numeric, 2);
  v_financial_installment_count := CASE
    WHEN v_contract_total > 0 AND v_monthly_amount > 0
      THEN GREATEST(
        1,
        CEIL(GREATEST(v_contract_total - 0.01, 0) / v_monthly_amount)::integer
      )
    ELSE v_available_month_count
  END;

  IF v_contract_total > 0
     AND v_monthly_amount > 0
     AND v_financial_installment_count > v_available_month_count
  THEN
    RAISE EXCEPTION
      'Contract amount requires % installments at % per month, but only % billing months fit between % and %',
      v_financial_installment_count,
      v_monthly_amount,
      v_available_month_count,
      to_char(v_month, 'YYYY-MM'),
      to_char(v_contract_end_month, 'YYYY-MM')
      USING ERRCODE = 'P0001';
  END IF;

  -- Never emit a due month outside the contract even when legacy financial
  -- inputs are incomplete. Conflicting positive total/monthly terms fail above
  -- instead of silently inventing a different installment amount.
  v_month_count := LEAST(
    v_available_month_count,
    GREATEST(v_financial_installment_count, 1)
  );
  v_even_amount := CASE
    WHEN v_contract_total > 0 AND v_month_count > 0
      THEN round(v_contract_total / v_month_count, 3)
    ELSE 0
  END;
  v_has_contract_financial_basis :=
    v_contract_total > 0 OR v_monthly_amount > 0;
  v_expected_last_month := (
    v_month + ((v_month_count - 1)::text || ' months')::interval
  )::date;

  -- Lock and validate the established graph before any insert. Multiple active
  -- financial rows for one canonical month are ambiguous, while an active
  -- schedule outside the inferred N-month graph would create an extra
  -- obligation. Inactive history is deliberately ignored.
  PERFORM schedule.id
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  FOR UPDATE;

  SELECT date_trunc(
    'month',
    schedule.due_date::timestamp without time zone
  )::date
  INTO v_ambiguous_month
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  GROUP BY date_trunc(
    'month',
    schedule.due_date::timestamp without time zone
  )::date
  HAVING count(*) > 1
  ORDER BY 1
  LIMIT 1;

  IF v_ambiguous_month IS NOT NULL THEN
    RAISE EXCEPTION 'Multiple active payment schedules exist for contract month %',
      to_char(v_ambiguous_month, 'YYYY-MM')
      USING ERRCODE = 'P0001';
  END IF;

  SELECT date_trunc(
    'month',
    schedule.due_date::timestamp without time zone
  )::date
  INTO v_outside_expected_month
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND date_trunc(
      'month',
      schedule.due_date::timestamp without time zone
    )::date NOT BETWEEN v_month AND v_expected_last_month
  ORDER BY 1
  LIMIT 1;

  IF v_outside_expected_month IS NOT NULL THEN
    RAISE EXCEPTION 'Active payment schedule month % is outside the expected billing graph (% through %)',
      to_char(v_outside_expected_month, 'YYYY-MM'),
      to_char(v_month, 'YYYY-MM'),
      to_char(v_expected_last_month, 'YYYY-MM')
      USING ERRCODE = 'P0001';
  END IF;

  SELECT date_trunc(
    'month',
    schedule.due_date::timestamp without time zone
  )::date
  INTO v_invalid_amount_month
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND COALESCE(schedule.amount, 0) <= 0.01
    AND date_trunc(
      'month',
      schedule.due_date::timestamp without time zone
    )::date BETWEEN v_month AND v_expected_last_month
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  ORDER BY 1
  LIMIT 1;

  IF v_invalid_amount_month IS NOT NULL THEN
    RAISE EXCEPTION 'Active payment schedule for contract month % must have a positive amount',
      to_char(v_invalid_amount_month, 'YYYY-MM')
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM invoice.id
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id
    AND COALESCE(invoice.invoice_month, invoice.invoice_date) IS NOT NULL
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  FOR UPDATE;

  SELECT date_trunc(
    'month',
    COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
  )::date
  INTO v_invalid_amount_month
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id
    AND COALESCE(invoice.invoice_month, invoice.invoice_date) IS NOT NULL
    AND COALESCE(invoice.total_amount, 0) <= 0.01
    AND date_trunc(
      'month',
      COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
    )::date BETWEEN v_month AND v_expected_last_month
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  ORDER BY 1
  LIMIT 1;

  IF v_invalid_amount_month IS NOT NULL THEN
    RAISE EXCEPTION 'Active invoice for contract month % must have a positive total',
      to_char(v_invalid_amount_month, 'YYYY-MM')
      USING ERRCODE = 'P0001';
  END IF;

  SELECT date_trunc(
    'month',
    COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
  )::date
  INTO v_outside_expected_month
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id
    AND COALESCE(invoice.invoice_month, invoice.invoice_date) IS NOT NULL
    AND COALESCE(invoice.total_amount, 0) > 0.01
    AND date_trunc(
      'month',
      COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
    )::date NOT BETWEEN v_month AND v_expected_last_month
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  ORDER BY 1
  LIMIT 1;

  IF v_outside_expected_month IS NOT NULL THEN
    RAISE EXCEPTION 'Active invoice month % is outside the expected billing graph (% through %)',
      to_char(v_outside_expected_month, 'YYYY-MM'),
      to_char(v_month, 'YYYY-MM'),
      to_char(v_expected_last_month, 'YYYY-MM')
      USING ERRCODE = 'P0001';
  END IF;

  SELECT date_trunc(
    'month',
    COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
  )::date
  INTO v_ambiguous_month
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id
    AND COALESCE(invoice.invoice_month, invoice.invoice_date) IS NOT NULL
    AND COALESCE(invoice.total_amount, 0) > 0.01
    AND date_trunc(
      'month',
      COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
    )::date BETWEEN v_month AND v_expected_last_month
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

  IF v_ambiguous_month IS NOT NULL THEN
    RAISE EXCEPTION 'Multiple active invoices exist for contract month %',
      to_char(v_ambiguous_month, 'YYYY-MM')
      USING ERRCODE = 'P0001';
  END IF;

  -- Validate the whole N-month graph before the first write. Existing rows are
  -- never rewritten, so any amount that conflicts with the contract terms (or
  -- with its counterpart for the same month) must be repaired explicitly.
  v_validation_month := v_month;
  v_validation_installment := 0;
  WHILE v_validation_installment < v_month_count
        AND v_validation_month <= v_expected_last_month
  LOOP
    v_validation_installment := v_validation_installment + 1;

    v_expected_contract_amount := CASE
      WHEN v_contract_total > 0 AND v_monthly_amount > 0
           AND v_validation_installment < v_month_count
        THEN v_monthly_amount
      WHEN v_contract_total > 0 AND v_monthly_amount > 0
        THEN v_contract_total - (v_monthly_amount * (v_month_count - 1))
      WHEN v_contract_total > 0
           AND v_validation_installment < v_month_count
        THEN v_even_amount
      WHEN v_contract_total > 0
        THEN v_contract_total - (v_even_amount * (v_month_count - 1))
      ELSE v_monthly_amount
    END;

    v_existing_schedule_amount := NULL;
    SELECT schedule.amount
    INTO v_existing_schedule_amount
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id
      AND date_trunc(
        'month',
        schedule.due_date::timestamp without time zone
      )::date = v_validation_month
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    LIMIT 1;

    v_existing_invoice_amount := NULL;
    SELECT invoice.total_amount
    INTO v_existing_invoice_amount
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND COALESCE(invoice.total_amount, 0) > 0.01
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date = v_validation_month
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    LIMIT 1;

    IF v_has_contract_financial_basis
       AND v_existing_schedule_amount IS NOT NULL
       AND abs(v_existing_schedule_amount - v_expected_contract_amount) > 0.01
    THEN
      RAISE EXCEPTION 'Active payment schedule for contract month % has amount %, expected %',
        to_char(v_validation_month, 'YYYY-MM'),
        v_existing_schedule_amount,
        v_expected_contract_amount
        USING ERRCODE = 'P0001';
    END IF;

    IF v_has_contract_financial_basis
       AND v_existing_invoice_amount IS NOT NULL
       AND abs(v_existing_invoice_amount - v_expected_contract_amount) > 0.01
    THEN
      RAISE EXCEPTION 'Active invoice for contract month % has total %, expected %',
        to_char(v_validation_month, 'YYYY-MM'),
        v_existing_invoice_amount,
        v_expected_contract_amount
        USING ERRCODE = 'P0001';
    END IF;

    IF v_existing_schedule_amount IS NOT NULL
       AND v_existing_invoice_amount IS NOT NULL
       AND abs(v_existing_schedule_amount - v_existing_invoice_amount) > 0.01
    THEN
      RAISE EXCEPTION 'Active schedule and invoice amounts disagree for contract month % (% versus %)',
        to_char(v_validation_month, 'YYYY-MM'),
        v_existing_schedule_amount,
        v_existing_invoice_amount
        USING ERRCODE = 'P0001';
    END IF;

    v_planned_amount := COALESCE(
      v_existing_schedule_amount,
      v_existing_invoice_amount,
      v_expected_contract_amount,
      0
    );
    IF v_planned_amount <= 0.01 THEN
      RAISE EXCEPTION 'Contract month % has no positive invoice, schedule, or contract amount',
        to_char(v_validation_month, 'YYYY-MM')
        USING ERRCODE = 'P0001';
    END IF;

    v_validation_month := (v_validation_month + INTERVAL '1 month')::date;
  END LOOP;

  SELECT count(*)::integer
  INTO v_installment_number
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id
    AND COALESCE(invoice.invoice_month, invoice.invoice_date) IS NOT NULL
    AND date_trunc(
      'month',
      COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
    )::date BETWEEN v_month AND v_expected_last_month
    AND COALESCE(invoice.total_amount, 0) > 0.01
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );
  v_results := jsonb_set(
    v_results,
    '{invoices_processed}',
    to_jsonb(v_installment_number)
  );

  -- Reset after using the variable for the compatibility result count.
  v_installment_number := 0;
  v_results := jsonb_set(
    v_results,
    '{contract_number}',
    to_jsonb(v_contract.contract_number)
  );

  WHILE v_installment_number < v_month_count
        AND v_month <= v_contract_end_month
  LOOP
    v_installment_number := v_installment_number + 1;
    v_schedule_due_date := GREATEST(v_month, v_contract.start_date);

    v_invoice_id := NULL;
    v_invoice_number := NULL;
    v_invoice_date := NULL;
    v_invoice_total := NULL;
    v_invoice_paid := NULL;
    v_invoice_payment_status := NULL;

    -- invoice_month is authoritative. invoice_date is the only legacy
    -- fallback; invoice.due_date is intentionally absent from this lookup.
    SELECT
      invoice.id,
      invoice.invoice_number,
      invoice.invoice_date,
      invoice.total_amount,
      invoice.paid_amount,
      invoice.payment_status
    INTO
      v_invoice_id,
      v_invoice_number,
      v_invoice_date,
      v_invoice_total,
      v_invoice_paid,
      v_invoice_payment_status
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date = v_month
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

    v_existing_schedule_id := NULL;
    SELECT schedule.id
    INTO v_existing_schedule_id
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id
      AND date_trunc(
        'month',
        schedule.due_date::timestamp without time zone
      )::date = v_month
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    ORDER BY schedule.installment_number NULLS LAST, schedule.id
    LIMIT 1
    FOR UPDATE;

    IF v_existing_schedule_id IS NOT NULL THEN
      v_results := jsonb_set(
        v_results,
        '{schedules_skipped}',
        to_jsonb((v_results ->> 'schedules_skipped')::integer + 1)
      );
      v_month := (v_month + INTERVAL '1 month')::date;
      CONTINUE;
    END IF;

    IF v_invoice_id IS NOT NULL THEN
      v_schedule_amount := v_invoice_total;
    ELSIF v_contract_total > 0 THEN
      -- Preserve a stated monthly amount for every earlier month and put the
      -- exact remainder in the final month. When no monthly amount exists,
      -- distribute the stated total across the inferred date-based graph.
      IF v_monthly_amount > 0 THEN
        IF v_installment_number < v_month_count THEN
          v_schedule_amount := v_monthly_amount;
        ELSE
          v_schedule_amount := v_contract_total - (v_monthly_amount * (v_month_count - 1));
        END IF;
      ELSIF v_installment_number < v_month_count THEN
        v_schedule_amount := v_even_amount;
      ELSE
        v_schedule_amount := v_contract_total - (v_even_amount * (v_month_count - 1));
      END IF;
    ELSE
      v_schedule_amount := v_monthly_amount;
    END IF;

    IF COALESCE(v_schedule_amount, 0) <= 0.01 THEN
      RAISE EXCEPTION 'Contract month % requires a positive schedule amount',
        to_char(v_month, 'YYYY-MM')
        USING ERRCODE = 'P0001';
    END IF;

    v_schedule_status := CASE
      WHEN lower(COALESCE(v_invoice_payment_status, '')) IN (
        'paid', 'completed', 'cleared'
      ) THEN 'paid'
      WHEN lower(COALESCE(v_invoice_payment_status, '')) IN (
        'partial', 'partial_paid', 'partially_paid'
      ) THEN 'partially_paid'
      WHEN v_schedule_due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END;
    v_paid_amount := CASE
      WHEN v_schedule_status = 'paid'
        THEN LEAST(
          v_schedule_amount,
          GREATEST(COALESCE(NULLIF(v_invoice_paid, 0), v_schedule_amount), 0)
        )
      WHEN v_schedule_status = 'partially_paid'
        THEN LEAST(
          v_schedule_amount,
          GREATEST(COALESCE(v_invoice_paid, 0), 0)
        )
      ELSE 0
    END;
    v_paid_date := NULL;
    IF v_schedule_status = 'paid' AND v_invoice_id IS NOT NULL THEN
      -- A billing/issue date is not proof of payment. Use the latest completed
      -- receipt linked directly or through the canonical allocation ledger;
      -- legacy paid invoices with no payment evidence keep paid_date null.
      SELECT max(payment.payment_date)
      INTO v_paid_date
      FROM public.payments payment
      WHERE payment.company_id = v_contract.company_id
        AND COALESCE(payment.amount, 0) > 0.01
        AND lower(COALESCE(payment.payment_status, '')) IN (
          'completed', 'paid', 'success', 'succeeded', 'cleared'
        )
        AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
        AND (
          payment.invoice_id = v_invoice_id
          OR EXISTS (
            SELECT 1
            FROM public.payment_allocations allocation
            WHERE allocation.company_id = v_contract.company_id
              AND allocation.payment_id = payment.id
              AND allocation.allocation_type = 'invoice'
              AND allocation.target_id = v_invoice_id
              AND COALESCE(allocation.is_active, true)
              AND allocation.voided_at IS NULL
          )
        );
    END IF;

    IF NOT COALESCE(p_dry_run, false) THEN
      INSERT INTO public.contract_payment_schedules (
        contract_id,
        invoice_id,
        company_id,
        amount,
        due_date,
        installment_number,
        status,
        paid_amount,
        paid_date,
        description,
        notes,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        v_contract.id,
        v_invoice_id,
        v_contract.company_id,
        v_schedule_amount,
        v_schedule_due_date,
        v_installment_number,
        v_schedule_status,
        v_paid_amount,
        v_paid_date,
        'Installment ' || v_installment_number || ' - ' || to_char(v_month, 'YYYY-MM'),
        CASE
          WHEN v_invoice_id IS NULL THEN 'Auto-generated from contract month'
          ELSE 'Auto-generated from active invoice ' || v_invoice_number
        END,
        CASE WHEN v_actor_role = 'service_role' THEN NULL ELSE v_actor END,
        now(),
        now()
      );
    END IF;

    v_results := jsonb_set(
      v_results,
      '{schedules_created}',
      to_jsonb((v_results ->> 'schedules_created')::integer + 1)
    );
    v_results := jsonb_set(
      v_results,
      '{created_schedules}',
      (v_results -> 'created_schedules') || jsonb_build_array(
        jsonb_build_object(
          'invoice_number', v_invoice_number,
          'invoice_id', v_invoice_id,
          'invoice_month', v_month,
          'installment_number', v_installment_number,
          'amount', v_schedule_amount,
          'due_date', v_schedule_due_date,
          'status', v_schedule_status,
          '_dry_run', COALESCE(p_dry_run, false)
        )
      )
    );

    v_month := (v_month + INTERVAL '1 month')::date;
  END LOOP;

  RETURN jsonb_set(v_results, '{success}', to_jsonb(true));
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoices_from_payment_schedule(
  p_contract_id uuid
)
RETURNS integer
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
  v_contract_start_month date;
  v_contract_end_month date;
  v_first_billing_month date;
  v_expected_last_month date;
  v_has_start_month_billing boolean := false;
  v_available_month_count integer;
  v_financial_installment_count integer;
  v_month_count integer;
  v_active_schedule_count integer;
  v_invoice_month date;
  v_invoice_date date;
  v_invoice_id uuid;
  v_existing_invoice_id uuid;
  v_contract_total numeric;
  v_monthly_amount numeric;
  v_count integer := 0;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract is required to generate invoices'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_trusted_direct_session
     AND v_actor_role <> 'service_role'
     AND (v_actor_role <> 'authenticated' OR v_actor IS NULL)
  THEN
    RAISE EXCEPTION 'Authentication is required to generate invoices'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
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
        RAISE EXCEPTION 'Not authorized to generate invoices for this company'
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

  -- Bootstrap the month graph first. auth.uid()/auth.jwt() continue to expose
  -- the original request inside this nested SECURITY DEFINER call.
  PERFORM public.generate_payment_schedules_for_contract(p_contract_id, false);

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'contract-schedule-invoices:' || v_contract.company_id::text || ':' || v_contract.id::text,
      0
    )
  );

  v_contract_start_month := date_trunc(
    'month',
    v_contract.start_date::timestamp without time zone
  )::date;
  v_contract_end_month := date_trunc(
    'month',
    v_contract.end_date::timestamp without time zone
  )::date;

  SELECT
    EXISTS (
      SELECT 1
      FROM public.invoices invoice
      WHERE invoice.company_id = v_contract.company_id
        AND invoice.contract_id = v_contract.id
        AND COALESCE(invoice.total_amount, 0) > 0.01
        AND date_trunc(
          'month',
          COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
        )::date = v_contract_start_month
        AND lower(COALESCE(invoice.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
        AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules schedule
      WHERE schedule.company_id = v_contract.company_id
        AND schedule.contract_id = v_contract.id
        AND COALESCE(schedule.amount, 0) > 0.01
        AND date_trunc(
          'month',
          schedule.due_date::timestamp without time zone
        )::date = v_contract_start_month
        AND lower(COALESCE(schedule.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
    )
  INTO v_has_start_month_billing;

  v_first_billing_month := CASE
    WHEN v_has_start_month_billing THEN v_contract_start_month
    ELSE date_trunc(
      'month',
      (v_contract.start_date + INTERVAL '1 month')::timestamp without time zone
    )::date
  END;
  IF v_first_billing_month > v_contract_end_month THEN
    v_first_billing_month := v_contract_start_month;
    v_contract_end_month := v_contract_start_month;
  END IF;

  v_available_month_count := (
    (EXTRACT(YEAR FROM v_contract_end_month) - EXTRACT(YEAR FROM v_first_billing_month)) * 12
    + EXTRACT(MONTH FROM v_contract_end_month)
    - EXTRACT(MONTH FROM v_first_billing_month)
    + 1
  )::integer;
  v_contract_total := round(COALESCE(v_contract.contract_amount, 0)::numeric, 2);
  v_monthly_amount := round(COALESCE(v_contract.monthly_amount, 0)::numeric, 2);
  v_financial_installment_count := CASE
    WHEN v_contract_total > 0 AND v_monthly_amount > 0
      THEN GREATEST(
        1,
        CEIL(GREATEST(v_contract_total - 0.01, 0) / v_monthly_amount)::integer
      )
    ELSE v_available_month_count
  END;
  v_month_count := LEAST(
    v_available_month_count,
    GREATEST(v_financial_installment_count, 1)
  );
  v_expected_last_month := (
    v_first_billing_month + ((v_month_count - 1)::text || ' months')::interval
  )::date;

  SELECT count(*)::integer
  INTO v_active_schedule_count
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND COALESCE(schedule.amount, 0) > 0.01
    AND date_trunc(
      'month',
      schedule.due_date::timestamp without time zone
    )::date BETWEEN v_first_billing_month AND v_expected_last_month
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  IF v_active_schedule_count <> v_month_count THEN
    RAISE EXCEPTION 'Expected % active payment-schedule months from % through %, found %',
      v_month_count,
      to_char(v_first_billing_month, 'YYYY-MM'),
      to_char(v_expected_last_month, 'YYYY-MM'),
      v_active_schedule_count
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_schedule IN
    SELECT
      schedule.id,
      schedule.due_date,
      schedule.amount,
      schedule.installment_number,
      schedule.invoice_id,
      schedule.paid_amount,
      schedule.paid_date,
      schedule.status
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id
      AND COALESCE(schedule.amount, 0) > 0.01
      AND date_trunc(
        'month',
        schedule.due_date::timestamp without time zone
      )::date BETWEEN v_first_billing_month AND v_expected_last_month
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    ORDER BY schedule.due_date, schedule.installment_number NULLS LAST, schedule.id
    FOR UPDATE OF schedule
  LOOP
    v_invoice_month := date_trunc(
      'month',
      v_schedule.due_date::timestamp without time zone
    )::date;
    v_invoice_date := LEAST(
      GREATEST(v_schedule.due_date, v_contract.start_date),
      v_contract.end_date
    );

    v_existing_invoice_id := NULL;
    SELECT invoice.id
    INTO v_existing_invoice_id
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND COALESCE(invoice.total_amount, 0) > 0.01
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date = v_invoice_month
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
         abs(COALESCE(v_schedule.paid_amount, 0)) > 0.01
       OR v_schedule.paid_date IS NOT NULL
       OR lower(COALESCE(v_schedule.status, '')) NOT IN (
         'pending', 'unpaid', 'due', 'overdue', 'scheduled'
       )
       )
    THEN
      RAISE EXCEPTION
        'Payment schedule % has payment history but no active positive invoice',
        v_schedule.id
        USING ERRCODE = 'P0001';
    END IF;

    IF v_existing_invoice_id IS NULL
       AND public.system_agent_date_in_closed_period(
      v_contract.company_id,
      v_invoice_date
    ) THEN
      RAISE EXCEPTION
        'Contract invoice month % is in a closed accounting period',
        to_char(v_invoice_month, 'YYYY-MM')
        USING ERRCODE = 'P0001';
    END IF;

    -- Every bulk month uses the same canonical command as the UI and monthly
    -- reconciler. The later zero-repair wrapper validates the exact positive
    -- invoice, schedule link, and single balanced posted journal, and resolves
    -- the matching system-agent finding before returning success.
    v_invoice_id := public.generate_invoice_for_contract_month(
      p_contract_id,
      v_invoice_month
    );
    IF v_invoice_id IS NULL THEN
      RAISE EXCEPTION
        'Canonical invoice generator returned no invoice for contract month %',
        to_char(v_invoice_month, 'YYYY-MM')
        USING ERRCODE = 'P0001';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.invoices invoice
      WHERE invoice.id = v_invoice_id
        AND invoice.company_id = v_contract.company_id
        AND invoice.contract_id = v_contract.id
        AND COALESCE(invoice.total_amount, 0) > 0.01
        AND date_trunc(
          'month',
          COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
        )::date = v_invoice_month
        AND lower(COALESCE(invoice.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
        AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
    ) THEN
      RAISE EXCEPTION
        'Canonical invoice postcondition failed for contract month %',
        to_char(v_invoice_month, 'YYYY-MM')
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.contract_payment_schedules schedule
    SET invoice_id = v_invoice_id,
        updated_at = now()
    WHERE schedule.id = v_schedule.id
      AND schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND EXISTS (
        SELECT 1
        FROM public.invoices invoice
        WHERE invoice.id = v_invoice_id
          AND invoice.company_id = v_contract.company_id
          AND invoice.contract_id = v_contract.id
          AND COALESCE(invoice.total_amount, 0) > 0.01
          AND lower(COALESCE(invoice.status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
          )
          AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
          )
      );

    IF v_existing_invoice_id IS NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_payment_schedules_for_contract(uuid, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_payment_schedules_for_contract(uuid, boolean)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.generate_invoices_from_payment_schedule(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoices_from_payment_schedule(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.generate_payment_schedules_for_contract(uuid, boolean) IS
'Creates missing active contract-month schedules without rewriting existing financial rows; uses active canonical-month invoices when available and supports a non-writing dry run.';

COMMENT ON FUNCTION public.generate_invoices_from_payment_schedule(uuid) IS
'Bootstraps missing contract-month schedules, then routes every month through the canonical invoice command so zero repair, journal postconditions, finding lifecycle, and invoice_month identity are shared by all callers.';

COMMIT;;
