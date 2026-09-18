-- Optimize RLS policies - Batch 3: Contracts and Customers
-- These are high-traffic tables that need performance optimization

-- Get list of contract and customer tables with unoptimized policies
DO $$
DECLARE
  policy_rec RECORD;
  drop_stmt TEXT;
  create_stmt TEXT;
BEGIN
  -- Optimize policies for contracts table
  FOR policy_rec IN 
    SELECT tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('contracts', 'contract_templates', 'contract_amendments', 
                       'contract_documents', 'contract_vehicles', 'contract_vehicle_returns',
                       'contract_approval_steps', 'contract_operations_log', 'contract_payment_schedules',
                       'contract_notifications')
      AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
      AND qual NOT LIKE '%(SELECT auth.uid())%'
  LOOP
    -- Drop existing policy
    drop_stmt := format('DROP POLICY IF EXISTS %I ON public.%I', 
                       policy_rec.policyname, policy_rec.tablename);
    EXECUTE drop_stmt;
    
    -- Create optimized policy
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
  END LOOP;

  -- Optimize policies for customer tables
  FOR policy_rec IN 
    SELECT tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('customers', 'customer_accounts', 'customer_balances', 
                       'customer_deposits', 'customer_notes', 'customer_credit_history',
                       'customer_aging_analysis', 'customer_financial_summary')
      AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
      AND qual NOT LIKE '%(SELECT auth.uid())%'
  LOOP
    drop_stmt := format('DROP POLICY IF EXISTS %I ON public.%I', 
                       policy_rec.policyname, policy_rec.tablename);
    EXECUTE drop_stmt;
    
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
  END LOOP;
END $$;
;
