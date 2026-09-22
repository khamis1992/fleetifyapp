-- Rollback of 20260921130000_stop_future_dated_posting.sql
-- Restores immediate posting in the invoice/payment triggers, removes the
-- future-posting guard, and restores the unfiltered current_balance cache.
-- The one-time data repair is NOT automatically reversed: re-posting future-
-- dated entries requires the explicit app.allow_future_posting exception by
-- design. To deliberately restore the old behaviour for specific rows, run
-- (as a conscious, audited decision):
--   BEGIN;
--   SET LOCAL app.allow_future_posting = 'on';
--   UPDATE public.journal_entries SET status='posted', posted_by=..., posted_at=now()
--   WHERE id IN (...);
--   COMMIT;
BEGIN;
SET LOCAL lock_timeout = '5s';

DROP TRIGGER IF EXISTS journal_entries_prevent_future_posting ON public.journal_entries;
DROP FUNCTION IF EXISTS public.prevent_future_dated_posting_fn();
DROP FUNCTION IF EXISTS public.future_posting_exception_enabled();
DROP FUNCTION IF EXISTS public.post_due_journal_drafts_v1(uuid, uuid);

CREATE OR REPLACE FUNCTION public.trg_invoice_journal_entry_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry_number text;
  v_journal_id uuid;
  v_ar_account_id uuid;
  v_revenue_account_id uuid;
  v_tax_account_id uuid;
BEGIN
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_journal_id
  FROM public.journal_entries
  WHERE company_id = NEW.company_id
    AND reference_type = 'invoice'
    AND reference_id = NEW.id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_journal_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT am.chart_of_accounts_id INTO v_ar_account_id
  FROM public.account_mappings am
  JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
  WHERE am.company_id = NEW.company_id
    AND dat.type_code = 'RECEIVABLES'
    AND am.is_active = true
  LIMIT 1;

  SELECT am.chart_of_accounts_id INTO v_revenue_account_id
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

  IF v_ar_account_id IS NULL OR v_revenue_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_entry_number := 'INV-' || to_char(COALESCE(NEW.invoice_date, CURRENT_DATE), 'YYYYMMDD') || '-' || substring(NEW.id::text, 1, 8);

  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description,
    total_debit, total_credit, status, reference_type, reference_id, created_by
  )
  VALUES (
    NEW.company_id, v_entry_number,
    COALESCE(NEW.invoice_date, CURRENT_DATE),
    'Invoice: ' || COALESCE(NEW.invoice_number, NEW.id::text),
    NEW.total_amount, NEW.total_amount, 'draft', 'invoice', NEW.id, NEW.created_by
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
  VALUES
    (v_journal_id, v_ar_account_id, 1, 'Customer receivable', NEW.total_amount, 0),
    (v_journal_id, v_revenue_account_id, 2, 'Service revenue', 0, COALESCE(NEW.subtotal, NEW.total_amount - COALESCE(NEW.tax_amount, 0)));

  IF COALESCE(NEW.tax_amount, 0) > 0 THEN
    SELECT am.chart_of_accounts_id INTO v_tax_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = NEW.company_id
      AND dat.type_code IN ('TAX_PAYABLE', 'VAT_PAYABLE', 'TAX')
      AND am.is_active = true
    LIMIT 1;

    IF v_tax_account_id IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
      VALUES (v_journal_id, v_tax_account_id, 3, 'Collected tax', 0, NEW.tax_amount);
    END IF;
  END IF;

  UPDATE public.journal_entries
  SET status = 'posted', posted_by = NEW.created_by, posted_at = now(), updated_at = now()
  WHERE id = v_journal_id;

  NEW.journal_entry_id := v_journal_id;

  RETURN NEW;
END;
$$;

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
  v_revenue_account_id uuid;
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

  SELECT am.chart_of_accounts_id INTO v_revenue_account_id
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

  IF v_cash_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.invoice_id IS NOT NULL AND v_receivable_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.invoice_id IS NULL AND v_revenue_account_id IS NULL THEN
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
    (v_journal_id,
     CASE WHEN NEW.invoice_id IS NOT NULL THEN v_receivable_account_id ELSE v_revenue_account_id END,
     2,
     CASE WHEN NEW.invoice_id IS NOT NULL THEN 'Receivables settlement' ELSE 'Direct revenue' END,
     0, NEW.amount);

  UPDATE public.journal_entries
  SET status = 'posted', posted_by = NEW.created_by, posted_at = now(), updated_at = now()
  WHERE id = v_journal_id;

  NEW.journal_entry_id := v_journal_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_account_current_balance(p_account_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric := 0;
BEGIN
  UPDATE public.chart_of_accounts account
  SET
    current_balance = CASE
      WHEN lower(account.balance_type) = 'debit' THEN COALESCE((
        SELECT SUM(COALESCE(line.debit_amount, 0)) - SUM(COALESCE(line.credit_amount, 0))
        FROM public.journal_entry_lines line
        JOIN public.journal_entries entry ON entry.id = line.journal_entry_id
        WHERE line.account_id = account.id
          AND lower(COALESCE(entry.status::text, '')) = 'posted'
      ), 0)
      ELSE COALESCE((
        SELECT SUM(COALESCE(line.credit_amount, 0)) - SUM(COALESCE(line.debit_amount, 0))
        FROM public.journal_entry_lines line
        JOIN public.journal_entries entry ON entry.id = line.journal_entry_id
        WHERE line.account_id = account.id
          AND lower(COALESCE(entry.status::text, '')) = 'posted'
      ), 0)
    END,
    updated_at = now()
  WHERE account.id = p_account_id
  RETURNING current_balance INTO v_balance;

  RETURN COALESCE(v_balance, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_account_current_balance(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_account_current_balance(uuid)
  TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
