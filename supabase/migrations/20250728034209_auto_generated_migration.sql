-- Complete Phase 2: Remaining Functions and Automated Tasks

-- 9. Create automated cleanup functions
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete logs older than 90 days (except critical errors)
    DELETE FROM public.system_logs 
    WHERE created_at < now() - INTERVAL '90 days'
    AND level NOT IN ('error', 'critical');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete performance metrics older than 30 days
    DELETE FROM public.performance_metrics 
    WHERE recorded_at < now() - INTERVAL '30 days';
    
    -- Auto-resolve expired alerts
    UPDATE public.system_alerts 
    SET status = 'resolved', resolved_at = now()
    WHERE expires_at < now() AND status = 'active';
    
    RETURN deleted_count;
END;
$$;

-- 10. Create quota enforcement functions
CREATE OR REPLACE FUNCTION public.check_company_quotas(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_usage record;
    plan_limits record;
    quota_status jsonb := '{}';
    quota_violations text[] := ARRAY[]::text[];
BEGIN
    -- Get current usage
    SELECT * INTO current_usage FROM public.company_usage 
    WHERE company_id = company_id_param 
    AND usage_date = CURRENT_DATE;
    
    -- Get plan limits
    SELECT sp.* INTO plan_limits 
    FROM public.companies c
    JOIN public.subscription_plans sp ON c.current_plan_id = sp.id
    WHERE c.id = company_id_param;
    
    -- Check quotas
    IF plan_limits.max_users IS NOT NULL AND current_usage.users_count > plan_limits.max_users THEN
        quota_violations := array_append(quota_violations, 'users_limit_exceeded');
    END IF;
    
    IF plan_limits.max_customers IS NOT NULL AND current_usage.customers_count > plan_limits.max_customers THEN
        quota_violations := array_append(quota_violations, 'customers_limit_exceeded');
    END IF;
    
    IF plan_limits.max_contracts IS NOT NULL AND current_usage.contracts_count > plan_limits.max_contracts THEN
        quota_violations := array_append(quota_violations, 'contracts_limit_exceeded');
    END IF;
    
    IF plan_limits.max_vehicles IS NOT NULL AND current_usage.vehicles_count > plan_limits.max_vehicles THEN
        quota_violations := array_append(quota_violations, 'vehicles_limit_exceeded');
    END IF;
    
    -- Build status response
    quota_status := jsonb_build_object(
        'company_id', company_id_param,
        'plan_code', plan_limits.plan_code,
        'current_usage', row_to_json(current_usage),
        'plan_limits', row_to_json(plan_limits),
        'violations', quota_violations,
        'is_compliant', array_length(quota_violations, 1) IS NULL,
        'checked_at', now()
    );
    
    -- Create alerts for violations
    IF array_length(quota_violations, 1) > 0 THEN
        PERFORM public.create_system_alert(
            company_id_param,
            'quota',
            'high',
            'Subscription Quota Exceeded',
            'Your current usage exceeds your subscription plan limits. Please upgrade your plan or reduce usage.',
            jsonb_build_object('violations', quota_violations, 'usage', current_usage),
            72
        );
    END IF;
    
    RETURN quota_status;
END;
$$;

-- 11. Create automated monitoring triggers
CREATE OR REPLACE FUNCTION public.trigger_system_monitoring()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Log important operations
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_system_event(
            NEW.company_id,
            auth.uid(),
            'info',
            TG_TABLE_NAME,
            'create',
            'New ' || TG_TABLE_NAME || ' record created',
            jsonb_build_object('record_id', NEW.id),
            TG_TABLE_NAME,
            NEW.id
        );
        
        -- Update usage stats for relevant tables
        IF TG_TABLE_NAME IN ('customers', 'contracts', 'employees', 'vehicles') THEN
            PERFORM public.update_company_usage_stats(NEW.company_id);
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_system_event(
            NEW.company_id,
            auth.uid(),
            'info',
            TG_TABLE_NAME,
            'update',
            TG_TABLE_NAME || ' record updated',
            jsonb_build_object('record_id', NEW.id, 'changes', jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))),
            TG_TABLE_NAME,
            NEW.id
        );
        
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_system_event(
            OLD.company_id,
            auth.uid(),
            'warn',
            TG_TABLE_NAME,
            'delete',
            TG_TABLE_NAME || ' record deleted',
            jsonb_build_object('record_id', OLD.id, 'deleted_data', row_to_json(OLD)),
            TG_TABLE_NAME,
            OLD.id
        );
        
        -- Update usage stats for relevant tables
        IF TG_TABLE_NAME IN ('customers', 'contracts', 'employees', 'vehicles') THEN
            PERFORM public.update_company_usage_stats(OLD.company_id);
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply monitoring triggers to key tables
DROP TRIGGER IF EXISTS system_monitoring_trigger ON public.customers;
CREATE TRIGGER system_monitoring_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_system_monitoring();

DROP TRIGGER IF EXISTS system_monitoring_trigger ON public.contracts;
CREATE TRIGGER system_monitoring_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_system_monitoring();

DROP TRIGGER IF EXISTS system_monitoring_trigger ON public.employees;
CREATE TRIGGER system_monitoring_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_system_monitoring();

