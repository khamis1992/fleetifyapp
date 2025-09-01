-- Enable Row Level Security on tables that are missing it
-- These are performance and monitoring tables that need proper access controls

-- 1. Enable RLS on function_performance_logs
ALTER TABLE public.function_performance_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for function_performance_logs
-- Super admins can manage all logs
CREATE POLICY "Super admins can manage function performance logs" 
ON public.function_performance_logs 
FOR ALL 
TO authenticated
USING (has_role_cached(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role_cached(auth.uid(), 'super_admin'::user_role));

-- Company admins can view their company's logs
CREATE POLICY "Company admins can view their company function logs" 
ON public.function_performance_logs 
FOR SELECT 
TO authenticated
USING (
  company_id = get_user_company_cached(auth.uid()) 
  AND has_role_cached(auth.uid(), 'company_admin'::user_role)
);

-- System can insert performance logs
CREATE POLICY "System can insert function performance logs" 
ON public.function_performance_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- 2. Enable RLS on migration_logs
ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for migration_logs (system-level, only super admins should access)
CREATE POLICY "Super admins can manage migration logs" 
ON public.migration_logs 
FOR ALL 
TO authenticated
USING (has_role_cached(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role_cached(auth.uid(), 'super_admin'::user_role));

-- System can insert migration logs
CREATE POLICY "System can insert migration logs" 
ON public.migration_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- 3. Enable RLS on query_performance_logs
ALTER TABLE public.query_performance_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for query_performance_logs
-- Super admins can manage all query logs
CREATE POLICY "Super admins can manage query performance logs" 
ON public.query_performance_logs 
FOR ALL 
TO authenticated
USING (has_role_cached(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role_cached(auth.uid(), 'super_admin'::user_role));

-- Company admins can view their company's query logs
CREATE POLICY "Company admins can view their company query logs" 
ON public.query_performance_logs 
FOR SELECT 
TO authenticated
USING (
  company_id = get_user_company_cached(auth.uid()) 
  AND has_role_cached(auth.uid(), 'company_admin'::user_role)
);

-- System can insert query performance logs
CREATE POLICY "System can insert query performance logs" 
ON public.query_performance_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Add indexes for better performance on the newly secured tables
CREATE INDEX IF NOT EXISTS idx_function_performance_logs_company_created 
ON public.function_performance_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_query_performance_logs_company_created 
ON public.query_performance_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_migration_logs_created_at 
ON public.migration_logs (created_at DESC);