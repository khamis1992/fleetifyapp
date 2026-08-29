-- Fix the validation to handle invoices with balance_due = 0 but should be total_amount
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
    v_actual_balance NUMERIC;
    v_duplicate_payment_count INTEGER;
    v_contract_amount NUMERIC;
    v_monthly_amount NUMERIC;
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
                        MESSAGE = 'Payment would cause contract to be overpaid beyond reasonable limit',
                        HINT = 'Current total paid: QAR ' || ROUND(v_current_total_paid, 2) || 
                               ', Maximum allowed: QAR ' || ROUND(v_overpayment_threshold, 2);
                END IF;
            END IF;

            v_monthly_amount := COALESCE(v_contract.monthly_amount, 0);
            IF v_monthly_amount > 0 THEN
                v_max_payment_threshold := GREATEST(v_monthly_amount * 10, 50000);
                IF NEW.amount > v_max_payment_threshold THEN
                    RAISE EXCEPTION USING
                        ERRCODE = '23514',
                        MESSAGE = 'Payment amount is suspiciously large for this contract',
                        HINT = 'Maximum allowed: QAR ' || ROUND(v_max_payment_threshold, 2);
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
            IF v_invoice.payment_status IN ('cancelled', 'voided') THEN
                RAISE EXCEPTION USING
                    ERRCODE = '23514',
                    MESSAGE = 'Cannot link payment to a cancelled or voided invoice',
                    HINT = 'Invoice is in status: ' || v_invoice.payment_status;
            END IF;

            -- Calculate the ACTUAL remaining balance (handles corrupted data)
            v_actual_balance := GREATEST(
                COALESCE(v_invoice.balance_due, v_invoice.total_amount),
                v_invoice.total_amount - COALESCE(v_invoice.paid_amount, 0)
            );

            -- Only validate if there's a positive amount
            IF v_invoice.total_amount > 0 AND v_actual_balance > 0 THEN
                IF NEW.amount > v_actual_balance THEN
                    RAISE EXCEPTION USING
                        ERRCODE = '23514',
                        MESSAGE = 'Payment amount exceeds remaining invoice balance',
                        HINT = 'Payment: QAR ' || ROUND(NEW.amount, 2) || 
                               ' exceeds remaining balance: QAR ' || ROUND(v_actual_balance, 2);
                END IF;
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
                MESSAGE = 'Duplicate idempotency key',
                HINT = 'This payment was already processed';
        END IF;
    END IF;

    -- =========================================
    -- Validation 4: Payment date sanity check
    -- =========================================
    IF NEW.payment_date > CURRENT_DATE + INTERVAL '30 days' THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'Payment date cannot be more than 30 days in the future';
    END IF;

    -- =========================================
    -- Validation 5: Contract and invoice consistency
    -- =========================================
    IF NEW.contract_id IS NOT NULL AND NEW.invoice_id IS NOT NULL THEN
        SELECT contract_id INTO v_invoice
        FROM invoices
        WHERE id = NEW.invoice_id;

        IF FOUND AND v_invoice.contract_id IS DISTINCT FROM NEW.contract_id THEN
            RAISE EXCEPTION USING
                ERRCODE = '23514',
                MESSAGE = 'Invoice and contract must belong together';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_payment_before_insert IS
'Payment validation - Fixed to handle invoices with corrupted balance_due values';;
