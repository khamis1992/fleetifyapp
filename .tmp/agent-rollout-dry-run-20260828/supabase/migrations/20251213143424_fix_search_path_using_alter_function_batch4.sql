-- Fix search_path using ALTER FUNCTION - Batch 4
-- This batch covers deallocate, determine, distribute, generate, and get functions

-- D functions
ALTER FUNCTION public.deallocate_inventory_stock(uuid, uuid, integer) SET search_path = '';
ALTER FUNCTION public.determine_payment_completion_status(numeric, numeric, integer) SET search_path = '';
ALTER FUNCTION public.distribute_vehicle_installment_amount(uuid, numeric, jsonb) SET search_path = '';

-- E-F functions
ALTER FUNCTION public.expire_old_waivers() SET search_path = '';
ALTER FUNCTION public.find_contract_by_identifiers(uuid, text, text, uuid) SET search_path = '';
ALTER FUNCTION public.fix_pending_payments(uuid) SET search_path = '';

-- Generate functions
ALTER FUNCTION public.generate_approval_token() SET search_path = '';
ALTER FUNCTION public.generate_grouped_reminder_message(text, jsonb, numeric, integer, text, uuid) SET search_path = '';
ALTER FUNCTION public.generate_historical_invoices_safe(date, date) SET search_path = '';
ALTER FUNCTION public.generate_invoices_from_payment_schedule(uuid) SET search_path = '';
ALTER FUNCTION public.generate_legal_case_number(uuid) SET search_path = '';
ALTER FUNCTION public.generate_legal_memo_number(uuid) SET search_path = '';
ALTER FUNCTION public.generate_penalty_number(uuid) SET search_path = '';
ALTER FUNCTION public.generate_receipt_number() SET search_path = '';
ALTER FUNCTION public.generate_ticket_number() SET search_path = '';

-- Get functions
ALTER FUNCTION public.get_all_customers_outstanding_balance(uuid) SET search_path = '';
ALTER FUNCTION public.get_category_analysis(uuid) SET search_path = '';
ALTER FUNCTION public.get_company_currency_symbol(uuid) SET search_path = '';
ALTER FUNCTION public.get_compliance_dashboard_summary(uuid) SET search_path = '';
ALTER FUNCTION public.get_contract_complete(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.get_customer_best_name(uuid) SET search_path = '';
ALTER FUNCTION public.get_customer_complete(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.get_customer_outstanding_balance(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.get_customer_rental_payment_totals(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.get_customer_unpaid_months(uuid, uuid) SET search_path = '';
ALTER FUNCTION public.get_dashboard_stats(uuid) SET search_path = '';
ALTER FUNCTION public.get_effective_company_id() SET search_path = '';
ALTER FUNCTION public.get_inventory_overview_metrics(uuid, uuid, uuid) SET search_path = '';
ALTER FUNCTION public.get_inventory_trends(uuid, integer) SET search_path = '';
ALTER FUNCTION public.get_item_movement_summary(uuid, uuid, integer) SET search_path = '';

-- Update functions
ALTER FUNCTION public.update_installment_status() SET search_path = '';
ALTER FUNCTION public.update_interaction_feedback(uuid, integer, boolean, boolean, boolean, text) SET search_path = '';
ALTER FUNCTION public.update_inventory_timestamp() SET search_path = '';
ALTER FUNCTION public.update_job_status(uuid, character varying, integer, jsonb, text) SET search_path = '';
ALTER FUNCTION public.update_late_fine_settings_updated_at() SET search_path = '';
ALTER FUNCTION public.update_learning_updated_at() SET search_path = '';
ALTER FUNCTION public.update_penalties_updated_at() SET search_path = '';
ALTER FUNCTION public.update_purchase_order_total() SET search_path = '';
ALTER FUNCTION public.update_qatar_legal_texts_timestamp() SET search_path = '';
ALTER FUNCTION public.update_rental_receipt_updated_at() SET search_path = '';
ALTER FUNCTION public.update_scheduled_followups_updated_at() SET search_path = '';
ALTER FUNCTION public.update_stock_level_on_movement() SET search_path = '';
ALTER FUNCTION public.update_task_updated_at() SET search_path = '';
ALTER FUNCTION public.update_template_engagement() SET search_path = '';
ALTER FUNCTION public.update_template_statistics() SET search_path = '';
ALTER FUNCTION public.update_vehicle_installment_timestamp() SET search_path = '';
ALTER FUNCTION public.update_vehicle_status_on_contract_change() SET search_path = '';
ALTER FUNCTION public.update_vehicle_timestamp() SET search_path = '';
ALTER FUNCTION public.update_whatsapp_settings_updated_at() SET search_path = '';
ALTER FUNCTION public.update_workflows_updated_at() SET search_path = '';;
