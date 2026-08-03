-- Use the canonical invoice issue month during monthly reconciliation.
-- due_date is a payment deadline and must not reserve another billing month.
-- Baseline note: invoice_month exists in the deployed schema and generated
-- types, but its creating migration is absent locally. Reconcile that baseline
-- separately; this migration validates the dependency and never creates or
-- backfills financial columns.

BEGIN;

-- Fail with an actionable dependency error before dropping the current guard.
DO $$
DECLARE
  v_invoice_month_type text;
BEGIN
  SELECT column_definition.data_type
  INTO v_invoice_month_type
  FROM information_schema.columns column_definition
  WHERE column_definition.table_schema = 'public'
    AND column_definition.table_name = 'invoices'
    AND column_definition.column_name = 'invoice_month';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Migration dependency missing: public.invoices.invoice_month must already exist as date; reconcile the baseline schema before applying 20260803144007';
  END IF;

  IF v_invoice_month_type <> 'date' THEN
    RAISE EXCEPTION
      'Migration dependency mismatch: public.invoices.invoice_month must be date, found %; reconcile the baseline schema before applying 20260803144007',
      v_invoice_month_type;
  END IF;
END;
$$;

-- Stop before replacing the existing guard if canonical active-month duplicates
-- already exist. This migration intentionally does not rewrite financial data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.contract_id IS NOT NULL
      AND COALESCE(invoice.invoice_month, invoice.invoice_date) IS NOT NULL
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    GROUP BY
      invoice.contract_id,
      date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot install canonical invoice-month constraint while active canonical-month duplicates exist';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_duplicate_monthly_invoice ON public.invoices;
DROP INDEX IF EXISTS public.idx_invoices_unique_contract_month;

