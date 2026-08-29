
-- Fix the function to respect the paid_amount constraint
CREATE OR REPLACE FUNCTION sync_payment_schedule_with_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- Update contract_payment_schedules when invoice payment_status changes
    -- Cap paid_amount at the schedule amount to respect the constraint
    UPDATE contract_payment_schedules
    SET 
        status = CASE 
            WHEN NEW.payment_status = 'paid' THEN 'paid'
            WHEN NEW.payment_status = 'partial' THEN 'partially_paid'
            WHEN NEW.payment_status IN ('overdue', 'unpaid') AND NEW.due_date < CURRENT_DATE THEN 'overdue'
            ELSE 'pending'
        END,
        paid_amount = LEAST(COALESCE(NEW.paid_amount, 0), amount),  -- Cap at schedule amount
        paid_date = CASE 
            WHEN NEW.payment_status IN ('paid', 'partial') THEN COALESCE(
                (SELECT MAX(payment_date) FROM payments WHERE invoice_id = NEW.id AND payment_status = 'completed'),
                CURRENT_DATE
            )
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE invoice_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_payment_schedule_with_invoice() IS 'Syncs contract_payment_schedules status with linked invoice payment_status. Respects paid_amount constraint.';
;
