-- ================================================================
-- Migration: Contract Payment Synchronization
-- Created: 2026-01-10
-- Description: Automatically update contract total_paid when payments change
-- Impact: HIGH - Ensures contract balances are always correct
-- ================================================================

-- ============================================================================
-- FUNCTION: update_contract_payment_totals
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contract_payment_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_contract RECORD;
    v_total_paid NUMERIC;
    v_balance_due NUMERIC;
BEGIN
    -- Only process payments linked to contracts
    IF NEW.contract_id IS NULL THEN
        -- For DELETE, check OLD
        IF TG_OP = 'DELETE' AND OLD.contract_id IS NOT NULL THEN
            -- Continue with OLD contract_id
        ELSE
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            ELSE
                RETURN NEW;
            END IF;
        END IF;
    END IF;

    -- Determine which contract_id and company_id to use
    DECLARE
        v_contract_id_to_use UUID := COALESCE(NEW.contract_id, OLD.contract_id);
        v_company_id_to_use UUID := COALESCE(NEW.company_id, OLD.company_id);
    BEGIN
        -- Get contract details
        SELECT * INTO v_contract
        FROM contracts
        WHERE id = v_contract_id_to_use;

        IF NOT FOUND THEN
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            ELSE
                RETURN NEW;
            END IF;
        END IF;

        -- Calculate total paid for this contract
        SELECT COALESCE(SUM(amount), 0)
        INTO v_total_paid
        FROM payments
        WHERE contract_id = v_contract_id_to_use
          AND payment_status = 'completed'
          AND company_id = v_company_id_to_use;

        v_balance_due := COALESCE(v_contract.contract_amount, 0) - v_total_paid;

        -- Update contract
        UPDATE contracts
        SET
            total_paid = v_total_paid,
            balance_due = v_balance_due,
            updated_at = NOW()
        WHERE id = v_contract_id_to_use;

        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS contract_payment_insert_trigger ON payments;
DROP TRIGGER IF EXISTS contract_payment_update_trigger ON payments;
DROP TRIGGER IF EXISTS contract_payment_delete_trigger ON payments;

-- Create INSERT trigger
CREATE TRIGGER contract_payment_insert_trigger
    AFTER INSERT ON payments
    FOR EACH ROW
    WHEN (NEW.contract_id IS NOT NULL)
    EXECUTE FUNCTION update_contract_payment_totals();

-- Create UPDATE trigger
CREATE TRIGGER contract_payment_update_trigger
    AFTER UPDATE ON payments
    FOR EACH ROW
    WHEN (
        (OLD.contract_id IS NOT NULL OR NEW.contract_id IS NOT NULL) AND
        (OLD.payment_status != NEW.payment_status OR
         OLD.amount != NEW.amount OR
         OLD.contract_id != NEW.contract_id OR
         OLD.company_id != NEW.company_id)
    )
    EXECUTE FUNCTION update_contract_payment_totals();

-- Create DELETE trigger
CREATE TRIGGER contract_payment_delete_trigger
    AFTER DELETE ON payments
    FOR EACH ROW
    WHEN (OLD.contract_id IS NOT NULL)
    EXECUTE FUNCTION update_contract_payment_totals();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION update_contract_payment_totals IS
'Automatically updates contract total_paid and balance_due when payments change. Triggered on INSERT, UPDATE, DELETE of payments linked to contracts.';

COMMENT ON TRIGGER contract_payment_insert_trigger ON payments IS
'Updates contract totals when a new payment is created.';

COMMENT ON TRIGGER contract_payment_update_trigger ON payments IS
'Updates contract totals when a payment status or amount changes.';

COMMENT ON TRIGGER contract_payment_delete_trigger ON payments IS
'Updates contract totals when a payment is deleted.';

-- ============================================================================
-- FUNCTION: recalculate_all_contract_payments
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_contract_payments(p_company_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_contract RECORD;
    v_updated_count INTEGER := 0;
    v_total_paid NUMERIC;
    v_balance_due NUMERIC;
BEGIN
    -- Loop through all contracts (or specific company)
    FOR v_contract IN
        SELECT id, contract_number, contract_amount, company_id
        FROM contracts
        WHERE (p_company_id IS NULL OR company_id = p_company_id)
    LOOP
        -- Calculate total paid
        SELECT COALESCE(SUM(amount), 0)
        INTO v_total_paid
        FROM payments
        WHERE contract_id = v_contract.id
          AND payment_status = 'completed'
          AND company_id = v_contract.company_id;

        v_balance_due := COALESCE(v_contract.contract_amount, 0) - v_total_paid;

        -- Update contract
        UPDATE contracts
        SET
            total_paid = v_total_paid,
            balance_due = v_balance_due,
            updated_at = NOW()
        WHERE id = v_contract.id;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'contracts_updated', v_updated_count,
        'message', format('Updated %s contracts', v_updated_count)
    );
END;
$$;

COMMENT ON FUNCTION recalculate_all_contract_payments IS
'Recalculates all contract payment totals. Optional company_id parameter limits to specific company. Useful for data cleanup after manual corrections.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION recalculate_all_contract_payments TO authenticated;;
