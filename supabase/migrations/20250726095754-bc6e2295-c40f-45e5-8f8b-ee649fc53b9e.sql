-- Fix security issues identified by linter

-- 1. Fix function search path for existing functions
ALTER FUNCTION public.has_role(_user_id uuid, _role user_role) SET search_path = public;
ALTER FUNCTION public.get_user_company(_user_id uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_new_company() SET search_path = public;
ALTER FUNCTION public.copy_default_accounts_to_company(target_company_id uuid) SET search_path = public;
ALTER FUNCTION public.copy_default_cost_centers_to_company(target_company_id uuid) SET search_path = public;
ALTER FUNCTION public.generate_employee_account_number(company_id_param uuid) SET search_path = public;
ALTER FUNCTION public.generate_maintenance_number(company_id_param uuid) SET search_path = public;
ALTER FUNCTION public.generate_traffic_payment_number(company_id_param uuid) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.calculate_account_level(account_id uuid) SET search_path = public;
ALTER FUNCTION public.update_account_levels_manually(company_id_param uuid) SET search_path = public;