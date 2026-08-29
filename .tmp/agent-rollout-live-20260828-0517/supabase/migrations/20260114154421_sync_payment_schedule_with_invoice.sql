
-- Create a function to sync payment schedule status with invoice status
CREATE OR REPLACE FUNCTION sync_payment_schedule_with_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- Update contract_payment_schedules when invoice payment_status changes
    UPDATE contract_payment_schedules
    SET 
        status = CASE 
            WHEN NEW.payment_status = 'paid' THEN 'paid'
            WHEN NEW.payment_status = 'partial' THEN 'partially_paid'
            WHEN NEW.payment_status IN ('overdue', 'unpaid') AND NEW.due_date < CURRENT_DATE THEN 'overdue'
            ELSE 'pending'
        END,
        paid_amount = COALESCE(NEW.paid_amount, 0),
        paid_date = CASE 
            WHEN NEW.payment_status = 'paid' THEN COALESCE(
                (SELECT MAX(payment_date) FROM payments WHERE invoice_id = NEW.id AND payment_status = 'completed'),
                CURRENT_DATE
            )
            WHEN NEW.payment_status = 'partial' THEN COALESCE(
                (SELECT MAX(payment_date) FROM payments WHERE invoice_id = NEW.id AND payment_status = 'completed'),
                NULL
            )
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE invoice_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on invoices table
DROP TRIGGER IF EXISTS trg_sync_schedule_with_invoice ON invoices;
CREATE TRIGGER trg_sync_schedule_with_invoice
    AFTER UPDATE OF payment_status, paid_amount ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION sync_payment_schedule_with_invoice();

-- Also sync on INSERT to handle new invoices linked to schedules
DROP TRIGGER IF EXISTS trg_sync_schedule_with_invoice_insert ON invoices;
CREATE TRIGGER trg_sync_schedule_with_invoice_insert
    AFTER INSERT ON invoices
    FOR EACH ROW
    WHEN (NEW.payment_status IS NOT NULL)
    EXECUTE FUNCTION sync_payment_schedule_with_invoice();

COMMENT ON FUNCTION sync_payment_schedule_with_invoice() IS 'Syncs contract_payment_schedules status with linked invoice payment_status';
;
