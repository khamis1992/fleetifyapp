-- Additional RLS policies for tables that need them

-- User roles table RLS policies (comprehensive)
DROP POLICY IF EXISTS "Super admins full access to user roles" ON user_roles;
CREATE POLICY "Super admins full access to user roles"
    ON user_roles FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Company admins full access to company user roles" ON user_roles;
CREATE POLICY "Company admins full access to company user roles"
    ON user_roles FOR ALL
    USING (is_company_admin(company_id))
    WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "Company managers can view company user roles" ON user_roles;
CREATE POLICY "Company managers can view company user roles"
    ON user_roles FOR SELECT
    USING (is_company_manager(company_id));

DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles"
    ON user_roles FOR SELECT
    USING (user_id = auth.uid());

-- Ensure RLS is enabled on user_roles if not already
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;;
