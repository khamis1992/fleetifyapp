-- Fix journal creation order for automatic financial integrations.
-- Rollback plan: re-apply the previous function definitions from
-- 20250112001000_create_journal_entry_triggers.sql and
-- 20250829220000_fix_contract_journal_creation.sql if needed.

CREATE OR REPLACE FUNCTION public.create_payment_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry_number text;
  v_journal_id uuid;
  v_cash_account_id uuid;
  v_revenue_account_id uuid;
  v_ar_account_id uuid;
BEGIN
  IF NEW.payment_status <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id
  INTO v_journal_id
  FROM public.journal_entries
  WHERE company_id = NEW.company_id
    AND reference_type = 'payment'
    AND reference_id = NEW.id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_journal_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_cash_account_id
  FROM public.chart_of_accounts
  WHERE company_id = NEW.company_id
    AND account_code = '1101'
    AND is_active = true
  LIMIT 1;

  SELECT id INTO v_ar_account_id
  FROM public.chart_of_accounts
  WHERE company_id = NEW.company_id
    AND account_code = '1201'
    AND is_active = true
  LIMIT 1;

  SELECT id INTO v_revenue_account_id
  FROM public.chart_of_accounts
  WHERE company_id = NEW.company_id
    AND account_code = '4101'
    AND is_active = true
  LIMIT 1;

  IF v_cash_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.invoice_id IS NOT NULL AND v_ar_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.invoice_id IS NULL AND v_revenue_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_entry_number := 'PAY-' || to_char(COALESCE(NEW.payment_date, CURRENT_DATE), 'YYYYMMDD') || '-' || substring(NEW.id::text, 1, 8);

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
    created_by
  )
  VALUES (
    NEW.company_id,
    v_entry_number,
    COALESCE(NEW.payment_date, CURRENT_DATE),
    'Payment receipt: ' || COALESCE(NEW.payment_number, NEW.reference_number, NEW.id::text),
    NEW.amount,
    NEW.amount,
    'draft',
    'payment',
    NEW.id,
    auth.uid()
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id,
    account_id,
    line_number,
    line_description,
    debit_amount,
    credit_amount
  )
  VALUES
    (
      v_journal_id,
      v_cash_account_id,
      1,
      'Payment received',
      NEW.amount,
      0
    ),
    (
      v_journal_id,
      CASE WHEN NEW.invoice_id IS NOT NULL THEN v_ar_account_id ELSE v_revenue_account_id END,
      2,
      CASE WHEN NEW.invoice_id IS NOT NULL THEN 'Receivables settlement' ELSE 'Direct revenue' END,
      0,
      NEW.amount
    );

  UPDATE public.journal_entries
  SET status = 'posted',
      posted_by = auth.uid(),
      posted_at = now(),
      updated_at = now()
  WHERE id = v_journal_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_invoice_journal_entry()
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

  SELECT id
  INTO v_journal_id
  FROM public.journal_entries
  WHERE company_id = NEW.company_id
    AND reference_type = 'invoice'
    AND reference_id = NEW.id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_journal_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_ar_account_id
  FROM public.chart_of_accounts
  WHERE company_id = NEW.company_id
    AND account_code = '1201'
    AND is_active = true
  LIMIT 1;

  SELECT id INTO v_revenue_account_id
  FROM public.chart_of_accounts
  WHERE company_id = NEW.company_id
    AND account_code = '4101'
    AND is_active = true
  LIMIT 1;

  IF v_ar_account_id IS NULL OR v_revenue_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_entry_number := 'INV-' || to_char(COALESCE(NEW.invoice_date, CURRENT_DATE), 'YYYYMMDD') || '-' || substring(NEW.id::text, 1, 8);

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
    created_by
  )
  VALUES (
    NEW.company_id,
    v_entry_number,
    COALESCE(NEW.invoice_date, CURRENT_DATE),
    'Invoice: ' || COALESCE(NEW.invoice_number, NEW.id::text),
    NEW.total_amount,
    NEW.total_amount,
    'draft',
    'invoice',
    NEW.id,
    auth.uid()
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id,
    account_id,
    line_number,
    line_description,
    debit_amount,
    credit_amount
  )
  VALUES
    (
      v_journal_id,
      v_ar_account_id,
      1,
      'Customer receivable',
      NEW.total_amount,
      0
    ),
    (
      v_journal_id,
      v_revenue_account_id,
      2,
      'Service revenue',
      0,
      COALESCE(NEW.subtotal, NEW.total_amount - COALESCE(NEW.tax_amount, 0))
    );

  IF COALESCE(NEW.tax_amount, 0) > 0 THEN
    SELECT id INTO v_tax_account_id
    FROM public.chart_of_accounts
    WHERE company_id = NEW.company_id
      AND account_code = '2201'
      AND is_active = true
    LIMIT 1;

    IF v_tax_account_id IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        line_number,
        line_description,
        debit_amount,
        credit_amount
      )
      VALUES (
        v_journal_id,
        v_tax_account_id,
        3,
        'Collected tax',
        0,
        NEW.tax_amount
      );
    END IF;
  END IF;

  UPDATE public.journal_entries
  SET status = 'posted',
      posted_by = auth.uid(),
      posted_at = now(),
      updated_at = now()
  WHERE id = v_journal_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_contract_with_journal_entry(
  p_company_id uuid,
  p_customer_id uuid,
  p_vehicle_id uuid DEFAULT NULL,
  p_contract_type text DEFAULT 'rental',
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT CURRENT_DATE + INTERVAL '30 days',
  p_contract_amount numeric DEFAULT 0,
  p_monthly_amount numeric DEFAULT 0,
  p_description text DEFAULT NULL,
  p_terms text DEFAULT NULL,
  p_cost_center_id uuid DEFAULT NULL,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contract_id uuid;
  v_contract_number text;
  v_journal_entry_id uuid;
  v_journal_entry_number text;
  v_receivable_account_id uuid;
  v_revenue_account_id uuid;
  v_result jsonb;
  v_warnings text[] := '{}';
  v_requires_manual_entry boolean := false;
BEGIN
  IF p_company_id IS NULL OR p_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Company ID and Customer ID are required');
  END IF;

  SELECT 'CNT-' || to_char(CURRENT_DATE, 'YY') || '-' || lpad((
    SELECT COUNT(*) + 1
    FROM public.contracts
    WHERE company_id = p_company_id
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
  )::text, 4, '0')
  INTO v_contract_number;

  INSERT INTO public.contracts (
    id,
    company_id,
    customer_id,
    vehicle_id,
    contract_number,
    contract_type,
    contract_date,
    start_date,
    end_date,
    contract_amount,
    monthly_amount,
    description,
    terms,
    status,
    cost_center_id,
    created_by
  )
  VALUES (
    gen_random_uuid(),
    p_company_id,
    p_customer_id,
    p_vehicle_id,
    v_contract_number,
    p_contract_type,
    CURRENT_DATE,
    p_start_date,
    p_end_date,
    p_contract_amount,
    p_monthly_amount,
    p_description,
    p_terms,
    'draft',
    p_cost_center_id,
    p_created_by
  )
  RETURNING id INTO v_contract_id;

  IF COALESCE(p_contract_amount, 0) > 0 THEN
    BEGIN
      SELECT am.chart_of_accounts_id
      INTO v_receivable_account_id
      FROM public.account_mappings am
      JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
      WHERE am.company_id = p_company_id
        AND dat.type_code = 'RECEIVABLES'
        AND am.is_active = true
      LIMIT 1;

      SELECT am.chart_of_accounts_id
      INTO v_revenue_account_id
      FROM public.account_mappings am
      JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
      WHERE am.company_id = p_company_id
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
        v_requires_manual_entry := true;
        IF v_receivable_account_id IS NULL THEN
          v_warnings := array_append(v_warnings, 'No receivables account mapping found');
        END IF;
        IF v_revenue_account_id IS NULL THEN
          v_warnings := array_append(v_warnings, 'No revenue account mapping found');
        END IF;
      ELSE
        SELECT 'JE-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || lpad((
          SELECT COUNT(*) + 1
          FROM public.journal_entries
          WHERE company_id = p_company_id
            AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND EXTRACT(MONTH FROM entry_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        )::text, 4, '0')
        INTO v_journal_entry_number;

        INSERT INTO public.journal_entries (
          id,
          company_id,
          entry_number,
          entry_date,
          description,
          reference_type,
          reference_id,
          total_debit,
          total_credit,
          status,
          created_by
        )
        VALUES (
          gen_random_uuid(),
          p_company_id,
          v_journal_entry_number,
          CURRENT_DATE,
          'Contract Revenue - ' || v_contract_number,
          'contract',
          v_contract_id,
          p_contract_amount,
          p_contract_amount,
          'draft',
          p_created_by
        )
        RETURNING id INTO v_journal_entry_id;

        INSERT INTO public.journal_entry_lines (
          id,
          journal_entry_id,
          account_id,
          line_number,
          line_description,
          debit_amount,
          credit_amount
        )
        VALUES
          (
            gen_random_uuid(),
            v_journal_entry_id,
            v_receivable_account_id,
            1,
            'Accounts Receivable - ' || v_contract_number,
            p_contract_amount,
            0
          ),
          (
            gen_random_uuid(),
            v_journal_entry_id,
            v_revenue_account_id,
            2,
            'Contract Revenue - ' || v_contract_number,
            0,
            p_contract_amount
          );

        UPDATE public.journal_entries
        SET status = 'posted',
            posted_by = p_created_by,
            posted_at = now(),
            updated_at = now()
        WHERE id = v_journal_entry_id
          AND company_id = p_company_id;

        UPDATE public.contracts
        SET status = 'active',
            journal_entry_id = v_journal_entry_id,
            updated_at = now()
        WHERE id = v_contract_id
          AND company_id = p_company_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_requires_manual_entry := true;
      v_warnings := array_append(v_warnings, 'Journal entry creation failed: ' || SQLERRM);
    END;
  END IF;

  IF v_requires_manual_entry THEN
    UPDATE public.contracts
    SET status = 'draft',
        updated_at = now()
    WHERE id = v_contract_id
      AND company_id = p_company_id;

    v_warnings := array_append(v_warnings, 'Journal entry could not be created automatically. Please create manually.');
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'contract_id', v_contract_id,
    'contract_number', v_contract_number,
    'requires_manual_entry', v_requires_manual_entry
  );

  IF v_journal_entry_id IS NOT NULL THEN
    v_result := v_result || jsonb_build_object(
      'journal_entry_id', v_journal_entry_id,
      'journal_entry_number', v_journal_entry_number
    );
  END IF;

  IF array_length(v_warnings, 1) > 0 THEN
    v_result := v_result || jsonb_build_object('warnings', to_jsonb(v_warnings));
  END IF;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  IF v_contract_id IS NOT NULL THEN
    DELETE FROM public.contracts WHERE id = v_contract_id;
  END IF;

  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_contract_with_journal_entry(
  uuid,
  uuid,
  uuid,
  text,
  date,
  date,
  numeric,
  numeric,
  text,
  text,
  uuid,
  uuid
) TO authenticated;
