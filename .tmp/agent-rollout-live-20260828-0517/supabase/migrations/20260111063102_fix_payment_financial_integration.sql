-- Fix handle_payment_financial_integration function
-- The function was calling create_payment_journal_entry with wrong parameters
CREATE OR REPLACE FUNCTION public.handle_payment_financial_integration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Generate payment number if missing
    IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
        BEGIN
            NEW.payment_number := generate_payment_number(NEW.company_id);
        EXCEPTION WHEN OTHERS THEN
            NEW.payment_number := 'PAY-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS');
        END;
    END IF;
    
    -- Note: Journal entry and bank transaction creation is now handled by
    -- trg_payment_journal_entry trigger (AFTER INSERT)
    -- This trigger only handles payment number generation
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Don't block payment creation
    RAISE WARNING 'handle_payment_financial_integration error: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Also remove the overly strict validate_payment_trigger
-- Keep only one validation trigger to avoid conflicts
DROP TRIGGER IF EXISTS validate_payment_trigger ON payments;

-- Fix validate_payment_before_insert_or_update to handle customer_id being optional
CREATE OR REPLACE FUNCTION public.validate_payment_before_insert_or_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    v_max_single_payment_amount NUMERIC := 1000000;
    v_overpayment_tolerance NUMERIC := 0.10;
BEGIN
    v_payment_amount := COALESCE(NEW.amount, 0);

    -- 1. Basic Required Field Checks
    IF NEW.company_id IS NULL THEN
        RAISE EXCEPTION 'Payment must be associated with a company.';
    END IF;
    
    -- customer_id is optional for vendor payments
    -- IF NEW.customer_id IS NULL THEN
    --     RAISE EXCEPTION 'Payment must be associated with a customer.';
    -- END IF;
    
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

    -- 3. Foreign Key Existence Checks (only if IDs are provided)
    IF NEW.customer_id IS NOT NULL THEN
        SELECT EXISTS (SELECT 1 FROM public.customers WHERE id = NEW.customer_id AND company_id = NEW.company_id) INTO v_customer_exists;
        IF NOT v_customer_exists THEN
            RAISE EXCEPTION 'Customer with ID % not found for company %.', NEW.customer_id, NEW.company_id;
        END IF;
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
        SELECT EXISTS (SELECT 1 FROM public.invoices WHERE id = NEW.invoice_id AND contract_id = NEW.contract_id) INTO v_invoice_exists;
        IF NOT v_invoice_exists THEN
            -- Just warn, don't fail - invoice might belong to different contract
            RAISE NOTICE 'Invoice % may not belong to contract % - proceeding anyway.', NEW.invoice_id, NEW.contract_id;
        END IF;
    END IF;

    -- 6. Overpayment checks (with tolerance)
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

        SELECT COALESCE(SUM(amount), 0)
        INTO v_new_total_paid_for_invoice
        FROM public.payments
        WHERE invoice_id = NEW.invoice_id 
          AND (NEW.id IS NULL OR id != NEW.id);

        v_new_total_paid_for_invoice := v_new_total_paid_for_invoice + v_payment_amount;

        IF v_invoice_total_amount > 0 AND v_new_total_paid_for_invoice > (v_invoice_total_amount * (1 + v_overpayment_tolerance)) THEN
            RAISE EXCEPTION 'Payment would cause invoice % to be overpaid. Invoice amount: %, Current paid: %, New payment: %',
                            NEW.invoice_id, v_invoice_total_amount, (v_new_total_paid_for_invoice - v_payment_amount), v_payment_amount;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but re-raise
    RAISE;
END;
$function$;;
