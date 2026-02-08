-- ================================================================
-- FIX: Prevent Invoice Dates Before Contract Start Date
-- Date: 2026-02-08
-- Description: Ensures invoices are never created with dates before
--              the contract start date
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
  -- Get contract details
  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  
  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id;
  END IF;
  
  -- Check if contract is active in the requested month
  IF v_contract.start_date > p_invoice_month OR 
     (v_contract.end_date IS NOT NULL AND v_contract.end_date < p_invoice_month) THEN
    RAISE NOTICE 'Contract % is not active in month %', p_contract_id, p_invoice_month;
    RETURN NULL;
  END IF;
  
  -- Check for existing invoice in this month
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
  
  -- ✅ FIX: Ensure invoice date is never before contract start date
  -- Use GREATEST to pick the later date between invoice_month and contract start_date
  v_invoice_date := GREATEST(p_invoice_month, v_contract.start_date);
  v_due_date := GREATEST(p_invoice_month, v_contract.start_date);
  
  -- Calculate total amount
  v_total_amount := COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0);
  
  -- Generate unique invoice number for this month
  SELECT 'INV-' || TO_CHAR(p_invoice_month, 'YYYYMM') || '-' || 
         LPAD((COALESCE(MAX(CAST(SUBSTRING(inv.invoice_number FROM 'INV-[0-9]{6}-([0-9]+)') AS INTEGER)), 0) + 1)::TEXT, 5, '0')
  INTO v_invoice_number
  FROM invoices inv
  WHERE inv.company_id = v_contract.company_id
    AND inv.invoice_number LIKE 'INV-' || TO_CHAR(p_invoice_month, 'YYYYMM') || '-%';
  
  -- Create invoice
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
  
  RAISE NOTICE 'Created invoice % for contract % - Month: % (Invoice Date: %)', 
    v_invoice_number, v_contract.contract_number, p_invoice_month, v_invoice_date;
  
  RETURN v_invoice_id;
END;
$$;

COMMENT ON FUNCTION generate_invoice_for_contract_month(UUID, DATE) IS 
'Generates a single invoice for a contract for a specific month. 
FIXED: Ensures invoice_date and due_date are never before contract start_date using GREATEST().';

-- ================================================================
-- 2. Data Fix: Update Existing Invoices with Invalid Dates
-- ================================================================

-- Find and fix invoices where invoice_date < contract start_date
DO $$
DECLARE
  v_fixed_count INTEGER := 0;
  v_invoice RECORD;
BEGIN
  RAISE NOTICE 'Starting data fix for invoices with dates before contract start...';
  
  -- Find problematic invoices
  FOR v_invoice IN
    SELECT 
      i.id,
      i.invoice_number,
      i.invoice_date,
      i.due_date,
      c.contract_number,
      c.start_date,
      c.customer_id
    FROM invoices i
    INNER JOIN contracts c ON i.contract_id = c.id
    WHERE i.invoice_date < c.start_date
      AND i.status != 'cancelled'
    ORDER BY i.invoice_date
  LOOP
    -- Update invoice dates to match contract start date
    UPDATE invoices
    SET 
      invoice_date = GREATEST(invoice_date, v_invoice.start_date),
      due_date = GREATEST(due_date, v_invoice.start_date),
      updated_at = NOW()
    WHERE id = v_invoice.id;
    
    v_fixed_count := v_fixed_count + 1;
    
    RAISE NOTICE 'Fixed invoice %: % -> % (Contract: %, Start: %)',
      v_invoice.invoice_number,
      v_invoice.invoice_date,
      GREATEST(v_invoice.invoice_date, v_invoice.start_date),
      v_invoice.contract_number,
      v_invoice.start_date;
  END LOOP;
  
  RAISE NOTICE 'Data fix completed: % invoices updated', v_fixed_count;
  
  -- Log the fix in system_logs if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs') THEN
    INSERT INTO system_logs (
      level, category, action, message, metadata, created_at
    ) VALUES (
      'info',
      'data_migration',
      'fix_invoice_dates',
      'Fixed invoices with dates before contract start date',
      jsonb_build_object(
        'fixed_count', v_fixed_count,
        'migration', '20260208000001_fix_invoice_date_before_contract_start'
      ),
      NOW()
    );
  END IF;
END $$;

-- ================================================================
-- 3. Add Validation Check Constraint (Optional - for extra safety)
-- ================================================================

-- Add a check constraint to prevent future invalid data
-- Note: This will only work for new/updated records
DO $$
BEGIN
  -- Check if constraint doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invoices_date_after_contract_start'
  ) THEN
    -- We can't add a direct constraint because it requires joining with contracts table
    -- Instead, we'll rely on the fixed function and add a trigger
    RAISE NOTICE 'Constraint not added - will use trigger validation instead';
  END IF;
END $$;

-- ================================================================
-- 4. Create Trigger to Validate Invoice Dates
-- ================================================================

CREATE OR REPLACE FUNCTION validate_invoice_date_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contract_start_date DATE;
BEGIN
  -- Only validate if contract_id is provided
  IF NEW.contract_id IS NOT NULL THEN
    -- Get contract start date
    SELECT start_date INTO v_contract_start_date
    FROM contracts
    WHERE id = NEW.contract_id;
    
    -- Validate invoice_date
    IF NEW.invoice_date IS NOT NULL AND NEW.invoice_date < v_contract_start_date THEN
      RAISE EXCEPTION 'Invoice date (%) cannot be before contract start date (%)', 
        NEW.invoice_date, v_contract_start_date;
    END IF;
    
    -- Validate due_date
    IF NEW.due_date IS NOT NULL AND NEW.due_date < v_contract_start_date THEN
      RAISE EXCEPTION 'Invoice due date (%) cannot be before contract start date (%)', 
        NEW.due_date, v_contract_start_date;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS validate_invoice_dates_trigger ON invoices;

CREATE TRIGGER validate_invoice_dates_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_invoice_date_before_insert();

COMMENT ON TRIGGER validate_invoice_dates_trigger ON invoices IS
'Validates that invoice dates are not before contract start date';

-- ================================================================
-- 5. Verification Query
-- ================================================================

-- Query to check if any problematic invoices remain
DO $$
DECLARE
  v_problem_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_problem_count
  FROM invoices i
  INNER JOIN contracts c ON i.contract_id = c.id
  WHERE i.invoice_date < c.start_date
    AND i.status != 'cancelled';
  
  IF v_problem_count > 0 THEN
    RAISE WARNING 'Still found % invoices with dates before contract start!', v_problem_count;
  ELSE
    RAISE NOTICE '✅ All invoices have valid dates!';
  END IF;
END $$;
