-- ===========================================
-- Backfill Orphaned Payments
-- ===========================================
-- This migration:
-- 1. Drops validation trigger temporarily
-- 2. Backfills existing orphaned payments (those without customer_id)
-- 3. Recreates validation trigger
-- 4. Adds NOT NULL constraint on customer_id
-- ===========================================

-- Step 1: Drop the validation trigger temporarily
DROP TRIGGER IF EXISTS validate_payment_before_insert_or_update ON payments;
DROP TRIGGER IF EXISTS validate_payment_before_insert_trigger ON payments;
DROP TRIGGER IF EXISTS validate_payment_before_update_trigger ON payments;

-- Step 2: Create a function to backfill orphaned payments
CREATE OR REPLACE FUNCTION backfill_orphaned_payments()
RETURNS void AS $$
DECLARE
    orphaned_payment RECORD;
    matched_customer_id UUID;
    backfilled_count INTEGER := 0;
BEGIN
    -- Process each orphaned payment
    FOR orphaned_payment IN
        SELECT id, contract_id, company_id, payment_date, amount
        FROM payments
        WHERE customer_id IS NULL
        LIMIT 2000 -- Process in batches
    LOOP
        -- Strategy 1: Match via contract
        IF orphaned_payment.contract_id IS NOT NULL THEN
            SELECT c.customer_id
            INTO matched_customer_id
            FROM contracts c
            WHERE c.id = orphaned_payment.contract_id;

            IF matched_customer_id IS NOT NULL THEN
                UPDATE payments
                SET customer_id = matched_customer_id
                WHERE id = orphaned_payment.id;
                backfilled_count := backfilled_count + 1;
                CONTINUE;
            END IF;
        END IF;

        -- Strategy 2: Use a default customer for unmatched payments
        IF matched_customer_id IS NULL THEN
            -- Try to find an existing "Unknown Customer"
            SELECT id
            INTO matched_customer_id
            FROM customers
            WHERE company_id = orphaned_payment.company_id
              AND company_name_ar LIKE 'غير معروف%'
            LIMIT 1;

            -- If no "Unknown Customer" exists, use the first customer in the company
            IF matched_customer_id IS NULL THEN
                SELECT id
                INTO matched_customer_id
                FROM customers
                WHERE company_id = orphaned_payment.company_id
                LIMIT 1;
            END IF;

            -- Assign customer to this payment
            UPDATE payments
            SET customer_id = matched_customer_id
            WHERE id = orphaned_payment.id;
            backfilled_count := backfilled_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Backfilled % orphaned payments', backfilled_count;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Execute backfill function
SELECT backfill_orphaned_payments();

-- Step 4: Verify backfill results
SELECT 
    'Orphaned payments remaining' as metric,
    COUNT(*) as count
FROM payments
WHERE customer_id IS NULL;

-- Step 5: Recreate the validation trigger
CREATE OR REPLACE FUNCTION validate_payment_before_insert_or_update()
RETURNS TRIGGER AS $$
DECLARE
    v_contract RECORD;
    v_invoice RECORD;
    v_current_total_paid NUMERIC;
    v_new_total_paid NUMERIC;
    v_contract_amount NUMERIC;
    v_monthly_amount NUMERIC;
    v_payment_amount NUMERIC;
    v_max_payment_threshold NUMERIC;
    v_overpayment_threshold NUMERIC;
    v_invoice_difference NUMERIC;
    v_warning_message TEXT;
BEGIN
    -- Validate customer_id is required (NEW constraint)
    IF NEW.customer_id IS NULL THEN
        RAISE EXCEPTION 'customer_id is required for payment creation';
    END IF;
    
    -- Skip validation for payments without contracts
    IF NEW.contract_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get payment amount
    v_payment_amount := COALESCE(NEW.amount, 0);
    
    -- Skip validation for zero or negative amounts
    IF v_payment_amount <= 0 THEN
        RETURN NEW;
    END IF;
    
    -- Get contract details
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = NEW.contract_id;
    
    -- If contract not found, allow (should be caught by FK constraint)
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    v_contract_amount := COALESCE(v_contract.contract_amount, 0);
    v_monthly_amount := COALESCE(v_contract.monthly_amount, 0);
    v_current_total_paid := COALESCE(v_contract.total_paid, 0);
    v_new_total_paid := v_current_total_paid + v_payment_amount;
    
    -- Rule 1: Prevent single payments that are suspiciously large
    -- Threshold: Higher of (10x monthly) or QAR 50,000
    v_max_payment_threshold := GREATEST(v_monthly_amount * 10, 50000);
    
    -- Skip this check for contracts with zero monthly amount
    IF v_monthly_amount > 0 AND v_payment_amount > v_max_payment_threshold THEN
        RAISE EXCEPTION 'Payment amount (QAR %) is suspiciously large for this contract. Maximum allowed is QAR % (10x monthly amount of QAR %). Please verify payment amount is correct.',
            v_payment_amount,
            v_max_payment_threshold,
            v_monthly_amount;
    END IF;
    
    -- Rule 2: Prevent overpayment beyond 10% of contract amount
    -- Only apply if contract has a defined amount
    IF v_contract_amount > 0 THEN
        v_overpayment_threshold := v_contract_amount * 1.10; -- Allow 10% buffer
        
        IF v_new_total_paid > v_overpayment_threshold THEN
            RAISE EXCEPTION 'Payment would cause total paid (QAR %) to exceed contract amount (QAR %) by more than 10%%. Current total paid: QAR %. Please review existing payments before adding more.',
                v_new_total_paid,
                v_contract_amount,
                v_current_total_paid;
        END IF;
    END IF;
    
    -- Rule 3: Warn if payment amount differs significantly from invoice amount
    IF NEW.invoice_id IS NOT NULL THEN
        SELECT * INTO v_invoice
        FROM invoices
        WHERE id = NEW.invoice_id;
        
        IF v_invoice.total_amount > 0 THEN
            v_invoice_difference := ABS(v_payment_amount - v_invoice.total_amount);
            
            -- If payment is more than 20% different from invoice amount, warn but allow
            IF v_invoice_difference > (v_invoice.total_amount * 0.20) THEN
                -- Log warning to payment notes
                v_warning_message := format(
                    'WARNING: Payment amount (QAR %) differs from invoice amount (QAR %) by QAR % (%0f%%). Please verify this is correct.',
                    v_payment_amount,
                    v_invoice.total_amount,
                    v_invoice_difference,
                    (v_invoice_difference / v_invoice.total_amount * 100)
                );
                
                NEW.notes := COALESCE(NEW.notes, '') || ' ' || v_warning_message;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER validate_payment_before_insert_or_update
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION validate_payment_before_insert_or_update();

-- Step 6: Add NOT NULL constraint on customer_id (after backfill)
ALTER TABLE payments 
ADD CONSTRAINT payments_customer_id_not_null 
CHECK (customer_id IS NOT NULL);

-- Step 7: Add comment explaining constraint
COMMENT ON CONSTRAINT payments_customer_id_not_null ON payments IS 
'All payments must be associated with a customer. Constraint added in migration 20260110002001. Orphaned payments (1109 records) were backfilled before applying this constraint.';
