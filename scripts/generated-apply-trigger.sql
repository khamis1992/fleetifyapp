-- ==========================================
-- Overpayment Prevention Trigger Migration
-- Auto-generated for Fleetify
-- ==========================================
-- This script adds payment validation to prevent overpayments
-- Run this in your Supabase SQL Editor or via psql
-- ==========================================

-- 1. Create the payment validation function
CREATE OR REPLACE FUNCTION validate_payment_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
        RAISE EXCEPTION 'Payment amount (QAR %) is suspiciously large for this contract. Maximum allowed is QAR % (10x monthly amount of QAR %). Please verify the payment amount is correct.',
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
                    'WARNING: Payment amount (QAR %) differs from invoice amount (QAR %) by QAR % (%.0f%%). Please verify this is correct.',
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
$$;

-- Add comment for documentation
COMMENT ON FUNCTION validate_payment_amount IS
'Validates payment amounts before insert/update to prevent overpayments. Raises exception for suspiciously large payments or payments that would overpay the contract by more than 10%.';


-- 2. Create the contract health check function
CREATE OR REPLACE FUNCTION check_contract_payment_health(p_contract_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_contract RECORD;
    v_result JSONB;
    v_health_status TEXT;
    v_issues TEXT[];
BEGIN
    -- Get contract
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = p_contract_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'error', 'Contract not found',
            'contract_id', p_contract_id
        );
    END IF;

    v_issues := '{}';

    -- Check for issues
    IF v_contract.contract_amount > 0 AND v_contract.total_paid > v_contract.contract_amount THEN
        v_health_status := 'overpaid';
        v_issues := v_issues || format('Overpaid by QAR %', v_contract.total_paid - v_contract.contract_amount);
    ELSIF v_contract.contract_amount > 0 AND v_contract.total_paid > (v_contract.contract_amount * 0.90) THEN
        v_health_status := 'nearly_complete';
    ELSIF v_contract.total_paid > 0 THEN
        v_health_status := 'active';
    ELSE
        v_health_status := 'no_payments';
    END IF;

    -- Check for zero contract amount with payments
    IF v_contract.contract_amount = 0 AND v_contract.total_paid > 0 THEN
        v_health_status := 'needs_review';
        v_issues := v_issues || format('Contract has QAR 0 amount but QAR % in payments', v_contract.total_paid);
    END IF;

    v_result := jsonb_build_object(
        'contract_id', p_contract_id,
        'contract_number', v_contract.contract_number,
        'health_status', v_health_status,
        'contract_amount', v_contract.contract_amount,
        'total_paid', v_contract.total_paid,
        'balance_due', v_contract.balance_due,
        'payment_percentage', CASE
            WHEN v_contract.contract_amount > 0 THEN
                ROUND((v_contract.total_paid / v_contract.contract_amount * 100)::numeric, 2)
            ELSE NULL
        END,
        'issues', v_issues,
        'is_healthy', CASE
            WHEN v_health_status = 'overpaid' THEN false
            WHEN v_health_status = 'needs_review' THEN false
            ELSE true
        END
    );

    RETURN v_result;
END;
$$;

-- Add comment
COMMENT ON FUNCTION check_contract_payment_health IS
'Returns the payment health status of a contract. Use to identify contracts with payment issues.';


-- 3. Create the dashboard view
CREATE OR REPLACE VIEW contract_payment_health_dashboard AS
SELECT
    c.id AS contract_id,
    c.contract_number,
    c.contract_type,
    c.contract_amount,
    c.total_paid,
    c.balance_due,
    c.monthly_amount,
    c.status AS contract_status,
    c.start_date,
    c.end_date,
    -- Health indicators
    CASE
        WHEN c.contract_amount = 0 AND c.total_paid > 0 THEN 'needs_review'
        WHEN c.contract_amount > 0 AND c.total_paid > c.contract_amount THEN 'overpaid'
        WHEN c.contract_amount > 0 AND c.total_paid > (c.contract_amount * 0.90) THEN 'nearly_complete'
        WHEN c.total_paid > 0 THEN 'active'
        ELSE 'no_payments'
    END AS payment_health,
    -- Payment percentage
    CASE
        WHEN c.contract_amount > 0 THEN
            ROUND((c.total_paid / c.contract_amount * 100)::numeric, 2)
        ELSE NULL
    END AS payment_percentage,
    -- Overpayment amount
    CASE
        WHEN c.contract_amount > 0 AND c.total_paid > c.contract_amount THEN
            c.total_paid - c.contract_amount
        ELSE NULL
    END AS overpayment_amount,
    -- Suspicious payment flag
    CASE
        WHEN c.contract_amount = 0 AND c.total_paid > 10000 THEN true
        WHEN c.contract_amount > 0 AND c.total_paid > (c.contract_amount * 1.10) THEN true
        ELSE false
    END AS needs_review
FROM contracts c
WHERE c.is_active = true
ORDER BY
    CASE
        WHEN c.contract_amount = 0 AND c.total_paid > 10000 THEN 1  -- Review first
        WHEN c.contract_amount > 0 AND c.total_paid > c.contract_amount THEN 2
        ELSE 3
    END,
    c.total_paid DESC;

-- Add comment
COMMENT ON VIEW contract_payment_health_dashboard IS
'Dashboard view showing payment health status for all active contracts. Use to identify contracts that need review.';


-- 4. Drop old trigger if exists
DROP TRIGGER IF EXISTS prevent_overpayment_trigger ON payments;

-- 5. Create the trigger
CREATE TRIGGER prevent_overpayment_trigger
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_payment_amount();

-- Add comment
COMMENT ON TRIGGER prevent_overpayment_trigger ON payments IS
'Prevents recording payments that would cause contract overpayment or are suspiciously large.';


-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION validate_payment_amount TO authenticated;
GRANT EXECUTE ON FUNCTION check_contract_payment_health TO authenticated;
GRANT SELECT ON contract_payment_health_dashboard TO authenticated;


-- ==========================================
-- Verification Queries
-- ==========================================

-- Check if function exists
SELECT
    '✅ Functions created:' AS status,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('validate_payment_amount', 'check_contract_payment_health');

-- Check if trigger exists
SELECT
    '✅ Trigger created:' AS status,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'payments'
AND trigger_name = 'prevent_overpayment_trigger';

-- Check if view exists
SELECT
    '✅ View created:' AS status,
    table_name,
    table_type
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'contract_payment_health_dashboard';

-- ==========================================
-- Usage Examples
-- ==========================================

/*
-- Check a specific contract's payment health
SELECT * FROM check_contract_payment_health('contract-uuid-here');

-- View all contracts that need review
SELECT
    contract_number,
    contract_amount,
    total_paid,
    payment_health,
    payment_percentage
FROM contract_payment_health_dashboard
WHERE needs_review = true
ORDER BY overpayment_amount DESC NULLS LAST;

-- View all overpaid contracts
SELECT
    contract_number,
    contract_amount,
    total_paid,
    overpayment_amount,
    payment_percentage
FROM contract_payment_health_dashboard
WHERE payment_health = 'overpaid'
ORDER BY overpayment_amount DESC;
*/
