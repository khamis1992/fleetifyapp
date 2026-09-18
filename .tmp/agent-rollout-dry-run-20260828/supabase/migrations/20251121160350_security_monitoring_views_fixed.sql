-- Create security monitoring views (fixed column references)
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
WHERE company_id NOT IN (SELECT id FROM companies)

UNION ALL

SELECT
    'inactive_users_with_active_data' as violation_type,
    COUNT(*) as count,
    ARRAY_AGG(DISTINCT created_by) as affected_users
FROM contracts
WHERE created_by IN (
    SELECT user_id FROM profiles WHERE is_active = false
);

-- Create RLS policy validation function
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
        t.tablename,
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
    GROUP BY t.tablename, t.riisenabled
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;;
