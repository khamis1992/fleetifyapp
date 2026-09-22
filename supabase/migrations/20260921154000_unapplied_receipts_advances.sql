-- Unapplied receipts become customer advances:
--  * the payment journal trigger credits CUSTOMER_ADVANCES (mapped 20201)
--    instead of revenue for payments that are not linked to an invoice, so
--    revenue is recognized when the due invoice posts, not on collection;
--  * one-time reclassification moves the revenue credited by historical
--    unapplied receipts into advances with a documented audit trail.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1. Payment trigger: unlinked receipts credit advances (fallback revenue).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_payment_journal_entry_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry_number text;
  v_journal_id uuid;
  v_cash_account_id uuid;
  v_receivable_account_id uuid;
  v_counterpart_account_id uuid;
BEGIN
  IF NEW.payment_status <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_journal_id
  FROM public.journal_entries
  WHERE company_id = NEW.company_id
    AND reference_type = 'payment'
    AND reference_id = NEW.id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_journal_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT am.chart_of_accounts_id INTO v_cash_account_id
  FROM public.account_mappings am
  JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
  WHERE am.company_id = NEW.company_id
    AND dat.type_code IN ('CASH', 'BANK', 'PETTY_CASH')
    AND am.is_active = true
  ORDER BY dat.type_code
  LIMIT 1;

  SELECT am.chart_of_accounts_id INTO v_receivable_account_id
  FROM public.account_mappings am
  JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
  WHERE am.company_id = NEW.company_id
    AND dat.type_code = 'RECEIVABLES'
    AND am.is_active = true
  LIMIT 1;

  -- Unlinked receipts are customer advances while unapplied; direct revenue is
  -- only the fallback when no advances account is mapped.
  IF NEW.invoice_id IS NULL THEN
    SELECT am.chart_of_accounts_id INTO v_counterpart_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = NEW.company_id
      AND dat.type_code = 'CUSTOMER_ADVANCES'
      AND am.is_active = true
    LIMIT 1;
    IF v_counterpart_account_id IS NULL THEN
      SELECT am.chart_of_accounts_id INTO v_counterpart_account_id
      FROM public.account_mappings am
      JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
      WHERE am.company_id = NEW.company_id
        AND dat.type_code IN ('RENTAL_REVENUE', 'SALES_REVENUE', 'REVENUE')
        AND am.is_active = true
      ORDER BY
        CASE dat.type_code
          WHEN 'RENTAL_REVENUE' THEN 1
          WHEN 'SALES_REVENUE' THEN 2
          WHEN 'REVENUE' THEN 3
          ELSE 4
        END
      LIMIT 1;
    END IF;
  ELSE
    v_counterpart_account_id := v_receivable_account_id;
  END IF;

  IF v_cash_account_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF v_counterpart_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_entry_number := 'PAY-' || to_char(COALESCE(NEW.payment_date, CURRENT_DATE), 'YYYYMMDD') || '-' || substring(NEW.id::text, 1, 8);

  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description,
    total_debit, total_credit, status, reference_type, reference_id, created_by
  )
  VALUES (
    NEW.company_id, v_entry_number,
    COALESCE(NEW.payment_date, CURRENT_DATE),
    'Payment receipt: ' || COALESCE(NEW.payment_number, NEW.reference_number, NEW.id::text),
    NEW.amount, NEW.amount, 'draft', 'payment', NEW.id, NEW.created_by
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
  VALUES
    (v_journal_id, v_cash_account_id, 1, 'Payment received', NEW.amount, 0),
    (v_journal_id, v_counterpart_account_id, 2,
     CASE WHEN NEW.invoice_id IS NOT NULL THEN 'Receivables settlement'
          WHEN EXISTS (SELECT 1 FROM public.account_mappings am JOIN public.default_account_types dat ON dat.id = am.default_account_type_id
                       WHERE am.chart_of_accounts_id = v_counterpart_account_id AND dat.type_code = 'CUSTOMER_ADVANCES')
          THEN 'Customer advance (unapplied receipt)'
          ELSE 'Direct revenue' END,
     0, NEW.amount);

  IF COALESCE(NEW.payment_date, CURRENT_DATE) <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN
    UPDATE public.journal_entries
    SET status = 'posted', posted_by = NEW.created_by, posted_at = now(), updated_at = now()
    WHERE id = v_journal_id;
  END IF;

  NEW.journal_entry_id := v_journal_id;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. One-time reclassification of historical unapplied receipts.
-- ---------------------------------------------------------------------------
DO $reclass$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date;
  v_advances uuid;
  v_total numeric := 0;
  v_count integer := 0;
  v_je uuid;
  r record;
BEGIN
  SELECT m.chart_of_accounts_id INTO v_advances
  FROM public.account_mappings m JOIN public.default_account_types t ON t.id = m.default_account_type_id
  WHERE m.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND t.type_code = 'CUSTOMER_ADVANCES' AND COALESCE(m.is_active, true)
  LIMIT 1;
  IF v_advances IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_ADVANCES mapping is required for the unapplied receipts reclassification';
  END IF;

  CREATE TEMP TABLE tmp_reclass ON COMMIT DROP AS
  SELECT l.account_id, sum(COALESCE(l.credit_amount, 0) - COALESCE(l.debit_amount, 0)) AS amount
  FROM public.payments p
  JOIN public.journal_entries e ON e.id = p.journal_entry_id AND e.status = 'posted'
  JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
  WHERE p.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND p.payment_status = 'completed'
    AND p.invoice_id IS NULL
    AND l.account_id <> v_advances
    AND l.account_id IN (
      SELECT m.chart_of_accounts_id FROM public.account_mappings m
      JOIN public.default_account_types t ON t.id = m.default_account_type_id
      WHERE m.company_id = p.company_id
        AND t.type_code IN ('RENTAL_REVENUE', 'SALES_REVENUE', 'REVENUE') AND COALESCE(m.is_active, true)
    )
  GROUP BY l.account_id
  HAVING sum(COALESCE(l.credit_amount, 0) - COALESCE(l.debit_amount, 0)) > 0.01;

  SELECT count(*), COALESCE(sum(amount), 0) INTO v_count, v_total FROM tmp_reclass;
  IF v_count = 0 THEN
    RAISE NOTICE 'no unapplied receipt revenue to reclassify';
  ELSE
    v_je := gen_random_uuid();
    INSERT INTO public.journal_entries (
      id, company_id, entry_number, entry_date, description, reference_type, reference_id,
      total_debit, total_credit, status, workflow_notes
    ) VALUES (
      v_je, '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'ADV-RECLASS-' || to_char(v_today, 'YYYYMMDD'),
      v_today,
      'إعادة تبويب مقبوضات غير مطبقة إلى دفعات عملاء مقدمة',
      'unapplied_receipts_reclass', v_je,
      v_total, v_total, 'draft',
      'RECLASS by migration 20260921154000: revenue credited by unlinked receipts moved to customer advances'
    );
    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
    SELECT v_je, t.account_id, row_number() OVER (ORDER BY t.account_id),
      'عكس إيراد مقبوضات غير مطبقة', t.amount, 0
    FROM tmp_reclass t;
    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
    VALUES (v_je, v_advances, v_count + 1, 'دفعات عملاء مقدمة — مقبوضات بانتظار التخصيص', 0, v_total);
    UPDATE public.journal_entries SET status = 'posted', posted_at = now(), updated_at = now() WHERE id = v_je;

    INSERT INTO public.audit_logs (action, company_id, entity_name, resource_type, severity, notes, metadata)
    VALUES (
      'unapplied_receipts_reclassified_to_advances',
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'journal_entries',
      'journal_entry',
      'warning',
      'Revenue credited by completed payments without invoices was reclassified to customer advances (migration 20260921154000).',
      jsonb_build_object('revenueAccounts', v_count, 'total', v_total, 'advancesAccount', v_advances, 'journalEntry', v_je)
    );
    RAISE NOTICE 'reclass: % accounts, % total -> advances', v_count, v_total;
  END IF;
END
$reclass$;

NOTIFY pgrst,'reload schema';
COMMIT;
