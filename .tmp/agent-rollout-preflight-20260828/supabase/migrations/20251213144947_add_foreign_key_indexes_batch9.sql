-- Add indexes to foreign keys for performance optimization - Batch 9
-- Scheduled, Service, Task and Transaction related tables

-- scheduled_followups
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_contract_id ON public.scheduled_followups(contract_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_created_by ON public.scheduled_followups(created_by);

-- scheduled_reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_company_id ON public.scheduled_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by ON public.scheduled_reports(created_by);

-- service_ratings
CREATE INDEX IF NOT EXISTS idx_service_ratings_ticket_id ON public.service_ratings(ticket_id);

-- task_checklists
CREATE INDEX IF NOT EXISTS idx_task_checklists_completed_by ON public.task_checklists(completed_by);

-- task_templates
CREATE INDEX IF NOT EXISTS idx_task_templates_created_by ON public.task_templates(created_by);

-- transactions
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_journal_entry_id ON public.transactions(journal_entry_id);

-- user_account_audit
CREATE INDEX IF NOT EXISTS idx_user_account_audit_performed_by ON public.user_account_audit(performed_by);

-- user_permissions
CREATE INDEX IF NOT EXISTS idx_user_permissions_granted_by ON public.user_permissions(granted_by);

-- user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON public.user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_granted_by ON public.user_roles(granted_by);

-- user_transfer_logs
CREATE INDEX IF NOT EXISTS idx_user_transfer_logs_transferred_by ON public.user_transfer_logs(transferred_by);;
