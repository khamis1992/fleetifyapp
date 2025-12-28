-- Migration: Create Contract Financial Summary Views (v2)
-- Purpose: Calculate contract financial fields automatically from invoices
-- Date: 2025-12-28
-- Version: 2.0 - Updated to handle legitimate dues vs future invoices

-- IMPORTANT NOTE:
-- When a contract is cancelled, only FUTURE unpaid invoices (after cancellation date) should be deleted.
-- Unpaid invoices during the contract period are LEGITIMATE DUES and must be retained.

-- Drop existing view if exists
DROP VIEW IF EXISTS contract_financial_summary;

-- Create contract financial summary view
CREATE OR REPLACE VIEW contract_financial_summary AS
SELECT 
  c.id as contract_id,
  c.contract_number,
  c.status,
  c.customer_id,
  c.vehicle_id,
  c.company_id,
  c.start_date,
  c.end_date,
  -- Financial calculations from invoices
  COALESCE(SUM(i.total_amount), 0) as calculated_contract_amount,
  COALESCE(SUM(i.paid_amount), 0) as calculated_total_paid,
  COALESCE(SUM(i.balance_due), 0) as calculated_balance_due,
  -- Invoice statistics
  COUNT(i.id) as total_invoices,
  COUNT(CASE WHEN i.payment_status = 'paid' THEN 1 END) as paid_invoices,
  COUNT(CASE WHEN i.payment_status = 'unpaid' THEN 1 END) as unpaid_invoices,
  COUNT(CASE WHEN i.payment_status = 'partial' THEN 1 END) as partial_invoices,
  -- Legitimate dues (unpaid invoices during contract period)
  COUNT(CASE 
    WHEN i.payment_status = 'unpaid' 
    AND i.due_date <= CURRENT_DATE 
    THEN 1 
  END) as legitimate_dues_count,
  COALESCE(SUM(CASE 
    WHEN i.payment_status = 'unpaid' 
    AND i.due_date <= CURRENT_DATE 
    THEN i.balance_due 
    ELSE 0 
  END), 0) as legitimate_dues_amount,
  -- Future invoices (unpaid invoices after current date)
  COUNT(CASE 
    WHEN i.payment_status = 'unpaid' 
    AND i.due_date > CURRENT_DATE 
    THEN 1 
  END) as future_invoices_count,
  COALESCE(SUM(CASE 
    WHEN i.payment_status = 'unpaid' 
    AND i.due_date > CURRENT_DATE 
    THEN i.balance_due 
    ELSE 0 
  END), 0) as future_invoices_amount,
  -- Original contract values for comparison
  c.contract_amount as original_contract_amount,
  c.total_paid as original_total_paid,
  c.balance_due as original_balance_due,
  -- Consistency check
  CASE 
    WHEN c.contract_amount != COALESCE(SUM(i.total_amount), 0) THEN false
    WHEN c.total_paid != COALESCE(SUM(i.paid_amount), 0) THEN false
    WHEN c.balance_due != COALESCE(SUM(i.balance_due), 0) THEN false
    ELSE true
  END as is_consistent,
  -- Timestamps
  c.created_at,
  c.updated_at
FROM contracts c
LEFT JOIN invoices i ON c.id = i.contract_id
GROUP BY 
  c.id, 
  c.contract_number, 
  c.status,
  c.customer_id,
  c.vehicle_id,
  c.company_id,
  c.start_date,
  c.end_date,
  c.contract_amount,
  c.total_paid,
  c.balance_due,
  c.created_at,
  c.updated_at;

-- Add comment to view
COMMENT ON VIEW contract_financial_summary IS 'Provides calculated financial summary for each contract based on invoices, with distinction between legitimate dues and future invoices';

-- Create a function to sync contract financial fields from invoices
CREATE OR REPLACE FUNCTION sync_contract_financial_fields(p_contract_id UUID)
RETURNS void AS $$
DECLARE
  v_total_amount DECIMAL(10,2);
  v_total_paid DECIMAL(10,2);
  v_balance_due DECIMAL(10,2);
