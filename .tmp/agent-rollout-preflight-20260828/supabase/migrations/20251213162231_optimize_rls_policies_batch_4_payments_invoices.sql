-- Optimize RLS policies - Batch 4: Payments and Invoices
-- Critical financial tables

DO $$
DECLARE
  policy_rec RECORD;
  drop_stmt TEXT;
  create_stmt TEXT;
BEGIN
  -- Optimize policies for payment and invoice tables
  FOR policy_rec IN 
    SELECT tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('payments', 'payment_allocations', 'payment_contract_linking_attempts',
                       'payment_ai_analysis', 'payment_contract_matching',
                       'invoices', 'invoice_items', 'invoice_ocr_logs',
                       'rental_payment_receipts', 'property_payments',
                       'vendor_payments', 'traffic_violation_payments')
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
