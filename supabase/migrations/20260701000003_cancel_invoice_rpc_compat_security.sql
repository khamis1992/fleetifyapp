-- Harden invoice cancellation RPC and accept legacy/frontend payload shapes.

CREATE OR REPLACE FUNCTION public.cancel_invoice_with_reversal(
  p_invoice_id uuid,
  p_company_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_active_payment record;
  v_original_journal public.journal_entries%ROWTYPE;
  v_reversal_entry_id uuid;
  v_reversal_number text;
  v_actor uuid;
  v_actor_role text;
  v_user_company_id uuid;
  v_note text;
BEGIN
  IF p_invoice_id IS NULL OR p_company_id IS NULL THEN
    RAISE EXCEPTION 'بيانات الفاتورة أو الشركة غير مكتملة.'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor := auth.uid();
  v_actor_role := COALESCE(auth.role(), '');

  IF v_actor IS NULL AND v_actor_role <> 'service_role' THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول قبل إلغاء الفاتورة.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    v_user_company_id := public.get_user_company_id();

    IF v_user_company_id IS NULL THEN
      RAISE EXCEPTION 'تعذر تحديد الشركة الخاصة بالمستخدم الحالي.'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_user_company_id IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'لا تملك صلاحية إلغاء فواتير هذه الشركة.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT *
  INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'لم يتم العثور على الفاتورة أو لا تملك صلاحية الوصول لها.'
      USING ERRCODE = 'P0001';
  END IF;

  IF LOWER(COALESCE(v_invoice.status, '')) = 'cancelled'
    OR LOWER(COALESCE(v_invoice.payment_status, '')) = 'cancelled'
  THEN
    RETURN jsonb_build_object(
      'invoice_id', v_invoice.id,
      'invoice_number', v_invoice.invoice_number,
      'status', 'already_cancelled',
      'reversal_entry_id', NULL
    );
  END IF;

  SELECT p.id, p.payment_number, p.amount, p.payment_status
  INTO v_active_payment
  FROM public.payments p
  WHERE p.invoice_id = v_invoice.id
    AND p.company_id = v_invoice.company_id
    AND LOWER(COALESCE(p.transaction_type, 'receipt')) = 'receipt'
    AND LOWER(COALESCE(p.payment_status, '')) NOT IN (
      'cancelled',
      'canceled',
      'failed',
      'voided',
      'reversed',
      'refunded'
    )
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'لا يمكن إلغاء الفاتورة لأن عليها دفعة غير ملغاة: % بقيمة %. ألغ الدفعة أولاً ثم أعد المحاولة.',
      COALESCE(v_active_payment.payment_number, v_active_payment.id::text),
      COALESCE(v_active_payment.amount, 0)
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  IF v_invoice.journal_entry_id IS NOT NULL THEN
    SELECT *
    INTO v_original_journal
    FROM public.journal_entries
    WHERE id = v_invoice.journal_entry_id
      AND company_id = v_invoice.company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'الفاتورة مرتبطة بقيد يومية غير موجود. راجع الربط المحاسبي قبل الإلغاء.'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_original_journal.reversal_entry_id IS NOT NULL
      OR LOWER(COALESCE(v_original_journal.status, '')) = 'reversed'
    THEN
      v_reversal_entry_id := v_original_journal.reversal_entry_id;
    ELSE
      IF NOT EXISTS (
        SELECT 1
        FROM public.journal_entry_lines
        WHERE journal_entry_id = v_original_journal.id
      ) THEN
        RAISE EXCEPTION 'قيد الفاتورة لا يحتوي على سطور لعكسه.'
          USING ERRCODE = 'P0001';
      END IF;

      v_reversal_number :=
        'REV-INV-' ||
        SUBSTRING(v_invoice.id::text, 1, 8) ||
        '-' ||
        TO_CHAR(clock_timestamp(), 'YYYYMMDDHH24MISSMS');

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
        posted_at
      ) VALUES (
        v_invoice.company_id,
        v_reversal_number,
        CURRENT_DATE,
        'posted',
        'Reversal of invoice journal entry ' || COALESCE(v_original_journal.entry_number, v_original_journal.id::text),
        'invoice_cancellation',
        v_invoice.id,
        COALESCE(v_original_journal.total_credit, 0),
        COALESCE(v_original_journal.total_debit, 0),
        v_actor,
        v_actor,
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
        'Reversal - ' || COALESCE(line.line_description, v_original_journal.entry_number, v_original_journal.id::text),
        ROW_NUMBER() OVER (ORDER BY line.line_number, line.id),
        line.cost_center_id,
        line.asset_id,
        line.employee_id
      FROM public.journal_entry_lines line
      WHERE line.journal_entry_id = v_original_journal.id
      ORDER BY line.line_number, line.id;

      UPDATE public.journal_entries
      SET status = 'reversed',
          reversal_entry_id = v_reversal_entry_id,
          reversed_at = now(),
          reversed_by = v_actor,
          updated_at = now()
      WHERE id = v_original_journal.id
        AND company_id = v_invoice.company_id;
    END IF;
  END IF;

  v_note := concat(
    'تم إلغاء الفاتورة عبر مسار عكس القيد بتاريخ ',
    now()::text,
    CASE
      WHEN p_reason IS NULL OR btrim(p_reason) = '' THEN ''
      ELSE E'\nسبب الإلغاء: ' || p_reason
    END,
    CASE
      WHEN v_reversal_entry_id IS NULL THEN ''
      ELSE E'\nقيد العكس: ' || v_reversal_entry_id::text
    END
  );

  UPDATE public.invoices
  SET status = 'cancelled',
      payment_status = 'cancelled',
      paid_amount = 0,
      balance_due = 0,
      notes = concat_ws(E'\n', NULLIF(notes, ''), v_note),
      updated_at = now()
  WHERE id = v_invoice.id
    AND company_id = v_invoice.company_id;

  PERFORM set_config('app.financial_controls_bypass', '', true);

  RETURN jsonb_build_object(
    'invoice_id', v_invoice.id,
    'invoice_number', v_invoice.invoice_number,
    'status', 'cancelled',
    'reversal_entry_id', v_reversal_entry_id
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', '', true);
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_invoice_with_reversal(jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload alias for $1;
  v_invoice_id uuid;
  v_company_id uuid;
  v_reason text;
BEGIN
  v_invoice_id := NULLIF(COALESCE(v_payload->>'p_invoice_id', v_payload->>'invoice_id'), '')::uuid;
  v_company_id := NULLIF(COALESCE(v_payload->>'p_company_id', v_payload->>'company_id'), '')::uuid;
  v_reason := COALESCE(v_payload->>'p_reason', v_payload->>'reason');

  RETURN public.cancel_invoice_with_reversal(v_invoice_id, v_company_id, v_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_invoice_with_reversal(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_invoice_with_reversal(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.cancel_invoice_with_reversal(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_invoice_with_reversal(jsonb) TO anon, authenticated;

COMMENT ON FUNCTION public.cancel_invoice_with_reversal(jsonb) IS
'Compatibility wrapper for invoice cancellation RPC payloads using p_invoice_id/p_company_id or invoice_id/company_id.';
