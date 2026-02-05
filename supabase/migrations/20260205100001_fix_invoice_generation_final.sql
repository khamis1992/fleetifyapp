-- ================================================================
-- COMPREHENSIVE FIX: Invoice Generation System (Final Version)
-- Date: 2026-02-05
-- Description: Complete overhaul of invoice generation functions to fix
--              invoice_number generation and prevent duplicates
-- ================================================================

-- ================================================================
-- 1. Fix: generate_invoice_for_contract_month
-- ================================================================
CREATE OR REPLACE FUNCTION generate_invoice_for_contract_month(
  p_contract_id UUID,
  p_invoice_month DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_invoice_id UUID;
  v_invoice_number VARCHAR(50);
  v_total_amount DECIMAL(15,3);
  v_invoice_date DATE;
  v_due_date DATE;
BEGIN
  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id;
  END IF;
  IF v_contract.start_date > p_invoice_month OR 
     (v_contract.end_date IS NOT NULL AND v_contract.end_date < p_invoice_month) THEN
    RAISE NOTICE 'Contract % is not active in month %', p_contract_id, p_invoice_month;
    RETURN NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM invoices inv
    WHERE inv.contract_id = p_contract_id
      AND ((inv.due_date IS NOT NULL AND DATE_TRUNC('month', inv.due_date)::DATE = p_invoice_month)
        OR (inv.due_date IS NULL AND inv.invoice_date IS NOT NULL AND DATE_TRUNC('month', inv.invoice_date)::DATE = p_invoice_month))
      AND inv.status != 'cancelled'
  ) THEN
    RAISE NOTICE 'Invoice already exists for contract % in month %', p_contract_id, p_invoice_month;
    RETURN NULL;
  END IF;
  v_invoice_date := p_invoice_month;
  v_due_date := p_invoice_month;
  v_total_amount := COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0);
  SELECT 'INV-' || TO_CHAR(p_invoice_month, 'YYYYMM') || '-' || 
         LPAD((COALESCE(MAX(CAST(SUBSTRING(inv.invoice_number FROM 'INV-[0-9]{6}-([0-9]+)') AS INTEGER)), 0) + 1)::TEXT, 5, '0')
  INTO v_invoice_number
  FROM invoices inv
  WHERE inv.company_id = v_contract.company_id
    AND inv.invoice_number LIKE 'INV-' || TO_CHAR(p_invoice_month, 'YYYYMM') || '-%';
  INSERT INTO invoices (
    company_id, customer_id, contract_id, invoice_number, invoice_date, due_date,
    total_amount, subtotal, tax_amount, discount_amount, paid_amount, balance_due,
    status, payment_status, invoice_type, notes, created_at, updated_at
  ) VALUES (
    v_contract.company_id, v_contract.customer_id, v_contract.id, v_invoice_number,
    v_invoice_date, v_due_date, v_total_amount, v_total_amount, 0, 0, 0, v_total_amount,
    'sent', 'unpaid', 'service',
    'فاتورة إيجار شهرية - ' || TO_CHAR(p_invoice_month, 'YYYY-MM') || ' - عقد #' || v_contract.contract_number,
    NOW(), NOW()
  ) RETURNING id INTO v_invoice_id;
  RAISE NOTICE 'Created invoice % for contract % - Month: %', v_invoice_number, v_contract.contract_number, p_invoice_month;
  RETURN v_invoice_id;
END;
$$;

COMMENT ON FUNCTION generate_invoice_for_contract_month(UUID, DATE) IS 
'Generates a single invoice for a contract for a specific month. Uses MAX() for invoice number generation to prevent duplicates.';

