-- Atomically consolidate schedule duplicates and realign shifted invoice-link graphs.

INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES (
  'schedule.realign_contract_invoice_links', 'contracts',
  'Realign a deterministic one-to-one contract schedule and invoice graph without changing financial documents.',
  'contract_payment_schedules', ARRAY['invoice_id'],
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
CREATE OR REPLACE FUNCTION public.system_agent_apply_contract_schedule_graph_repair_v1(
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
  v_contract_id uuid;
  v_active_schedule_count integer := 0;
  v_duplicate_group_count integer := 0;
  v_stale_link_count integer := 0;
  v_plan jsonb := '[]'::jsonb;
  v_before jsonb;
  v_after jsonb;
  v_repair_id uuid := gen_random_uuid();
  v_rollback_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb)
    || jsonb_build_object('handler_version', 'contract_schedule_graph_v1');
BEGIN
  IF p_command NOT IN (
    'schedule.consolidate_duplicate_rows',
    'schedule.realign_contract_invoice_links'
  ) THEN
    RAISE EXCEPTION 'Contract schedule graph gateway received an unsupported command';
  END IF;
  IF COALESCE(p_values, '{}'::jsonb) <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Contract schedule graph repairs derive all values inside the canonical gateway';
  END IF;

  v_contract_id := p_entity_id::uuid;

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
    RAISE EXCEPTION 'Contract schedule graph finding is invalid, mismatched, or already processed';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command
    AND registry.domain = 'contracts'
    AND registry.enabled
    AND registry.reversible
    AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Contract schedule graph command is disabled or below its confidence threshold';
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_contract_id AND contract.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract is outside the active company'; END IF;

  PERFORM 1
  FROM public.contract_payment_schedules schedule
  WHERE schedule.contract_id = v_contract_id AND schedule.company_id = p_company_id
  ORDER BY schedule.id
  FOR UPDATE;

  PERFORM 1
  FROM public.invoices invoice
  WHERE invoice.contract_id = v_contract_id AND invoice.company_id = p_company_id
  ORDER BY invoice.id
  FOR UPDATE;

  SELECT count(*)::integer INTO v_active_schedule_count
  FROM public.contract_payment_schedules schedule
  WHERE schedule.contract_id = v_contract_id
    AND schedule.company_id = p_company_id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  SELECT count(*)::integer INTO v_duplicate_group_count
  FROM (
    SELECT schedule.due_date
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = v_contract_id
      AND schedule.company_id = p_company_id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    GROUP BY schedule.due_date
    HAVING count(*) > 1
  ) duplicate_group;

  SELECT count(*)::integer INTO v_stale_link_count
  FROM public.contract_payment_schedules schedule
  LEFT JOIN public.invoices invoice ON invoice.id = schedule.invoice_id
  WHERE schedule.contract_id = v_contract_id
    AND schedule.company_id = p_company_id
    AND schedule.invoice_id IS NOT NULL
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND NOT (
      invoice.id IS NOT NULL
      AND invoice.company_id = p_company_id
      AND invoice.contract_id = v_contract_id
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided'
      )
      AND (
        date_trunc('month', invoice.invoice_date)::date = date_trunc('month', schedule.due_date)::date
        OR date_trunc('month', invoice.due_date)::date = date_trunc('month', schedule.due_date)::date
      )
    );

  IF COALESCE((p_expected_before ->> 'active_schedule_count')::integer, v_active_schedule_count)
       IS DISTINCT FROM v_active_schedule_count
  THEN
    RAISE EXCEPTION 'Schedule collection changed after graph detection';
  END IF;
  IF p_command = 'schedule.consolidate_duplicate_rows'
     AND COALESCE((p_expected_before ->> 'duplicate_group_count')::integer, v_duplicate_group_count)
       IS DISTINCT FROM v_duplicate_group_count
  THEN
    RAISE EXCEPTION 'Duplicate schedule groups changed after detection';
  END IF;
  IF p_command = 'schedule.realign_contract_invoice_links'
     AND COALESCE((p_expected_before ->> 'stale_link_count')::integer, v_stale_link_count)
       IS DISTINCT FROM v_stale_link_count
  THEN
    RAISE EXCEPTION 'Schedule invoice links changed after graph detection';
  END IF;

  IF p_command = 'schedule.realign_contract_invoice_links' AND v_duplicate_group_count > 0 THEN
    RAISE EXCEPTION 'Duplicate schedule rows must be consolidated before link realignment';
  END IF;

  v_before := public.system_agent_contract_schedule_state(v_contract_id);

  IF p_command = 'schedule.consolidate_duplicate_rows' THEN
    IF v_duplicate_group_count = 0 THEN
      v_after := v_before;
    ELSE
      IF EXISTS (
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
                AND invoice.contract_id = v_contract_id
                AND lower(COALESCE(invoice.status, '')) NOT IN (
                  'cancelled', 'canceled', 'void', 'voided', 'deleted'
                )
                AND (
                  date_trunc('month', invoice.invoice_date)::date = date_trunc('month', schedule.due_date)::date
                  OR date_trunc('month', invoice.due_date)::date = date_trunc('month', schedule.due_date)::date
                )
            ) AS canonical_invoice_count
          FROM public.contract_payment_schedules schedule
          LEFT JOIN public.invoices invoice ON invoice.id = schedule.invoice_id
          WHERE schedule.contract_id = v_contract_id
            AND schedule.company_id = p_company_id
            AND lower(COALESCE(schedule.status, '')) NOT IN (
              'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
            )
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

      WITH ranked AS (
        SELECT
          schedule.id,
          row_number() OVER (
            PARTITION BY schedule.due_date
            ORDER BY
              CASE WHEN invoice.id IS NOT NULL
                         AND invoice.company_id = p_company_id
                         AND invoice.contract_id = v_contract_id
                         AND lower(COALESCE(invoice.status, '')) NOT IN (
                           'cancelled', 'canceled', 'void', 'voided', 'deleted'
                         )
                         AND (
                           date_trunc('month', invoice.invoice_date)::date = date_trunc('month', schedule.due_date)::date
                           OR date_trunc('month', invoice.due_date)::date = date_trunc('month', schedule.due_date)::date
                         )
                   THEN 0 ELSE 1 END,
              schedule.id
          ) AS keep_rank,
          count(*) OVER (PARTITION BY schedule.due_date) AS group_count
        FROM public.contract_payment_schedules schedule
        LEFT JOIN public.invoices invoice ON invoice.id = schedule.invoice_id
        WHERE schedule.contract_id = v_contract_id
          AND schedule.company_id = p_company_id
          AND lower(COALESCE(schedule.status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
          )
      )
      UPDATE public.contract_payment_schedules schedule
      SET status = 'cancelled', invoice_id = NULL, updated_at = now()
      FROM ranked
      WHERE schedule.id = ranked.id
        AND ranked.group_count > 1
        AND ranked.keep_rank > 1;
    END IF;
  END IF;

  WITH linked_schedule AS (
    SELECT
      schedule.id AS schedule_id,
      schedule.invoice_id AS old_invoice_id,
      CASE
        WHEN linked.id IS NOT NULL
          AND linked.company_id = p_company_id
          AND linked.contract_id = v_contract_id
          AND lower(COALESCE(linked.status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted'
          )
          AND lower(COALESCE(linked.payment_status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided'
          )
          AND (
            date_trunc('month', linked.invoice_date)::date = date_trunc('month', schedule.due_date)::date
            OR date_trunc('month', linked.due_date)::date = date_trunc('month', schedule.due_date)::date
          )
        THEN schedule.invoice_id
        WHEN issue_candidate.candidate_count = 1 THEN issue_candidate.candidate_id
        WHEN issue_candidate.candidate_count = 0 AND due_candidate.candidate_count = 1
        THEN due_candidate.candidate_id
        ELSE NULL
      END AS new_invoice_id,
      NOT (
        linked.id IS NOT NULL
        AND linked.company_id = p_company_id
        AND linked.contract_id = v_contract_id
        AND lower(COALESCE(linked.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted'
        )
        AND lower(COALESCE(linked.payment_status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided'
        )
        AND (
          date_trunc('month', linked.invoice_date)::date = date_trunc('month', schedule.due_date)::date
          OR date_trunc('month', linked.due_date)::date = date_trunc('month', schedule.due_date)::date
        )
      ) AS was_stale
    FROM public.contract_payment_schedules schedule
    LEFT JOIN public.invoices linked ON linked.id = schedule.invoice_id
    LEFT JOIN LATERAL (
      SELECT
        count(*)::integer AS candidate_count,
        (array_agg(candidate.id ORDER BY candidate.id))[1] AS candidate_id
      FROM public.invoices candidate
      WHERE candidate.company_id = p_company_id
        AND candidate.contract_id = v_contract_id
        AND date_trunc('month', candidate.invoice_date)::date = date_trunc('month', schedule.due_date)::date
        AND lower(COALESCE(candidate.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted'
        )
        AND lower(COALESCE(candidate.payment_status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided'
        )
    ) issue_candidate ON true
    LEFT JOIN LATERAL (
      SELECT
        count(*)::integer AS candidate_count,
        (array_agg(candidate.id ORDER BY candidate.id))[1] AS candidate_id
      FROM public.invoices candidate
      WHERE candidate.company_id = p_company_id
        AND candidate.contract_id = v_contract_id
        AND date_trunc('month', candidate.due_date)::date = date_trunc('month', schedule.due_date)::date
        AND lower(COALESCE(candidate.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted'
        )
        AND lower(COALESCE(candidate.payment_status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided'
        )
    ) due_candidate ON true
    WHERE schedule.contract_id = v_contract_id
      AND schedule.company_id = p_company_id
      AND schedule.invoice_id IS NOT NULL
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'schedule_id', schedule_id,
        'old_invoice_id', old_invoice_id,
        'new_invoice_id', new_invoice_id,
        'was_stale', was_stale
      ) ORDER BY schedule_id
    ),
    '[]'::jsonb
  )
  INTO v_plan
  FROM linked_schedule;

  SELECT count(*)::integer INTO v_stale_link_count
  FROM jsonb_to_recordset(v_plan) AS planned(
    schedule_id uuid, old_invoice_id uuid, new_invoice_id uuid, was_stale boolean
  )
  WHERE planned.was_stale;

  IF p_command = 'schedule.realign_contract_invoice_links'
     AND COALESCE((p_expected_before ->> 'stale_link_count')::integer, v_stale_link_count)
       IS DISTINCT FROM v_stale_link_count
  THEN
    RAISE EXCEPTION 'Schedule graph changed while the realignment plan was built';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_plan) AS planned(
      schedule_id uuid, old_invoice_id uuid, new_invoice_id uuid, was_stale boolean
    )
    WHERE planned.was_stale AND planned.new_invoice_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Shifted schedule graph has a missing or ambiguous invoice candidate';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_plan) AS planned(
      schedule_id uuid, old_invoice_id uuid, new_invoice_id uuid, was_stale boolean
    )
    WHERE planned.new_invoice_id IS NOT NULL
    GROUP BY planned.new_invoice_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Shifted schedule graph is not one-to-one';
  END IF;

  IF v_stale_link_count > 0 THEN
    IF lower(COALESCE(v_contract.status::text, '')) NOT IN ('active', 'under_legal_procedure')
       OR v_contract.start_date IS NULL OR v_contract.end_date IS NULL
       OR EXISTS (
         SELECT 1
         FROM public.contract_payment_schedules schedule
         JOIN jsonb_to_recordset(v_plan) AS planned(
           schedule_id uuid, old_invoice_id uuid, new_invoice_id uuid, was_stale boolean
         ) ON planned.schedule_id = schedule.id
         WHERE planned.was_stale
           AND (
             COALESCE(schedule.amount, 0) <= 0.01
             OR schedule.due_date < v_contract.start_date
             OR schedule.due_date > v_contract.end_date
           )
       )
    THEN
      RAISE EXCEPTION 'Contract lifecycle does not permit atomic schedule-link realignment';
    END IF;

    UPDATE public.contract_payment_schedules schedule
    SET invoice_id = NULL, updated_at = now()
    FROM jsonb_to_recordset(v_plan) AS planned(
      schedule_id uuid, old_invoice_id uuid, new_invoice_id uuid, was_stale boolean
    )
    WHERE schedule.id = planned.schedule_id
      AND schedule.company_id = p_company_id
      AND planned.was_stale
      AND planned.old_invoice_id IS DISTINCT FROM planned.new_invoice_id;

    UPDATE public.contract_payment_schedules schedule
    SET invoice_id = planned.new_invoice_id, updated_at = now()
    FROM jsonb_to_recordset(v_plan) AS planned(
      schedule_id uuid, old_invoice_id uuid, new_invoice_id uuid, was_stale boolean
    )
    WHERE schedule.id = planned.schedule_id
      AND schedule.company_id = p_company_id
      AND planned.was_stale
      AND planned.new_invoice_id IS NOT NULL;
  END IF;

  WITH numbered AS (
    SELECT
      schedule.id,
      row_number() OVER (ORDER BY schedule.due_date, schedule.id)::integer AS installment_number
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = v_contract_id
      AND schedule.company_id = p_company_id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
  )
  UPDATE public.contract_payment_schedules schedule
  SET installment_number = numbered.installment_number, updated_at = now()
  FROM numbered
  WHERE schedule.id = numbered.id
    AND schedule.installment_number IS DISTINCT FROM numbered.installment_number;

  IF EXISTS (
    SELECT 1
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = v_contract_id
      AND schedule.company_id = p_company_id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    GROUP BY schedule.due_date
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = v_contract_id
      AND schedule.company_id = p_company_id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    GROUP BY schedule.installment_number
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = v_contract_id
      AND schedule.company_id = p_company_id
      AND schedule.invoice_id IS NOT NULL
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    GROUP BY schedule.invoice_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Contract schedule graph failed uniqueness postconditions';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contract_payment_schedules schedule
    LEFT JOIN public.invoices invoice ON invoice.id = schedule.invoice_id
    WHERE schedule.contract_id = v_contract_id
      AND schedule.company_id = p_company_id
      AND schedule.invoice_id IS NOT NULL
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND NOT (
        invoice.id IS NOT NULL
        AND invoice.company_id = p_company_id
        AND invoice.contract_id = v_contract_id
        AND lower(COALESCE(invoice.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted'
        )
        AND (
          date_trunc('month', invoice.invoice_date)::date = date_trunc('month', schedule.due_date)::date
          OR date_trunc('month', invoice.due_date)::date = date_trunc('month', schedule.due_date)::date
        )
      )
  ) THEN
    RAISE EXCEPTION 'Contract schedule graph retained an invalid invoice link';
  END IF;

  IF p_command = 'schedule.consolidate_duplicate_rows'
     AND COALESCE(v_contract.contract_amount, 0) > 0.01
     AND abs((
       SELECT COALESCE(sum(schedule.amount), 0)
       FROM public.contract_payment_schedules schedule
       WHERE schedule.contract_id = v_contract_id
         AND schedule.company_id = p_company_id
         AND lower(COALESCE(schedule.status, '')) NOT IN (
           'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
         )
     ) - v_contract.contract_amount) > 0.01
  THEN
    RAISE EXCEPTION 'Retained schedule total does not equal the contract amount';
  END IF;

  v_after := public.system_agent_contract_schedule_state(v_contract_id);
  v_rollback_metadata := v_rollback_metadata || jsonb_build_object(
    'contract_id', v_contract_id,
    'active_schedule_count_before', v_active_schedule_count,
    'duplicate_group_count_before', v_duplicate_group_count,
    'stale_link_count_before', v_stale_link_count,
    'link_plan', v_plan
  );

  IF v_before IS NOT DISTINCT FROM v_after THEN
    UPDATE public.system_agent_findings finding
    SET status = 'ignored', repair_id = NULL, error = NULL, updated_at = now()
    WHERE finding.id = p_finding_id;
    RETURN jsonb_build_object(
      'status', 'verified_no_change', 'command', p_command,
      'entity_id', p_entity_id, 'state', v_after
    );
  END IF;

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id,
    'contracts', p_command, v_registry.entity_table, p_entity_id,
    v_before, v_after, v_rollback_metadata
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
REVOKE ALL ON FUNCTION public.system_agent_apply_contract_schedule_graph_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_contract_schedule_graph_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;
DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_contract_schedule_graph_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid, text)
      RENAME TO system_agent_rollback_repair_before_contract_schedule_graph_v1;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_contract_schedule_graph_v1(uuid,text)
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
  v_contract_id uuid;
  v_current jsonb;
BEGIN
  SELECT * INTO v_repair
  FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id
  FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;

  IF COALESCE(v_repair.rollback_metadata ->> 'handler_version', '') <> 'contract_schedule_graph_v1' THEN
    RETURN public.system_agent_rollback_repair_before_contract_schedule_graph_v1(p_repair_id, p_reason);
  END IF;
  IF v_repair.status <> 'applied' THEN RAISE EXCEPTION 'Repair is not in an applied state'; END IF;

  v_contract_id := (v_repair.rollback_metadata ->> 'contract_id')::uuid;
  v_current := public.system_agent_contract_schedule_state(v_contract_id);
  IF v_current IS DISTINCT FROM v_repair.after_state THEN
    RAISE EXCEPTION 'Contract schedules changed after graph repair; rollback was safely aborted';
  END IF;

  UPDATE public.contract_payment_schedules schedule
  SET
    status = previous.status,
    invoice_id = previous.invoice_id,
    installment_number = previous.installment_number,
    amount = previous.amount,
    paid_amount = previous.paid_amount,
    paid_date = previous.paid_date,
    due_date = previous.due_date,
    updated_at = now()
  FROM jsonb_to_recordset(v_repair.before_state -> 'schedules') AS previous(
    id uuid,
    status text,
    invoice_id uuid,
    installment_number integer,
    amount numeric,
    paid_amount numeric,
    paid_date date,
    due_date date
  )
  WHERE schedule.id = previous.id AND schedule.company_id = v_repair.company_id;

  IF public.system_agent_contract_schedule_state(v_contract_id) IS DISTINCT FROM v_repair.before_state THEN
    RAISE EXCEPTION 'Contract schedule graph rollback failed verification';
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
COMMENT ON FUNCTION public.system_agent_apply_contract_schedule_graph_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) IS
'Canonical contract-level schedule graph repair with deterministic one-to-one invoice mapping and full-state rollback.';
