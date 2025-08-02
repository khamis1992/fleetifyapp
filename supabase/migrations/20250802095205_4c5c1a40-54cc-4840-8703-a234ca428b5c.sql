-- Create function to handle contract cost center assignment
CREATE OR REPLACE FUNCTION public.assign_contract_cost_center()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- If no cost_center_id is provided, get the customer's default
    IF NEW.cost_center_id IS NULL AND NEW.customer_id IS NOT NULL THEN
        NEW.cost_center_id := public.get_customer_default_cost_center(NEW.customer_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for automatic cost center assignment
DROP TRIGGER IF EXISTS assign_contract_cost_center_trigger ON public.contracts;
CREATE TRIGGER assign_contract_cost_center_trigger
    BEFORE INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_contract_cost_center();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_default_cost_center 
ON public.customers(default_cost_center_id);