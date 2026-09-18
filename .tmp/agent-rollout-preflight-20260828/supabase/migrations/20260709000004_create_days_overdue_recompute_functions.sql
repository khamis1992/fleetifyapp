-- Phase 2: days_overdue recalculation functions
-- Computes days_overdue for pending/overdue invoices and active contracts.

CREATE OR REPLACE FUNCTION public.recompute_invoice_days_overdue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.invoices
  SET days_overdue = GREATEST(CURRENT_DATE - due_date, 0)
  WHERE payment_status NOT IN ('paid')
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE;

  UPDATE public.invoices
  SET days_overdue = 0
  WHERE payment_status NOT IN ('paid')
    AND due_date IS NOT NULL
    AND due_date >= CURRENT_DATE;
END;
$$;
CREATE OR REPLACE FUNCTION public.recompute_contract_days_overdue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.contracts
  SET days_overdue = GREATEST(CURRENT_DATE - end_date, 0)
  WHERE status IN ('active', 'expired')
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE
    AND payment_status NOT IN ('paid');

  UPDATE public.contracts
  SET days_overdue = 0
  WHERE status IN ('active', 'expired')
    AND end_date IS NOT NULL
    AND end_date >= CURRENT_DATE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.recompute_invoice_days_overdue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_contract_days_overdue() TO authenticated;
