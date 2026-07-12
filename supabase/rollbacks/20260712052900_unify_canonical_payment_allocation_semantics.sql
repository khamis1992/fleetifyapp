DROP FUNCTION IF EXISTS public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid);

DO $$
BEGIN
  IF to_regprocedure('public.replace_payment_invoice_allocations_legacy_v2(uuid,uuid,jsonb,text,jsonb,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Preserved allocation replacement function is missing';
  END IF;
  ALTER FUNCTION public.replace_payment_invoice_allocations_legacy_v2(uuid, uuid, jsonb, text, jsonb, uuid)
    RENAME TO replace_payment_invoice_allocations;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.canonical_invoice_paid_amount(
  p_invoice_id uuid,
  p_exclude_payment_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(source.amount), 0)::numeric
  FROM (
    SELECT allocation.amount
    FROM public.payment_allocations allocation
    JOIN public.payments payment ON payment.id = allocation.payment_id
    WHERE allocation.allocation_type = 'invoice'
      AND allocation.target_id = p_invoice_id
      AND allocation.is_active = true
      AND payment.id IS DISTINCT FROM p_exclude_payment_id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'

    UNION ALL

    SELECT payment.amount
    FROM public.payments payment
    WHERE payment.invoice_id = p_invoice_id
      AND payment.id IS DISTINCT FROM p_exclude_payment_id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      AND NOT EXISTS (
        SELECT 1
        FROM public.payment_allocations allocation
        WHERE allocation.payment_id = payment.id
          AND allocation.allocation_type = 'invoice'
          AND allocation.is_active = true
      )
  ) source;
$$;

REVOKE ALL ON FUNCTION public.canonical_invoice_paid_amount(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.canonical_invoice_paid_amount(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.canonical_contract_paid_amount(p_contract_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(source.amount), 0)::numeric
  FROM (
    SELECT allocation.amount
    FROM public.payment_allocations allocation
    JOIN public.payments payment ON payment.id = allocation.payment_id
    JOIN public.invoices invoice
      ON allocation.allocation_type = 'invoice'
     AND invoice.id = allocation.target_id
    WHERE invoice.contract_id = p_contract_id
      AND allocation.is_active = true
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')

    UNION ALL

    SELECT payment.amount
    FROM public.payments payment
    JOIN public.invoices invoice ON invoice.id = payment.invoice_id
    WHERE invoice.contract_id = p_contract_id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND NOT EXISTS (
        SELECT 1
        FROM public.payment_allocations allocation
        WHERE allocation.payment_id = payment.id
          AND allocation.is_active = true
      )

    UNION ALL

    SELECT payment.amount
    FROM public.payments payment
    WHERE payment.contract_id = p_contract_id
      AND payment.invoice_id IS NULL
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      AND NOT EXISTS (
        SELECT 1
        FROM public.payment_allocations allocation
        WHERE allocation.payment_id = payment.id
          AND allocation.is_active = true
      )
  ) source;
$$;

REVOKE ALL ON FUNCTION public.canonical_contract_paid_amount(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.canonical_contract_paid_amount(uuid)
  TO service_role;
