-- ================================================================
-- Migration: Fix Invoice Payment Status Trigger
-- Created: 2026-01-15
-- Description: Fix the update_invoice_payment_status function to use
--              the correct column name 'payment_status' instead of 'status'
-- Impact: HIGH - Fixes payment recording issues
-- ================================================================

-- The original trigger was using 'status = completed' which doesn't exist
-- in the payments table. The correct column is 'payment_status'.

-- ================================================================
-- Step 1: Drop existing trigger
-- ================================================================
DROP TRIGGER IF EXISTS trigger_update_invoice_payment_status ON payments;

-- ================================================================
-- Step 2: Create fixed function
-- ================================================================
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_total_paid NUMERIC;
    v_invoice_total NUMERIC;
    v_invoice_id UUID;
    v_new_status TEXT;
BEGIN
    -- Determine which invoice to update
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Skip if no invoice linked
    IF v_invoice_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Get invoice total
    SELECT total_amount INTO v_invoice_total
    FROM invoices
    WHERE id = v_invoice_id;
    
    -- Skip if invoice not found
    IF v_invoice_total IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculate total paid using CORRECT column name: payment_status
    -- Fixed: Changed from 'status' to 'payment_status'
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments
    WHERE invoice_id = v_invoice_id
    AND payment_status = 'completed';  -- ✅ Fixed: was 'status'

    -- Determine new status
    IF v_total_paid <= 0 THEN
        v_new_status := 'unpaid';
    ELSIF v_total_paid >= v_invoice_total THEN
        v_new_status := 'paid';
    ELSE
        v_new_status := 'partial';
    END IF;

    -- Update invoice status AND amounts
    -- This ensures paid_amount and balance_due are always in sync
    UPDATE invoices
    SET
        payment_status = v_new_status,
        paid_amount = v_total_paid,
        balance_due = GREATEST(0, v_invoice_total - v_total_paid),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_invoice_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add documentation
COMMENT ON FUNCTION update_invoice_payment_status IS
'Updates invoice payment_status, paid_amount, and balance_due based on sum of completed payments.
Fixed 2026-01-15: Changed status to payment_status to match actual table schema.';

-- ================================================================
-- Step 3: Recreate trigger
-- ================================================================
CREATE TRIGGER trigger_update_invoice_payment_status
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

COMMENT ON TRIGGER trigger_update_invoice_payment_status ON payments IS
'Auto-update invoice payment status and amounts based on payment changes.
Fixed 2026-01-15: Uses payment_status column correctly.';

-- ================================================================
-- Step 4: Fix any existing invoices with incorrect data
-- ================================================================
-- Recalculate paid_amount and balance_due for all invoices
UPDATE invoices i
SET
    paid_amount = COALESCE(p.total_paid, 0),
    balance_due = GREATEST(0, i.total_amount - COALESCE(p.total_paid, 0)),
    payment_status = CASE
        WHEN COALESCE(p.total_paid, 0) <= 0 THEN 'unpaid'
        WHEN COALESCE(p.total_paid, 0) >= i.total_amount THEN 'paid'
        ELSE 'partial'
    END,
    updated_at = CURRENT_TIMESTAMP
FROM (
    SELECT 
        invoice_id,
        SUM(amount) as total_paid
    FROM payments
    WHERE payment_status = 'completed'
    AND invoice_id IS NOT NULL
    GROUP BY invoice_id
) p
WHERE i.id = p.invoice_id;

-- Also fix invoices with no payments (should be unpaid)
UPDATE invoices
SET
    paid_amount = 0,
    balance_due = total_amount,
    payment_status = 'unpaid',
    updated_at = CURRENT_TIMESTAMP
WHERE id NOT IN (
    SELECT DISTINCT invoice_id 
    FROM payments 
    WHERE invoice_id IS NOT NULL 
    AND payment_status = 'completed'
)
AND (paid_amount > 0 OR payment_status != 'unpaid');

-- ================================================================
-- Step 5: Success message
-- ================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Fixed update_invoice_payment_status trigger';
    RAISE NOTICE '✅ Changed status -> payment_status (correct column name)';
    RAISE NOTICE '✅ Trigger now updates paid_amount and balance_due too';
    RAISE NOTICE '✅ Recalculated all invoice amounts from payments';
END $$;
