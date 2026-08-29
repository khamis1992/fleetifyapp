-- Return an atomic created/existing outcome for scheduled invoice generators.
-- The contract row lock is acquired before checking for an existing invoice,
-- so concurrent workers cannot both report creation or notify the customer.

BEGIN;
CREATE OR REPLACE FUNCTION public.generate_invoice_for_contract_month_outcome(
  p_contract_id uuid,
  p_invoice_month date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_existing_invoice_id uuid;
  v_invoice_id uuid;
  v_month date;
  v_jwt_role text := COALESCE(auth.jwt() ->> 'role', '');
  v_trusted_direct_session boolean := session_user IN ('postgres', 'supabase_admin');
BEGIN
  IF p_contract_id IS NULL OR p_invoice_month IS NULL THEN
    RAISE EXCEPTION 'Contract and invoice month are required' USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_trusted_direct_session AND v_jwt_role <> 'service_role' THEN
    RAISE EXCEPTION 'Only the service role may request an invoice generation outcome'
      USING ERRCODE = '42501';
  END IF;

  v_month := date_trunc('month', p_invoice_month)::date;

  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id USING ERRCODE = 'P0001';
  END IF;

  SELECT invoice.id
  INTO v_existing_invoice_id
  FROM public.invoices invoice
  WHERE invoice.company_id = v_contract.company_id
    AND invoice.contract_id = v_contract.id
    AND date_trunc(
      'month',
      COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
    )::date = v_month
    AND COALESCE(invoice.total_amount, 0) > 0.01
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
  ORDER BY invoice.created_at, invoice.id
  LIMIT 1
  FOR UPDATE OF invoice;

  v_invoice_id := public.generate_invoice_for_contract_month(
    v_contract.id,
    v_month
  );

  IF v_invoice_id IS NULL THEN
    RAISE EXCEPTION 'Canonical invoice generator returned no invoice for contract % month %',
      v_contract.id,
      v_month
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'invoice_id', v_invoice_id,
    'created', v_existing_invoice_id IS NULL
  );
END;
$$;
REVOKE ALL ON FUNCTION public.generate_invoice_for_contract_month_outcome(uuid, date)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoice_for_contract_month_outcome(uuid, date)
  TO service_role;
COMMENT ON FUNCTION public.generate_invoice_for_contract_month_outcome(uuid, date) IS
  'Service-only atomic wrapper that distinguishes a newly created canonical invoice from an existing one under the contract row lock.';
COMMIT;
