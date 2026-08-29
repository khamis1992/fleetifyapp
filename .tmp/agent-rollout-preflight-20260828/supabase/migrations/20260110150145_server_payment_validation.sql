-- ================================================================
-- Migration: Server-Side Payment Validation
-- Created: 2026-01-10
-- Description: Server-side validation function for payment creation/update
-- Impact: HIGH - Prevents invalid payments even if client validation is bypassed
-- ================================================================

-- ============================================================================
-- FUNCTION: validate_payment_before_insert
-- ============================================================================

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
    v_error_message TEXT;
BEGIN
    -- Validation 1: Contract overpayment check
    IF NEW.contract_id IS NOT NULL THEN
        -- Get contract details
        SELECT * INTO v_contract
        FROM contracts
        WHERE id = NEW.contract_id;

        IF FOUND THEN
            -- Get current total paid for this contract
            SELECT COALESCE(SUM(amount), 0)
            INTO v_current_total_paid
            FROM payments
            WHERE contract_id = NEW.contract_id
              AND payment_status = 'completed'
              AND company_id = NEW.company_id
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'); -- Exclude current record on update

            v_new_total_paid := v_current_total_paid + NEW.amount;

            -- Check if payment would overpay by more than 10%
            IF v_contract.contract_amount > 0 THEN
                IF v_new_total_paid > (v_contract.contract_amount * 1.10) THEN
                    v_error_message := format(
                        'Payment amount (QAR %s) would cause total paid (QAR %s) to exceed contract amount (QAR %s) by more than 10%%.',
                        NEW.amount,
                        v_new_total_paid,
                        v_contract.contract_amount
                    );
                    RAISE EXCEPTION USING
                        ERRCODE = 'CHECK_VIOLATION',
                        MESSAGE = v_error_message,
                        HINT = 'Current total paid: QAR ' || v_current_total_paid || '. Please review existing payments.';
                END IF;
            END IF;

            -- Check for suspiciously large single payments
            v_max_payment_threshold := GREATEST(
                COALESCE(v_contract.monthly_amount, 0) * 10,
                50000
            );

            IF v_contract.monthly_amount > 0 AND NEW.amount > v_max_payment_threshold THEN
                v_error_message := format(
                    'Payment amount (QAR %s) is suspiciously large. Maximum allowed is QAR %s (10× monthly of QAR %s).',
                    NEW.amount,
                    v_max_payment_threshold,
                    v_contract.monthly_amount
                );
                RAISE EXCEPTION USING
                    ERRCODE = 'CHECK_VIOLATION',
                    MESSAGE = v_error_message,
                    HINT = 'Please verify this amount is correct or contact support.';
            END IF;
        END IF;
    END IF;

    -- Validation 2: Invoice payment amount check (warning, not blocking)
    IF NEW.invoice_id IS NOT NULL THEN
        -- Get invoice details
        SELECT * INTO v_invoice
        FROM invoices
        WHERE id = NEW.invoice_id;

        IF FOUND AND v_invoice.total_amount > 0 THEN
            -- Add warning to notes if payment differs significantly from invoice amount
            IF ABS(NEW.amount - v_invoice.total_amount) > (v_invoice.total_amount * 0.20) THEN
                NEW.notes := COALESCE(NEW.notes, '') || format(
                    ' [WARNING: Payment amount (QAR %s) differs from invoice amount (QAR %s) by %s%%]',
                    NEW.amount,
                    v_invoice.total_amount,
                    ROUND((ABS(NEW.amount - v_invoice.total_amount) / v_invoice.total_amount * 100)::numeric, 1)
                );
            END IF;
        END IF;
    END IF;

    -- Validation 3: Payment date sanity check
    IF NEW.payment_date > CURRENT_DATE + INTERVAL '30 days' THEN
        RAISE EXCEPTION USING
            ERRCODE = 'CHECK_VIOLATION',
            MESSAGE = 'Payment date cannot be more than 30 days in the future.',
            HINT = 'Please check the payment date. Current date: ' || CURRENT_DATE;
    END IF;

    -- Validation 4: Check if idempotency key already exists (if provided)
    IF NEW.idempotency_key IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM payments
            WHERE idempotency_key = NEW.idempotency_key
              AND company_id = NEW.company_id
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
            LIMIT 1
        ) THEN
            RAISE EXCEPTION USING
                ERRCODE = 'UNIQUE_VIOLATION',
                MESSAGE = 'A payment with this idempotency key already exists.',
                HINT = 'Payment may have already been processed. Check existing payments.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS validate_payment_before_insert_trigger ON payments;
DROP TRIGGER IF EXISTS validate_payment_before_update_trigger ON payments;

CREATE TRIGGER validate_payment_before_insert_trigger
    BEFORE INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_payment_before_insert();

CREATE TRIGGER validate_payment_before_update_trigger
    BEFORE UPDATE ON payments
    FOR EACH ROW
    WHEN (OLD.amount != NEW.amount OR
          OLD.contract_id != NEW.contract_id OR
          OLD.invoice_id != NEW.invoice_id OR
          OLD.payment_date != NEW.payment_date OR
          OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key)
    EXECUTE FUNCTION validate_payment_before_insert();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION validate_payment_before_insert IS
'Server-side validation for payment creation/update. Checks for: 1) Contract overpayments (blocks if >110% of contract), 2) Suspiciously large payments, 3) Future dates (>30 days), 4) Duplicate idempotency keys, 5) Invoice amount mismatches (warning in notes).';

COMMENT ON TRIGGER validate_payment_before_insert_trigger ON payments IS
'Validates payment data before insertion into database. Prevents invalid payments even if client validation is bypassed.';

COMMENT ON TRIGGER validate_payment_before_update_trigger ON payments IS
'Validates payment data before update when critical fields change.';;
