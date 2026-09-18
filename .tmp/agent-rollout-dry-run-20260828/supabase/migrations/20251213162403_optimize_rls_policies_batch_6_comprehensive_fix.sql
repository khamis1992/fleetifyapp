-- Optimize RLS policies - Batch 6: Comprehensive fix with better pattern matching
-- Handle auth.uid() in all contexts including nested function calls

DO $$
DECLARE
  policy_rec RECORD;
  drop_stmt TEXT;
  create_stmt TEXT;
  optimized_qual TEXT;
  optimized_with_check TEXT;
  policies_optimized INT := 0;
BEGIN
  FOR policy_rec IN 
    SELECT tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual ~ 'auth\.uid\(\)' 
        OR with_check ~ 'auth\.uid\(\)'
      )
      -- Exclude already optimized policies
      AND NOT (qual ~ '\(SELECT auth\.uid\(\)\)')
    ORDER BY tablename, policyname
  LOOP
    BEGIN
      -- Optimize qual clause
      optimized_qual := policy_rec.qual;
      IF optimized_qual IS NOT NULL THEN
        -- Replace all occurrences of auth.uid() with (SELECT auth.uid())
        -- Use word boundaries to avoid double-wrapping
        optimized_qual := regexp_replace(
          optimized_qual,
          '([^SELECT\s])auth\.uid\(\)',
          '\1(SELECT auth.uid())',
          'g'
        );
        -- Handle case where auth.uid() is at the beginning
        optimized_qual := regexp_replace(
          optimized_qual,
          '^auth\.uid\(\)',
          '(SELECT auth.uid())',
          'g'
        );
      END IF;
      
      -- Optimize with_check clause
      optimized_with_check := policy_rec.with_check;
      IF optimized_with_check IS NOT NULL THEN
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
        'CREATE POLICY %I ON public.%I FOR %s TO %s USING (%s)%s',
        policy_rec.policyname,
        policy_rec.tablename,
        policy_rec.cmd,
        array_to_string(policy_rec.roles, ', '),
        COALESCE(optimized_qual, 'true'),
        CASE 
          WHEN optimized_with_check IS NOT NULL THEN 
            format(' WITH CHECK (%s)', optimized_with_check)
          ELSE '' 
        END
      );
      
      EXECUTE create_stmt;
      policies_optimized := policies_optimized + 1;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to optimize policy "%" on table "%": %', 
                    policy_rec.policyname, policy_rec.tablename, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Optimized % policies successfully', policies_optimized;
END $$;
;
