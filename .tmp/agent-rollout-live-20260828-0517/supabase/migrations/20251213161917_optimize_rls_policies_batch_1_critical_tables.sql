-- Optimize RLS policies for critical tables - Batch 1
-- Replace auth.uid() with (SELECT auth.uid()) to prevent re-evaluation per row

-- Drop and recreate policies for account_creation_requests
DROP POLICY IF EXISTS "Managers can manage account requests in their company" ON public.account_creation_requests;
CREATE POLICY "Managers can manage account requests in their company"
ON public.account_creation_requests
FOR ALL
TO authenticated
USING (
  has_role((SELECT auth.uid()), 'super_admin'::user_role) 
  OR (
    company_id = get_user_company((SELECT auth.uid())) 
    AND (
      has_role((SELECT auth.uid()), 'company_admin'::user_role) 
      OR has_role((SELECT auth.uid()), 'manager'::user_role)
    )
  )
);

DROP POLICY IF EXISTS "Users can view account requests in their company" ON public.account_creation_requests;
CREATE POLICY "Users can view account requests in their company"
ON public.account_creation_requests
FOR SELECT
TO authenticated
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for account_deletion_log
DROP POLICY IF EXISTS "Users can view deletion logs in their company" ON public.account_deletion_log;
CREATE POLICY "Users can view deletion logs in their company"
ON public.account_deletion_log
FOR SELECT
TO public
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for account_mappings
DROP POLICY IF EXISTS "Admins can manage mappings in their company" ON public.account_mappings;
CREATE POLICY "Admins can manage mappings in their company"
ON public.account_mappings
FOR ALL
TO authenticated
USING (
  has_role((SELECT auth.uid()), 'super_admin'::user_role) 
  OR (
    company_id = get_user_company((SELECT auth.uid())) 
    AND (
      has_role((SELECT auth.uid()), 'company_admin'::user_role) 
      OR has_role((SELECT auth.uid()), 'manager'::user_role)
    )
  )
)
WITH CHECK (
  has_role((SELECT auth.uid()), 'super_admin'::user_role) 
  OR (
    company_id = get_user_company((SELECT auth.uid())) 
    AND (
      has_role((SELECT auth.uid()), 'company_admin'::user_role) 
      OR has_role((SELECT auth.uid()), 'manager'::user_role)
    )
  )
);

