-- Make the scheduled reconciliation distinguish a collectible invoice from a
-- zero placeholder, persist unsafe cases as system-agent review findings, and
-- expose a truthful cron summary instead of COUNT(*) over error rows.

BEGIN;

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
  v_had_positive_invoice boolean;
  v_had_zero_placeholder boolean;
  v_month date := date_trunc('month', p_target_month)::date;
  v_run_id uuid;
  v_job_id uuid;
  v_processed_count integer := 0;
  v_review_count integer := 0;
  v_error_state text;
  v_error_detail text;
BEGIN
  INSERT INTO public.system_agent_runs (
    requested_company_id,
    requested_domains,
    mode,
    status,
    trigger_source,
    settings,
    initiated_by,
    started_at
  ) VALUES (
    NULL,
    ARRAY['contracts'],
    'apply',
    'running',
    'monthly_contract_invoice_reconciliation',
    jsonb_build_object('target_month', v_month),
    auth.uid(),
    now()
  )
  RETURNING id INTO v_run_id;

  FOR v_contract IN
    SELECT
      contract.id,
      contract.company_id,
      contract.contract_number,
      contract.customer_id,
      contract.assigned_to_profile_id,
      contract.start_date,
      contract.end_date,
      contract.monthly_amount,
      contract.contract_amount,
      contract.status
    FROM public.contracts contract
    JOIN public.companies company ON company.id = contract.company_id
    WHERE contract.status IN ('active', 'under_legal_procedure')
      AND contract.start_date IS NOT NULL
      AND contract.end_date IS NOT NULL
      AND contract.end_date >= contract.start_date
      AND contract.start_date <= (v_month + INTERVAL '1 month - 1 day')::date
      AND contract.end_date >= v_month
      AND (
        date_trunc('month', contract.start_date + INTERVAL '1 month')::date <= v_month
        OR (
          date_trunc('month', contract.start_date)::date = date_trunc('month', contract.end_date)::date
          AND date_trunc('month', contract.start_date)::date = v_month
        )
        OR EXISTS (
          SELECT 1
          FROM public.contract_payment_schedules schedule
          WHERE schedule.company_id = contract.company_id
            AND schedule.contract_id = contract.id
            AND date_trunc('month', schedule.due_date)::date = date_trunc('month', contract.start_date)::date
            AND COALESCE(schedule.amount, 0) > 0.01
            AND lower(COALESCE(schedule.status, '')) NOT IN (
              'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.invoices start_invoice
          WHERE start_invoice.company_id = contract.company_id
            AND start_invoice.contract_id = contract.id
            AND date_trunc(
              'month',
              COALESCE(start_invoice.invoice_month, start_invoice.invoice_date)::timestamp without time zone
            )::date = date_trunc('month', contract.start_date)::date
            AND COALESCE(start_invoice.total_amount, 0) > 0.01
            AND lower(COALESCE(start_invoice.status, '')) NOT IN (
              'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
            )
            AND lower(COALESCE(start_invoice.payment_status, '')) NOT IN (
              'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
            )
        )
      )
      AND (company.subscription_status = 'active' OR company.subscription_status IS NULL)
      AND (company.subscription_expires_at IS NULL OR company.subscription_expires_at > CURRENT_DATE)
    ORDER BY contract.company_id, contract.contract_number, contract.id
  LOOP
    v_processed_count := v_processed_count + 1;
    company_id := v_contract.company_id;
    contract_id := v_contract.id;
    contract_number := v_contract.contract_number;
    invoice_month := v_month;
    invoice_id := NULL;
    message := NULL;

    INSERT INTO public.system_agent_jobs (
      run_id,
      company_id,
      domain,
      mode,
      status,
      batch_size,
      settings,
      started_at
    ) VALUES (
      v_run_id,
      v_contract.company_id,
      'contracts',
      'apply',
      'running',
      500,
      jsonb_build_object('target_month', v_month),
      now()
    )
    ON CONFLICT (run_id, company_id, domain) DO UPDATE
    SET updated_at = now()
    RETURNING id INTO v_job_id;

    -- Only a positive active invoice satisfies this billing month. A zero row
    -- must reach the canonical wrapper so it can be classified and reissued.
    SELECT candidate.id
    INTO invoice_id
    FROM public.invoices candidate
    WHERE candidate.company_id = v_contract.company_id
      AND candidate.contract_id = v_contract.id
      AND date_trunc(
        'month',
        COALESCE(candidate.invoice_month, candidate.invoice_date)::timestamp without time zone
      )::date = v_month
      AND COALESCE(candidate.total_amount, 0) > 0.01
      AND lower(COALESCE(candidate.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(candidate.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    ORDER BY candidate.created_at, candidate.id
    LIMIT 1;
    v_had_positive_invoice := invoice_id IS NOT NULL;

    v_had_zero_placeholder := EXISTS (
      SELECT 1
      FROM public.invoices candidate
      WHERE candidate.company_id = v_contract.company_id
        AND candidate.contract_id = v_contract.id
        AND date_trunc(
          'month',
          COALESCE(candidate.invoice_month, candidate.invoice_date)::timestamp without time zone
        )::date = v_month
        AND abs(COALESCE(candidate.total_amount, 0)) <= 0.01
        AND lower(COALESCE(candidate.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
        AND lower(COALESCE(candidate.payment_status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
    );

    BEGIN
      v_invoice_id := public.generate_invoice_for_contract_month(v_contract.id, v_month);

      IF v_invoice_id IS NULL THEN
        RAISE EXCEPTION 'generator_returned_no_positive_invoice:%:%', v_contract.id, v_month
          USING ERRCODE = 'P0001';
      END IF;

      invoice_id := v_invoice_id;
      IF v_had_positive_invoice THEN
        action := 'existing';
        message := 'positive_invoice_and_journal_validated';
      ELSIF v_had_zero_placeholder THEN
        action := 'reissued';
        message := 'zero_placeholder_retired_and_positive_invoice_created';
      ELSE
        action := 'created';
        message := 'positive_invoice_created';
      END IF;

      RETURN NEXT;
    EXCEPTION
      WHEN SQLSTATE '42501' THEN
        RAISE;
      WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
          v_error_state = RETURNED_SQLSTATE,
          v_error_detail = PG_EXCEPTION_DETAIL;

        IF SQLERRM LIKE 'invoice_month_outside_expected_contract_graph:%' THEN
          action := 'skipped';
          message := 'contract_installment_graph_complete';
          invoice_id := NULL;
          UPDATE public.system_agent_findings finding
          SET status = 'ignored',
              error = NULL,
              details = 'The requested month is outside the contract installment graph; no invoice is expected.',
              updated_at = now()
          WHERE finding.company_id = v_contract.company_id
            AND finding.code = 'invoice.month_reconciliation_needs_review'
            AND finding.entity_type = 'contract'
            AND finding.entity_id = v_contract.id::text
            AND finding.evidence ->> 'target_month' = v_month::text
            AND finding.status IN ('detected', 'planned', 'repairing', 'review', 'failed');
          RETURN NEXT;
          CONTINUE;
        END IF;

        v_review_count := v_review_count + 1;
        action := 'needs_review';
        message := SQLERRM;
        invoice_id := NULL;

        -- Keep exactly one open review task for this contract/month while
        -- preserving every run as immutable audit history. The dashboard can
        -- therefore link the current issue to the current run/job.
        UPDATE public.system_agent_findings finding
        SET status = 'ignored',
            error = NULL,
            details = 'Superseded by a newer monthly reconciliation review finding.',
            evidence = COALESCE(finding.evidence, '{}'::jsonb)
              || jsonb_build_object('superseded_by_run_id', v_run_id),
            updated_at = now()
        WHERE finding.company_id = v_contract.company_id
          AND finding.run_id <> v_run_id
          AND finding.code = 'invoice.month_reconciliation_needs_review'
          AND finding.entity_type = 'contract'
          AND finding.entity_id = v_contract.id::text
          AND finding.evidence ->> 'target_month' = v_month::text
          AND finding.status IN ('detected', 'planned', 'repairing', 'review', 'failed');

        INSERT INTO public.system_agent_findings (
          run_id,
          job_id,
          company_id,
          domain,
          dedupe_key,
          code,
          severity,
          entity_type,
          entity_id,
          title,
          details,
          evidence,
          confidence,
          status,
          error
        ) VALUES (
          v_run_id,
          v_job_id,
          v_contract.company_id,
          'contracts',
          'invoice-month:' || v_contract.id::text || ':' || to_char(v_month, 'YYYY-MM'),
          'invoice.month_reconciliation_needs_review',
          'critical',
          'contract',
          v_contract.id::text,
          'Contract invoice month requires financial review',
          SQLERRM,
          jsonb_build_object(
            'target_month', v_month,
            'contract_number', v_contract.contract_number,
            'sqlstate', v_error_state,
            'detail', v_error_detail,
            'had_zero_placeholder', v_had_zero_placeholder
          ),
          1,
          'review',
          SQLERRM
        );

        UPDATE public.system_agent_jobs job
        SET status = 'failed',
            last_error = SQLERRM,
            updated_at = now()
        WHERE job.id = v_job_id;

        RETURN NEXT;
    END;
  END LOOP;

  UPDATE public.system_agent_jobs job
  SET status = CASE WHEN job.status = 'failed' THEN 'failed' ELSE 'completed' END,
      processed_batches = 1,
      finished_at = now(),
      stats = jsonb_build_object(
        'target_month', v_month,
        'needs_review', (
          SELECT count(*)
          FROM public.system_agent_findings finding
          WHERE finding.run_id = v_run_id
            AND finding.job_id = job.id
            AND finding.code = 'invoice.month_reconciliation_needs_review'
            AND finding.status = 'review'
        )
      ),
      updated_at = now()
  WHERE job.run_id = v_run_id;

  UPDATE public.system_agent_runs run
  SET status = CASE WHEN v_review_count > 0 THEN 'partial' ELSE 'completed' END,
      summary = jsonb_build_object(
        'target_month', v_month,
        'contracts_processed', v_processed_count,
        'needs_review', v_review_count
      ),
      error = CASE
        WHEN v_review_count > 0 THEN v_review_count || ' contract invoice months require review'
        ELSE NULL
      END,
      finished_at = now(),
      updated_at = now()
  WHERE run.id = v_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_monthly_contract_invoice_reconciliation(
  p_target_month date DEFAULT date_trunc('month', CURRENT_DATE + INTERVAL '1 month')::date
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  WITH results AS MATERIALIZED (
    SELECT *
    FROM public.monthly_contract_invoice_reconciliation(p_target_month)
  )
  SELECT jsonb_build_object(
    'target_month', date_trunc('month', p_target_month)::date,
    'status', CASE
      WHEN count(*) FILTER (WHERE action = 'needs_review') > 0 THEN 'needs_review'
      ELSE 'completed'
    END,
    'processed', count(*),
    'created', count(*) FILTER (WHERE action = 'created'),
    'reissued', count(*) FILTER (WHERE action = 'reissued'),
    'existing', count(*) FILTER (WHERE action = 'existing'),
    'skipped', count(*) FILTER (WHERE action = 'skipped'),
    'needs_review', count(*) FILTER (WHERE action = 'needs_review')
  )
  FROM results;
$$;

REVOKE ALL ON FUNCTION public.monthly_contract_invoice_reconciliation(date)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.monthly_contract_invoice_reconciliation(date)
  TO service_role;

REVOKE ALL ON FUNCTION public.run_monthly_contract_invoice_reconciliation(date)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.run_monthly_contract_invoice_reconciliation(date)
  TO service_role;

SELECT cron.unschedule('monthly-contract-invoice-reconciliation')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'monthly-contract-invoice-reconciliation'
);

SELECT cron.schedule(
  'monthly-contract-invoice-reconciliation',
  '0 6 28 * *',
  $$SELECT public.run_monthly_contract_invoice_reconciliation(date_trunc('month', CURRENT_DATE + INTERVAL '1 month')::date);$$
);

COMMENT ON FUNCTION public.monthly_contract_invoice_reconciliation(date) IS
  'Reconciles one canonical contract invoice month, reissues safe zero placeholders, and persists unsafe cases as system-agent review findings.';
COMMENT ON FUNCTION public.run_monthly_contract_invoice_reconciliation(date) IS
  'Cron entry point returning created/reissued/existing/skipped/needs-review counts instead of a misleading total row count.';

COMMIT;
