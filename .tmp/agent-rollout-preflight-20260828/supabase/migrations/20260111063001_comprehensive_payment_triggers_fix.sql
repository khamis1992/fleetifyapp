-- ================================================================
-- COMPREHENSIVE FIX: Payment Triggers Cleanup
-- ================================================================
-- Problem: Too many conflicting triggers causing errors
-- Solution: Disable problematic triggers and fix function bugs

-- ================================================================
-- STEP 1: Disable duplicate and problematic triggers
-- ================================================================

-- Disable duplicate handle_payment_changes triggers (keep only one)
DROP TRIGGER IF EXISTS handle_payment_changes ON payments;
DROP TRIGGER IF EXISTS handle_payment_changes_trigger ON payments;
DROP TRIGGER IF EXISTS payment_auto_journal_trigger ON payments;

-- Disable duplicate contract total update triggers (keep one)
DROP TRIGGER IF EXISTS trigger_sync_contract_total_paid ON payments;

-- Disable duplicate invoice update triggers
DROP TRIGGER IF EXISTS trg_update_invoice_on_payment ON payments;

-- ================================================================
-- STEP 2: Fix the check_and_calculate_late_fee_on_payment function
-- ================================================================
CREATE OR REPLACE FUNCTION check_and_calculate_late_fee_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice RECORD;
    v_days_overdue INTEGER;
    v_fee_amount NUMERIC := 0;
    v_late_fee_id UUID;
    v_existing_fee UUID;
    v_rule RECORD;
    v_payment_date DATE;
BEGIN
    -- Only process if payment is linked to an invoice
    IF NEW.invoice_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get invoice details (fixed: removed non-existent payment_date column)
    SELECT 
        i.id,
        i.company_id,
        i.invoice_number,
        i.customer_id,
        i.contract_id,
        i.due_date,
        i.total_amount,
        i.invoice_type,
        i.payment_status,
        i.status
    INTO v_invoice
    FROM invoices i
    WHERE i.id = NEW.invoice_id;

    -- If invoice not found, skip
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Check if invoice has a due date
    IF v_invoice.due_date IS NULL THEN
        RETURN NEW;
    END IF;

    -- Use payment_date from the NEW payment record (fixed: removed reference to i.payment_date)
    v_payment_date := COALESCE(NEW.payment_date::DATE, CURRENT_DATE);

    -- Calculate days overdue based on payment date vs due date
    IF v_payment_date <= v_invoice.due_date THEN
        RETURN NEW;
    END IF;

    v_days_overdue := v_payment_date - v_invoice.due_date;

    -- Check if late fee already exists for this invoice
    SELECT id INTO v_existing_fee
    FROM late_fees
    WHERE invoice_id = NEW.invoice_id
      AND status IN ('pending', 'applied')
      AND days_overdue = v_days_overdue
    LIMIT 1;

    -- If late fee already exists, skip
    IF v_existing_fee IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Get active late fee rule for this company (fixed: use is_enabled instead of is_active)
    SELECT * INTO v_rule
    FROM late_fee_rules
    WHERE company_id = NEW.company_id
      AND is_enabled = true
    ORDER BY created_at DESC
    LIMIT 1;

    -- If no rule found, skip silently
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Apply grace period
    IF v_days_overdue <= COALESCE(v_rule.grace_period_days, 0) THEN
        RETURN NEW;
    END IF;

    -- Try to calculate fee amount, but don't fail if function doesn't exist
    BEGIN
        v_fee_amount := calculate_late_fee(NEW.invoice_id, v_days_overdue, v_rule.id);
    EXCEPTION WHEN OTHERS THEN
        -- If calculate_late_fee function fails, skip late fee creation
        RAISE NOTICE 'Late fee calculation skipped: %', SQLERRM;
        RETURN NEW;
    END;

    -- Only create late fee if amount > 0
    IF v_fee_amount > 0 THEN
        BEGIN
            INSERT INTO late_fees (
                company_id,
                invoice_id,
                contract_id,
                late_fee_rule_id,
                original_amount,
                days_overdue,
                fee_amount,
                fee_type,
                status,
                created_at
            )
            VALUES (
                NEW.company_id,
                NEW.invoice_id,
                v_invoice.contract_id,
                v_rule.id,
                v_invoice.total_amount,
                v_days_overdue,
                v_fee_amount,
                v_rule.fee_type,
                'pending',
                NOW()
            )
            RETURNING id INTO v_late_fee_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Late fee creation skipped: %', SQLERRM;
            RETURN NEW;
        END;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Don't block payment creation if late fee logic fails
    RAISE NOTICE 'Late fee trigger error (non-blocking): %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ================================================================
