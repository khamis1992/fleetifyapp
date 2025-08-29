-- نظام النسخ الاحتياطي والمراقبة - إصدار مبسط
-- Backup and monitoring system - Simplified version

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS public.performance_metrics CASCADE;
DROP TABLE IF EXISTS public.system_monitoring CASCADE;
DROP TABLE IF EXISTS public.backup_execution_log CASCADE;
DROP TABLE IF EXISTS public.backup_configurations CASCADE;

-- Create backup configurations table
CREATE TABLE public.backup_configurations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID,
    backup_name TEXT NOT NULL,
    backup_type TEXT NOT NULL DEFAULT 'incremental',
    tables_to_backup TEXT[] DEFAULT ARRAY['customers', 'contracts', 'payments'],
    schedule_cron TEXT DEFAULT '0 2 * * *',
    retention_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    last_backup_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create backup execution log table
CREATE TABLE public.backup_execution_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_config_id UUID,
    company_id UUID,
    backup_type TEXT DEFAULT 'incremental',
    status TEXT DEFAULT 'running',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    records_backed_up INTEGER DEFAULT 0,
    backup_location TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Create system monitoring table
CREATE TABLE public.system_monitoring (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit TEXT,
    metric_category TEXT DEFAULT 'performance',
    threshold_warning NUMERIC,
    threshold_critical NUMERIC,
    status TEXT DEFAULT 'normal',
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create performance metrics table
CREATE TABLE public.performance_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID,
    operation_name TEXT NOT NULL,
    execution_time_ms NUMERIC NOT NULL,
    memory_usage_mb NUMERIC,
    cpu_usage_percent NUMERIC,
    database_queries INTEGER,
    cache_hit_ratio NUMERIC,
    error_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 1,
    user_id UUID,
    session_id TEXT,
    ip_address INET,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create basic indexes
CREATE INDEX idx_backup_configurations_company ON public.backup_configurations(company_id);
CREATE INDEX idx_backup_execution_log_company ON public.backup_execution_log(company_id);
CREATE INDEX idx_system_monitoring_company ON public.system_monitoring(company_id);
CREATE INDEX idx_performance_metrics_company ON public.performance_metrics(company_id);
CREATE INDEX idx_performance_metrics_operation ON public.performance_metrics(operation_name);

-- Enable RLS
ALTER TABLE public.backup_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
CREATE POLICY "backup_configurations_policy" ON public.backup_configurations FOR ALL USING (true);
CREATE POLICY "backup_execution_log_policy" ON public.backup_execution_log FOR ALL USING (true);
CREATE POLICY "system_monitoring_policy" ON public.system_monitoring FOR ALL USING (true);
CREATE POLICY "performance_metrics_policy" ON public.performance_metrics FOR ALL USING (true);

-- Function to record performance metrics
CREATE OR REPLACE FUNCTION public.record_performance_metric(
    p_company_id UUID,
    p_operation_name TEXT,
    p_execution_time_ms NUMERIC
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO public.performance_metrics (
        company_id,
        operation_name,
        execution_time_ms,
        user_id
    ) VALUES (
        p_company_id,
        p_operation_name,
        p_execution_time_ms,
        auth.uid()
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$;

-- Function to get system health status
CREATE OR REPLACE FUNCTION public.get_system_health_status(
    p_company_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    health_status JSONB;
    avg_response_time NUMERIC := 0;
    total_operations INTEGER := 0;
BEGIN
    -- Calculate basic metrics
    SELECT 
        COALESCE(AVG(execution_time_ms), 0),
        COUNT(*)
    INTO avg_response_time, total_operations
    FROM public.performance_metrics
    WHERE (p_company_id IS NULL OR company_id = p_company_id)
    AND recorded_at >= now() - INTERVAL '1 hour';
    
    -- Build health status
    health_status := jsonb_build_object(
        'overall_status', CASE 
            WHEN avg_response_time > 5000 THEN 'critical'
            WHEN avg_response_time > 2000 THEN 'warning'
            ELSE 'healthy'
        END,
        'metrics', jsonb_build_object(
            'avg_response_time_ms', avg_response_time,
            'total_operations', total_operations
        ),
        'last_updated', now()
    );
    
    RETURN health_status;
END;
$$;

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION public.cleanup_monitoring_data(
    p_retention_days INTEGER DEFAULT 90
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_date := now() - (p_retention_days || ' days')::INTERVAL;
    
    -- Clean up old performance metrics
    DELETE FROM public.performance_metrics
    WHERE recorded_at < cutoff_date;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old system monitoring data
    DELETE FROM public.system_monitoring
    WHERE recorded_at < cutoff_date;
    
    -- Clean up old backup logs
    DELETE FROM public.backup_execution_log
    WHERE start_time < cutoff_date;
    
    RETURN deleted_count;
END;
$$;

-- Test the performance_metrics table
DO $$
BEGIN
    -- Insert a test record to verify the table works
    INSERT INTO public.performance_metrics (
        company_id,
        operation_name,
        execution_time_ms
    ) VALUES (
        gen_random_uuid(),
        'test_operation',
        100
    );
    
    -- Delete the test record
    DELETE FROM public.performance_metrics WHERE operation_name = 'test_operation';
    
    RAISE NOTICE 'Performance metrics table is working correctly!';
END;
$$;

-- Comments
COMMENT ON TABLE public.backup_configurations IS 'إعدادات النسخ الاحتياطي';
COMMENT ON TABLE public.backup_execution_log IS 'سجل تنفيذ النسخ الاحتياطي';
COMMENT ON TABLE public.system_monitoring IS 'مراقبة النظام';
COMMENT ON TABLE public.performance_metrics IS 'مقاييس الأداء';
