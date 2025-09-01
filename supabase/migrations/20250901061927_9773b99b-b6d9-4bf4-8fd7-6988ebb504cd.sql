-- Fix SECURITY DEFINER functions with correct signatures
-- Remove SECURITY DEFINER from functions that don't need elevated privileges

-- Utility calculation functions
ALTER FUNCTION public.calculate_account_level(text) SECURITY INVOKER;
ALTER FUNCTION public.calculate_account_level(uuid) SECURITY INVOKER;

-- Analysis functions - these don't need to bypass RLS
ALTER FUNCTION public.analyze_rls_performance() SECURITY INVOKER;
ALTER FUNCTION public.analyze_slow_queries() SECURITY INVOKER;
ALTER FUNCTION public.analyze_system_performance(uuid, integer) SECURITY INVOKER;

-- Business logic functions - should respect user permissions
ALTER FUNCTION public.calculate_customer_outstanding_balance(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.calculate_vehicle_total_costs(uuid) SECURITY INVOKER;