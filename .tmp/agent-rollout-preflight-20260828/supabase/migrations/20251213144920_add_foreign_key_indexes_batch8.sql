-- Add indexes to foreign keys for performance optimization - Batch 8
-- Quotations, Reminders, Reports and Sales related tables

-- quotation_approval_log
CREATE INDEX IF NOT EXISTS idx_quotation_approval_log_quotation_id ON public.quotation_approval_log(quotation_id);

-- quotations
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON public.quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON public.quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_vehicle_id ON public.quotations(vehicle_id);

-- rate_limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON public.rate_limits(user_id);

-- regulatory_reports
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_approved_by ON public.regulatory_reports(approved_by);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_created_by ON public.regulatory_reports(created_by);

-- reminder_history
CREATE INDEX IF NOT EXISTS idx_reminder_history_customer_id ON public.reminder_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_user_id ON public.reminder_history(user_id);

-- reminder_schedules
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_created_by ON public.reminder_schedules(created_by);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_sent_by ON public.reminder_schedules(sent_by);

-- reminder_templates
CREATE INDEX IF NOT EXISTS idx_reminder_templates_created_by ON public.reminder_templates(created_by);

-- report_templates
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON public.report_templates(created_by);

-- sales_leads
CREATE INDEX IF NOT EXISTS idx_sales_leads_created_by ON public.sales_leads(created_by);

-- sales_opportunities
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_created_by ON public.sales_opportunities(created_by);

-- sales_orders
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_by ON public.sales_orders(created_by);

-- sales_quotes
CREATE INDEX IF NOT EXISTS idx_sales_quotes_created_by ON public.sales_quotes(created_by);;
