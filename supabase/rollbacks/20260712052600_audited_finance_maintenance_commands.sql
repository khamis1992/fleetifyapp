-- Remove the maintenance commands. The safe account-deactivation behavior is
-- intentionally retained so a rollback cannot restore destructive history edits.

DROP FUNCTION IF EXISTS public.merge_unpaid_duplicate_invoice_atomic(uuid, uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.update_draft_invoice_amount_atomic(uuid, uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS public.attach_schedule_invoice_to_contract_atomic(uuid, uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.reconcile_payment_with_bank_transaction(uuid, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.repair_invoice_financial_state_atomic(uuid, uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.soft_delete_account(account_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.chart_of_accounts%ROWTYPE;
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
BEGIN
  SELECT * INTO v_account
  FROM public.chart_of_accounts account
  WHERE account.id = account_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found' USING ERRCODE = 'P0001';
  END IF;
  IF v_actor_role <> 'service_role' AND NOT public.is_finance_action_authorized(
    v_actor,
    v_account.company_id,
    ARRAY['finance.accounts.write'],
    ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
  ) THEN
    RAISE EXCEPTION 'Not authorized to deactivate accounts' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(v_account.is_system, false) THEN
    RAISE EXCEPTION 'System accounts cannot be deactivated' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.chart_of_accounts account
  SET is_active = false, updated_at = now()
  WHERE account.id = account_id_param;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_account(uuid) TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.finance_operation_audit LIMIT 1) THEN
    RAISE EXCEPTION 'Rollback refused: finance_operation_audit contains evidence that must be preserved';
  END IF;
END;
$$;

DROP POLICY IF EXISTS finance_operation_audit_company_select
  ON public.finance_operation_audit;
DROP TABLE IF EXISTS public.finance_operation_audit;
