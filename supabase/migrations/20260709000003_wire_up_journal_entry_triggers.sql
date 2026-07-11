-- Phase 2: Automated Accounting - Journal Entry Integration
-- Wires up journal entry creation to payments, contracts, and reversals.

-- =============================================================================
-- 1. Payment Journal Entry Trigger (fires on insert or payment_status change)
-- =============================================================================

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

DROP TRIGGER IF EXISTS trg_payment_journal_entry ON payments;
CREATE TRIGGER trg_payment_journal_entry
  AFTER INSERT OR UPDATE OF payment_status ON payments
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed')
  EXECUTE FUNCTION public.trg_payment_journal_entry_fn();

-- =============================================================================
-- 2. Invoice Journal Entry Trigger (fires on insert)
-- =============================================================================

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

DROP TRIGGER IF EXISTS trg_invoice_journal_entry ON invoices;
CREATE TRIGGER trg_invoice_journal_entry
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_invoice_journal_entry_fn();

-- =============================================================================
-- 3. Reversal Journal Entry Function (called from PaymentStateMachine)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reverse_journal_entry(
  p_original_journal_entry_id uuid,
  p_reason text DEFAULT 'Payment reversal'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reversal_id uuid;
  v_company_id uuid;
  v_entry_number text;
  v_original_record record;
BEGIN
  SELECT * INTO v_original_record
  FROM public.journal_entries
  WHERE id = p_original_journal_entry_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_reversal_id
  FROM public.journal_entries
  WHERE reversal_entry_id = p_original_journal_entry_id
  LIMIT 1;

  IF v_reversal_id IS NOT NULL THEN
    RETURN v_reversal_id;
  END IF;

  v_company_id := v_original_record.company_id;

  v_entry_number := 'REV-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substring(p_original_journal_entry_id::text, 1, 8);

  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description,
    total_debit, total_credit, status, reference_type, reference_id,
    reversal_entry_id, created_by
  )
  VALUES (
    v_company_id, v_entry_number, CURRENT_DATE,
    'Reversal: ' || v_original_record.entry_number || ' - ' || p_reason,
    v_original_record.total_credit, v_original_record.total_debit,
    'posted', v_original_record.reference_type, v_original_record.reference_id,
    p_original_journal_entry_id, v_original_record.posted_by
  )
  RETURNING id INTO v_reversal_id;

  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
  SELECT
    v_reversal_id,
    jel.account_id,
    jel.line_number,
    'REVERSED: ' || COALESCE(jel.line_description, ''),
    jel.credit_amount,
    jel.debit_amount
  FROM public.journal_entry_lines jel
  WHERE jel.journal_entry_id = p_original_journal_entry_id
  ORDER BY jel.line_number;

  UPDATE public.journal_entries
  SET status = 'reversed', posted_by = v_original_record.posted_by, posted_at = now(), updated_at = now()
  WHERE id = p_original_journal_entry_id
    AND status = 'posted';

  RETURN v_reversal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_journal_entry(uuid, text) TO authenticated;

-- =============================================================================
-- 4. Contract Journal Entry (called from ContractService)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(
  p_contract_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contract record;
  v_entry_number text;
  v_journal_id uuid;
  v_receivable_account_id uuid;
  v_revenue_account_id uuid;
BEGIN
  SELECT * INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_contract.journal_entry_id IS NOT NULL THEN
    RETURN v_contract.journal_entry_id;
  END IF;

  SELECT id INTO v_journal_id
  FROM public.journal_entries
  WHERE company_id = v_contract.company_id
    AND reference_type = 'contract'
    AND reference_id = p_contract_id
  LIMIT 1;

  IF v_journal_id IS NOT NULL THEN
    UPDATE public.contracts SET journal_entry_id = v_journal_id WHERE id = p_contract_id;
    RETURN v_journal_id;
  END IF;

  SELECT am.chart_of_accounts_id INTO v_receivable_account_id
  FROM public.account_mappings am
  JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
  WHERE am.company_id = v_contract.company_id
    AND dat.type_code = 'RECEIVABLES'
    AND am.is_active = true
  LIMIT 1;

  SELECT am.chart_of_accounts_id INTO v_revenue_account_id
  FROM public.account_mappings am
  JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
  WHERE am.company_id = v_contract.company_id
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

  IF v_receivable_account_id IS NULL OR v_revenue_account_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_entry_number := 'CNT-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || substring(p_contract_id::text, 1, 8);

  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description,
    total_debit, total_credit, status, reference_type, reference_id, created_by
  )
  VALUES (
    v_contract.company_id, v_entry_number, CURRENT_DATE,
    'Contract Revenue - ' || v_contract.contract_number,
    v_contract.contract_amount, v_contract.contract_amount,
    'posted', 'contract', p_contract_id, v_contract.created_by
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
  VALUES
    (v_journal_id, v_receivable_account_id, 1, 'Accounts Receivable - ' || v_contract.contract_number, v_contract.contract_amount, 0),
    (v_journal_id, v_revenue_account_id, 2, 'Contract Revenue - ' || v_contract.contract_number, 0, v_contract.contract_amount);

  UPDATE public.contracts
  SET journal_entry_id = v_journal_id, updated_at = now()
  WHERE id = p_contract_id;

  RETURN v_journal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_contract_journal_entry(uuid) TO authenticated;
