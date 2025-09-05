import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

console.log('Legal AI Enhanced Function Starting...');
console.log('OpenAI API Key configured:', !!openAIApiKey);
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key configured:', !!supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LegalQuery {
  query: string;
  analysis_type?: 'basic' | 'comprehensive' | 'predictive';
  context?: any;
  company_id?: string;
  user_id?: string;
  session_id?: string;
}

interface QueryClassification {
  type: 'data_query' | 'legal_consultation' | 'hybrid';
  intent: string;
  data_query?: {
    entity: 'customers' | 'contracts' | 'invoices' | 'payments' | 'vehicles';
    action: 'count' | 'list' | 'find' | 'analyze';
    filters?: any;
  };
  confidence: number;
}

interface LegalResponse {
  success: boolean;
  analysis: string;
  confidence: number;
  processing_time: number;
  sources: string[];
  suggestions?: string[];
  legal_references?: string[];
  action_items?: string[];
  risk_assessment?: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  };
  query_classification?: QueryClassification;
  data_results?: any;
  query_type?: 'data_query' | 'legal_consultation' | 'hybrid';
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function logActivity(
  type: string,
  details: any,
  company_id?: string,
  user_id?: string,
  session_id?: string
) {
  try {
    await supabase
      .from('ai_activity_logs')
      .insert({
        activity_type: type,
        details,
        company_id,
        user_id,
        session_id,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

async function classifyQuery(query: string): Promise<QueryClassification> {
  const dataKeywords = {
    customers: ['عميل', 'عملاء', 'زبون', 'زبائن', 'customer', 'client'],
    payments: ['دفع', 'مدفوع', 'دين', 'ديون', 'متأخر', 'payment', 'pay', 'debt', 'overdue'],
    contracts: ['عقد', 'عقود', 'contract', 'agreement'],
    invoices: ['فاتورة', 'فواتير', 'invoice', 'bill'],
    vehicles: ['مركبة', 'مركبات', 'سيارة', 'سيارات', 'vehicle', 'car']
  };

  const countKeywords = ['كم', 'عدد', 'count', 'how many', 'number of'];
  const listKeywords = ['قائمة', 'اعرض', 'أظهر', 'list', 'show', 'display'];
  
  let classification: QueryClassification = {
    type: 'legal_consultation',
    intent: 'general_legal_advice',
    confidence: 0.5
  };

  // Check for data query patterns
  const queryLower = query.toLowerCase();
  let isDataQuery = false;
  let entity: any = null;
  let action = 'list';

  // Detect entity
  for (const [entityName, keywords] of Object.entries(dataKeywords)) {
    if (keywords.some(keyword => queryLower.includes(keyword))) {
      entity = entityName;
      isDataQuery = true;
      break;
    }
  }

  // Detect action
  if (countKeywords.some(keyword => queryLower.includes(keyword))) {
    action = 'count';
  } else if (listKeywords.some(keyword => queryLower.includes(keyword))) {
    action = 'list';
  }

  // Classify the query
  if (isDataQuery && entity) {
    classification = {
      type: 'data_query',
      intent: `get_${entity}_${action}`,
      data_query: {
        entity,
        action,
        filters: extractFilters(query)
      },
      confidence: 0.9
    };
  } else if (isDataQuery) {
    classification = {
      type: 'hybrid',
      intent: 'data_with_legal_advice',
      confidence: 0.8
    };
  }

  return classification;
}

function extractFilters(query: string): any {
  const filters: any = {};
  const queryLower = query.toLowerCase();

  // Extract payment status filters
  if (queryLower.includes('لم يدفع') || queryLower.includes('متأخر') || queryLower.includes('unpaid') || queryLower.includes('overdue')) {
    filters.payment_status = 'unpaid';
  }

  return filters;
}

async function executeDataQuery(classification: QueryClassification, company_id: string): Promise<any> {
  if (!classification.data_query) return null;

  const { entity, action, filters } = classification.data_query;

  try {
    switch (entity) {
      case 'customers':
        if (action === 'count' && filters?.payment_status === 'unpaid') {
          return await getUnpaidCustomersCount(company_id);
        } else if (action === 'list' && filters?.payment_status === 'unpaid') {
          return await getUnpaidCustomersList(company_id);
        }
        break;
      case 'contracts':
        if (action === 'count') {
          return await getContractsCount(company_id);
        }
        break;
      case 'invoices':
        if (action === 'count') {
          return await getInvoicesCount(company_id);
        }
        break;
    }
  } catch (error) {
    console.error('Error executing data query:', error);
    return { error: error.message };
  }

  return null;
}

async function getUnpaidCustomersCount(company_id: string): Promise<any> {
  const { data: customers, error } = await supabase
    .from('customers')
    .select(`
      id,
      first_name,
      last_name,
      company_name,
      customer_type,
      invoices:invoices(
        id,
        balance_due,
        due_date,
        payment_status
      )
    `)
    .eq('company_id', company_id)
    .eq('is_active', true);

  if (error) throw error;

  const unpaidCustomers = customers?.filter(customer => {
    const invoices = customer.invoices || [];
    return invoices.some(invoice => 
      invoice.payment_status !== 'paid' && 
      invoice.due_date && 
      new Date(invoice.due_date) < new Date()
    );
  }) || [];

  const totalOverdue = unpaidCustomers.reduce((sum, customer) => {
    const overdue = customer.invoices
      .filter(inv => inv.payment_status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date())
      .reduce((invSum, inv) => invSum + (inv.balance_due || 0), 0);
    return sum + overdue;
  }, 0);

  return {
    count: unpaidCustomers.length,
    total_customers: customers?.length || 0,
    total_overdue_amount: totalOverdue,
    customers: unpaidCustomers.slice(0, 5) // First 5 for preview
  };
}

async function getUnpaidCustomersList(company_id: string): Promise<any> {
  const result = await getUnpaidCustomersCount(company_id);
  return result;
}

async function getContractsCount(company_id: string): Promise<any> {
  const { data, error } = await supabase
    .from('contracts')
    .select('id, status')
    .eq('company_id', company_id);

  if (error) throw error;

  const statusCount = data?.reduce((acc, contract) => {
    acc[contract.status] = (acc[contract.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return {
    total: data?.length || 0,
    by_status: statusCount
  };
}

async function getInvoicesCount(company_id: string): Promise<any> {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, payment_status')
    .eq('company_id', company_id);

  if (error) throw error;

  const statusCount = data?.reduce((acc, invoice) => {
    acc[invoice.payment_status] = (acc[invoice.payment_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return {
    total: data?.length || 0,
    by_payment_status: statusCount
  };
}

async function processLegalQuery(query: LegalQuery): Promise<LegalResponse> {
  const startTime = Date.now();
  
  console.log('Processing legal query:', {
    query: query.query?.substring(0, 100) + '...',
    analysis_type: query.analysis_type,
    company_id: query.company_id,
    user_id: query.user_id
  });

  if (!openAIApiKey) {
    console.error('OpenAI API key not configured');
    throw new Error('OpenAI API key not configured');
  }

  // Step 1: Classify the query
  const classification = await classifyQuery(query.query);
  let dataResults = null;

  // Step 2: Execute data query if needed
  if ((classification.type === 'data_query' || classification.type === 'hybrid') && query.company_id) {
    dataResults = await executeDataQuery(classification, query.company_id);
  }

  try {
    // Step 3: Prepare context for AI based on query type
    let aiPrompt = query.query;
    let systemPrompt = '';

    if (classification.type === 'data_query' && dataResults) {
      // For data queries, provide a direct response based on the data
      const analysis = formatDataResponse(classification, dataResults);
      
      return {
        success: true,
        analysis,
        confidence: 95,
        processing_time: Date.now() - startTime,
        sources: ['Company Database'],
        query_classification: classification,
        data_results: dataResults,
        query_type: 'data_query'
      };
    } else if (classification.type === 'hybrid' && dataResults) {
      // For hybrid queries, combine data with legal advice
      systemPrompt = `أنت مساعد قانوني ذكي متخصص في القانون الكويتي. لديك بيانات من قاعدة بيانات الشركة وتحتاج لتقديم استشارة قانونية بناءً على هذه البيانات.

البيانات المتوفرة:
${JSON.stringify(dataResults, null, 2)}

مهامك:
1. تحليل البيانات المقدمة
2. تقديم استشارة قانونية مناسبة للوضع
3. اقتراح خطوات عملية للتعامل مع الوضع
4. تقديم تحذيرات قانونية إن وجدت

قدم إجابة شاملة تتضمن:
- تحليل البيانات الرقمية
- الاستشارة القانونية المناسبة
- الخطوات العملية الموصى بها
- المخاطر القانونية المحتملة`;

      aiPrompt = `${query.query}\n\nبناءً على البيانات المرفقة، ما هي النصائح القانونية التي تقدمها؟`;
    } else {
      // Standard legal consultation
      systemPrompt = `أنت مساعد قانوني ذكي متخصص في القانون الكويتي والقوانين التجارية. 
      تتمتع بخبرة واسعة في:
      - قانون الشركات الكويتي
      - العقود التجارية وتأجير المركبات
      - قانون المرور والنقل
      - القوانين المالية والضرائب
      - حل النزاعات التجارية
      
      مهامك:
      1. تحليل الاستفسار القانوني بدقة
      2. تقديم استشارة قانونية مفصلة
      3. تحديد المخاطر القانونية المحتملة
      4. اقتراح خطوات عملية للحل
      5. تقديم مراجع قانونية عند الإمكان
      
      يجب أن تكون إجابتك:
      - دقيقة ومفصلة
      - مدعمة بالمراجع القانونية
      - تتضمن تقييم للمخاطر
      - تحتوي على خطوات عملية
      
      نوع التحليل المطلوب: ${query.analysis_type || 'basic'}
      
      قدم الاستجابة بتنسيق JSON مع الحقول التالية:
      - analysis: التحليل المفصل
      - legal_references: المراجع القانونية
      - action_items: الخطوات العملية
      - risk_level: مستوى المخاطر (low/medium/high)
      - risk_factors: عوامل المخاطر
      - recommendations: التوصيات`;
    }

    console.log('Sending request to OpenAI with model: gpt-4o-mini');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: aiPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received:', {
      choices_length: data.choices?.length,
      finish_reason: data.choices?.[0]?.finish_reason,
      model: data.model,
      usage: data.usage
    });
    
    const analysis = data.choices[0].message.content;
    
    const processingTime = Date.now() - startTime;

    // Try to parse JSON response, fallback to plain text
    let structuredResponse;
    try {
      structuredResponse = JSON.parse(analysis);
    } catch {
      structuredResponse = {
        analysis: analysis,
        legal_references: [],
        action_items: [],
        risk_level: 'medium',
        risk_factors: [],
        recommendations: []
      };
    }

    const result: LegalResponse = {
      success: true,
      analysis: structuredResponse.analysis || analysis,
      confidence: 85,
      processing_time: processingTime,
      sources: dataResults ? ['Company Database', 'OpenAI GPT-4o-mini', 'Kuwait Legal Database'] : ['OpenAI GPT-4o-mini', 'Kuwait Legal Database'],
      suggestions: structuredResponse.recommendations || [],
      legal_references: structuredResponse.legal_references || [],
      action_items: structuredResponse.action_items || [],
      risk_assessment: {
        level: structuredResponse.risk_level || 'medium',
        factors: structuredResponse.risk_factors || [],
        recommendations: structuredResponse.recommendations || []
      },
      query_classification: classification,
      data_results: dataResults,
      query_type: classification.type
    };

    // Log successful query
    await logActivity(
      'legal_query_processed',
      {
        query: query.query,
        analysis_type: query.analysis_type,
        confidence: result.confidence,
        processing_time: processingTime,
        response_length: analysis.length
      },
      query.company_id,
      query.user_id,
      query.session_id
    );

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Log error
    await logActivity(
      'legal_query_error',
      {
        query: query.query,
        error: error.message,
        processing_time: processingTime
      },
      query.company_id,
      query.user_id,
      query.session_id
    );

    throw error;
  }
}

function formatDataResponse(classification: QueryClassification, dataResults: any): string {
  if (!classification.data_query || !dataResults) return 'لم يتم العثور على بيانات.';

  const { entity, action } = classification.data_query;

  if (entity === 'customers' && action === 'count' && dataResults.count !== undefined) {
    let response = `📊 **نتائج البحث عن العملاء المتأخرين في الدفع:**\n\n`;
    response += `• عدد العملاء المتأخرين: **${dataResults.count}** من أصل ${dataResults.total_customers} عميل\n`;
    response += `• إجمالي المبالغ المتأخرة: **${dataResults.total_overdue_amount.toFixed(3)} د.ك**\n\n`;
    
    if (dataResults.customers && dataResults.customers.length > 0) {
      response += `📋 **أمثلة على العملاء المتأخرين:**\n`;
      dataResults.customers.slice(0, 3).forEach((customer: any, index: number) => {
        const name = customer.customer_type === 'individual' 
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
          : customer.company_name || 'غير محدد';
        response += `${index + 1}. ${name}\n`;
      });
    }
    
    response += `\n💡 **توصية**: يُنصح بمراجعة هذه الحالات واتخاذ الإجراءات القانونية المناسبة للتحصيل.`;
    return response;
  }

  if (entity === 'contracts' && dataResults.total !== undefined) {
    let response = `📊 **إحصائيات العقود:**\n\n`;
    response += `• إجمالي العقود: **${dataResults.total}**\n\n`;
    
    if (dataResults.by_status) {
      response += `📋 **توزيع العقود حسب الحالة:**\n`;
      Object.entries(dataResults.by_status).forEach(([status, count]) => {
        response += `• ${status}: ${count}\n`;
      });
    }
    
    return response;
  }

  if (entity === 'invoices' && dataResults.total !== undefined) {
    let response = `📊 **إحصائيات الفواتير:**\n\n`;
    response += `• إجمالي الفواتير: **${dataResults.total}**\n\n`;
    
    if (dataResults.by_payment_status) {
      response += `📋 **توزيع الفواتير حسب حالة الدفع:**\n`;
      Object.entries(dataResults.by_payment_status).forEach(([status, count]) => {
        response += `• ${status}: ${count}\n`;
      });
    }
    
    return response;
  }

  return JSON.stringify(dataResults, null, 2);
}

async function getQuerySuggestions(context?: string): Promise<string[]> {
  const suggestions = [
    'ما هي الخطوات القانونية لتحصيل الديون المتأخرة؟',
    'كيف يمكنني حماية شركتي من المخاطر القانونية؟',
    'ما هي شروط عقد تأجير المركبات في القانون الكويتي؟',
    'كيف أتعامل مع العميل المتعثر قانونياً؟',
    'ما هي إجراءات رفع دعوى قضائية ضد عميل؟',
    'كيف أحمي أصول الشركة من المصادرة؟',
    'ما هي التزامات شركة تأجير المركبات قانونياً؟',
    'كيف أتعامل مع حوادث المركبات المؤجرة؟'
  ];

  // Filter suggestions based on context if provided
  if (context) {
    return suggestions.filter(s => 
      s.includes(context) || 
      context.includes('عميل') && s.includes('عميل') ||
      context.includes('مركبة') && s.includes('مركبة') ||
      context.includes('عقد') && s.includes('عقد')
    );
  }

  return suggestions;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Health check endpoint
    if (path.endsWith('/health')) {
      return new Response(JSON.stringify({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        openai_configured: !!openAIApiKey
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Suggestions endpoint
    if (path.endsWith('/suggestions')) {
      const context = url.searchParams.get('context') || '';
      const suggestions = await getQuerySuggestions(context);
      
      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analytics endpoint
    if (path.endsWith('/analytics')) {
      const company_id = url.searchParams.get('company_id');
      const days = parseInt(url.searchParams.get('days') || '30');
      
      if (!company_id) {
        return new Response(JSON.stringify({ error: 'Company ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: logs } = await supabase
        .from('ai_activity_logs')
        .select('*')
        .eq('company_id', company_id)
        .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false });

      const analytics = {
        total_queries: logs?.length || 0,
        successful_queries: logs?.filter(l => l.activity_type === 'legal_query_processed').length || 0,
        failed_queries: logs?.filter(l => l.activity_type === 'legal_query_error').length || 0,
        average_confidence: logs?.filter(l => l.details?.confidence)
          .reduce((acc, l) => acc + (l.details.confidence || 0), 0) / (logs?.length || 1) || 0,
        average_processing_time: logs?.filter(l => l.details?.processing_time)
          .reduce((acc, l) => acc + (l.details.processing_time || 0), 0) / (logs?.length || 1) || 0,
        daily_usage: {}
      };

      return new Response(JSON.stringify(analytics), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Main query processing endpoint
    if (req.method === 'POST') {
      const body = await req.json();
      const query: LegalQuery = body;

      if (!query.query || query.query.trim().length === 0) {
        return new Response(JSON.stringify({ 
          error: 'Query is required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await processLegalQuery(query);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in legal-ai-enhanced function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});