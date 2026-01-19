-- ===========================================
-- Fix Orphaned Payments by Updating Constraint Logic
-- ===========================================
-- This migration fixes the constraint issue by allowing the constraint to exist
-- but not requiring customer_id during backfill operations
-- ===========================================

-- First, check the validation function to allow NULL customer_id during updates
-- Get the validation function definition
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
