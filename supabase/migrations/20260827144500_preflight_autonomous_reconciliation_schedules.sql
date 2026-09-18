-- The invoice generator validates the complete active schedule graph before
-- generating any single month. Normalize every payment-free schedule in the
-- signed scenario first, in the same transaction, then delegate to the fully
-- guarded reconciliation implementation.

BEGIN;

ALTER FUNCTION public.apply_autonomous_contract_reconciliation_v1(uuid, jsonb)
  RENAME TO apply_autonomous_contract_reconciliation_core_v1;

CREATE FUNCTION public.apply_autonomous_contract_reconciliation_v1(
  p_proposal_id uuid,
  p_scenario jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_proposal public.contract_terms_scan_proposals%ROWTYPE;
  v_monthly numeric;
  v_first_month date;
  v_duration integer;
  v_last_month date;
BEGIN
  IF v_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'Autonomous contract reconciliation requires the service role'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_proposal
  FROM public.contract_terms_scan_proposals proposal
  WHERE proposal.id = p_proposal_id
    AND proposal.status = 'pending'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A pending signed-contract proposal is required'
      USING ERRCODE = 'P0001';
  END IF;

  v_monthly := NULLIF(p_scenario ->> 'monthlyAmount', '')::numeric;
  v_first_month := date_trunc(
    'month', NULLIF(p_scenario ->> 'firstBillingMonth', '')::date
  )::date;
  v_duration := NULLIF(p_scenario ->> 'installmentCount', '')::integer;
  IF COALESCE(v_monthly, 0) <= 0 OR v_first_month IS NULL OR COALESCE(v_duration, 0) <= 0 THEN
    RAISE EXCEPTION 'scenario_is_not_autonomously_eligible' USING ERRCODE = 'P0001';
  END IF;
  v_last_month := (
    v_first_month + ((v_duration - 1)::text || ' months')::interval
  )::date;

  -- Never touch a schedule carrying receipt history. The core function will
  -- reject the entire transaction if any protected payment history exists.
  UPDATE public.contract_payment_schedules schedule
  SET installment_number = (
        (EXTRACT(YEAR FROM date_trunc('month', schedule.due_date))
          - EXTRACT(YEAR FROM v_first_month)) * 12
        + EXTRACT(MONTH FROM date_trunc('month', schedule.due_date))
        - EXTRACT(MONTH FROM v_first_month)
        + 1
      )::integer,
      amount = v_monthly,
      updated_at = now()
  WHERE schedule.company_id = v_proposal.company_id
    AND schedule.contract_id = v_proposal.contract_id
    AND date_trunc('month', schedule.due_date)::date BETWEEN v_first_month AND v_last_month
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    )
    AND COALESCE(schedule.paid_amount, 0) <= 0.01
    AND schedule.paid_date IS NULL;

  RETURN public.apply_autonomous_contract_reconciliation_core_v1(
    p_proposal_id,
    p_scenario
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_autonomous_contract_reconciliation_v1(uuid,jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_autonomous_contract_reconciliation_v1(uuid,jsonb)
TO service_role;

REVOKE ALL ON FUNCTION public.apply_autonomous_contract_reconciliation_core_v1(uuid,jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_autonomous_contract_reconciliation_core_v1(uuid,jsonb)
TO service_role;

COMMENT ON FUNCTION public.apply_autonomous_contract_reconciliation_v1(uuid,jsonb) IS
  'Preflights all payment-free schedules, then atomically applies and verifies the signed-contract billing graph.';

COMMIT;
