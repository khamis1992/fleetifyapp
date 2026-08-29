-- Secure materialized view mv_customer_summary from public API access
-- Remove anon and authenticated role access

-- Revoke SELECT from anon and authenticated roles
REVOKE SELECT ON public.mv_customer_summary FROM anon;
REVOKE SELECT ON public.mv_customer_summary FROM authenticated;

-- Only allow service_role and postgres to access
GRANT SELECT ON public.mv_customer_summary TO service_role;

-- Add comment explaining the security restriction
COMMENT ON MATERIALIZED VIEW public.mv_customer_summary IS 
'Customer summary materialized view - restricted access. Not exposed via Data API for security. Use via server-side functions only.';;
