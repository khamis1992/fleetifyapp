import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  company_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    // Authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const companyId = profile?.company_id
    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not associated with a company' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let response: ApiResponse

    // Route handling
    if (path === '/financial-operations-api/customers' && method === 'GET') {
      response = await getCustomers(supabase, companyId, url.searchParams)
    } else if (path === '/financial-operations-api/customers' && method === 'POST') {
      const body = await req.json()
      response = await createCustomer(supabase, companyId, body, user.id)
    } else if (path.startsWith('/financial-operations-api/customers/') && method === 'GET') {
      const customerId = path.split('/').pop()
      response = await getCustomerDetails(supabase, companyId, customerId!)
    } else if (path === '/financial-operations-api/obligations' && method === 'GET') {
      response = await getFinancialObligations(supabase, companyId, url.searchParams)
    } else if (path === '/financial-operations-api/payments/allocate' && method === 'POST') {
      const body = await req.json()
      response = await allocatePayment(supabase, companyId, body)
    } else if (path === '/financial-operations-api/reports/aging' && method === 'GET') {
      response = await getAgingReport(supabase, companyId, url.searchParams)
    } else if (path === '/financial-operations-api/alerts' && method === 'GET') {
      response = await getSmartAlerts(supabase, companyId, url.searchParams)
    } else if (path === '/financial-operations-api/alerts/run-check' && method === 'POST') {
      response = await runAlertsCheck(supabase, companyId)
    } else if (path === '/financial-operations-api/webhooks/register' && method === 'POST') {
      const body = await req.json()
      response = await registerWebhook(supabase, companyId, body)
    } else {
      response = { success: false, error: 'Endpoint not found' }
    }

    const status = response.success ? 200 : 400
    return new Response(
      JSON.stringify(response),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('API Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// API Functions

async function getCustomers(supabase: any, companyId: string, params: URLSearchParams): Promise<ApiResponse> {
  const limit = parseInt(params.get('limit') || '50')
  const offset = parseInt(params.get('offset') || '0')
  const search = params.get('search')
  const status = params.get('status')

  let query = supabase
    .from('customers')
    .select(`
      id,
      first_name,
      last_name,
      company_name,
      customer_type,
      phone,
      email,
      is_active,
      is_blacklisted,
      credit_limit,
      created_at,
      customer_balances (
        current_balance,
        overdue_amount,
        credit_available
      )
    `)
    .eq('company_id', companyId)
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  } else if (status === 'blacklisted') {
    query = query.eq('is_blacklisted', true)
  }

  const { data, error, count } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    data: {
      customers: data,
      total: count,
      limit,
      offset
    }
  }
}

async function createCustomer(supabase: any, companyId: string, customerData: any, userId: string): Promise<ApiResponse> {
  // Validate required fields
  if (!customerData.phone) {
    return { success: false, error: 'Phone number is required' }
  }

  if (customerData.customer_type === 'individual') {
    if (!customerData.first_name || !customerData.last_name) {
      return { success: false, error: 'First name and last name are required for individual customers' }
    }
  } else if (customerData.customer_type === 'corporate') {
    if (!customerData.company_name) {
      return { success: false, error: 'Company name is required for corporate customers' }
    }
  }

  const finalData = {
    ...customerData,
    company_id: companyId,
    is_active: true,
    is_blacklisted: false,
    created_by: userId
  }

  const { data, error } = await supabase
    .from('customers')
    .insert([finalData])
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Send webhook notification
  await sendWebhook(supabase, companyId, {
    event: 'customer.created',
    data: data,
    timestamp: new Date().toISOString(),
    company_id: companyId
  })

  return {
    success: true,
    data: data,
    message: 'Customer created successfully'
  }
}

async function getCustomerDetails(supabase: any, companyId: string, customerId: string): Promise<ApiResponse> {
  // Get customer basic info
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('company_id', companyId)
    .single()

  if (customerError) {
    return { success: false, error: customerError.message }
  }

  // Get financial summary
  const { data: financialSummary, error: summaryError } = await supabase
    .rpc('get_customer_financial_summary', {
      p_customer_id: customerId,
      p_company_id: companyId
    })

  if (summaryError) {
    return { success: false, error: summaryError.message }
  }

  return {
    success: true,
    data: {
      customer,
      financial_summary: financialSummary
    }
  }
}

