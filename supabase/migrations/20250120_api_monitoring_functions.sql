-- API Monitoring Database Functions
-- Migration: 20250120-api-monitoring-functions.sql
-- Purpose: Create stored functions for API monitoring data processing

-- Function to aggregate API metrics
CREATE OR REPLACE FUNCTION aggregate_api_metrics(
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_time_window VARCHAR(10) DEFAULT '1h'
)
RETURNS TABLE (
    endpoint_path VARCHAR(500),
    method VARCHAR(10),
    time_window VARCHAR(10),
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    average_response_time DECIMAL(10,2),
    p95_response_time DECIMAL(10,2),
    p99_response_time DECIMAL(10,2),
    min_response_time DECIMAL(10,2),
    max_response_time DECIMAL(10,2),
    error_rate DECIMAL(5,4),
    throughput DECIMAL(10,2),
    data_transferred BIGINT,
    errors_by_category JSONB,
    errors_by_status JSONB,
    company_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_window_duration INTERVAL;
    v_period_start TIMESTAMP WITH TIME ZONE;
    v_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate window duration
    v_window_duration := CASE p_time_window
        WHEN '1m' THEN INTERVAL '1 minute'
        WHEN '5m' THEN INTERVAL '5 minutes'
        WHEN '15m' THEN INTERVAL '15 minutes'
        WHEN '30m' THEN INTERVAL '30 minutes'
        WHEN '1h' THEN INTERVAL '1 hour'
        WHEN '6h' THEN INTERVAL '6 hours'
        WHEN '12h' THEN INTERVAL '12 hours'
        WHEN '24h' THEN INTERVAL '24 hours'
        ELSE INTERVAL '1 hour'
    END;

    -- Generate aggregated data for each time window
    RETURN QUERY
    WITH time_windows AS (
        SELECT
            generate_series(
                p_start_time,
                p_end_time - v_window_duration,
                v_window_duration
            ) AS window_start,
            generate_series(
                p_start_time + v_window_duration,
                p_end_time,
                v_window_duration
            ) AS window_end
    ),
    request_metrics AS (
        SELECT
            tw.window_start,
            tw.window_end,
            ar.url AS endpoint_path,
            ar.method,
            COALESCE(ar.company_id, ars.company_id) AS company_id,
            COUNT(*) AS total_requests,
            COUNT(CASE WHEN ars.status_code < 400 THEN 1 END) AS successful_requests,
            COUNT(CASE WHEN ars.status_code >= 400 THEN 1 END) AS failed_requests,
            ROUND(AVG(ars.response_time), 2) AS average_response_time,
            ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ars.response_time), 2) AS p95_response_time,
            ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ars.response_time), 2) AS p99_response_time,
            MIN(ars.response_time) AS min_response_time,
            MAX(ars.response_time) AS max_response_time,
            ROUND(COUNT(CASE WHEN ars.status_code >= 400 THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0), 4) AS error_rate,
            ROUND(COUNT(*)::DECIMAL / EXTRACT(EPOCH FROM (tw.window_end - tw.window_start)) * 60, 2) AS throughput,
            COALESCE(SUM(ars.response_size), 0) AS data_transferred,
            jsonb_build_object(
                'authentication', COUNT(CASE WHEN ars.error_category = 'authentication' THEN 1 END),
                'authorization', COUNT(CASE WHEN ars.error_category = 'authorization' THEN 1 END),
                'validation', COUNT(CASE WHEN ars.error_category = 'validation' THEN 1 END),
                'not_found', COUNT(CASE WHEN ars.error_category = 'not_found' THEN 1 END),
                'server_error', COUNT(CASE WHEN ars.error_category = 'server_error' THEN 1 END),
                'timeout', COUNT(CASE WHEN ars.error_category = 'timeout' THEN 1 END),
                'rate_limit', COUNT(CASE WHEN ars.error_category = 'rate_limit' THEN 1 END),
                'external_service', COUNT(CASE WHEN ars.error_category = 'external_service' THEN 1 END),
                'database', COUNT(CASE WHEN ars.error_category = 'database' THEN 1 END),
                'network', COUNT(CASE WHEN ars.error_category = 'network' THEN 1 END)
            ) AS errors_by_category,
            jsonb_object_agg(ars.status_code, status_count) AS errors_by_status
        FROM time_windows tw
        LEFT JOIN api_requests ar ON ar.request_timestamp >= tw.window_start AND ar.request_timestamp < tw.window_end
        LEFT JOIN api_responses ars ON ars.request_id = ar.request_id
        GROUP BY tw.window_start, tw.window_end, ar.url, ar.method, ar.company_id, ars.company_id
    )
    SELECT
        rm.endpoint_path,
        rm.method,
        p_time_window AS time_window,
        rm.total_requests,
        rm.successful_requests,
        rm.failed_requests,
        rm.average_response_time,
        rm.p95_response_time,
        rm.p99_response_time,
        rm.min_response_time,
        rm.max_response_time,
        rm.error_rate,
        rm.throughput,
        rm.data_transferred,
        rm.errors_by_category,
        COALESCE(rm.errors_by_status, '{}'::jsonb) AS errors_by_status,
        rm.company_id,
        rm.window_end AS timestamp
    FROM request_metrics rm
    WHERE rm.total_requests > 0
    ORDER BY rm.window_end, rm.endpoint_path, rm.method;
