-- Read-only production snapshots inspected 2026-09-06; synthetic test databases only.
-- No production records, credentials or side effects are included.

-- journal_entries_are_exact_reversals prosrc md5: ab34ca535bc79a37b8f38c215c448843
CREATE OR REPLACE FUNCTION public.journal_entries_are_exact_reversals(p_original_entry_id uuid, p_reversal_entry_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH entry_pair AS (
    SELECT
      original.id AS original_id,
      reversal.id AS reversal_id
    FROM public.journal_entries original
    JOIN public.journal_entries reversal
      ON reversal.id = p_reversal_entry_id
     AND reversal.company_id = original.company_id
    WHERE original.id = p_original_entry_id
      AND lower(COALESCE(reversal.status::text, '')) = 'posted'
      AND round(COALESCE(original.total_debit, 0), 2) = round(COALESCE(reversal.total_credit, 0), 2)
      AND round(COALESCE(original.total_credit, 0), 2) = round(COALESCE(reversal.total_debit, 0), 2)
  ), line_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE line.journal_entry_id = p_original_entry_id) AS original_count,
      COUNT(*) FILTER (WHERE line.journal_entry_id = p_reversal_entry_id) AS reversal_count
    FROM public.journal_entry_lines line
    WHERE line.journal_entry_id IN (p_original_entry_id, p_reversal_entry_id)
  ), line_deltas AS (
    SELECT
      line.account_id,
      line.cost_center_id,
      line.asset_id,
      line.employee_id,
      SUM(CASE
        WHEN line.journal_entry_id = p_original_entry_id THEN COALESCE(line.debit_amount, 0)
        ELSE -COALESCE(line.credit_amount, 0)
      END) AS debit_delta,
      SUM(CASE
        WHEN line.journal_entry_id = p_original_entry_id THEN COALESCE(line.credit_amount, 0)
        ELSE -COALESCE(line.debit_amount, 0)
      END) AS credit_delta
    FROM public.journal_entry_lines line
    WHERE line.journal_entry_id IN (p_original_entry_id, p_reversal_entry_id)
    GROUP BY line.account_id, line.cost_center_id, line.asset_id, line.employee_id
  )
  SELECT
    EXISTS (SELECT 1 FROM entry_pair)
    AND COALESCE((SELECT original_count >= 2 AND reversal_count >= 2 FROM line_counts), false)
    AND NOT EXISTS (
      SELECT 1
      FROM line_deltas
      WHERE abs(debit_delta) >= 0.005
         OR abs(credit_delta) >= 0.005
    );
$function$;

-- enforce_journal_entry_financial_controls prosrc md5: 1209532f284ce1061fdf3c27d7215042
CREATE OR REPLACE FUNCTION public.enforce_journal_entry_financial_controls()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.assert_financial_period_is_open(NEW.company_id, NEW.entry_date);

    IF NEW.total_debit IS NULL OR NEW.total_credit IS NULL THEN
      RAISE EXCEPTION 'Journal entry total_debit and total_credit must not be NULL. Entry ID: %', COALESCE(NEW.id::text, 'N/A')
        USING ERRCODE = 'not_null_violation';
    END IF;

    IF ABS(NEW.total_debit - NEW.total_credit) > 0.01 THEN
      RAISE EXCEPTION 'Journal entry must be balanced before saving. Debit: %, Credit: %', NEW.total_debit, NEW.total_credit
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
    AND LOWER(COALESCE(OLD.status, '')) = 'posted'
    AND (
      NEW.entry_number IS DISTINCT FROM OLD.entry_number OR
      NEW.entry_date IS DISTINCT FROM OLD.entry_date OR
      NEW.company_id IS DISTINCT FROM OLD.company_id OR
      NEW.total_debit IS DISTINCT FROM OLD.total_debit OR
      NEW.total_credit IS DISTINCT FROM OLD.total_credit OR
      NEW.reference_type IS DISTINCT FROM OLD.reference_type OR
      NEW.reference_id IS DISTINCT FROM OLD.reference_id
    )
  THEN
    RAISE EXCEPTION 'Posted journal entries are immutable. Create a reversal entry instead.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

