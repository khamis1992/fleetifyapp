-- Migration: Auto-calculate late fees when payment is registered after due date
-- Purpose: Automatically calculate and apply late fees when a payment is registered 
--          after the invoice due date, instead of waiting for daily cron job
-- Date: 2025-01-31

-- ================================================================
-- STEP 1: Create function to check and calculate late fee on payment
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
BEGIN
    -- Only process if payment is linked to an invoice
    IF NEW.invoice_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get invoice details (remove payment_date as it doesn't exist in invoices table)
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

    -- Only calculate late fee if:
    -- 1. Payment date is after due date
    -- 2. Invoice was not already paid before this payment
    -- 3. Invoice has a due date
    IF v_invoice.due_date IS NULL THEN
        RETURN NEW;
    END IF;

    -- Use payment_date from payment, fallback to NEW.created_at
    v_payment_date := COALESCE(NEW.payment_date::DATE, NEW.created_at::DATE);

    BEGIN
        -- Calculate days overdue based on payment date vs due date
        IF v_payment_date <= v_invoice.due_date THEN
            -- Payment is on time or early, no late fee
            RETURN NEW;
        END IF;

        v_days_overdue := v_payment_date - v_invoice.due_date;

        -- Check if late fee already exists for this invoice
        -- (to avoid duplicate fees for multiple payments on same invoice)
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

        -- Get active late fee rule for this company
        SELECT * INTO v_rule
        FROM late_fee_rules
        WHERE company_id = NEW.company_id
          AND is_enabled = true
          AND (apply_to_invoice_types IS NULL OR v_invoice.invoice_type = ANY(apply_to_invoice_types))
        ORDER BY created_at DESC
        LIMIT 1;

        -- If no rule found, skip
        IF NOT FOUND THEN
            RETURN NEW;
        END IF;

        -- Apply grace period
        IF v_days_overdue <= v_rule.grace_period_days THEN
            RETURN NEW;
        END IF;

        -- Calculate fee amount using the existing calculate_late_fee function
        v_fee_amount := calculate_late_fee(NEW.invoice_id, v_days_overdue, v_rule.id);

        -- Only create late fee if amount > 0
        IF v_fee_amount > 0 THEN
            -- Create late fee record
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

            -- Log history
            INSERT INTO late_fee_history (late_fee_id, action, notes)
            VALUES (v_late_fee_id, 'created', format('Auto-generated on payment registration. Payment date: %s, Due date: %s', v_payment_date, v_invoice.due_date));

            -- Update invoice status to overdue if not already
            IF v_invoice.status != 'overdue' THEN
                UPDATE invoices
                SET status = 'overdue',
                    updated_at = NOW()
                WHERE id = NEW.invoice_id;
            END IF;

            RAISE NOTICE '✅ Auto-calculated late fee: Invoice %, Days overdue: %, Fee amount: %', 
                v_invoice.invoice_number, v_days_overdue, v_fee_amount;
        END IF;
    END;

    RETURN NEW;
END;
$$;

-- ================================================================
-- STEP 2: Create trigger on payments table
-- ================================================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_calculate_late_fee_on_payment ON payments;

-- Create trigger that fires AFTER INSERT on payments table
CREATE TRIGGER trigger_auto_calculate_late_fee_on_payment
AFTER INSERT ON payments
FOR EACH ROW
WHEN (NEW.invoice_id IS NOT NULL)
EXECUTE FUNCTION check_and_calculate_late_fee_on_payment();

-- ================================================================
-- STEP 3: Grant permissions
-- ================================================================

GRANT EXECUTE ON FUNCTION check_and_calculate_late_fee_on_payment TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_calculate_late_fee_on_payment TO service_role;

-- ================================================================
-- STEP 4: Add comments
-- ================================================================

COMMENT ON FUNCTION check_and_calculate_late_fee_on_payment IS 
'Automatically calculates and creates late fee when a payment is registered after invoice due date';

COMMENT ON TRIGGER trigger_auto_calculate_late_fee_on_payment ON payments IS 
'Triggers automatic late fee calculation when payment is registered after due date';

-- ================================================================
-- Success message
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Auto-calculate late fees on payment trigger created successfully';
    RAISE NOTICE '📋 Trigger will automatically calculate late fees when payment is registered after due date';
END $$;

