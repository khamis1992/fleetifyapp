-- Enable security barriers on views to ensure RLS policies are properly applied
-- Views will inherit security from their underlying tables

-- Enable security_barrier on all views to prevent information leakage
ALTER VIEW public.active_contracts_view SET (security_barrier = true);
ALTER VIEW public.contract_payment_summary SET (security_barrier = true);
ALTER VIEW public.failed_auth_summary SET (security_barrier = true);
ALTER VIEW public.function_performance_summary SET (security_barrier = true);
ALTER VIEW public.maintenance_cost_summary SET (security_barrier = true);
ALTER VIEW public.optimized_customer_view SET (security_barrier = true);
ALTER VIEW public.payroll_financial_analysis SET (security_barrier = true);
ALTER VIEW public.security_alerts SET (security_barrier = true);
ALTER VIEW public.v_account_linking_stats SET (security_barrier = true);
ALTER VIEW public.v_linkable_accounts SET (security_barrier = true);

-- For materialized views, we need to either:
-- 1. Convert to a regular view with security barrier, or
-- 2. Drop it if it's not essential, or  
-- 3. Restrict access via grants instead of RLS

-- Let's check if the materialized view is actually being used
-- For now, let's restrict access to the materialized view via REVOKE
REVOKE ALL ON public.dashboard_stats_mv FROM public;
REVOKE ALL ON public.dashboard_stats_mv FROM anon;
REVOKE ALL ON public.dashboard_stats_mv FROM authenticated;

-- Grant access only to super admins and service role
GRANT SELECT ON public.dashboard_stats_mv TO service_role;

-- Create a security definer function to access dashboard stats safely
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_safe()
RETURNS TABLE (
  company_id uuid,
  total_contracts bigint,
  active_contracts bigint,
  total_vehicles bigint,
  total_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow access for authenticated users with proper company access
  IF NOT auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Return data filtered by user's company or all data for super admins
  RETURN QUERY
  SELECT 
    ds.company_id,
    ds.total_contracts,
    ds.active_contracts,
    ds.total_vehicles,
    ds.total_revenue
  FROM dashboard_stats_mv ds
  WHERE 
    (has_role_cached(auth.uid(), 'super_admin'::user_role)) 
    OR 
    (ds.company_id = get_user_company_cached(auth.uid()));
END;
$$;