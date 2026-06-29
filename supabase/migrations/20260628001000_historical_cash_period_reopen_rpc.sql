-- Limited automatic reopening for historical cash rent payments.
-- This does not replace the formal approval workflow. It creates an audited,
-- short-lived reopening request for the exact closed period needed by a
-- backdated cash payment entry.

CREATE OR REPLACE FUNCTION public.open_period_for_historical_cash_payments(
  p_company_id uuid,
  p_accounting_period_id uuid,
  p_reason text,
  p_hours integer DEFAULT 2
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to reopen a financial period.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A clear reopening reason is required.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_hours IS NULL OR p_hours < 1 OR p_hours > 8 THEN
    RAISE EXCEPTION 'Historical cash reopening window must be between 1 and 8 hours.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.company_id = p_company_id
      AND (profile.user_id = v_user_id OR profile.id = v_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot reopen a period for another company.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.accounting_periods period
    WHERE period.id = p_accounting_period_id
      AND period.company_id = p_company_id
      AND lower(period.status) IN ('closed', 'locked')
  ) THEN
    RAISE EXCEPTION 'Only closed or locked periods can be reopened for historical cash payments.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.financial_period_reopening_requests (
    company_id,
    accounting_period_id,
    reason,
    requested_by,
    approved_by,
    approved_at,
    expires_at,
    status
  )
  VALUES (
    p_company_id,
    p_accounting_period_id,
    trim(p_reason),
    v_user_id,
    v_user_id,
    now(),
    now() + make_interval(hours => p_hours),
    'approved'
  )
  RETURNING id INTO v_request_id;

  UPDATE public.accounting_periods
  SET status = 'reopened',
      updated_at = now()
  WHERE id = p_accounting_period_id
    AND company_id = p_company_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_period_for_historical_cash_payments(uuid, uuid, text, integer) TO authenticated;
