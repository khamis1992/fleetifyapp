-- Create contract vehicle returns table
CREATE TABLE public.contract_vehicle_returns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    contract_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    returned_by UUID NOT NULL,
    return_date DATE NOT NULL,
    vehicle_condition TEXT NOT NULL DEFAULT 'good',
    fuel_level NUMERIC DEFAULT 0 CHECK (fuel_level >= 0 AND fuel_level <= 100),
    odometer_reading INTEGER,
    damages JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_vehicle_returns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view vehicle returns in their company" 
ON public.contract_vehicle_returns 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can create vehicle returns in their company" 
ON public.contract_vehicle_returns 
FOR INSERT 
WITH CHECK (
    company_id = get_user_company(auth.uid()) 
    AND (
        has_role(auth.uid(), 'company_admin'::user_role) 
        OR has_role(auth.uid(), 'manager'::user_role) 
        OR has_role(auth.uid(), 'sales_agent'::user_role)
        OR returned_by = auth.uid()
    )
);

CREATE POLICY "Staff can update vehicle returns in their company" 
ON public.contract_vehicle_returns 
FOR UPDATE 
USING (
    company_id = get_user_company(auth.uid()) 
    AND (
        has_role(auth.uid(), 'company_admin'::user_role) 
        OR has_role(auth.uid(), 'manager'::user_role) 
        OR has_role(auth.uid(), 'sales_agent'::user_role)
        OR returned_by = auth.uid()
    )
);

CREATE POLICY "Managers can manage vehicle returns in their company" 
ON public.contract_vehicle_returns 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) 
    OR (
        company_id = get_user_company(auth.uid()) 
        AND (
            has_role(auth.uid(), 'company_admin'::user_role) 
            OR has_role(auth.uid(), 'manager'::user_role)
        )
    )
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_contract_vehicle_returns_updated_at
    BEFORE UPDATE ON public.contract_vehicle_returns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_return_form_timestamp();