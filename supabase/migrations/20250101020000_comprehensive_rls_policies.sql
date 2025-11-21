-- ============================================================================
-- COMPREHENSIVE ROW LEVEL SECURITY (RLS) POLICIES MIGRATION
-- ============================================================================
-- Purpose: Implement comprehensive RLS policies for all tables
-- Ensures proper data isolation and security across companies
-- Date: 2025-01-01
-- ============================================================================

-- Step 1: Enable RLS on all tables that don't have it yet
DO $$
BEGIN
    -- List of tables to enable RLS on
    DECLARE rls_tables TEXT[] := ARRAY[
        'companies', 'profiles', 'customers', 'vehicles', 'contracts',
        'invoices', 'payments', 'traffic_violations', 'audit_logs',
        'api_logs', 'user_roles', 'reminder_templates', 'reminder_schedules',
        'reminder_history', 'whatsapp_connection_status', 'template_variables'
    ];

    FOR table_name IN SELECT unnest(rls_tables) LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', table_name);
        RAISE NOTICE '✅ Enabled RLS on table: %', table_name;
    END LOOP;
END $$;

-- Step 2: Create helper functions for RLS policies
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    );
$$;

CREATE OR REPLACE FUNCTION is_company_admin(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND role IN ('admin', 'super_admin')
    );
$$;

CREATE OR REPLACE FUNCTION is_company_manager(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND role IN ('admin', 'manager', 'super_admin')
    );
$$;

-- Step 3: Companies table RLS policies
-- Super admins can do everything, others can only view their own company

DROP POLICY IF EXISTS "Super admins full access to companies" ON companies;
CREATE POLICY "Super admins full access to companies"
    ON companies FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Users can view their company" ON companies;
CREATE POLICY "Users can view their company"
    ON companies FOR SELECT
    USING (id = get_user_company_id());

-- Step 4: Profiles (users) table RLS policies

DROP POLICY IF EXISTS "Super admins full access to profiles" ON profiles;
CREATE POLICY "Super admins full access to profiles"
    ON profiles FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Company admins full access to company profiles" ON profiles;
CREATE POLICY "Company admins full access to company profiles"
    ON profiles FOR ALL
    USING (is_company_admin(company_id))
    WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "Company managers can view company profiles" ON profiles;
CREATE POLICY "Company managers can view company profiles"
    ON profiles FOR SELECT
    USING (is_company_manager(company_id));

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid() AND
        company_id = get_user_company_id()
    );

-- Step 5: User roles table RLS policies

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

-- Step 6: Customers table RLS policies

DROP POLICY IF EXISTS "Super admins full access to customers" ON customers;
CREATE POLICY "Super admins full access to customers"
    ON customers FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Company admins full access to company customers" ON customers;
CREATE POLICY "Company admins full access to company customers"
    ON customers FOR ALL
    USING (is_company_admin(company_id))
    WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "Company managers full access to company customers" ON customers;
CREATE POLICY "Company managers full access to company customers"
    ON customers FOR ALL
    USING (is_company_manager(company_id))
    WITH CHECK (is_company_manager(company_id));

DROP POLICY IF EXISTS "Users can view company customers" ON customers;
CREATE POLICY "Users can view company customers"
    ON customers FOR SELECT
    USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can create company customers" ON customers;
CREATE POLICY "Users can create company customers"
    ON customers FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can update company customers" ON customers;
CREATE POLICY "Users can update company customers"
    ON customers FOR UPDATE
    USING (company_id = get_user_company_id());

-- Step 7: Vehicles table RLS policies

DROP POLICY IF EXISTS "Super admins full access to vehicles" ON vehicles;
CREATE POLICY "Super admins full access to vehicles"
    ON vehicles FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Company admins full access to company vehicles" ON vehicles;
CREATE POLICY "Company admins full access to company vehicles"
    ON vehicles FOR ALL
    USING (is_company_admin(company_id))
    WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "Company managers full access to company vehicles" ON vehicles;
CREATE POLICY "Company managers full access to company vehicles"
    ON vehicles FOR ALL
    USING (is_company_manager(company_id))
    WITH CHECK (is_company_manager(company_id));

DROP POLICY IF EXISTS "Users can view company vehicles" ON vehicles;
CREATE POLICY "Users can view company vehicles"
    ON vehicles FOR SELECT
    USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can create company vehicles" ON vehicles;
CREATE POLICY "Users can create company vehicles"
    ON vehicles FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can update company vehicles" ON vehicles;
CREATE POLICY "Users can update company vehicles"
    ON vehicles FOR UPDATE
    USING (company_id = get_user_company_id());

-- Step 8: Contracts table RLS policies

DROP POLICY IF EXISTS "Super admins full access to contracts" ON contracts;
CREATE POLICY "Super admins full access to contracts"
    ON contracts FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Company admins full access to company contracts" ON contracts;
