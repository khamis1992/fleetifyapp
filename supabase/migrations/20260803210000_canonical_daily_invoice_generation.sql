-- Route the daily missing-invoice safety net through the canonical generator
-- and remove the dead process-overdue-invoices cron target.
--
-- The legacy batch_generate_missing_invoices() inserted invoices directly with
-- no canonical-month identity, no schedule link, no journal postcondition, a
-- naive invoice_date month duplicate check, and an EXCEPTION handler that
-- swallowed every failure. It created broken invoices that blocked the
-- canonical generator while staying invisible to collection views.
--
-- The replacement only delegates to generate_invoice_for_contract_month,
-- which owns locking, authorization, canonical-month identity, invoice items,
-- schedule linkage, journal postconditions, and system-agent finding
-- resolution. Per-contract failures are visible in pg_cron job_run_details
-- notices instead of being silently swallowed.

BEGIN;

CREATE OR REPLACE FUNCTION public.batch_generate_missing_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_contract record;
  v_month date;
  v_first_month date;
  v_last_month date;
  v_current_month date := date_trunc('month', CURRENT_DATE)::date;
  v_created integer := 0;
  v_existing integer := 0;
  v_failed integer := 0;
  v_invoice_id uuid;
BEGIN
  FOR v_contract IN
    SELECT contract.id, contract.company_id, contract.start_date, contract.end_date
    FROM public.contracts contract
    JOIN public.companies company ON company.id = contract.company_id
    WHERE contract.status IN ('active', 'under_legal_procedure')
      AND COALESCE(contract.monthly_amount, 0) > 0
      AND contract.start_date IS NOT NULL
      AND contract.end_date IS NOT NULL
      AND contract.end_date >= contract.start_date
      AND (company.subscription_status = 'active' OR company.subscription_status IS NULL)
      AND (company.subscription_expires_at IS NULL OR company.subscription_expires_at > CURRENT_DATE)
    ORDER BY contract.company_id, contract.id
  LOOP
    -- Only months already due are a daily safety net. Future months are
    -- created ahead of time by the 28th-of-month scheduled run, so this job
    -- never pre-bills tenants far in advance.
    v_first_month := date_trunc('month', v_contract.start_date)::date;
    v_last_month := LEAST(date_trunc('month', v_contract.end_date)::date, v_current_month);

    v_month := v_first_month;
    WHILE v_month <= v_last_month LOOP
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM public.invoices invoice
          WHERE invoice.company_id = v_contract.company_id
            AND invoice.contract_id = v_contract.id
            AND COALESCE(invoice.total_amount, 0) > 0.01
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
        ) THEN
          v_existing := v_existing + 1;
        ELSE
          -- The canonical command owns duplicate detection, numbering, items,
          -- schedule linkage, journal postconditions, and finding resolution.
          -- It raises a descriptive error for months that need human review
          -- (zero placeholders, closed periods, ambiguous graphs); those are
          -- counted here and surfaced through system-agent findings.
          v_invoice_id := public.generate_invoice_for_contract_month(
            v_contract.id,
            v_month
          );
          IF v_invoice_id IS NULL THEN
            v_existing := v_existing + 1;
          ELSE
            v_created := v_created + 1;
          END IF;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_failed := v_failed + 1;
        RAISE NOTICE 'canonical daily invoice generation skipped contract % month %: %',
          v_contract.id, v_month, SQLERRM;
      END;
      v_month := (v_month + INTERVAL '1 month')::date;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'canonical daily invoice generation: created=%, already_present=%, needs_review=%',
    v_created, v_existing, v_failed;
END;
$function$;

REVOKE ALL ON FUNCTION public.batch_generate_missing_invoices()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.batch_generate_missing_invoices()
  TO service_role;

COMMENT ON FUNCTION public.batch_generate_missing_invoices() IS
  'Daily safety net that routes every due contract month through the canonical invoice generator; never writes invoice rows directly.';

-- The process-overdue-invoices edge function no longer exists; invoice overdue
-- state is maintained by recalculate_invoice_financial_state. A dead cron
-- target only produced a failing HTTP call every morning.
SELECT cron.unschedule('process-overdue-invoices')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-overdue-invoices');

COMMIT;
