-- Phase 1: Database Modifications for Customer-Direct Contract Linking

-- Add default_cost_center_id to customers table
ALTER TABLE public.customers 
ADD COLUMN default_cost_center_id uuid REFERENCES public.cost_centers(id);

-- Create function to get or create default cost center for customer
CREATE OR REPLACE FUNCTION public.get_customer_default_cost_center(customer_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    customer_record RECORD;
    cost_center_id uuid;
    center_code text;
    center_name text;
BEGIN
    -- Get customer info
    SELECT * INTO customer_record
    FROM public.customers
    WHERE id = customer_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;
    
    -- Check if customer already has a default cost center
    IF customer_record.default_cost_center_id IS NOT NULL THEN
        -- Verify the cost center still exists and is active
        SELECT id INTO cost_center_id
        FROM public.cost_centers
        WHERE id = customer_record.default_cost_center_id
        AND is_active = true;
        
        IF cost_center_id IS NOT NULL THEN
            RETURN cost_center_id;
        END IF;
    END IF;
    
    -- Create cost center code and name based on customer
    IF customer_record.customer_type = 'individual' THEN
        center_code := 'CUST-' || UPPER(LEFT(COALESCE(customer_record.first_name, 'CUSTOMER'), 3)) || '-' || customer_record.id::text[1:8];
        center_name := COALESCE(customer_record.first_name || ' ' || customer_record.last_name, 'Customer Center');
    ELSE
        center_code := 'COMP-' || UPPER(LEFT(COALESCE(customer_record.company_name, 'COMPANY'), 3)) || '-' || customer_record.id::text[1:8];
        center_name := COALESCE(customer_record.company_name, 'Company Center');
    END IF;
    
    -- Create new cost center for the customer
    INSERT INTO public.cost_centers (
        company_id,
        center_code,
        center_name,
        center_name_ar,
        description,
        is_active,
        created_by
    ) VALUES (
        customer_record.company_id,
        center_code,
        center_name,
        center_name,
        'Auto-created cost center for customer: ' || center_name,
        true,
        customer_record.created_by
    ) RETURNING id INTO cost_center_id;
    
    -- Update customer with the new default cost center
    UPDATE public.customers
    SET default_cost_center_id = cost_center_id
    WHERE id = customer_id_param;
    
    RETURN cost_center_id;
END;
$$;

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

-- Backfill existing customers with default cost centers
DO $$
DECLARE
    customer_rec RECORD;
BEGIN
    FOR customer_rec IN 
        SELECT id FROM public.customers 
        WHERE default_cost_center_id IS NULL 
        AND is_active = true
    LOOP
        BEGIN
            PERFORM public.get_customer_default_cost_center(customer_rec.id);
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue with other customers
            RAISE NOTICE 'Failed to create cost center for customer %: %', customer_rec.id, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- Update existing contracts without cost centers
UPDATE public.contracts 
SET cost_center_id = public.get_customer_default_cost_center(customer_id)
WHERE cost_center_id IS NULL 
AND customer_id IS NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_default_cost_center 
ON public.customers(default_cost_center_id);

-- Comment the changes
COMMENT ON COLUMN public.customers.default_cost_center_id IS 'Default cost center automatically assigned to customer contracts';
COMMENT ON FUNCTION public.get_customer_default_cost_center(uuid) IS 'Gets or creates a default cost center for customer contracts';
COMMENT ON FUNCTION public.assign_contract_cost_center() IS 'Automatically assigns cost center to contracts based on customer';