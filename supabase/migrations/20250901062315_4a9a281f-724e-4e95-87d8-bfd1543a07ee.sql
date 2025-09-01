-- Enable Row Level Security on all views and materialized views
-- These objects can expose sensitive data through PostgREST API

-- Enable RLS on all views
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

-- Enable RLS on materialized view
ALTER MATERIALIZED VIEW public.dashboard_stats_mv ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the materialized view
CREATE POLICY "Users can view dashboard stats for their company" 
ON public.dashboard_stats_mv 
FOR SELECT 
TO authenticated
USING (
  company_id = get_user_company_cached(auth.uid()) 
  OR has_role_cached(auth.uid(), 'super_admin'::user_role)
);

-- Note: Views inherit security from their underlying tables through RLS policies
-- But we need to ensure they use security_barrier to prevent information leakage
-- The security_barrier option ensures that view conditions are not pushed down
-- before RLS policies are applied on the underlying tables