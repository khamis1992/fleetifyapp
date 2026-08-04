BEGIN;

DROP FUNCTION IF EXISTS public.run_monthly_contract_invoice_reconciliation(date);

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
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
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

REVOKE EXECUTE ON FUNCTION public.monthly_contract_invoice_reconciliation(date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monthly_contract_invoice_reconciliation(date)
  TO service_role;

SELECT cron.unschedule('monthly-contract-invoice-reconciliation')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'monthly-contract-invoice-reconciliation'
);

SELECT cron.schedule(
  'monthly-contract-invoice-reconciliation',
  '0 6 28 * *',
  $$SELECT COUNT(*) FROM public.monthly_contract_invoice_reconciliation(date_trunc('month', CURRENT_DATE + INTERVAL '1 month')::date);$$
);

COMMENT ON FUNCTION public.monthly_contract_invoice_reconciliation(date) IS
  'Creates missing contract invoices for one canonical issue month using invoice_month/invoice_date only; intended for pg_cron on the 28th to generate next month.';

COMMIT;
