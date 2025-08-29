-- إنشاء جدول مقاييس الأداء فقط
-- Create performance metrics table only

-- First, let's check if the table exists and drop it completely
DO $$
BEGIN
    -- Drop all related objects first
    DROP FUNCTION IF EXISTS public.record_performance_metric CASCADE;
    DROP FUNCTION IF EXISTS public.get_system_health_status CASCADE;
    DROP FUNCTION IF EXISTS public.cleanup_monitoring_data CASCADE;
    
    -- Drop the table if it exists
    DROP TABLE IF EXISTS public.performance_metrics CASCADE;
    
    RAISE NOTICE 'Cleaned up existing performance_metrics objects';
END $$;

-- Create the performance_metrics table with explicit column definitions
CREATE TABLE public.performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Verify the table was created successfully
DO $$
BEGIN
    -- Check if the table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'performance_metrics'
    ) THEN
        RAISE EXCEPTION 'Failed to create performance_metrics table';
    END IF;
    
    -- Check if operation_name column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'performance_metrics' 
        AND column_name = 'operation_name'
    ) THEN
        RAISE EXCEPTION 'operation_name column does not exist in performance_metrics table';
    END IF;
    
    RAISE NOTICE 'performance_metrics table created successfully with operation_name column';
END $$;

-- Create a simple index
CREATE INDEX idx_performance_metrics_operation_name ON public.performance_metrics(operation_name);

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create a simple policy
CREATE POLICY "performance_metrics_access" ON public.performance_metrics FOR ALL USING (true);

-- Test insert and select
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Insert a test record
    INSERT INTO public.performance_metrics (
        company_id,
        operation_name,
        execution_time_ms
    ) VALUES (
        gen_random_uuid(),
        'test_operation_' || extract(epoch from now()),
        150.5
    ) RETURNING id INTO test_id;
    
    -- Verify we can select from the table
    IF NOT EXISTS (
        SELECT 1 FROM public.performance_metrics 
        WHERE id = test_id AND operation_name LIKE 'test_operation_%'
    ) THEN
        RAISE EXCEPTION 'Failed to insert or select from performance_metrics table';
    END IF;
    
    -- Clean up test record
    DELETE FROM public.performance_metrics WHERE id = test_id;
    
    RAISE NOTICE 'performance_metrics table is fully functional!';
END $$;

-- Now create a simple function that uses the table
CREATE OR REPLACE FUNCTION public.record_performance_metric_simple(
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
        operation_name,
        execution_time_ms,
        recorded_at
    ) VALUES (
        p_operation_name,
        p_execution_time_ms,
        now()
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$;

-- Test the function
DO $$
DECLARE
    result_id UUID;
BEGIN
    result_id := public.record_performance_metric_simple('function_test', 200);
    
    IF result_id IS NULL THEN
        RAISE EXCEPTION 'Function test failed';
    END IF;
    
    -- Clean up
    DELETE FROM public.performance_metrics WHERE id = result_id;
    
    RAISE NOTICE 'Function test passed successfully!';
END $$;

COMMENT ON TABLE public.performance_metrics IS 'جدول مقاييس الأداء - تم إنشاؤه بنجاح';
