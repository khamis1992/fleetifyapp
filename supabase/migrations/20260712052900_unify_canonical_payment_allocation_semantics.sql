-- A payment with any active ledger allocation must not also contribute through
-- its legacy invoice_id link. Contract-target allocations are first-class
-- contract receipts, and invoice replacement cannot erase other target types.

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

    SELECT allocation.amount
    FROM public.payment_allocations allocation
    JOIN public.payments payment ON payment.id = allocation.payment_id
    WHERE allocation.allocation_type = 'contract'
      AND allocation.target_id = p_contract_id
      AND allocation.is_active = true
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'

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

DO $$
BEGIN
  IF to_regprocedure('public.replace_payment_invoice_allocations_legacy_v2(uuid,uuid,jsonb,text,jsonb,uuid)') IS NULL THEN
    IF to_regprocedure('public.replace_payment_invoice_allocations(uuid,uuid,jsonb,text,jsonb,uuid)') IS NULL THEN
      RAISE EXCEPTION 'Canonical payment allocation replacement function is missing';
    END IF;
    ALTER FUNCTION public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid)
      RENAME TO replace_payment_invoice_allocations_legacy_v2;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_payment_invoice_allocations_legacy_v2(uuid,uuid,jsonb,text,jsonb,uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.replace_payment_invoice_allocations(
  p_payment_id uuid,
  p_company_id uuid,
  p_allocations jsonb,
  p_reason text,
  p_expected_allocations jsonb DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
BEGIN
  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.payment.reconcile', 'finance.treasury.write', 'finance.payments.write'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to replace payment allocations' USING ERRCODE = '42501';
    END IF;
  END IF;

  PERFORM 1
  FROM public.payments payment
  WHERE payment.id = p_payment_id AND payment.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found in company' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payment_allocations allocation
    WHERE allocation.payment_id = p_payment_id
      AND allocation.is_active = true
      AND allocation.allocation_type <> 'invoice'
  ) THEN
    RAISE EXCEPTION 'Payment has active non-invoice allocations; use an approved cross-type reallocation workflow'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN public.replace_payment_invoice_allocations_legacy_v2(
    p_payment_id,
    p_company_id,
    p_allocations,
    p_reason,
    p_expected_allocations,
    p_actor_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid) IS
'Replaces invoice allocations atomically and refuses to erase active contract, obligation, or late-fee allocations.';
