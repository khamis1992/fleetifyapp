CREATE OR REPLACE FUNCTION public.cancel_mislinked_excel_invoice_v1(
  p_invoice_id uuid,
  p_company_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_actor uuid;
  v_actor_role text := COALESCE(
    NULLIF(auth.role()::text, ''),
    current_setting('request.jwt.claim.role', true),
    ''
  );
  v_payment_ids uuid[] := ARRAY[]::uuid[];
  v_before jsonb;
  v_cancel_result jsonb;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF p_invoice_id IS NULL OR p_company_id IS NULL
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Invoice, company, and correction reason are required'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    RAISE EXCEPTION 'This audited recovery command is restricted to the service role'
      USING ERRCODE = '42501';
  END IF;
  v_actor := p_actor_id;

  SELECT * INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id
    AND invoice.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found in company' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payments payment
    WHERE payment.company_id = p_company_id
      AND payment.invoice_id = p_invoice_id
      AND lower(COALESCE(payment.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'failed', 'void', 'voided', 'reversed', 'refunded'
      )
  ) THEN
    RAISE EXCEPTION 'Invoice still has an active payment; recovery was blocked'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(array_agg(payment.id ORDER BY payment.id), ARRAY[]::uuid[])
  INTO v_payment_ids
  FROM public.payments payment
  WHERE payment.company_id = p_company_id
    AND payment.invoice_id = p_invoice_id;

  v_before := jsonb_build_object(
    'invoice_id', v_invoice.id,
    'invoice_number', v_invoice.invoice_number,
    'status', v_invoice.status,
    'payment_status', v_invoice.payment_status,
    'payment_ids', to_jsonb(v_payment_ids)
  );

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  UPDATE public.payments payment
  SET
    invoice_id = NULL,
    processing_notes = CONCAT_WS(
      E'\n',
      NULLIF(payment.processing_notes, ''),
      'Mislinked Excel invoice detached: ' || BTRIM(p_reason)
    ),
    updated_at = now()
  WHERE payment.company_id = p_company_id
    AND payment.invoice_id = p_invoice_id
    AND lower(COALESCE(payment.payment_status, '')) IN (
      'cancelled', 'canceled', 'failed', 'void', 'voided', 'reversed', 'refunded'
    );
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  v_cancel_result := public.cancel_invoice_with_reversal(
    p_invoice_id,
    p_company_id,
    p_reason
  );

  INSERT INTO public.finance_operation_audit (
    company_id, operation_type, entity_type, entity_id,
    before_state, after_state, reason, actor_id
  ) VALUES (
    p_company_id,
    'excel_import_mislink_corrected',
    'invoice',
    p_invoice_id,
    v_before,
    jsonb_build_object(
      'invoice_id', p_invoice_id,
      'status', 'cancelled',
      'detached_cancelled_payment_ids', to_jsonb(v_payment_ids),
      'cancellation', v_cancel_result
    ),
    BTRIM(p_reason),
    v_actor
  );

  RETURN jsonb_build_object(
    'invoice_id', p_invoice_id,
    'status', 'cancelled',
    'detached_cancelled_payment_ids', to_jsonb(v_payment_ids),
    'cancellation', v_cancel_result
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_mislinked_excel_invoice_v1(uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_mislinked_excel_invoice_v1(uuid, uuid, text, uuid)
  TO service_role;
COMMENT ON FUNCTION public.cancel_mislinked_excel_invoice_v1(uuid, uuid, text, uuid) IS
  'Audited recovery for an Excel-created invoice after every linked payment has already been cancelled canonically.';
