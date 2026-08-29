-- Fix search_path using ALTER FUNCTION (safer approach)
-- This batch covers common utility and trigger functions

-- Batch 1: Trigger and utility functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.trigger_set_timestamp() SET search_path = '';
ALTER FUNCTION public.parse_date(text) SET search_path = '';
ALTER FUNCTION public.validate_rls_policies() SET search_path = '';

-- Batch 1 continued: More utility functions
ALTER FUNCTION public.add_vehicles_to_installment(uuid, uuid[], numeric[]) SET search_path = '';
ALTER FUNCTION public.admin_add_user_role(uuid, uuid, text) SET search_path = '';
ALTER FUNCTION public.admin_update_user_role_company(uuid, text, uuid) SET search_path = '';
ALTER FUNCTION public.allocate_inventory_stock(uuid, uuid, integer) SET search_path = '';
ALTER FUNCTION public.auto_calculate_payment_fields() SET search_path = '';
ALTER FUNCTION public.calculate_account_level(uuid) SET search_path = '';

-- Batch 1 continued: Calculation functions
ALTER FUNCTION public.calculate_contract_late_fees() SET search_path = '';
ALTER FUNCTION public.calculate_inventory_valuation(uuid, uuid, uuid) SET search_path = '';
ALTER FUNCTION public.calculate_late_fee(date, date, numeric) SET search_path = '';
ALTER FUNCTION public.calculate_rental_delay_fine(date, numeric) SET search_path = '';
ALTER FUNCTION public.calculate_rental_payment_balance() SET search_path = '';

-- Batch 1 continued: Action functions
ALTER FUNCTION public.cancel_reminders_on_payment() SET search_path = '';
ALTER FUNCTION public.change_journal_entry_status(uuid, text, uuid, text) SET search_path = '';
ALTER FUNCTION public.check_and_create_replenishment_request() SET search_path = '';
ALTER FUNCTION public.check_blacklisted_customer() SET search_path = '';
ALTER FUNCTION public.check_deploy_allowed(text) SET search_path = '';

-- Batch 1 continued: More action functions
ALTER FUNCTION public.check_payment_promise_fulfillment() SET search_path = '';
ALTER FUNCTION public.cleanup_completed_jobs(integer) SET search_path = '';
ALTER FUNCTION public.cleanup_old_events(integer) SET search_path = '';
ALTER FUNCTION public.copy_selected_accounts_to_company(uuid, text[]) SET search_path = '';;
