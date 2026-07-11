-- Fix payment cancellation for completed/historical payments.
--
-- The previous RPC checked financial periods before enabling the internal
-- financial-controls bypass, so cancelling older completed payments could fail
-- with a 400 response and then the client-side fallback would hit the
-- "Completed payments are immutable" trigger. Cancellation is the approved
-- correction path, so the bypass must be active for the full atomic operation.

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
  v_has_original_journal boolean := false;
  v_original_line_count integer := 0;
  v_reversal_entry_id uuid;
  v_reversal_number text;
  v_reversal_date date;
  v_actor uuid;
  v_actor_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.role()::text, ''),
    ''
  );
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

  IF LOWER(COALESCE(v_payment.payment_status::text, '')) = 'cancelled' THEN
    RETURN jsonb_build_object(
      'payment_id', v_payment.id,
      'status', 'cancelled',
      'already_cancelled', true
    );
  END IF;

  v_reversal_date := COALESCE(v_payment.payment_date, CURRENT_DATE);

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

  v_has_original_journal := FOUND;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  IF v_has_original_journal THEN
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
        SELECT COUNT(*)
        INTO v_original_line_count
        FROM public.journal_entry_lines line
        WHERE line.journal_entry_id = v_original_journal.id;

        IF v_original_line_count > 0 THEN
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
            v_reversal_date,
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
      END IF;

      UPDATE public.journal_entries
      SET
        status = 'reversed',
        reversal_entry_id = COALESCE(v_reversal_entry_id, reversal_entry_id),
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
    CASE WHEN v_reversal_entry_id IS NULL THEN '' ELSE E'\nReversal entry: ' || v_reversal_entry_id::text END,
    CASE
      WHEN v_has_original_journal AND v_reversal_entry_id IS NULL
      THEN E'\nNo reversal entry was created because the original journal had no lines.'
      ELSE ''
    END
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
    'original_journal_entry_id', CASE WHEN v_has_original_journal THEN v_original_journal.id ELSE NULL END,
    'reversal_entry_id', v_reversal_entry_id,
    'reversal_skipped_reason',
      CASE
        WHEN v_has_original_journal AND v_reversal_entry_id IS NULL THEN 'original_journal_has_no_lines'
        ELSE NULL
      END
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', '', true);
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid) IS
'Atomically cancels a payment with an accounting reversal while using the internal financial-controls bypass for the approved cancellation path.';
