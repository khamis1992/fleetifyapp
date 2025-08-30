-- Phase 2: Monitoring, Performance Optimization, and Backup Systems (Fixed)

-- 1. Create comprehensive audit logging system
CREATE TABLE IF NOT EXISTS public.system_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    user_id uuid,
    level text NOT NULL DEFAULT 'info', -- debug, info, warn, error, critical
    category text NOT NULL, -- auth, finance, fleet, hr, system
    action text NOT NULL,
    resource_type text,
    resource_id uuid,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text,
    session_id text,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS and create indexes for performance
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_system_logs_company_created ON public.system_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level_created ON public.system_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_category_created ON public.system_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_created ON public.system_logs(user_id, created_at DESC);

-- RLS policies for system logs
DROP POLICY IF EXISTS "Companies can view their own logs" ON public.system_logs;
CREATE POLICY "Companies can view their own logs" ON public.system_logs 
FOR SELECT USING (company_id = public.get_user_company_secure(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::user_role));

DROP POLICY IF EXISTS "System can insert logs" ON public.system_logs;
CREATE POLICY "System can insert logs" ON public.system_logs 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage logs" ON public.system_logs;
CREATE POLICY "Admins can manage logs" ON public.system_logs 
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::user_role));

-- 2. Create performance monitoring table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit text DEFAULT 'count',
    tags jsonb DEFAULT '{}',
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS and indexes for performance metrics
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_performance_metrics_company_recorded ON public.performance_metrics(company_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_recorded ON public.performance_metrics(metric_name, recorded_at DESC);

-- RLS policies for performance metrics
DROP POLICY IF EXISTS "Companies can view their own metrics" ON public.performance_metrics;
CREATE POLICY "Companies can view their own metrics" ON public.performance_metrics 
FOR SELECT USING (company_id = public.get_user_company_secure(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::user_role));

DROP POLICY IF EXISTS "System can insert metrics" ON public.performance_metrics;
CREATE POLICY "System can insert metrics" ON public.performance_metrics 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage metrics" ON public.performance_metrics;
CREATE POLICY "Admins can manage metrics" ON public.performance_metrics 
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::user_role));

-- 3. Create alerts system
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    alert_type text NOT NULL, -- security, performance, quota, error, maintenance
    severity text NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    title text NOT NULL,
    message text NOT NULL,
    details jsonb DEFAULT '{}',
    status text DEFAULT 'active', -- active, acknowledged, resolved, dismissed
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS and indexes for alerts
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_system_alerts_company_status ON public.system_alerts(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity_status ON public.system_alerts(severity, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_type_created ON public.system_alerts(alert_type, created_at DESC);

-- RLS policies for system alerts
DROP POLICY IF EXISTS "Companies can view their own alerts" ON public.system_alerts;
CREATE POLICY "Companies can view their own alerts" ON public.system_alerts 
FOR SELECT USING (company_id = public.get_user_company_secure(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::user_role));

DROP POLICY IF EXISTS "System can create alerts" ON public.system_alerts;
CREATE POLICY "System can create alerts" ON public.system_alerts 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage alerts" ON public.system_alerts;
CREATE POLICY "Admins can manage alerts" ON public.system_alerts 
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::user_role) OR (company_id = public.get_user_company_secure(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'::user_role)));

-- 4. Create backup metadata tracking
CREATE TABLE IF NOT EXISTS public.backup_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    backup_type text NOT NULL, -- full, incremental, export
    status text NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    file_path text,
    file_size_bytes bigint,
    records_count integer,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    error_message text,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS and indexes for backup logs
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_backup_logs_company_started ON public.backup_logs(company_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status_started ON public.backup_logs(status, started_at DESC);

-- RLS policies for backup logs
DROP POLICY IF EXISTS "Companies can view their own backups" ON public.backup_logs;
CREATE POLICY "Companies can view their own backups" ON public.backup_logs 
FOR SELECT USING (company_id = public.get_user_company_secure(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::user_role));

DROP POLICY IF EXISTS "System can manage backups" ON public.backup_logs;
CREATE POLICY "System can manage backups" ON public.backup_logs 
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::user_role));

-- 5. Performance optimization indexes for existing tables (Fixed without functions in predicates)
-- Chart of accounts optimization
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_type ON public.chart_of_accounts(company_id, account_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent_level ON public.chart_of_accounts(parent_account_id, account_level);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type_subtype ON public.chart_of_accounts(account_type, account_subtype);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_active ON public.chart_of_accounts(is_active, company_id);

-- Customers optimization
CREATE INDEX IF NOT EXISTS idx_customers_company_phone ON public.customers(company_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_national_id ON public.customers(national_id);
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(is_active, company_id);

-- Contracts optimization
CREATE INDEX IF NOT EXISTS idx_contracts_company_status ON public.contracts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON public.contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_id ON public.contracts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON public.contracts(customer_id);

-- Employees optimization
CREATE INDEX IF NOT EXISTS idx_employees_company_dept ON public.employees(company_id, department);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON public.employees(hire_date);
CREATE INDEX IF NOT EXISTS idx_employees_active ON public.employees(is_active, company_id);

-- Attendance optimization
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance_records(employee_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_recent ON public.attendance_records(attendance_date DESC);

-- Budget optimization
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON public.budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budgets_company_year ON public.budgets(company_id, budget_year);

-- Journal entries optimization
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON public.journal_entries(company_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(status, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON public.journal_entry_lines(account_id, journal_entry_id);

-- 6. Create monitoring functions
CREATE OR REPLACE FUNCTION public.log_system_event(
    company_id_param uuid,
    user_id_param uuid,
    level_param text,
    category_param text,
    action_param text,
    message_param text,
    metadata_param jsonb DEFAULT '{}',
    resource_type_param text DEFAULT NULL,
    resource_id_param uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO public.system_logs (
        company_id,
        user_id,
        level,
        category,
        action,
        resource_type,
        resource_id,
        message,
        metadata
    ) VALUES (
        company_id_param,
        user_id_param,
        level_param,
        category_param,
        action_param,
        resource_type_param,
        resource_id_param,
        message_param,
        metadata_param
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- 7. Create performance monitoring function
CREATE OR REPLACE FUNCTION public.record_performance_metric(
    company_id_param uuid,
    metric_name_param text,
    metric_value_param numeric,
    metric_unit_param text DEFAULT 'count',
    tags_param jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    metric_id uuid;
BEGIN
    INSERT INTO public.performance_metrics (
        company_id,
        metric_name,
        metric_value,
        metric_unit,
        tags
    ) VALUES (
        company_id_param,
        metric_name_param,
        metric_value_param,
        metric_unit_param,
        tags_param
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$;

-- 8. Create alert management functions
CREATE OR REPLACE FUNCTION public.create_system_alert(
    company_id_param uuid,
    alert_type_param text,
    severity_param text,
    title_param text,
    message_param text,
    details_param jsonb DEFAULT '{}',
    expires_hours integer DEFAULT 24
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    alert_id uuid;
BEGIN
    INSERT INTO public.system_alerts (
        company_id,
        alert_type,
        severity,
        title,
        message,
        details,
        expires_at
    ) VALUES (
        company_id_param,
        alert_type_param,
        severity_param,
        title_param,
        message_param,
        details_param,
        now() + (expires_hours || ' hours')::interval
    ) RETURNING id INTO alert_id;
    
    RETURN alert_id;
END;
$$;