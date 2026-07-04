-- Restore import/backfill payments that were accidentally left cancelled by
-- PYINV/PYINV3 cleanup scripts, and provide an atomic payment cancellation RPC.

CREATE OR REPLACE FUNCTION public.restore_erroneously_cancelled_import_payments(
  p_company_id uuid,
  p_apply boolean DEFAULT false,
  p_updated_date date DEFAULT DATE '2026-07-02'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_actor_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_candidate_count integer := 0;
  v_restored_count integer := 0;
  v_total_amount numeric := 0;
  v_contract_count integer := 0;
  v_sample jsonb := '[]'::jsonb;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company id is required' USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() IS NULL AND v_actor_role <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  CREATE TEMP TABLE tmp_restore_cancelled_import_payments
  ON COMMIT DROP
  AS
  WITH candidate AS (
    SELECT
      p.id,
      p.company_id,
      p.contract_id,
      p.customer_id,
      p.amount,
      p.payment_number,
      p.payment_date,
      p.updated_at,
      COALESCE(direct_entry.id, reference_entry.id) AS original_journal_entry_id,
      COALESCE(direct_entry.entry_number, reference_entry.entry_number) AS original_entry_number
    FROM public.payments p
    LEFT JOIN public.journal_entries direct_entry
      ON direct_entry.id = p.journal_entry_id
     AND direct_entry.company_id = p.company_id
    LEFT JOIN LATERAL (
      SELECT je.*
      FROM public.journal_entries je
      WHERE je.company_id = p.company_id
        AND je.reference_type = 'payment'
        AND je.reference_id = p.id
      ORDER BY je.created_at NULLS LAST, je.id
      LIMIT 1
    ) reference_entry ON TRUE
    WHERE p.company_id = p_company_id
      AND LOWER(COALESCE(p.payment_status::text, '')) = 'cancelled'
      AND p.invoice_id IS NULL
      AND COALESCE(BTRIM(p.processing_notes), '') = ''
      AND p.updated_at::date = p_updated_date
  )
  SELECT c.*
  FROM candidate c
  JOIN public.journal_entries original_entry
    ON original_entry.id = c.original_journal_entry_id
   AND original_entry.company_id = c.company_id
  WHERE LOWER(COALESCE(original_entry.status::text, '')) = 'posted'
    AND original_entry.reversal_entry_id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.journal_entries reversal
      WHERE reversal.company_id = c.company_id
        AND reversal.reference_type = 'payment_reversal'
        AND reversal.reference_id = c.id
    );

  SELECT
    COUNT(*),
    COALESCE(SUM(amount), 0),
    COUNT(DISTINCT contract_id) FILTER (WHERE contract_id IS NOT NULL),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'payment_number', payment_number,
        'amount', amount,
        'payment_date', payment_date,
        'original_entry_number', original_entry_number
      )
      ORDER BY updated_at, payment_number
    ) FILTER (WHERE id IN (
      SELECT id
      FROM tmp_restore_cancelled_import_payments
      ORDER BY updated_at, payment_number
      LIMIT 20
    )), '[]'::jsonb)
  INTO v_candidate_count, v_total_amount, v_contract_count, v_sample
  FROM tmp_restore_cancelled_import_payments;

  IF NOT p_apply THEN
    RETURN jsonb_build_object(
      'mode', 'dry_run',
      'candidate_count', v_candidate_count,
      'restored_count', 0,
      'total_amount', v_total_amount,
      'affected_contract_count', v_contract_count,
      'sample', v_sample
    );
  END IF;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  EXECUTE 'ALTER TABLE public.payments DISABLE TRIGGER USER';

  UPDATE public.payments p
  SET
    payment_status = 'completed',
    updated_at = now(),
    processing_notes = CONCAT_WS(
      E'\n',
      NULLIF(p.processing_notes, ''),
      'System repair: restored to completed after PYINV cleanup left this historical import payment cancelled without a reversal entry.'
    )
  FROM tmp_restore_cancelled_import_payments c
  WHERE p.id = c.id
    AND p.company_id = c.company_id;

  GET DIAGNOSTICS v_restored_count = ROW_COUNT;

  EXECUTE 'ALTER TABLE public.payments ENABLE TRIGGER USER';

  WITH affected_contracts AS (
    SELECT DISTINCT contract_id
    FROM tmp_restore_cancelled_import_payments
    WHERE contract_id IS NOT NULL
  ),
  totals AS (
    SELECT
      p.contract_id,
      COALESCE(SUM(p.amount), 0) AS paid_amount
    FROM public.payments p
    JOIN affected_contracts ac ON ac.contract_id = p.contract_id
    WHERE p.company_id = p_company_id
      AND LOWER(COALESCE(p.payment_status::text, '')) = 'completed'
    GROUP BY p.contract_id
  )
  UPDATE public.contracts c
  SET
    total_paid = COALESCE(t.paid_amount, 0),
    balance_due = GREATEST(COALESCE(c.contract_amount, 0) - COALESCE(t.paid_amount, 0), 0),
    updated_at = now()
  FROM totals t
  WHERE c.id = t.contract_id
    AND c.company_id = p_company_id;

  PERFORM set_config('app.financial_controls_bypass', '', true);

  RETURN jsonb_build_object(
    'mode', 'apply',
    'candidate_count', v_candidate_count,
    'restored_count', v_restored_count,
    'total_amount', v_total_amount,
    'affected_contract_count', v_contract_count,
    'sample', v_sample
  );
