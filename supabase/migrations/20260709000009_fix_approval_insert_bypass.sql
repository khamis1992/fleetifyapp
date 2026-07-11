-- Fix: Approval enforcement on INSERT (critical production blocker)
-- The existing trg_enforce_payment_approval only fires on UPDATE.
-- create_payment_atomic inserts directly as 'completed', bypassing enforcement.
-- This adds BEFORE INSERT enforcement using a shared check function.

CREATE OR REPLACE FUNCTION public.check_payment_approval_requirement()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy_exists BOOLEAN;
  v_has_approval BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.financial_approval_policies
    WHERE company_id = NEW.company_id
      AND action = 'payment_create'
      AND is_active = true
      AND NEW.amount >= min_amount
      AND (max_amount IS NULL OR NEW.amount <= max_amount)
  ) INTO v_policy_exists;

  IF NOT v_policy_exists THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.financial_approval_requests
    WHERE source_table = 'payments'
      AND source_id = NEW.id
      AND action = 'payment_create'
      AND status = 'approved'
  ) INTO v_has_approval;

  IF NOT v_has_approval THEN
    RAISE EXCEPTION 'Payment amount % exceeds approval threshold. An approved financial approval request is required before completion.', NEW.amount;
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
    PERFORM public.check_payment_approval_requirement();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_approval_insert ON public.payments;
CREATE TRIGGER trg_enforce_payment_approval_insert
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed')
  EXECUTE FUNCTION public.enforce_payment_approval_insert_fn();