async function getFinancialObligations(supabase: any, companyId: string, params: URLSearchParams): Promise<ApiResponse> {
  const customerId = params.get('customer_id')
  const contractId = params.get('contract_id')
  const status = params.get('status')
  const limit = parseInt(params.get('limit') || '100')
  const offset = parseInt(params.get('offset') || '0')

  let query = supabase
    .from('financial_obligations')
    .select(`
      *,
      customers (
        first_name,
        last_name,
        company_name,
        customer_type
      ),
      contracts (
        contract_number,
        contract_type
      )
    `)
    .eq('company_id', companyId)
    .range(offset, offset + limit - 1)
    .order('due_date', { ascending: true })

  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  if (contractId) {
    query = query.eq('contract_id', contractId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    data: data
  }
}

async function allocatePayment(supabase: any, companyId: string, allocationData: any): Promise<ApiResponse> {
  const { payment_id, customer_id, amount, strategy = 'fifo' } = allocationData

  if (!payment_id || !customer_id || !amount) {
    return { success: false, error: 'Missing required fields: payment_id, customer_id, amount' }
  }

  const { data, error } = await supabase
    .rpc('allocate_payment_smart', {
      p_payment_id: payment_id,
      p_customer_id: customer_id,
      p_company_id: companyId,
      p_amount: amount,
      p_strategy: strategy
    })

  if (error) {
    return { success: false, error: error.message }
  }

  // Send webhook notification
  await sendWebhook(supabase, companyId, {
    event: 'payment.allocated',
    data: { payment_id, customer_id, amount, result: data },
    timestamp: new Date().toISOString(),
    company_id: companyId
  })

  return {
    success: true,
    data: data,
    message: 'Payment allocated successfully'
  }
}

async function getAgingReport(supabase: any, companyId: string, params: URLSearchParams): Promise<ApiResponse> {
  const format = params.get('format') || 'json'
  const minAmount = parseFloat(params.get('min_amount') || '0')

  const { data, error } = await supabase
    .from('customer_aging_analysis')
    .select(`
      *,
      customers (
        first_name,
        last_name,
        company_name,
        customer_type,
        phone,
        email,
        credit_limit
      )
    `)
    .eq('company_id', companyId)
    .eq('analysis_date', new Date().toISOString().split('T')[0])
    .gte('total_outstanding', minAmount)
    .order('total_outstanding', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  const reportData = data.map(item => {
    const customer = item.customers
    const customerName = customer?.customer_type === 'individual'
      ? `${customer.first_name} ${customer.last_name}`
      : customer?.company_name || 'Unknown Customer'

    return {
      customer_id: item.customer_id,
      customer_name: customerName,
      customer_type: customer?.customer_type,
      phone: customer?.phone,
      email: customer?.email,
      total_outstanding: item.total_outstanding,
      current_amount: item.current_amount,
      aging_1_30: item.days_1_30,
      aging_31_60: item.days_31_60,
      aging_61_90: item.days_61_90,
      aging_91_120: item.days_91_120,
      aging_over_120: item.days_over_120,
      credit_limit: customer?.credit_limit || 0,
      analysis_date: item.analysis_date
    }
  })

  if (format === 'csv') {
    // Convert to CSV format
    const csvHeaders = [
      'Customer ID', 'Customer Name', 'Type', 'Phone', 'Email',
      'Total Outstanding', 'Current', '1-30 Days', '31-60 Days',
      '61-90 Days', '91-120 Days', 'Over 120 Days', 'Credit Limit'
    ].join(',')

    const csvRows = reportData.map(row => [
      row.customer_id,
      `"${row.customer_name}"`,
      row.customer_type,
      row.phone || '',
      row.email || '',
      row.total_outstanding,
      row.current_amount,
      row.aging_1_30,
      row.aging_31_60,
      row.aging_61_90,
      row.aging_91_120,
      row.aging_over_120,
      row.credit_limit
    ].join(','))

    const csvContent = [csvHeaders, ...csvRows].join('\n')

    return {
      success: true,
      data: {
        format: 'csv',
        content: csvContent,
        filename: `aging_report_${new Date().toISOString().split('T')[0]}.csv`
      }
    }
  }

  return {
    success: true,
    data: {
      format: 'json',
      report: reportData,
      generated_at: new Date().toISOString()
    }
  }
}

async function getSmartAlerts(supabase: any, companyId: string, params: URLSearchParams): Promise<ApiResponse> {
  const status = params.get('status') || 'active'
  const priority = params.get('priority')
  const limit = parseInt(params.get('limit') || '50')

  let query = supabase
    .from('smart_alerts_log')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (priority) {
    query = query.eq('priority', priority)
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    data: data
  }
}

async function runAlertsCheck(supabase: any, companyId: string): Promise<ApiResponse> {
  const { data, error } = await supabase
    .rpc('run_smart_alerts_check')

  if (error) {
    return { success: false, error: error.message }
  }

  // Send webhook notification for new alerts
  if (data.success && data.total_alerts_created > 0) {
    await sendWebhook(supabase, companyId, {
      event: 'alerts.created',
      data: data,
      timestamp: new Date().toISOString(),
      company_id: companyId
    })
  }

  return {
    success: true,
    data: data,
    message: `Alerts check completed. ${data.total_alerts_created} new alerts created.`
  }
}

async function registerWebhook(supabase: any, companyId: string, webhookData: any): Promise<ApiResponse> {
  const { url, events, secret } = webhookData

  if (!url || !events || !Array.isArray(events)) {
    return { success: false, error: 'Missing required fields: url, events (array)' }
  }

  // Store webhook configuration (you would need to create a webhooks table)
  const { data, error } = await supabase
    .from('webhook_configurations')
    .insert([{
      company_id: companyId,
      url: url,
      events: events,
      secret: secret,
      is_active: true,
      created_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    data: data,
    message: 'Webhook registered successfully'
  }
}

async function sendWebhook(supabase: any, companyId: string, payload: WebhookPayload) {
  try {
    // Get active webhooks for this company and event
    const { data: webhooks } = await supabase
      .from('webhook_configurations')
      .select('url, secret')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .contains('events', [payload.event])

    if (!webhooks || webhooks.length === 0) {
      return
    }

    // Send webhook to each registered URL
    for (const webhook of webhooks) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Webhook-Event': payload.event,
          'X-Webhook-Timestamp': payload.timestamp
        }

        if (webhook.secret) {
          // Add signature header for security
          headers['X-Webhook-Signature'] = await generateSignature(JSON.stringify(payload), webhook.secret)
        }

        await fetch(webhook.url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        })
      } catch (error) {
        console.error(`Failed to send webhook to ${webhook.url}:`, error)
      }
    }
  } catch (error) {
    console.error('Error sending webhooks:', error)
  }
}

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
