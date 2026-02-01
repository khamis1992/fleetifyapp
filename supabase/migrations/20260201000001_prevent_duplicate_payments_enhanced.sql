-- ================================================================
-- Migration: Enhanced Duplicate Payment Prevention
-- Created: 2026-02-01
-- Description: Prevent duplicate payments and bulk payment abuse
-- Impact: HIGH - Critical protection against payment duplication
-- ================================================================

-- ============================================================================
-- Step 1: Add is_legacy flag to invoices
-- ============================================================================

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN invoices.is_legacy IS 
'Marks invoices from the old system (INV-LTO*, Ret-*, etc.) to prevent new payments on them';

-- Mark existing legacy invoices
UPDATE invoices 
SET is_legacy = TRUE 
WHERE invoice_number LIKE 'INV-LTO%' 
   OR invoice_number LIKE 'Ret-%'
   OR invoice_number LIKE 'In2018%';

-- ============================================================================
-- Step 2: Enhanced validation function with duplicate detection
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_payment_before_insert_enhanced()
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
    v_max_payment_threshold NUMERIC;
    v_overpayment_threshold NUMERIC;
    v_duplicate_same_day INTEGER;
    v_recent_payments_count INTEGER;
    v_contract_amount NUMERIC;
    v_monthly_amount NUMERIC;
BEGIN
    -- =========================================
    -- NEW: Validation 1 - Duplicate payment detection (same day, same amount)
    -- =========================================
    IF NEW.contract_id IS NOT NULL AND NEW.payment_status = 'completed' THEN
        SELECT COUNT(*) INTO v_duplicate_same_day
        FROM payments
        WHERE contract_id = NEW.contract_id
          AND payment_date = NEW.payment_date
          AND amount = NEW.amount
          AND payment_status = 'completed'
          AND company_id = NEW.company_id
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');
        
        IF v_duplicate_same_day > 0 THEN
            RAISE EXCEPTION USING
                ERRCODE = '23505',
                MESSAGE = 'Duplicate payment detected: A similar payment exists on the same day',
                HINT = 'Found ' || v_duplicate_same_day || ' payment(s) with same amount (QAR ' || NEW.amount || ') and date (' || NEW.payment_date || ') for this contract. This may be a data entry error.';
        END IF;
    END IF;

    -- =========================================
    -- NEW: Validation 2 - Rate limiting (prevent bulk payment abuse)
    -- =========================================
    IF NEW.payment_status = 'completed' THEN
        SELECT COUNT(*) INTO v_recent_payments_count
        FROM payments
        WHERE company_id = NEW.company_id
          AND created_at > NOW() - INTERVAL '1 minute'
          AND payment_status = 'completed';
        
        IF v_recent_payments_count >= 10 THEN
            RAISE EXCEPTION USING
                ERRCODE = '23514',
                MESSAGE = 'Rate limit exceeded: Too many payments per minute',
                HINT = 'Added ' || v_recent_payments_count || ' payments in the last minute. Maximum: 10 payments/minute. Please wait before adding more.';
        END IF;
    END IF;

    -- =========================================
    -- Validation 3: Contract link validation
    -- =========================================
    IF NEW.contract_id IS NOT NULL THEN
        SELECT * INTO v_contract
        FROM contracts
        WHERE id = NEW.contract_id;

        IF FOUND THEN
            -- Calculate current total paid
            SELECT COALESCE(SUM(amount), 0)
            INTO v_current_total_paid
            FROM payments
            WHERE contract_id = NEW.contract_id
              AND payment_status = 'completed'
              AND company_id = NEW.company_id
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

            v_new_total_paid := v_current_total_paid + NEW.amount;
            v_contract_amount := COALESCE(v_contract.contract_amount, 0);

            -- Check overpayment (10% buffer)
            IF v_contract_amount > 0 THEN
                v_overpayment_threshold := v_contract_amount * 1.10;

                IF v_new_total_paid > v_overpayment_threshold THEN
                    RAISE EXCEPTION USING
                        ERRCODE = '23514',
                        MESSAGE = 'Payment would cause contract overpayment',
                        HINT = 'Current paid: QAR ' || v_current_total_paid || ', New total: QAR ' || v_new_total_paid || ', Contract amount: QAR ' || v_contract_amount || '. Maximum allowed: QAR ' || v_overpayment_threshold || ' (110%).';
                END IF;
            END IF;

            -- Check single payment size
            v_monthly_amount := COALESCE(v_contract.monthly_amount, 0);
            IF v_monthly_amount > 0 THEN
                v_max_payment_threshold := GREATEST(v_monthly_amount * 10, 50000);
                
                IF NEW.amount > v_max_payment_threshold THEN
                    RAISE EXCEPTION USING
                        ERRCODE = '23514',
                        MESSAGE = 'Payment amount is too large for this contract',
                        HINT = 'Amount (QAR ' || NEW.amount || ') exceeds maximum allowed (QAR ' || v_max_payment_threshold || '). Maximum is the greater of: 10x monthly rent or QAR 50,000.';
                END IF;
            END IF;
        END IF;
    END IF;

    -- =========================================
    -- NEW: Validation 4 - Legacy invoice check
    -- =========================================
    IF NEW.invoice_id IS NOT NULL THEN
        SELECT * INTO v_invoice
        FROM invoices
        WHERE id = NEW.invoice_id;

        IF FOUND THEN
            -- Prevent payment on legacy invoices
            IF v_invoice.is_legacy = TRUE THEN
                RAISE EXCEPTION USING
                    ERRCODE = '23514',
                    MESSAGE = 'Cannot pay on legacy invoice',
                    HINT = 'Invoice ' || v_invoice.invoice_number || ' is from the old system. Please use new invoices only or contact management.';
            END IF;

            -- Check invoice status
            IF v_invoice.status = 'cancelled' THEN
                RAISE EXCEPTION USING
                    ERRCODE = '23514',
                    MESSAGE = 'Cannot pay on cancelled invoice',
                    HINT = 'Invoice ' || v_invoice.invoice_number || ' is cancelled. Please check invoice status.';
            END IF;
        END IF;
    END IF;

    -- =========================================
    -- Validation 5: Idempotency key check
    -- =========================================
    IF NEW.idempotency_key IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM payments
            WHERE idempotency_key = NEW.idempotency_key
              AND company_id = NEW.company_id
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
              AND created_at > NOW() - INTERVAL '30 days'
        ) THEN
            RAISE EXCEPTION USING
                ERRCODE = '23505',
                MESSAGE = 'Idempotency key already used',
                HINT = 'Key "' || NEW.idempotency_key || '" was already used for another payment in the last 30 days. This may be a duplicate attempt.';
        END IF;
    END IF;

    -- =========================================
    -- Validation 6: Payment date sanity check
    -- =========================================
    IF NEW.payment_date > CURRENT_DATE + INTERVAL '30 days' THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'Payment date is too far in the future',
            HINT = 'Payment date (' || NEW.payment_date || ') exceeds 30 days from today (' || CURRENT_DATE || '). Please check the date.';
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- Step 3: Replace existing triggers
-- ============================================================================

