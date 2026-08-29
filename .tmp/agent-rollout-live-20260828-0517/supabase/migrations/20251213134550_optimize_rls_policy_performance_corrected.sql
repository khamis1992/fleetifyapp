-- Optimize RLS policies to prevent re-evaluation of auth functions
-- This wraps auth function calls in SELECT subqueries for better performance

-- Chart of Accounts policies
DROP POLICY IF EXISTS "Admins can delete COA in their company" ON public.chart_of_accounts;
CREATE POLICY "Admins can delete COA in their company" ON public.chart_of_accounts
  FOR DELETE
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

DROP POLICY IF EXISTS "Admins can manage COA in their company" ON public.chart_of_accounts;
CREATE POLICY "Admins can manage COA in their company" ON public.chart_of_accounts
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Learning Interactions
DROP POLICY IF EXISTS "Admins can delete learning interactions" ON public.learning_interactions;
CREATE POLICY "Admins can delete learning interactions" ON public.learning_interactions
  FOR DELETE
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- CSV Templates
DROP POLICY IF EXISTS "Admins can delete templates in their company" ON public.csv_templates;
CREATE POLICY "Admins can delete templates in their company" ON public.csv_templates
  FOR DELETE
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- HR Settings
DROP POLICY IF EXISTS "Admins can manage HR settings in their company" ON public.hr_settings;
CREATE POLICY "Admins can manage HR settings in their company" ON public.hr_settings
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Customer Account Types (no company_id - global table, super admin only)
DROP POLICY IF EXISTS "Admins can manage account types" ON public.customer_account_types;
CREATE POLICY "Admins can manage account types" ON public.customer_account_types
  FOR ALL
  USING ((SELECT is_super_admin()));

-- Accounting Templates
DROP POLICY IF EXISTS "Admins can manage accounting templates in their company" ON public.accounting_templates;
CREATE POLICY "Admins can manage accounting templates in their company" ON public.accounting_templates
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Late Fine Settings
DROP POLICY IF EXISTS "Admins can manage fine settings in their company" ON public.late_fine_settings;
CREATE POLICY "Admins can manage fine settings in their company" ON public.late_fine_settings
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Fixed Assets
DROP POLICY IF EXISTS "Admins can manage fixed assets in their company" ON public.fixed_assets;
CREATE POLICY "Admins can manage fixed assets in their company" ON public.fixed_assets
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Adaptive Rules
DROP POLICY IF EXISTS "Admins can manage adaptive rules" ON public.adaptive_rules;
CREATE POLICY "Admins can manage adaptive rules" ON public.adaptive_rules
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Approval Requests
DROP POLICY IF EXISTS "Admins can manage all requests in their company" ON public.approval_requests;
CREATE POLICY "Admins can manage all requests in their company" ON public.approval_requests
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Payment Allocation Rules
DROP POLICY IF EXISTS "Admins can manage allocation rules in their company" ON public.payment_allocation_rules;
CREATE POLICY "Admins can manage allocation rules in their company" ON public.payment_allocation_rules
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Invoice Cost Center Analysis
DROP POLICY IF EXISTS "Admins can manage analysis in their company" ON public.invoice_cost_center_analysis;
CREATE POLICY "Admins can manage analysis in their company" ON public.invoice_cost_center_analysis
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Approval Templates
DROP POLICY IF EXISTS "Admins can manage approval templates in their company" ON public.approval_templates;
CREATE POLICY "Admins can manage approval templates in their company" ON public.approval_templates
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- CSV File Archives
DROP POLICY IF EXISTS "Admins can manage archives in their company" ON public.csv_file_archives;
CREATE POLICY "Admins can manage archives in their company" ON public.csv_file_archives
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Branches
DROP POLICY IF EXISTS "Admins can manage branches in their company" ON public.branches;
CREATE POLICY "Admins can manage branches in their company" ON public.branches
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Company Branding Settings
DROP POLICY IF EXISTS "Admins can manage branding settings in their company" ON public.company_branding_settings;
CREATE POLICY "Admins can manage branding settings in their company" ON public.company_branding_settings
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Budget Alerts
DROP POLICY IF EXISTS "Admins can manage budget alerts in their company" ON public.budget_alerts;
CREATE POLICY "Admins can manage budget alerts in their company" ON public.budget_alerts
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Payroll
DROP POLICY IF EXISTS "Admins can manage payroll in their company" ON public.payroll;
CREATE POLICY "Admins can manage payroll in their company" ON public.payroll
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Accounting Periods
DROP POLICY IF EXISTS "Admins can manage periods in their company" ON public.accounting_periods;
CREATE POLICY "Admins can manage periods in their company" ON public.accounting_periods
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Budget Items (uses FK to budgets)
DROP POLICY IF EXISTS "Admins can manage budget items" ON public.budget_items;
CREATE POLICY "Admins can manage budget items" ON public.budget_items
  FOR ALL
  USING (budget_id IN (SELECT id FROM public.budgets WHERE company_id = (SELECT get_user_company_id())) 
    AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Budgets
DROP POLICY IF EXISTS "Admins can manage budgets in their company" ON public.budgets;
CREATE POLICY "Admins can manage budgets in their company" ON public.budgets
  FOR ALL
  USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));;
