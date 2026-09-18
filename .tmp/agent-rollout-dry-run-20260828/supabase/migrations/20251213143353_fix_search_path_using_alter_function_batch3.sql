-- Fix search_path using ALTER FUNCTION - Batch 3
-- This batch covers getter, handler, and trigger functions

-- Getter functions
ALTER FUNCTION public.get_item_performance_metrics(uuid, uuid, uuid) SET search_path = '';
ALTER FUNCTION public.get_learning_stats(uuid, integer) SET search_path = '';
ALTER FUNCTION public.get_linkable_accounts(uuid, text) SET search_path = '';
ALTER FUNCTION public.get_next_job() SET search_path = '';
ALTER FUNCTION public.get_payment_linking_stats(uuid) SET search_path = '';
ALTER FUNCTION public.get_pending_approvals_for_user(uuid, text[]) SET search_path = '';
ALTER FUNCTION public.get_pending_payments_stats(uuid) SET search_path = '';
ALTER FUNCTION public.get_recent_events(uuid, character varying, integer) SET search_path = '';
ALTER FUNCTION public.get_reminder_template(text, uuid) SET search_path = '';
ALTER FUNCTION public.get_upcoming_compliance_deadlines(uuid, integer) SET search_path = '';
ALTER FUNCTION public.get_warehouse_performance_metrics(uuid) SET search_path = '';
ALTER FUNCTION public.get_whatsapp_statistics() SET search_path = '';

-- Handler and trigger functions
ALTER FUNCTION public.handle_invoice_changes() SET search_path = '';
ALTER FUNCTION public.is_in_transfer_context() SET search_path = '';
ALTER FUNCTION public.log_audit_trail() SET search_path = '';
ALTER FUNCTION public.log_compliance_change() SET search_path = '';
ALTER FUNCTION public.log_cto_audit(text, text, text, text, jsonb, text, integer, text, text, integer) SET search_path = '';
ALTER FUNCTION public.log_journal_entry_status_change() SET search_path = '';
ALTER FUNCTION public.log_task_changes() SET search_path = '';
ALTER FUNCTION public.mark_broken_promises() SET search_path = '';
ALTER FUNCTION public.mark_late_rental_payment() SET search_path = '';
ALTER FUNCTION public.process_pending_reminders() SET search_path = '';
ALTER FUNCTION public.record_learning_interaction(uuid, uuid, character varying, text, text, character varying, jsonb, integer, numeric, jsonb, boolean) SET search_path = '';
ALTER FUNCTION public.redistribute_vehicles_to_contracts(uuid) SET search_path = '';
ALTER FUNCTION public.refresh_customer_summary() SET search_path = '';
ALTER FUNCTION public.run_compliance_validation(character varying, uuid, uuid) SET search_path = '';
ALTER FUNCTION public.send_followup_reminders() SET search_path = '';

-- Update trigger functions
ALTER FUNCTION public.set_task_completed_at() SET search_path = '';
ALTER FUNCTION public.set_ticket_number() SET search_path = '';
ALTER FUNCTION public.set_vehicle_company_id() SET search_path = '';
ALTER FUNCTION public.transfer_user_to_company(uuid, uuid, uuid, text[], text, jsonb) SET search_path = '';
ALTER FUNCTION public.trigger_daily_report() SET search_path = '';
ALTER FUNCTION public.trigger_generate_reminders() SET search_path = '';
ALTER FUNCTION public.trigger_weekly_report() SET search_path = '';
ALTER FUNCTION public.update_contract_amendments_updated_at() SET search_path = '';
ALTER FUNCTION public.update_contract_balance() SET search_path = '';
ALTER FUNCTION public.update_contract_total_paid() SET search_path = '';
ALTER FUNCTION public.update_csv_templates_updated_at() SET search_path = '';
ALTER FUNCTION public.update_customer_account_types_updated_at() SET search_path = '';
ALTER FUNCTION public.update_demo_sessions_updated_at() SET search_path = '';;
