-- Update RLS policies for contract templates to restrict management to admins only
DROP POLICY IF EXISTS "المديرون يمكنهم إدارة قوالب العقود في شركتهم" ON public.contract_templates;

-- Create new policy that restricts management to super_admin and company_admin only
CREATE POLICY "Admins can manage contract templates in their company"
ON public.contract_templates
FOR ALL
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'company_admin'::user_role))
)
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'company_admin'::user_role))
);

-- Keep the view policy for all users (needed for template selection)
-- This policy should already exist, but let's ensure it's correct
DROP POLICY IF EXISTS "المستخدمون يمكنهم عرض قوالب العقود في شركتهم" ON public.contract_templates;

CREATE POLICY "Users can view contract templates in their company"
ON public.contract_templates
FOR SELECT
USING (company_id = get_user_company(auth.uid()));