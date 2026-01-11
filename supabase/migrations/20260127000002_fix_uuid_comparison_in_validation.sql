-- ================================================================
-- Migration: Fix Payment Validation UUID Comparison
-- Created: 2026-01-27
-- Description: Fix invalid UUID comparison in payment validation function
-- Impact: HIGH - Fixes payment insertion errors
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
    v_invoice_difference NUMERIC;
    v_warning_message TEXT;
    v_duplicate_payment_count INTEGER;
    v_contract_amount NUMERIC;
    v_monthly_amount NUMERIC;
BEGIN
    -- =========================================
    -- Validation 1: Contract link validation
    -- =========================================
    IF NEW.contract_id IS NOT NULL THEN
        -- Get contract details
        SELECT * INTO v_contract
        FROM contracts
        WHERE id = NEW.contract_id;

        IF FOUND THEN
            -- Check contract is in a status that allows payments
            IF v_contract.status NOT IN ('active', 'under_review', 'draft', 'under_legal_procedure') THEN
                RAISE EXCEPTION USING
                    ERRCODE = '23514',
                    MESSAGE = 'Contract must be in active, under_review, draft, or under_legal_procedure status',
                    HINT = 'Contract status is: ' || v_contract.status || '. Please verify the contract is still active or under legal procedure.';
            END IF;

            -- Calculate current total paid for this contract
            -- Fixed: Use proper NULL check instead of invalid UUID
            SELECT COALESCE(SUM(amount), 0)
            INTO v_current_total_paid
            FROM payments
            WHERE contract_id = NEW.contract_id
              AND payment_status = 'completed'
              AND company_id = NEW.company_id
              AND (NEW.id IS NULL OR id != NEW.id);

            v_new_total_paid := v_current_total_paid + NEW.amount;
            v_contract_amount := COALESCE(v_contract.contract_amount, 0);

            -- Check overpayment (10% buffer)
            IF v_contract_amount > 0 THEN
                v_overpayment_threshold := v_contract_amount * 1.10; -- 110%

                IF v_new_total_paid > v_overpayment_threshold THEN
                    RAISE EXCEPTION USING
                        ERRCODE = '23514',
                        MESSAGE = 'Payment would cause contract to be overpaid beyond reasonable limit',
                        HINT = format(
                            'Current total paid: QAR %.2f, New total after this payment: QAR %.2f, Contract amount: QAR %.2f. Maximum allowed: QAR %.2f (110%% of contract amount). Please review existing payments before adding more.',
                            v_current_total_paid,
                            v_new_total_paid,
                            v_contract_amount,
                            v_overpayment_threshold
                        );
                END IF;
            END IF;

            -- Check single payment doesn't exceed monthly amount significantly
            v_monthly_amount := COALESCE(v_contract.monthly_amount, 0);

            IF v_monthly_amount > 0 THEN
                -- Threshold: Payment shouldn't exceed 10x monthly amount or QAR 50,000
                v_max_payment_threshold := GREATEST(
                    v_monthly_amount * 10,
                    50000
                );

                IF NEW.amount > v_max_payment_threshold THEN
                    RAISE EXCEPTION USING
                        ERRCODE = '23514',
                        MESSAGE = 'Payment amount is suspiciously large for this contract',
                        HINT = format(
                            'Payment amount (QAR %.2f) exceeds maximum allowed for this contract. Maximum is the higher of: 10x monthly amount (QAR %.2f) or QAR 50,000.',
                            NEW.amount,
                            v_monthly_amount,
                            v_max_payment_threshold
                        );
                END IF;
            END IF;
        END IF;
    END IF;

    -- =========================================
    -- Validation 2: Invoice link validation
    -- =========================================
    IF NEW.invoice_id IS NOT NULL THEN
        -- Get invoice details
        SELECT * INTO v_invoice
        FROM invoices
        WHERE id = NEW.invoice_id;

        IF FOUND THEN
            -- Check invoice status allows payments
            IF v_invoice.payment_status IN ('cancelled', 'voided') THEN
                RAISE EXCEPTION USING
                    ERRCODE = '23514',
                    MESSAGE = 'Cannot link payment to a cancelled or voided invoice',
                    HINT = format(
                        'Invoice %s is in status: %s. Payments can only be linked to invoices in unpaid, partial, or pending status.',
                        v_invoice.invoice_number,
                        v_invoice.payment_status
                    );
            END IF;

            -- Check payment amount doesn't exceed remaining balance
            IF v_invoice.total_amount > 0 THEN
                v_invoice_difference := NEW.amount - v_invoice.balance_due;

                -- If this is the first payment for this invoice, balance_due should equal total_amount
                IF v_invoice.balance_due IS NULL OR v_invoice.balance_due = v_invoice.total_amount THEN
                    IF NEW.amount > v_invoice.total_amount THEN
                        RAISE EXCEPTION USING
                            ERRCODE = '23514',
                            MESSAGE = 'Payment amount exceeds total invoice amount',
                            HINT = format(
                                'Payment amount (QAR %.2f) exceeds invoice total (QAR %.2f). Please verify the payment amount is correct.',
                                NEW.amount,
                                v_invoice.total_amount
                            );
                    END IF;
                ELSE
                    -- For subsequent payments, check we're not overpaying too much
                    IF NEW.amount > v_invoice.balance_due THEN
                        RAISE EXCEPTION USING
                            ERRCODE = '23514',
                            MESSAGE = 'Payment amount exceeds remaining invoice balance',
                            HINT = format(
                                'Payment amount (QAR %.2f) exceeds remaining invoice balance (QAR %.2f). Invoice total: QAR %.2f, Already paid: QAR %.2f. Please verify the payment amount.',
                                NEW.amount,
                                v_invoice.balance_due,
                                v_invoice.total_amount,
                                v_invoice.total_amount - v_invoice.balance_due
                            );
                    END IF;
                END IF;
            END IF;
        END IF;
    END IF;

    -- =========================================
    -- Validation 3: Idempotency key validation
    -- =========================================
    IF NEW.idempotency_key IS NOT NULL THEN
        -- Check for duplicate idempotency key within last 30 days
        -- Fixed: Use proper NULL check instead of invalid UUID
        SELECT COUNT(*) INTO v_duplicate_payment_count
        FROM payments
        WHERE idempotency_key = NEW.idempotency_key
          AND company_id = NEW.company_id
          AND (NEW.id IS NULL OR id != NEW.id)
          AND created_at > NOW() - INTERVAL '30 days';

        IF v_duplicate_payment_count > 0 THEN
            RAISE EXCEPTION USING
                ERRCODE = '23505',
                MESSAGE = 'A payment with this idempotency key has already been processed recently',
                HINT = format(
                    'Idempotency key "%s" was already used for a payment in the last 30 days. This may be a duplicate request or a retry that should not have happened. If this is intentional, please use a different idempotency key.',
                    NEW.idempotency_key
                );
        END IF;
    END IF;

    -- =========================================
    -- Validation 4: Payment date sanity check
    -- =========================================
    IF NEW.payment_date > CURRENT_DATE + INTERVAL '30 days' THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'Payment date cannot be more than 30 days in the future',
            HINT = format(
                'Payment date is %s, which is more than 30 days in the future (current date: %s). Please check the payment date.',
                NEW.payment_date,
                CURRENT_DATE
            );
    END IF;

    -- =========================================
    -- Validation 5: Contract and invoice consistency
    -- =========================================
    IF NEW.contract_id IS NOT NULL AND NEW.invoice_id IS NOT NULL THEN
        -- Check invoice belongs to the same contract
        SELECT * INTO v_invoice
        FROM invoices
        WHERE id = NEW.invoice_id;

        IF FOUND THEN
            IF v_invoice.contract_id != NEW.contract_id THEN
                RAISE EXCEPTION USING
                    ERRCODE = '23514',
                    MESSAGE = 'Invoice and contract must belong together',
                    HINT = format(
                        'Payment links to both contract (%s) and invoice (%s), but the invoice belongs to a different contract (%s). Please verify the linking.',
                        NEW.contract_id,
                        NEW.invoice_id,
                        v_invoice.contract_id
                    );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_payment_before_insert IS
'Enhanced server-side validation for payments. Checks for:
1. Contract status (must be active/under_review/draft/under_legal_procedure)
2. Contract overpayment prevention (110% limit)
3. Single payment size limits (10x monthly or QAR 50,000 max)
4. Invoice status (must not be cancelled/voided)
5. Invoice balance validation (cannot exceed remaining balance)
6. Idempotency key uniqueness (no duplicates within 30 days)
7. Payment date sanity check (max 30 days in future)
8. Contract-invoice consistency (invoice must belong to linked contract)

Fixed: Uses proper NULL checks instead of invalid UUID default values.';
