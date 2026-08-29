-- Align invoice_balance_drift_report exactly with recalculate_invoice_financial_state
-- rules (threshold 0.01, unpaid boundary, overdue-before-draft ordering) so the
-- report only flags invoices the canonical recalculation would actually change.

CREATE OR REPLACE FUNCTION public.invoice_balance_drift_report(
  p_company_id uuid,
  p_contract_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  invoice_id uuid,
  canonical_paid numeric,
  expected_balance numeric,
  expected_payment_status text,
  expected_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH computed AS (
    SELECT
      invoice.id,
      invoice.paid_amount AS stored_paid,
      invoice.balance_due AS stored_balance,
      invoice.payment_status AS stored_payment_status,
      invoice.status AS stored_status,
      public.canonical_invoice_paid_amount(invoice.id) AS paid,
      GREATEST(COALESCE(invoice.total_amount, 0) - public.canonical_invoice_paid_amount(invoice.id), 0) AS balance,
      CASE
        WHEN public.canonical_invoice_paid_amount(invoice.id) <= 0.01 THEN 'unpaid'
        WHEN public.canonical_invoice_paid_amount(invoice.id) >= COALESCE(invoice.total_amount, 0) - 0.01 THEN 'paid'
        ELSE 'partial'
      END AS ps,
      CASE
        WHEN public.canonical_invoice_paid_amount(invoice.id) >= COALESCE(invoice.total_amount, 0) - 0.01 THEN 'paid'
        WHEN invoice.due_date IS NOT NULL AND invoice.due_date < CURRENT_DATE THEN 'overdue'
        WHEN lower(COALESCE(invoice.status, '')) = 'draft' THEN 'draft'
        ELSE 'sent'
      END AS lifecycle
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND (p_contract_ids IS NULL OR invoice.contract_id = ANY(p_contract_ids))
  )
  SELECT
    computed.id,
    round(computed.paid::numeric, 2),
    round(computed.balance::numeric, 2),
    computed.ps,
    computed.lifecycle
  FROM computed
  WHERE abs(COALESCE(computed.stored_paid, 0) - computed.paid) > 0.01
     OR abs(COALESCE(computed.stored_balance, 0) - computed.balance) > 0.01
     OR lower(COALESCE(computed.stored_payment_status, '')) IS DISTINCT FROM computed.ps
     OR lower(COALESCE(computed.stored_status, '')) IS DISTINCT FROM computed.lifecycle;
END;
$function$;

REVOKE ALL ON FUNCTION public.invoice_balance_drift_report(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoice_balance_drift_report(uuid, uuid[]) TO service_role;;
