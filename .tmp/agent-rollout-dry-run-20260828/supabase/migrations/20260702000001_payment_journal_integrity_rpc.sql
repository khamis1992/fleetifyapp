-- Centralize payment journal creation and repair.
-- This keeps Excel imports and manual payment entry from accepting completed
-- receipt payments without a posted accounting journal.

CREATE OR REPLACE FUNCTION public.ensure_payment_journal_entry(
  p_payment_id uuid,
  p_company_id uuid,
  p_actor_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_existing_journal_id uuid;
  v_cash_account_id uuid;
  v_receivable_account_id uuid;
  v_entry_number text;
  v_amount numeric;
  v_actor uuid;
  v_actor_role text;
  v_user_company_id uuid;
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL THEN
    RAISE EXCEPTION 'Payment or company id is missing.'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor_role := COALESCE(auth.role(), '');
  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;

  IF v_actor IS NULL AND v_actor_role <> 'service_role' THEN
    RAISE EXCEPTION 'You must be signed in before repairing a payment journal.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    v_user_company_id := public.get_user_company_id();

    IF v_user_company_id IS NULL THEN
      RAISE EXCEPTION 'Could not determine the current user company.'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_user_company_id IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'You are not allowed to repair payment journals for this company.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment was not found for this company.'
      USING ERRCODE = 'P0001';
  END IF;

  IF LOWER(COALESCE(v_payment.payment_status::text, '')) <> 'completed' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'skipped_not_completed',
      'payment_id', v_payment.id,
      'journal_entry_id', v_payment.journal_entry_id
    );
  END IF;

  IF LOWER(COALESCE(v_payment.transaction_type::text, 'receipt')) <> 'receipt' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'skipped_non_receipt',
      'payment_id', v_payment.id,
      'journal_entry_id', v_payment.journal_entry_id
    );
  END IF;

  v_amount := COALESCE(v_payment.amount, 0);
  IF v_amount <= 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'skipped_zero_amount',
      'payment_id', v_payment.id,
      'journal_entry_id', v_payment.journal_entry_id
    );
  END IF;

  IF v_payment.journal_entry_id IS NOT NULL THEN
    PERFORM 1
    FROM public.journal_entries
    WHERE id = v_payment.journal_entry_id
      AND company_id = p_company_id;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'status', 'already_linked',
        'payment_id', v_payment.id,
        'journal_entry_id', v_payment.journal_entry_id
      );
    END IF;
  END IF;

  SELECT id
  INTO v_existing_journal_id
  FROM public.journal_entries
  WHERE company_id = p_company_id
    AND reference_type = 'payment'
    AND reference_id = v_payment.id
  ORDER BY created_at NULLS LAST, id
  LIMIT 1;

  IF v_existing_journal_id IS NOT NULL THEN
    BEGIN
      UPDATE public.payments
      SET journal_entry_id = v_existing_journal_id,
          updated_at = now()
      WHERE id = v_payment.id
        AND company_id = p_company_id
        AND journal_entry_id IS NULL;
    EXCEPTION WHEN OTHERS THEN
      EXECUTE 'ALTER TABLE public.payments DISABLE TRIGGER USER';
      UPDATE public.payments
      SET journal_entry_id = v_existing_journal_id,
          updated_at = now()
      WHERE id = v_payment.id
        AND company_id = p_company_id
        AND journal_entry_id IS NULL;
      EXECUTE 'ALTER TABLE public.payments ENABLE TRIGGER USER';
    END;

    RETURN jsonb_build_object(
      'ok', true,
      'status', 'relinked_existing_reference',
      'payment_id', v_payment.id,
      'journal_entry_id', v_existing_journal_id
    );
  END IF;

  IF v_payment.account_id IS NOT NULL THEN
    SELECT id
    INTO v_cash_account_id
    FROM public.chart_of_accounts
    WHERE id = v_payment.account_id
      AND company_id = p_company_id
      AND is_active = true
      AND COALESCE(is_header, false) = false
    LIMIT 1;
  END IF;

  IF v_cash_account_id IS NULL THEN
    SELECT id
    INTO v_cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = p_company_id
      AND is_active = true
      AND COALESCE(is_header, false) = false
      AND account_code IN ('11151', '11111', '11101', '11201', '1120101', '1010')
    ORDER BY array_position(
      ARRAY['11151', '11111', '11101', '11201', '1120101', '1010']::text[],
      account_code::text
    )
    LIMIT 1;
  END IF;

  SELECT id
  INTO v_receivable_account_id
  FROM public.chart_of_accounts
  WHERE company_id = p_company_id
    AND is_active = true
    AND COALESCE(is_header, false) = false
    AND account_code IN ('11211', '11212', '1130301', '11301', '12101', '1201')
  ORDER BY array_position(
    ARRAY['11211', '11212', '1130301', '11301', '12101', '1201']::text[],
    account_code::text
  )
  LIMIT 1;

  IF v_cash_account_id IS NULL OR v_receivable_account_id IS NULL THEN
    RAISE EXCEPTION 'Payment journal accounts are not configured. Required: cash/bank and receivables accounts.'
      USING ERRCODE = 'P0001';
  END IF;

  v_entry_number := 'JE-PAY-' || COALESCE(v_payment.payment_number, SUBSTRING(v_payment.id::text, 1, 8));

  IF EXISTS (
    SELECT 1
    FROM public.journal_entries
    WHERE company_id = p_company_id
      AND entry_number = v_entry_number
  ) THEN
    v_entry_number := v_entry_number || '-' || SUBSTRING(v_payment.id::text, 1, 8);
  END IF;

  INSERT INTO public.journal_entries (
    company_id,
    entry_number,
    entry_date,
    status,
    description,
    reference_type,
    reference_id,
    total_debit,
    total_credit,
    created_by
  ) VALUES (
    p_company_id,
    v_entry_number,
    COALESCE(v_payment.payment_date, CURRENT_DATE),
    'draft',
    'Payment receipt journal ' || COALESCE(v_payment.payment_number, v_payment.id::text),
    'payment',
    v_payment.id,
    v_amount,
    v_amount,
    v_actor
  )
  RETURNING id INTO v_existing_journal_id;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id,
    account_id,
    line_number,
    line_description,
    debit_amount,
    credit_amount
  )
  VALUES
    (
      v_existing_journal_id,
      v_cash_account_id,
      1,
      'Payment received - ' || COALESCE(v_payment.payment_number, v_payment.id::text),
      v_amount,
      0
    ),
    (
      v_existing_journal_id,
      v_receivable_account_id,
      2,
      'Receivables settlement - ' || COALESCE(v_payment.payment_number, v_payment.id::text),
      0,
      v_amount
    );

  UPDATE public.journal_entries
  SET status = 'posted',
      posted_by = v_actor,
      posted_at = now(),
      updated_at = now()
  WHERE id = v_existing_journal_id
    AND company_id = p_company_id;

  BEGIN
    UPDATE public.payments
    SET journal_entry_id = v_existing_journal_id,
        updated_at = now()
    WHERE id = v_payment.id
      AND company_id = p_company_id;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'ALTER TABLE public.payments DISABLE TRIGGER USER';
    UPDATE public.payments
    SET journal_entry_id = v_existing_journal_id,
        updated_at = now()
    WHERE id = v_payment.id
      AND company_id = p_company_id;
    EXECUTE 'ALTER TABLE public.payments ENABLE TRIGGER USER';
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'created',
    'payment_id', v_payment.id,
    'journal_entry_id', v_existing_journal_id
  );
