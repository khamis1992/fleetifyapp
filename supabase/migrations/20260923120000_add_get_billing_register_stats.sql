-- Aggregated billing register metrics for the register header cards.
-- Replaces client-side reductions over the full invoices/payments download.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_billing_register_stats(p_company_id uuid)
RETURNS TABLE(invoices_total numeric, invoices_paid numeric, invoices_pending numeric, invoices_count bigint, payments_month_total numeric, payments_month_count bigint, payments_completed_count bigint, payments_pending_count bigint)
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $function$
DECLARE
  v_month text := to_char(current_date, 'YYYY-MM');
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'Company id is required' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH invoice_totals AS (
    SELECT
      coalesce(sum(total_amount), 0) AS total,
      coalesce(sum(paid_amount), 0) AS paid,
      coalesce(sum(greatest(total_amount - coalesce(paid_amount, 0), 0)), 0) AS pending,
      count(*) AS cnt
    FROM public.invoices
    WHERE company_id = p_company_id
      AND status <> 'cancelled'
      AND payment_status <> 'cancelled'
      AND currency = 'QAR'
  ),
  payment_totals AS (
    SELECT
      coalesce(sum(amount) FILTER (WHERE payment_status = 'completed' AND to_char(payment_date, 'YYYY-MM') = v_month), 0) AS month_total,
      count(*) FILTER (WHERE payment_status = 'completed' AND to_char(payment_date, 'YYYY-MM') = v_month) AS month_count,
      count(*) FILTER (WHERE payment_status = 'completed') AS completed_count,
      count(*) FILTER (WHERE payment_status = 'pending') AS pending_count
    FROM public.payments
    WHERE company_id = p_company_id
  )
  SELECT
    it.total,
    it.paid,
    it.pending,
    it.cnt,
    pt.month_total,
    pt.month_count,
    pt.completed_count,
    pt.pending_count
  FROM invoice_totals it, payment_totals pt;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_billing_register_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_billing_register_stats(uuid) TO authenticated, service_role;

COMMIT;