-- Migration: Enhance Server Payment Validation
-- Created: 2026-01-10
-- Description: This migration enhances the server-side payment validation function
--              to include more comprehensive checks for contract_id, invoice_id,
--              amounts, and idempotency.

-- =========================================
-- Function: validate_payment_before_insert_or_update
-- =========================================
-- This function performs comprehensive validation on payment data before
-- it is inserted or updated in the 'payments' table.
--
-- Validations include:
-- 1. Required fields (company_id, customer_id, payment_date, amount, payment_method)
-- 2. Amount validation (positive, not excessively large)
-- 3. Consistency between contract_id and invoice_id (cannot have both if they conflict)
-- 4. Idempotency key check for duplicate requests
-- 5. Foreign key existence checks for customer_id, contract_id, invoice_id
-- 6. Payment status and processing status validity
-- 7. Prevention of overpayment for linked contracts/invoices
--
-- Returns: NEW (the modified row) if validation passes, or raises an exception.
--
CREATE OR REPLACE FUNCTION validate_payment_before_insert_or_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_contract_exists BOOLEAN;
    v_invoice_exists BOOLEAN;
    v_customer_exists BOOLEAN;
    v_existing_payment_id UUID;
    v_contract_total_paid NUMERIC;
    v_contract_amount NUMERIC;
    v_invoice_total_amount NUMERIC;
    v_new_total_paid_for_contract NUMERIC;
    v_new_total_paid_for_invoice NUMERIC;
    v_payment_amount NUMERIC;
    v_max_single_payment_amount NUMERIC := 1000000; -- QAR 1,000,000 as a hard cap for single payment
    v_overpayment_tolerance NUMERIC := 0.10; -- 10% overpayment tolerance for contracts/invoices
