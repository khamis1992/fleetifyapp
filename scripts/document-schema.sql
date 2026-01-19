-- ============================================================================
-- Fleetify Database Schema Documentation Script
-- ============================================================================
-- This script extracts comprehensive metadata about the database schema
-- Run this in Supabase SQL Editor or via psql to generate documentation
-- ============================================================================

\echo '========================================'
\echo '1. ALL TABLES WITH ROW COUNTS AND SIZES'
\echo '========================================'

-- Create a function to get accurate row counts
CREATE OR REPLACE FUNCTION get_table_info()
RETURNS TABLE (
    schema_name text,
    table_name text,
    row_count bigint,
    total_size text,
    table_size text,
    index_size text,
    description text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.nspname::text AS schema_name,
        c.relname::text AS table_name,
        pg_total_relation_size(c.oid) AS total_size_bytes,
        pg_relation_size(c.oid) AS table_size_bytes,
        pg_total_relation_size(c.oid) - pg_relation_size(c.oid) AS index_size_bytes,
        obj_description(c.oid, 'pg_class') AS description
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p') -- regular tables and partitioned tables
      AND n.nspname IN ('public', 'auth', 'storage')
    ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Get all tables with their sizes
SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    CASE
        WHEN schemaname IN ('auth', 'storage') THEN '(system table)'
        ELSE '(' || pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) || ')'
    END AS size_info
FROM pg_tables
WHERE schemaname IN ('public', 'auth', 'storage')
ORDER BY
    CASE WHEN schemaname = 'public' THEN 0 ELSE 1 END,
    tablename;

\echo ''
\echo '========================================'
\echo '2. TABLE DETAILS WITH ROW COUNTS'
\echo '========================================'

-- For each public table, get row count
DO $$
DECLARE
    r RECORD;
    row_count bigint;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I.%I', 'public', r.tablename) INTO row_count;
        RAISE NOTICE '%: % rows', r.tablename, row_count;
    END LOOP;
END $$;

\echo ''
\echo '========================================'
\echo '3. COMPLETE COLUMN DEFINITIONS - PUBLIC'
\echo '========================================'

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
    c.is_identity,
    c.identity_generation,
    CASE
        WHEN pk.column_name IS NOT NULL THEN 'PK'
        WHEN fk.column_name IS NOT NULL THEN 'FK → ' || fk.foreign_table_name || '.' || fk.foreign_column_name
        WHEN uk.column_name IS NOT NULL THEN 'UQ'
        ELSE ''
    END AS constraints
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
    SELECT
        ku.table_name,
        ku.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'UNIQUE'
) uk ON c.table_name = uk.table_name AND c.column_name = uk.column_name
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

\echo ''
\echo '========================================'
\echo '4. COLUMN DEFINITIONS - AUTH SCHEMA'
\echo '========================================'

SELECT
    t.table_name,
    c.column_name,
    c.ordinal_position,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'auth' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

\echo ''
\echo '========================================'
\echo '5. COLUMN DEFINITIONS - STORAGE SCHEMA'
\echo '========================================'

SELECT
    t.table_name,
    c.column_name,
    c.ordinal_position,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'storage' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

\echo ''
\echo '========================================'
\echo '6. FOREIGN KEY RELATIONSHIPS'
\echo '========================================'

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
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo '========================================'
\echo '7. ALL INDEXES'
\echo '========================================'

SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    indexname AS index_name,
    indexdef AS index_definition
FROM pg_indexes
WHERE schemaname IN ('public', 'auth', 'storage')
ORDER BY schemaname, tablename, indexname;

\echo ''
\echo '========================================'
\echo '8. INDEX DETAILS WITH TYPES'
\echo '========================================'

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

\echo ''
\echo '========================================'
\echo '9. CHECK CONSTRAINTS'
\echo '========================================'

SELECT
    con.conname AS constraint_name,
    cl.relname::text AS table_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class cl ON con.conrelid = cl.oid
JOIN pg_namespace n ON n.oid = cl.relnamespace
WHERE con.contype = 'c'
  AND n.nspname IN ('public', 'auth', 'storage')
ORDER BY cl.relname, con.conname;

\echo ''
\echo '========================================'
\echo '10. UNIQUE CONSTRAINTS'
\echo '========================================'

SELECT
    tc.constraint_name,
    tc.table_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema IN ('public', 'auth', 'storage')
GROUP BY tc.constraint_name, tc.table_name
ORDER BY tc.table_name, tc.constraint_name;

\echo ''
\echo '========================================'
\echo '11. EXCLUDE CONSTRAINTS'
\echo '========================================'

SELECT
    con.conname AS constraint_name,
    cl.relname::text AS table_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class cl ON con.conrelid = cl.oid
JOIN pg_namespace n ON n.oid = cl.relnamespace
WHERE con.contype = 'x'
  AND n.nspname IN ('public', 'auth', 'storage')
ORDER BY cl.relname, con.conname;

\echo ''
\echo '========================================'
\echo '12. RLS POLICIES - PUBLIC'
\echo '========================================'

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

\echo ''
\echo '========================================'
\echo '13. RLS STATUS ON TABLES'
\echo '========================================'

SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    rowsecurity AS rls_enabled,
    forceral AS rls_forced
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''
\echo '========================================'
\echo '14. ALL FUNCTIONS'
\echo '========================================'

SELECT
    n.nspname::text AS schema_name,
    p.proname::text AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    p.prokind AS function_kind,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'auth', 'storage')
ORDER BY n.nspname, p.proname;

\echo ''
\echo '========================================'
\echo '15. ALL TRIGGERS'
\echo '========================================'

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
WHERE n.nspname IN ('public', 'auth', 'storage')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

