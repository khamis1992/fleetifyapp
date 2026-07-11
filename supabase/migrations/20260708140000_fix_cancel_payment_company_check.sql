-- Fix: Allow super_admin users to cancel payments for any company.
-- The previous RPC checked profiles.company_id = p_company_id, which blocked
-- super_admin users browsing as another company from cancelling payments.
-- Super admins have cross-company access by design.

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
  v_is_super_admin boolean := false;
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
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = v_actor
        AND ur.role::text = 'super_admin'
    ) INTO v_is_super_admin;

    IF NOT v_is_super_admin THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.profiles pr
        WHERE pr.id = v_actor
          AND pr.company_id = p_company_id
      ) THEN
        RAISE EXCEPTION 'You cannot cancel payments for another company' USING ERRCODE = 'P0001';
      END IF;
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

      IF v_reversal_entry_id IS NOT NULL THEN
        UPDATE public.journal_entries
        SET status = 'reversed', updated_at = now()
        WHERE id = v_original_journal.id;

        SELECT count(*) INTO v_original_line_count
        FROM public.journal_entry_lines
        WHERE journal_entry_id = v_original_journal.id;
      END IF;
    ELSE
      v_reversal_number := 'REV-' || to_char(v_reversal_date, 'YYYYMMDD') || '-' || substring(v_payment.id::text, 1, 8);

      INSERT INTO public.journal_entries (
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        status,
        total_debit,
        total_credit,
        reversal_of_entry_id,
        source
      )
      SELECT
        p_company_id,
        v_reversal_number,
        v_reversal_date,
        'Reversal entry for cancelled payment ' || COALESCE(v_payment.payment_number::text, v_payment.id::text),
        'payment',
        v_payment.id,
        'posted',
        COALESCE(v_original_journal.total_debit, 0),
        COALESCE(v_original_journal.total_credit, 0),
        v_original_journal.id,
        'payment_cancellation'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.journal_entries
        WHERE reversal_of_entry_id = v_original_journal.id
          AND company_id = p_company_id
      )
      RETURNING id INTO v_reversal_entry_id;

      IF v_reversal_entry_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
          journal_entry_id,
          account_id,
          line_number,
          debit_amount,
          credit_amount,
          line_description,
          cost_center_id
        )
        SELECT
          v_reversal_entry_id,
          jel.account_id,
          jel.line_number,
          jel.credit_amount,
          jel.debit_amount,
          'Reversal: ' || COALESCE(jel.line_description, 'original line'),
          jel.cost_center_id
        FROM public.journal_entry_lines jel
        WHERE jel.journal_entry_id = v_original_journal.id;

        SELECT count(*) INTO v_original_line_count
        FROM public.journal_entry_lines
        WHERE journal_entry_id = v_original_journal.id;

        UPDATE public.journal_entries
        SET status = 'reversed',
            reversal_entry_id = v_reversal_entry_id,
            updated_at = now()
        WHERE id = v_original_journal.id;
      END IF;
    END IF;
  END IF;

  v_note := COALESCE(
    NULLIF(trim(p_reason), ''),
    'Payment cancelled by ' || COALESCE(v_actor::text, 'system')
  );

  IF v_note IS NULL OR v_note = '' THEN
    v_note := 'Payment cancelled';
  END IF;

  UPDATE public.payments
  SET
    payment_status = 'cancelled',
    cancellation_reason = v_note,
    cancelled_by = v_actor,
    cancelled_at = now(),
    updated_at = now()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'status', 'cancelled',
    'reversal_entry_id', v_reversal_entry_id,
    'original_journal_entry_id', CASE WHEN v_has_original_journal THEN v_original_journal.id ELSE NULL END,
    'reversal_line_count', v_original_line_count,
    'already_cancelled', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid) IS
  'Atomically cancel a payment and create/link a reversal journal entry. Super admins can cancel payments across companies.';