-- enforce_posted_journal_reversal_semantics prosrc md5: f5a3964aadafdfa8cdad21906bc5b875
CREATE OR REPLACE FUNCTION public.enforce_posted_journal_reversal_semantics()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(COALESCE(NEW.status::text, '')) <> 'reversed' THEN
    RETURN NEW;
  END IF;

  IF NEW.reversal_entry_id IS NULL THEN
    RAISE EXCEPTION 'A journal cannot be marked reversed without an exact posted reversal entry. Use reverse_journal_entry().'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.journal_entries_are_exact_reversals(NEW.id, NEW.reversal_entry_id) THEN
    RAISE EXCEPTION 'The linked journal reversal must be posted and exactly offset every account and accounting dimension.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.financial_data_repair_snapshots (
    migration_version,
    repair_key,
    company_id,
    entity_type,
    entity_id,
    before_value,
    after_value,
    metadata
  ) VALUES (
    '20260712052100',
    'enforce_posted_journal_reversal_pair',
    NEW.company_id,
    'journal_entry',
    NEW.id,
    jsonb_build_object(
      'status', 'reversed',
      'reversal_entry_id', NEW.reversal_entry_id,
      'reversed_at', COALESCE(NEW.reversed_at, now()),
      'reversed_by', NEW.reversed_by,
      'updated_at', NEW.updated_at
    ),
    jsonb_build_object(
      'status', 'posted',
      'reversal_entry_id', NEW.reversal_entry_id,
      'reversed_at', COALESCE(NEW.reversed_at, now()),
      'reversed_by', NEW.reversed_by
    ),
    jsonb_build_object('normalized_on_write', true)
  )
  ON CONFLICT (migration_version, entity_type, entity_id) DO NOTHING;

  NEW.status := 'posted';
  NEW.reversed_at := COALESCE(NEW.reversed_at, now());
  RETURN NEW;
END;
$function$;

-- validate_journal_entry_line_account prosrc md5: a9f3f40ae34180e3b126891901d7fcb3
CREATE OR REPLACE FUNCTION public.validate_journal_entry_line_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE account_info RECORD; BEGIN SELECT coa.account_level, coa.is_header, coa.account_name, coa.account_name_ar INTO account_info FROM public.chart_of_accounts coa WHERE coa.id = NEW.account_id AND coa.is_active = true; IF NOT FOUND THEN RAISE EXCEPTION 'الحساب المحاسبي غير موجود أو غير نشط' USING ERRCODE = 'check_violation', HINT = 'تأكد من أن الحساب المحاسبي موجود ونشط'; END IF; IF account_info.is_header = true THEN RAISE EXCEPTION 'لا يمكن إجراء قيود على الحسابات الرئيسية: %', COALESCE(account_info.account_name_ar, account_info.account_name) USING ERRCODE = 'check_violation', HINT = 'يُسمح بالقيود فقط على الحسابات الفرعية'; END IF; RETURN NEW; END; $function$;

-- cancel_payment_with_reversal prosrc md5: 439d7fdd345abef0a34ea0e3fd4d9cce
CREATE OR REPLACE FUNCTION public.cancel_payment_with_reversal(p_payment_id uuid, p_company_id uuid, p_reason text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_result jsonb;
  v_schedule_result jsonb;
  v_invoice_id uuid;
  v_contract_id uuid;
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_contract_ids uuid[] := ARRAY[]::uuid[];
  v_schedule_results jsonb := '[]'::jsonb;
BEGIN
  -- Read the identity graph before the accounting implementation voids active
  -- allocations. The delegated function performs the authorization checks,
  -- journal reversal, bank reversal, audit write, and payment cancellation.
  SELECT payment.*
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id
    AND payment.company_id = p_company_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_payment.invoice_id IS NOT NULL THEN
      v_invoice_ids := array_append(v_invoice_ids, v_payment.invoice_id);
    END IF;
    IF v_payment.contract_id IS NOT NULL THEN
      v_contract_ids := array_append(v_contract_ids, v_payment.contract_id);
    END IF;

    SELECT v_invoice_ids || COALESCE(
      array_agg(DISTINCT allocation.target_id),
      ARRAY[]::uuid[]
    )
    INTO v_invoice_ids
    FROM public.payment_allocations allocation
    WHERE allocation.company_id = p_company_id
      AND allocation.payment_id = p_payment_id
      AND allocation.allocation_type = 'invoice';
  END IF;

  v_result := public.cancel_payment_with_reversal_before_invoice_restore(
    p_payment_id,
    p_company_id,
    p_reason,
    p_actor_id
  );

  FOR v_invoice_id IN
    SELECT DISTINCT candidate.id
    FROM unnest(COALESCE(v_invoice_ids, ARRAY[]::uuid[])) candidate(id)
    JOIN public.invoices invoice
      ON invoice.id = candidate.id
     AND invoice.company_id = p_company_id
    WHERE candidate.id IS NOT NULL
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);

    SELECT invoice.contract_id
    INTO v_contract_id
    FROM public.invoices invoice
    WHERE invoice.id = v_invoice_id
      AND invoice.company_id = p_company_id;

    IF v_contract_id IS NOT NULL
       AND NOT (v_contract_id = ANY(COALESCE(v_contract_ids, ARRAY[]::uuid[])))
    THEN
      v_contract_ids := array_append(v_contract_ids, v_contract_id);
    END IF;
  END LOOP;

  FOR v_contract_id IN
    SELECT DISTINCT candidate.id
    FROM unnest(COALESCE(v_contract_ids, ARRAY[]::uuid[])) candidate(id)
    JOIN public.contracts contract
      ON contract.id = candidate.id
     AND contract.company_id = p_company_id
    WHERE candidate.id IS NOT NULL
  LOOP
    v_schedule_result := public.reconcile_contract_rental_schedule_invoice_state(
      p_company_id,
      v_contract_id,
      v_invoice_ids
    );
    v_schedule_results := v_schedule_results || jsonb_build_array(
      jsonb_build_object(
        'contract_id', v_contract_id,
        'result', v_schedule_result
      )
    );
    PERFORM public.recalculate_contract_financial_state(v_contract_id);
  END LOOP;

  RETURN COALESCE(v_result, '{}'::jsonb) || jsonb_build_object(
    'restored_original_invoice_ids', to_jsonb(COALESCE(v_invoice_ids, ARRAY[]::uuid[])),
    'schedule_reconciliation', v_schedule_results,
    'created_invoice_count', 0
  );
