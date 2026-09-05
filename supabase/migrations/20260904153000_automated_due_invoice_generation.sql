-- ============================================================================
-- AUTOMATED DUE-INVOICE GENERATION FOR BILLABLE CONTRACTS
-- ============================================================================
-- Completes the integration: the reconciliation authority (previous
-- migration) repairs links and settlement state, but 19 billable contracts
-- still had due installments whose invoices were never created (up to 37
-- months of missing invoices on a single contract). The authenticated RPC
-- generate_contract_billing_graph_v2 requires a user session, so nothing
-- generated them automatically.
--
-- This migration adds the service-role twin:
--   public.generate_due_contract_invoices_v1(options)
--     * scans billable contracts (active / under_legal_procedure),
--     * for every ACTIVE schedule row with due_date <= today and no invoice,
--       creates the monthly invoice through the SAME audited core used by the
--       interactive path (system_generate_invoice_for_contract_month_core),
--     * links the schedule to the new invoice,
--     * verifies the balanced posted journal (same postcondition as v2),
--     * skips anything ambiguous (duplicate months, closed accounting
--       periods, non-positive amounts) and reports them instead of guessing.
--
-- The nightly cron sweep then calls reconciliation + generation, so the
-- billing graph becomes fully self-healing.

CREATE OR REPLACE FUNCTION public.generate_due_contract_invoices_v1(
  p_options jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_dry_run boolean := COALESCE((p_options ->> 'dry_run')::boolean, false);
  v_contract_id uuid;
  v_schedule record;
  v_invoice_id uuid;
  v_created integer := 0;
  v_linked integer := 0;
  v_skipped jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_processed_contracts integer := 0;
BEGIN
  FOR v_contract_id IN
    SELECT DISTINCT contract.id
    FROM public.contracts AS contract
    JOIN public.contract_payment_schedules AS schedule
      ON schedule.contract_id = contract.id
     AND schedule.company_id = contract.company_id
     AND lower(COALESCE(schedule.status, '')) NOT IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
     )
     AND schedule.invoice_id IS NULL
     AND schedule.due_date IS NOT NULL
     AND schedule.due_date <= CURRENT_DATE
     AND round(COALESCE(schedule.amount, 0)::numeric, 2) > 0.01
    WHERE lower(COALESCE(contract.status, '')) IN ('active', 'under_legal_procedure')
    ORDER BY contract.id
  LOOP
    v_processed_contracts := v_processed_contracts + 1;

    FOR v_schedule IN
      SELECT schedule.id, schedule.due_date, schedule.amount, schedule.company_id
      FROM public.contract_payment_schedules AS schedule
      WHERE schedule.contract_id = v_contract_id
        AND lower(COALESCE(schedule.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
        AND schedule.invoice_id IS NULL
        AND schedule.due_date IS NOT NULL
        AND schedule.due_date <= CURRENT_DATE
        AND round(COALESCE(schedule.amount, 0)::numeric, 2) > 0.01
      ORDER BY schedule.due_date
    LOOP
      -- Safety: another active schedule of the same month must not exist
      -- (ambiguous graph — leave it for the reviewed repair flow).
      IF EXISTS (
        SELECT 1
        FROM public.contract_payment_schedules AS other
        WHERE other.contract_id = v_contract_id
          AND other.id <> v_schedule.id
          AND date_trunc('month', other.due_date) = date_trunc('month', v_schedule.due_date)
          AND lower(COALESCE(other.status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
          )
      ) THEN
        v_skipped := v_skipped || jsonb_build_object(
          'contract_id', v_contract_id,
          'schedule_id', v_schedule.id,
          'reason', 'duplicate_month_requires_review'
        );
        CONTINUE;
      END IF;

      -- Safety: closed accounting period.
      IF public.system_agent_date_in_closed_period(
           v_schedule.company_id, v_schedule.due_date
         )
      THEN
        v_skipped := v_skipped || jsonb_build_object(
          'contract_id', v_contract_id,
          'schedule_id', v_schedule.id,
          'reason', 'closed_accounting_period'
        );
        CONTINUE;
      END IF;

      IF v_dry_run THEN
        v_created := v_created + 1;
        CONTINUE;
      END IF;

      BEGIN
        v_invoice_id := public.system_generate_invoice_for_contract_month_core(
          v_contract_id,
          date_trunc('month', v_schedule.due_date)::date
        );

        IF v_invoice_id IS NULL THEN
          v_skipped := v_skipped || jsonb_build_object(
            'contract_id', v_contract_id,
            'schedule_id', v_schedule.id,
            'reason', 'core_returned_no_invoice'
          );
        ELSE
          -- Same identity/amount postcondition as the interactive v2 path.
          IF NOT EXISTS (
            SELECT 1
            FROM public.invoices AS invoice
            WHERE invoice.id = v_invoice_id
              AND invoice.contract_id = v_contract_id
              AND invoice.penalty_id IS NULL
              AND upper(btrim(COALESCE(invoice.invoice_number, ''))) NOT LIKE 'TV-%'
              AND date_trunc(
                    'month',
                    COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
                  )::date = date_trunc('month', v_schedule.due_date)::date
              AND abs(invoice.total_amount - v_schedule.amount) <= 0.01
              AND lower(COALESCE(invoice.status, '')) NOT IN (
                'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
              )
          ) THEN
            RAISE EXCEPTION 'generated invoice identity or amount mismatch';
          END IF;

          IF NOT public.system_invoice_has_single_balanced_posted_journal(
               v_schedule.company_id, v_invoice_id, v_schedule.amount
             )
          THEN
            RAISE EXCEPTION 'generated invoice lacks a balanced posted journal';
          END IF;

          UPDATE public.contract_payment_schedules AS schedule
          SET invoice_id = v_invoice_id,
              updated_at = now()
          WHERE schedule.id = v_schedule.id
            AND schedule.invoice_id IS NULL;

          IF FOUND THEN
            v_linked := v_linked + 1;
          END IF;

          v_created := v_created + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_errors := v_errors || jsonb_build_object(
          'contract_id', v_contract_id,
          'schedule_id', v_schedule.id,
          'error', SQLERRM
        );
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'contracts_processed', v_processed_contracts,
    'invoices_created', v_created,
    'schedules_linked', v_linked,
    'skipped', v_skipped,
    'errors', v_errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_due_contract_invoices_v1(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_due_contract_invoices_v1(jsonb)
  TO service_role;

-- ===== Nightly sweep: reconcile first (links must be correct before
-- generation decides what is missing), then generate, then reconcile again
-- so the fresh invoices' settlement state is synced immediately. =====
CREATE OR REPLACE FUNCTION public.contract_financial_self_healing_sweep()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reconcile_before jsonb;
  v_generation jsonb;
  v_reconcile_after jsonb;
BEGIN
  v_reconcile_before := public.reconcile_all_contract_schedules();
  v_generation := public.generate_due_contract_invoices_v1(
    jsonb_build_object('dry_run', false)
  );
  v_reconcile_after := public.reconcile_all_contract_schedules();

  RETURN jsonb_build_object(
    'reconcile_before', v_reconcile_before,
    'generation', v_generation,
    'reconcile_after', v_reconcile_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.contract_financial_self_healing_sweep()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contract_financial_self_healing_sweep()
  TO service_role;

SELECT cron.unschedule('reconcile-contract-schedules-nightly');
SELECT cron.schedule(
  'contract-financial-self-healing-nightly',
  '15 1 * * *',  -- 01:15 UTC daily (04:15 Doha)
  $$SELECT public.contract_financial_self_healing_sweep()$$
);