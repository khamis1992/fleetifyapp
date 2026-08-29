-- Create missing RLS helper functions using correct user_role enum values
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT company_id FROM profiles WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_company_admin(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN profiles p ON ur.user_id = p.user_id
        WHERE ur.user_id = auth.uid()
        AND ur.company_id = p_company_id
        AND p.is_active = true
        AND ur.role IN ('company_admin', 'super_admin')
    );
$$;

CREATE OR REPLACE FUNCTION is_company_manager(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN profiles p ON ur.user_id = p.user_id
        WHERE ur.user_id = auth.uid()
        AND ur.company_id = p_company_id
        AND p.is_active = true
        AND ur.role IN ('company_admin', 'manager', 'super_admin')
    );
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_company_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_company_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_company_manager(UUID) TO authenticated, anon;;
