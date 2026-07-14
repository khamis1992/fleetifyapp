-- Validate and close an accounting period in one serialized transaction.

CREATE OR REPLACE FUNCTION public.close_accounting_period_v1(
  p_company_id uuid,
  p_period_name text,
  p_start_date date,
  p_end_date date,
  p_actor_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_id uuid;
  v_actor_id uuid;
  v_blockers integer;
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_period_name, '')), '') IS NULL OR p_start_date IS NULL
     OR p_end_date IS NULL OR p_start_date > p_end_date THEN
    RAISE EXCEPTION 'A valid period name and date range are required' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':accounting-period-close', 0));

  IF EXISTS (
    SELECT 1 FROM public.accounting_periods period
    WHERE period.company_id = p_company_id
      AND daterange(period.start_date, period.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
      AND NOT (period.start_date = p_start_date AND period.end_date = p_end_date)
  ) THEN
    RAISE EXCEPTION 'Accounting period overlaps an existing period' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_blockers FROM (
    SELECT payment.id
    FROM public.payments payment
    WHERE payment.company_id = p_company_id
      AND payment.payment_date BETWEEN p_start_date AND p_end_date
      AND lower(COALESCE(payment.payment_status, '')) = 'completed'
      AND payment.journal_entry_id IS NULL
    UNION ALL
    SELECT entry.id
    FROM public.journal_entries entry
    WHERE entry.company_id = p_company_id AND entry.entry_date BETWEEN p_start_date AND p_end_date
      AND lower(COALESCE(entry.status, '')) = 'posted'
      AND (
        abs(COALESCE(entry.total_debit, 0) - COALESCE(entry.total_credit, 0)) > 0.01
        OR NOT EXISTS (SELECT 1 FROM public.journal_entry_lines line WHERE line.journal_entry_id = entry.id)
        OR abs(COALESCE((SELECT sum(line.debit_amount) FROM public.journal_entry_lines line WHERE line.journal_entry_id=entry.id),0)-COALESCE((SELECT sum(line.credit_amount) FROM public.journal_entry_lines line WHERE line.journal_entry_id=entry.id),0))>0.01
        OR abs(COALESCE((SELECT sum(line.debit_amount) FROM public.journal_entry_lines line WHERE line.journal_entry_id=entry.id),0)-COALESCE(entry.total_debit,0))>0.01
        OR abs(COALESCE((SELECT sum(line.credit_amount) FROM public.journal_entry_lines line WHERE line.journal_entry_id=entry.id),0)-COALESCE(entry.total_credit,0))>0.01
      )
    UNION ALL
    SELECT invoice.id
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id AND invoice.invoice_date BETWEEN p_start_date AND p_end_date
      AND abs(COALESCE(invoice.total_amount, 0) - COALESCE(invoice.paid_amount, 0) - COALESCE(invoice.balance_due, 0)) > 0.01
  ) blockers;
  IF v_blockers > 0 THEN
    RAISE EXCEPTION 'Accounting period has % unresolved financial integrity blockers', v_blockers
      USING ERRCODE = 'P0001';
  END IF;

  SELECT period.id INTO v_period_id FROM public.accounting_periods period
  WHERE period.company_id = p_company_id AND period.start_date = p_start_date AND period.end_date = p_end_date
  FOR UPDATE;
  IF v_period_id IS NULL THEN
    INSERT INTO public.accounting_periods (
      company_id, period_name, start_date, end_date, status, is_adjustment_period
    ) VALUES (
      p_company_id, BTRIM(p_period_name), p_start_date, p_end_date, 'locked', false
    ) RETURNING id INTO v_period_id;
  ELSE
    UPDATE public.accounting_periods SET period_name = BTRIM(p_period_name), status = 'locked',
      is_adjustment_period = false, updated_at = now()
    WHERE id = v_period_id AND company_id = p_company_id;
  END IF;
  RETURN v_period_id;
END;
$$;

REVOKE ALL ON FUNCTION public.close_accounting_period_v1(uuid, text, date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_accounting_period_v1(uuid, text, date, date, uuid) TO authenticated, service_role;
