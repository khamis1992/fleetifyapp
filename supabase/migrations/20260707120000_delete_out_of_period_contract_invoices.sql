-- Allow controlled hard delete only for invoices that were generated outside the contract period.
-- Normal invoice hard delete remains blocked by default.

CREATE OR REPLACE FUNCTION public.prevent_invoices_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.allow_invoice_hard_delete', true), '') = 'on'
     AND public.financial_controls_bypass_enabled() THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'Invoices cannot be deleted permanently. Set status = cancelled instead.'
    USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_contract_out_of_period_invoice(
  p_invoice_id uuid,
  p_contract_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice record;
  v_contract record;
  v_invoice_date date;
  v_actor uuid;
  v_actor_role text;
  v_user_company_id uuid;
BEGIN
  v_actor := auth.uid();
  v_actor_role := COALESCE(auth.role(), '');

  IF v_actor IS NULL AND v_actor_role <> 'service_role' THEN
    RAISE EXCEPTION 'You must be signed in before deleting an out-of-period invoice.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    v_user_company_id := public.get_user_company_id();

    IF v_user_company_id IS NULL THEN
      RAISE EXCEPTION 'Could not determine the current user company.'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_user_company_id IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'You are not allowed to delete invoices for this company.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id
    AND company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found or not accessible.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
    AND contract_id = p_contract_id
    AND company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'invoice_not_found');
  END IF;

  v_invoice_date := COALESCE(v_invoice.due_date, v_invoice.invoice_date)::date;

  IF v_invoice_date BETWEEN v_contract.start_date::date AND v_contract.end_date::date THEN
    RAISE EXCEPTION 'Invoice is inside the contract period and cannot be hard deleted by this function.'
      USING ERRCODE = 'P0001';
  END IF;

  IF (
    COALESCE(v_invoice.paid_amount, 0) > 0
    OR v_invoice.journal_entry_id IS NOT NULL
  ) AND lower(COALESCE(v_invoice.status::text, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    AND lower(COALESCE(v_invoice.payment_status::text, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  THEN
    RAISE EXCEPTION 'Invoice has paid amount or journal entry. Cancel or reverse it before deletion.'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.invoice_id = p_invoice_id
      AND lower(COALESCE(p.payment_status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted', 'failed', 'reversed', 'refunded')
  ) THEN
    RAISE EXCEPTION 'Invoice has active payments. Cancel or unlink payments before deletion.'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.allow_invoice_hard_delete', 'on', true);

  UPDATE public.payments
  SET invoice_id = NULL,
      updated_at = now()
  WHERE invoice_id = p_invoice_id;

  UPDATE public.contract_payment_schedules
  SET invoice_id = NULL,
      updated_at = now()
  WHERE invoice_id = p_invoice_id
    AND contract_id = p_contract_id
    AND company_id = p_company_id;

  DELETE FROM public.invoice_items
  WHERE invoice_id = p_invoice_id;

  DELETE FROM public.invoices
  WHERE id = p_invoice_id
    AND contract_id = p_contract_id
    AND company_id = p_company_id;

  PERFORM set_config('app.allow_invoice_hard_delete', '', true);
  PERFORM set_config('app.financial_controls_bypass', '', true);

  RETURN jsonb_build_object(
    'deleted', true,
    'invoice_id', p_invoice_id,
    'invoice_number', v_invoice.invoice_number
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.allow_invoice_hard_delete', '', true);
    PERFORM set_config('app.financial_controls_bypass', '', true);
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_contract_out_of_period_invoice(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_contract_out_of_period_invoice(uuid, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.delete_contract_out_of_period_invoice(uuid, uuid, uuid) IS
'Safely hard-deletes an invoice only when it belongs to the contract/company and its invoice/due date is outside the contract period, with no active payments or journal entry.';