CREATE POLICY "Company admins full access to company contracts"
    ON contracts FOR ALL
    USING (is_company_admin(company_id))
    WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "Company managers full access to company contracts" ON contracts;
CREATE POLICY "Company managers full access to company contracts"
    ON contracts FOR ALL
    USING (is_company_manager(company_id))
    WITH CHECK (is_company_manager(company_id));

DROP POLICY IF EXISTS "Users can view company contracts" ON contracts;
CREATE POLICY "Users can view company contracts"
    ON contracts FOR SELECT
    USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can create company contracts" ON contracts;
CREATE POLICY "Users can create company contracts"
    ON contracts FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id() AND
        created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update company contracts" ON contracts;
CREATE POLICY "Users can update company contracts"
    ON contracts FOR UPDATE
    USING (company_id = get_user_company_id());

-- Step 9: Invoices table RLS policies

DROP POLICY IF EXISTS "Super admins full access to invoices" ON invoices;
CREATE POLICY "Super admins full access to invoices"
    ON invoices FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Company admins full access to company invoices" ON invoices;
CREATE POLICY "Company admins full access to company invoices"
    ON invoices FOR ALL
    USING (is_company_admin(company_id))
    WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "Company managers full access to company invoices" ON invoices;
CREATE POLICY "Company managers full access to company invoices"
    ON invoices FOR ALL
    USING (is_company_manager(company_id))
    WITH CHECK (is_company_manager(company_id));

DROP POLICY IF EXISTS "Users can view company invoices" ON invoices;
CREATE POLICY "Users can view company invoices"
    ON invoices FOR SELECT
    USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can create company invoices" ON invoices;
CREATE POLICY "Users can create company invoices"
    ON invoices FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id() AND
        created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update company invoices" ON invoices;
CREATE POLICY "Users can update company invoices"
    ON invoices FOR UPDATE
    USING (company_id = get_user_company_id());

-- Step 10: Payments table RLS policies

DROP POLICY IF EXISTS "Super admins full access to payments" ON payments;
CREATE POLICY "Super admins full access to payments"
    ON payments FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Company admins full access to company payments" ON payments;
CREATE POLICY "Company admins full access to company payments"
    ON payments FOR ALL
    USING (is_company_admin(company_id))
    WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "Company managers full access to company payments" ON payments;
CREATE POLICY "Company managers full access to company payments"
    ON payments FOR ALL
    USING (is_company_manager(company_id))
    WITH CHECK (is_company_manager(company_id));

DROP POLICY IF EXISTS "Users can view company payments" ON payments;
CREATE POLICY "Users can view company payments"
    ON payments FOR SELECT
    USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can create company payments" ON payments;
CREATE POLICY "Users can create company payments"
    ON payments FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id() AND
        created_by = auth.uid()
    );

-- Step 11: Traffic violations table RLS policies

DROP POLICY IF EXISTS "Super admins full access to traffic_violations" ON traffic_violations;
CREATE POLICY "Super admins full access to traffic_violations"
    ON traffic_violations FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Company admins full access to company violations" ON traffic_violations;
CREATE POLICY "Company admins full access to company violations"
    ON traffic_violations FOR ALL
    USING (is_company_admin(company_id))
    WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "Company managers full access to company violations" ON traffic_violations;
CREATE POLICY "Company managers full access to company violations"
    ON traffic_violations FOR ALL
    USING (is_company_manager(company_id))
    WITH CHECK (is_company_manager(company_id));

DROP POLICY IF EXISTS "Users can view company violations" ON traffic_violations;
CREATE POLICY "Users can view company violations"
    ON traffic_violations FOR SELECT
    USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can create company violations" ON traffic_violations;
CREATE POLICY "Users can create company violations"
    ON traffic_violations FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id() AND
        created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update company violations" ON traffic_violations;
CREATE POLICY "Users can update company violations"
    ON traffic_violations FOR UPDATE
    USING (company_id = get_user_company_id());

-- Step 12: Audit logs table RLS policies
-- Users can only see audit logs for their company

DROP POLICY IF EXISTS "Super admins full access to audit_logs" ON audit_logs;
CREATE POLICY "Super admins full access to audit_logs"
    ON audit_logs FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Company admins full access to company audit logs" ON audit_logs;
CREATE POLICY "Company admins full access to company audit logs"
    ON audit_logs FOR ALL
    USING (is_company_admin(company_id))
    WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "Users can view company audit logs" ON audit_logs;
CREATE POLICY "Users can view company audit logs"
    ON audit_logs FOR SELECT
    USING (company_id = get_user_company_id());

-- Audit logs are system-generated, no insert/update policies for regular users

-- Step 13: API logs table RLS policies