\echo ''
\echo '========================================'
\echo '16. ENUM TYPES'
\echo '========================================'

SELECT
    n.nspname::text AS schema_name,
    t.typname::text AS type_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname IN ('public', 'auth', 'storage')
GROUP BY n.nspname, t.typname
ORDER BY n.nspname, t.typname;

\echo ''
\echo '========================================'
\echo '17. CUSTOM TYPES (non-enum)'
\echo '========================================'

SELECT
    n.nspname::text AS schema_name,
    t.typname::text AS type_name,
    pg_catalog.format_type(t.oid, NULL) AS type_definition,
    t.typtype AS type_kind
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname IN ('public', 'auth', 'storage')
  AND t.typtype NOT IN ('b', 'e') -- not base or enum
  AND NOT t.typname LIKE '_%'
ORDER BY n.nspname, t.typname;

\echo ''
\echo '========================================'
\echo '18. VIEWS'
\echo '========================================'

SELECT
    schemaname AS schema_name,
    viewname AS view_name,
    definition AS view_definition,
    CASE WHEN schemaname = 'public' THEN pg_size_pretty(pg_total_relation_size(schemaname||'.'||viewname)) ELSE 'N/A' END AS size
FROM pg_views
WHERE schemaname IN ('public', 'auth', 'storage')
ORDER BY schemaname, viewname;

\echo ''
\echo '========================================'
\echo '19. MATERIALIZED VIEWS'
\echo '========================================'

SELECT
    schemaname AS schema_name,
    matviewname AS materialized_view_name,
    definition AS view_definition,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) AS size
FROM pg_matviews
WHERE schemaname IN ('public', 'auth', 'storage')
ORDER BY schemaname, matviewname;

\echo ''
\echo '========================================'
\echo '20. EXTENSIONS'
\echo '========================================'

SELECT
    extname AS extension_name,
    extversion AS version,
    n.nspname::text AS schema_name,
    extrelocatable AS is_relocatable
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY extname;

\echo ''
\echo '========================================'
\echo '21. TABLE PRIVILEGES'
\echo '========================================'

SELECT
    grantee,
    table_schema,
    table_name,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema IN ('public', 'auth', 'storage')
GROUP BY grantee, table_schema, table_name
ORDER BY table_schema, table_name;

\echo ''
\echo '========================================'
\echo '22. SEQUENCES'
\echo '========================================'

SELECT
    n.nspname::text AS schema_name,
    c.relname::text AS sequence_name,
    pg_size_pretty(pg_relation_size(c.oid)) AS size,
    s.last_value,
    s.start_value,
    s.increment_by,
    s.max_value,
    s.min_value,
    s.cycle_option
FROM pg_sequence s
JOIN pg_class c ON c.oid = s.seqrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'auth', 'storage')
ORDER BY n.nspname, c.relname;

\echo ''
\echo '========================================'
\echo '23. SUPABASE FUNCTIONS (Edge Functions)'
\echo '========================================'

SELECT
    function_name,
    import_map,
    verify_jwt
FROM supabase_functions.functions
ORDER BY function_name;

\echo ''
\echo '========================================'
\echo '24. STORAGE BUCKETS'
\echo '========================================'

SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
ORDER BY name;

\echo ''
\echo '========================================'
\echo '25. PRIMARY KEYS'
\echo '========================================'

SELECT
    tc.table_name,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS primary_key_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

\echo ''
\echo '========================================'
\echo '26. TABLE PARTITIONING INFO'
\echo '========================================'

SELECT
    n.nspname::text AS schema_name,
    c.relname::text AS table_name,
    CASE c.relkind
        WHEN 'p' THEN 'Partitioned Table'
        WHEN 'r' THEN 'Regular Table'
        ELSE c.relkind::text
    END AS table_type,
    pg_get_partkeydef(c.oid) AS partition_key
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('p', 'r')
ORDER BY c.relkind DESC, c.relname;

\echo ''
\echo '========================================'
\echo '27. COMMENT ON TABLES'
\echo '========================================'

SELECT
    n.nspname::text AS schema_name,
    c.relname::text AS table_name,
    obj_description(c.oid, 'pg_class') AS comment
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE obj_description(c.oid, 'pg_class') IS NOT NULL
  AND n.nspname IN ('public', 'auth', 'storage')
ORDER BY n.nspname, c.relname;

\echo ''
\echo '========================================'
\echo '28. COMMENT ON COLUMNS'
\echo '========================================'

SELECT
    n.nspname::text AS schema_name,
    c.relname::text AS table_name,
    a.attname::text AS column_name,
    pgd.description AS comment
FROM pg_description pgd
JOIN pg_class c ON pgd.objoid = c.oid
JOIN pg_attribute a ON pgd.objsubid = a.attnum AND c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE pgd.objsubid <> 0
  AND n.nspname IN ('public', 'auth', 'storage')
ORDER BY n.nspname, c.relname, a.attnum;

\echo ''
\echo '========================================'
\echo '29. DATABASE SIZE SUMMARY'
\echo '========================================'

SELECT
    'Total Database Size' AS metric,
    pg_size_pretty(pg_database_size(current_database())) AS value
UNION ALL
SELECT
    'Public Schema Size',
    pg_size_pretty(pg_schema_size('public'))
UNION ALL
SELECT
    'Auth Schema Size',
    pg_size_pretty(pg_schema_size('auth'))
UNION ALL
SELECT
    'Storage Schema Size',
    pg_size_pretty(pg_schema_size('storage'));

\echo ''
\echo '========================================'
\echo '30. LARGEST TABLES'
\echo '========================================'

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
