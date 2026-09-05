-- Rollback: remove the unified reconciliation authority and its cron sweep,
-- restore the legacy month-matching trigger pair and the pre-authority
-- gateway. Derived schedule state is historical data and is not recomputed.

-- Stop the nightly sweep.
SELECT cron.unschedule('reconcile-contract-schedules-nightly');

DROP FUNCTION IF EXISTS public.reconcile_all_contract_schedules();

-- Restore the gateway WITHOUT schedule delegation (pre-authority shape).
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
        IS DISTINCT FROM COALESCE(v_contract_after.payment_status, '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_contract_financial_state_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_contract_financial_state_v1(uuid)
  TO authenticated, service_role;

-- Restore the month-matching triggers (legacy behaviour, including its
-- known wrong-row attachment limitation).
CREATE TRIGGER trg_sync_schedule_with_invoice
  AFTER UPDATE OF payment_status, paid_amount ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION sync_payment_schedule_with_invoice();
CREATE TRIGGER trg_sync_schedule_with_invoice_insert
  AFTER INSERT ON public.invoices
  FOR EACH ROW WHEN ((new.payment_status IS NOT NULL))
  EXECUTE FUNCTION sync_payment_schedule_with_invoice();
CREATE TRIGGER trigger_sync_schedule_on_invoice
  AFTER INSERT OR UPDATE OF paid_amount, payment_status, balance_due ON public.invoices
  FOR EACH ROW WHEN ((new.contract_id IS NOT NULL))
  EXECUTE FUNCTION sync_payment_schedule_with_invoice();
CREATE TRIGGER trigger_sync_schedule_with_invoice
  AFTER UPDATE OF paid_amount, total_amount, payment_status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION sync_schedule_with_invoice();

-- Drop the invoice-cancel detach trigger (the leak it patched is reintroduced
-- by design in the rollback).
DROP TRIGGER IF EXISTS trg_detach_schedules_on_invoice_cancel ON public.invoices;
DROP FUNCTION IF EXISTS public.detach_schedules_on_invoice_cancel();

-- Drop the authority.
DROP FUNCTION IF EXISTS public.reconcile_contract_schedules_v1(uuid, jsonb);