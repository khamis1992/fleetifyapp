-- Cancel invoices without severing historical payment links. Active direct
-- payments and canonical allocations must be cancelled or reallocated first.

CREATE OR REPLACE FUNCTION public.cancel_invoice_with_reversal(
  p_invoice_id uuid,
  p_company_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_journal public.journal_entries%ROWTYPE;
  v_active_payment record;
  v_reversal_entry_id uuid;
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_before jsonb;
  v_after jsonb;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
  v_previous_invoice_cancel text := COALESCE(current_setting('app.approved_invoice_cancellation', true), '');
BEGIN
  IF p_invoice_id IS NULL OR p_company_id IS NULL
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Invoice, company, and cancellation reason are required' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'You must be signed in before cancelling an invoice' USING ERRCODE = '42501';
    END IF;
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.invoice.cancel'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to cancel invoices for this company' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id AND invoice.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found in company' USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided')
     OR lower(COALESCE(v_invoice.payment_status, '')) IN ('cancelled', 'canceled', 'void', 'voided')
  THEN
    RETURN jsonb_build_object(
      'invoice_id', v_invoice.id,
      'invoice_number', v_invoice.invoice_number,
      'status', 'already_cancelled',
      'reversal_entry_id', NULL
    );
  END IF;

  SELECT payment.id, payment.payment_number, payment.amount, payment.payment_status
  INTO v_active_payment
  FROM public.payments payment
  WHERE payment.company_id = v_invoice.company_id
    AND lower(COALESCE(payment.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'failed', 'void', 'voided', 'reversed', 'refunded'
    )
    AND (
      payment.invoice_id = v_invoice.id
      OR EXISTS (
        SELECT 1
        FROM public.payment_allocations allocation
        WHERE allocation.payment_id = payment.id
          AND allocation.allocation_type = 'invoice'
          AND allocation.target_id = v_invoice.id
          AND allocation.is_active = true
      )
    )
  ORDER BY payment.created_at
  LIMIT 1
  FOR UPDATE OF payment;

  IF FOUND THEN
    RAISE EXCEPTION 'Invoice has active payment % for QAR %. Cancel or reallocate the payment first.',
      COALESCE(v_active_payment.payment_number, v_active_payment.id::text),
      round(COALESCE(v_active_payment.amount, 0)::numeric, 2)
      USING ERRCODE = 'P0001';
  END IF;

  v_before := jsonb_build_object(
    'status', v_invoice.status,
    'payment_status', v_invoice.payment_status,
    'paid_amount', v_invoice.paid_amount,
    'balance_due', v_invoice.balance_due,
    'journal_entry_id', v_invoice.journal_entry_id
  );

  IF v_invoice.journal_entry_id IS NOT NULL THEN
    SELECT * INTO v_journal
    FROM public.journal_entries entry
    WHERE entry.id = v_invoice.journal_entry_id
      AND entry.company_id = v_invoice.company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invoice journal entry was not found' USING ERRCODE = 'P0001';
    END IF;

    IF lower(COALESCE(v_journal.status, '')) = 'posted' THEN
      PERFORM set_config('app.approved_invoice_cancellation', 'on', true);
      v_reversal_entry_id := public.reverse_journal_entry(
        v_journal.id,
        BTRIM(p_reason),
        v_actor
      );
      PERFORM set_config('app.approved_invoice_cancellation', v_previous_invoice_cancel, true);
    ELSIF lower(COALESCE(v_journal.status, '')) IN ('draft', 'pending', 'submitted', 'approved') THEN
      PERFORM set_config('app.financial_controls_bypass', 'on', true);
      UPDATE public.journal_entries entry
      SET
        status = 'cancelled',
        rejection_reason = BTRIM(p_reason),
        updated_by = v_actor,
        updated_at = now()
      WHERE entry.id = v_journal.id;
      PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    ELSIF lower(COALESCE(v_journal.status, '')) <> 'cancelled' THEN
      RAISE EXCEPTION 'Invoice journal status % cannot be cancelled automatically', v_journal.status
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

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
      'Cancelled through approved reversal: ' || BTRIM(p_reason),
      CASE WHEN v_reversal_entry_id IS NULL THEN NULL ELSE 'Reversal entry: ' || v_reversal_entry_id::text END
    ),
    updated_at = now()
  WHERE invoice.id = v_invoice.id;
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  PERFORM public.recalculate_contract_financial_state(v_invoice.contract_id);

  v_after := jsonb_build_object(
    'status', 'cancelled',
    'payment_status', 'cancelled',
    'paid_amount', 0,
    'balance_due', 0,
    'journal_entry_id', v_invoice.journal_entry_id,
    'reversal_entry_id', v_reversal_entry_id
  );

  INSERT INTO public.finance_operation_audit (
    company_id, operation_type, entity_type, entity_id,
    before_state, after_state, reason, actor_id
  ) VALUES (
    v_invoice.company_id, 'invoice_cancelled', 'invoice', v_invoice.id,
    v_before, v_after, BTRIM(p_reason), v_actor
  );

  RETURN jsonb_build_object(
    'invoice_id', v_invoice.id,
    'invoice_number', v_invoice.invoice_number,
    'status', 'cancelled',
    'reversal_entry_id', v_reversal_entry_id
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.approved_invoice_cancellation', v_previous_invoice_cancel, true);
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_invoice_with_reversal(uuid, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_invoice_with_reversal(uuid, uuid, text)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cancel_invoice_with_reversal(jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_invoice_with_reversal(jsonb)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.cancel_invoice_with_reversal(uuid, uuid, text) IS
'Cancels an invoice only after all active direct payments and allocation-ledger links are cleared, using the canonical journal reversal and preserving historical foreign keys.';
