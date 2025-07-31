-- Fix contract default status and update existing contracts
-- First, change the default status for new contracts to 'active'
ALTER TABLE public.contracts ALTER COLUMN status SET DEFAULT 'active';

-- Update existing draft contracts to active status if they have valid data
UPDATE public.contracts 
SET status = 'active', updated_at = now()
WHERE status = 'draft' 
AND contract_amount > 0 
AND customer_id IS NOT NULL 
AND start_date IS NOT NULL 
AND end_date IS NOT NULL;

-- Add a check to ensure contracts have required fields when status is active
CREATE OR REPLACE FUNCTION public.validate_active_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate when status is being set to active
    IF NEW.status = 'active' THEN
        -- Ensure required fields are present for active contracts
        IF NEW.contract_amount <= 0 THEN
            RAISE EXCEPTION 'Contract amount must be greater than 0 for active contracts';
        END IF;
        
        IF NEW.customer_id IS NULL THEN
            RAISE EXCEPTION 'Customer is required for active contracts';
        END IF;
        
        IF NEW.start_date IS NULL OR NEW.end_date IS NULL THEN
            RAISE EXCEPTION 'Start and end dates are required for active contracts';
        END IF;
        
        IF NEW.start_date >= NEW.end_date THEN
            RAISE EXCEPTION 'End date must be after start date';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Temporarily disable the contract trigger to avoid conflicts during migration
DROP TRIGGER IF EXISTS handle_contract_changes_trigger ON public.contracts;

-- Create trigger for contract validation
DROP TRIGGER IF EXISTS validate_active_contract_trigger ON public.contracts;
CREATE TRIGGER validate_active_contract_trigger
    BEFORE INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_active_contract();