-- 12. Create performance analysis functions
CREATE OR REPLACE FUNCTION public.analyze_system_performance(company_id_param uuid, hours_back integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    performance_summary jsonb;
    error_count integer;
    warning_count integer;
    avg_response_time numeric;
    total_operations integer;
BEGIN
    -- Count errors and warnings
    SELECT COUNT(*) INTO error_count
    FROM public.system_logs
    WHERE company_id = company_id_param
    AND level = 'error'
    AND created_at >= now() - (hours_back || ' hours')::interval;
    
    SELECT COUNT(*) INTO warning_count
    FROM public.system_logs
    WHERE company_id = company_id_param
    AND level = 'warn'
    AND created_at >= now() - (hours_back || ' hours')::interval;
    
    -- Calculate average response time
    SELECT AVG(duration_ms) INTO avg_response_time
    FROM public.system_logs
    WHERE company_id = company_id_param
    AND duration_ms IS NOT NULL
    AND created_at >= now() - (hours_back || ' hours')::interval;
    
    -- Count total operations
    SELECT COUNT(*) INTO total_operations
    FROM public.system_logs
    WHERE company_id = company_id_param
    AND created_at >= now() - (hours_back || ' hours')::interval;
    
    -- Build performance summary
    performance_summary := jsonb_build_object(
        'company_id', company_id_param,
        'analysis_period_hours', hours_back,
        'total_operations', total_operations,
        'error_count', error_count,
        'warning_count', warning_count,
        'error_rate_percent', CASE WHEN total_operations > 0 THEN (error_count::numeric / total_operations * 100) ELSE 0 END,
        'avg_response_time_ms', COALESCE(avg_response_time, 0),
        'health_status', CASE 
            WHEN error_count = 0 AND warning_count < 5 THEN 'excellent'
            WHEN error_count < 5 AND warning_count < 20 THEN 'good'
            WHEN error_count < 20 THEN 'warning'
            ELSE 'critical'
        END,
        'analyzed_at', now()
    );
    
    -- Record performance metric
    PERFORM public.record_performance_metric(
        company_id_param,
        'system_health_score',
        CASE 
            WHEN error_count = 0 AND warning_count < 5 THEN 100
            WHEN error_count < 5 AND warning_count < 20 THEN 80
            WHEN error_count < 20 THEN 60
            ELSE 30
        END,
        'score',
        jsonb_build_object('period_hours', hours_back)
    );
    
    -- Create alerts for poor performance
    IF error_count > 10 OR (total_operations > 0 AND (error_count::numeric / total_operations * 100) > 5) THEN
        PERFORM public.create_system_alert(
            company_id_param,
            'performance',
            'high',
            'High Error Rate Detected',
            'System is experiencing higher than normal error rates. Please investigate.',
            performance_summary,
            24
        );
    END IF;
    
    RETURN performance_summary;
END;
$$;

-- 13. Create automated backup preparation function
CREATE OR REPLACE FUNCTION public.prepare_company_backup(company_id_param uuid, backup_type_param text DEFAULT 'full')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    backup_id uuid;
    tables_to_backup text[] := ARRAY[
        'customers', 'contracts', 'employees', 'attendance_records',
        'chart_of_accounts', 'journal_entries', 'journal_entry_lines',
        'budgets', 'budget_items', 'payments', 'invoices'
    ];
    total_records integer := 0;
    table_name text;
    table_count integer;
BEGIN
    -- Create backup log entry
    INSERT INTO public.backup_logs (
        company_id,
        backup_type,
        status,
        metadata
    ) VALUES (
        company_id_param,
        backup_type_param,
        'pending',
        jsonb_build_object('tables', tables_to_backup, 'requested_by', auth.uid())
    ) RETURNING id INTO backup_id;
    
    -- Count records for each table
    FOREACH table_name IN ARRAY tables_to_backup
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE company_id = %L', table_name, company_id_param) INTO table_count;
            total_records := total_records + table_count;
        EXCEPTION
            WHEN undefined_table OR undefined_column THEN
                -- Skip tables that don't exist or don't have company_id
                CONTINUE;
        END;
    END LOOP;
    
    -- Update backup log with record count
    UPDATE public.backup_logs
    SET records_count = total_records,
        metadata = metadata || jsonb_build_object('estimated_records', total_records)
    WHERE id = backup_id;
    
    -- Log the backup preparation
    PERFORM public.log_system_event(
        company_id_param,
        auth.uid(),
        'info',
        'backup',
        'prepare',
        'Backup preparation completed for ' || total_records || ' records',
        jsonb_build_object('backup_id', backup_id, 'type', backup_type_param, 'records', total_records),
        'backup',
        backup_id
    );
    
    RETURN backup_id;
END;
$$;

-- 14. Create system health check function
CREATE OR REPLACE FUNCTION public.system_health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    health_report jsonb;
    total_companies integer;
    active_users integer;
    system_errors integer;
    database_size text;
BEGIN
    -- Gather system statistics
    SELECT COUNT(*) INTO total_companies FROM public.companies WHERE is_active = true;
    SELECT COUNT(DISTINCT user_id) INTO active_users FROM public.system_logs WHERE created_at >= now() - INTERVAL '24 hours';
    SELECT COUNT(*) INTO system_errors FROM public.system_logs WHERE level = 'error' AND created_at >= now() - INTERVAL '1 hour';
    
    -- Get database size (approximate)
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO database_size;
    
    -- Build health report
    health_report := jsonb_build_object(
        'timestamp', now(),
        'status', CASE WHEN system_errors < 10 THEN 'healthy' ELSE 'degraded' END,
        'total_companies', total_companies,
        'active_users_24h', active_users,
        'system_errors_1h', system_errors,
        'database_size', database_size,
        'uptime_check', true,
        'last_cleanup', (SELECT MAX(created_at) FROM public.system_logs WHERE action = 'cleanup'),
        'pending_alerts', (SELECT COUNT(*) FROM public.system_alerts WHERE status = 'active')
    );
    
    -- Record system health metric
    PERFORM public.record_performance_metric(
        NULL, -- System-wide metric
        'system_health',
        CASE WHEN system_errors < 10 THEN 100 ELSE 50 END,
        'score',
        health_report
    );
    
    RETURN health_report;
END;
$$;