EXCEPTION
  WHEN OTHERS THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.payments ENABLE TRIGGER USER';
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
    PERFORM set_config('app.financial_controls_bypass', '', true);
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_erroneously_cancelled_import_payments(uuid, boolean, date) TO authenticated, service_role;

COMMENT ON FUNCTION public.restore_erroneously_cancelled_import_payments(uuid, boolean, date) IS
'Restores historical import payments that were accidentally left cancelled by PYINV cleanup scripts. Strictly scoped by company/date/no invoice/no processing notes/posted original journal/no reversal.';

CREATE OR REPLACE FUNCTION public.cancel_payment_with_reversal(
  p_payment_id uuid,
  p_company_id uuid,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_original_journal public.journal_entries%ROWTYPE;
  v_reversal_entry_id uuid;
  v_reversal_number text;
  v_actor uuid;
  v_actor_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_note text;
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL THEN
    RAISE EXCEPTION 'payment id and company id are required' USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;

  IF v_actor IS NULL AND v_actor_role <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = v_actor
        AND pr.company_id = p_company_id
    ) THEN
      RAISE EXCEPTION 'You cannot cancel payments for another company' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_original_journal
  FROM public.journal_entries je
  WHERE je.company_id = p_company_id
    AND (
      je.id = v_payment.journal_entry_id
      OR (
        je.reference_type = 'payment'
        AND je.reference_id = v_payment.id
      )
    )
  ORDER BY CASE WHEN je.id = v_payment.journal_entry_id THEN 0 ELSE 1 END
  LIMIT 1;

  PERFORM public.assert_financial_period_is_open(p_company_id, CURRENT_DATE);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  IF FOUND THEN
    IF v_original_journal.reversal_entry_id IS NOT NULL
      OR LOWER(COALESCE(v_original_journal.status::text, '')) = 'reversed'
    THEN
      v_reversal_entry_id := v_original_journal.reversal_entry_id;
    ELSE
      SELECT je.id
      INTO v_reversal_entry_id
      FROM public.journal_entries je
      WHERE je.company_id = p_company_id
        AND je.reference_type = 'payment_reversal'
        AND je.reference_id = v_payment.id
      LIMIT 1;

      IF v_reversal_entry_id IS NULL THEN
        v_reversal_number :=
          'REV-' || COALESCE(v_original_journal.entry_number, 'PAY-' || v_payment.id::text) ||
          '-' || TO_CHAR(clock_timestamp(), 'YYYYMMDDHH24MISSMS');

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
          created_by,
          posted_by,
          posted_at,
          created_at,
          updated_at
        )
        VALUES (
          p_company_id,
          v_reversal_number,
          CURRENT_DATE,
          'draft',
          'Reversal of payment journal entry ' || COALESCE(v_original_journal.entry_number, v_original_journal.id::text),
          'payment_reversal',
          v_payment.id,
          COALESCE(v_original_journal.total_credit, 0),
          COALESCE(v_original_journal.total_debit, 0),
          v_actor,
          NULL,
          NULL,
          now(),
          now()
        )
        RETURNING id INTO v_reversal_entry_id;

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
          v_reversal_entry_id,
          line.account_id,
          COALESCE(line.credit_amount, 0),
          COALESCE(line.debit_amount, 0),
          'Reversal - ' || COALESCE(line.line_description, v_original_journal.entry_number, 'payment'),
          ROW_NUMBER() OVER (ORDER BY line.line_number, line.id),
          line.cost_center_id,
          line.asset_id,
          line.employee_id
        FROM public.journal_entry_lines line
        WHERE line.journal_entry_id = v_original_journal.id;

        UPDATE public.journal_entries
        SET
          status = 'posted',
          posted_by = v_actor,
          posted_at = now(),
          updated_at = now()
        WHERE id = v_reversal_entry_id
          AND company_id = p_company_id;
      END IF;

      UPDATE public.journal_entries
      SET
        status = 'reversed',
        reversal_entry_id = v_reversal_entry_id,
        reversed_at = now(),
        reversed_by = v_actor,
        updated_at = now()
      WHERE id = v_original_journal.id
        AND company_id = p_company_id;
    END IF;
  END IF;

  v_note := CONCAT(
    'Payment cancelled through atomic reversal on ',
    now()::text,
    CASE WHEN p_reason IS NULL OR BTRIM(p_reason) = '' THEN '' ELSE E'\nReason: ' || p_reason END,
    CASE WHEN v_reversal_entry_id IS NULL THEN '' ELSE E'\nReversal entry: ' || v_reversal_entry_id::text END
  );

  UPDATE public.payments
  SET
    payment_status = 'cancelled',
    updated_at = now(),
    processing_notes = CONCAT_WS(E'\n', NULLIF(processing_notes, ''), v_note)
  WHERE id = v_payment.id
    AND company_id = p_company_id;

  PERFORM set_config('app.financial_controls_bypass', '', true);

  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'status', 'cancelled',
    'original_journal_entry_id', CASE WHEN FOUND THEN v_original_journal.id ELSE NULL END,
    'reversal_entry_id', v_reversal_entry_id
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', '', true);
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid) IS
'Atomically cancels a payment and creates/links a reversal journal entry before marking the payment cancelled.';
