-- Add indexes to foreign keys for performance optimization - Batch 1
-- Account and Approval related tables

-- account_creation_requests
CREATE INDEX IF NOT EXISTS idx_account_creation_requests_employee_id ON public.account_creation_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_account_creation_requests_processed_by ON public.account_creation_requests(processed_by);
CREATE INDEX IF NOT EXISTS idx_account_creation_requests_requested_by ON public.account_creation_requests(requested_by);

-- account_deletion_log
CREATE INDEX IF NOT EXISTS idx_account_deletion_log_transfer_to_account_id ON public.account_deletion_log(transfer_to_account_id);

-- account_mappings
CREATE INDEX IF NOT EXISTS idx_account_mappings_chart_of_accounts_id ON public.account_mappings(chart_of_accounts_id);
CREATE INDEX IF NOT EXISTS idx_account_mappings_default_account_type_id ON public.account_mappings(default_account_type_id);
CREATE INDEX IF NOT EXISTS idx_account_mappings_mapped_by ON public.account_mappings(mapped_by);

-- aml_kyc_diligence
CREATE INDEX IF NOT EXISTS idx_aml_kyc_diligence_approved_by ON public.aml_kyc_diligence(approved_by);

-- approval_notifications
CREATE INDEX IF NOT EXISTS idx_approval_notifications_request_id ON public.approval_notifications(request_id);

-- approval_requests
CREATE INDEX IF NOT EXISTS idx_approval_requests_workflow_id ON public.approval_requests(workflow_id);

-- budget_items
CREATE INDEX IF NOT EXISTS idx_budget_items_account_id ON public.budget_items(account_id);

-- budgets
CREATE INDEX IF NOT EXISTS idx_budgets_accounting_period_id ON public.budgets(accounting_period_id);

-- compliance_audit_trail
CREATE INDEX IF NOT EXISTS idx_compliance_audit_trail_reviewed_by ON public.compliance_audit_trail(reviewed_by);

-- compliance_rules
CREATE INDEX IF NOT EXISTS idx_compliance_rules_created_by ON public.compliance_rules(created_by);

-- compliance_validations
CREATE INDEX IF NOT EXISTS idx_compliance_validations_assigned_to ON public.compliance_validations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_compliance_validations_reviewed_by ON public.compliance_validations(reviewed_by);;