CREATE UNIQUE INDEX idx_invoices_unique_contract_month
  ON public.invoices (
    contract_id,
    (
      date_trunc(
        'month',
        COALESCE(invoice_month, invoice_date)::timestamp without time zone
      )::date
    )
  )
  WHERE contract_id IS NOT NULL
    AND COALESCE(invoice_month, invoice_date) IS NOT NULL
    AND lower(COALESCE(status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

CREATE OR REPLACE FUNCTION public.check_duplicate_monthly_invoice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invoice_month date;
  v_existing_invoice_number text;
BEGIN
  IF NEW.contract_id IS NULL
     OR COALESCE(NEW.invoice_month, NEW.invoice_date) IS NULL
     OR lower(COALESCE(NEW.status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
     )
     OR lower(COALESCE(NEW.payment_status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
     )
  THEN
    RETURN NEW;
  END IF;

  v_invoice_month := date_trunc(
    'month',
    COALESCE(NEW.invoice_month, NEW.invoice_date)::timestamp without time zone
  )::date;

  SELECT invoice.invoice_number
  INTO v_existing_invoice_number
  FROM public.invoices invoice
  WHERE invoice.company_id = NEW.company_id
    AND invoice.contract_id = NEW.contract_id
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
    AND invoice.id <> COALESCE(
      NEW.id,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  ORDER BY invoice.id
  LIMIT 1;

  IF v_existing_invoice_number IS NOT NULL THEN
    RAISE EXCEPTION
      'An active invoice (%) already exists for this contract canonical month %',
      v_existing_invoice_number,
      to_char(v_invoice_month, 'YYYY-MM')
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_duplicate_monthly_invoice
  BEFORE INSERT OR UPDATE OF
    company_id,
    contract_id,
    invoice_month,
    invoice_date,
    status,
    payment_status
  ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.check_duplicate_monthly_invoice();

CREATE OR REPLACE FUNCTION public.generate_invoice_for_contract_month(
  p_contract_id uuid,
  p_invoice_month date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_number varchar(50);
  v_total_amount numeric(15,3);
  v_invoice_date date;
  v_schedule_id uuid;
  v_actor uuid := auth.uid();
  v_jwt_role text := COALESCE(auth.jwt() ->> 'role', '');
  -- SECURITY DEFINER changes current_user; session_user retains the trusted
  -- connection identity used by direct pg_cron/database invocations.
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
  v_company_currency text;
BEGIN
  IF p_contract_id IS NULL OR p_invoice_month IS NULL THEN
    RAISE EXCEPTION 'Contract and invoice month are required' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_trusted_direct_session AND v_jwt_role <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'Authentication is required to generate invoices' USING ERRCODE = '42501';
    END IF;
    IF public.get_user_company_id() IS DISTINCT FROM v_contract.company_id THEN
      RAISE EXCEPTION 'Not authorized to generate invoices for this company' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_finance_action_authorized(
      v_actor,
      v_contract.company_id,
      ARRAY['finance.invoice.create', 'finance.invoices.write'],
      ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']
    ) THEN
      RAISE EXCEPTION 'Not authorized to generate contract invoices'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  p_invoice_month := date_trunc('month', p_invoice_month)::date;
  IF v_contract.start_date > (p_invoice_month + interval '1 month - 1 day')::date
     OR v_contract.end_date < p_invoice_month
  THEN
    RETURN NULL;
  END IF;

  -- A company/month lock also protects the sequential invoice number.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_contract.company_id::text || ':invoice:' || to_char(p_invoice_month, 'YYYY-MM'), 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = p_contract_id
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date = p_invoice_month
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
  ) THEN
    RETURN NULL;
  END IF;

  SELECT schedule.id, schedule.amount, schedule.due_date
  INTO v_schedule_id, v_total_amount, v_invoice_date
  FROM public.contract_payment_schedules schedule
  WHERE schedule.contract_id = p_contract_id
    AND schedule.company_id = v_contract.company_id
    AND date_trunc('month', schedule.due_date)::date = p_invoice_month
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  ORDER BY schedule.installment_number NULLS LAST, schedule.due_date, schedule.id
  LIMIT 1;

  v_total_amount := COALESCE(v_total_amount, v_contract.monthly_amount, v_contract.contract_amount, 0);
  v_invoice_date := greatest(COALESCE(v_invoice_date, p_invoice_month), v_contract.start_date);
  IF v_total_amount <= 0.01 THEN
    RAISE EXCEPTION 'Contract invoice amount must be positive' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(NULLIF(company.currency, ''), 'QAR')
  INTO v_company_currency
  FROM public.companies company
  WHERE company.id = v_contract.company_id;

  SELECT 'INV-' || to_char(p_invoice_month, 'YYYYMM') || '-' ||
         lpad((COALESCE(MAX(CAST(substring(invoice.invoice_number FROM 'INV-[0-9]{6}-([0-9]+)') AS integer)), 0) + 1)::text, 5, '0')
  INTO v_invoice_number
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.invoice_number LIKE 'INV-' || to_char(p_invoice_month, 'YYYYMM') || '-%';

  INSERT INTO public.invoices (
    company_id, customer_id, contract_id, cost_center_id, invoice_number,
    invoice_date, invoice_month, due_date, total_amount, subtotal, tax_amount,
    discount_amount, paid_amount, balance_due, status, payment_status,
    invoice_type, currency, notes, created_by, created_at, updated_at
  ) VALUES (
    v_contract.company_id, v_contract.customer_id, v_contract.id, v_contract.cost_center_id,
    v_invoice_number, v_invoice_date, p_invoice_month, v_invoice_date,
    v_total_amount, v_total_amount, 0, 0, 0, v_total_amount,
    'sent', 'unpaid', 'service', COALESCE(v_company_currency, 'QAR'),
    'Generated for contract billing month ' || to_char(p_invoice_month, 'YYYY-MM'),
    v_actor, now(), now()
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (
    invoice_id, line_number, item_description, item_description_ar,
    quantity, unit_price, line_total, tax_rate, tax_amount, cost_center_id
  ) VALUES (
    v_invoice_id, 1,
    'Monthly rental payment - ' || to_char(p_invoice_month, 'YYYY-MM'),
    'قسط إيجار شهري - ' || to_char(p_invoice_month, 'YYYY-MM'),
    1, v_total_amount, v_total_amount, 0, 0, v_contract.cost_center_id
  );

  IF v_schedule_id IS NOT NULL THEN
    UPDATE public.contract_payment_schedules schedule
    SET invoice_id = v_invoice_id,
        updated_at = now()
    WHERE schedule.id = v_schedule_id
      AND schedule.company_id = v_contract.company_id;
  END IF;

  RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.monthly_contract_invoice_reconciliation(
  p_target_month date DEFAULT date_trunc('month', CURRENT_DATE + INTERVAL '1 month')::date
)
RETURNS TABLE (
  company_id uuid,
  contract_id uuid,
  contract_number text,
  invoice_month date,
  action text,
  invoice_id uuid,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_contract record;
  v_invoice_id uuid;
  v_amount numeric;
  v_month date := date_trunc('month', p_target_month)::date;
BEGIN
  FOR v_contract IN
    SELECT
      contract.id,
      contract.company_id,
      contract.contract_number,
      contract.customer_id,
      contract.start_date,
      contract.end_date,
      contract.monthly_amount,
      contract.contract_amount,
      contract.status
    FROM public.contracts contract
    JOIN public.companies company ON company.id = contract.company_id
    WHERE contract.status IN ('active', 'under_legal_procedure')
      AND contract.start_date IS NOT NULL
      AND date_trunc('month', contract.start_date + INTERVAL '1 month')::date <= v_month
      AND (contract.end_date IS NULL OR date_trunc('month', contract.end_date)::date >= v_month)
      AND (company.subscription_status = 'active' OR company.subscription_status IS NULL)
      AND (company.subscription_expires_at IS NULL OR company.subscription_expires_at > CURRENT_DATE)
    ORDER BY contract.company_id, contract.contract_number
  LOOP
    company_id := v_contract.company_id;
    contract_id := v_contract.id;
    contract_number := v_contract.contract_number;
    invoice_month := v_month;
    invoice_id := NULL;

    v_amount := COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0);
    IF v_amount <= 0 THEN
      action := 'skipped';
      message := 'missing_monthly_amount';
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT invoice.id
    INTO invoice_id
    FROM public.invoices invoice
    WHERE invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
      )::date = v_month
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled',
        'canceled',
        'void',
        'voided',
        'deleted',
        'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled',
        'canceled',
        'void',
        'voided',
        'deleted',
        'inactive'
      )
    ORDER BY invoice.id
    LIMIT 1;

    IF invoice_id IS NOT NULL THEN
      action := 'existing';
      message := 'invoice_already_exists';
      RETURN NEXT;
      CONTINUE;
    END IF;

    BEGIN
      v_invoice_id := public.generate_invoice_for_contract_month(v_contract.id, v_month);
      invoice_id := v_invoice_id;

      IF v_invoice_id IS NULL THEN
        action := 'skipped';
        message := 'generator_returned_no_invoice';
      ELSE
        action := 'created';
        message := 'invoice_created';
      END IF;

      RETURN NEXT;
    EXCEPTION
      -- Authorization failures are systemic. Propagate them so pg_cron records
      -- a failed run instead of COUNT(*) reporting a misleading success.
      WHEN SQLSTATE '42501' THEN
        RAISE;
      WHEN OTHERS THEN
        action := 'error';
        message := SQLERRM;
        invoice_id := NULL;
        RETURN NEXT;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.system_agent_apply_contract_invoice_billing_month_repair_v9(
  p_run_id uuid,
  p_job_id uuid,
  p_finding_id uuid,
  p_command text,
  p_company_id uuid,
  p_entity_id text,
  p_expected_before jsonb DEFAULT '{}'::jsonb,
  p_values jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_job public.system_agent_jobs%ROWTYPE;
  v_finding public.system_agent_findings%ROWTYPE;
  v_registry public.system_agent_command_registry%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_schedule public.contract_payment_schedules%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_expected_matches boolean := false;
  v_candidate_count integer := 0;
  v_candidate_id uuid;
  v_created_invoice_id uuid;
  v_month date;
  v_billing_date_mode text;
  v_preexisting_month_schedules jsonb := '[]'::jsonb;
  v_repair_id uuid := gen_random_uuid();
  v_repair_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  IF p_command NOT IN (
    'schedule.repair_invoice_link',
    'schedule.link_invoice_by_billing_month',
    'contract.generate_missing_invoice'
  ) THEN
    RAISE EXCEPTION 'Billing-month invoice gateway received an unsupported command';
  END IF;

  -- Retain the legacy payload field for worker compatibility, but remove the
  -- legacy behavior switch. Invoice due dates never identify an invoice month.
  v_billing_date_mode := COALESCE(p_values ->> 'billing_date_mode', '');
  IF v_billing_date_mode <> 'invoice_date'
     OR (COALESCE(p_values, '{}'::jsonb) - 'billing_date_mode') <> '{}'::jsonb
  THEN
    RAISE EXCEPTION 'Billing-month repairs require only billing_date_mode=invoice_date';
  END IF;

  SELECT * INTO v_job
  FROM public.system_agent_jobs job
  WHERE job.id = p_job_id
    AND job.run_id = p_run_id
    AND job.company_id = p_company_id
  FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status <> 'running' OR v_job.mode <> 'apply' OR v_job.domain <> 'contracts' THEN
    RAISE EXCEPTION 'System agent job is not an active contract apply job';
  END IF;

  SELECT * INTO v_finding
  FROM public.system_agent_findings finding
  WHERE finding.id = p_finding_id
    AND finding.run_id = p_run_id
    AND finding.job_id = p_job_id
    AND finding.company_id = p_company_id
  FOR UPDATE;
  IF v_finding.id IS NULL
     OR v_finding.repair_command IS DISTINCT FROM p_command
     OR v_finding.entity_type <> 'contract_payment_schedule'
     OR v_finding.entity_id <> p_entity_id
  THEN
    RAISE EXCEPTION 'Finding does not authorize this billing-month repair';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command AND registry.enabled = true;
  IF v_registry.command IS NULL OR v_registry.entity_table <> 'contract_payment_schedules' THEN
    RAISE EXCEPTION 'Billing-month repair command is not enabled for contract schedules';
  END IF;

  SELECT * INTO v_schedule
  FROM public.contract_payment_schedules schedule
  WHERE schedule.id = p_entity_id::uuid
    AND schedule.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule is outside the active company';
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_schedule.contract_id
    AND contract.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule contract is outside the active company';
  END IF;

  IF lower(COALESCE(v_schedule.status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
     )
     OR lower(COALESCE(v_contract.status::text, '')) NOT IN (
       'active',
       'under_legal_procedure'
     )
     OR v_contract.start_date IS NULL
     OR v_contract.end_date IS NULL
     OR v_schedule.due_date < v_contract.start_date
     OR v_schedule.due_date > v_contract.end_date
     OR COALESCE(v_schedule.amount, 0) <= 0.01
  THEN
    RAISE EXCEPTION 'Schedule and billable contract lifecycle do not permit billing-month invoice repair';
  END IF;

  v_before := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
  v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
    OR v_before @> p_expected_before;
  IF NOT v_expected_matches THEN
    RAISE EXCEPTION 'Schedule changed after billing-month detection';
  END IF;

  v_month := date_trunc('month', v_schedule.due_date)::date;
  SELECT count(*), (array_agg(invoice.id ORDER BY invoice.id))[1]
  INTO v_candidate_count, v_candidate_id
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.contract_id = v_contract.id
    AND date_trunc(
      'month',
      COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
    )::date = v_month
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  IF v_candidate_count > 1 THEN
    RAISE EXCEPTION 'Schedule has multiple active billing-month invoice candidates';
  ELSIF v_candidate_count = 0 THEN
    IF p_command = 'schedule.link_invoice_by_billing_month' THEN
      RAISE EXCEPTION 'Billing-month repair has no existing unambiguous invoice candidate';
    END IF;
    IF v_registry.closed_period_policy = 'block'
       AND public.system_agent_date_in_closed_period(p_company_id, v_schedule.due_date)
    THEN
      RAISE EXCEPTION 'Issue-month invoice generation is blocked by a closed accounting period';
    END IF;

    PERFORM pg_advisory_xact_lock(
      hashtextextended(p_company_id::text || ':' || v_contract.id::text || ':' || to_char(v_month, 'YYYY-MM'), 0)
    );
    SELECT COALESCE(
      jsonb_agg(jsonb_build_object(
        'id', schedule.id,
        'invoice_id', schedule.invoice_id,
        'status', schedule.status,
        'paid_amount', schedule.paid_amount,
        'paid_date', schedule.paid_date
      )),
      '[]'::jsonb
    )
    INTO v_preexisting_month_schedules
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = p_company_id
      AND schedule.contract_id = v_contract.id
      AND date_trunc('month', schedule.due_date)::date = v_month;

    v_created_invoice_id := public.generate_invoice_for_contract_month(v_contract.id, v_month);
    IF v_created_invoice_id IS NULL THEN
      SELECT invoice.id INTO v_created_invoice_id
      FROM public.invoices invoice
      WHERE invoice.company_id = p_company_id
        AND invoice.contract_id = v_contract.id
        AND date_trunc(
          'month',
          COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
        )::date = v_month
        AND lower(COALESCE(invoice.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
        AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
      ORDER BY invoice.id
      LIMIT 1;
    END IF;
    IF v_created_invoice_id IS NULL THEN
      RAISE EXCEPTION 'Invoice generator did not create or return the issue-month invoice';
    END IF;
    v_candidate_id := v_created_invoice_id;
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = v_candidate_id
    AND invoice.company_id = p_company_id
    AND invoice.contract_id = v_contract.id
  FOR UPDATE;
  IF NOT FOUND
     OR date_trunc(
       'month',
       COALESCE(v_invoice.invoice_month, v_invoice.invoice_date)::timestamp without time zone
     )::date <> v_month
     OR lower(COALESCE(v_invoice.status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
     )
     OR lower(COALESCE(v_invoice.payment_status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
     )
  THEN
    RAISE EXCEPTION 'Billing-month invoice candidate failed company, contract, month, or lifecycle verification';
  END IF;
  IF abs(COALESCE(v_invoice.total_amount, 0) - COALESCE(v_schedule.amount, 0)) > 0.01 THEN
    RAISE EXCEPTION 'Billing-month invoice amount does not match the schedule amount';
  END IF;

  IF v_created_invoice_id IS NOT NULL THEN
    UPDATE public.contract_payment_schedules generated_schedule
    SET
      invoice_id = previous.invoice_id,
      status = previous.status,
      paid_amount = previous.paid_amount,
      paid_date = previous.paid_date,
      updated_at = now()
    FROM jsonb_to_recordset(v_preexisting_month_schedules) AS previous(
      id uuid,
      invoice_id uuid,
      status text,
      paid_amount numeric,
      paid_date date
    )
    WHERE generated_schedule.id = previous.id
      AND generated_schedule.company_id = p_company_id
      AND generated_schedule.contract_id = v_contract.id
      AND generated_schedule.id <> v_schedule.id
      AND generated_schedule.invoice_id = v_created_invoice_id
      AND lower(COALESCE(previous.status, '')) IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      );

    DELETE FROM public.contract_payment_schedules generated_schedule
    WHERE generated_schedule.company_id = p_company_id
      AND generated_schedule.contract_id = v_contract.id
      AND generated_schedule.invoice_id = v_created_invoice_id
      AND generated_schedule.id <> v_schedule.id
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(v_preexisting_month_schedules) AS previous(id uuid)
        WHERE previous.id = generated_schedule.id
      );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contract_payment_schedules other_schedule
    WHERE other_schedule.company_id = p_company_id
      AND other_schedule.id <> v_schedule.id
      AND other_schedule.invoice_id = v_candidate_id
      AND lower(COALESCE(other_schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
  ) THEN
    RAISE EXCEPTION 'Billing-month invoice candidate is still linked to another active schedule';
  END IF;

  IF v_schedule.invoice_id IS NOT DISTINCT FROM v_candidate_id THEN
    v_after := v_before;
  ELSE
    UPDATE public.contract_payment_schedules schedule
    SET invoice_id = v_candidate_id, updated_at = now()
    WHERE schedule.id = v_schedule.id AND schedule.company_id = p_company_id;

    SELECT * INTO v_schedule
    FROM public.contract_payment_schedules schedule
    WHERE schedule.id = p_entity_id::uuid;
    v_after := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
    IF v_schedule.invoice_id IS DISTINCT FROM v_candidate_id THEN
      RAISE EXCEPTION 'Billing-month schedule link failed postcondition verification';
    END IF;
  END IF;

  IF v_before IS NOT DISTINCT FROM v_after THEN
    UPDATE public.system_agent_findings finding
    SET status = 'ignored', repair_id = null, error = null, updated_at = now()
    WHERE finding.id = p_finding_id;
    RETURN jsonb_build_object(
      'status', 'verified_no_change',
      'command', p_command,
      'entity_id', p_entity_id,
      'state', v_after
    );
  END IF;

  v_repair_metadata := v_repair_metadata || jsonb_build_object(
    'handler_version', CASE
      WHEN p_command IN (
        'schedule.repair_invoice_link',
        'schedule.link_invoice_by_billing_month'
      ) THEN 'contract_schedule_v1'
      ELSE 'contract_invoice_v3'
    END,
    'created_invoice_id', v_created_invoice_id,
    'invoice_month', v_month,
    'billing_date_mode', v_billing_date_mode
  );

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id, 'contracts', p_command,
    v_registry.entity_table, p_entity_id, v_before, v_after, v_repair_metadata
  );

  UPDATE public.system_agent_findings finding
  SET status = 'repaired', repair_id = v_repair_id, error = null, updated_at = now()
  WHERE finding.id = p_finding_id;

  RETURN jsonb_build_object(
    'status', 'repaired',
    'repair_id', v_repair_id,
    'command', p_command,
    'entity_id', p_entity_id,
    'before', v_before,
    'after', v_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_invoice_for_contract_month(uuid, date)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoice_for_contract_month(uuid, date)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.monthly_contract_invoice_reconciliation(date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monthly_contract_invoice_reconciliation(date)
  TO service_role;

REVOKE ALL ON FUNCTION public.system_agent_apply_contract_invoice_billing_month_repair_v9(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_contract_invoice_billing_month_repair_v9(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) TO service_role;

COMMENT ON INDEX public.idx_invoices_unique_contract_month IS
  'Enforces one active invoice per contract canonical month using invoice_month with invoice_date fallback.';

COMMENT ON FUNCTION public.check_duplicate_monthly_invoice() IS
  'Rejects duplicate active contract invoices by canonical invoice_month/invoice_date month.';

COMMENT ON FUNCTION public.generate_invoice_for_contract_month(uuid, date) IS
  'Atomically creates one finance-authorized canonical-month contract invoice; service-role and trusted postgres/supabase_admin sessions support automated reconciliation.';

COMMENT ON FUNCTION public.monthly_contract_invoice_reconciliation(date) IS
'Creates missing contract invoices for one canonical issue month using invoice_month/invoice_date only; intended for pg_cron on the 28th to generate next month.';

COMMENT ON FUNCTION public.system_agent_apply_contract_invoice_billing_month_repair_v9(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) IS
  'Canonical reversible contract billing-month repair using invoice_month with invoice_date fallback; due_date never identifies the invoice month.';

COMMIT;
