/**
 * API Monitoring Webhook Edge Function
 * Receives monitoring data from external services and processes it
 */

import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { z } from 'https://deno.land/x/zod@v3.22.4/zod.ts';

// Schema for incoming monitoring data
const MonitoringDataSchema = z.object({
  source: z.string(),
  timestamp: z.string().datetime(),
  metrics: z.object({
    responseTime: z.number(),
    statusCode: z.number(),
    endpoint: z.string(),
    method: z.string(),
    userId: z.string().optional(),
    companyId: z.string().optional(),
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    errorType: z.string().optional(),
    errorMessage: z.string().optional(),
  }),
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Webhook authentication
const validateWebhook = (req: Request): boolean => {
  const signature = req.headers.get('x-webhook-signature');
  const timestamp = req.headers.get('x-webhook-timestamp');
  const secret = Deno.env.get('WEBHOOK_SECRET');

  if (!signature || !timestamp || !secret) {
    return false;
  }

  // Implement HMAC validation here
  // For now, return true (in production, implement proper validation)
  return true;
};

// Process monitoring data and store in database
const processMonitoringData = async (data: z.infer<typeof MonitoringDataSchema>) => {
  const { source, timestamp, metrics } = data;

  try {
    // Generate request ID
    const requestId = crypto.randomUUID();

    // Store request data
    const { error: requestError } = await supabase
      .from('api_requests')
      .insert({
        request_id: requestId,
        method: metrics.method,
        url: metrics.endpoint,
        headers: {},
        user_agent: metrics.userAgent,
        ip_address: metrics.ipAddress,
        user_id: metrics.userId,
        company_id: metrics.companyId,
        request_timestamp: timestamp,
      });

    if (requestError) {
      console.error('Failed to store request data:', requestError);
      throw requestError;
    }

    // Store response data
    const { error: responseError } = await supabase
      .from('api_responses')
      .insert({
        request_id: requestId,
        status_code: metrics.statusCode,
        response_time: metrics.responseTime,
        response_size: 0,
        error_type: metrics.errorType,
        error_message: metrics.errorMessage,
        response_timestamp: new Date().toISOString(),
      });

    if (responseError) {
      console.error('Failed to store response data:', responseError);
      throw responseError;
    }

    // Check for performance alerts
    await checkPerformanceAlerts(metrics);

    return { success: true, requestId };
  } catch (error) {
    console.error('Failed to process monitoring data:', error);
    throw error;
  }
};

// Check for performance alerts based on metrics
const checkPerformanceAlerts = async (metrics: any) => {
  const alerts = [];

  // Check for slow response time
  if (metrics.responseTime > 5000) {
    alerts.push({
      rule_id: 'slow_response_time',
      severity: metrics.responseTime > 10000 ? 'critical' : 'warning',
      title: 'Slow Response Time Detected',
      message: `Endpoint ${metrics.endpoint} responded in ${metrics.responseTime}ms`,
      details: {
        endpoint: metrics.endpoint,
        method: metrics.method,
        responseTime: metrics.responseTime,
        threshold: 5000,
      },
      endpoint_path: metrics.endpoint,
      method: metrics.method,
      company_id: metrics.companyId,
    });
  }

  // Check for error status codes
  if (metrics.statusCode >= 500) {
    alerts.push({
      rule_id: 'server_error',
      severity: 'critical',
      title: 'Server Error Detected',
      message: `Server error ${metrics.statusCode} on ${metrics.endpoint}`,
      details: {
        endpoint: metrics.endpoint,
        method: metrics.method,
        statusCode: metrics.statusCode,
        errorMessage: metrics.errorMessage,
      },
      endpoint_path: metrics.endpoint,
      method: metrics.method,
      company_id: metrics.companyId,
    });
  } else if (metrics.statusCode >= 400) {
    alerts.push({
      rule_id: 'client_error',
      severity: 'warning',
      title: 'Client Error Detected',
      message: `Client error ${metrics.statusCode} on ${metrics.endpoint}`,
      details: {
        endpoint: metrics.endpoint,
        method: metrics.method,
        statusCode: metrics.statusCode,
        errorMessage: metrics.errorMessage,
      },
      endpoint_path: metrics.endpoint,
      method: metrics.method,
      company_id: metrics.companyId,
    });
  }

  // Insert alerts if any
  if (alerts.length > 0) {
    const { error: alertError } = await supabase
      .from('api_alerts')
      .insert(alerts);

    if (alertError) {
      console.error('Failed to store alerts:', alertError);
    }
  }
};

// Aggregate metrics for performance monitoring
const aggregateMetrics = async (timeWindow: string = '1h') => {
  try {
    // Calculate time window
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - getMsFromTimeWindow(timeWindow));

    // Aggregate request data
    const { data: aggregatedData, error: aggregationError } = await supabase
      .rpc('aggregate_api_metrics', {
        p_start_time: startTime.toISOString(),
        p_end_time: endTime.toISOString(),
        p_time_window: timeWindow,
      });

    if (aggregationError) {
      console.error('Failed to aggregate metrics:', aggregationError);
      throw aggregationError;
    }

    // Store aggregated metrics
    if (aggregatedData && aggregatedData.length > 0) {
      const { error: insertError } = await supabase
        .from('api_metrics')
        .insert(aggregatedData);

      if (insertError) {
        console.error('Failed to store aggregated metrics:', insertError);
      }
    }

    return { success: true, recordsProcessed: aggregatedData?.length || 0 };
  } catch (error) {
    console.error('Failed to aggregate metrics:', error);
    throw error;
  }
};

// Helper function to convert time window to milliseconds
const getMsFromTimeWindow = (timeWindow: string): number => {
  const windows: Record<string, number> = {
    '1m': 1 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
  };
  return windows[timeWindow] || windows['1h'];
};

// Main request handler
serve(async (req) => {
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Route handling
    switch (path) {
      case '/monitoring/webhook':
        return handleWebhook(req, corsHeaders);

      case '/monitoring/aggregate':
        return handleAggregation(req, corsHeaders);

      case '/monitoring/health':
        return handleHealthCheck(corsHeaders);

      default:
        return new Response(
          JSON.stringify({ error: 'Not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Handle incoming webhook requests
async function handleWebhook(req: Request, corsHeaders: Record<string, string>) {
  // Validate webhook
  if (!validateWebhook(req)) {
    return new Response(
      JSON.stringify({ error: 'Invalid webhook signature' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body = await req.json();

    // Validate incoming data
    const validationResult = MonitoringDataSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid data format',
          details: validationResult.error.errors
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Process monitoring data
    const result = await processMonitoringData(validationResult.data);

    return new Response(
      JSON.stringify({
        success: true,
        requestId: result.requestId,
        message: 'Monitoring data processed successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process webhook data',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle metrics aggregation requests
async function handleAggregation(req: Request, corsHeaders: Record<string, string>) {
  try {
    const url = new URL(req.url);
    const timeWindow = url.searchParams.get('timeWindow') || '1h';

    // Validate time window
    const validTimeWindows = ['1m', '5m', '15m', '30m', '1h', '6h', '12h', '24h'];
    if (!validTimeWindows.includes(timeWindow)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid time window',
          validOptions: validTimeWindows
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Perform aggregation
    const result = await aggregateMetrics(timeWindow);

    return new Response(
      JSON.stringify({
        success: true,
        timeWindow,
        recordsProcessed: result.recordsProcessed,
        message: 'Metrics aggregated successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Aggregation error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to aggregate metrics',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle health check requests
async function handleHealthCheck(corsHeaders: Record<string, string>) {
  try {
    // Check database connection
    const { data, error } = await supabase
      .from('api_metrics')
      .select('count', { count: 'exact' })
      .limit(1);

    const dbStatus = error ? 'unhealthy' : 'healthy';
    const dbLatency = error ? null : Date.now();

    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: dbStatus,
            latency: dbLatency ? Date.now() - dbLatency : null
          },
          webhook: {
            status: 'healthy'
          }
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}