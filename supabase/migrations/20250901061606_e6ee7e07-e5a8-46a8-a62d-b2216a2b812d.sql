-- Enable Row Level Security on security_audit_logs table
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for super admins to have full access to security audit logs
CREATE POLICY "Super admins can manage security audit logs" 
ON public.security_audit_logs 
FOR ALL 
TO authenticated
USING (has_role_cached(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role_cached(auth.uid(), 'super_admin'::user_role));

-- Create policy for company admins to view only their company's security logs
CREATE POLICY "Company admins can view their company security logs" 
ON public.security_audit_logs 
FOR SELECT 
TO authenticated
USING (
  company_id = get_user_company_cached(auth.uid()) 
  AND has_role_cached(auth.uid(), 'company_admin'::user_role)
);

-- Create policy for system to insert security audit logs (for automated logging)
CREATE POLICY "System can insert security audit logs" 
ON public.security_audit_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Add index for better performance on security log queries
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_company_id_created_at 
ON public.security_audit_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_risk_level 
ON public.security_audit_logs (risk_level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type 
ON public.security_audit_logs (event_type, created_at DESC);