DROP TRIGGER IF EXISTS validate_payment_before_insert_trigger ON payments;
DROP TRIGGER IF EXISTS validate_payment_before_update_trigger ON payments;

CREATE TRIGGER validate_payment_before_insert_trigger
    BEFORE INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_payment_before_insert_enhanced();

CREATE TRIGGER validate_payment_before_update_trigger
    BEFORE UPDATE ON payments
    FOR EACH ROW
    WHEN (
        OLD.amount IS DISTINCT FROM NEW.amount OR
        OLD.contract_id IS DISTINCT FROM NEW.contract_id OR
        OLD.invoice_id IS DISTINCT FROM NEW.invoice_id OR
        OLD.payment_date IS DISTINCT FROM NEW.payment_date OR
        OLD.payment_status IS DISTINCT FROM NEW.payment_status
    )
    EXECUTE FUNCTION validate_payment_before_insert_enhanced();

-- ============================================================================
-- Step 4: Create unique index for idempotency
-- ============================================================================

-- Note: Removed time-based filter from index due to IMMUTABLE requirement
-- The trigger function handles the 30-day check instead
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key_active
ON payments(company_id, idempotency_key)
WHERE payment_status = 'completed' 
  AND idempotency_key IS NOT NULL;

-- ============================================================================
-- Step 5: Create payment alerts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    contract_id UUID REFERENCES contracts(id),
    payment_id UUID REFERENCES payments(id),
    company_id UUID NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_alerts_unresolved 
ON payment_alerts(company_id, created_at DESC) 
WHERE is_resolved = FALSE;

COMMENT ON TABLE payment_alerts IS 
'Stores alerts for suspicious payment activities that require review';

-- ============================================================================
-- Step 6: Create function to detect suspicious activities
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_suspicious_payment_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_recent_count INTEGER;
    v_same_day_count INTEGER;
