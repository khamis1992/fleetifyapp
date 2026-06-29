-- Schedule monthly contract invoice reconciliation.
-- Runs on the 28th of each month and creates invoices for next month only.

CREATE EXTENSION IF NOT EXISTS pg_cron;

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

GRANT EXECUTE ON FUNCTION public.monthly_contract_invoice_reconciliation(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.monthly_contract_invoice_reconciliation(date) TO service_role;

-- Disable the older monthly job because it calls a function that can reject
-- future months and may double-call invoice generation while counting results.
SELECT cron.unschedule('monthly-invoice-generation')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'monthly-invoice-generation'
);

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
'Creates missing contract invoices for one month, intended for pg_cron on the 28th to generate next month only.';
