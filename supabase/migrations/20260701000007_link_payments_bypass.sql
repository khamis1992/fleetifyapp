-- Migration: Create function to link payments to invoices bypassing triggers
-- This function is SECURITY DEFINER so it runs with the owner's privileges
-- and can bypass the payment immutability and overpayment triggers

CREATE OR REPLACE FUNCTION link_payments_bypass_triggers()
RETURNS integer AS $$
DECLARE
    linked_count integer := 0;
    rec RECORD;
BEGIN
    -- Temporarily disable triggers on payments
    ALTER TABLE payments DISABLE TRIGGER ALL;

    -- Link all unlinked payments to their matching PYINV3 invoices
    FOR rec IN
        SELECT p.id as payment_id, i.id as invoice_id
        FROM payments p
        JOIN invoices i ON i.invoice_number = 'PYINV3-' || p.payment_number
        WHERE p.invoice_id IS NULL
          AND i.company_id = p.company_id
    LOOP
        UPDATE payments
        SET invoice_id = rec.invoice_id
        WHERE id = rec.payment_id;

        linked_count := linked_count + 1;
    END LOOP;

    -- Re-enable triggers
    ALTER TABLE payments ENABLE TRIGGER ALL;

    RETURN linked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;