BEGIN
  -- Calculate totals from invoices
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(paid_amount), 0),
    COALESCE(SUM(balance_due), 0)
  INTO v_total_amount, v_total_paid, v_balance_due
  FROM invoices
  WHERE contract_id = p_contract_id;

  -- Update contract with calculated values
  UPDATE contracts
  SET 
    contract_amount = v_total_amount,
    total_paid = v_total_paid,
    balance_due = v_balance_due,
    updated_at = NOW()
  WHERE id = p_contract_id;
  
  -- Log the sync
  RAISE NOTICE 'Synced financial fields for contract %: amount=%, paid=%, balance=%', 
    p_contract_id, v_total_amount, v_total_paid, v_balance_due;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION sync_contract_financial_fields IS 'Synchronizes contract financial fields (contract_amount, total_paid, balance_due) from invoices table';

-- Create a function to sync all contracts
CREATE OR REPLACE FUNCTION sync_all_contracts_financial_fields()
RETURNS TABLE(
  contract_id UUID,
  contract_number TEXT,
  synced BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_contract RECORD;
BEGIN
  FOR v_contract IN 
    SELECT id, contract_number FROM contracts
  LOOP
    BEGIN
      PERFORM sync_contract_financial_fields(v_contract.id);
      
      contract_id := v_contract.id;
      contract_number := v_contract.contract_number;
      synced := true;
      error_message := NULL;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      contract_id := v_contract.id;
      contract_number := v_contract.contract_number;
      synced := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION sync_all_contracts_financial_fields IS 'Synchronizes financial fields for all contracts from their invoices';

-- Create a function to clean up FUTURE invoices for cancelled contracts
CREATE OR REPLACE FUNCTION cleanup_future_invoices_for_cancelled_contracts()
RETURNS TABLE(
  contract_id UUID,
  contract_number TEXT,
  deleted_count INTEGER,
  total_amount DECIMAL(10,2)
) AS $$
DECLARE
  v_contract RECORD;
  v_deleted_count INTEGER;
  v_total_amount DECIMAL(10,2);
BEGIN
  FOR v_contract IN 
    SELECT c.id, c.contract_number, c.updated_at
    FROM contracts c
    WHERE c.status = 'cancelled'
  LOOP
    -- Calculate total before deletion
    SELECT 
      COUNT(*),
      COALESCE(SUM(balance_due), 0)
    INTO v_deleted_count, v_total_amount
    FROM invoices
    WHERE contract_id = v_contract.id
    AND payment_status = 'unpaid'
    AND due_date > CURRENT_DATE;
    
    -- Delete future unpaid invoices
    DELETE FROM invoices
    WHERE contract_id = v_contract.id
    AND payment_status = 'unpaid'
    AND due_date > CURRENT_DATE;
    
    -- Return results if any invoices were deleted
    IF v_deleted_count > 0 THEN
      contract_id := v_contract.id;
      contract_number := v_contract.contract_number;
      deleted_count := v_deleted_count;
      total_amount := v_total_amount;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION cleanup_future_invoices_for_cancelled_contracts IS 'Cleans up FUTURE unpaid invoices for cancelled contracts. Retains unpaid invoices during contract period as legitimate dues.';

-- Create a trigger to auto-sync contract when invoice changes
CREATE OR REPLACE FUNCTION trigger_sync_contract_on_invoice_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync the contract when invoice is inserted, updated, or deleted
  IF TG_OP = 'DELETE' THEN
    PERFORM sync_contract_financial_fields(OLD.contract_id);
  ELSE
    PERFORM sync_contract_financial_fields(NEW.contract_id);
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS sync_contract_on_invoice_change ON invoices;

-- Create trigger on invoices table
CREATE TRIGGER sync_contract_on_invoice_change
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_contract_on_invoice_change();

-- Add comment to trigger
COMMENT ON TRIGGER sync_contract_on_invoice_change ON invoices IS 'Automatically syncs contract financial fields when invoices are modified';

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT ON contract_financial_summary TO authenticated;
-- GRANT EXECUTE ON FUNCTION sync_contract_financial_fields TO authenticated;
-- GRANT EXECUTE ON FUNCTION sync_all_contracts_financial_fields TO authenticated;
-- GRANT EXECUTE ON FUNCTION cleanup_future_invoices_for_cancelled_contracts TO authenticated;
