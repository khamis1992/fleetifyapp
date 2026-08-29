-- ================================================================
-- Migration: Automatic Invoice Payment Synchronization
-- Created: 2026-01-10
-- Description: Automatically update invoice paid_amount and payment_status when payments are created/updated/deleted
-- Impact: CRITICAL - Ensures invoice balances are always correct
-- ================================================================

-- ============================================================================
-- FUNCTION: update_invoice_payment_totals
-- ============================================================================

CREATE OR REPLACE FUNCTION update_invoice_payment_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_invoice RECORD;
    v_total_paid NUMERIC;
    v_invoice_amount NUMERIC;
    v_balance_due NUMERIC;
    v_payment_status TEXT;
BEGIN
    -- Only process payments linked to invoices
    IF NEW.invoice_id IS NULL THEN
        -- For DELETE, check OLD
        IF TG_OP = 'DELETE' AND OLD.invoice_id IS NOT NULL THEN
            -- Continue with OLD invoice_id
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Determine which invoice_id to use
    IF TG_OP = 'DELETE' THEN
        -- Get invoice details using OLD
        SELECT * INTO v_invoice
        FROM invoices
        WHERE id = OLD.invoice_id;

        IF NOT FOUND THEN
            RETURN OLD;
        END IF;

        -- Calculate total paid (excluding the payment being deleted)
        SELECT COALESCE(SUM(amount), 0)
        INTO v_total_paid
        FROM payments
        WHERE invoice_id = OLD.invoice_id
          AND payment_status = 'completed'
          AND company_id = OLD.company_id;
    ELSE
        -- For INSERT/UPDATE, get invoice details using NEW
        SELECT * INTO v_invoice
        FROM invoices
        WHERE id = NEW.invoice_id;

        IF NOT FOUND THEN
            RETURN NEW;
        END IF;

        -- Calculate total paid
        SELECT COALESCE(SUM(amount), 0)
        INTO v_total_paid
        FROM payments
        WHERE invoice_id = NEW.invoice_id
          AND payment_status = 'completed'
          AND company_id = NEW.company_id;
    END IF;

    v_invoice_amount := COALESCE(v_invoice.total_amount, 0);
    v_balance_due := v_invoice_amount - v_total_paid;

    -- Determine payment status
    IF v_invoice_amount = 0 THEN
        v_payment_status := 'unpaid';
    ELSIF v_total_paid >= v_invoice_amount THEN
        v_payment_status := 'paid';
    ELSIF v_total_paid > 0 THEN
        v_payment_status := 'partial';
    ELSE
        v_payment_status := 'unpaid';
    END IF;

    -- Update invoice
    UPDATE invoices
    SET
        paid_amount = v_total_paid,
        balance_due = v_balance_due,
        payment_status = v_payment_status,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS invoice_payment_insert_trigger ON payments;
DROP TRIGGER IF EXISTS invoice_payment_update_trigger ON payments;
DROP TRIGGER IF EXISTS invoice_payment_delete_trigger ON payments;

-- Create INSERT trigger
CREATE TRIGGER invoice_payment_insert_trigger
    AFTER INSERT ON payments
    FOR EACH ROW
    WHEN (NEW.invoice_id IS NOT NULL)
    EXECUTE FUNCTION update_invoice_payment_totals();

-- Create UPDATE trigger
CREATE TRIGGER invoice_payment_update_trigger
    AFTER UPDATE ON payments
    FOR EACH ROW
    WHEN (
        (OLD.invoice_id IS NOT NULL OR NEW.invoice_id IS NOT NULL) AND
        (OLD.payment_status != NEW.payment_status OR
         OLD.amount != NEW.amount OR
         OLD.invoice_id != NEW.invoice_id OR
         OLD.company_id != NEW.company_id)
    )
    EXECUTE FUNCTION update_invoice_payment_totals();

-- Create DELETE trigger
CREATE TRIGGER invoice_payment_delete_trigger
    AFTER DELETE ON payments
    FOR EACH ROW
    WHEN (OLD.invoice_id IS NOT NULL)
    EXECUTE FUNCTION update_invoice_payment_totals();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION update_invoice_payment_totals IS
'Automatically updates invoice paid_amount, balance_due, and payment_status when payments change. Triggered on INSERT, UPDATE, DELETE of payments linked to invoices.';

COMMENT ON TRIGGER invoice_payment_insert_trigger ON payments IS
'Updates invoice totals when a new payment is created (regardless of status - trigger handles the filtering).';

COMMENT ON TRIGGER invoice_payment_update_trigger ON payments IS
'Updates invoice totals when a payment status, amount, or invoice link changes.';

COMMENT ON TRIGGER invoice_payment_delete_trigger ON payments IS
'Updates invoice totals when a payment is deleted.';

-- ============================================================================
-- FUNCTION: recalculate_all_invoice_payments
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_invoice_payments(p_company_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_invoice RECORD;
    v_updated_count INTEGER := 0;
    v_total_paid NUMERIC;
    v_balance_due NUMERIC;
    v_payment_status TEXT;
BEGIN
    -- Loop through all invoices (or specific company)
    FOR v_invoice IN
        SELECT id, invoice_number, total_amount, company_id
        FROM invoices
        WHERE (p_company_id IS NULL OR company_id = p_company_id)
    LOOP
        -- Calculate total paid
        SELECT COALESCE(SUM(amount), 0)
        INTO v_total_paid
        FROM payments
        WHERE invoice_id = v_invoice.id
          AND payment_status = 'completed'
          AND company_id = v_invoice.company_id;

        v_balance_due := COALESCE(v_invoice.total_amount, 0) - v_total_paid;

        -- Determine status
        IF COALESCE(v_invoice.total_amount, 0) = 0 THEN
            v_payment_status := 'unpaid';
        ELSIF v_total_paid >= v_invoice.total_amount THEN
            v_payment_status := 'paid';
        ELSIF v_total_paid > 0 THEN
            v_payment_status := 'partial';
        ELSE
            v_payment_status := 'unpaid';
        END IF;

        -- Update invoice
        UPDATE invoices
        SET
            paid_amount = v_total_paid,
            balance_due = v_balance_due,
            payment_status = v_payment_status,
            updated_at = NOW()
        WHERE id = v_invoice.id;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'invoices_updated', v_updated_count,
        'message', format('Updated %s invoices', v_updated_count)
    );
END;
$$;

COMMENT ON FUNCTION recalculate_all_invoice_payments IS
'Recalculates all invoice payment totals. Optional company_id parameter limits to specific company. Useful for data cleanup after manual corrections or initial migration.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION recalculate_all_invoice_payments TO authenticated;;