DROP POLICY IF EXISTS "Super admins full access to api_logs" ON api_logs;
CREATE POLICY "Super admins full access to api_logs"
    ON api_logs FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Company admins full access to company api logs" ON api_logs;
CREATE POLICY "Company admins full access to company api logs"
    ON api_logs FOR ALL
    USING (is_company_admin(company_id))
    WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "Users can view their own api logs" ON api_logs;
CREATE POLICY "Users can view their own api logs"
    ON api_logs FOR SELECT
    USING (user_id = auth.uid());

-- Step 14: Reminder system RLS policies

-- Reminder templates
DROP POLICY IF EXISTS "Super admins full access to reminder_templates" ON reminder_templates;
CREATE POLICY "Super admins full access to reminder_templates"
    ON reminder_templates FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Company managers full access to reminder templates" ON reminder_templates;
CREATE POLICY "Company managers full access to reminder templates"
    ON reminder_templates FOR ALL
    USING (is_company_manager(company_id))
    WITH CHECK (is_company_manager(company_id));

DROP POLICY IF EXISTS "Users can view company reminder templates" ON reminder_templates;
CREATE POLICY "Users can view company reminder templates"
    ON reminder_templates FOR SELECT
    USING (company_id = get_user_company_id());

-- Reminder schedules
DROP POLICY IF EXISTS "Super admins full access to reminder_schedules" ON reminder_schedules;
CREATE POLICY "Super admins full access to reminder_schedules"
    ON reminder_schedules FOR ALL
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Company managers full access to reminder_schedules" ON reminder_schedules;
CREATE POLICY "Company managers full access to reminder_schedules"
    ON reminder_schedules FOR ALL
    USING (is_company_manager(company_id))
    WITH CHECK (is_company_manager(company_id));

DROP POLICY IF EXISTS "Users can view company reminder schedules" ON reminder_schedules;
CREATE POLICY "Users can view company reminder schedules"
    ON reminder_schedules FOR SELECT
    USING (company_id = get_user_company_id());

-- Step 15: Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant necessary permissions for RLS functions
GRANT EXECUTE ON FUNCTION get_user_company_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_company_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_company_manager(UUID) TO authenticated, anon;

-- Step 16: Create security monitoring views
CREATE OR REPLACE VIEW security_policy_violations AS
SELECT
    'users_without_company' as violation_type,
    COUNT(*) as count,
    ARRAY_AGG(user_id) as affected_users
FROM profiles
WHERE company_id IS NULL
AND is_active = true

UNION ALL

SELECT
    'orphaned_records' as violation_type,
    COUNT(*) as count,
    ARRAY_AGG(id) as affected_records
FROM contracts
WHERE company_id NOT IN (SELECT id FROM companies WHERE is_active = true)

UNION ALL

SELECT
    'inactive_users_with_active_data' as violation_type,
    COUNT(*) as count,
    ARRAY_AGG(DISTINCT user_id) as affected_users
FROM contracts
WHERE created_by IN (
    SELECT user_id FROM profiles WHERE is_active = false
);

-- Step 17: Create RLS policy validation function
CREATE OR REPLACE FUNCTION validate_rls_policies()
RETURNS TABLE(
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count INTEGER,
    has_restrictive_policies BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name,
        t.riisenabled as rls_enabled,
        COUNT(p.policyname) as policy_count,
        COUNT(p.policyname) > 0 as has_restrictive_policies
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public'
        AND t.tablename IN (
            'companies', 'profiles', 'customers', 'vehicles', 'contracts',
            'invoices', 'payments', 'traffic_violations', 'audit_logs',
            'user_roles', 'reminder_templates', 'reminder_schedules'
        )
    GROUP BY t.table_name, t.riisenabled
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql;

-- Step 18: Success notification and validation
DO $$
BEGIN
    RAISE NOTICE '🔒 Comprehensive RLS policies implemented successfully';
    RAISE NOTICE '📋 Tables secured: companies, profiles, customers, vehicles, contracts, invoices, payments, violations';
    RAISE NOTICE '🛡️ Policies created for: Super Admins, Company Admins, Company Managers, Regular Users';
    RAISE NOTICE '🔧 Helper functions created: get_user_company_id, is_super_admin, is_company_admin, is_company_manager';
    RAISE NOTICE '📊 Security monitoring view created: security_policy_violations';
    RAISE NOTICE '✅ RLS validation function created: validate_rls_policies';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 To validate RLS policies: SELECT * FROM validate_rls_policies();';
    RAISE NOTICE '🚨 To check for security violations: SELECT * FROM security_policy_violations;';
    RAISE NOTICE '⚠️  Important: Test RLS policies thoroughly before production deployment';
END $$;

-- Step 19: Validate RLS implementation
SELECT * FROM validate_rls_policies();