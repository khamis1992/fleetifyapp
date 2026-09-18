-- Tables with company_id
-- Workflows
CREATE POLICY "Users can view workflows in their company" ON public.workflows FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage workflows" ON public.workflows FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Workflow Templates
CREATE POLICY "Users can view workflow templates" ON public.workflow_templates FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage workflow templates" ON public.workflow_templates FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Events
CREATE POLICY "Users can view events" ON public.events FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "System can manage events" ON public.events FOR ALL USING (company_id = (SELECT get_user_company_id()));

-- Event Subscriptions
CREATE POLICY "Users can view event subscriptions" ON public.event_subscriptions FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage event subscriptions" ON public.event_subscriptions FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Background Jobs
CREATE POLICY "System can manage background jobs" ON public.background_jobs FOR ALL USING (company_id = (SELECT get_user_company_id()));

-- Late Fee Rules
CREATE POLICY "Users can view late fee rules" ON public.late_fee_rules FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage late fee rules" ON public.late_fee_rules FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Late Fees
CREATE POLICY "Users can view late fees" ON public.late_fees FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage late fees" ON public.late_fees FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Inventory Reports
CREATE POLICY "Users can view inventory reports" ON public.inventory_reports FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Users can create inventory reports" ON public.inventory_reports FOR INSERT WITH CHECK (company_id = (SELECT get_user_company_id()));

-- Scheduled Reports
CREATE POLICY "Users can view scheduled reports" ON public.scheduled_reports FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage scheduled reports" ON public.scheduled_reports FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Inventory Snapshots
CREATE POLICY "Users can view inventory snapshots" ON public.inventory_snapshots FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "System can create inventory snapshots" ON public.inventory_snapshots FOR INSERT WITH CHECK (company_id = (SELECT get_user_company_id()));

-- Report Templates
CREATE POLICY "Users can view report templates" ON public.report_templates FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage report templates" ON public.report_templates FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Dashboard Widgets
CREATE POLICY "Users can view dashboard widgets" ON public.dashboard_widgets FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage dashboard widgets" ON public.dashboard_widgets FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Inventory Alert Rules
CREATE POLICY "Users can view inventory alert rules" ON public.inventory_alert_rules FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage inventory alert rules" ON public.inventory_alert_rules FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Inventory Alert History
CREATE POLICY "Users can view inventory alert history" ON public.inventory_alert_history FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "System can create inventory alerts" ON public.inventory_alert_history FOR INSERT WITH CHECK (company_id = (SELECT get_user_company_id()));

-- Tables without company_id but with foreign keys
-- Workflow History
CREATE POLICY "Users can view workflow history" ON public.workflow_history FOR SELECT USING (workflow_id IN (SELECT id FROM public.workflows WHERE company_id = (SELECT get_user_company_id())));
CREATE POLICY "System can insert workflow history" ON public.workflow_history FOR INSERT WITH CHECK (workflow_id IN (SELECT id FROM public.workflows WHERE company_id = (SELECT get_user_company_id())));

-- Journal Entry Status History
CREATE POLICY "Users can view journal entry status history" ON public.journal_entry_status_history FOR SELECT USING (journal_entry_id IN (SELECT id FROM public.journal_entries WHERE company_id = (SELECT get_user_company_id())));
CREATE POLICY "System can insert journal entry status history" ON public.journal_entry_status_history FOR INSERT WITH CHECK (journal_entry_id IN (SELECT id FROM public.journal_entries WHERE company_id = (SELECT get_user_company_id())));

-- Late Fee History
CREATE POLICY "Users can view late fee history" ON public.late_fee_history FOR SELECT USING (late_fee_id IN (SELECT id FROM public.late_fees WHERE company_id = (SELECT get_user_company_id())));

-- CTO tables (super admin only)
CREATE POLICY "Super admins can manage deploy gates" ON public.cto_deploy_gates FOR ALL USING ((SELECT is_super_admin()));
CREATE POLICY "Users can view quality metrics" ON public.cto_quality_metrics FOR SELECT USING (true);
CREATE POLICY "Super admins can manage quality metrics" ON public.cto_quality_metrics FOR ALL USING ((SELECT is_super_admin()));
CREATE POLICY "Users can view waivers" ON public.cto_waivers FOR SELECT USING (true);
CREATE POLICY "Super admins can manage waivers" ON public.cto_waivers FOR ALL USING ((SELECT is_super_admin()));

-- Read-only views/backup tables
CREATE POLICY "Users can view agreements with details" ON public.agreements_with_details FOR SELECT USING (true);
CREATE POLICY "Users can view contract number history" ON public.contract_number_history FOR SELECT USING (true);
CREATE POLICY "Users can view payment backups" ON public.payments_backup_20251107 FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Users can view reminder schedules backup" ON public.reminder_schedules_backup_20250101 FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Users can view reminder templates backup" ON public.reminder_templates_backup_20250101 FOR SELECT USING (company_id = (SELECT get_user_company_id()));;
