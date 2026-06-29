-- Fix invoice journal trigger to match the current journal_entries schema.
-- Older trigger code inserted entry_type/source_document_* columns that no
-- longer exist after the financial controls layer moved to reference_type/id.

CREATE OR REPLACE FUNCTION public.create_invoice_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_number text;
  v_journal_id uuid;
  v_ar_account_id uuid;
  v_revenue_account_id uuid;
  v_tax_account_id uuid;
  v_invoice_total numeric := COALESCE(NEW.total_amount, 0);
  v_subtotal numeric := COALESCE(NEW.subtotal, NEW.total_amount, 0);
  v_tax_amount numeric := COALESCE(NEW.tax_amount, 0);
BEGIN
  IF v_invoice_total <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT id
  INTO v_ar_account_id
  FROM public.chart_of_accounts
  WHERE company_id = NEW.company_id
    AND is_active = true
    AND COALESCE(is_header, false) = false
    AND account_code IN ('11211', '11212', '1130301', '11301', '12101', '1201')
  ORDER BY CASE account_code
    WHEN '11211' THEN 1
    WHEN '11212' THEN 2
    WHEN '1130301' THEN 3
    WHEN '11301' THEN 4
    WHEN '12101' THEN 5
    WHEN '1201' THEN 6
    ELSE 99
  END
  LIMIT 1;

  SELECT id
  INTO v_revenue_account_id
  FROM public.chart_of_accounts
  WHERE company_id = NEW.company_id
    AND is_active = true
    AND COALESCE(is_header, false) = false
    AND account_code IN ('4101', '41101', '4110', '4123')
  ORDER BY CASE account_code
    WHEN '4101' THEN 1
    WHEN '41101' THEN 2
    WHEN '4110' THEN 3
    WHEN '4123' THEN 4
    ELSE 99
  END
  LIMIT 1;

  IF v_ar_account_id IS NULL OR v_revenue_account_id IS NULL THEN
    RAISE NOTICE 'Skipping invoice journal entry for %, missing AR or revenue account.', NEW.id;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.journal_entries
    WHERE company_id = NEW.company_id
      AND reference_type = 'invoice'
      AND reference_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  v_entry_number := 'JE-INV-' || TO_CHAR(COALESCE(NEW.invoice_date, CURRENT_DATE), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 8);

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
    posted_by,
    posted_at
  ) VALUES (
    NEW.company_id,
    v_entry_number,
    COALESCE(NEW.invoice_date, CURRENT_DATE),
    'Invoice journal entry: ' || COALESCE(NEW.invoice_number, NEW.id::text),
    v_invoice_total,
    v_invoice_total,
    'draft',
    'invoice',
    NEW.id,
    auth.uid(),
    NULL,
    NULL
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id,
    account_id,
    debit_amount,
    credit_amount,
    line_description,
    line_number
  ) VALUES (
    v_journal_id,
    v_ar_account_id,
    v_invoice_total,
    0,
    'Customer receivable for invoice ' || COALESCE(NEW.invoice_number, NEW.id::text),
    1
  );

  INSERT INTO public.journal_entry_lines (
    journal_entry_id,
    account_id,
    debit_amount,
    credit_amount,
    line_description,
    line_number
  ) VALUES (
    v_journal_id,
    v_revenue_account_id,
    0,
    v_subtotal,
    'Rental revenue for invoice ' || COALESCE(NEW.invoice_number, NEW.id::text),
    2
  );

  IF v_tax_amount > 0 THEN
    SELECT id
    INTO v_tax_account_id
    FROM public.chart_of_accounts
    WHERE company_id = NEW.company_id
      AND is_active = true
      AND COALESCE(is_header, false) = false
      AND account_code IN ('2201', '21401')
    ORDER BY account_code
    LIMIT 1;

    IF v_tax_account_id IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        line_description,
        line_number
      ) VALUES (
        v_journal_id,
        v_tax_account_id,
        0,
        v_tax_amount,
        'Tax on invoice ' || COALESCE(NEW.invoice_number, NEW.id::text),
        3
      );
    END IF;
  END IF;

  UPDATE public.journal_entries
  SET status = 'posted',
      posted_by = auth.uid(),
      posted_at = now(),
      updated_at = now()
  WHERE id = v_journal_id;

  UPDATE public.invoices
  SET journal_entry_id = v_journal_id,
      updated_at = now()
  WHERE id = NEW.id
    AND journal_entry_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_journal_entry ON public.invoices;
CREATE TRIGGER trg_invoice_journal_entry
AFTER INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.create_invoice_journal_entry();
