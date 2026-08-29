-- Canonical, reversible repairs for duplicate and stale contract schedules.

INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES
  (
    'schedule.consolidate_duplicate_rows', 'contracts',
    'Cancel financially identical same-date schedule duplicates and normalize the retained sequence.',
    'contract_payment_schedules', ARRAY['status', 'invoice_id', 'installment_number'],
    true, false, 'allow_derived', 1.0, true
  ),
  (
    'schedule.repair_invoice_link', 'contracts',
    'Swap a stale schedule invoice link to the one canonical due-month invoice, generating it when absent.',
    'contract_payment_schedules', ARRAY['invoice_id'],
    true, false, 'block', 1.0, true
  ),
  (
    'schedule.sync_amount_from_invoice', 'contracts',
    'Synchronize a non-ledger schedule from its one financially authoritative invoice.',
    'contract_payment_schedules', ARRAY['amount', 'paid_amount', 'status', 'paid_date', 'invoice_id'],
    true, false, 'allow_derived', 1.0, true
  )
ON CONFLICT (command) DO UPDATE SET
  domain = EXCLUDED.domain,
  description = EXCLUDED.description,
  entity_table = EXCLUDED.entity_table,
  allowed_fields = EXCLUDED.allowed_fields,
  reversible = EXCLUDED.reversible,
  approval_required = EXCLUDED.approval_required,
  closed_period_policy = EXCLUDED.closed_period_policy,
  min_confidence = EXCLUDED.min_confidence,
  enabled = EXCLUDED.enabled,
  updated_at = now();
CREATE OR REPLACE FUNCTION public.system_agent_contract_schedule_state(p_contract_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'contract_id', p_contract_id,
    'schedules', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', schedule.id,
        'status', schedule.status,
        'invoice_id', schedule.invoice_id,
        'installment_number', schedule.installment_number,
        'amount', schedule.amount,
        'paid_amount', schedule.paid_amount,
        'paid_date', schedule.paid_date,
        'due_date', schedule.due_date
      ) ORDER BY schedule.due_date, schedule.id
    ), '[]'::jsonb)
  )
  FROM public.contract_payment_schedules schedule
  WHERE schedule.contract_id = p_contract_id;
