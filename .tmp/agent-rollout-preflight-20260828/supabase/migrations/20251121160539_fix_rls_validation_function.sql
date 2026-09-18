-- Fix RLS policy validation function with correct column name
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
        t.rowsecurity as rls_enabled,
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
    GROUP BY t.tablename, t.rowsecurity
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;;
