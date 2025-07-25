-- Insert default cost centers for existing company
-- This fixes the empty cost centers page for companies created before the default functionality

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
)
SELECT 
    gen_random_uuid(),
    '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c'::uuid,
    dcc.center_code,
    dcc.center_name,
    dcc.center_name_ar,
    dcc.description,
    0,
    0,
    true
FROM public.default_cost_centers dcc
WHERE dcc.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM public.cost_centers cc 
    WHERE cc.company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c'::uuid 
    AND cc.center_code = dcc.center_code
)
ORDER BY dcc.sort_order, dcc.center_code;