EXCEPTION
  WHEN OTHERS THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.payments ENABLE TRIGGER USER';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RAISE;
END;
$$;
CREATE OR REPLACE FUNCTION public.repair_payment_journal_integrity(
  p_company_id uuid,
  p_apply boolean DEFAULT false,
  p_limit integer DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment record;
  v_existing_journal_id uuid;
  v_result jsonb;
  v_needs_relink integer := 0;
  v_needs_create integer := 0;
  v_relinked integer := 0;
  v_created integer := 0;
  v_failed integer := 0;
  v_processed integer := 0;
  v_failures jsonb := '[]'::jsonb;
  v_sample jsonb := '[]'::jsonb;
  v_actor_role text;
  v_user_company_id uuid;
BEGIN
  v_actor_role := COALESCE(auth.role(), '');

  IF auth.uid() IS NULL AND v_actor_role <> 'service_role' THEN
    RAISE EXCEPTION 'You must be signed in before repairing payment journals.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    v_user_company_id := public.get_user_company_id();

    IF v_user_company_id IS NULL THEN
      RAISE EXCEPTION 'Could not determine the current user company.'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_user_company_id IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'You are not allowed to repair payment journals for this company.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  FOR v_payment IN
    SELECT p.id, p.payment_number, p.amount, p.payment_date
    FROM public.payments p
    WHERE p.company_id = p_company_id
      AND LOWER(COALESCE(p.payment_status::text, '')) = 'completed'
      AND LOWER(COALESCE(p.transaction_type::text, 'receipt')) = 'receipt'
      AND COALESCE(p.amount, 0) > 0
      AND p.journal_entry_id IS NULL
    ORDER BY p.created_at NULLS LAST, p.id
    LIMIT GREATEST(COALESCE(p_limit, 200), 1)
  LOOP
    SELECT je.id
    INTO v_existing_journal_id
    FROM public.journal_entries je
    WHERE je.company_id = p_company_id
      AND je.reference_type = 'payment'
      AND je.reference_id = v_payment.id
    ORDER BY je.created_at NULLS LAST, je.id
    LIMIT 1;

    IF v_existing_journal_id IS NULL THEN
      v_needs_create := v_needs_create + 1;
    ELSE
      v_needs_relink := v_needs_relink + 1;
    END IF;

    IF jsonb_array_length(v_sample) < 20 THEN
      v_sample := v_sample || jsonb_build_array(jsonb_build_object(
        'payment_id', v_payment.id,
        'payment_number', v_payment.payment_number,
        'amount', v_payment.amount,
        'payment_date', v_payment.payment_date,
        'action', CASE WHEN v_existing_journal_id IS NULL THEN 'create' ELSE 'relink' END,
        'existing_journal_entry_id', v_existing_journal_id
      ));
    END IF;

    IF p_apply THEN
      BEGIN
        v_result := public.ensure_payment_journal_entry(v_payment.id, p_company_id, auth.uid());
        v_processed := v_processed + 1;

        IF v_result->>'status' = 'created' THEN
          v_created := v_created + 1;
        ELSIF v_result->>'status' IN ('relinked_existing_reference', 'already_linked') THEN
          v_relinked := v_relinked + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_failed := v_failed + 1;
        v_failures := v_failures || jsonb_build_array(jsonb_build_object(
          'payment_id', v_payment.id,
          'payment_number', v_payment.payment_number,
          'error', SQLERRM
        ));
      END;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', CASE WHEN p_apply THEN 'apply' ELSE 'dry_run' END,
    'company_id', p_company_id,
    'limit', p_limit,
    'needs_relink', v_needs_relink,
    'needs_create', v_needs_create,
    'processed', v_processed,
    'relinked', v_relinked,
    'created', v_created,
    'failed', v_failed,
    'sample', v_sample,
    'failures', v_failures
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_payment_journal_entry(uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.repair_payment_journal_integrity(uuid, boolean, integer) TO authenticated, service_role;
COMMENT ON FUNCTION public.ensure_payment_journal_entry(uuid, uuid, uuid) IS
'Idempotently creates or relinks the posted journal entry for a completed receipt payment.';
COMMENT ON FUNCTION public.repair_payment_journal_integrity(uuid, boolean, integer) IS
'Dry-runs or applies payment journal relinks/creation for completed receipt payments missing payments.journal_entry_id.';
