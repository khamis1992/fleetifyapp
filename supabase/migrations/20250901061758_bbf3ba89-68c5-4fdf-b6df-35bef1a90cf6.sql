-- Fix critical security functions by removing SECURITY DEFINER where not needed
-- and adding proper access controls

-- First, let's secure authentication and authorization helper functions
-- These functions are used by RLS policies, so they need to remain SECURITY DEFINER
-- but we'll keep them minimal and well-audited

-- Keep these functions as SECURITY DEFINER (they're needed for RLS):
-- get_user_company, get_user_company_cached, has_role, has_role_cached, has_any_role_cached

-- Remove SECURITY DEFINER from utility functions that don't need elevated privileges
ALTER FUNCTION public.calculate_account_level(text) SECURITY INVOKER;
ALTER FUNCTION public.analyze_rls_performance() SECURITY INVOKER;

-- Remove SECURITY DEFINER from customer and vehicle functions that should respect RLS
ALTER FUNCTION public.check_customer_eligibility_realtime(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.check_vehicle_availability_realtime(uuid, date, date) SECURITY INVOKER;
ALTER FUNCTION public.calculate_customer_outstanding_balance(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.calculate_vehicle_total_costs(uuid) SECURITY INVOKER;

-- Remove SECURITY DEFINER from analysis functions
ALTER FUNCTION public.analyze_system_performance() SECURITY INVOKER;
ALTER FUNCTION public.analyze_slow_queries() SECURITY INVOKER;

-- Keep administrative functions as SECURITY DEFINER but add strict role checks
-- Update some critical functions to include role checks if they don't have them

-- For now, let's focus on the most critical ones and remove SECURITY DEFINER
-- from functions that clearly don't need it