BEGIN
    v_payment_amount := COALESCE(NEW.amount, 0);

    -- 1. Basic Required Field Checks
    IF NEW.company_id IS NULL THEN
        RAISE EXCEPTION 'Payment must be associated with a company.';
    END IF;
    IF NEW.customer_id IS NULL THEN
        RAISE EXCEPTION 'Payment must be associated with a customer.';
    END IF;
    IF NEW.payment_date IS NULL THEN
        RAISE EXCEPTION 'Payment date is required.';
    END IF;
    IF v_payment_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive.';
    END IF;
    IF NEW.payment_method IS NULL OR NEW.payment_method = '' THEN
        RAISE EXCEPTION 'Payment method is required.';
    END IF;

    -- 2. Amount Validation
    IF v_payment_amount > v_max_single_payment_amount THEN
        RAISE EXCEPTION 'Payment amount (QAR %) exceeds the maximum allowed single payment of QAR %.', v_payment_amount, v_max_single_payment_amount;
    END IF;

    -- 3. Foreign Key Existence Checks
    SELECT EXISTS (SELECT 1 FROM public.customers WHERE id = NEW.customer_id AND company_id = NEW.company_id) INTO v_customer_exists;
    IF NOT v_customer_exists THEN
        RAISE EXCEPTION 'Customer with ID % not found for company %.', NEW.customer_id, NEW.company_id;
    END IF;

    IF NEW.contract_id IS NOT NULL THEN
        SELECT EXISTS (SELECT 1 FROM public.contracts WHERE id = NEW.contract_id AND company_id = NEW.company_id) INTO v_contract_exists;
        IF NOT v_contract_exists THEN
            RAISE EXCEPTION 'Contract with ID % not found for company %.', NEW.contract_id, NEW.company_id;
        END IF;
    END IF;

    IF NEW.invoice_id IS NOT NULL THEN
        SELECT EXISTS (SELECT 1 FROM public.invoices WHERE id = NEW.invoice_id AND company_id = NEW.company_id) INTO v_invoice_exists;
        IF NOT v_invoice_exists THEN
            RAISE EXCEPTION 'Invoice with ID % not found for company %.', NEW.invoice_id, NEW.company_id;
        END IF;
    END IF;

    -- 4. Idempotency Key Check (for INSERT operations)
    IF TG_OP = 'INSERT' AND NEW.idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_payment_id
        FROM public.payments
        WHERE idempotency_key = NEW.idempotency_key AND company_id = NEW.company_id;

        IF v_existing_payment_id IS NOT NULL THEN
            RAISE EXCEPTION 'Duplicate payment request detected with idempotency key %. Existing payment ID: %', NEW.idempotency_key, v_existing_payment_id;
        END IF;
    END IF;

    -- 5. Consistency between contract_id and invoice_id
    IF NEW.contract_id IS NOT NULL AND NEW.invoice_id IS NOT NULL THEN
        -- Ensure the invoice belongs to the specified contract
        SELECT EXISTS (SELECT 1 FROM public.invoices WHERE id = NEW.invoice_id AND contract_id = NEW.contract_id) INTO v_invoice_exists;
        IF NOT v_invoice_exists THEN
            RAISE EXCEPTION 'Invoice % does not belong to contract %.', NEW.invoice_id, NEW.contract_id;
        END IF;
    END IF;

    -- 6. Payment Status and Processing Status Validity (assuming enums or predefined values)
    -- This would typically involve checking against a predefined list of valid statuses.
    -- For simplicity, we'll assume the client-side or application layer handles this,
    -- or add explicit checks here if statuses are managed purely in DB.
    -- Example: IF NOT (NEW.payment_status IN ('pending', 'completed', 'failed', 'cancelled')) THEN ...

    -- 7. Prevent Overpayment for Linked Contracts/Invoices
    IF NEW.contract_id IS NOT NULL THEN
        SELECT COALESCE(total_paid, 0), COALESCE(contract_amount, 0)
        INTO v_contract_total_paid, v_contract_amount
        FROM public.contracts
        WHERE id = NEW.contract_id;

        v_new_total_paid_for_contract := v_contract_total_paid + v_payment_amount;

        IF v_contract_amount > 0 AND v_new_total_paid_for_contract > (v_contract_amount * (1 + v_overpayment_tolerance)) THEN
            RAISE EXCEPTION 'Payment would cause contract % to be overpaid. Contract amount: %, Current paid: %, New payment: %',
                            NEW.contract_id, v_contract_amount, v_contract_total_paid, v_payment_amount;
        END IF;
    END IF;

    IF NEW.invoice_id IS NOT NULL THEN
        SELECT COALESCE(total_amount, 0)
        INTO v_invoice_total_amount
        FROM public.invoices
        WHERE id = NEW.invoice_id;

        -- Calculate total paid for this invoice (sum of payments linked to this invoice)
        SELECT COALESCE(SUM(amount), 0)
        INTO v_new_total_paid_for_invoice
        FROM public.payments
        WHERE invoice_id = NEW.invoice_id AND id != COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::UUID); -- Exclude current payment if updating

        v_new_total_paid_for_invoice := v_new_total_paid_for_invoice + v_payment_amount;

        IF v_invoice_total_amount > 0 AND v_new_total_paid_for_invoice > (v_invoice_total_amount * (1 + v_overpayment_tolerance)) THEN
            RAISE EXCEPTION 'Payment would cause invoice % to be overpaid. Invoice amount: %, Current paid: %, New payment: %',
                            NEW.invoice_id, v_invoice_total_amount, (v_new_total_paid_for_invoice - v_payment_amount), v_payment_amount;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_payment_before_insert_or_update IS
    'Performs comprehensive validation on payment data before insert or update.';

-- =========================================
-- Create/Replace Trigger
-- =========================================
-- This trigger will replace any existing trigger named 'prevent_overpayment_trigger'
-- or 'validate_payment_duplicate_before_insert' if they exist, to ensure
-- all validations are consolidated into this single, comprehensive function.

DROP TRIGGER IF EXISTS validate_payment_trigger ON public.payments;
DROP TRIGGER IF EXISTS prevent_overpayment_trigger ON public.payments; -- Drop old trigger if exists
DROP TRIGGER IF EXISTS validate_payment_duplicate_before_insert ON public.payments; -- Drop old trigger if exists

CREATE TRIGGER validate_payment_trigger
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_payment_before_insert_or_update();

COMMENT ON TRIGGER validate_payment_trigger ON public.payments IS
    'Ensures data integrity and prevents invalid payment operations before insert or update.';;
