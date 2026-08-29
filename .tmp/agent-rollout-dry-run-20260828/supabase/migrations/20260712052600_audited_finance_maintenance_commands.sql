-- Audited finance maintenance commands. These commands never rewrite posted
-- journal lines and refuse ambiguous duplicate-invoice repairs.

CREATE TABLE IF NOT EXISTS public.finance_operation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  operation_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'approved_finance_command',
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_finance_operation_audit_company_created
  ON public.finance_operation_audit(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_operation_audit_entity
  ON public.finance_operation_audit(entity_type, entity_id, created_at DESC);
ALTER TABLE public.finance_operation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.finance_operation_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.finance_operation_audit TO authenticated;
GRANT SELECT, INSERT ON TABLE public.finance_operation_audit TO service_role;
DROP POLICY IF EXISTS finance_operation_audit_company_select
  ON public.finance_operation_audit;
CREATE POLICY finance_operation_audit_company_select
ON public.finance_operation_audit
FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR EXISTS (
    SELECT 1
    FROM public.user_roles role
    WHERE role.user_id = auth.uid()
      AND role.role::text = 'super_admin'
  )
);
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
  v_allowed boolean := false;
  v_before jsonb;
  v_after jsonb;
  v_affected jsonb;
BEGIN
  IF account_id_param IS NULL THEN
    RAISE EXCEPTION 'Account id is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_account
  FROM public.chart_of_accounts account
  WHERE account.id = account_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      v_account.company_id,
      ARRAY['finance.accounts.write'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to deactivate accounts' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF COALESCE(v_account.is_system, false) THEN
    RAISE EXCEPTION 'System accounts cannot be deactivated' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(v_account.is_active, true) = false THEN
    RETURN true;
  END IF;

  v_before := jsonb_build_object(
    'id', v_account.id,
    'account_code', v_account.account_code,
    'account_name', v_account.account_name,
    'is_active', v_account.is_active
  );
  v_affected := jsonb_build_object(
    'journal_lines', (SELECT COUNT(*) FROM public.journal_entry_lines line WHERE line.account_id = v_account.id),
    'child_accounts', (SELECT COUNT(*) FROM public.chart_of_accounts child WHERE child.parent_account_id = v_account.id),
    'fixed_assets', (
      SELECT COUNT(*)
      FROM public.fixed_assets asset
      WHERE asset.asset_account_id = v_account.id OR asset.depreciation_account_id = v_account.id
    ),
    'payments', (SELECT COUNT(*) FROM public.payments payment WHERE payment.account_id = v_account.id)
  );

  UPDATE public.chart_of_accounts account
  SET is_active = false, updated_at = now()
  WHERE account.id = v_account.id;

  v_after := v_before || jsonb_build_object('is_active', false);

  INSERT INTO public.account_deletion_log (
    company_id,
    deleted_account_id,
    deleted_account_code,
    deleted_account_name,
    deletion_type,
    deletion_reason,
    affected_records,
    deleted_by
  ) VALUES (
    v_account.company_id,
    v_account.id,
    v_account.account_code,
    v_account.account_name,
    'soft',
    'Safe account deactivation; financial history preserved',
    v_affected,
    v_actor
  );

  INSERT INTO public.finance_operation_audit (
    company_id, operation_type, entity_type, entity_id,
    before_state, after_state, reason, actor_id
  ) VALUES (
    v_account.company_id, 'account_deactivated', 'chart_of_accounts', v_account.id,
    v_before, v_after, 'Safe account deactivation; financial history preserved', v_actor
  );

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.soft_delete_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_account(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.repair_invoice_financial_state_atomic(
  p_invoice_id uuid,
  p_company_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_before jsonb;
  v_after jsonb;
  v_paid numeric;
BEGIN
  IF p_invoice_id IS NULL OR p_company_id IS NULL
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Invoice, company, and reason are required' USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.invoices.write', 'finance.payment.reconcile'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to repair invoice financial state' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT *
  INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id
    AND invoice.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found in company' USING ERRCODE = 'P0001';
  END IF;

  v_before := jsonb_build_object(
    'paid_amount', v_invoice.paid_amount,
    'balance_due', v_invoice.balance_due,
    'payment_status', v_invoice.payment_status,
    'status', v_invoice.status
  );

  v_paid := public.recalculate_invoice_financial_state(v_invoice.id);

  SELECT jsonb_build_object(
    'paid_amount', invoice.paid_amount,
    'balance_due', invoice.balance_due,
    'payment_status', invoice.payment_status,
    'status', invoice.status
  )
  INTO v_after
  FROM public.invoices invoice
  WHERE invoice.id = v_invoice.id;

  INSERT INTO public.finance_operation_audit (
    company_id, operation_type, entity_type, entity_id,
    before_state, after_state, reason, actor_id
  ) VALUES (
    p_company_id, 'invoice_financial_state_repaired', 'invoice', p_invoice_id,
    v_before, v_after, BTRIM(p_reason), v_actor
  );

  RETURN jsonb_build_object(
    'invoice_id', p_invoice_id,
    'paid_amount', v_paid,
    'before', v_before,
    'after', v_after,
    'changed', v_before IS DISTINCT FROM v_after
  );
END;
$$;
REVOKE ALL ON FUNCTION public.repair_invoice_financial_state_atomic(uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.repair_invoice_financial_state_atomic(uuid, uuid, text, uuid)
  TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.reconcile_payment_with_bank_transaction(
  p_payment_id uuid,
  p_reason text,
  p_bank_transaction_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_transaction public.bank_transactions%ROWTYPE;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_before jsonb;
  v_after jsonb;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF p_payment_id IS NULL OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Payment and reconciliation reason are required' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      v_payment.company_id,
      ARRAY['finance.payment.reconcile', 'finance.treasury.write'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to reconcile payments' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF lower(COALESCE(v_payment.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded') THEN
    RAISE EXCEPTION 'Only completed payments can be reconciled' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.payment_method_uses_bank(v_payment.payment_method) THEN
    RAISE EXCEPTION 'This payment method does not use a bank transaction' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_transaction
  FROM public.bank_transactions transaction
  WHERE transaction.company_id = v_payment.company_id
    AND transaction.payment_id = v_payment.id
    AND transaction.reversal_of_transaction_id IS NULL
    AND (p_bank_transaction_id IS NULL OR transaction.id = p_bank_transaction_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No linked original bank transaction exists for this payment' USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_transaction.status, '')) <> 'completed'
     OR v_transaction.bank_id IS DISTINCT FROM v_payment.bank_id
     OR abs(COALESCE(v_transaction.amount, 0) - COALESCE(v_payment.amount, 0)) >= 0.005
     OR v_payment.journal_entry_id IS NULL
     OR v_transaction.journal_entry_id IS DISTINCT FROM v_payment.journal_entry_id
  THEN
    RAISE EXCEPTION 'Bank transaction, amount, bank, status, or journal does not match the payment'
      USING ERRCODE = 'P0001';
  END IF;

  v_before := jsonb_build_object(
    'payment_reconciliation_status', v_payment.reconciliation_status,
    'bank_transaction_id', v_transaction.id,
    'bank_reconciled', v_transaction.reconciled,
    'bank_reconciled_at', v_transaction.reconciled_at
  );

  IF COALESCE(v_transaction.reconciled, false)
     AND lower(COALESCE(v_payment.reconciliation_status, '')) = 'reconciled'
  THEN
    RETURN jsonb_build_object(
      'payment_id', v_payment.id,
      'bank_transaction_id', v_transaction.id,
      'status', 'already_reconciled'
    );
  END IF;

  UPDATE public.bank_transactions transaction
  SET reconciled = true, reconciled_at = now(), updated_at = now()
  WHERE transaction.id = v_transaction.id;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  UPDATE public.payments payment
  SET reconciliation_status = 'reconciled', updated_at = now()
  WHERE payment.id = v_payment.id;
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  v_after := jsonb_build_object(
    'payment_reconciliation_status', 'reconciled',
    'bank_transaction_id', v_transaction.id,
    'bank_reconciled', true,
    'bank_reconciled_at', now()
  );

  INSERT INTO public.finance_operation_audit (
    company_id, operation_type, entity_type, entity_id,
    before_state, after_state, reason, actor_id
  ) VALUES (
    v_payment.company_id, 'payment_bank_reconciled', 'payment', v_payment.id,
    v_before, v_after, BTRIM(p_reason), v_actor
  );

  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'bank_transaction_id', v_transaction.id,
    'status', 'reconciled',
    'before', v_before,
    'after', v_after
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_payment_with_bank_transaction(uuid, text, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_payment_with_bank_transaction(uuid, text, uuid, uuid)
  TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.attach_schedule_invoice_to_contract_atomic(
  p_invoice_id uuid,
  p_contract_id uuid,
  p_company_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF p_invoice_id IS NULL OR p_contract_id IS NULL OR p_company_id IS NULL
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Invoice, contract, company, and reason are required' USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.invoice.edit_customer', 'finance.invoices.write'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to attach invoices to contracts' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id AND contract.company_id = p_company_id
  FOR UPDATE;
  SELECT * INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id AND invoice.company_id = p_company_id
  FOR UPDATE;

  IF v_contract.id IS NULL OR v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Invoice or contract not found in company' USING ERRCODE = 'P0001';
  END IF;
  IF v_invoice.contract_id IS NOT NULL AND v_invoice.contract_id IS DISTINCT FROM v_contract.id THEN
    RAISE EXCEPTION 'Invoice already belongs to another contract' USING ERRCODE = 'P0001';
  END IF;
  IF v_invoice.customer_id IS NOT NULL AND v_invoice.customer_id IS DISTINCT FROM v_contract.customer_id THEN
    RAISE EXCEPTION 'Invoice customer does not match contract customer' USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
     OR lower(COALESCE(v_invoice.payment_status, '')) IN ('cancelled', 'canceled', 'void', 'voided')
  THEN
    RAISE EXCEPTION 'Inactive invoices cannot be attached' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = p_company_id
      AND schedule.contract_id = p_contract_id
      AND schedule.invoice_id = p_invoice_id
      AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) THEN
    RAISE EXCEPTION 'No active contract schedule links this invoice to the contract' USING ERRCODE = 'P0001';
  END IF;

  IF v_invoice.contract_id = v_contract.id AND v_invoice.customer_id IS NOT DISTINCT FROM v_contract.customer_id THEN
    RETURN jsonb_build_object('status', 'already_attached', 'invoice_id', v_invoice.id, 'contract_id', v_contract.id);
  END IF;

  v_before := jsonb_build_object('contract_id', v_invoice.contract_id, 'customer_id', v_invoice.customer_id);

  UPDATE public.invoices invoice
  SET contract_id = v_contract.id,
      customer_id = COALESCE(invoice.customer_id, v_contract.customer_id),
      updated_at = now()
  WHERE invoice.id = v_invoice.id;

  v_after := jsonb_build_object('contract_id', v_contract.id, 'customer_id', COALESCE(v_invoice.customer_id, v_contract.customer_id));
  INSERT INTO public.finance_operation_audit (
    company_id, operation_type, entity_type, entity_id,
    before_state, after_state, reason, actor_id
  ) VALUES (
    p_company_id, 'schedule_invoice_attached_to_contract', 'invoice', p_invoice_id,
    v_before, v_after, BTRIM(p_reason), v_actor
  );

  RETURN jsonb_build_object(
    'status', 'attached',
    'invoice_id', v_invoice.id,
    'contract_id', v_contract.id,
    'before', v_before,
    'after', v_after
  );
END;
$$;
REVOKE ALL ON FUNCTION public.attach_schedule_invoice_to_contract_atomic(uuid, uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_schedule_invoice_to_contract_atomic(uuid, uuid, uuid, text, uuid)
  TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.update_draft_invoice_amount_atomic(
  p_invoice_id uuid,
  p_company_id uuid,
  p_new_total numeric,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_before jsonb;
  v_after jsonb;
  v_subtotal numeric;
BEGIN
  IF p_invoice_id IS NULL OR p_company_id IS NULL OR COALESCE(p_new_total, 0) <= 0
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Invoice, company, positive total, and reason are required' USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.invoice.edit_amount', 'finance.invoices.write'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to edit invoice amounts' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id AND invoice.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found in company' USING ERRCODE = 'P0001';
  END IF;
  IF v_invoice.journal_entry_id IS NOT NULL
     OR COALESCE(v_invoice.paid_amount, 0) > 0.01
     OR EXISTS (SELECT 1 FROM public.payments payment WHERE payment.invoice_id = v_invoice.id)
     OR EXISTS (
       SELECT 1 FROM public.payment_allocations allocation
       WHERE allocation.allocation_type = 'invoice' AND allocation.target_id = v_invoice.id
     )
     OR EXISTS (
       SELECT 1 FROM public.journal_entries entry
       WHERE entry.reference_type = 'invoice' AND entry.reference_id = v_invoice.id
     )
     OR EXISTS (SELECT 1 FROM public.invoice_items item WHERE item.invoice_id = v_invoice.id)
  THEN
    RAISE EXCEPTION 'Invoice has items or financial history and requires an approved credit/debit adjustment'
      USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted', 'paid')
     OR lower(COALESCE(v_invoice.payment_status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'paid', 'partial')
  THEN
    RAISE EXCEPTION 'Only unpaid draft or pending invoices can be edited' USING ERRCODE = 'P0001';
  END IF;

  v_subtotal := p_new_total + COALESCE(v_invoice.discount_amount, 0) - COALESCE(v_invoice.tax_amount, 0);
  IF v_subtotal < 0 THEN
    RAISE EXCEPTION 'New total is incompatible with the invoice tax and discount' USING ERRCODE = 'P0001';
  END IF;

  v_before := jsonb_build_object(
    'total_amount', v_invoice.total_amount,
    'subtotal', v_invoice.subtotal,
    'balance_due', v_invoice.balance_due,
    'payment_status', v_invoice.payment_status,
    'status', v_invoice.status
  );

  UPDATE public.invoices invoice
  SET
    total_amount = round(p_new_total::numeric, 2),
    subtotal = round(v_subtotal::numeric, 2),
    balance_due = round(p_new_total::numeric, 2),
    paid_amount = 0,
    payment_status = 'unpaid',
    status = CASE
      WHEN lower(COALESCE(v_invoice.status, '')) = 'draft' THEN 'draft'
      WHEN v_invoice.due_date IS NOT NULL AND v_invoice.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END,
    updated_at = now()
  WHERE invoice.id = v_invoice.id;

  SELECT jsonb_build_object(
    'total_amount', invoice.total_amount,
    'subtotal', invoice.subtotal,
    'balance_due', invoice.balance_due,
    'payment_status', invoice.payment_status,
    'status', invoice.status
  ) INTO v_after
  FROM public.invoices invoice
  WHERE invoice.id = v_invoice.id;

  INSERT INTO public.finance_operation_audit (
    company_id, operation_type, entity_type, entity_id,
    before_state, after_state, reason, actor_id
  ) VALUES (
    p_company_id, 'draft_invoice_amount_updated', 'invoice', p_invoice_id,
    v_before, v_after, BTRIM(p_reason), v_actor
  );

  RETURN jsonb_build_object(
    'invoice_id', p_invoice_id,
    'before', v_before,
    'after', v_after,
    'status', 'updated'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.update_draft_invoice_amount_atomic(uuid, uuid, numeric, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_draft_invoice_amount_atomic(uuid, uuid, numeric, text, uuid)
  TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.merge_unpaid_duplicate_invoice_atomic(
  p_keep_invoice_id uuid,
  p_duplicate_invoice_id uuid,
  p_company_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_keep public.invoices%ROWTYPE;
  v_duplicate public.invoices%ROWTYPE;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_before jsonb;
  v_after jsonb;
  v_schedule_count integer := 0;
BEGIN
  IF p_keep_invoice_id IS NULL OR p_duplicate_invoice_id IS NULL OR p_company_id IS NULL
     OR p_keep_invoice_id = p_duplicate_invoice_id
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Two different invoices, company, and reason are required' USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.invoice.cancel', 'finance.invoice.edit_amount', 'finance.invoices.write'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to merge duplicate invoices' USING ERRCODE = '42501';
    END IF;
  END IF;

  PERFORM 1
  FROM public.invoices invoice
  WHERE invoice.id IN (p_keep_invoice_id, p_duplicate_invoice_id)
  ORDER BY invoice.id
  FOR UPDATE;

  SELECT * INTO v_keep
  FROM public.invoices invoice
  WHERE invoice.id = p_keep_invoice_id AND invoice.company_id = p_company_id;
  SELECT * INTO v_duplicate
  FROM public.invoices invoice
  WHERE invoice.id = p_duplicate_invoice_id AND invoice.company_id = p_company_id;

  IF v_keep.id IS NULL OR v_duplicate.id IS NULL THEN
    RAISE EXCEPTION 'Both invoices must exist in the company' USING ERRCODE = 'P0001';
  END IF;
  IF v_keep.customer_id IS DISTINCT FROM v_duplicate.customer_id
     OR v_keep.contract_id IS DISTINCT FROM v_duplicate.contract_id
     OR upper(COALESCE(v_keep.currency, 'QAR')) IS DISTINCT FROM upper(COALESCE(v_duplicate.currency, 'QAR'))
     OR v_keep.invoice_type IS DISTINCT FROM v_duplicate.invoice_type
     OR abs(COALESCE(v_keep.total_amount, 0) - COALESCE(v_duplicate.total_amount, 0)) > 0.01
  THEN
    RAISE EXCEPTION 'Invoices do not represent the same customer, contract, currency, type, and amount'
      USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_keep.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted') THEN
    RAISE EXCEPTION 'The invoice to keep is inactive' USING ERRCODE = 'P0001';
  END IF;
  IF v_duplicate.journal_entry_id IS NOT NULL
     OR COALESCE(v_duplicate.paid_amount, 0) > 0.01
     OR EXISTS (
       SELECT 1 FROM public.journal_entries entry
       WHERE entry.reference_type = 'invoice' AND entry.reference_id = v_duplicate.id
     )
     OR EXISTS (
       SELECT 1 FROM public.payments payment WHERE payment.invoice_id = v_duplicate.id
     )
     OR EXISTS (
       SELECT 1 FROM public.payment_allocations allocation
       WHERE allocation.allocation_type = 'invoice' AND allocation.target_id = v_duplicate.id
     )
  THEN
    RAISE EXCEPTION 'Duplicate invoice has financial history and requires a reviewed reversal/reallocation plan'
      USING ERRCODE = 'P0001';
  END IF;

  v_before := jsonb_build_object(
    'keep_invoice_id', v_keep.id,
    'duplicate_invoice_id', v_duplicate.id,
    'duplicate_status', v_duplicate.status,
    'duplicate_payment_status', v_duplicate.payment_status
  );

  UPDATE public.contract_payment_schedules schedule
  SET invoice_id = v_keep.id, updated_at = now()
  WHERE schedule.company_id = p_company_id
    AND schedule.invoice_id = v_duplicate.id;
  GET DIAGNOSTICS v_schedule_count = ROW_COUNT;

  UPDATE public.invoices invoice
  SET
    status = 'cancelled',
    payment_status = 'cancelled',
    notes = CONCAT_WS(E'\n', NULLIF(invoice.notes, ''), 'Duplicate merged into invoice ' || v_keep.invoice_number),
    updated_at = now()
  WHERE invoice.id = v_duplicate.id;

  v_after := jsonb_build_object(
    'keep_invoice_id', v_keep.id,
    'duplicate_invoice_id', v_duplicate.id,
    'duplicate_status', 'cancelled',
    'duplicate_payment_status', 'cancelled',
    'schedule_links_moved', v_schedule_count
  );

  INSERT INTO public.finance_operation_audit (
    company_id, operation_type, entity_type, entity_id,
    before_state, after_state, reason, actor_id
  ) VALUES (
    p_company_id, 'unpaid_duplicate_invoice_merged', 'invoice', v_duplicate.id,
    v_before, v_after, BTRIM(p_reason), v_actor
  );

  RETURN jsonb_build_object(
    'status', 'merged',
    'keep_invoice_id', v_keep.id,
    'duplicate_invoice_id', v_duplicate.id,
    'schedule_links_moved', v_schedule_count
  );
END;
$$;
REVOKE ALL ON FUNCTION public.merge_unpaid_duplicate_invoice_atomic(uuid, uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_unpaid_duplicate_invoice_atomic(uuid, uuid, uuid, text, uuid)
  TO authenticated, service_role;
COMMENT ON TABLE public.finance_operation_audit IS
'Immutable before/after evidence for approved finance maintenance commands.';
