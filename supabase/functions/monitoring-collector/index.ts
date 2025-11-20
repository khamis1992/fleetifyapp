/**
 * Monitoring Data Collector Edge Function
 * Collects and processes monitoring data from the frontend
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface MonitoringData {
  type: 'metric' | 'error' | 'user_event' | 'business_metric' | 'log'
  data: any
  timestamp: number
}

interface MetricData {
  name: string
  value: number
  unit: string
  timestamp: number
  tags: Record<string, string>
  context?: Record<string, any>
}

interface ErrorData {
  message: string
  stack?: string
  context?: Record<string, any>
  timestamp: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  type?: string
}

interface LogData {
  logs: Array<{
    level: string
    message: string
    timestamp: number
    context?: Record<string, any>
    tags?: Record<string, string>
  }>
  timestamp: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Route handling
    if (path === '/api/monitoring/metrics' && req.method === 'POST') {
      return await handleMetrics(req, supabase)
    } else if (path === '/api/monitoring/logs' && req.method === 'POST') {
      return await handleLogs(req, supabase)
    } else if (path === '/api/monitoring/errors' && req.method === 'POST') {
      return await handleErrors(req, supabase)
    } else if (path === '/api/monitoring/alerts' && req.method === 'POST') {
      return await handleAlerts(req, supabase)
    } else if (path === '/api/monitoring/health' && req.method === 'GET') {
      return await handleHealthCheck(req, supabase)
    } else {
      return new Response('Not Found', { status: 404, headers: corsHeaders })
    }
  } catch (error) {
    console.error('Monitoring collector error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleMetrics(req: Request, supabase: any) {
  try {
    const data: MonitoringData = await req.json()

    if (data.type === 'metric') {
      const metric: MetricData = data.data

      // Insert into monitoring_metrics table
      const { error } = await supabase
        .from('monitoring_metrics')
        .insert({
          metric_name: metric.name,
          metric_value: metric.value,
          metric_unit: metric.unit,
          timestamp: new Date(metric.timestamp).toISOString(),
          tags: metric.tags || {},
          context: metric.context || {}
        })

      if (error) throw error
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Metric recorded' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error handling metrics:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to record metric' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleLogs(req: Request, supabase: any) {
  try {
    const data: LogData = await req.json()

    // Process logs and insert into error_logs if they're errors
    for (const log of data.logs) {
      if (log.level === 'error') {
        // Generate error fingerprint
        const errorId = generateErrorFingerprint(log.message, log.context)

        // Check if error already exists
        const { data: existingError } = await supabase
          .from('error_logs')
          .select('*')
          .eq('error_id', errorId)
          .single()

        if (existingError) {
          // Update existing error
          await supabase
            .from('error_logs')
            .update({
              occurrences: existingError.occurrences + 1,
              last_seen: new Date(log.timestamp).toISOString()
            })
            .eq('id', existingError.id)
        } else {
          // Insert new error
          await supabase
            .from('error_logs')
            .insert({
              error_id: errorId,
              error_name: 'Frontend Error',
              error_message: log.message,
              error_type: log.context?.component === 'api' ? 'api' : 'javascript',
              severity: log.context?.severity || 'medium',
              url: log.context?.url,
              component: log.context?.component,
              action: log.context?.action,
              additional_data: log.context?.additionalData || {},
              first_seen: new Date(log.timestamp).toISOString(),
              last_seen: new Date(log.timestamp).toISOString()
            })
        }
      }

      // Could also store general logs in a separate table if needed
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Logs processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error handling logs:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process logs' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleErrors(req: Request, supabase: any) {
  try {
    const data: MonitoringData = await req.json()

    if (data.type === 'error') {
      const error: ErrorData = data.data

      // Generate error fingerprint
      const errorId = generateErrorFingerprint(error.message, error.context)

      // Check if error already exists
      const { data: existingError } = await supabase
        .from('error_logs')
        .select('*')
        .eq('error_id', errorId)
        .single()

      if (existingError) {
        // Update existing error
        const { error: updateError } = await supabase
          .from('error_logs')
          .update({
            occurrences: existingError.occurrences + 1,
            last_seen: new Date(error.timestamp).toISOString()
          })
          .eq('id', existingError.id)

        if (updateError) throw updateError
      } else {
        // Insert new error
        const { error: insertError } = await supabase
          .from('error_logs')
          .insert({
            error_id: errorId,
            error_name: error.message.split(':')[0] || 'Unknown Error',
            error_message: error.message,
            error_stack: error.stack,
            error_type: error.type || 'javascript',
            severity: error.severity || 'medium',
            url: error.context?.url,
            component: error.context?.component,
            action: error.context?.action,
            additional_data: error.context?.additionalData || {},
            first_seen: new Date(error.timestamp).toISOString(),
            last_seen: new Date(error.timestamp).toISOString()
          })

        if (insertError) throw insertError
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Error recorded' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error handling errors:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to record error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleAlerts(req: Request, supabase: any) {
  try {
    const data = await req.json()
    const { rule, timestamp } = data

    // Generate unique alert ID
    const alertId = generateAlertId()

    // Check if alert rule exists
    const { data: ruleData } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('id', rule.id)
      .single()

    if (!ruleData) {
      return new Response(
        JSON.stringify({ error: 'Alert rule not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert monitoring alert
    const { error } = await supabase
      .from('monitoring_alerts')
      .insert({
        alert_id: alertId,
        rule_id: rule.id,
        severity: rule.severity,
        message: `${rule.name}: ${rule.condition}`,
        triggered_at: new Date(timestamp).toISOString()
      })

    if (error) throw error

    // Here you could implement actual notification sending
    // For now, we'll just log it
    console.log(`Alert triggered: ${rule.name} - ${rule.condition}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Alert created', alertId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error handling alerts:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create alert' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleHealthCheck(req: Request, supabase: any) {
  try {
    // Check database connectivity
    const { data, error } = await supabase
      .from('monitoring_metrics')
      .select('count')
      .limit(1)

    const dbHealth = error ? 'unhealthy' : 'healthy'
    const dbResponseTime = Date.now() // Simplified response time

    // Check system resources (basic check)
    const systemHealth = {
      status: dbHealth === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbHealth,
          responseTime: dbResponseTime
        },
        memory: {
          status: 'healthy', // Would need actual monitoring
          usage: Deno.metrics().heapUsed
        },
        disk: {
          status: 'healthy', // Would need actual monitoring
          usage: 'unknown'
        }
      }
    }

    return new Response(
      JSON.stringify(systemHealth),
      {
        status: dbHealth === 'healthy' ? 200 : 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error in health check:', error)
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

// Utility functions
function generateErrorFingerprint(message: string, context?: Record<string, any>): string {
  const fingerprintData = {
    message,
    name: context?.component || 'unknown',
    action: context?.action || 'unknown',
    url: context?.url || 'unknown'
  }

  const fingerprintString = JSON.stringify(fingerprintData)
  return btoa(fingerprintString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
}

function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}