-- Add contract balance and payment tracking fields
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS total_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_due numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS last_payment_date date,
ADD COLUMN IF NOT EXISTS late_fine_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_overdue integer DEFAULT 0;

-- Add constraint for payment_status
ALTER TABLE public.contracts 
DROP CONSTRAINT IF EXISTS contracts_payment_status_check;

ALTER TABLE public.contracts 
ADD CONSTRAINT contracts_payment_status_check 
CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue'));

-- Update existing contracts to set balance_due equal to contract_amount for unpaid contracts
UPDATE public.contracts 
SET balance_due = contract_amount - COALESCE(total_paid, 0)
WHERE balance_due = 0 AND total_paid < contract_amount;

-- Create function to update contract balance when payments are made
CREATE OR REPLACE FUNCTION public.update_contract_balance()
RETURNS TRIGGER AS $$
DECLARE
    contract_record RECORD;
    new_total_paid NUMERIC;
    new_balance_due NUMERIC;
    new_payment_status TEXT;
BEGIN
    -- Only process if contract_id is present and it's a receipt
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.contract_id IS NOT NULL AND NEW.transaction_type = 'receipt' THEN
        -- Get contract details
        SELECT contract_amount, total_paid, balance_due INTO contract_record
        FROM public.contracts WHERE id = NEW.contract_id;
        
        IF FOUND THEN
            -- Calculate new totals for INSERT
            IF TG_OP = 'INSERT' THEN
                new_total_paid := COALESCE(contract_record.total_paid, 0) + NEW.amount;
            -- Calculate new totals for UPDATE (adjust for amount difference)
            ELSIF TG_OP = 'UPDATE' THEN
                new_total_paid := COALESCE(contract_record.total_paid, 0) - COALESCE(OLD.amount, 0) + NEW.amount;
            END IF;
            
            new_balance_due := contract_record.contract_amount - new_total_paid;
            
            -- Determine payment status
            IF new_total_paid >= contract_record.contract_amount THEN
                new_payment_status := 'paid';
            ELSIF new_total_paid > 0 THEN
                new_payment_status := 'partial';
            ELSE
                new_payment_status := 'unpaid';
            END IF;
            
            -- Update contract
            UPDATE public.contracts 
            SET 
                total_paid = new_total_paid,
                balance_due = GREATEST(0, new_balance_due),
                payment_status = new_payment_status,
                last_payment_date = NEW.payment_date,
                updated_at = now()
            WHERE id = NEW.contract_id;
        END IF;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' AND OLD.contract_id IS NOT NULL AND OLD.transaction_type = 'receipt' THEN
        -- Get contract details
        SELECT contract_amount, total_paid INTO contract_record
        FROM public.contracts WHERE id = OLD.contract_id;
        
        IF FOUND THEN
            new_total_paid := GREATEST(0, COALESCE(contract_record.total_paid, 0) - OLD.amount);
            new_balance_due := contract_record.contract_amount - new_total_paid;
            
            -- Determine payment status
            IF new_total_paid >= contract_record.contract_amount THEN
                new_payment_status := 'paid';
            ELSIF new_total_paid > 0 THEN
                new_payment_status := 'partial';
            ELSE
                new_payment_status := 'unpaid';
            END IF;
            
            -- Update contract
            UPDATE public.contracts 
            SET 
                total_paid = new_total_paid,
                balance_due = GREATEST(0, new_balance_due),
                payment_status = new_payment_status,
                updated_at = now()
            WHERE id = OLD.contract_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic contract balance updates
DROP TRIGGER IF EXISTS payments_update_contract_balance ON public.payments;
CREATE TRIGGER payments_update_contract_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_contract_balance();

-- Create function to calculate late fees for overdue contracts
CREATE OR REPLACE FUNCTION public.calculate_contract_late_fees()
RETURNS integer AS $$
DECLARE
    contract_record RECORD;
    updated_count INTEGER := 0;
    daily_fine_rate NUMERIC := 0.001; -- 0.1% daily fine rate (configurable)
BEGIN
    FOR contract_record IN 
        SELECT id, contract_amount, balance_due, last_payment_date, end_date, late_fine_amount
        FROM public.contracts 
        WHERE status = 'active' 
        AND payment_status IN ('unpaid', 'partial', 'overdue')
        AND balance_due > 0
    LOOP
        DECLARE
            days_overdue INTEGER;
            calculated_fine NUMERIC;
            reference_date DATE;
        BEGIN
            -- Use the later of last_payment_date or end_date as reference
            reference_date := GREATEST(
                COALESCE(contract_record.last_payment_date, contract_record.end_date),
                contract_record.end_date
            );
            
            -- Calculate days overdue from the reference date
            days_overdue := GREATEST(0, CURRENT_DATE - reference_date);
            
            IF days_overdue > 0 THEN
                -- Calculate fine: balance_due * daily_rate * days_overdue
                calculated_fine := contract_record.balance_due * daily_fine_rate * days_overdue;
                
                -- Update contract with calculated fine
                UPDATE public.contracts 
                SET 
                    days_overdue = days_overdue,
                    late_fine_amount = calculated_fine,
                    payment_status = 'overdue',
                    balance_due = contract_record.balance_due + calculated_fine - COALESCE(contract_record.late_fine_amount, 0),
                    updated_at = now()
                WHERE id = contract_record.id;
                
                updated_count := updated_count + 1;
            END IF;
        END;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;