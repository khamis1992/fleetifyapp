-- Autonomous signed-contract reconciliation.
-- The document scanner now receives billing-graph failures, and a separate
-- service-only gateway may rebuild a payment-free graph after evidence checks.

BEGIN;

CREATE OR REPLACE FUNCTION public.contract_terms_scan_batch_candidates_v3(
  p_company_id uuid,
  p_limit integer DEFAULT 4,
  p_contract_id uuid DEFAULT NULL
)
RETURNS TABLE (
  contract_id uuid,
  company_id uuid,
  document_id uuid,
  contract_number text,
  contract_amount numeric,
  expected_amount numeric,
  trigger_reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH candidate AS (
    SELECT
      contract.id AS contract_id,
      contract.company_id,
      document.id AS document_id,
      contract.contract_number,
      contract.contract_amount,
      COALESCE(NULLIF(graph.schedule_total, 0), date_graph.expected_amount) AS expected_amount,
      CASE
        WHEN graph.missing_invoice_count > 0 THEN 'active_schedule_missing_invoice'
        WHEN graph.active_schedule_count > 0 AND graph.active_invoice_count = 0
          THEN 'schedule_graph_without_invoices'
        WHEN failed_repair.has_failed_repair THEN 'audit_repair_requires_document_decision'
        ELSE 'contract_amount_graph_mismatch'
      END AS trigger_reason,
      CASE
        WHEN graph.missing_invoice_count > 0 THEN 1
        WHEN graph.active_schedule_count > 0 AND graph.active_invoice_count = 0 THEN 2
        WHEN failed_repair.has_failed_repair THEN 3
        ELSE 4
      END AS priority_rank,
      contract.updated_at
    FROM public.contracts contract
    JOIN LATERAL (
      SELECT doc.id
      FROM public.contract_documents doc
      WHERE doc.contract_id = contract.id
        AND doc.company_id = contract.company_id
        AND doc.document_type IN ('signed_contract', 'signed_contract_image')
        AND doc.file_path IS NOT NULL
      ORDER BY doc.created_at DESC, doc.id
      LIMIT 1
    ) document ON true
    CROSS JOIN LATERAL (
      SELECT round(
        contract.monthly_amount * GREATEST(1, (
          (EXTRACT(YEAR FROM date_trunc('month', contract.end_date))
            - EXTRACT(YEAR FROM date_trunc('month', contract.start_date))) * 12
          + EXTRACT(MONTH FROM date_trunc('month', contract.end_date))
          - EXTRACT(MONTH FROM date_trunc('month', contract.start_date))
          + 1
        )::integer),
        2
      ) AS expected_amount
    ) date_graph
    CROSS JOIN LATERAL (
      SELECT
        count(*) FILTER (
          WHERE lower(COALESCE(schedule.status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
          )
        )::integer AS active_schedule_count,
        COALESCE(sum(schedule.amount) FILTER (
          WHERE lower(COALESCE(schedule.status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
          )
        ), 0)::numeric AS schedule_total,
        count(*) FILTER (
          WHERE lower(COALESCE(schedule.status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
          )
            AND schedule.invoice_id IS NULL
        )::integer AS missing_invoice_count,
        (
          SELECT count(*)::integer
          FROM public.invoices invoice
          WHERE invoice.company_id = contract.company_id
            AND invoice.contract_id = contract.id
            AND COALESCE(invoice.total_amount, 0) > 0.01
            AND lower(COALESCE(invoice.status, '')) NOT IN (
              'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
            )
            AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
              'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
            )
        ) AS active_invoice_count
      FROM public.contract_payment_schedules schedule
      WHERE schedule.company_id = contract.company_id
        AND schedule.contract_id = contract.id
    ) graph
    CROSS JOIN LATERAL (
      SELECT EXISTS (
        SELECT 1
        FROM public.system_agent_findings finding
        WHERE finding.company_id = contract.company_id
          AND finding.code = 'schedule.missing_invoice'
          AND finding.status = 'failed'
          AND finding.evidence ->> 'contractId' = contract.id::text
      ) AS has_failed_repair
    ) failed_repair
    WHERE contract.company_id = p_company_id
      AND (p_contract_id IS NULL OR contract.id = p_contract_id)
      AND contract.status IN ('active', 'under_legal_procedure')
      AND COALESCE(contract.monthly_amount, 0) > 0
      AND contract.start_date IS NOT NULL
      AND contract.end_date IS NOT NULL
      AND contract.end_date >= contract.start_date
      AND (
        graph.missing_invoice_count > 0
        OR (graph.active_schedule_count > 0 AND graph.active_invoice_count = 0)
        OR failed_repair.has_failed_repair
        OR abs(contract.contract_amount - COALESCE(NULLIF(graph.schedule_total, 0), date_graph.expected_amount)) > 1
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.contract_terms_scan_proposals proposal
        WHERE proposal.contract_id = contract.id
          AND proposal.status = 'applied'
          AND proposal.updated_at > now() - interval '1 day'
      )
  )
  SELECT
    candidate.contract_id,
    candidate.company_id,
    candidate.document_id,
    candidate.contract_number,
    candidate.contract_amount,
    candidate.expected_amount,
    candidate.trigger_reason
  FROM candidate
  ORDER BY candidate.priority_rank, candidate.updated_at, candidate.contract_id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 4), 1), 25);
