-- Restore the previous database behavior while retaining the security hardening
-- that prevents cross-company execution of the monthly SECURITY DEFINER RPC.

BEGIN;

-- The previous index is stricter by invoice_date alone. Refuse rollback if
-- rows created after this migration would violate that historical definition.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.contract_id IS NOT NULL
      AND invoice.invoice_date IS NOT NULL
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
    GROUP BY
      invoice.contract_id,
      date_trunc(
        'month',
        invoice.invoice_date::timestamp without time zone
      )::date
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot restore invoice_date-only constraint while active issue-month duplicates exist';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_duplicate_monthly_invoice ON public.invoices;
DROP INDEX IF EXISTS public.idx_invoices_unique_contract_month;

CREATE UNIQUE INDEX idx_invoices_unique_contract_month
  ON public.invoices (
    contract_id,
    (date_trunc('month', invoice_date::timestamp without time zone)::date)
  )
  WHERE contract_id IS NOT NULL
    AND invoice_date IS NOT NULL
    AND lower(COALESCE(status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
    );

CREATE OR REPLACE FUNCTION public.check_duplicate_monthly_invoice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_invoice_month date;
  v_existing_invoice_number text;
BEGIN
  IF NEW.contract_id IS NULL
     OR NEW.invoice_date IS NULL
     OR lower(COALESCE(NEW.status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted'
     )
  THEN
    RETURN NEW;
  END IF;

  v_invoice_month := date_trunc('month', NEW.invoice_date)::date;
  SELECT invoice.invoice_number
  INTO v_existing_invoice_number
  FROM public.invoices invoice
  WHERE invoice.contract_id = NEW.contract_id
    AND date_trunc('month', invoice.invoice_date)::date = v_invoice_month
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
    )
    AND invoice.id <> COALESCE(
      NEW.id,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  ORDER BY invoice.id
  LIMIT 1;

  IF v_existing_invoice_number IS NOT NULL THEN
    RAISE EXCEPTION
      'An active invoice (%) already exists for this contract issue month %',
      v_existing_invoice_number,
      to_char(v_invoice_month, 'YYYY-MM')
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_duplicate_monthly_invoice
  BEFORE INSERT OR UPDATE OF contract_id, invoice_date, status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.check_duplicate_monthly_invoice();

CREATE OR REPLACE FUNCTION public.generate_invoice_for_contract_month(
  p_contract_id uuid,
  p_invoice_month date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_number varchar(50);
  v_total_amount numeric(15,3);
  v_invoice_date date;
  v_schedule_id uuid;
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
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

  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'Authentication is required to generate invoices' USING ERRCODE = '42501';
    END IF;
    IF public.get_user_company_id() IS DISTINCT FROM v_contract.company_id THEN
      RAISE EXCEPTION 'Not authorized to generate invoices for this company' USING ERRCODE = '42501';
    END IF;
  END IF;

  p_invoice_month := date_trunc('month', p_invoice_month)::date;
  IF v_contract.start_date > (p_invoice_month + interval '1 month - 1 day')::date
     OR v_contract.end_date < p_invoice_month
  THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_contract.company_id::text || ':invoice:' || to_char(p_invoice_month, 'YYYY-MM'), 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.contract_id = p_contract_id
      AND date_trunc('month', invoice.invoice_date)::date = p_invoice_month
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
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
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
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
SET search_path = public
AS $$
DECLARE
  v_contract record;
  v_invoice_id uuid;
  v_amount numeric;
  v_month date := date_trunc('month', p_target_month)::date;
BEGIN
  FOR v_contract IN
    SELECT
      c.id,
      c.company_id,
      c.contract_number,
      c.customer_id,
      c.start_date,
      c.end_date,
      c.monthly_amount,
      c.contract_amount,
      c.status
    FROM public.contracts c
    JOIN public.companies co ON co.id = c.company_id
    WHERE c.status IN ('active', 'under_legal_procedure')
      AND c.start_date IS NOT NULL
      AND date_trunc('month', c.start_date + INTERVAL '1 month')::date <= v_month
      AND (c.end_date IS NULL OR date_trunc('month', c.end_date)::date >= v_month)
      AND (co.subscription_status = 'active' OR co.subscription_status IS NULL)
      AND (co.subscription_expires_at IS NULL OR co.subscription_expires_at > CURRENT_DATE)
    ORDER BY c.company_id, c.contract_number
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

    SELECT i.id
    INTO invoice_id
    FROM public.invoices i
    WHERE i.contract_id = v_contract.id
      AND i.status <> 'cancelled'
      AND (
        date_trunc('month', i.invoice_date)::date = v_month
        OR date_trunc('month', i.due_date)::date = v_month
      )
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
    EXCEPTION WHEN OTHERS THEN
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
SET search_path = public, pg_temp
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
  v_billing_date_mode := COALESCE(p_values ->> 'billing_date_mode', '');
  IF v_billing_date_mode NOT IN ('invoice_date', 'due_date')
     OR (COALESCE(p_values, '{}'::jsonb) - 'billing_date_mode') <> '{}'::jsonb
  THEN
    RAISE EXCEPTION 'Billing-month repairs require only a valid billing_date_mode';
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule is outside the active company'; END IF;

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_schedule.contract_id
    AND contract.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule contract is outside the active company'; END IF;

  IF lower(COALESCE(v_schedule.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
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
      CASE
        WHEN v_billing_date_mode = 'due_date' THEN COALESCE(invoice.due_date, invoice.invoice_date)
        ELSE COALESCE(invoice.invoice_date, invoice.due_date)
      END
    )::date = v_month
    AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided');

  IF v_candidate_count > 1 THEN
    RAISE EXCEPTION 'Schedule has multiple active billing-month invoice candidates';
  ELSIF v_candidate_count = 0 THEN
    IF v_billing_date_mode = 'due_date'
       OR p_command = 'schedule.link_invoice_by_billing_month'
    THEN
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
        AND date_trunc('month', COALESCE(invoice.invoice_date, invoice.due_date))::date = v_month
        AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
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
       CASE
         WHEN v_billing_date_mode = 'due_date' THEN COALESCE(v_invoice.due_date, v_invoice.invoice_date)
         ELSE COALESCE(v_invoice.invoice_date, v_invoice.due_date)
       END
     )::date <> v_month
     OR lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
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
      AND lower(COALESCE(other_schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
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
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.monthly_contract_invoice_reconciliation(date)
  TO service_role;

REVOKE ALL ON FUNCTION public.system_agent_apply_contract_invoice_billing_month_repair_v9(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_contract_invoice_billing_month_repair_v9(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) TO service_role;

COMMENT ON INDEX public.idx_invoices_unique_contract_month IS
  'Canonical uniqueness for active contract invoices by invoice_date month. Legacy due-date uniqueness was removed.';

COMMENT ON FUNCTION public.check_duplicate_monthly_invoice() IS
  'Prevents duplicate active contract invoices by invoice_date month; due_date is a payment deadline only.';

COMMENT ON FUNCTION public.generate_invoice_for_contract_month(uuid, date) IS
  'Atomically creates one tenant-authorized contract invoice, its line item, and its monthly schedule link.';

COMMENT ON FUNCTION public.monthly_contract_invoice_reconciliation(date) IS
'Creates missing contract invoices for one month, intended for pg_cron on the 28th to generate next month only.';

COMMENT ON FUNCTION public.system_agent_apply_contract_invoice_billing_month_repair_v9(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) IS
  'Canonical reversible billing-mode repair for active and under-legal contracts that restores preexisting inactive schedules and removes only schedules created inside the invoice transaction.';

COMMIT;
