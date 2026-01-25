-- ================================================================
-- Migration: Allow Payments for All Contract Statuses
-- Created: 2026-01-25
-- Description: Update payment validation to allow payments for contracts
--              in any status and calculate actual remaining from payments
-- Impact: MEDIUM - More accurate payment validation
-- ================================================================

CREATE OR REPLACE FUNCTION validate_payment_before_insert()
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
    v_actual_remaining NUMERIC;
    v_duplicate_payment_count INTEGER;
    v_contract_amount NUMERIC;
    v_monthly_amount NUMERIC;
    v_invoice_payments NUMERIC;
BEGIN
    -- =========================================
    -- Validation 1: Contract link validation
    -- =========================================
    IF NEW.contract_id IS NOT NULL THEN
        SELECT * INTO v_contract
        FROM contracts
        WHERE id = NEW.contract_id;

        IF FOUND THEN
            SELECT COALESCE(SUM(amount), 0)
            INTO v_current_total_paid
            FROM payments
            WHERE contract_id = NEW.contract_id
              AND payment_status = 'completed'
              AND company_id = NEW.company_id
              AND (NEW.id IS NULL OR id != NEW.id);

            v_new_total_paid := v_current_total_paid + NEW.amount;
            v_contract_amount := COALESCE(v_contract.contract_amount, 0);

            IF v_contract_amount > 0 THEN
                v_overpayment_threshold := v_contract_amount * 1.10;
                IF v_new_total_paid > v_overpayment_threshold THEN
                    RAISE EXCEPTION USING
                        ERRCODE = '23514',
                        MESSAGE = 'Payment exceeds contract limit (110%)';
                END IF;
            END IF;

            v_monthly_amount := COALESCE(v_contract.monthly_amount, 0);
            IF v_monthly_amount > 0 THEN
                v_max_payment_threshold := GREATEST(v_monthly_amount * 10, 50000);
                IF NEW.amount > v_max_payment_threshold THEN
                    RAISE EXCEPTION USING
                        ERRCODE = '23514',
                        MESSAGE = 'Payment amount too large for this contract';
                END IF;
            END IF;
        END IF;
    END IF;

    -- =========================================
    -- Validation 2: Invoice link validation
    -- =========================================
    IF NEW.invoice_id IS NOT NULL THEN
        SELECT * INTO v_invoice
        FROM invoices
        WHERE id = NEW.invoice_id;

        IF FOUND THEN
            -- Only block cancelled/voided - allow 'paid' status (might have corrections)
            IF v_invoice.payment_status IN ('cancelled', 'voided') THEN
                RAISE EXCEPTION USING
                    ERRCODE = '23514',
                    MESSAGE = 'Cannot add payment to cancelled/voided invoice';
            END IF;

            -- Calculate ACTUAL remaining from payments table (most accurate)
            SELECT COALESCE(SUM(amount), 0)
            INTO v_invoice_payments
            FROM payments
            WHERE invoice_id = NEW.invoice_id
              AND payment_status = 'completed'
              AND (NEW.id IS NULL OR id != NEW.id);

            v_actual_remaining := GREATEST(0, v_invoice.total_amount - v_invoice_payments);

            -- Only block if payment significantly exceeds remaining (5% buffer for rounding)
            IF v_actual_remaining > 0 AND NEW.amount > (v_actual_remaining * 1.05) THEN
                RAISE EXCEPTION USING
                    ERRCODE = '23514',
                    MESSAGE = 'Payment amount exceeds remaining invoice balance',
                    HINT = 'Remaining: QAR ' || ROUND(v_actual_remaining, 2) || ', Payment: QAR ' || ROUND(NEW.amount, 2);
            END IF;
        END IF;
    END IF;

    -- =========================================
    -- Validation 3: Idempotency key validation
    -- =========================================
    IF NEW.idempotency_key IS NOT NULL THEN
        SELECT COUNT(*) INTO v_duplicate_payment_count
        FROM payments
        WHERE idempotency_key = NEW.idempotency_key
          AND company_id = NEW.company_id
          AND (NEW.id IS NULL OR id != NEW.id)
          AND created_at > NOW() - INTERVAL '30 days';

        IF v_duplicate_payment_count > 0 THEN
            RAISE EXCEPTION USING
                ERRCODE = '23505',
                MESSAGE = 'Duplicate payment detected';
        END IF;
    END IF;

    -- =========================================
    -- Validation 4: Payment date check
    -- =========================================
    IF NEW.payment_date > CURRENT_DATE + INTERVAL '30 days' THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'Payment date too far in future';
    END IF;

    -- =========================================
    -- Validation 5: Contract-invoice consistency
    -- =========================================
    IF NEW.contract_id IS NOT NULL AND NEW.invoice_id IS NOT NULL THEN
        SELECT contract_id INTO v_invoice
        FROM invoices
        WHERE id = NEW.invoice_id;

        IF FOUND AND v_invoice.contract_id IS DISTINCT FROM NEW.contract_id THEN
            RAISE EXCEPTION USING
                ERRCODE = '23514',
                MESSAGE = 'Invoice belongs to different contract';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_payment_before_insert IS
'Payment validation - calculates actual remaining from payments table, not balance_due field';
