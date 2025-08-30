-- Create leave types table
CREATE TABLE public.leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    type_name TEXT NOT NULL,
    type_name_ar TEXT,
    description TEXT,
    max_days_per_year INTEGER DEFAULT 0,
    requires_approval BOOLEAN DEFAULT true,
    is_paid BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create leave balances table
CREATE TABLE public.leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    leave_type_id UUID NOT NULL,
    total_days INTEGER DEFAULT 0,
    used_days INTEGER DEFAULT 0,
    remaining_days INTEGER DEFAULT 0,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(employee_id, leave_type_id, year)
);

-- Create leave requests table
CREATE TABLE public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    leave_type_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    applied_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    emergency_contact TEXT,
    covering_employee_id UUID,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for leave_types
CREATE POLICY "Admins can manage leave types in their company"
ON public.leave_types
FOR ALL
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

CREATE POLICY "Users can view leave types in their company"
ON public.leave_types
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

-- RLS policies for leave_balances
CREATE POLICY "Employees can view their own leave balances"
ON public.leave_balances
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.id = leave_balances.employee_id 
        AND e.company_id = get_user_company(auth.uid())
        AND (e.user_id = auth.uid() OR 
             has_role(auth.uid(), 'super_admin'::user_role) OR
             has_role(auth.uid(), 'company_admin'::user_role) OR 
             has_role(auth.uid(), 'manager'::user_role))
    )
);

CREATE POLICY "Admins can manage leave balances"
ON public.leave_balances
FOR ALL
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.id = leave_balances.employee_id 
        AND e.company_id = get_user_company(auth.uid())
        AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
    )
);

-- RLS policies for leave_requests
CREATE POLICY "Employees can view their own leave requests"
ON public.leave_requests
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.id = leave_requests.employee_id 
        AND e.company_id = get_user_company(auth.uid())
        AND (e.user_id = auth.uid() OR 
             has_role(auth.uid(), 'super_admin'::user_role) OR
             has_role(auth.uid(), 'company_admin'::user_role) OR 
             has_role(auth.uid(), 'manager'::user_role))
    )
);

CREATE POLICY "Employees can insert their own leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.id = leave_requests.employee_id 
        AND e.user_id = auth.uid()
        AND e.company_id = get_user_company(auth.uid())
    )
);

CREATE POLICY "Admins can manage leave requests"
ON public.leave_requests
FOR ALL
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.id = leave_requests.employee_id 
        AND e.company_id = get_user_company(auth.uid())
        AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
    )
);

-- Insert default leave types for companies
INSERT INTO public.leave_types (company_id, type_name, type_name_ar, description, max_days_per_year, requires_approval, is_paid)
SELECT 
    c.id,
    'Annual Leave',
    'إجازة سنوية',
    'Annual vacation leave',
    30,
    true,
    true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.leave_types lt 
    WHERE lt.company_id = c.id AND lt.type_name = 'Annual Leave'
);

INSERT INTO public.leave_types (company_id, type_name, type_name_ar, description, max_days_per_year, requires_approval, is_paid)
SELECT 
    c.id,
    'Sick Leave',
    'إجازة مرضية',
    'Medical sick leave',
    15,
    true,
    true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.leave_types lt 
    WHERE lt.company_id = c.id AND lt.type_name = 'Sick Leave'
);

INSERT INTO public.leave_types (company_id, type_name, type_name_ar, description, max_days_per_year, requires_approval, is_paid)
SELECT 
    c.id,
    'Emergency Leave',
    'إجازة طارئة',
    'Emergency leave for urgent matters',
    5,
    false,
    true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.leave_types lt 
    WHERE lt.company_id = c.id AND lt.type_name = 'Emergency Leave'
);

INSERT INTO public.leave_types (company_id, type_name, type_name_ar, description, max_days_per_year, requires_approval, is_paid)
SELECT 
    c.id,
    'Maternity Leave',
    'إجازة أمومة',
    'Maternity leave for new mothers',
    90,
    true,
    true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.leave_types lt 
    WHERE lt.company_id = c.id AND lt.type_name = 'Maternity Leave'
);

-- Create triggers for updated_at
CREATE TRIGGER update_leave_types_updated_at
    BEFORE UPDATE ON public.leave_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at
    BEFORE UPDATE ON public.leave_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
    BEFORE UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize leave balances for new employees
CREATE OR REPLACE FUNCTION public.initialize_employee_leave_balances(employee_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    leave_type_record RECORD;
    current_year INTEGER;
BEGIN
    current_year := EXTRACT(year FROM CURRENT_DATE);
    
    -- Get company from employee
    FOR leave_type_record IN 
        SELECT lt.* 
        FROM public.leave_types lt
        JOIN public.employees e ON e.company_id = lt.company_id
        WHERE e.id = employee_id_param AND lt.is_active = true
    LOOP
        INSERT INTO public.leave_balances (
            employee_id,
            leave_type_id,
            total_days,
            used_days,
            remaining_days,
            year
        ) VALUES (
            employee_id_param,
            leave_type_record.id,
            leave_type_record.max_days_per_year,
            0,
            leave_type_record.max_days_per_year,
            current_year
        ) ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
    END LOOP;
END;
$$;