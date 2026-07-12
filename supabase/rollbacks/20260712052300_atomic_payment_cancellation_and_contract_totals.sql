-- Revert the cancellation/contract integration only before it has processed data.
-- The corrected bank reversal remains installed intentionally: restoring the old
-- function would exclude the original and add its opposite, doubling the reversal.

DROP FUNCTION IF EXISTS public.cancel_payments_batch_with_reversal(uuid[], uuid, text, uuid);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.payment_cancellation_audit) THEN
    RAISE EXCEPTION
      'Rollback stopped: atomic payment cancellations exist. Use their audit rows and compensating entries instead.'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS recalculate_contracts_after_allocation_change_log_trigger
  ON public.payment_allocation_change_log;
DROP FUNCTION IF EXISTS public.recalculate_contracts_after_allocation_change_log();

CREATE OR REPLACE FUNCTION public.after_payment_allocation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('app.payment_allocation_batch_mode', true), '') = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.allocation_type = 'invoice' THEN
    PERFORM public.recalculate_invoice_financial_state(OLD.target_id);
    PERFORM public.sync_payment_allocation_state(OLD.payment_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.allocation_type = 'invoice' THEN
    PERFORM public.sync_payment_allocation_state(NEW.payment_id);
    PERFORM public.recalculate_invoice_financial_state(NEW.target_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_invoice_on_payment_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_contract_id uuid;
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_contract_ids uuid[] := ARRAY[]::uuid[];
  v_contract_paid numeric := 0;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.invoice_id IS NOT NULL THEN v_invoice_ids := array_append(v_invoice_ids, NEW.invoice_id); END IF;
    IF NEW.contract_id IS NOT NULL THEN v_contract_ids := array_append(v_contract_ids, NEW.contract_id); END IF;
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.invoice_id IS NOT NULL THEN v_invoice_ids := array_append(v_invoice_ids, OLD.invoice_id); END IF;
    IF OLD.contract_id IS NOT NULL THEN v_contract_ids := array_append(v_contract_ids, OLD.contract_id); END IF;
  END IF;

  FOR v_invoice_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_invoice_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
  END LOOP;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  FOR v_contract_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_contract_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    SELECT COALESCE(SUM(payment.amount), 0)
    INTO v_contract_paid
    FROM public.payments payment
    WHERE payment.contract_id = v_contract_id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt';

    UPDATE public.contracts contract
    SET
      total_paid = v_contract_paid,
      balance_due = GREATEST(COALESCE(contract.contract_amount, 0) - v_contract_paid, 0),
      payment_status = CASE
        WHEN v_contract_paid <= 0.01 THEN 'unpaid'
        WHEN v_contract_paid >= COALESCE(contract.contract_amount, 0) - 0.01 THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = now()
    WHERE contract.id = v_contract_id;
  END LOOP;
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_payment_financial_controls()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_total numeric := 0;
  v_existing_paid numeric := 0;
  v_allocated numeric := 0;
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.assert_financial_period_is_open(NEW.company_id, NEW.payment_date);

    SELECT COALESCE(SUM(allocation.amount), 0)
    INTO v_allocated
    FROM public.payment_allocations allocation
    WHERE allocation.payment_id = NEW.id AND allocation.is_active = true;
    IF v_allocated > COALESCE(NEW.amount, 0) + 0.01 THEN
      RAISE EXCEPTION 'Payment amount cannot be lower than active allocations' USING ERRCODE = 'P0001';
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.payment_status = 'completed'
       AND NEW.payment_status = 'completed'
       AND (
         NEW.amount IS DISTINCT FROM OLD.amount
         OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
         OR NEW.company_id IS DISTINCT FROM OLD.company_id
         OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
         OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
         OR NEW.contract_id IS DISTINCT FROM OLD.contract_id
       )
    THEN
      RAISE EXCEPTION 'Completed payments are immutable. Use the allocation command or cancel and re-create.'
        USING ERRCODE = 'P0001';
    END IF;

    IF NEW.payment_status = 'completed'
       AND NEW.invoice_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.payment_allocations allocation
         WHERE allocation.payment_id = NEW.id AND allocation.is_active = true
       )
    THEN
      SELECT invoice.total_amount INTO v_invoice_total
      FROM public.invoices invoice
      WHERE invoice.id = NEW.invoice_id AND invoice.company_id = NEW.company_id;
      v_existing_paid := public.canonical_invoice_paid_amount(NEW.invoice_id, NEW.id);
      IF COALESCE(v_invoice_total, 0) > 0
         AND v_existing_paid + COALESCE(NEW.amount, 0) > v_invoice_total + 0.01
      THEN
        RAISE EXCEPTION 'Payment would overpay invoice by QAR %',
          ROUND((v_existing_paid + COALESCE(NEW.amount, 0) - v_invoice_total)::numeric, 2)
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_payment_with_reversal(
  p_payment_id uuid,
  p_company_id uuid,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_original public.journal_entries%ROWTYPE;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_is_super_admin boolean := false;
  v_reversal_id uuid;
  v_reversal_number text;
  v_line_count integer := 0;
  v_already_cancelled boolean := false;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
  v_note text;
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL THEN
    RAISE EXCEPTION 'Payment id and company id are required' USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor IS NULL AND v_actor_role <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles role
      WHERE role.user_id = v_actor AND role.role::text = 'super_admin'
    ) INTO v_is_super_admin;
    IF NOT v_is_super_admin AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'You cannot cancel payments for another company' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT * INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id AND payment.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0001';
  END IF;

  v_already_cancelled := lower(COALESCE(v_payment.payment_status, '')) IN (
    'cancelled', 'canceled', 'void', 'voided', 'reversed'
  );

  SELECT * INTO v_original
  FROM public.journal_entries entry
  WHERE entry.company_id = p_company_id
    AND (
      entry.id = v_payment.journal_entry_id
      OR (entry.reference_type = 'payment' AND entry.reference_id = v_payment.id)
    )
  ORDER BY CASE WHEN entry.id = v_payment.journal_entry_id THEN 0 ELSE 1 END, entry.created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND AND lower(COALESCE(v_payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded') THEN
    RAISE EXCEPTION 'Completed payment has no accounting journal to reverse' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.assert_financial_period_is_open(p_company_id, CURRENT_DATE);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  IF v_original.id IS NOT NULL THEN
    v_reversal_id := v_original.reversal_entry_id;
    IF v_reversal_id IS NULL THEN
      SELECT entry.id INTO v_reversal_id
      FROM public.journal_entries entry
      WHERE entry.company_id = p_company_id
        AND entry.reference_type = 'payment_reversal'
        AND entry.reference_id = v_payment.id
      ORDER BY entry.created_at LIMIT 1;
    END IF;

    IF v_reversal_id IS NULL THEN
      SELECT COUNT(*) INTO v_line_count
      FROM public.journal_entry_lines line
      WHERE line.journal_entry_id = v_original.id;
      IF v_line_count < 2 THEN
        RAISE EXCEPTION 'Original payment journal has fewer than two lines and cannot be reversed automatically'
          USING ERRCODE = 'P0001';
      END IF;

      v_reversal_number := 'REV-PAY-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substring(v_payment.id::text, 1, 8);
      INSERT INTO public.journal_entries (
        company_id, entry_number, entry_date, reference_type, reference_id,
        description, total_debit, total_credit, status, created_by, created_at, updated_at
      ) VALUES (
        p_company_id, v_reversal_number, CURRENT_DATE, 'payment_reversal', v_payment.id,
        'Reversal of payment journal ' || COALESCE(v_original.entry_number, v_original.id::text),
        COALESCE(v_original.total_credit, 0), COALESCE(v_original.total_debit, 0),
        'draft', v_actor, now(), now()
      ) RETURNING id INTO v_reversal_id;

      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, debit_amount, credit_amount,
        line_description, line_number, cost_center_id, asset_id, employee_id
      )
      SELECT
        v_reversal_id, line.account_id,
        COALESCE(line.credit_amount, 0), COALESCE(line.debit_amount, 0),
        'Reversal - ' || COALESCE(line.line_description, v_original.entry_number, 'payment'),
        ROW_NUMBER() OVER (ORDER BY line.line_number, line.id),
        line.cost_center_id, line.asset_id, line.employee_id
      FROM public.journal_entry_lines line
      WHERE line.journal_entry_id = v_original.id;

      UPDATE public.journal_entries
      SET status = 'posted', posted_by = v_actor, posted_at = now(), updated_at = now()
      WHERE id = v_reversal_id AND company_id = p_company_id;
    END IF;

    UPDATE public.journal_entries
    SET status = 'reversed', reversal_entry_id = v_reversal_id,
        reversed_by = v_actor, reversed_at = now(), updated_at = now()
    WHERE id = v_original.id AND company_id = p_company_id;
  END IF;

  v_note := CONCAT(
    'Payment cancelled through atomic accounting reversal on ', now()::text,
    CASE WHEN NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL THEN '' ELSE E'\nReason: ' || BTRIM(p_reason) END,
    CASE WHEN v_reversal_id IS NULL THEN '' ELSE E'\nReversal entry: ' || v_reversal_id::text END
  );

  UPDATE public.payments payment
  SET payment_status = 'cancelled', allocation_status = NULL,
      processing_status = 'completed',
      processing_notes = CONCAT_WS(E'\n', NULLIF(payment.processing_notes, ''), v_note),
      updated_at = now()
  WHERE payment.id = v_payment.id AND payment.company_id = p_company_id;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'status', 'cancelled',
    'already_cancelled', v_already_cancelled,
    'original_journal_entry_id', v_original.id,
    'reversal_entry_id', v_reversal_id
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid)
  TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.recalculate_contract_financial_state(uuid);
DROP FUNCTION IF EXISTS public.canonical_contract_paid_amount(uuid);

DROP POLICY IF EXISTS payment_cancellation_audit_company_select
  ON public.payment_cancellation_audit;
DROP TABLE public.payment_cancellation_audit;