BEGIN
    -- Only check for completed payments
    IF NEW.payment_status != 'completed' THEN
        RETURN NEW;
    END IF;

    -- Check for bulk payments (5+ in 5 minutes)
    SELECT COUNT(*) INTO v_recent_count
    FROM payments
    WHERE contract_id = NEW.contract_id
      AND created_at > NOW() - INTERVAL '5 minutes'
      AND payment_status = 'completed';
    
    IF v_recent_count >= 5 THEN
        INSERT INTO payment_alerts (
            alert_type, severity, contract_id, payment_id, company_id, message, details
        ) VALUES (
            'bulk_payments',
            'high',
            NEW.contract_id,
            NEW.id,
            NEW.company_id,
            'Suspicious bulk payments detected',
            jsonb_build_object(
                'count', v_recent_count, 
                'timeframe', '5 minutes',
                'amount', NEW.amount
            )
        );
    END IF;
    
    -- Check for large payments
    IF NEW.amount > 50000 THEN
        INSERT INTO payment_alerts (
            alert_type, severity, contract_id, payment_id, company_id, message, details
        ) VALUES (
            'large_payment',
            'medium',
            NEW.contract_id,
            NEW.id,
            NEW.company_id,
            'Unusually large payment detected',
            jsonb_build_object('amount', NEW.amount)
        );
    END IF;
    
    -- Check for multiple payments on same day
    SELECT COUNT(*) INTO v_same_day_count
    FROM payments
    WHERE contract_id = NEW.contract_id
      AND payment_date = NEW.payment_date
      AND payment_status = 'completed';
    
    IF v_same_day_count > 3 THEN
        INSERT INTO payment_alerts (
            alert_type, severity, contract_id, payment_id, company_id, message, details
        ) VALUES (
            'multiple_same_day',
            'low',
            NEW.contract_id,
            NEW.id,
            NEW.company_id,
            'Multiple payments on same day',
            jsonb_build_object('count', v_same_day_count, 'date', NEW.payment_date)
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER detect_suspicious_activity_trigger
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_suspicious_payment_activity();

-- ============================================================================
-- Step 7: Create monitoring views
-- ============================================================================

CREATE OR REPLACE VIEW suspicious_payments AS
SELECT 
    c.contract_number,
    p.payment_date,
    p.amount,
    p.created_at,
    p.notes,
    COUNT(*) OVER (
        PARTITION BY p.contract_id, p.payment_date 
        ORDER BY p.created_at
    ) as same_day_count,
    COUNT(*) OVER (
        PARTITION BY p.contract_id 
        ORDER BY p.created_at 
        RANGE BETWEEN INTERVAL '5 minutes' PRECEDING AND CURRENT ROW
    ) as five_min_count
FROM payments p
JOIN contracts c ON p.contract_id = c.id
WHERE p.payment_status = 'completed'
  AND p.created_at > NOW() - INTERVAL '30 days';

COMMENT ON VIEW suspicious_payments IS 
'Shows payments that may be duplicates or part of bulk operations';

-- ============================================================================
-- Step 8: Create maintenance function
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_contract_totals()
RETURNS TABLE(
    contract_number VARCHAR,
    old_total NUMERIC,
    new_total NUMERIC,
    difference NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH calculated AS (
        SELECT 
            c.id,
            c.contract_number,
            c.total_paid as old_total,
            COALESCE(SUM(p.amount), 0) as new_total
        FROM contracts c
        LEFT JOIN payments p ON p.contract_id = c.id 
            AND p.payment_status = 'completed'
        GROUP BY c.id, c.contract_number, c.total_paid
    )
    SELECT 
        calculated.contract_number,
        calculated.old_total,
        calculated.new_total,
        (calculated.new_total - calculated.old_total) as difference
    FROM calculated
    WHERE ABS(calculated.new_total - calculated.old_total) > 1;
    
    -- Update the contracts
    UPDATE contracts c
    SET total_paid = COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.contract_id = c.id
          AND p.payment_status = 'completed'
    ), 0),
    balance_due = c.contract_amount - COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.contract_id = c.id
          AND p.payment_status = 'completed'
    ), 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_contract_totals IS 
'Recalculates total_paid for all contracts and returns discrepancies. Run weekly.';

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION validate_payment_before_insert_enhanced IS
'Enhanced payment validation with duplicate detection and rate limiting.
Prevents:
1. Duplicate payments (same day, same amount)
2. Bulk payment abuse (max 10/minute)
3. Overpayment (110% limit)
4. Large suspicious payments (10x monthly or 50k)
5. Payments on legacy invoices
6. Payments on cancelled invoices
7. Duplicate idempotency keys
8. Future-dated payments (>30 days)';

-- ============================================================================
-- Verification
-- ============================================================================

-- Check triggers are active
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'validate_payment_before_insert_trigger'
    ) THEN
        RAISE EXCEPTION 'Trigger validate_payment_before_insert_trigger not found!';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'detect_suspicious_activity_trigger'
    ) THEN
        RAISE EXCEPTION 'Trigger detect_suspicious_activity_trigger not found!';
    END IF;
    
    RAISE NOTICE 'All triggers created successfully!';
END $$;
