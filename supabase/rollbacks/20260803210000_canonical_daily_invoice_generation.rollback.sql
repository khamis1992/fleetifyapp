-- Rollback: restore the legacy naive daily generator and the removed cron job.
-- WARNING: the legacy body is restored only for emergency compatibility; it is
-- known to create non-canonical invoices and should not be kept long-term.

BEGIN;

CREATE OR REPLACE FUNCTION public.batch_generate_missing_invoices()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_monthly_amount DECIMAL;
  v_current_date DATE;
  v_invoice_count INTEGER;
  v_expected_count INTEGER;
BEGIN
  FOR v_contract IN
    SELECT id, contract_number, start_date, end_date, monthly_amount, company_id, customer_id
    FROM public.contracts
    WHERE (status = 'active' OR status = 'under_legal_procedure')
      AND monthly_amount > 0
  LOOP
    v_start_date := v_contract.start_date;
    v_end_date := v_contract.end_date;
    v_monthly_amount := v_contract.monthly_amount;

    v_expected_count :=
      EXTRACT(YEAR FROM AGE(v_end_date, v_start_date)) * 12
      + EXTRACT(MONTH FROM AGE(v_end_date, v_start_date)) + 1;

    SELECT COUNT(*) INTO v_invoice_count
    FROM public.invoices
    WHERE contract_id = v_contract.id
      AND status != 'cancelled';

    IF v_invoice_count < v_expected_count THEN
      v_current_date := v_start_date;
      WHILE v_current_date <= v_end_date LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.invoices
          WHERE contract_id = v_contract.id
            AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM v_current_date)
            AND EXTRACT(MONTH FROM invoice_date) = EXTRACT(MONTH FROM v_current_date)
            AND status != 'cancelled'
        ) THEN
          BEGIN
            INSERT INTO public.invoices (
              contract_id, company_id, customer_id,
              invoice_date, due_date,
              subtotal, total_amount, balance_due,
              status, invoice_number, invoice_type, currency
            ) VALUES (
              v_contract.id,
              v_contract.company_id,
              v_contract.customer_id,
              v_current_date,
              v_current_date + INTERVAL '30 days',
              v_monthly_amount,
              v_monthly_amount,
              v_monthly_amount,
              'sent',
              'INV-' || v_contract.contract_number || '-' || to_char(v_current_date, 'YYYY-MM'),
              'sales',
              'QAR'
            );
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped invoice for contract % month %: %',
              v_contract.contract_number, v_current_date, SQLERRM;
          END;
        END IF;
        v_current_date := v_current_date + INTERVAL '1 month';
      END LOOP;
    END IF;
  END LOOP;
END;
$function$;

-- Restore the removed cron schedule exactly as it was.
SELECT cron.schedule(
  'process-overdue-invoices',
  '0 8 * * *',
  $$ SELECT net.http_post(url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-overdue-invoices', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer REPLACE_WITH_SERVICE_ROLE_JWT'), body := '{}'::jsonb); $$
);

COMMIT;
