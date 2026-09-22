-- Rollback of 20260921154000_unapplied_receipts_advances.sql
-- Restores the payment trigger to revenue-for-unlinked receipts. The
-- reclassification journal (none was needed at apply time) is reversed, if
-- present, as a normal dated reversal rather than deleted.
BEGIN;
SET LOCAL lock_timeout = '5s';

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

  IF COALESCE(NEW.payment_date, CURRENT_DATE) <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN
    UPDATE public.journal_entries
    SET status = 'posted', posted_by = NEW.created_by, posted_at = now(), updated_at = now()
    WHERE id = v_journal_id;
  END IF;

  NEW.journal_entry_id := v_journal_id;

  RETURN NEW;
END;
$$;

NOTIFY pgrst,'reload schema';
COMMIT;
