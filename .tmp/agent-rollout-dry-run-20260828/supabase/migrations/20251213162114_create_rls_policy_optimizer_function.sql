-- Create a function to help generate optimized RLS policy SQL
-- This will be used to systematically optimize all remaining policies

CREATE OR REPLACE FUNCTION generate_optimized_policy_sql()
RETURNS TABLE (
  table_name text,
  policy_name text,
  drop_sql text,
  create_sql text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.tablename::text,
    p.policyname::text,
    format('DROP POLICY IF EXISTS %I ON public.%I;', p.policyname, p.tablename)::text as drop_sql,
    format(
      'CREATE POLICY %I ON public.%I FOR %s TO %s USING (%s)%s;',
      p.policyname,
      p.tablename,
      p.cmd,
      array_to_string(p.roles, ', '),
      COALESCE(
        regexp_replace(
          p.qual, 
          'auth\.uid\(\)', 
          '(SELECT auth.uid())', 
          'g'
        ),
        'true'
      ),
      CASE 
        WHEN p.with_check IS NOT NULL THEN 
          format(' WITH CHECK (%s)', 
            regexp_replace(
              p.with_check, 
              'auth\.uid\(\)', 
              '(SELECT auth.uid())', 
              'g'
            )
          )
        ELSE '' 
      END
    )::text as create_sql
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND (p.qual LIKE '%auth.uid()%' OR p.with_check LIKE '%auth.uid()%')
    AND p.qual NOT LIKE '%(SELECT auth.uid())%'
    AND (p.with_check IS NULL OR p.with_check NOT LIKE '%(SELECT auth.uid())%')
  ORDER BY p.tablename, p.policyname;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION generate_optimized_policy_sql() TO authenticated;
;
