-- Create system_logs table for audit logging
CREATE TABLE IF NOT EXISTS public.system_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id),
    user_id uuid,
    level text NOT NULL DEFAULT 'info',
    category text NOT NULL,
    action text NOT NULL,
    resource_type text,
    resource_id uuid,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- Create system_backups table  
CREATE TABLE IF NOT EXISTS public.system_backups (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id),
    backup_type text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    file_path text,
    file_size bigint,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    error_message text
);

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id),
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit text DEFAULT 'count',
    tags jsonb DEFAULT '{}',
    recorded_at timestamp with time zone DEFAULT now()
);

-- Create system_alerts table
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id),
    alert_type text NOT NULL,
    severity text NOT NULL DEFAULT 'info',
    title text NOT NULL,
    message text NOT NULL,
    details jsonb DEFAULT '{}',
    is_resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Add missing columns to subscription_plans table
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS description_ar text,
ADD COLUMN IF NOT EXISTS name_ar text;

-- Add missing columns to feature_gates table  
ALTER TABLE public.feature_gates
ADD COLUMN IF NOT EXISTS description_ar text,
ADD COLUMN IF NOT EXISTS feature_name_ar text;

-- Create backup management functions
CREATE OR REPLACE FUNCTION public.create_system_backup(
    company_id_param uuid DEFAULT NULL,
    backup_type_param text DEFAULT 'full'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    backup_id uuid;
BEGIN
    INSERT INTO public.system_backups (
        id,
        company_id,
        backup_type,
        status,
        description
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        backup_type_param,
        'in_progress',
        'System backup initiated'
    ) RETURNING id INTO backup_id;
    
    -- Simulate backup completion
    UPDATE public.system_backups 
    SET 
        status = 'completed',
        completed_at = now(),
        file_size = 1024 * 1024 * 100 -- 100MB simulation
    WHERE id = backup_id;
    
    RETURN backup_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_system_backup(
    backup_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Simulate restore process
    INSERT INTO public.system_logs (
        company_id,
        user_id,
        level,
        category,
        action,
        message
    ) VALUES (
        (SELECT company_id FROM public.system_backups WHERE id = backup_id_param),
        auth.uid(),
        'info',
        'backup',
        'restore',
        'System restore initiated for backup: ' || backup_id_param
    );
    
    RETURN true;
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Companies can view their own system logs" ON public.system_logs
    FOR SELECT USING (
        company_id = get_user_company_secure(auth.uid()) OR 
        has_role(auth.uid(), 'super_admin'::user_role)
    );

CREATE POLICY "System can insert logs" ON public.system_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage system backups" ON public.system_backups
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR
        (company_id = get_user_company_secure(auth.uid()) AND has_role(auth.uid(), 'company_admin'::user_role))
    );

CREATE POLICY "Companies can view their performance metrics" ON public.performance_metrics
    FOR SELECT USING (
        company_id = get_user_company_secure(auth.uid()) OR 
        has_role(auth.uid(), 'super_admin'::user_role)
    );

CREATE POLICY "System can insert performance metrics" ON public.performance_metrics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Companies can view their system alerts" ON public.system_alerts
    FOR SELECT USING (
        company_id = get_user_company_secure(auth.uid()) OR 
        has_role(auth.uid(), 'super_admin'::user_role)
    );

CREATE POLICY "Admins can manage system alerts" ON public.system_alerts
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR
        (company_id = get_user_company_secure(auth.uid()) AND 
         (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
    );