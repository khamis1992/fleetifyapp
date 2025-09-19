-- Create function to update contract total_paid when payments change
CREATE OR REPLACE FUNCTION update_contract_total_paid()
RETURNS TRIGGER AS $$
DECLARE
    contract_id_to_update UUID;
    total_paid_amount NUMERIC;
BEGIN
    -- Get the contract ID from the payment
    contract_id_to_update := COALESCE(NEW.contract_id, OLD.contract_id);
    
    -- Only proceed if there's a contract linked
    IF contract_id_to_update IS NOT NULL THEN
        -- Calculate total paid for this contract
        SELECT COALESCE(SUM(amount), 0) INTO total_paid_amount
        FROM payments 
        WHERE contract_id = contract_id_to_update 
        AND payment_status = 'completed';
        
        -- Update the contract
        UPDATE contracts 
        SET 
            total_paid = total_paid_amount,
            balance_due = contract_amount - total_paid_amount,
            updated_at = now()
        WHERE id = contract_id_to_update;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment changes
DROP TRIGGER IF EXISTS payments_update_contract_totals ON payments;
CREATE TRIGGER payments_update_contract_totals
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_total_paid();

-- Update existing contracts with correct total_paid amounts
UPDATE contracts 
SET 
    total_paid = COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE contract_id = contracts.id 
        AND payment_status = 'completed'
    ), 0),
    balance_due = contract_amount - COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE contract_id = contracts.id 
        AND payment_status = 'completed'
    ), 0)
WHERE id IN (
    SELECT DISTINCT contract_id 
    FROM payments 
    WHERE contract_id IS NOT NULL
);