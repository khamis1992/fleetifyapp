-- Optimize RLS policies - Batch 5: ALL REMAINING TABLES
-- This will optimize every remaining policy with unoptimized auth.uid() calls

DO $$
DECLARE
  policy_rec RECORD;
  drop_stmt TEXT;
  create_stmt TEXT;
  policies_optimized INT := 0;
BEGIN
  -- Process ALL remaining policies with unoptimized auth.uid()
  FOR policy_rec IN 
    SELECT tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
      AND qual NOT LIKE '%(SELECT auth.uid())%'
      AND (with_check IS NULL OR with_check NOT LIKE '%(SELECT auth.uid())%')
    ORDER BY tablename, policyname
  LOOP
    BEGIN
      -- Drop existing policy
      drop_stmt := format('DROP POLICY IF EXISTS %I ON public.%I', 
                         policy_rec.policyname, policy_rec.tablename);
      EXECUTE drop_stmt;
      
      -- Create optimized policy with SELECT auth.uid() wrapper
      create_stmt := format(
        'CREATE POLICY %I ON public.%I FOR %s TO %s USING (%s)%s',
        policy_rec.policyname,
        policy_rec.tablename,
        policy_rec.cmd,
        array_to_string(policy_rec.roles, ', '),
        regexp_replace(COALESCE(policy_rec.qual, 'true'), 'auth\.uid\(\)', '(SELECT auth.uid())', 'g'),
        CASE 
          WHEN policy_rec.with_check IS NOT NULL THEN 
            format(' WITH CHECK (%s)', 
              regexp_replace(policy_rec.with_check, 'auth\.uid\(\)', '(SELECT auth.uid())', 'g')
            )
          ELSE '' 
        END
      );
      EXECUTE create_stmt;
      
      policies_optimized := policies_optimized + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log errors but continue processing
        RAISE NOTICE 'Error optimizing policy % on table %: %', 
                     policy_rec.policyname, policy_rec.tablename, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Successfully optimized % RLS policies', policies_optimized;
END $$;
;
