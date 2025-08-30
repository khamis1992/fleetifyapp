-- Add user account management columns to employees table
ALTER TABLE public.employees 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN has_system_access BOOLEAN DEFAULT FALSE,
ADD COLUMN account_status TEXT DEFAULT 'no_account' CHECK (account_status IN ('no_account', 'pending', 'active', 'inactive', 'suspended'));

-- Create account creation requests table
CREATE TABLE public.account_creation_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    requested_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    company_id UUID NOT NULL
);

-- Enable RLS on account creation requests
ALTER TABLE public.account_creation_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for account creation requests
CREATE POLICY "Managers can manage account requests in their company"
ON public.account_creation_requests
FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

CREATE POLICY "Users can view account requests in their company"
ON public.account_creation_requests
FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- Create audit log table for user account actions
CREATE TABLE public.user_account_audit (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('account_created', 'account_activated', 'account_deactivated', 'account_suspended', 'role_assigned', 'role_removed', 'password_reset')),
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    details JSONB,
    company_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB
);

-- Enable RLS on audit log
ALTER TABLE public.user_account_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for audit log
CREATE POLICY "Managers can view audit logs in their company"
ON public.user_account_audit
FOR SELECT
TO authenticated
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- Create function to generate employee account number
CREATE OR REPLACE FUNCTION generate_employee_account_number(company_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    sequence_num INTEGER;
    account_number TEXT;
BEGIN
    -- Get next sequence number for this company
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM public.employees
    WHERE company_id = company_id_param;
    
    account_number := 'EMP-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN account_number;
END;
$$;

-- Create function to log user account actions
CREATE OR REPLACE FUNCTION log_user_account_action(
    employee_id_param UUID,
    action_type_param TEXT,
    performed_by_param UUID,
    details_param JSONB DEFAULT NULL,
    old_values_param JSONB DEFAULT NULL,
    new_values_param JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    company_id_var UUID;
BEGIN
    -- Get company_id from employee
    SELECT company_id INTO company_id_var
    FROM public.employees
    WHERE id = employee_id_param;
    
    -- Insert audit log
    INSERT INTO public.user_account_audit (
        employee_id,
        action_type,
        performed_by,
        details,
        old_values,
        new_values,
        company_id
    ) VALUES (
        employee_id_param,
        action_type_param,
        performed_by_param,
        details_param,
        old_values_param,
        new_values_param,
        company_id_var
    );
END;
$$;

-- Create trigger for updated_at on account_creation_requests
CREATE TRIGGER update_account_creation_requests_updated_at
    BEFORE UPDATE ON public.account_creation_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employees_account_status ON public.employees(account_status);
CREATE INDEX idx_account_requests_company_status ON public.account_creation_requests(company_id, status);
CREATE INDEX idx_user_audit_employee_company ON public.user_account_audit(employee_id, company_id);