CREATE OR REPLACE FUNCTION public.refresh_contract_financial_state_v1(p_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_jwt_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_contract_before public.contracts%ROWTYPE;
  v_contract_after public.contracts%ROWTYPE;
  v_profile record;
  v_invoice record;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'contract id is required';
  END IF;

  SELECT *
  INTO v_contract_before
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contract not found';
  END IF;

  IF v_actor IS NULL AND v_jwt_role <> 'service_role' THEN
    RAISE EXCEPTION 'authenticated user is required';
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT profile.id, profile.company_id, profile.role
    INTO v_profile
    FROM public.profiles profile
    WHERE profile.user_id = v_actor
      AND profile.company_id = v_contract_before.company_id
      AND COALESCE(profile.is_active, true) = true
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'contract is outside the current company scope';
    END IF;
  END IF;

  FOR v_invoice IN
    SELECT invoice.id
    FROM public.invoices invoice
    WHERE invoice.contract_id = p_contract_id
      AND invoice.company_id = v_contract_before.company_id
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice.id);
  END LOOP;

  PERFORM public.recalculate_contract_financial_state(p_contract_id);

  SELECT *
  INTO v_contract_after
  FROM public.contracts contract
  WHERE contract.id = p_contract_id;

  RETURN jsonb_build_object(
    'contract_id', p_contract_id,
    'contract_number', v_contract_after.contract_number,
    'changed',
      round(COALESCE(v_contract_before.total_paid, 0)::numeric, 2) IS DISTINCT FROM round(COALESCE(v_contract_after.total_paid, 0)::numeric, 2)
      OR round(COALESCE(v_contract_before.balance_due, 0)::numeric, 2) IS DISTINCT FROM round(COALESCE(v_contract_after.balance_due, 0)::numeric, 2)
      OR COALESCE(v_contract_before.payment_status, '') IS DISTINCT FROM COALESCE(v_contract_after.payment_status, ''),
    'before', jsonb_build_object(
      'total_paid', COALESCE(v_contract_before.total_paid, 0),
      'balance_due', COALESCE(v_contract_before.balance_due, 0),
      'payment_status', v_contract_before.payment_status
    ),
    'after', jsonb_build_object(
      'total_paid', COALESCE(v_contract_after.total_paid, 0),
      'balance_due', COALESCE(v_contract_after.balance_due, 0),
      'payment_status', v_contract_after.payment_status
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_contract_financial_state_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_contract_financial_state_v1(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.refresh_contract_financial_state_v1(uuid) IS
  'Automatically refreshes invoice and contract financial state from canonical payment/allocation sources for the current company.';
