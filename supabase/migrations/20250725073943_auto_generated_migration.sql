-- Create default cost centers table
CREATE TABLE public.default_cost_centers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    center_code TEXT NOT NULL,
    center_name TEXT NOT NULL,
    center_name_ar TEXT,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default cost centers
INSERT INTO public.default_cost_centers (center_code, center_name, center_name_ar, description, sort_order) VALUES
('CC001', 'Daily Rental', 'الإيجار اليومي', 'Daily vehicle rental operations and related costs', 1),
('CC002', 'Monthly Rental', 'الإيجار الشهري', 'Monthly vehicle rental operations and related costs', 2),
('CC003', 'Maintenance & Operations', 'الصيانة والعمليات', 'Vehicle maintenance, repairs, and operational costs', 3),
('CC004', 'Payroll & Wages', 'الرواتب والأجور', 'Employee salaries, wages, and benefits', 4),
('CC005', 'Penalties & Fines', 'الغرامات والمخالفات', 'Customer penalties, fines, and related charges', 5),
('CC006', 'Administrative Expenses', 'المصاريف الإدارية', 'General administrative and overhead expenses', 6);

-- Create function to copy default cost centers to a company
CREATE OR REPLACE FUNCTION public.copy_default_cost_centers_to_company(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    default_center RECORD;
BEGIN
    -- Copy all default cost centers to the company
    FOR default_center IN 
        SELECT * FROM public.default_cost_centers 
        WHERE is_active = true
        ORDER BY sort_order, center_code
    LOOP
        -- Insert the cost center for the company
        INSERT INTO public.cost_centers (
            id,
            company_id,
            center_code,
            center_name,
            center_name_ar,
            description,
            budget_amount,
            actual_amount,
            is_active
        ) VALUES (
            gen_random_uuid(),
            target_company_id,
            default_center.center_code,
            default_center.center_name,
            default_center.center_name_ar,
            default_center.description,
            0,
            0,
            true
        );
    END LOOP;
END;
$function$

-- Update the company creation trigger to include cost centers
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Copy default chart of accounts to the new company
    PERFORM copy_default_accounts_to_company(NEW.id);
    
    -- Copy default cost centers to the new company
    PERFORM copy_default_cost_centers_to_company(NEW.id);
    
    RETURN NEW;
END;
$function$

-- Enable RLS on default_cost_centers table
ALTER TABLE public.default_cost_centers ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for default cost centers (read-only for everyone)
CREATE POLICY "Anyone can view default cost centers" 
ON public.default_cost_centers 
FOR SELECT 
USING (true);

-- Create trigger for updating timestamps
CREATE TRIGGER update_default_cost_centers_updated_at
BEFORE UPDATE ON public.default_cost_centers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();