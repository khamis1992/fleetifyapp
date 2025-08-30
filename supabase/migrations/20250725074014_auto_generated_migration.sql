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

-- Insert default cost centers
INSERT INTO public.default_cost_centers (center_code, center_name, center_name_ar, description, sort_order) VALUES
('CC001', 'Daily Rental', 'الإيجار اليومي', 'Daily vehicle rental operations and related costs', 1),
('CC002', 'Monthly Rental', 'الإيجار الشهري', 'Monthly vehicle rental operations and related costs', 2),
('CC003', 'Maintenance & Operations', 'الصيانة والعمليات', 'Vehicle maintenance, repairs, and operational costs', 3),
('CC004', 'Payroll & Wages', 'الرواتب والأجور', 'Employee salaries, wages, and benefits', 4),
('CC005', 'Penalties & Fines', 'الغرامات والمخالفات', 'Customer penalties, fines, and related charges', 5),
('CC006', 'Administrative Expenses', 'المصاريف الإدارية', 'General administrative and overhead expenses', 6);