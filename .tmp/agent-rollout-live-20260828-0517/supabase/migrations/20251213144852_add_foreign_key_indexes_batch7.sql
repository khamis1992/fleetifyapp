-- Add indexes to foreign keys for performance optimization - Batch 7
-- Legal and Maintenance related tables

-- legal_case_auto_triggers
CREATE INDEX IF NOT EXISTS idx_legal_case_auto_triggers_created_by ON public.legal_case_auto_triggers(created_by);
CREATE INDEX IF NOT EXISTS idx_legal_case_auto_triggers_updated_by ON public.legal_case_auto_triggers(updated_by);

-- legal_cases
CREATE INDEX IF NOT EXISTS idx_legal_cases_outcome_journal_entry_id ON public.legal_cases(outcome_journal_entry_id);

-- maintenance_account_mappings
CREATE INDEX IF NOT EXISTS idx_maintenance_account_mappings_asset_account_id ON public.maintenance_account_mappings(asset_account_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_account_mappings_expense_account_id ON public.maintenance_account_mappings(expense_account_id);

-- payment_plans
CREATE INDEX IF NOT EXISTS idx_payment_plans_created_by ON public.payment_plans(created_by);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_journal_entry_id ON public.payments(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_payments_vendor_id ON public.payments(vendor_id);

-- payroll
CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON public.payroll(employee_id);

-- permission_change_requests
CREATE INDEX IF NOT EXISTS idx_permission_change_requests_requested_by ON public.permission_change_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_permission_change_requests_reviewed_by ON public.permission_change_requests(reviewed_by);

-- properties
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);

-- property_contracts
CREATE INDEX IF NOT EXISTS idx_property_contracts_account_id ON public.property_contracts(account_id);
CREATE INDEX IF NOT EXISTS idx_property_contracts_journal_entry_id ON public.property_contracts(journal_entry_id);

-- property_payments
CREATE INDEX IF NOT EXISTS idx_property_payments_journal_entry_id ON public.property_payments(journal_entry_id);;
