-- Forward repair for environments where the original 20260728143000 migration
-- was skipped.  The contract-details page uses this authenticated gateway to
-- refresh derived invoice/contract balances from canonical payment facts.
CREATE OR REPLACE FUNCTION public.refresh_contract_financial_state_v1(p_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_jwt_role text := COALESCE(
    current_setting('request.jwt.claim.role', true),
    auth.jwt() ->> 'role',
    ''
  );
  v_contract_before public.contracts%ROWTYPE;
  v_contract_after public.contracts%ROWTYPE;
  v_invoice_id uuid;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'contract id is required' USING ERRCODE = '22023';
  END IF;

  IF v_actor IS NULL AND v_jwt_role <> 'service_role' THEN
    RAISE EXCEPTION 'authenticated user is required' USING ERRCODE = '42501';
  END IF;

  SELECT contract.*
  INTO v_contract_before
  FROM public.contracts AS contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contract not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_actor IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.user_id = v_actor
      AND profile.company_id = v_contract_before.company_id
      AND COALESCE(profile.is_active, true)
  ) THEN
    RAISE EXCEPTION 'contract is outside the current company scope'
      USING ERRCODE = '42501';
  END IF;

  FOR v_invoice_id IN
    SELECT invoice.id
    FROM public.invoices AS invoice
    WHERE invoice.contract_id = p_contract_id
      AND invoice.company_id = v_contract_before.company_id
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
    ORDER BY invoice.id
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
  END LOOP;

  PERFORM public.recalculate_contract_financial_state(p_contract_id);

  SELECT contract.*
  INTO STRICT v_contract_after
  FROM public.contracts AS contract
  WHERE contract.id = p_contract_id;

  RETURN jsonb_build_object(
    'contract_id', p_contract_id,
    'contract_number', v_contract_after.contract_number,
    'changed',
      round(COALESCE(v_contract_before.total_paid, 0)::numeric, 2)
        IS DISTINCT FROM round(COALESCE(v_contract_after.total_paid, 0)::numeric, 2)
      OR round(COALESCE(v_contract_before.balance_due, 0)::numeric, 2)
        IS DISTINCT FROM round(COALESCE(v_contract_after.balance_due, 0)::numeric, 2)
      OR COALESCE(v_contract_before.payment_status, '')
        IS DISTINCT FROM COALESCE(v_contract_after.payment_status, ''),
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
  'Tenant-checked deterministic refresh of invoice and contract financial state for the contract-details page.';