$function$;

REVOKE ALL ON FUNCTION public.contract_terms_scan_batch_candidates_v3(uuid,integer,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contract_terms_scan_batch_candidates_v3(uuid,integer,uuid)
TO service_role;

CREATE OR REPLACE FUNCTION public.apply_autonomous_contract_reconciliation_v1(
  p_proposal_id uuid,
  p_scenario jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_proposal public.contract_terms_scan_proposals%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_terms jsonb;
  v_monthly numeric;
  v_total numeric;
  v_start date;
  v_end date;
  v_duration integer;
  v_first_month date;
  v_last_month date;
  v_month date;
  v_invoice_id uuid;
  v_invoice public.invoices%ROWTYPE;
  v_schedule_id uuid;
  v_installment integer := 0;
  v_cancelled integer := 0;
  v_created_schedules integer := 0;
  v_generated_invoices integer := 0;
  v_verified integer := 0;
  v_active_count integer := 0;
  v_distinct_months integer := 0;
BEGIN
  IF v_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Autonomous contract reconciliation requires the service role'
      USING ERRCODE = '42501';
  END IF;
  IF p_proposal_id IS NULL OR COALESCE(p_scenario, '{}'::jsonb) = '{}'::jsonb THEN
    RAISE EXCEPTION 'proposal_id and scenario are required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_proposal
  FROM public.contract_terms_scan_proposals proposal
  WHERE proposal.id = p_proposal_id
  FOR UPDATE;
  IF NOT FOUND OR v_proposal.status <> 'pending' THEN
    RAISE EXCEPTION 'A pending signed-contract proposal is required' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(v_proposal.overall_confidence, 0) < 0.90
     OR jsonb_array_length(COALESCE(v_proposal.extracted_terms -> 'evidence', '[]'::jsonb)) = 0
  THEN
    RAISE EXCEPTION 'signed_contract_evidence_below_autonomous_threshold'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_proposal.contract_id
    AND contract.company_id = v_proposal.company_id
    AND contract.status IN ('active', 'under_legal_procedure')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The proposal contract is not reconcilable' USING ERRCODE = 'P0001';
  END IF;

  v_terms := v_proposal.extracted_terms;
  v_monthly := NULLIF(p_scenario ->> 'monthlyAmount', '')::numeric;
  v_total := NULLIF(p_scenario ->> 'totalAmount', '')::numeric;
  v_start := NULLIF(p_scenario ->> 'startDate', '')::date;
  v_end := NULLIF(p_scenario ->> 'endDate', '')::date;
  v_duration := NULLIF(p_scenario ->> 'installmentCount', '')::integer;
  v_first_month := date_trunc(
    'month', NULLIF(p_scenario ->> 'firstBillingMonth', '')::date
  )::date;
  v_last_month := (v_first_month + ((v_duration - 1)::text || ' months')::interval)::date;

  IF COALESCE((p_scenario ->> 'eligible')::boolean, false) IS NOT TRUE
     OR COALESCE(v_monthly, 0) <= 0
     OR COALESCE(v_total, 0) <= 0
     OR COALESCE(v_duration, 0) <= 0
     OR v_start IS NULL OR v_end IS NULL OR v_end < v_start
     OR v_first_month IS NULL
  THEN
    RAISE EXCEPTION 'scenario_is_not_autonomously_eligible' USING ERRCODE = 'P0001';
  END IF;
  IF abs(v_total - round(v_monthly * v_duration, 2)) > GREATEST(1, v_monthly * 0.02)
     OR abs(v_monthly - COALESCE(NULLIF(v_terms ->> 'monthly_amount', '')::numeric, 0)) > 0.01
     OR v_start IS DISTINCT FROM NULLIF(v_terms ->> 'start_date', '')::date
     OR v_end IS DISTINCT FROM NULLIF(v_terms ->> 'end_date', '')::date
     OR v_duration IS DISTINCT FROM NULLIF(v_terms ->> 'duration_months', '')::integer
     OR (
       COALESCE(NULLIF(v_terms ->> 'total_amount', '')::numeric, 0) > 0
       AND abs(v_total - NULLIF(v_terms ->> 'total_amount', '')::numeric) > GREATEST(1, v_monthly * 0.02)
     )
  THEN
    RAISE EXCEPTION 'scenario_does_not_match_signed_document_terms'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_first_month < date_trunc('month', v_start)::date
     OR v_last_month > date_trunc('month', v_end)::date
  THEN
    RAISE EXCEPTION 'scenario_months_outside_signed_contract_period:%:%', v_first_month, v_last_month
      USING ERRCODE = 'P0001';
  END IF;

  -- The first autonomous release is deliberately limited to graphs without
  -- receipt history. Document-driven correction of received money requires a
  -- credit/reallocation workflow and therefore remains assigned review work.
  IF EXISTS (
    SELECT 1 FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id
      AND (COALESCE(schedule.paid_amount, 0) > 0.01 OR schedule.paid_date IS NOT NULL)
  ) OR EXISTS (
    SELECT 1 FROM public.payments payment
    WHERE payment.company_id = v_contract.company_id
      AND payment.contract_id = v_contract.id
      AND lower(COALESCE(payment.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
  ) THEN
    RAISE EXCEPTION 'protected_payment_history_requires_financial_review'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  UPDATE public.contracts contract
  SET monthly_amount = v_monthly,
      contract_amount = v_total,
      start_date = v_start,
      end_date = v_end,
      updated_at = now()
  WHERE contract.id = v_contract.id
    AND contract.company_id = v_contract.company_id;

  -- Remove only payment-free rows that the signed scenario proves extraneous.
  UPDATE public.contract_payment_schedules schedule
  SET status = 'cancelled',
      invoice_id = NULL,
      notes = concat_ws(' | ', NULLIF(schedule.notes, ''),
        'Cancelled by signed-contract reconciliation proposal ' || p_proposal_id::text),
      updated_at = now()
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND date_trunc('month', schedule.due_date)::date NOT BETWEEN v_first_month AND v_last_month;
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  v_month := v_first_month;
  WHILE v_month <= v_last_month LOOP
    v_installment := v_installment + 1;

    SELECT schedule.id INTO v_schedule_id
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id
      AND date_trunc('month', schedule.due_date)::date = v_month
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    ORDER BY schedule.created_at, schedule.id
    LIMIT 1
    FOR UPDATE;

    IF v_schedule_id IS NULL THEN
      INSERT INTO public.contract_payment_schedules (
        company_id, contract_id, installment_number, due_date, amount,
        paid_amount, status, description, notes
      ) VALUES (
        v_contract.company_id, v_contract.id, v_installment, v_month, v_monthly,
        0, CASE WHEN v_month < date_trunc('month', current_date)::date THEN 'overdue' ELSE 'pending' END,
        'Monthly rental installment',
        'Created by signed-contract reconciliation proposal ' || p_proposal_id::text
      )
      RETURNING id INTO v_schedule_id;
      v_created_schedules := v_created_schedules + 1;
    ELSE
      UPDATE public.contract_payment_schedules schedule
      SET installment_number = v_installment,
          due_date = v_month,
          amount = v_monthly,
          updated_at = now()
      WHERE schedule.id = v_schedule_id;
    END IF;

    -- Cancel same-month duplicates only when they carry no receipt history.
    UPDATE public.contract_payment_schedules schedule
    SET status = 'cancelled', invoice_id = NULL, updated_at = now(),
        notes = concat_ws(' | ', NULLIF(schedule.notes, ''),
          'Duplicate cancelled by signed-contract reconciliation proposal ' || p_proposal_id::text)
    WHERE schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id
      AND schedule.id <> v_schedule_id
      AND date_trunc('month', schedule.due_date)::date = v_month
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND COALESCE(schedule.paid_amount, 0) <= 0.01
      AND schedule.paid_date IS NULL;

    v_invoice_id := public.generate_invoice_for_contract_month(v_contract.id, v_month);
    IF v_invoice_id IS NULL THEN
      RAISE EXCEPTION 'invoice_generation_returned_null:%', v_month USING ERRCODE = 'P0001';
    END IF;
    v_generated_invoices := v_generated_invoices + 1;

    SELECT * INTO v_invoice
    FROM public.invoices invoice
    WHERE invoice.id = v_invoice_id
      AND invoice.company_id = v_contract.company_id
      AND invoice.contract_id = v_contract.id;
    IF NOT FOUND
       OR abs(COALESCE(v_invoice.total_amount, 0) - v_monthly) > 0.01
       OR date_trunc(
         'month', COALESCE(v_invoice.invoice_month, v_invoice.invoice_date)::timestamp without time zone
       )::date <> v_month
       OR NOT public.system_invoice_has_single_balanced_posted_journal(
         v_invoice.id, v_invoice.journal_entry_id, v_invoice.total_amount
       )
    THEN
      RAISE EXCEPTION 'generated_invoice_postcondition_failed:%', v_month
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.contract_payment_schedules schedule
    SET invoice_id = v_invoice.id, updated_at = now()
    WHERE schedule.id = v_schedule_id
      AND schedule.company_id = v_contract.company_id
      AND schedule.contract_id = v_contract.id;
    v_verified := v_verified + 1;
    v_schedule_id := NULL;
    v_month := (v_month + interval '1 month')::date;
  END LOOP;

  SELECT count(*)::integer,
         count(DISTINCT date_trunc('month', schedule.due_date))::integer
  INTO v_active_count, v_distinct_months
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_contract.company_id
    AND schedule.contract_id = v_contract.id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  IF v_active_count <> v_duration OR v_distinct_months <> v_duration
     OR EXISTS (
       SELECT 1
       FROM public.contract_payment_schedules schedule
       WHERE schedule.company_id = v_contract.company_id
         AND schedule.contract_id = v_contract.id
         AND lower(COALESCE(schedule.status, '')) NOT IN (
           'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
         )
         AND schedule.invoice_id IS NULL
     )
  THEN
    RAISE EXCEPTION 'contract_reconciliation_final_graph_verification_failed'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.recalculate_contract_financial_state(v_contract.id);

  UPDATE public.contract_terms_scan_proposals proposal
  SET status = 'applied',
      decided_at = now(),
      decision_notes = 'Auto-applied by autonomous signed-contract reconciliation agent',
      proposed_changes = COALESCE(proposal.proposed_changes, '[]'::jsonb)
        || jsonb_build_array(jsonb_build_object(
          'field', 'billing_graph',
          'scenario', p_scenario,
          'verifiedInvoices', v_verified
        )),
      updated_at = now()
  WHERE proposal.id = p_proposal_id;

  RETURN jsonb_build_object(
    'status', 'applied',
    'contractId', v_contract.id,
    'proposalId', p_proposal_id,
    'scenario', p_scenario,
    'cancelledSchedules', v_cancelled,
    'createdSchedules', v_created_schedules,
    'generatedInvoices', v_generated_invoices,
    'verifiedInvoices', v_verified
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_autonomous_contract_reconciliation_v1(uuid,jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_autonomous_contract_reconciliation_v1(uuid,jsonb)
TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_contract_reconciliation_review_task_v1(
  p_proposal_id uuid,
  p_blocker text,
  p_scenario jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_proposal public.contract_terms_scan_proposals%ROWTYPE;
  v_contract_number text;
  v_owner uuid;
  v_task_id uuid;
BEGIN
  IF v_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;

  SELECT proposal.*
  INTO v_proposal
  FROM public.contract_terms_scan_proposals proposal
  WHERE proposal.id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT contract.contract_number
  INTO v_contract_number
  FROM public.contracts contract
  WHERE contract.id = v_proposal.contract_id
    AND contract.company_id = v_proposal.company_id;

  SELECT profile.id INTO v_owner
  FROM public.profiles profile
  JOIN public.user_roles role
    ON role.user_id = profile.user_id
   AND (role.company_id = v_proposal.company_id OR role.role = 'super_admin'::public.user_role)
  WHERE profile.company_id = v_proposal.company_id
    AND profile.is_active = true
    AND role.role IN (
      'company_admin'::public.user_role,
      'manager'::public.user_role,
      'super_admin'::public.user_role
    )
  ORDER BY CASE role.role
    WHEN 'company_admin'::public.user_role THEN 1
    WHEN 'manager'::public.user_role THEN 2
    ELSE 3 END,
    profile.created_at,
    profile.id
  LIMIT 1;

  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NO_ACTIVE_FINANCIAL_REVIEW_OWNER');
  END IF;

  SELECT task.id INTO v_task_id
  FROM public.tasks task
  WHERE task.company_id = v_proposal.company_id
    AND task.category = 'contract_reconciliation_review'
    AND task.metadata @> jsonb_build_object('proposalId', p_proposal_id::text)
    AND task.status IN ('pending', 'in_progress', 'on_hold')
  ORDER BY task.created_at DESC
  LIMIT 1;

  IF v_task_id IS NULL THEN
    INSERT INTO public.tasks (
      company_id, created_by, assigned_to, title, description, status,
      priority, due_date, category, tags, metadata
    ) VALUES (
      v_proposal.company_id,
      v_owner,
      v_owner,
      left('مراجعة تسوية العقد ' || COALESCE(v_contract_number, v_proposal.contract_id::text), 255),
      concat_ws(E'\n',
        'حلّل الوكيل العقد والمستند الموقّع، لكنه لم يجد سيناريو مالياً آمناً للتنفيذ الذاتي.',
        'سبب التوقف: ' || COALESCE(NULLIF(p_blocker, ''), 'غير محدد'),
        '',
        'راجع الأدلة والسيناريو المقترح في بيانات المهمة، ثم اعتمد القرار المالي المناسب.'
      ),
      'pending',
      'high',
      now() + interval '1 day',
      'contract_reconciliation_review',
      ARRAY['contract', 'financial-review', 'agent-decision']::text[],
      jsonb_build_object(
        'source', 'autonomous_contract_reconciliation_agent',
        'proposalId', p_proposal_id::text,
        'contractId', v_proposal.contract_id::text,
        'contractNumber', v_contract_number,
        'blocker', p_blocker,
        'scenario', COALESCE(p_scenario, '{}'::jsonb),
        'evidence', COALESCE(v_proposal.extracted_terms -> 'evidence', '[]'::jsonb),
        'confidence', v_proposal.overall_confidence
      )
    ) RETURNING id INTO v_task_id;
  ELSE
    UPDATE public.tasks task
    SET assigned_to = v_owner,
        description = concat_ws(E'\n',
          'حلّل الوكيل العقد والمستند الموقّع، لكنه لم يجد سيناريو مالياً آمناً للتنفيذ الذاتي.',
          'سبب التوقف: ' || COALESCE(NULLIF(p_blocker, ''), 'غير محدد')
        ),
        metadata = COALESCE(task.metadata, '{}'::jsonb) || jsonb_build_object(
          'blocker', p_blocker,
          'scenario', COALESCE(p_scenario, '{}'::jsonb),
          'evidence', COALESCE(v_proposal.extracted_terms -> 'evidence', '[]'::jsonb),
          'confidence', v_proposal.overall_confidence,
          'refreshedAt', now()
        ),
        updated_at = now()
    WHERE task.id = v_task_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'taskId', v_task_id, 'ownerProfileId', v_owner);
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_contract_reconciliation_review_task_v1(uuid,text,jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_contract_reconciliation_review_task_v1(uuid,text,jsonb)
TO service_role;

COMMENT ON FUNCTION public.contract_terms_scan_batch_candidates_v3(uuid,integer,uuid) IS
  'Selects signed contracts from billing graph failures as well as amount mismatches; supports one target contract for controlled reconciliation.';
COMMENT ON FUNCTION public.apply_autonomous_contract_reconciliation_v1(uuid,jsonb) IS
  'Service-only, evidence-gated reconstruction and verification of a payment-free signed-contract billing graph.';
COMMENT ON FUNCTION public.upsert_contract_reconciliation_review_task_v1(uuid,text,jsonb) IS
  'Assigns one evidence-rich financial review task when autonomous signed-contract reconciliation is unsafe or ambiguous.';

-- Keep the nightly fleet-wide run in proposal/review mode. Autonomous apply is
-- deliberately enabled only for an explicitly targeted contract invocation;
-- widening the financial mutation scope requires a separate approved rollout.
SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname = 'nightly-contract-terms-scan';

SELECT cron.schedule(
  'nightly-contract-terms-scan',
  '10 3 * * *',
  $command$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/contract-terms-scanner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-id', 'contract-terms-scanner',
      'x-agent-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agent_secret_contract_terms_scanner' LIMIT 1)
    ),
    body := jsonb_build_object(
      'mode', 'batch',
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'maxDocuments', 10,
      'autoApply', false
    ),
    timeout_milliseconds := 120000
  );
  $command$
);

COMMIT;
