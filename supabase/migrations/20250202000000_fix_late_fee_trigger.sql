-- Migration: Fix late fee trigger - remove reference to non-existent payment_date column
-- Purpose: Fix error "column i.payment_date does not exist" in check_and_calculate_late_fee_on_payment
-- Date: 2025-02-02

-- ================================================================
-- Fix the function to remove reference to invoices.payment_date
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

    -- Get invoice details (without payment_date which doesn't exist)
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

    -- Use payment_date from the NEW payment record
    v_payment_date := NEW.payment_date::DATE;

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
      AND is_active = true
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
        VALUES (
            v_late_fee_id, 
            'created', 
            format('Auto-generated on payment registration. Payment date: %s, Due date: %s, Days overdue: %s', 
                v_payment_date, v_invoice.due_date, v_days_overdue)
        );

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

    RETURN NEW;
END;
$$;

-- ================================================================
-- Success message
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed late fee trigger - removed reference to non-existent payment_date column';
END $$;

