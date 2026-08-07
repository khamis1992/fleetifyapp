-- Cancel a truly non-due invoice during legal preparation.
-- Mirrors legal_transfer_update_invoice_amount_v1 guards: only invoices with
-- no journal entry, payments, allocations, or line items can be cancelled,
-- and every cancellation is fully audited.

CREATE OR REPLACE FUNCTION public.legal_transfer_cancel_invoice_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_invoice_id uuid,
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
  v_before jsonb;
  v_after jsonb;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to edit this contract during legal preparation'
      USING ERRCODE = '42501';
  END IF;

  v_actor := COALESCE(auth.uid(), p_actor_id);
  IF v_actor IS NULL OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A cancellation reason is required' USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() IS NOT NULL
     AND p_actor_id IS NOT NULL
     AND p_actor_id IS DISTINCT FROM auth.uid()
  THEN
    RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id
    AND invoice.company_id = p_company_id
    AND invoice.contract_id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice was not found on this contract' USING ERRCODE = 'P0001';
  END IF;

  IF lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
     OR lower(COALESCE(v_invoice.payment_status, '')) IN ('cancelled', 'canceled', 'void', 'voided')
  THEN
    RETURN jsonb_build_object(
      'invoice_id', v_invoice.id,
      'invoice_number', v_invoice.invoice_number,
      'status', 'already_cancelled'
    );
  END IF;

  IF v_invoice.journal_entry_id IS NOT NULL
     OR COALESCE(v_invoice.paid_amount, 0) > 0.01
     OR EXISTS (
       SELECT 1 FROM public.payments payment
       WHERE payment.invoice_id = v_invoice.id
     )
     OR EXISTS (
       SELECT 1 FROM public.payment_allocations allocation
       WHERE allocation.allocation_type = 'invoice'
         AND allocation.target_id = v_invoice.id
     )
     OR EXISTS (
       SELECT 1 FROM public.journal_entries entry
       WHERE entry.reference_type = 'invoice'
         AND entry.reference_id = v_invoice.id
     )
     OR EXISTS (
       SELECT 1 FROM public.invoice_items item
       WHERE item.invoice_id = v_invoice.id
     )
  THEN
    RAISE EXCEPTION 'This invoice has financial history and can only be cancelled through the accounting reversal path.'
      USING ERRCODE = 'P0001';
  END IF;

  IF lower(COALESCE(v_invoice.status, '')) IN ('paid')
     OR lower(COALESCE(v_invoice.payment_status, '')) IN ('paid', 'partial')
  THEN
    RAISE EXCEPTION 'Only unpaid invoices can be cancelled during legal preparation'
      USING ERRCODE = 'P0001';
  END IF;

  v_before := jsonb_build_object(
    'total_amount', v_invoice.total_amount,
    'balance_due', v_invoice.balance_due,
    'status', v_invoice.status,
    'payment_status', v_invoice.payment_status
  );

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  UPDATE public.invoices invoice
  SET
    status = 'cancelled',
    payment_status = 'cancelled',
    paid_amount = 0,
    balance_due = 0,
    notes = CONCAT_WS(
      E'\n',
      NULLIF(invoice.notes, ''),
      'ألغيت أثناء التجهيز القانوني: ' || BTRIM(p_reason)
    ),
    updated_at = now()
  WHERE invoice.id = v_invoice.id;
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  PERFORM public.recalculate_contract_financial_state(v_invoice.contract_id);

  v_after := jsonb_build_object(
    'status', 'cancelled',
    'payment_status', 'cancelled',
    'paid_amount', 0,
    'balance_due', 0
  );

  INSERT INTO public.finance_operation_audit (
    company_id, operation_type, entity_type, entity_id,
    before_state, after_state, reason, source, actor_id
  ) VALUES (
    p_company_id, 'legal_transfer_invoice_cancelled', 'invoice', v_invoice.id,
    v_before, v_after, BTRIM(p_reason), 'legal_employee_review', v_actor
  );

  INSERT INTO public.contract_operations_log (
    contract_id, company_id, operation_type, operation_details, notes, performed_by
  ) VALUES (
    p_contract_id, p_company_id, 'legal_transfer_invoice_cancelled',
    jsonb_build_object(
      'invoice_id', v_invoice.id,
      'invoice_number', v_invoice.invoice_number,
      'before', v_before,
      'after', v_after
    ),
    'ألغيت فاتورة غير مستحقة أثناء التجهيز القانوني: ' || BTRIM(p_reason),
    v_actor
  );

  RETURN jsonb_build_object(
    'invoice_id', v_invoice.id,
    'invoice_number', v_invoice.invoice_number,
    'status', 'cancelled'
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.legal_transfer_cancel_invoice_v1(uuid, uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.legal_transfer_cancel_invoice_v1(uuid, uuid, uuid, text, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.legal_transfer_cancel_invoice_v1(uuid, uuid, uuid, text, uuid) IS
  'Cancels a non-due invoice during legal preparation only when it has no financial history; fully audited.';
