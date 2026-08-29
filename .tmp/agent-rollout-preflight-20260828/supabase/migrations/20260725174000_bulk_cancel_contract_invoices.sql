-- Cancel several incorrect contract invoices in one atomic operation.
-- Financial records are preserved: posted journals are reversed by the
-- canonical cancellation function and paid invoices remain protected.

CREATE OR REPLACE FUNCTION public.cancel_contract_invoices_bulk_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_invoice_ids uuid[],
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(
    NULLIF(auth.role()::text, ''),
    current_setting('request.jwt.claim.role', true),
    ''
  );
  v_allowed boolean := false;
  v_invoice_ids uuid[];
  v_invoice record;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_invalid_invoice_number text;
BEGIN
  IF p_company_id IS NULL OR p_contract_id IS NULL
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Company, contract, invoice ids, and cancellation reason are required'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT array_agg(DISTINCT selected.invoice_id)
  INTO v_invoice_ids
  FROM unnest(COALESCE(p_invoice_ids, ARRAY[]::uuid[])) AS selected(invoice_id)
  WHERE selected.invoice_id IS NOT NULL;

  IF COALESCE(cardinality(v_invoice_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one invoice to cancel'
      USING ERRCODE = 'P0001';
  END IF;

  IF cardinality(v_invoice_ids) > 100 THEN
    RAISE EXCEPTION 'A maximum of 100 invoices can be cancelled at once'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'You must be signed in before cancelling invoices'
        USING ERRCODE = '42501';
    END IF;

    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.invoice.cancel'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );

    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to cancel invoices for this company'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.id = p_contract_id
      AND contract.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Contract not found in company'
      USING ERRCODE = 'P0001';
  END IF;

  IF (
    SELECT count(*)
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id = p_contract_id
      AND invoice.id = ANY(v_invoice_ids)
  ) <> cardinality(v_invoice_ids) THEN
    RAISE EXCEPTION 'One or more selected invoices do not belong to this contract'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT invoice.invoice_number
  INTO v_invalid_invoice_number
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.contract_id = p_contract_id
    AND invoice.id = ANY(v_invoice_ids)
    AND (
      lower(COALESCE(invoice.status, '')) IN ('paid', 'completed')
      OR lower(COALESCE(invoice.payment_status, '')) IN ('paid', 'completed', 'partial', 'partially_paid')
      OR COALESCE(invoice.paid_amount, 0) > 0
    )
  ORDER BY invoice.due_date NULLS LAST, invoice.invoice_number
  LIMIT 1;

  IF v_invalid_invoice_number IS NOT NULL THEN
    RAISE EXCEPTION 'Paid or partially paid invoice % cannot be cancelled in bulk',
      v_invalid_invoice_number
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_invoice IN
    SELECT invoice.id, invoice.invoice_number
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id = p_contract_id
      AND invoice.id = ANY(v_invoice_ids)
    ORDER BY invoice.due_date NULLS LAST, invoice.invoice_number
    FOR UPDATE
  LOOP
    v_result := public.cancel_invoice_with_reversal(
      v_invoice.id,
      p_company_id,
      BTRIM(p_reason)
    );
    v_results := v_results || jsonb_build_array(v_result);
  END LOOP;

  RETURN jsonb_build_object(
    'contract_id', p_contract_id,
    'cancelled_count', cardinality(v_invoice_ids),
    'results', v_results
  );
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_contract_invoices_bulk_v1(uuid, uuid, uuid[], text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_contract_invoices_bulk_v1(uuid, uuid, uuid[], text)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.cancel_contract_invoices_bulk_v1(uuid, uuid, uuid[], text) IS
'Atomically cancels selected unpaid contract invoices through the canonical journal-reversal path. Paid and partially paid invoices are rejected.';