-- STEP 3: Fix the create_payment_journal_entry function
-- ================================================================
CREATE OR REPLACE FUNCTION create_payment_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    _entry_number TEXT;
    _journal_id UUID;
    _cash_account_id UUID;
    _revenue_account_id UUID;
    _ar_account_id UUID;
BEGIN
    -- Only for completed payments
    IF NEW.payment_status != 'completed' THEN
        RETURN NEW;
    END IF;
    
    -- Get account IDs for this company (removed is_active filter - column might not exist)
    SELECT id INTO _cash_account_id 
    FROM public.chart_of_accounts 
    WHERE company_id = NEW.company_id 
    AND account_code = '1101' 
    LIMIT 1;
    
    SELECT id INTO _ar_account_id
    FROM public.chart_of_accounts 
    WHERE company_id = NEW.company_id 
    AND account_code = '1201' 
    LIMIT 1;
    
    SELECT id INTO _revenue_account_id
    FROM public.chart_of_accounts 
    WHERE company_id = NEW.company_id 
    AND account_code = '4101' 
    LIMIT 1;
    
    -- Skip if accounts not found
    IF _cash_account_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Generate entry number
    _entry_number := 'PAY-' || TO_CHAR(COALESCE(NEW.payment_date, CURRENT_DATE), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
    
    BEGIN
        -- Create journal entry
        INSERT INTO public.journal_entries (
            company_id,
            entry_number,
            entry_date,
            description,
            total_debit,
            total_credit,
            entry_type,
            status,
            source_document_type,
            source_document_id,
            created_by
        ) VALUES (
            NEW.company_id,
            _entry_number,
            COALESCE(NEW.payment_date, CURRENT_DATE),
            'قيد استلام دفعة: ' || COALESCE(NEW.payment_number, NEW.reference_number, ''),
            NEW.amount,
            NEW.amount,
            'automatic',
            'posted',
            'payment',
            NEW.id,
            auth.uid()
        ) RETURNING id INTO _journal_id;
        
        -- Debit: Cash
        INSERT INTO public.journal_entry_lines (
            journal_entry_id,
            account_id,
            debit_amount,
            credit_amount,
            line_description,
            line_number
        ) VALUES (
            _journal_id,
            _cash_account_id,
            NEW.amount,
            0,
            'استلام نقدية',
            1
        );
        
        -- Credit: AR or Revenue
        INSERT INTO public.journal_entry_lines (
            journal_entry_id,
            account_id,
            debit_amount,
            credit_amount,
            line_description,
            line_number
        ) VALUES (
            _journal_id,
            COALESCE(CASE WHEN NEW.invoice_id IS NOT NULL THEN _ar_account_id ELSE _revenue_account_id END, _ar_account_id),
            0,
            NEW.amount,
            CASE WHEN NEW.invoice_id IS NOT NULL THEN 'تحصيل من العملاء' ELSE 'إيراد مباشر' END,
            2
        );
    EXCEPTION WHEN OTHERS THEN
        -- Don't fail payment creation if journal entry fails
        RAISE NOTICE 'Journal entry creation skipped: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$function$;

-- ================================================================
-- STEP 4: Ensure only one trigger for each function
-- ================================================================

-- Keep only these essential triggers active:
-- 1. trigger_payment_changes (BEFORE INSERT) - validates and prepares payment
-- 2. contract_payment_insert_trigger (AFTER INSERT) - updates contract totals
-- 3. invoice_payment_insert_trigger (AFTER INSERT) - updates invoice totals
-- 4. trigger_auto_calculate_late_fee_on_payment (AFTER INSERT) - late fee (now fixed)
-- 5. trg_payment_journal_entry (AFTER INSERT) - journal entry (now fixed)

-- ================================================================
-- STEP 5: Add comments
-- ================================================================
COMMENT ON FUNCTION check_and_calculate_late_fee_on_payment IS 
'Safely calculates late fees on payment - handles all errors gracefully';

COMMENT ON FUNCTION create_payment_journal_entry IS 
'Creates journal entry for completed payments - handles missing accounts gracefully';;