$$;
REVOKE ALL ON FUNCTION public.system_agent_contract_schedule_state(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_contract_schedule_state(uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.system_agent_apply_contract_schedule_repair_v1(
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
SET search_path = public
AS $$
DECLARE
  v_job public.system_agent_jobs%ROWTYPE;
  v_finding public.system_agent_findings%ROWTYPE;
  v_registry public.system_agent_command_registry%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_schedule public.contract_payment_schedules%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_entity_uuid uuid;
  v_before jsonb;
  v_after jsonb;
  v_expected_matches boolean := false;
  v_duplicate_groups integer := 0;
  v_active_schedule_count integer := 0;
  v_candidate_count integer := 0;
  v_candidate_id uuid;
  v_created_invoice_id uuid;
  v_month date;
  v_paid numeric := 0;
  v_expected_status text;
  v_latest_paid_date date;
  v_repair_id uuid := gen_random_uuid();
  v_rollback_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb)
    || jsonb_build_object('handler_version', 'contract_schedule_v1');
BEGIN
  IF p_command NOT IN (
    'schedule.consolidate_duplicate_rows',
    'schedule.repair_invoice_link',
    'schedule.sync_amount_from_invoice'
  ) THEN
    RAISE EXCEPTION 'Canonical contract schedule gateway received an unsupported command';
  END IF;
  IF COALESCE(p_values, '{}'::jsonb) <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Contract schedule repairs derive all target values inside the canonical gateway';
  END IF;

  v_entity_uuid := p_entity_id::uuid;

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
     OR v_finding.entity_id IS DISTINCT FROM p_entity_id
     OR v_finding.status IN ('repaired', 'rolled_back')
  THEN
    RAISE EXCEPTION 'Contract schedule finding is invalid, mismatched, or already processed';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command
    AND registry.domain = 'contracts'
    AND registry.enabled
    AND registry.reversible
    AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Contract schedule command is disabled or below its confidence threshold';
  END IF;

  IF p_command = 'schedule.consolidate_duplicate_rows' THEN
    SELECT * INTO v_contract
    FROM public.contracts contract
    WHERE contract.id = v_entity_uuid AND contract.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Contract is outside the active company'; END IF;

    PERFORM 1
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = v_contract.id AND schedule.company_id = p_company_id
    FOR UPDATE;

    SELECT count(*)::integer
    INTO v_active_schedule_count
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = v_contract.id
      AND schedule.company_id = p_company_id
      AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted');

    SELECT count(*)::integer
    INTO v_duplicate_groups
    FROM (
      SELECT schedule.due_date
      FROM public.contract_payment_schedules schedule
      WHERE schedule.contract_id = v_contract.id
        AND schedule.company_id = p_company_id
        AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      GROUP BY schedule.due_date
      HAVING count(*) > 1
    ) duplicate_group;

    IF COALESCE((p_expected_before ->> 'active_schedule_count')::integer, v_active_schedule_count)
         IS DISTINCT FROM v_active_schedule_count
       OR COALESCE((p_expected_before ->> 'duplicate_group_count')::integer, v_duplicate_groups)
         IS DISTINCT FROM v_duplicate_groups
    THEN
      RAISE EXCEPTION 'Schedule collection changed after duplicate detection';
    END IF;

    v_before := public.system_agent_contract_schedule_state(v_contract.id);

    IF v_duplicate_groups > 0 AND EXISTS (
      SELECT 1
      FROM (
        SELECT
          schedule.due_date,
          count(DISTINCT round(COALESCE(schedule.amount, 0)::numeric, 2)) AS amount_count,
          count(DISTINCT round(COALESCE(schedule.paid_amount, 0)::numeric, 2)) AS paid_count,
          count(DISTINCT lower(COALESCE(schedule.status, ''))) AS status_count,
          count(DISTINCT invoice.id) FILTER (
            WHERE invoice.id IS NOT NULL
              AND invoice.company_id = p_company_id
              AND invoice.contract_id = v_contract.id
              AND date_trunc('month', COALESCE(invoice.due_date, invoice.invoice_date))::date =
                  date_trunc('month', schedule.due_date)::date
              AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
          ) AS canonical_invoice_count
        FROM public.contract_payment_schedules schedule
        LEFT JOIN public.invoices invoice ON invoice.id = schedule.invoice_id
        WHERE schedule.contract_id = v_contract.id
          AND schedule.company_id = p_company_id
          AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
        GROUP BY schedule.due_date
        HAVING count(*) > 1
      ) group_state
      WHERE group_state.amount_count <> 1
         OR group_state.paid_count <> 1
         OR group_state.status_count <> 1
         OR group_state.canonical_invoice_count <> 1
    ) THEN
      RAISE EXCEPTION 'Duplicate schedule rows are financially different or lack one canonical invoice';
    END IF;

    IF v_duplicate_groups > 0 THEN
      WITH ranked AS (
        SELECT
          schedule.id,
          row_number() OVER (
            PARTITION BY schedule.due_date
            ORDER BY
              CASE WHEN invoice.id IS NOT NULL
                         AND invoice.company_id = p_company_id
                         AND invoice.contract_id = v_contract.id
                         AND date_trunc('month', COALESCE(invoice.due_date, invoice.invoice_date))::date =
                             date_trunc('month', schedule.due_date)::date
                         AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
                   THEN 0 ELSE 1 END,
              schedule.id
          ) AS keep_rank,
          count(*) OVER (PARTITION BY schedule.due_date) AS group_count
        FROM public.contract_payment_schedules schedule
        LEFT JOIN public.invoices invoice ON invoice.id = schedule.invoice_id
        WHERE schedule.contract_id = v_contract.id
          AND schedule.company_id = p_company_id
          AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      )
      UPDATE public.contract_payment_schedules schedule
      SET status = 'cancelled', invoice_id = NULL, updated_at = now()
      FROM ranked
      WHERE schedule.id = ranked.id
        AND ranked.group_count > 1
        AND ranked.keep_rank > 1;

      WITH numbered AS (
        SELECT schedule.id,
               row_number() OVER (ORDER BY schedule.due_date, schedule.id)::integer AS installment_number
        FROM public.contract_payment_schedules schedule
        WHERE schedule.contract_id = v_contract.id
          AND schedule.company_id = p_company_id
          AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      )
      UPDATE public.contract_payment_schedules schedule
      SET installment_number = numbered.installment_number, updated_at = now()
      FROM numbered
      WHERE schedule.id = numbered.id
        AND schedule.installment_number IS DISTINCT FROM numbered.installment_number;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules schedule
      WHERE schedule.contract_id = v_contract.id
        AND schedule.company_id = p_company_id
        AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      GROUP BY schedule.due_date
      HAVING count(*) > 1
    ) OR EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules schedule
      WHERE schedule.contract_id = v_contract.id
        AND schedule.company_id = p_company_id
        AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      GROUP BY schedule.installment_number
      HAVING count(*) > 1
    ) OR EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules schedule
      WHERE schedule.contract_id = v_contract.id
        AND schedule.company_id = p_company_id
        AND schedule.invoice_id IS NOT NULL
        AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      GROUP BY schedule.invoice_id
      HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION 'Schedule consolidation failed uniqueness postconditions';
    END IF;

    IF COALESCE(v_contract.contract_amount, 0) > 0.01 AND abs((
      SELECT COALESCE(sum(schedule.amount), 0)
      FROM public.contract_payment_schedules schedule
      WHERE schedule.contract_id = v_contract.id
        AND schedule.company_id = p_company_id
        AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    ) - v_contract.contract_amount) > 0.01 THEN
      RAISE EXCEPTION 'Retained schedule total does not equal the contract amount';
    END IF;

    v_after := public.system_agent_contract_schedule_state(v_contract.id);
    v_rollback_metadata := v_rollback_metadata || jsonb_build_object(
      'contract_id', v_contract.id,
      'duplicate_group_count', v_duplicate_groups,
      'active_schedule_count_before', v_active_schedule_count
    );

  ELSIF p_command = 'schedule.repair_invoice_link' THEN
    SELECT * INTO v_schedule
    FROM public.contract_payment_schedules schedule
    WHERE schedule.id = v_entity_uuid AND schedule.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Schedule is outside the active company'; END IF;

    SELECT * INTO v_contract
    FROM public.contracts contract
    WHERE contract.id = v_schedule.contract_id AND contract.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Schedule contract is outside the active company'; END IF;

    IF lower(COALESCE(v_schedule.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
       OR lower(COALESCE(v_contract.status::text, '')) NOT IN ('active', 'under_legal_procedure')
       OR v_contract.start_date IS NULL OR v_contract.end_date IS NULL
       OR v_schedule.due_date < v_contract.start_date OR v_schedule.due_date > v_contract.end_date
       OR COALESCE(v_schedule.amount, 0) <= 0.01
    THEN
      RAISE EXCEPTION 'Schedule and contract lifecycle do not permit automatic invoice-link repair';
    END IF;

    v_before := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    IF NOT v_expected_matches THEN
      RAISE EXCEPTION 'Schedule changed after stale-link detection';
    END IF;

    v_month := date_trunc('month', v_schedule.due_date)::date;
    SELECT count(*), (array_agg(invoice.id ORDER BY invoice.id))[1]
    INTO v_candidate_count, v_candidate_id
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id = v_contract.id
      AND date_trunc('month', COALESCE(invoice.due_date, invoice.invoice_date))::date = v_month
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided');

    IF v_candidate_count > 1 THEN
      RAISE EXCEPTION 'Schedule has multiple active due-month invoice candidates';
    ELSIF v_candidate_count = 0 THEN
      IF v_registry.closed_period_policy = 'block'
         AND public.system_agent_date_in_closed_period(p_company_id, v_schedule.due_date)
      THEN
        RAISE EXCEPTION 'Missing invoice generation is blocked by a closed accounting period';
      END IF;
      PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':' || v_contract.id::text || ':' || to_char(v_month, 'YYYY-MM'), 0));
      v_created_invoice_id := public.generate_invoice_for_contract_month(v_contract.id, v_month);
      IF v_created_invoice_id IS NULL THEN
        SELECT invoice.id INTO v_created_invoice_id
        FROM public.invoices invoice
        WHERE invoice.company_id = p_company_id
          AND invoice.contract_id = v_contract.id
          AND date_trunc('month', COALESCE(invoice.due_date, invoice.invoice_date))::date = v_month
          AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
        ORDER BY invoice.id
        LIMIT 1;
      END IF;
      IF v_created_invoice_id IS NULL THEN
        RAISE EXCEPTION 'Invoice generator did not create or return the due-month invoice';
      END IF;
      v_candidate_id := v_created_invoice_id;
    END IF;

    SELECT * INTO v_invoice
    FROM public.invoices invoice
    WHERE invoice.id = v_candidate_id
      AND invoice.company_id = p_company_id
      AND invoice.contract_id = v_contract.id
      AND date_trunc('month', COALESCE(invoice.due_date, invoice.invoice_date))::date = v_month
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Canonical due-month invoice failed verification'; END IF;

    IF EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules other_schedule
      WHERE other_schedule.company_id = p_company_id
        AND other_schedule.id <> v_schedule.id
        AND other_schedule.invoice_id = v_candidate_id
        AND lower(COALESCE(other_schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    ) THEN
      RAISE EXCEPTION 'Canonical invoice is already linked to another active schedule';
    END IF;

    UPDATE public.contract_payment_schedules schedule
    SET invoice_id = v_candidate_id, updated_at = now()
    WHERE schedule.id = v_schedule.id AND schedule.company_id = p_company_id;

    SELECT * INTO v_schedule FROM public.contract_payment_schedules WHERE id = v_entity_uuid;
    v_after := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
    IF v_schedule.invoice_id IS DISTINCT FROM v_candidate_id THEN
      RAISE EXCEPTION 'Schedule invoice-link repair failed postcondition verification';
    END IF;
    v_rollback_metadata := v_rollback_metadata || jsonb_build_object(
      'contract_id', v_contract.id,
      'candidate_invoice_id', v_candidate_id,
      'created_invoice_id', v_created_invoice_id,
      'invoice_month', v_month
    );

  ELSE
    SELECT * INTO v_schedule
    FROM public.contract_payment_schedules schedule
    WHERE schedule.id = v_entity_uuid AND schedule.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Schedule is outside the active company'; END IF;

    IF lower(COALESCE(v_schedule.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
       OR v_schedule.invoice_id IS NULL
    THEN
      RAISE EXCEPTION 'Only an active linked schedule can inherit a financial invoice amount';
    END IF;

    SELECT * INTO v_invoice
    FROM public.invoices invoice
    WHERE invoice.id = v_schedule.invoice_id
      AND invoice.company_id = p_company_id
      AND invoice.contract_id = v_schedule.contract_id
      AND COALESCE(invoice.total_amount, 0) > 0.01
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Schedule has no positive active same-contract invoice'; END IF;

    IF (
      SELECT count(*)
      FROM public.contract_payment_schedules other_schedule
      WHERE other_schedule.company_id = p_company_id
        AND other_schedule.invoice_id = v_invoice.id
        AND lower(COALESCE(other_schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    ) <> 1 THEN
      RAISE EXCEPTION 'Invoice must have exactly one active schedule before amount synchronization';
    END IF;

    v_before := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    IF NOT v_expected_matches THEN
      RAISE EXCEPTION 'Schedule changed after invoice-amount mismatch detection';
    END IF;

    v_paid := LEAST(GREATEST(public.canonical_invoice_paid_amount(v_invoice.id, NULL), 0), v_invoice.total_amount);
    v_expected_status := CASE
      WHEN v_invoice.total_amount - v_paid <= 0.01 THEN 'paid'
      WHEN v_paid > 0.01 THEN 'partially_paid'
      WHEN v_schedule.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END;

    SELECT max(source.payment_date) INTO v_latest_paid_date
    FROM (
      SELECT payment.payment_date
      FROM public.payment_allocations allocation
      JOIN public.payments payment ON payment.id = allocation.payment_id
      WHERE allocation.allocation_type = 'invoice'
        AND allocation.target_id = v_invoice.id
        AND allocation.is_active = true
        AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
        AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      UNION ALL
      SELECT payment.payment_date
      FROM public.payments payment
      WHERE payment.invoice_id = v_invoice.id
        AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
        AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
        AND NOT EXISTS (
          SELECT 1 FROM public.payment_allocations allocation
          WHERE allocation.payment_id = payment.id
            AND allocation.is_active = true
        )
    ) source;
    IF v_expected_status <> 'paid' THEN v_latest_paid_date := NULL; END IF;

    UPDATE public.contract_payment_schedules schedule
    SET
      amount = round(v_invoice.total_amount::numeric, 2),
      paid_amount = round(v_paid::numeric, 2),
      status = v_expected_status,
      paid_date = v_latest_paid_date,
      updated_at = now()
    WHERE schedule.id = v_schedule.id AND schedule.company_id = p_company_id;

    SELECT * INTO v_schedule FROM public.contract_payment_schedules WHERE id = v_entity_uuid;
    v_after := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
    IF abs(v_schedule.amount - v_invoice.total_amount) > 0.01
       OR abs(COALESCE(v_schedule.paid_amount, 0) - v_paid) > 0.01
       OR lower(COALESCE(v_schedule.status, '')) <> lower(v_expected_status)
       OR v_schedule.paid_date IS DISTINCT FROM v_latest_paid_date
    THEN
      RAISE EXCEPTION 'Schedule amount synchronization failed postcondition verification';
    END IF;
    v_rollback_metadata := v_rollback_metadata || jsonb_build_object(
      'contract_id', v_schedule.contract_id,
      'invoice_id', v_invoice.id,
      'invoice_amount', v_invoice.total_amount
    );
  END IF;

  IF v_before IS NULL OR v_after IS NULL THEN
    RAISE EXCEPTION 'Contract schedule repair did not produce auditable before and after states';
  END IF;

  IF v_before IS NOT DISTINCT FROM v_after THEN
    UPDATE public.system_agent_findings finding
    SET status = 'ignored', repair_id = NULL, error = NULL, updated_at = now()
    WHERE finding.id = p_finding_id;
    RETURN jsonb_build_object('status', 'verified_no_change', 'command', p_command, 'entity_id', p_entity_id, 'state', v_after);
  END IF;

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id, 'contracts', p_command,
    v_registry.entity_table, p_entity_id, v_before, v_after, v_rollback_metadata
  );

  UPDATE public.system_agent_findings finding
  SET status = 'repaired', repair_id = v_repair_id, error = NULL, updated_at = now()
  WHERE finding.id = p_finding_id;

  RETURN jsonb_build_object(
    'status', 'repaired', 'repair_id', v_repair_id, 'command', p_command,
    'entity_id', p_entity_id, 'before', v_before, 'after', v_after
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_apply_contract_schedule_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_contract_schedule_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;
DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_contract_schedule_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid, text)
      RENAME TO system_agent_rollback_repair_before_contract_schedule_v1;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_contract_schedule_v1(uuid,text)
  FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.system_agent_rollback_repair(
  p_repair_id uuid,
  p_reason text DEFAULT 'System agent rollback'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_repair public.system_agent_repairs%ROWTYPE;
  v_current jsonb;
  v_created_invoice public.invoices%ROWTYPE;
BEGIN
  SELECT * INTO v_repair
  FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id
  FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;

  IF COALESCE(v_repair.rollback_metadata ->> 'handler_version', '') <> 'contract_schedule_v1' THEN
    RETURN public.system_agent_rollback_repair_before_contract_schedule_v1(p_repair_id, p_reason);
  END IF;
  IF v_repair.status <> 'applied' THEN RAISE EXCEPTION 'Repair is not in an applied state'; END IF;

  IF v_repair.command = 'schedule.consolidate_duplicate_rows' THEN
    v_current := public.system_agent_contract_schedule_state((v_repair.rollback_metadata ->> 'contract_id')::uuid);
    IF v_current IS DISTINCT FROM v_repair.after_state THEN
      RAISE EXCEPTION 'Contract schedules changed after repair; rollback was safely aborted';
    END IF;

    UPDATE public.contract_payment_schedules schedule
    SET
      status = previous.status,
      invoice_id = previous.invoice_id,
      installment_number = previous.installment_number,
      updated_at = now()
    FROM jsonb_to_recordset(v_repair.before_state -> 'schedules') AS previous(
      id uuid, status text, invoice_id uuid, installment_number integer
    )
    WHERE schedule.id = previous.id AND schedule.company_id = v_repair.company_id;

    IF public.system_agent_contract_schedule_state((v_repair.rollback_metadata ->> 'contract_id')::uuid)
         IS DISTINCT FROM v_repair.before_state
    THEN
      RAISE EXCEPTION 'Contract schedule consolidation rollback failed verification';
    END IF;

  ELSIF v_repair.command = 'schedule.repair_invoice_link' THEN
    SELECT public.system_agent_pick_fields(to_jsonb(schedule), ARRAY['invoice_id'])
    INTO v_current
    FROM public.contract_payment_schedules schedule
    WHERE schedule.id = v_repair.entity_id::uuid AND schedule.company_id = v_repair.company_id
    FOR UPDATE;
    IF v_current IS NULL OR v_current IS DISTINCT FROM v_repair.after_state THEN
      RAISE EXCEPTION 'Schedule invoice link changed after repair; rollback was safely aborted';
    END IF;

    UPDATE public.contract_payment_schedules schedule
    SET invoice_id = NULLIF(v_repair.before_state ->> 'invoice_id', '')::uuid, updated_at = now()
    WHERE schedule.id = v_repair.entity_id::uuid AND schedule.company_id = v_repair.company_id;

    IF NULLIF(v_repair.rollback_metadata ->> 'created_invoice_id', '') IS NOT NULL THEN
      SELECT * INTO v_created_invoice
      FROM public.invoices invoice
      WHERE invoice.id = (v_repair.rollback_metadata ->> 'created_invoice_id')::uuid
        AND invoice.company_id = v_repair.company_id
      FOR UPDATE;
      IF FOUND THEN
        IF v_created_invoice.journal_entry_id IS NOT NULL
           OR COALESCE(v_created_invoice.paid_amount, 0) > 0.01
           OR EXISTS (SELECT 1 FROM public.payments payment WHERE payment.invoice_id = v_created_invoice.id)
           OR EXISTS (
             SELECT 1 FROM public.payment_allocations allocation
             WHERE allocation.allocation_type = 'invoice' AND allocation.target_id = v_created_invoice.id AND allocation.is_active = true
           )
        THEN
          RAISE EXCEPTION 'Generated invoice gained financial history; rollback was safely aborted';
        END IF;
        PERFORM public.cancel_invoice_with_reversal(
          v_created_invoice.id,
          v_repair.company_id,
          COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent schedule-link rollback')
        );
      END IF;
    END IF;

  ELSIF v_repair.command = 'schedule.sync_amount_from_invoice' THEN
    SELECT public.system_agent_pick_fields(
      to_jsonb(schedule), ARRAY['amount', 'paid_amount', 'status', 'paid_date', 'invoice_id']
    )
    INTO v_current
    FROM public.contract_payment_schedules schedule
    WHERE schedule.id = v_repair.entity_id::uuid AND schedule.company_id = v_repair.company_id
    FOR UPDATE;
    IF v_current IS NULL OR v_current IS DISTINCT FROM v_repair.after_state THEN
      RAISE EXCEPTION 'Schedule changed after amount repair; rollback was safely aborted';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices invoice
      WHERE invoice.id = (v_repair.rollback_metadata ->> 'invoice_id')::uuid
        AND invoice.company_id = v_repair.company_id
        AND invoice.total_amount = (v_repair.rollback_metadata ->> 'invoice_amount')::numeric
    ) THEN
      RAISE EXCEPTION 'Authoritative invoice changed after schedule repair; rollback was safely aborted';
    END IF;

    UPDATE public.contract_payment_schedules schedule
    SET
      amount = (v_repair.before_state ->> 'amount')::numeric,
      paid_amount = (v_repair.before_state ->> 'paid_amount')::numeric,
      status = v_repair.before_state ->> 'status',
      paid_date = NULLIF(v_repair.before_state ->> 'paid_date', '')::date,
      updated_at = now()
    WHERE schedule.id = v_repair.entity_id::uuid AND schedule.company_id = v_repair.company_id;
  ELSE
    RAISE EXCEPTION 'Contract schedule rollback has no implementation for command %', v_repair.command;
  END IF;

  UPDATE public.system_agent_repairs repair
  SET status = 'rolled_back', rolled_back_at = now(),
      rollback_reason = left(COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'), 1000),
      error = NULL, updated_at = now()
  WHERE repair.id = p_repair_id;

  UPDATE public.system_agent_findings finding
  SET status = 'rolled_back', error = NULL, updated_at = now()
  WHERE finding.id = v_repair.finding_id;

  RETURN jsonb_build_object('repair_id', p_repair_id, 'status', 'rolled_back');
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  TO service_role;
COMMENT ON FUNCTION public.system_agent_apply_contract_schedule_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) IS
'Canonical contract-schedule repair gateway with source-derived mutations, optimistic checks, audited states, and command-specific rollback.';