END;
$$;

-- Function to detect performance anomalies
CREATE OR REPLACE FUNCTION detect_performance_anomalies(
    p_endpoint_path VARCHAR(500) DEFAULT NULL,
    p_time_range_hours INTEGER DEFAULT 24,
    p_threshold_multiplier DECIMAL DEFAULT 2.5
)
RETURNS TABLE (
    detected_at TIMESTAMP WITH TIME ZONE,
    metric_name VARCHAR(50),
    current_value DECIMAL,
    expected_value DECIMAL,
    deviation_multiplier DECIMAL,
    severity VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_end_time TIMESTAMP WITH TIME ZONE := NOW();
    v_start_time TIMESTAMP WITH TIME ZONE := v_end_time - (p_time_range_hours || ' hours')::INTERVAL;
BEGIN
    RETURN QUERY
    WITH baseline_metrics AS (
        SELECT
            endpoint_path,
            method,
            AVG(average_response_time) AS avg_response_time,
            STDDEV(average_response_time) AS stddev_response_time,
            AVG(throughput) AS avg_throughput,
            STDDEV(throughput) AS stddev_throughput,
            AVG(error_rate) AS avg_error_rate,
            STDDEV(error_rate) AS stddev_error_rate
        FROM api_metrics
        WHERE timestamp >= v_start_time - INTERVAL '7 days' -- Use last 7 days as baseline
            AND timestamp < v_start_time
            AND (p_endpoint_path IS NULL OR endpoint_path = p_endpoint_path)
        GROUP BY endpoint_path, method
    ),
    current_metrics AS (
        SELECT
            m.endpoint_path,
            m.method,
            m.average_response_time,
            m.throughput,
            m.error_rate,
            m.timestamp
        FROM api_metrics m
        WHERE m.timestamp >= v_start_time
            AND m.timestamp < v_end_time
            AND (p_endpoint_path IS NULL OR m.endpoint_path = p_endpoint_path)
        ORDER BY m.timestamp DESC
        LIMIT 100 -- Recent metrics
    ),
    anomalies AS (
        SELECT
            cm.timestamp AS detected_at,
            'response_time'::VARCHAR AS metric_name,
            cm.average_response_time AS current_value,
            b.avg_response_time AS expected_value,
            ABS(cm.average_response_time - b.avg_response_time) / NULLIF(b.stddev_response_time, 0) AS deviation_multiplier,
            CASE
                WHEN ABS(cm.average_response_time - b.avg_response_time) / NULLIF(b.stddev_response_time, 0) > 4 THEN 'critical'
                WHEN ABS(cm.average_response_time - b.avg_response_time) / NULLIF(b.stddev_response_time, 0) > 3 THEN 'high'
                WHEN ABS(cm.average_response_time - b.avg_response_time) / NULLIF(b.stddev_response_time, 0) > 2 THEN 'medium'
                ELSE 'low'
            END AS severity
        FROM current_metrics cm
        JOIN baseline_metrics b ON cm.endpoint_path = b.endpoint_path AND cm.method = b.method
        WHERE ABS(cm.average_response_time - b.avg_response_time) / NULLIF(b.stddev_response_time, 0) > p_threshold_multiplier

        UNION ALL

        SELECT
            cm.timestamp AS detected_at,
            'throughput'::VARCHAR AS metric_name,
            cm.throughput AS current_value,
            b.avg_throughput AS expected_value,
            ABS(cm.throughput - b.avg_throughput) / NULLIF(b.stddev_throughput, 0) AS deviation_multiplier,
            CASE
                WHEN ABS(cm.throughput - b.avg_throughput) / NULLIF(b.stddev_throughput, 0) > 4 THEN 'critical'
                WHEN ABS(cm.throughput - b.avg_throughput) / NULLIF(b.stddev_throughput, 0) > 3 THEN 'high'
                WHEN ABS(cm.throughput - b.avg_throughput) / NULLIF(b.stddev_throughput, 0) > 2 THEN 'medium'
                ELSE 'low'
            END AS severity
        FROM current_metrics cm
        JOIN baseline_metrics b ON cm.endpoint_path = b.endpoint_path AND cm.method = b.method
        WHERE ABS(cm.throughput - b.avg_throughput) / NULLIF(b.stddev_throughput, 0) > p_threshold_multiplier

        UNION ALL

        SELECT
            cm.timestamp AS detected_at,
            'error_rate'::VARCHAR AS metric_name,
            cm.error_rate AS current_value,
            b.avg_error_rate AS expected_value,
            ABS(cm.error_rate - b.avg_error_rate) / NULLIF(b.stddev_error_rate, 0) AS deviation_multiplier,
            CASE
                WHEN ABS(cm.error_rate - b.avg_error_rate) / NULLIF(b.stddev_error_rate, 0) > 4 THEN 'critical'
                WHEN ABS(cm.error_rate - b.avg_error_rate) / NULLIF(b.stddev_error_rate, 0) > 3 THEN 'high'
                WHEN ABS(cm.error_rate - b.avg_error_rate) / NULLIF(b.stddev_error_rate, 0) > 2 THEN 'medium'
                ELSE 'low'
            END AS severity
        FROM current_metrics cm
        JOIN baseline_metrics b ON cm.endpoint_path = b.endpoint_path AND cm.method = b.method
        WHERE ABS(cm.error_rate - b.avg_error_rate) / NULLIF(b.stddev_error_rate, 0) > p_threshold_multiplier
    )
    SELECT * FROM anomalies
    ORDER BY detected_at DESC, severity DESC;
END;
$$;

-- Function to generate performance recommendations
CREATE OR REPLACE FUNCTION generate_performance_recommendations(
    p_company_id UUID DEFAULT NULL,
    p_time_range_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    recommendation_id UUID,
    priority VARCHAR(10),
    category VARCHAR(20),
    title VARCHAR(255),
    description TEXT,
    endpoint_path VARCHAR(500),
    impact_score DECIMAL(5,2),
    confidence_score DECIMAL(5,2),
    generated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH slow_endpoints AS (
        SELECT
            m.endpoint_path,
            m.method,
            AVG(m.average_response_time) AS avg_response_time,
            COUNT(*) AS sample_count
        FROM api_metrics m
        WHERE m.timestamp >= NOW() - (p_time_range_hours || ' hours')::INTERVAL
            AND (p_company_id IS NULL OR m.company_id = p_company_id)
            AND m.total_requests > 10 -- Only consider endpoints with sufficient traffic
        GROUP BY m.endpoint_path, m.method
        HAVING AVG(m.average_response_time) > 1000 -- Average response time > 1 second
    ),
    high_error_endpoints AS (
        SELECT
            m.endpoint_path,
            m.method,
            AVG(m.error_rate) AS avg_error_rate,
            COUNT(*) AS sample_count
        FROM api_metrics m
        WHERE m.timestamp >= NOW() - (p_time_range_hours || ' hours')::INTERVAL
            AND (p_company_id IS NULL OR m.company_id = p_company_id)
            AND m.total_requests > 10
        GROUP BY m.endpoint_path, m.method
        HAVING AVG(m.error_rate) > 0.05 -- Error rate > 5%
    ),
    low_throughput_endpoints AS (
        SELECT
            m.endpoint_path,
            m.method,
            AVG(m.throughput) AS avg_throughput,
            COUNT(*) AS sample_count
        FROM api_metrics m
        WHERE m.timestamp >= NOW() - (p_time_range_hours || ' hours')::INTERVAL
            AND (p_company_id IS NULL OR m.company_id = p_company_id)
            AND m.total_requests > 10
        GROUP BY m.endpoint_path, m.method
        HAVING AVG(m.throughput) < 1 -- Throughput < 1 request/minute
    )
    SELECT
        uuid_generate_v4() AS recommendation_id,
        CASE
            WHEN se.avg_response_time > 5000 THEN 'high'
            WHEN se.avg_response_time > 2000 THEN 'medium'
            ELSE 'low'
        END AS priority,
        'performance'::VARCHAR AS category,
        'Optimize slow endpoint: ' || se.endpoint_path AS title,
        'Endpoint ' || se.endpoint_path || ' (' || se.method || ') has an average response time of ' ||
        ROUND(se.avg_response_time, 0) || 'ms, which exceeds performance thresholds.' AS description,
        se.endpoint_path,
        LEAST((se.avg_response_time - 1000) / se.avg_response_time * 100, 50) AS impact_score,
        LEAST(se.sample_count / 100.0, 100) AS confidence_score,
        NOW() AS generated_at
    FROM slow_endpoints se

    UNION ALL

    SELECT
        uuid_generate_v4() AS recommendation_id,
        CASE
            WHEN hee.avg_error_rate > 0.10 THEN 'high'
            WHEN hee.avg_error_rate > 0.05 THEN 'medium'
            ELSE 'low'
        END AS priority,
        'reliability'::VARCHAR AS category,
        'Reduce high error rate: ' || hee.endpoint_path AS title,
        'Endpoint ' || hee.endpoint_path || ' (' || hee.method || ') has an error rate of ' ||
        ROUND(hee.avg_error_rate * 100, 2) || '%, which exceeds reliability thresholds.' AS description,
        hee.endpoint_path,
        LEAST((hee.avg_error_rate - 0.02) / hee.avg_error_rate * 100, 50) AS impact_score,
        LEAST(hee.sample_count / 100.0, 100) AS confidence_score,
        NOW() AS generated_at
    FROM high_error_endpoints hee

    UNION ALL

    SELECT
        uuid_generate_v4() AS recommendation_id,
        'medium'::VARCHAR AS priority,
        'usage'::VARCHAR AS category,
        'Investigate low throughput endpoint: ' || lte.endpoint_path AS title,
        'Endpoint ' || lte.endpoint_path || ' (' || lte.method || ') has low throughput (' ||
        ROUND(lte.avg_throughput, 2) || ' requests/minute). Consider if optimization is needed.' AS description,
        lte.endpoint_path,
        25 AS impact_score,
        LEAST(lte.sample_count / 100.0, 100) AS confidence_score,
        NOW() AS generated_at
    FROM low_throughput_endpoints lte

    ORDER BY
        CASE priority
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
        END,
        impact_score DESC;
END;
$$;

-- Function to get API health score
CREATE OR REPLACE FUNCTION calculate_api_health_score(
    p_company_id UUID DEFAULT NULL,
    p_time_range_hours INTEGER DEFAULT 1
)
RETURNS TABLE (
    endpoint_path VARCHAR(500),
    method VARCHAR(10),
    health_score DECIMAL(5,2),
    status VARCHAR(20),
    last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH recent_metrics AS (
        SELECT
            m.endpoint_path,
            m.method,
            m.average_response_time,
            m.error_rate,
            m.throughput,
            m.timestamp
        FROM api_metrics m
        WHERE m.timestamp >= NOW() - (p_time_range_hours || ' hours')::INTERVAL
            AND (p_company_id IS NULL OR m.company_id = p_company_id)
            AND m.time_window = '1h'
        ORDER BY m.timestamp DESC
    ),
    latest_metrics AS (
        SELECT DISTINCT ON (endpoint_path, method)
            endpoint_path,
            method,
            average_response_time,
            error_rate,
            throughput,
            timestamp
        FROM recent_metrics
        ORDER BY endpoint_path, method, timestamp DESC
    )
    SELECT
        lm.endpoint_path,
        lm.method,
        GREATEST(0, LEAST(100,
            100 -
            -- Penalty for high error rate (max 50 points)
            CASE
                WHEN lm.error_rate > 0.10 THEN 50
                WHEN lm.error_rate > 0.05 THEN 25
                WHEN lm.error_rate > 0.01 THEN 10
                ELSE 0
            END -
            -- Penalty for slow response time (max 40 points)
            CASE
                WHEN lm.average_response_time > 5000 THEN 40
                WHEN lm.average_response_time > 2000 THEN 25
                WHEN lm.average_response_time > 1000 THEN 15
                WHEN lm.average_response_time > 500 THEN 5
                ELSE 0
            END -
            -- Penalty for low throughput (max 10 points)
            CASE
                WHEN lm.throughput < 0.1 THEN 10
                WHEN lm.throughput < 1 THEN 5
                ELSE 0
            END
        )) AS health_score,
        CASE
            WHEN lm.error_rate > 0.10 OR lm.average_response_time > 5000 THEN 'unhealthy'
            WHEN lm.error_rate > 0.05 OR lm.average_response_time > 2000 THEN 'degraded'
            ELSE 'healthy'
        END AS status,
        lm.timestamp AS last_updated
    FROM latest_metrics lm
    ORDER BY lm.endpoint_path, lm.method;
END;
$$;

-- Function to cleanup old monitoring data
CREATE OR REPLACE FUNCTION cleanup_monitoring_data(
    p_retention_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    table_name TEXT,
    records_deleted BIGINT,
    space_freed_mb DECIMAL(10,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cutoff_date TIMESTAMP WITH TIME ZONE;
    v_records_deleted BIGINT;
    v_space_freed BIGINT;
BEGIN
    v_cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;

    -- Cleanup old request logs
    DELETE FROM api_requests
    WHERE request_timestamp < v_cutoff_date
    RETURNING 1 INTO v_records_deleted;
    GET DIAGNOSTICS v_space_freed = ROW_COUNT;

    RETURN QUERY
    SELECT 'api_requests'::TEXT, v_records_deleted, ROUND(v_space_freed * 0.001, 2);

    -- Cleanup old response logs
    DELETE FROM api_responses
    WHERE response_timestamp < v_cutoff_date
    RETURNING 1 INTO v_records_deleted;
    GET DIAGNOSTICS v_space_freed = ROW_COUNT;

    RETURN QUERY
    SELECT 'api_responses'::TEXT, v_records_deleted, ROUND(v_space_freed * 0.001, 2);

    -- Cleanup old rate limit records
    DELETE FROM api_rate_limits
    WHERE window_end < NOW() - INTERVAL '7 days'
    RETURNING 1 INTO v_records_deleted;
    GET DIAGNOSTICS v_space_freed = ROW_COUNT;

    RETURN QUERY
    SELECT 'api_rate_limits'::TEXT, v_records_deleted, ROUND(v_space_freed * 0.001, 2);

    -- Cleanup old detailed metrics (keep aggregated longer)
    DELETE FROM api_metrics
    WHERE timestamp < v_cutoff_date
        AND time_window IN ('1m', '5m', '15m', '30m')
    RETURNING 1 INTO v_records_deleted;
    GET DIAGNOSTICS v_space_freed = ROW_COUNT;

    RETURN QUERY
    SELECT 'api_metrics_detailed'::TEXT, v_records_deleted, ROUND(v_space_freed * 0.001, 2);

    -- Update table statistics
    ANALYZE api_requests;
    ANALYZE api_responses;
    ANALYZE api_metrics;
    ANALYZE api_rate_limits;
END;
$$;

-- Create trigger function to automatically aggregate metrics
CREATE OR REPLACE FUNCTION auto_aggregate_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- This function will be called by a scheduled job
    -- It calls the aggregation function for different time windows

    PERFORM 1; -- Placeholder

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION aggregate_api_metrics TO service_role;
GRANT EXECUTE ON FUNCTION detect_performance_anomalies TO service_role;
GRANT EXECUTE ON FUNCTION generate_performance_recommendations TO service_role;
GRANT EXECUTE ON FUNCTION calculate_api_health_score TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_monitoring_data TO service_role;

COMMIT;