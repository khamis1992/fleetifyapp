-- Post the accounting effect of payment allocation changes.
-- Receipt creation records cash against either receivables or customer advances.
-- Allocation changes move only the changed total between those two accounts.

ALTER TABLE public.payment_allocation_change_log
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid,
  ADD COLUMN IF NOT EXISTS accounting_delta numeric(14, 2),
  ADD COLUMN IF NOT EXISTS accounting_before_allocated numeric(14, 2),
  ADD COLUMN IF NOT EXISTS accounting_after_allocated numeric(14, 2);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_allocation_change_log_journal_entry_id_fkey'
      AND conrelid = 'public.payment_allocation_change_log'::regclass
  ) THEN
    ALTER TABLE public.payment_allocation_change_log
      ADD CONSTRAINT payment_allocation_change_log_journal_entry_id_fkey
      FOREIGN KEY (journal_entry_id)
      REFERENCES public.journal_entries(id)
      ON DELETE RESTRICT;
  END IF;
END;
$$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_allocation_change_log_journal
  ON public.payment_allocation_change_log(journal_entry_id)
  WHERE journal_entry_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.resolve_payment_posting_account(
  p_company_id uuid,
  p_type_code text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  IF p_company_id IS NULL OR NULLIF(BTRIM(COALESCE(p_type_code, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Company and payment account type are required' USING ERRCODE = 'P0001';
  END IF;

  SELECT account.id
  INTO v_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type
    ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account
    ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = p_company_id
    AND account_type.type_code = p_type_code
    AND mapping.is_active = true
    AND account.company_id = p_company_id
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3
    AND (
      (
        p_type_code = 'RECEIVABLES'
        AND lower(COALESCE(account.account_type, '')) = 'assets'
        AND lower(COALESCE(account.balance_type, '')) = 'debit'
      )
      OR (
        p_type_code = 'CUSTOMER_ADVANCES'
        AND lower(COALESCE(account.account_type, '')) = 'liabilities'
        AND lower(COALESCE(account.balance_type, '')) = 'credit'
      )
    )
  ORDER BY mapping.id
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'A valid % posting-account mapping is required for company %', p_type_code, p_company_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_account_id;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_payment_posting_account(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_payment_posting_account(uuid, text)
  TO service_role;
CREATE OR REPLACE FUNCTION public.create_payment_allocation_adjustment_journal(
  p_change_log_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_change public.payment_allocation_change_log%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_receivables_account_id uuid;
  v_advances_account_id uuid;
  v_original_journal_count integer := 0;
  v_current_receivables numeric := 0;
  v_current_advances numeric := 0;
  v_target_receivables numeric := 0;
  v_delta numeric := 0;
  v_amount numeric := 0;
  v_journal_id uuid;
  v_entry_number text;
BEGIN
  SELECT *
  INTO v_change
  FROM public.payment_allocation_change_log change_log
  WHERE change_log.id = p_change_log_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment allocation change log was not found' USING ERRCODE = 'P0001';
  END IF;
  IF v_change.journal_entry_id IS NOT NULL THEN
    RETURN v_change.journal_entry_id;
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = v_change.payment_id
    AND payment.company_id = v_change.company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment was not found for allocation accounting' USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_payment.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded')
     OR lower(COALESCE(v_payment.transaction_type::text, 'receipt')) <> 'receipt'
  THEN
    RAISE EXCEPTION 'Only completed receipt allocations can create accounting adjustments'
      USING ERRCODE = 'P0001';
  END IF;

  v_receivables_account_id := public.resolve_payment_posting_account(v_change.company_id, 'RECEIVABLES');
  v_advances_account_id := public.resolve_payment_posting_account(v_change.company_id, 'CUSTOMER_ADVANCES');
  IF v_receivables_account_id = v_advances_account_id THEN
    RAISE EXCEPTION 'Receivables and customer-advance accounts must be different'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    COUNT(DISTINCT entry.id) FILTER (
      WHERE entry.id = v_payment.journal_entry_id
         OR (entry.reference_type = 'payment' AND entry.reference_id = v_payment.id)
    )::integer,
    COALESCE(SUM(
      CASE WHEN line.account_id = v_receivables_account_id
        THEN COALESCE(line.credit_amount, 0) - COALESCE(line.debit_amount, 0)
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE WHEN line.account_id = v_advances_account_id
        THEN COALESCE(line.credit_amount, 0) - COALESCE(line.debit_amount, 0)
        ELSE 0
      END
    ), 0)
  INTO v_original_journal_count, v_current_receivables, v_current_advances
  FROM public.journal_entries entry
  JOIN public.journal_entry_lines line ON line.journal_entry_id = entry.id
  WHERE entry.company_id = v_change.company_id
    AND lower(COALESCE(entry.status::text, '')) = 'posted'
    AND (
      entry.id = v_payment.journal_entry_id
      OR (entry.reference_type = 'payment' AND entry.reference_id = v_payment.id)
      OR (
        entry.reference_type = 'payment_allocation'
        AND EXISTS (
          SELECT 1
          FROM public.payment_allocation_change_log prior_change
          WHERE prior_change.id = entry.reference_id
            AND prior_change.payment_id = v_payment.id
            AND prior_change.id <> v_change.id
        )
      )
    );

  IF v_original_journal_count < 1 THEN
    RAISE EXCEPTION 'Completed receipt has no posted payment journal; allocation was stopped'
      USING ERRCODE = 'P0001';
  END IF;
  IF abs((v_current_receivables + v_current_advances) - COALESCE(v_payment.amount, 0)) > 0.01 THEN
    RAISE EXCEPTION
      'Receipt journal must be reclassified before allocation. Expected QAR %, mapped receivables plus advances equal QAR %',
      COALESCE(v_payment.amount, 0),
      round((v_current_receivables + v_current_advances)::numeric, 2)
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(SUM((element ->> 'amount')::numeric), 0)
  INTO v_target_receivables
  FROM jsonb_array_elements(COALESCE(v_change.after_allocations, '[]'::jsonb)) element;

  IF v_target_receivables < -0.01
     OR v_target_receivables > COALESCE(v_payment.amount, 0) + 0.01
  THEN
    RAISE EXCEPTION 'Allocation accounting target is outside the payment amount'
      USING ERRCODE = 'P0001';
  END IF;

  v_delta := round((v_target_receivables - v_current_receivables)::numeric, 2);
  v_amount := abs(v_delta);

  UPDATE public.payment_allocation_change_log
  SET
    accounting_delta = v_delta,
    accounting_before_allocated = round(v_current_receivables::numeric, 2),
    accounting_after_allocated = round(v_target_receivables::numeric, 2)
  WHERE id = v_change.id;

  IF v_amount <= 0.01 THEN
    RETURN NULL;
  END IF;

  PERFORM public.assert_financial_period_is_open(v_change.company_id, CURRENT_DATE);

  v_entry_number :=
    'JE-PALLOC-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substring(v_change.id::text, 1, 8);

  INSERT INTO public.journal_entries (
    company_id,
    entry_number,
    entry_date,
    description,
    total_debit,
    total_credit,
    status,
    reference_type,
    reference_id,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_change.company_id,
    v_entry_number,
    CURRENT_DATE,
    'Payment allocation adjustment for ' || COALESCE(v_payment.payment_number, v_payment.id::text) ||
      ' - ' || BTRIM(v_change.reason),
    v_amount,
    v_amount,
    'draft',
    'payment_allocation',
    v_change.id,
    COALESCE(p_actor_id, v_change.changed_by),
    now(),
    now()
  )
  RETURNING id INTO v_journal_id;

  IF v_delta > 0 THEN
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount
    ) VALUES
      (v_journal_id, v_advances_account_id, 1, 'Apply customer advance to invoice receivables', v_amount, 0),
      (v_journal_id, v_receivables_account_id, 2, 'Settle invoice receivables from customer advance', 0, v_amount);
  ELSE
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount
    ) VALUES
      (v_journal_id, v_receivables_account_id, 1, 'Release invoice receivables allocation', v_amount, 0),
      (v_journal_id, v_advances_account_id, 2, 'Return amount to customer advances', 0, v_amount);
  END IF;

  UPDATE public.journal_entries
  SET
    status = 'posted',
    posted_by = COALESCE(p_actor_id, v_change.changed_by),
    posted_at = now(),
    updated_at = now()
  WHERE id = v_journal_id;

  UPDATE public.payment_allocation_change_log
  SET journal_entry_id = v_journal_id
  WHERE id = v_change.id;

  RETURN v_journal_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_payment_allocation_adjustment_journal(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_allocation_adjustment_journal(uuid, uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.post_payment_allocation_change_accounting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_payment_allocation_adjustment_journal(NEW.id, NEW.changed_by);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.post_payment_allocation_change_accounting()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS post_payment_allocation_change_accounting_trigger
  ON public.payment_allocation_change_log;
CREATE TRIGGER post_payment_allocation_change_accounting_trigger
  AFTER INSERT ON public.payment_allocation_change_log
  FOR EACH ROW
  EXECUTE FUNCTION public.post_payment_allocation_change_accounting();
COMMENT ON FUNCTION public.create_payment_allocation_adjustment_journal(uuid, uuid) IS
'Posts only the allocation-total delta between customer advances and receivables; same-total invoice reallocations do not create redundant journals.';
