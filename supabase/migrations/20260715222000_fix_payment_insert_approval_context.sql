CREATE OR REPLACE FUNCTION public.check_payment_approval_requirement(
  p_company_id uuid,
  p_amount numeric,
  p_payment_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy_exists boolean;
  v_has_approval boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.financial_approval_policies policy
    WHERE policy.company_id = p_company_id
      AND policy.action = 'payment_create'
      AND policy.is_active = true
      AND p_amount >= policy.min_amount
      AND (policy.max_amount IS NULL OR p_amount <= policy.max_amount)
  ) INTO v_policy_exists;

  IF NOT v_policy_exists THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.financial_approval_requests request
    WHERE request.source_table = 'payments'
      AND request.source_id = p_payment_id
      AND request.action = 'payment_create'
      AND request.status = 'approved'
  ) INTO v_has_approval;

  IF NOT v_has_approval THEN
    RAISE EXCEPTION
      'Payment amount % exceeds approval threshold. An approved financial approval request is required before completion.',
      p_amount
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_payment_approval_insert_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'completed' THEN
    PERFORM public.check_payment_approval_requirement(
      NEW.company_id,
      NEW.amount,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.check_payment_approval_requirement();

REVOKE ALL ON FUNCTION public.check_payment_approval_requirement(uuid, numeric, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_payment_approval_requirement(uuid, numeric, uuid)
  TO service_role;

COMMENT ON FUNCTION public.check_payment_approval_requirement(uuid, numeric, uuid) IS
  'Checks payment-create approval policy using values passed explicitly by the payment trigger.';