END;
$function$;

-- reverse_journal_entry prosrc md5: 74b039cab01a7b05e28cf77302ac15f8
CREATE OR REPLACE FUNCTION public.reverse_journal_entry(entry_id uuid, reversal_reason text, reversed_by_user uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_original public.journal_entries%ROWTYPE;
  v_reversal_id uuid;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_line_count integer := 0;
  v_approved_internal_reversal boolean :=
    COALESCE(current_setting('app.approved_invoice_cancellation', true), '') = 'on';
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF entry_id IS NULL OR NULLIF(BTRIM(COALESCE(reversal_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Journal entry and reversal reason are required'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN reversed_by_user ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR reversed_by_user IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT *
  INTO v_original
  FROM public.journal_entries entry
  WHERE entry.id = entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' AND NOT v_approved_internal_reversal THEN
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      v_original.company_id,
      ARRAY['finance.journal.reverse'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to reverse journal entries for this company'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF lower(COALESCE(v_original.status::text, '')) <> 'posted' THEN
    RAISE EXCEPTION 'Only posted journal entries can be reversed'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_original.reference_type = 'journal_reversal' THEN
    RAISE EXCEPTION 'A reversal entry cannot itself be reversed; reverse the correcting business transaction instead'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_original.reversal_entry_id IS NOT NULL THEN
    IF NOT public.journal_entries_are_exact_reversals(v_original.id, v_original.reversal_entry_id) THEN
      RAISE EXCEPTION 'The linked reversal is not an exact posted opposite of the original journal'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN v_original.reversal_entry_id;
  END IF;

  SELECT entry.id
  INTO v_reversal_id
  FROM public.journal_entries entry
  WHERE entry.company_id = v_original.company_id
    AND entry.reference_type = 'journal_reversal'
    AND entry.reference_id = v_original.id
  ORDER BY entry.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_reversal_id IS NOT NULL THEN
    IF NOT public.journal_entries_are_exact_reversals(v_original.id, v_reversal_id) THEN
      RAISE EXCEPTION 'An orphan journal reversal exists but does not exactly offset the original'
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.journal_entries entry
    SET
      status = 'reversed',
      reversal_entry_id = v_reversal_id,
      reversed_by = COALESCE(entry.reversed_by, v_actor),
      reversed_at = COALESCE(entry.reversed_at, now()),
      updated_at = now()
    WHERE entry.id = v_original.id;
    RETURN v_reversal_id;
  END IF;

  SELECT COUNT(*)::integer
  INTO v_line_count
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_original.id;

  IF v_line_count < 2 THEN
    RAISE EXCEPTION 'Journal entry has fewer than two lines and cannot be reversed automatically'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.assert_financial_period_is_open(v_original.company_id, CURRENT_DATE);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  INSERT INTO public.journal_entries (
    company_id,
    entry_number,
    entry_date,
    reference_type,
    reference_id,
    description,
    total_debit,
    total_credit,
    status,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_original.company_id,
    'REV-JE-' || v_original.id::text,
    CURRENT_DATE,
    'journal_reversal',
    v_original.id,
    'Reversal of ' || COALESCE(v_original.entry_number, v_original.id::text) ||
      ' - ' || BTRIM(reversal_reason),
    COALESCE(v_original.total_credit, 0),
    COALESCE(v_original.total_debit, 0),
    'draft',
    v_actor,
    now(),
    now()
  )
  RETURNING id INTO v_reversal_id;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id,
    account_id,
    debit_amount,
    credit_amount,
    line_description,
    line_number,
    cost_center_id,
    asset_id,
    employee_id
  )
  SELECT
    v_reversal_id,
    line.account_id,
    COALESCE(line.credit_amount, 0),
    COALESCE(line.debit_amount, 0),
    'Reversal - ' || COALESCE(line.line_description, v_original.entry_number, 'journal'),
    ROW_NUMBER() OVER (ORDER BY line.line_number, line.id),
    line.cost_center_id,
    line.asset_id,
    line.employee_id
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_original.id;

  UPDATE public.journal_entries entry
  SET
    status = 'posted',
    posted_by = v_actor,
    posted_at = now(),
    updated_at = now()
  WHERE entry.id = v_reversal_id;

  UPDATE public.journal_entries entry
  SET
    status = 'reversed',
    reversal_entry_id = v_reversal_id,
    reversed_by = v_actor,
    reversed_at = now(),
    updated_at = now()
  WHERE entry.id = v_original.id;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RETURN v_reversal_id;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$function$;

-- reverse_payment_bank_transaction prosrc md5: 764cf5e6eab2b5bd1379254b95257df5
CREATE OR REPLACE FUNCTION public.reverse_payment_bank_transaction(payment_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_original public.bank_transactions%ROWTYPE;
  v_existing_reversal public.bank_transactions%ROWTYPE;
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_reversal_id uuid;
  v_balance numeric;
BEGIN
  SELECT *
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = payment_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      v_payment.company_id,
      ARRAY['finance.payment.cancel', 'payments.delete'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );

    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to reverse the payment bank transaction'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT *
  INTO v_original
  FROM public.bank_transactions transaction
  WHERE transaction.company_id = v_payment.company_id
    AND transaction.payment_id = v_payment.id
    AND transaction.reversal_of_transaction_id IS NULL
  ORDER BY transaction.created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT *
    INTO v_original
    FROM public.bank_transactions transaction
    WHERE transaction.company_id = v_payment.company_id
      AND transaction.payment_id IS NULL
      AND transaction.reversal_of_transaction_id IS NULL
      AND transaction.reference_number IN (v_payment.payment_number, v_payment.reference_number)
      AND transaction.transaction_type IN ('deposit', 'withdrawal')
      AND (v_payment.bank_id IS NULL OR transaction.bank_id = v_payment.bank_id)
      AND abs(COALESCE(transaction.amount, 0) - COALESCE(v_payment.amount, 0)) < 0.005
    ORDER BY CASE WHEN lower(COALESCE(transaction.status, '')) = 'completed' THEN 0 ELSE 1 END,
      transaction.created_at
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.bank_transactions transaction
      SET
        payment_id = v_payment.id,
        journal_entry_id = COALESCE(transaction.journal_entry_id, v_payment.journal_entry_id),
        updated_at = now()
      WHERE transaction.id = v_original.id;
      v_original.payment_id := v_payment.id;
    END IF;
  END IF;

  IF v_original.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_existing_reversal
  FROM public.bank_transactions transaction
  WHERE transaction.reversal_of_transaction_id = v_original.id
  ORDER BY transaction.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_existing_reversal.id IS NOT NULL THEN
    IF lower(COALESCE(v_existing_reversal.status, '')) <> 'completed'
       OR v_existing_reversal.payment_id IS DISTINCT FROM v_payment.id
       OR v_existing_reversal.bank_id IS DISTINCT FROM v_original.bank_id
       OR abs(COALESCE(v_existing_reversal.amount, 0) - COALESCE(v_original.amount, 0)) >= 0.005
       OR v_existing_reversal.transaction_type IS DISTINCT FROM (
         CASE WHEN v_original.transaction_type = 'withdrawal' THEN 'deposit' ELSE 'withdrawal' END
       )
    THEN
      RAISE EXCEPTION 'Existing payment bank reversal is inconsistent'
        USING ERRCODE = 'P0001';
    END IF;

    IF lower(COALESCE(v_original.status, '')) <> 'completed' THEN
      UPDATE public.bank_transactions transaction
      SET status = 'completed', updated_at = now()
      WHERE transaction.id = v_original.id;
    END IF;
    PERFORM public.recalculate_bank_balance(v_original.bank_id);
    RETURN v_existing_reversal.id;
  END IF;

  IF lower(COALESCE(v_original.status, '')) <> 'completed' THEN
    UPDATE public.bank_transactions transaction
    SET status = 'completed', updated_at = now()
    WHERE transaction.id = v_original.id;
  END IF;

  PERFORM public.assert_financial_period_is_open(v_payment.company_id, CURRENT_DATE);

  SELECT COALESCE(bank.current_balance, bank.opening_balance, 0)
  INTO v_balance
  FROM public.banks bank
  WHERE bank.id = v_original.bank_id
  FOR UPDATE;

  INSERT INTO public.bank_transactions (
    company_id,
    bank_id,
    transaction_number,
    transaction_date,
    transaction_type,
    amount,
    balance_after,
    description,
    reference_number,
    check_number,
    status,
    created_by,
    journal_entry_id,
    payment_id,
    reversal_of_transaction_id
  ) VALUES (
    v_payment.company_id,
    v_original.bank_id,
    'REV-PAY-' || v_payment.id::text,
    CURRENT_DATE,
    CASE WHEN v_original.transaction_type = 'withdrawal' THEN 'deposit' ELSE 'withdrawal' END,
    v_original.amount,
    v_balance,
    'Reversal of payment bank transaction ' || COALESCE(v_original.transaction_number, v_original.id::text),
    'REV-' || COALESCE(v_payment.payment_number, v_original.reference_number, v_payment.id::text),
    v_original.check_number,
    'completed',
    COALESCE(v_actor, v_payment.created_by),
    v_payment.journal_entry_id,
    v_payment.id,
    v_original.id
  )
  RETURNING id INTO v_reversal_id;

  v_balance := public.recalculate_bank_balance(v_original.bank_id);
  UPDATE public.bank_transactions transaction
  SET balance_after = v_balance, updated_at = now()
  WHERE transaction.id = v_reversal_id;

  RETURN v_reversal_id;
END;
$function$;

-- cancel_payment_with_reversal_before_invoice_restore prosrc md5: 707b9d611cb8a9f5bf616e709b57aa84
CREATE OR REPLACE FUNCTION public.cancel_payment_with_reversal_before_invoice_restore(p_payment_id uuid, p_company_id uuid, p_reason text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_already_cancelled boolean := false;
  v_original_journal_count integer := 0;
  v_journal_id uuid;
  v_reversal_id uuid;
  v_reversal_ids uuid[] := ARRAY[]::uuid[];
  v_bank_reversal_id uuid;
  v_invoice_id uuid;
  v_contract_id uuid;
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_contract_ids uuid[] := ARRAY[]::uuid[];
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
  v_previous_batch text := COALESCE(current_setting('app.payment_allocation_batch_mode', true), '');
  v_note text;
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Payment, company, and cancellation reason are required'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;

    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.payment.cancel', 'payments.delete'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );

    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to cancel payments for this company'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id
    AND payment.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found in company' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role'
     AND v_payment.created_by IS NOT NULL
     AND v_payment.created_by = v_actor
     AND NOT public.is_finance_action_authorized(
       v_actor,
       p_company_id,
       ARRAY['finance.payment.cancel_own'],
       ARRAY['super_admin', 'company_admin', 'accountant']
     )
  THEN
    RAISE EXCEPTION 'Payment creator cannot cancel the same payment without the controlled override permission'
      USING ERRCODE = '42501';
  END IF;

  v_already_cancelled := lower(COALESCE(v_payment.payment_status, '')) IN (
    'cancelled', 'canceled', 'void', 'voided', 'reversed'
  );

  IF v_payment.invoice_id IS NOT NULL THEN
    v_invoice_ids := array_append(v_invoice_ids, v_payment.invoice_id);
  END IF;
  IF v_payment.contract_id IS NOT NULL THEN
    v_contract_ids := array_append(v_contract_ids, v_payment.contract_id);
  END IF;

  SELECT v_invoice_ids || COALESCE(array_agg(DISTINCT allocation.target_id), ARRAY[]::uuid[])
  INTO v_invoice_ids
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = v_payment.id
    AND allocation.allocation_type = 'invoice';

  SELECT COUNT(DISTINCT entry.id)::integer
  INTO v_original_journal_count
  FROM public.journal_entries entry
  WHERE entry.company_id = p_company_id
    AND lower(COALESCE(entry.status::text, '')) IN ('posted', 'reversed')
    AND (
      entry.id = v_payment.journal_entry_id
      OR (entry.reference_type = 'payment' AND entry.reference_id = v_payment.id)
    );

  IF NOT v_already_cancelled
     AND lower(COALESCE(v_payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
     AND v_original_journal_count < 1
  THEN
    RAISE EXCEPTION 'Completed payment has no accounting journal to reverse'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);

  FOR v_journal_id IN
    SELECT DISTINCT entry.id
    FROM public.journal_entries entry
    WHERE entry.company_id = p_company_id
      AND lower(COALESCE(entry.status::text, '')) IN ('posted', 'reversed')
      AND (
        entry.id = v_payment.journal_entry_id
        OR (
          entry.reference_id = v_payment.id
          AND entry.reference_type IN ('payment', 'payment_reclassification')
        )
        OR (
          entry.reference_type = 'payment_allocation'
          AND EXISTS (
            SELECT 1
            FROM public.payment_allocation_change_log change_log
            WHERE change_log.id = entry.reference_id
              AND change_log.payment_id = v_payment.id
          )
        )
      )
    ORDER BY entry.id
  LOOP
    v_reversal_id := public.reverse_journal_entry(
      v_journal_id,
      'Payment cancellation ' || COALESCE(v_payment.payment_number, v_payment.id::text) || ': ' || BTRIM(p_reason),
      v_actor
    );
    IF v_reversal_id IS NOT NULL AND NOT (v_reversal_id = ANY(v_reversal_ids)) THEN
      v_reversal_ids := array_append(v_reversal_ids, v_reversal_id);
    END IF;
  END LOOP;

  UPDATE public.payment_allocations allocation
  SET
    is_active = false,
    voided_at = COALESCE(allocation.voided_at, now()),
    voided_by = COALESCE(allocation.voided_by, v_actor),
    void_reason = COALESCE(NULLIF(allocation.void_reason, ''), 'Payment cancelled: ' || BTRIM(p_reason)),
    updated_at = now()
  WHERE allocation.payment_id = v_payment.id
    AND allocation.is_active = true;

  v_note := 'Payment cancelled atomically on ' || now()::text || E'\nReason: ' || BTRIM(p_reason);
  UPDATE public.payments payment
  SET
    payment_status = 'cancelled',
    allocation_status = 'cancelled',
    processing_status = 'completed',
    processing_notes = CONCAT_WS(E'\n', NULLIF(payment.processing_notes, ''), v_note),
    updated_at = now()
  WHERE payment.id = v_payment.id
    AND payment.company_id = p_company_id;

  v_bank_reversal_id := public.reverse_payment_bank_transaction(v_payment.id);

  PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  FOR v_invoice_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_invoice_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
    SELECT invoice.contract_id INTO v_contract_id
    FROM public.invoices invoice WHERE invoice.id = v_invoice_id;
    IF v_contract_id IS NOT NULL THEN
      v_contract_ids := array_append(v_contract_ids, v_contract_id);
    END IF;
  END LOOP;

  FOR v_contract_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_contract_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_contract_financial_state(v_contract_id);
  END LOOP;

  INSERT INTO public.payment_cancellation_audit (
    company_id,
    payment_id,
    status_before,
    reason,
    actor_id,
    already_cancelled,
    reversal_entry_ids,
    bank_reversal_transaction_id,
    affected_invoice_ids,
    affected_contract_ids
  ) VALUES (
    p_company_id,
    v_payment.id,
    COALESCE(v_payment.payment_status, ''),
    BTRIM(p_reason),
    v_actor,
    v_already_cancelled,
    v_reversal_ids,
    v_bank_reversal_id,
    v_invoice_ids,
    v_contract_ids
  );

  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'status', 'cancelled',
    'already_cancelled', v_already_cancelled,
    'reversal_entry_ids', to_jsonb(v_reversal_ids),
    'bank_reversal_transaction_id', v_bank_reversal_id,
    'affected_invoice_ids', to_jsonb(v_invoice_ids),
    'affected_contract_ids', to_jsonb(v_contract_ids)
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$function$;

