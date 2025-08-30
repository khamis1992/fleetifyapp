-- Update RLS policies to grant super_admin full access to all tables

-- accounting_periods
DROP POLICY IF EXISTS "Admins can manage periods in their company" ON public.accounting_periods;
CREATE POLICY "Admins can manage periods in their company" ON public.accounting_periods
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- bank_transactions
DROP POLICY IF EXISTS "الموظفون يمكنهم إدارة حركات البنو" ON public.bank_transactions;
CREATE POLICY "الموظفون يمكنهم إدارة حركات البنو" ON public.bank_transactions
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- banks
DROP POLICY IF EXISTS "المديرون يمكنهم إدارة البنوك في شر" ON public.banks;
CREATE POLICY "المديرون يمكنهم إدارة البنوك في شر" ON public.banks
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- budget_alerts
DROP POLICY IF EXISTS "Admins can manage budget alerts in their company" ON public.budget_alerts;
CREATE POLICY "Admins can manage budget alerts in their company" ON public.budget_alerts
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- budget_items
DROP POLICY IF EXISTS "Admins can manage budget items" ON public.budget_items;
CREATE POLICY "Admins can manage budget items" ON public.budget_items
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (EXISTS ( SELECT 1 FROM budgets b WHERE ((b.id = budget_items.budget_id) AND (b.company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))))
);

-- budgets
DROP POLICY IF EXISTS "Admins can manage budgets in their company" ON public.budgets;
CREATE POLICY "Admins can manage budgets in their company" ON public.budgets
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- cost_centers
DROP POLICY IF EXISTS "المديرون يمكنهم إدارة مراكز التكل" ON public.cost_centers;
CREATE POLICY "المديرون يمكنهم إدارة مراكز التكل" ON public.cost_centers
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- contracts
DROP POLICY IF EXISTS "Staff can manage contracts in their company" ON public.contracts;
CREATE POLICY "Staff can manage contracts in their company" ON public.contracts
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- customers
DROP POLICY IF EXISTS "Staff can manage customers in their company" ON public.customers;
CREATE POLICY "Staff can manage customers in their company" ON public.customers
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- depreciation_records
DROP POLICY IF EXISTS "Admins can manage depreciation records" ON public.depreciation_records;
CREATE POLICY "Admins can manage depreciation records" ON public.depreciation_records
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (EXISTS ( SELECT 1 FROM fixed_assets fa WHERE ((fa.id = depreciation_records.fixed_asset_id) AND (fa.company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))))
);

-- fixed_assets
DROP POLICY IF EXISTS "Admins can manage fixed assets in their company" ON public.fixed_assets;
CREATE POLICY "Admins can manage fixed assets in their company" ON public.fixed_assets
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- invoice_cost_center_analysis
DROP POLICY IF EXISTS "Admins can manage analysis in their company" ON public.invoice_cost_center_analysis;
CREATE POLICY "Admins can manage analysis in their company" ON public.invoice_cost_center_analysis
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- invoice_items
DROP POLICY IF EXISTS "Staff can manage invoice items" ON public.invoice_items;
CREATE POLICY "Staff can manage invoice items" ON public.invoice_items
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (EXISTS ( SELECT 1 FROM invoices i WHERE ((i.id = invoice_items.invoice_id) AND (i.company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role)))))
);

-- invoices
DROP POLICY IF EXISTS "Staff can manage invoices in their company" ON public.invoices;
CREATE POLICY "Staff can manage invoices in their company" ON public.invoices
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- journal_entries
DROP POLICY IF EXISTS "Finance staff can manage journal entries" ON public.journal_entries;
CREATE POLICY "Finance staff can manage journal entries" ON public.journal_entries
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- journal_entry_lines
DROP POLICY IF EXISTS "Finance staff can manage journal lines" ON public.journal_entry_lines;
CREATE POLICY "Finance staff can manage journal lines" ON public.journal_entry_lines
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (EXISTS ( SELECT 1 FROM journal_entries je WHERE ((je.id = journal_entry_lines.journal_entry_id) AND (je.company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))))
);

-- payments
DROP POLICY IF EXISTS "Staff can manage payments in their company" ON public.payments;
CREATE POLICY "Staff can manage payments in their company" ON public.payments
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- payroll
DROP POLICY IF EXISTS "Admins can manage payroll in their company" ON public.payroll;
CREATE POLICY "Admins can manage payroll in their company" ON public.payroll
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- penalties
DROP POLICY IF EXISTS "Staff can manage penalties in their company" ON public.penalties;
CREATE POLICY "Staff can manage penalties in their company" ON public.penalties
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- transactions
DROP POLICY IF EXISTS "Staff can manage transactions in their company" ON public.transactions;
CREATE POLICY "Staff can manage transactions in their company" ON public.transactions
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- vehicle_categories
DROP POLICY IF EXISTS "Managers can manage categories in their company" ON public.vehicle_categories;
CREATE POLICY "Managers can manage categories in their company" ON public.vehicle_categories
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'fleet_manager'::user_role)))
);

-- vehicles
DROP POLICY IF EXISTS "Fleet managers can manage vehicles in their company" ON public.vehicles;
CREATE POLICY "Fleet managers can manage vehicles in their company" ON public.vehicles
FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'fleet_manager'::user_role)))
);