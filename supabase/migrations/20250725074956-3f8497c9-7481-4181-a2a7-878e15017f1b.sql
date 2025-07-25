-- Manually copy default cost centers to existing company
-- This will populate cost centers for companies created before the default cost center functionality
SELECT copy_default_cost_centers_to_company(company_id) 
FROM profiles 
WHERE user_id = auth.uid() 
AND company_id IS NOT NULL;