-- Optimize RLS policies - Batch 7: INSERT policies with WITH CHECK clauses
-- Handle policies that only have WITH CHECK (no USING clause)

DO $$
DECLARE
  policy_rec RECORD;
  drop_stmt TEXT;
  create_stmt TEXT;
  optimized_with_check TEXT;
  policies_optimized INT := 0;
BEGIN
  FOR policy_rec IN 
    SELECT tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'INSERT'
      AND with_check ~ 'auth\.uid\(\)'
      AND with_check !~ '\(SELECT auth\.uid\(\)\)'
    ORDER BY tablename, policyname
  LOOP
    BEGIN
      -- Optimize with_check clause
      optimized_with_check := policy_rec.with_check;
      IF optimized_with_check IS NOT NULL THEN
        -- Replace auth.uid() with (SELECT auth.uid())
        optimized_with_check := regexp_replace(
          optimized_with_check,
          '([^SELECT\s])auth\.uid\(\)',
          '\1(SELECT auth.uid())',
          'g'
        );
        optimized_with_check := regexp_replace(
          optimized_with_check,
          '^auth\.uid\(\)',
          '(SELECT auth.uid())',
          'g'
        );
      END IF;
      
      -- Drop existing policy
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                     policy_rec.policyname, policy_rec.tablename);
      
      -- Create optimized policy
      create_stmt := format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO %s WITH CHECK (%s)',
        policy_rec.policyname,
        policy_rec.tablename,
        array_to_string(policy_rec.roles, ', '),
        optimized_with_check
      );
      
      EXECUTE create_stmt;
      policies_optimized := policies_optimized + 1;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to optimize INSERT policy "%" on table "%": %', 
                    policy_rec.policyname, policy_rec.tablename, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Optimized % INSERT policies successfully', policies_optimized;
END $$;
;
