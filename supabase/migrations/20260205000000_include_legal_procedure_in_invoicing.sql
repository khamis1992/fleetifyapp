-- ================================================================
-- Migration: Include contracts under legal procedure in invoicing
-- Date: 2026-02-05
-- Description: Update invoice generation functions to include contracts
--              with status 'under_legal_procedure'
-- ================================================================

-- ================================================================
-- 1. Fix: generate_journal_entry_number - Remove ambiguous column reference
-- ================================================================
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    next_number INTEGER;
    year_month_suffix TEXT;
    entry_number_result TEXT;
BEGIN
    year_month_suffix := TO_CHAR(CURRENT_DATE, 'YYYYMM');
    
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(je.entry_number FROM 'JE-[0-9]{6}-([0-9]+)') AS INTEGER)), 0
    ) + 1
    INTO next_number
    FROM public.journal_entries je
    WHERE je.company_id = company_id_param 
    AND je.entry_number LIKE 'JE-' || year_month_suffix || '-%';
    
    entry_number_result := 'JE-' || year_month_suffix || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN entry_number_result;
END;
$function$;

COMMENT ON FUNCTION public.generate_journal_entry_number(UUID) IS 
'Generates unique journal entry numbers in format JE-YYYYMM-NNNN. Uses MAX() with table alias to avoid ambiguity.';

-- ================================================================
-- 2. Update: generate_monthly_invoices_for_date - Include legal procedure contracts
-- ================================================================
CREATE OR REPLACE FUNCTION public.generate_monthly_invoices_for_date(p_company_id uuid, p_invoice_month date)
RETURNS TABLE(contract_id uuid, invoice_id uuid, invoice_number character varying, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contract RECORD;
  v_invoice_id UUID;
  v_count INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  IF p_invoice_month > DATE_TRUNC('month', CURRENT_DATE)::DATE THEN
    RAISE NOTICE 'Cannot generate invoices for future month: %', p_invoice_month;
    RETURN QUERY SELECT 
      NULL::UUID as contract_id,
      NULL::UUID as invoice_id,
      NULL::VARCHAR(50) as invoice_number,
      'future_date_not_allowed'::TEXT as status;
    RETURN;
  END IF;

  RAISE NOTICE 'Generating invoices for month: % (Company: %)', p_invoice_month, p_company_id;

  FOR v_contract IN
    SELECT c.*
    FROM contracts c
    WHERE c.company_id = p_company_id
      AND c.status IN ('active', 'under_legal_procedure')
      AND c.start_date <= p_invoice_month
      AND (c.end_date IS NULL OR c.end_date >= p_invoice_month)
    ORDER BY c.contract_number
  LOOP
    BEGIN
      v_invoice_id := generate_invoice_for_contract_month(v_contract.id, p_invoice_month);
      
      IF v_invoice_id IS NOT NULL THEN
        v_count := v_count + 1;
        RETURN QUERY SELECT 
          v_contract.id,
          v_invoice_id,
          (SELECT invoice_number FROM invoices WHERE id = v_invoice_id),
          'created'::TEXT;
      ELSE
        v_skipped := v_skipped + 1;
        RETURN QUERY SELECT 
          v_contract.id,
          NULL::UUID,
          NULL::VARCHAR(50),
          'skipped'::TEXT;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create invoice for contract %: %', v_contract.contract_number, SQLERRM;
      RETURN QUERY SELECT 
        v_contract.id,
        NULL::UUID,
        NULL::VARCHAR(50),
        ('error: ' || SQLERRM)::TEXT;
    END;
  END LOOP;

  RAISE NOTICE 'Completed: % invoices created, % skipped', v_count, v_skipped;
END;
$function$;

COMMENT ON FUNCTION public.generate_monthly_invoices_for_date(UUID, DATE) IS 
'Generates invoices for all active contracts and contracts under legal procedure for a specific month';
