-- Fix contract creation issues by implementing automatic contract number generation and improving RLS policies

-- 1. Create function to generate contract numbers automatically
CREATE OR REPLACE FUNCTION public.generate_contract_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    contract_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- Get current year
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Count existing contracts for this company in current year
    SELECT COUNT(*) + 1 INTO contract_count
    FROM public.contracts 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Return formatted contract number
    RETURN 'CON-' || year_suffix || '-' || LPAD(contract_count::TEXT, 4, '0');
END;
$$;

-- 2. Create trigger to auto-generate contract numbers
CREATE OR REPLACE FUNCTION public.handle_new_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Generate contract number if not provided
    IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
        NEW.contract_number := public.generate_contract_number(NEW.company_id);
    END IF;
    
    -- Set default dates if not provided
    IF NEW.contract_date IS NULL THEN
        NEW.contract_date := CURRENT_DATE;
    END IF;
    
    -- Ensure created_by is set
    IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trigger_handle_new_contract ON public.contracts;
CREATE TRIGGER trigger_handle_new_contract
    BEFORE INSERT ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_contract();

-- 4. Update RLS policies to ensure INSERT permissions are working properly
DROP POLICY IF EXISTS "Staff can manage contracts in their company" ON public.contracts;
DROP POLICY IF EXISTS "Super admins have full access to contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can view contracts in their company" ON public.contracts;

-- Create simplified and more permissive RLS policies
CREATE POLICY "Enable read access for company users" ON public.contracts
    FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Enable insert for authenticated users in their company" ON public.contracts
    FOR INSERT WITH CHECK (
        company_id = get_user_company(auth.uid()) 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Enable update for staff in their company" ON public.contracts
    FOR UPDATE USING (
        company_id = get_user_company(auth.uid()) 
        AND (
            has_role(auth.uid(), 'super_admin'::user_role) 
            OR has_role(auth.uid(), 'company_admin'::user_role) 
            OR has_role(auth.uid(), 'manager'::user_role) 
            OR has_role(auth.uid(), 'sales_agent'::user_role)
        )
    );

CREATE POLICY "Enable delete for admins in their company" ON public.contracts
    FOR DELETE USING (
        company_id = get_user_company(auth.uid()) 
        AND (
            has_role(auth.uid(), 'super_admin'::user_role) 
            OR has_role(auth.uid(), 'company_admin'::user_role) 
            OR has_role(auth.uid(), 'manager'::user_role)
        )
    );

-- 5. Ensure contract validation doesn't block creation
DROP TRIGGER IF EXISTS validate_contract_account_trigger ON public.contracts;
CREATE TRIGGER validate_contract_account_trigger
    BEFORE INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_contract_account();

-- 6. Make sure the contract_operations_log trigger doesn't block creation
DROP TRIGGER IF EXISTS log_contract_operations_trigger ON public.contracts;
CREATE TRIGGER log_contract_operations_trigger
    AFTER INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.log_contract_operations();

-- 7. Make sure contract activation trigger doesn't block creation
DROP TRIGGER IF EXISTS handle_contract_activation_trigger ON public.contracts;
CREATE TRIGGER handle_contract_activation_trigger
    AFTER UPDATE ON public.contracts
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_contract_activation();