-- ================================================================
-- 2. Update: generate_monthly_invoices_for_date
-- ================================================================
CREATE OR REPLACE FUNCTION generate_monthly_invoices_for_date(
  p_company_id UUID,
  p_invoice_month DATE
)
RETURNS TABLE (
  contract_id UUID,
  invoice_id UUID,
  invoice_number VARCHAR(50),
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_invoice_id UUID;
  v_count INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  IF p_invoice_month > DATE_TRUNC('month', CURRENT_DATE)::DATE THEN
    RAISE NOTICE 'Cannot generate invoices for future month: %', p_invoice_month;
    RETURN QUERY SELECT 
      NULL::UUID,
      NULL::UUID,
      NULL::VARCHAR(50),
      'future_date_not_allowed'::TEXT;
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
          (SELECT inv.invoice_number FROM invoices inv WHERE inv.id = v_invoice_id),
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
$$;

COMMENT ON FUNCTION generate_monthly_invoices_for_date(UUID, DATE) IS 
'Generates invoices for all active contracts and contracts under legal procedure for a specific month. Includes comprehensive error handling.';

-- ================================================================
-- 3. Fix: smart_backfill_contract_invoices
-- ================================================================
CREATE OR REPLACE FUNCTION smart_backfill_contract_invoices(
  p_company_id UUID,
  p_contract_id UUID DEFAULT NULL,
  p_start_month DATE DEFAULT NULL,
  p_end_month DATE DEFAULT NULL
)
RETURNS TABLE (
  contract_number VARCHAR(50),
  months_processed INTEGER,
  invoices_created INTEGER,
  invoices_skipped INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_current_month DATE;
  v_invoice_id UUID;
  v_months_count INTEGER;
  v_created_count INTEGER;
  v_skipped_count INTEGER;
  v_start_month DATE;
  v_end_month DATE;
BEGIN
  RAISE NOTICE 'Starting smart backfill process...';
  v_end_month := COALESCE(p_end_month, DATE_TRUNC('month', CURRENT_DATE)::DATE);
  FOR v_contract IN
    SELECT c.*
    FROM contracts c
    WHERE c.company_id = p_company_id
      AND c.status IN ('active', 'under_legal_procedure')
      AND (p_contract_id IS NULL OR c.id = p_contract_id)
    ORDER BY c.start_date
  LOOP
    v_months_count := 0;
    v_created_count := 0;
    v_skipped_count := 0;
    RAISE NOTICE 'Processing contract: % (Start: %)', v_contract.contract_number, v_contract.start_date;
    IF p_start_month IS NOT NULL THEN
      v_start_month := p_start_month;
    ELSE
      v_start_month := DATE_TRUNC('month', v_contract.start_date + INTERVAL '1 month')::DATE;
    END IF;
    v_current_month := v_start_month;
    WHILE v_current_month <= v_end_month LOOP
      IF v_contract.end_date IS NOT NULL AND v_current_month > v_contract.end_date THEN
        EXIT;
      END IF;
      v_months_count := v_months_count + 1;
      BEGIN
        v_invoice_id := generate_invoice_for_contract_month(v_contract.id, v_current_month);
        IF v_invoice_id IS NOT NULL THEN
          v_created_count := v_created_count + 1;
        ELSE
          v_skipped_count := v_skipped_count + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create invoice for contract % month %: %', 
          v_contract.contract_number, v_current_month, SQLERRM;
        v_skipped_count := v_skipped_count + 1;
      END;
      v_current_month := (v_current_month + INTERVAL '1 month')::DATE;
    END LOOP;
    RETURN QUERY SELECT 
      v_contract.contract_number,
      v_months_count,
      v_created_count,
      v_skipped_count,
      CASE 
        WHEN v_created_count > 0 THEN 'success'
        WHEN v_skipped_count = v_months_count THEN 'all_skipped'
        ELSE 'partial'
      END::TEXT;
    RAISE NOTICE 'Contract %: % months processed, % created, % skipped',
      v_contract.contract_number, v_months_count, v_created_count, v_skipped_count;
  END LOOP;
  RAISE NOTICE 'Smart backfill process completed!';
END;
$$;

COMMENT ON FUNCTION smart_backfill_contract_invoices(UUID, UUID, DATE, DATE) IS 
'Smart backfill function that creates missing invoices for contracts. Supports date range filtering and includes contracts under legal procedure.';