DROP POLICY IF EXISTS "Users can view mappings in their company" ON public.account_mappings;
CREATE POLICY "Users can view mappings in their company"
ON public.account_mappings
FOR SELECT
TO authenticated
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for account_movement_settings
DROP POLICY IF EXISTS "Users can create account movement settings for their company" ON public.account_movement_settings;
CREATE POLICY "Users can create account movement settings for their company"
ON public.account_movement_settings
FOR INSERT
TO public
WITH CHECK (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can delete their company's account movement settings" ON public.account_movement_settings;
CREATE POLICY "Users can delete their company's account movement settings"
ON public.account_movement_settings
FOR DELETE
TO public
USING (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update their company's account movement settings" ON public.account_movement_settings;
CREATE POLICY "Users can update their company's account movement settings"
ON public.account_movement_settings
FOR UPDATE
TO public
USING (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view their company's account movement settings" ON public.account_movement_settings;
CREATE POLICY "Users can view their company's account movement settings"
ON public.account_movement_settings
FOR SELECT
TO public
USING (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.user_id = (SELECT auth.uid())
  )
);

-- Drop and recreate policies for accounting_periods
DROP POLICY IF EXISTS "Users can view periods in their company" ON public.accounting_periods;
CREATE POLICY "Users can view periods in their company"
ON public.accounting_periods
FOR SELECT
TO public
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for accounting_templates
DROP POLICY IF EXISTS "Users can view accounting templates in their company" ON public.accounting_templates;
CREATE POLICY "Users can view accounting templates in their company"
ON public.accounting_templates
FOR SELECT
TO public
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for adaptive_rules
DROP POLICY IF EXISTS "Users can view adaptive rules" ON public.adaptive_rules;
CREATE POLICY "Users can view adaptive rules"
ON public.adaptive_rules
FOR SELECT
TO public
USING (
  has_role((SELECT auth.uid()), 'super_admin'::user_role) 
  OR (
    company_id = get_user_company((SELECT auth.uid())) 
    AND (
      has_role((SELECT auth.uid()), 'company_admin'::user_role) 
      OR has_role((SELECT auth.uid()), 'manager'::user_role)
    )
  )
);

-- Drop and recreate policies for advanced_late_fee_calculations
DROP POLICY IF EXISTS "Users can manage late fee calculations in their company" ON public.advanced_late_fee_calculations;
CREATE POLICY "Users can manage late fee calculations in their company"
ON public.advanced_late_fee_calculations
FOR ALL
TO public
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for ai_activity_logs
DROP POLICY IF EXISTS "Users can insert AI logs for their company" ON public.ai_activity_logs;
CREATE POLICY "Users can insert AI logs for their company"
ON public.ai_activity_logs
FOR INSERT
TO public
WITH CHECK (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view their company's AI logs" ON public.ai_activity_logs;
CREATE POLICY "Users can view their company's AI logs"
ON public.ai_activity_logs
FOR SELECT
TO public
USING (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.user_id = (SELECT auth.uid())
  )
);

-- Drop and recreate policies for ai_analysis_results
DROP POLICY IF EXISTS "Users can insert analysis results for their company" ON public.ai_analysis_results;
CREATE POLICY "Users can insert analysis results for their company"
ON public.ai_analysis_results
FOR INSERT
TO public
WITH CHECK (company_id = get_user_company((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can view analysis results in their company" ON public.ai_analysis_results;
CREATE POLICY "Users can view analysis results in their company"
ON public.ai_analysis_results
FOR SELECT
TO public
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for ai_clarification_sessions
DROP POLICY IF EXISTS "Users can manage clarification sessions in their company" ON public.ai_clarification_sessions;
CREATE POLICY "Users can manage clarification sessions in their company"
ON public.ai_clarification_sessions
FOR ALL
TO public
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for ai_learning_feedback
DROP POLICY IF EXISTS "Users can manage learning feedback in their company" ON public.ai_learning_feedback;
CREATE POLICY "Users can manage learning feedback in their company"
ON public.ai_learning_feedback
FOR ALL
TO public
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for ai_learning_patterns
DROP POLICY IF EXISTS "Users can manage learning patterns in their company" ON public.ai_learning_patterns;
CREATE POLICY "Users can manage learning patterns in their company"
ON public.ai_learning_patterns
FOR ALL
TO public
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for ai_performance_metrics
DROP POLICY IF EXISTS "Users can view performance metrics in their company" ON public.ai_performance_metrics;
CREATE POLICY "Users can view performance metrics in their company"
ON public.ai_performance_metrics
FOR SELECT
TO public
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for ai_query_intents
DROP POLICY IF EXISTS "Users can manage AI data in their company" ON public.ai_query_intents;
CREATE POLICY "Users can manage AI data in their company"
ON public.ai_query_intents
FOR ALL
TO public
USING (company_id = get_user_company((SELECT auth.uid())));

-- Drop and recreate policies for amendment_change_log
DROP POLICY IF EXISTS "Users can view change logs" ON public.amendment_change_log;
CREATE POLICY "Users can view change logs"
ON public.amendment_change_log
FOR SELECT
TO public
USING (
  amendment_id IN (
    SELECT contract_amendments.id
    FROM contract_amendments
    WHERE contract_amendments.company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.user_id = (SELECT auth.uid())
    )
  )
);

-- Drop and recreate policies for aml_kyc_diligence
DROP POLICY IF EXISTS "Users can manage AML/KYC diligence for their company" ON public.aml_kyc_diligence;
CREATE POLICY "Users can manage AML/KYC diligence for their company"
ON public.aml_kyc_diligence
FOR ALL
TO public
USING (
  company_id = (SELECT auth.uid()) 
  OR (SELECT auth.uid()) IN (
    SELECT user_permissions.user_id
    FROM user_permissions
    WHERE aml_kyc_diligence.company_id = aml_kyc_diligence.company_id
  )
);

DROP POLICY IF EXISTS "Users can view AML/KYC diligence for their company" ON public.aml_kyc_diligence;
CREATE POLICY "Users can view AML/KYC diligence for their company"
ON public.aml_kyc_diligence
FOR SELECT
TO public
USING (
  company_id = (SELECT auth.uid()) 
  OR (SELECT auth.uid()) IN (
    SELECT user_permissions.user_id
    FROM user_permissions
    WHERE aml_kyc_diligence.company_id = aml_kyc_diligence.company_id
  )
);

-- Drop and recreate policies for approval_notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.approval_notifications;
CREATE POLICY "Users can view their own notifications"
ON public.approval_notifications
FOR SELECT
TO public
USING (recipient_id = (SELECT auth.uid()));

-- Drop and recreate policies for approval_requests
DROP POLICY IF EXISTS "Users can create requests in their company" ON public.approval_requests;
CREATE POLICY "Users can create requests in their company"
ON public.approval_requests
FOR INSERT
TO public
WITH CHECK (
  company_id = get_user_company((SELECT auth.uid())) 
  AND requested_by = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Users can view requests in their company" ON public.approval_requests;
CREATE POLICY "Users can view requests in their company"
ON public.approval_requests
FOR SELECT
TO public
USING (company_id = get_user_company((SELECT auth.uid())));
;
