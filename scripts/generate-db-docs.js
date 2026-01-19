/**
 * Fleetify Database Schema Documentation Generator
 *
 * This script generates comprehensive database documentation by running
 * SQL queries against your Supabase database.
 *
 * Instructions:
 * 1. Copy the SQL queries below and run them in Supabase SQL Editor
 * 2. Or use the Supabase CLI: supabase db remote commit
 * 3. Or run this script with node (requires DATABASE_URL env variable)
 */

const queries = {
  // 1. ALL TABLES WITH SCHEMAS
  getAllTables: `
-- ============================================================================
-- ALL TABLES IN PUBLIC, AUTH, AND STORAGE SCHEMAS
-- ============================================================================

SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    CASE
        WHEN schemaname = 'public' THEN 'User table'
        WHEN schemaname = 'auth' THEN 'Supabase Auth table'
        WHEN schemaname = 'storage' THEN 'Supabase Storage table'
    END AS table_type
FROM pg_tables
WHERE schemaname IN ('public', 'auth', 'storage')
ORDER BY schemaname, tablename;
`,

  // 2. ROW COUNTS FOR ALL PUBLIC TABLES
  getRowCounts: `
-- ============================================================================
-- ROW COUNTS FOR ALL PUBLIC TABLES
-- ============================================================================

SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    (xpath('/row/count/text()', xml_count))[1]::text::int AS row_count
FROM (
    SELECT
        schemaname,
        tablename,
        query_to_xml(format(
            'SELECT COUNT(*) FROM %I.%I',
            schemaname,
            tablename
        ), false, true, '') AS xml_count
    FROM pg_tables
    WHERE schemaname = 'public'
) AS counts
ORDER BY tablename;
`,

  // 3. COLUMN DEFINITIONS FOR PUBLIC TABLES
  getPublicColumns: `
-- ============================================================================
-- COMPLETE COLUMN DEFINITIONS - PUBLIC SCHEMA
-- ============================================================================

SELECT
    t.table_name,
    c.column_name,
    c.ordinal_position,
    c.data_type,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.is_nullable,
    c.column_default,
    CASE
        WHEN pk.column_name IS NOT NULL THEN 'PK'
        WHEN fk.column_name IS NOT NULL THEN
            'FK → ' || fk.foreign_table_name || '.' || fk.foreign_column_name
        WHEN uk.column_name IS NOT NULL THEN 'UQ'
        ELSE ''
    END AS constraints
FROM information_schema.tables t
JOIN information_schema.columns c
    ON t.table_name = c.table_name
    AND t.table_schema = c.table_schema
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
    SELECT
        ku.table_name,
        ku.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
    JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'UNIQUE'
) uk ON c.table_name = uk.table_name AND c.column_name = uk.column_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;
`,

  // 4. FOREIGN KEY RELATIONSHIPS
  getForeignKeys: `
-- ============================================================================
-- FOREIGN KEY RELATIONSHIPS
-- ============================================================================

SELECT
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    tc.constraint_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
`,

  // 5. ALL INDEXES
  getIndexes: `
-- ============================================================================
-- ALL INDEXES WITH DETAILS
-- ============================================================================

SELECT
    n.nspname::text AS schema_name,
    t.relname::text AS table_name,
    i.relname::text AS index_name,
    a.amname::text AS index_type,
    ix.indisunique AS is_unique,
    ix.indisprimary AS is_primary,
    array_to_string(array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)), ', ') AS columns,
    pg_get_expr(ix.indpred, ix.indrelid) AS filter_condition,
    pg_size_pretty(pg_relation_size(i.oid)) AS size
FROM pg_index ix
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_am a ON a.oid = i.relam
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE n.nspname IN ('public', 'auth', 'storage')
GROUP BY n.nspname, t.relname, i.relname, a.amname, ix.indisunique, ix.indisprimary, ix.indpred, i.oid
ORDER BY n.nspname, t.relname, i.relname;
`,

  // 6. CHECK CONSTRAINTS
  getCheckConstraints: `
-- ============================================================================
-- CHECK CONSTRAINTS
-- ============================================================================

SELECT
    con.conname AS constraint_name,
    cl.relname::text AS table_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class cl ON con.conrelid = cl.oid
JOIN pg_namespace n ON n.oid = cl.relnamespace
WHERE con.contype = 'c'
    AND n.nspname = 'public'
ORDER BY cl.relname, con.conname;
`,

  // 7. UNIQUE CONSTRAINTS
  getUniqueConstraints: `
-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

SELECT
    tc.constraint_name,
    tc.table_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
GROUP BY tc.constraint_name, tc.table_name
ORDER BY tc.table_name, tc.constraint_name;
`,

  // 8. RLS POLICIES
  getRLSPolicies: `
-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    policyname AS policy_name,
    permissive AS is_permissive,
    roles::text AS applicable_roles,
    cmd AS command,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
`,

  // 9. RLS ENABLED TABLES
  getRLSEnabled: `
-- ============================================================================
-- TABLES WITH RLS ENABLED
-- ============================================================================

SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    rowsecurity AS rls_enabled,
    forceral AS rls_forced
FROM pg_tables
WHERE schemaname = 'public'
    AND rowsecurity = true
ORDER BY tablename;
`,

  // 10. PRIMARY KEYS
  getPrimaryKeys: `
-- ============================================================================
-- PRIMARY KEYS
-- ============================================================================

SELECT
    tc.table_name,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS primary_key_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;
`,

  // 11. ENUM TYPES
  getEnumTypes: `
-- ============================================================================
-- ENUM TYPES
-- ============================================================================

SELECT
    n.nspname::text AS schema_name,
    t.typname::text AS type_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY n.nspname, t.typname
ORDER BY n.nspname, t.typname;
`,

  // 12. FUNCTIONS
  getFunctions: `
-- ============================================================================
-- FUNCTIONS
-- ============================================================================

SELECT
    n.nspname::text AS schema_name,
    p.proname::text AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    CASE p.prokind
        WHEN 'f' THEN 'Function'
        WHEN 'p' THEN 'Procedure'
        WHEN 'a' THEN 'Aggregate'
        WHEN 'w' THEN 'Window'
        ELSE 'Unknown'
    END AS function_kind,
    CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
    END AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'auth', 'storage')
ORDER BY n.nspname, p.proname;
`,

  // 13. TRIGGERS
  getTriggers: `
-- ============================================================================
-- TRIGGERS
-- ============================================================================

SELECT
    n.nspname::text AS schema_name,
    t.tgname AS trigger_name,
    c.relname::text AS table_name,
    pg_get_triggerdef(t.oid) AS trigger_definition,
    CASE t.tgtype::integer & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS trigger_timing,
    CASE t.tgtype::integer & 28
        WHEN 4 THEN 'INSERT'
        WHEN 8 THEN 'DELETE'
        WHEN 16 THEN 'UPDATE'
        WHEN 20 THEN 'INSERT OR UPDATE'
        WHEN 24 THEN 'UPDATE OR DELETE'
        WHEN 28 THEN 'INSERT OR UPDATE OR DELETE'
    END AS trigger_event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;
`,

  // 14. VIEWS
  getViews: `
-- ============================================================================
-- VIEWS
-- ============================================================================

SELECT
    schemaname AS schema_name,
    viewname AS view_name,
    definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;
`,

  // 15. TABLE COMMENTS
  getTableComments: `
-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

SELECT
    n.nspname::text AS schema_name,
    c.relname::text AS table_name,
    obj_description(c.oid, 'pg_class') AS comment
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE obj_description(c.oid, 'pg_class') IS NOT NULL
    AND n.nspname = 'public'
ORDER BY n.nspname, c.relname;
`,

  // 16. COLUMN COMMENTS
  getColumnComments: `
-- ============================================================================
-- COLUMN COMMENTS
-- ============================================================================

SELECT
    n.nspname::text AS schema_name,
    c.relname::text AS table_name,
    a.attname::text AS column_name,
    pgd.description AS comment
FROM pg_description pgd
JOIN pg_class c ON pgd.objoid = c.oid
JOIN pg_attribute a
    ON pgd.objsubid = a.attnum
    AND c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE pgd.objsubid <> 0
    AND n.nspname = 'public'
ORDER BY n.nspname, c.relname, a.attnum;
`,

  // 17. DATABASE SIZE SUMMARY
  getDatabaseSize: `
-- ============================================================================
-- DATABASE SIZE SUMMARY
-- ============================================================================

SELECT
    'Total Database Size' AS metric,
    pg_size_pretty(pg_database_size(current_database())) AS value
UNION ALL
SELECT
    'Public Schema Size',
    pg_size_pretty(
        (SELECT SUM(pg_total_relation_size(oid)) FROM pg_class WHERE relnamespace = 'public'::regnamespace)
    )
UNION ALL
SELECT
    'Auth Schema Size',
    pg_size_pretty(
        (SELECT SUM(pg_total_relation_size(oid)) FROM pg_class WHERE relnamespace = 'auth'::regnamespace)
    )
UNION ALL
SELECT
    'Storage Schema Size',
    pg_size_pretty(
        (SELECT SUM(pg_total_relation_size(oid)) FROM pg_class WHERE relnamespace = 'storage'::regnamespace)
    );
`,

  // 18. LARGEST TABLES
  getLargestTables: `
-- ============================================================================
-- LARGEST TABLES BY SIZE
-- ============================================================================

SELECT
    n.nspname::text AS schema_name,
    c.relname::text AS table_name,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
    pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
    pg_size_pretty(pg_indexes_size(c.oid)) AS indexes_size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'auth', 'storage')
    AND c.relkind IN ('r', 'p')
ORDER BY pg_total_relation_size(c.oid) DESC
LIMIT 20;
`,

  // 19. SEQUENCES
  getSequences: `
-- ============================================================================
-- SEQUENCES
-- ============================================================================

SELECT
    n.nspname::text AS schema_name,
    c.relname::text AS sequence_name,
    pg_size_pretty(pg_relation_size(c.oid)) AS size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'S'
    AND n.nspname = 'public'
ORDER BY c.relname;
`,

  // 20. TABLE PRIVILEGES
  getPrivileges: `
-- ============================================================================
-- TABLE PRIVILEGES
-- ============================================================================

SELECT
    grantee,
    table_schema,
    table_name,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
GROUP BY grantee, table_schema, table_name
ORDER BY table_name, grantee;
`,

  // 21. AUTH SCHEMA TABLES
  getAuthTables: `
-- ============================================================================
-- AUTH SCHEMA TABLES
-- ============================================================================

SELECT
    table_name,
    column_name,
    ordinal_position,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'auth'
    AND table_name IN (
        'users',
        'identities',
        'sessions',
        'refresh_tokens',
        'mfa_challenges',
        'mfa_factors',
        'audit_log_entries'
    )
ORDER BY table_name, ordinal_position;
`,

  // 22. STORAGE SCHEMA TABLES
  getStorageTables: `
-- ============================================================================
-- STORAGE SCHEMA TABLES
-- ============================================================================

SELECT
    table_name,
    column_name,
    ordinal_position,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'storage'
    AND table_name IN (
        'buckets',
        'objects',
        'migrations'
    )
ORDER BY table_name, ordinal_position;
`,
};

// Export for use
module.exports = queries;
