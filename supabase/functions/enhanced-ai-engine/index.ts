import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

interface DatabaseQueryResult {
  table: string;
  data: any[];
  count: number;
  summary: string;
}

interface SmartAnalysisRequest {
  query: string;
  company_id: string;
  user_id?: string;
  analysis_type?: 'basic' | 'comprehensive' | 'predictive';
  include_tables?: string[];
  exclude_tables?: string[];
  context?: any;
}

interface AIResponse {
  success: boolean;
  analysis: string;
  data: {
    retrieved_data: DatabaseQueryResult[];
    insights: string[];
    recommendations: string[];
    metrics: any;
    visualizations: any[];
  };
  confidence: number;
  processing_time: number;
  sources: string[];
}

// Main tables configuration with their access patterns and relationships
const TABLE_CONFIG = {
  // Financial tables
  'contracts': {
    priority: 'high',
    access_pattern: 'frequent',
    key_fields: ['contract_number', 'customer_id', 'contract_amount', 'status', 'start_date', 'end_date'],
    filters: ['company_id', 'status', 'customer_id'],
    relationships: ['customers', 'vehicles', 'invoices', 'contract_payment_schedules']
  },
  'invoices': {
    priority: 'high',
    access_pattern: 'frequent',
    key_fields: ['invoice_number', 'customer_id', 'total_amount', 'status', 'due_date'],
    filters: ['company_id', 'status', 'customer_id'],
    relationships: ['customers', 'contracts', 'invoice_items', 'payments']
  },
  'customers': {
    priority: 'high',
    access_pattern: 'frequent', 
    key_fields: ['first_name', 'last_name', 'company_name', 'customer_type', 'total_contracts', 'is_blacklisted'],
    filters: ['company_id', 'customer_type', 'is_active', 'is_blacklisted'],
    relationships: ['contracts', 'invoices', 'payments', 'quotations']
  },
  'payments': {
    priority: 'high',
    access_pattern: 'frequent',
    key_fields: ['payment_number', 'customer_id', 'amount', 'payment_date', 'payment_method'],
    filters: ['company_id', 'customer_id', 'payment_date'],
    relationships: ['customers', 'invoices', 'contracts']
  },
  'vehicles': {
    priority: 'medium',
    access_pattern: 'moderate',
    key_fields: ['make', 'model', 'year', 'plate_number', 'status', 'current_mileage'],
    filters: ['company_id', 'status', 'vehicle_type'],
    relationships: ['contracts', 'vehicle_maintenance', 'fuel_records']
  },
  'employees': {
    priority: 'medium',
    access_pattern: 'moderate',
    key_fields: ['first_name', 'last_name', 'position', 'department', 'hire_date', 'is_active'],
    filters: ['company_id', 'is_active', 'department'],
    relationships: ['attendance_records', 'user_roles']
  },
  'chart_of_accounts': {
    priority: 'medium',
    access_pattern: 'moderate',
    key_fields: ['account_code', 'account_name', 'account_type', 'current_balance'],
    filters: ['company_id', 'is_active', 'account_type'],
    relationships: ['journal_entry_lines']
  },
  'legal_cases': {
    priority: 'medium',
    access_pattern: 'moderate',
    key_fields: ['case_number', 'case_type', 'status', 'created_date', 'estimated_value'],
    filters: ['company_id', 'case_type', 'status'],
    relationships: ['legal_case_documents', 'legal_case_notes']
  },
  'budgets': {
    priority: 'low',
    access_pattern: 'occasional',
    key_fields: ['budget_name', 'budget_year', 'total_revenue', 'total_expenses', 'status'],
    filters: ['company_id', 'budget_year', 'status'],
    relationships: ['budget_items']
  },
  'quotations': {
    priority: 'low',
    access_pattern: 'occasional',
    key_fields: ['quotation_number', 'customer_id', 'total_amount', 'status', 'valid_until'],
    filters: ['company_id', 'status', 'customer_id'],
    relationships: ['customers', 'quotation_items']
  }
};

// Smart query classifier with enhanced capabilities
function classifyQuery(query: string): {
  intent: string;
  entities: string[];
  tables: string[];
  confidence: number;
  analysis_type: 'basic' | 'comprehensive' | 'predictive';
} {
  const queryLower = query.toLowerCase();
  
  // Intent classification patterns
  const intents = {
    'financial_overview': /إيرادات|مصروفات|مبيعات|دخل|أرباح|خسائر|مالي|مال/,
    'customer_analysis': /عملاء|زبائن|عميل|زبون|customers|customer/,
    'contract_status': /عقود|عقد|contracts|contract|اتفاقيات|اتفاقية/,
    'payment_tracking': /دفعات|مدفوعات|سداد|تحصيل|payments|payment/,
    'vehicle_management': /مركبات|سيارات|مركبة|سيارة|vehicles|vehicle/,
    'employee_overview': /موظفين|موظف|employees|employee|عمال|عامل/,
    'legal_matters': /قانوني|قضايا|قضية|legal|cases|case/,
    'performance_metrics': /أداء|إحصائيات|تقارير|performance|metrics|reports/,
    'budget_analysis': /ميزانية|موازنة|budgets|budget/,
    'statistical_query': /كم|عدد|إجمالي|متوسط|how many|total|average|count/
  };

  // Determine primary intent
  let primaryIntent = 'general_inquiry';
  let maxConfidence = 0;
  
  for (const [intent, pattern] of Object.entries(intents)) {
    const match = queryLower.match(pattern);
    if (match) {
      const confidence = match[0].length / queryLower.length * 2; // Boost confidence
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        primaryIntent = intent;
      }
    }
  }

  // Extract entities (numbers, dates, names)
  const entities = [];
  const numberMatch = queryLower.match(/\d+/g);
  if (numberMatch) entities.push(...numberMatch);
  
  const dateMatch = queryLower.match(/\d{4}|\d{1,2}\/\d{1,2}\/\d{4}/g);
  if (dateMatch) entities.push(...dateMatch);

  // Determine relevant tables based on intent
  const tableMappings: Record<string, string[]> = {
    'financial_overview': ['contracts', 'invoices', 'payments', 'chart_of_accounts', 'budgets'],
    'customer_analysis': ['customers', 'contracts', 'invoices', 'payments', 'quotations'],
    'contract_status': ['contracts', 'customers', 'vehicles', 'contract_payment_schedules'],
    'payment_tracking': ['payments', 'invoices', 'customers', 'contracts'],
    'vehicle_management': ['vehicles', 'contracts', 'vehicle_maintenance', 'fuel_records'],
    'employee_overview': ['employees', 'attendance_records', 'user_roles'],
    'legal_matters': ['legal_cases', 'customers', 'contracts', 'legal_case_documents'],
    'performance_metrics': ['contracts', 'invoices', 'customers', 'payments', 'vehicles'],
    'budget_analysis': ['budgets', 'budget_items', 'chart_of_accounts'],
    'statistical_query': ['contracts', 'customers', 'invoices', 'vehicles', 'employees']
  };

  const relevantTables = tableMappings[primaryIntent] || ['contracts', 'customers', 'invoices'];

  // Determine analysis type
  let analysisType: 'basic' | 'comprehensive' | 'predictive' = 'basic';
  if (queryLower.includes('تفصيل') || queryLower.includes('شامل') || queryLower.includes('comprehensive')) {
    analysisType = 'comprehensive';
  } else if (queryLower.includes('توقع') || queryLower.includes('مستقبل') || queryLower.includes('predict')) {
    analysisType = 'predictive';
  }

  return {
    intent: primaryIntent,
    entities,
    tables: relevantTables,
    confidence: Math.min(maxConfidence + 0.3, 1.0),
    analysis_type: analysisType
  };
}

// Enhanced data retrieval with smart filtering
async function retrieveRelevantData(
  tables: string[], 
  company_id: string, 
  intent: string, 
  entities: string[]
): Promise<DatabaseQueryResult[]> {
  const results: DatabaseQueryResult[] = [];
  
  for (const tableName of tables.slice(0, 5)) { // Limit to 5 tables for performance
    try {
      const config = TABLE_CONFIG[tableName];
      if (!config) continue;

      let query = supabase.from(tableName).select('*');
      
      // Apply company filter
      if (config.filters.includes('company_id')) {
        query = query.eq('company_id', company_id);
      }

      // Apply smart filtering based on intent and entities
      if (intent === 'contract_status' && tableName === 'contracts') {
        query = query.in('status', ['active', 'draft', 'pending']);
      } else if (intent === 'customer_analysis' && tableName === 'customers') {
        query = query.eq('is_active', true);
      } else if (intent === 'payment_tracking' && tableName === 'payments') {
        // Get recent payments
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('payment_date', thirtyDaysAgo.toISOString().split('T')[0]);
      }

      // Limit results for performance
      query = query.limit(intent === 'statistical_query' ? 1000 : 50);
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;
      
      if (error) {
        console.error(`Error querying ${tableName}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        results.push({
          table: tableName,
          data: data,
          count: count || data.length,
          summary: generateTableSummary(tableName, data, intent)
        });
      }
    } catch (error) {
      console.error(`Error processing table ${tableName}:`, error);
    }
  }

  return results;
}

// Generate intelligent table summaries
function generateTableSummary(tableName: string, data: any[], intent: string): string {
  const count = data.length;
  
  switch (tableName) {
    case 'contracts':
      const activeContracts = data.filter(c => c.status === 'active').length;
      const totalValue = data.reduce((sum, c) => sum + (c.contract_amount || 0), 0);
      return `${count} عقد (${activeContracts} نشط) بقيمة إجمالية ${totalValue.toFixed(3)} د.ك`;
      
    case 'customers':
      const individualCustomers = data.filter(c => c.customer_type === 'individual').length;
      const corporateCustomers = data.filter(c => c.customer_type === 'corporate').length;
      return `${count} عميل (${individualCustomers} فرد، ${corporateCustomers} شركة)`;
      
    case 'invoices':
      const paidInvoices = data.filter(i => i.status === 'paid').length;
      const totalAmount = data.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      return `${count} فاتورة (${paidInvoices} مدفوعة) بإجمالي ${totalAmount.toFixed(3)} د.ك`;
      
    case 'payments':
      const totalPayments = data.reduce((sum, p) => sum + (p.amount || 0), 0);
      return `${count} دفعة بإجمالي ${totalPayments.toFixed(3)} د.ك`;
      
    case 'vehicles':
      const availableVehicles = data.filter(v => v.status === 'available').length;
      return `${count} مركبة (${availableVehicles} متاحة)`;
      
    case 'employees':
      const activeEmployees = data.filter(e => e.is_active).length;
      return `${count} موظف (${activeEmployees} نشط)`;
      
    default:
      return `${count} سجل من جدول ${tableName}`;
  }
}

// Advanced AI analysis with comprehensive insights
async function generateAdvancedAnalysis(
  query: string,
  retrievedData: DatabaseQueryResult[],
  intent: string,
  analysisType: 'basic' | 'comprehensive' | 'predictive'
): Promise<{
  analysis: string;
  insights: string[];
  recommendations: string[];
  metrics: any;
  visualizations: any[];
}> {
  
  const metrics = calculateMetrics(retrievedData, intent);
  const insights = generateInsights(retrievedData, intent, metrics);
  const recommendations = generateRecommendations(insights, intent);
  const visualizations = generateVisualizations(retrievedData, intent);
  
  let analysis = '';
  
  if (!openAIApiKey) {
    // Fallback analysis without OpenAI
    analysis = generateFallbackAnalysis(query, retrievedData, intent, insights, metrics);
  } else {
    // Enhanced analysis with OpenAI
    analysis = await generateAIAnalysis(query, retrievedData, intent, insights, metrics, analysisType);
  }

  return {
    analysis,
    insights,
    recommendations,
    metrics,
    visualizations
  };
}

// Calculate comprehensive metrics
function calculateMetrics(data: DatabaseQueryResult[], intent: string): any {
  const metrics: any = {};
  
  data.forEach(result => {
    switch (result.table) {
      case 'contracts':
        metrics.contracts = {
          total: result.count,
          active: result.data.filter(c => c.status === 'active').length,
          total_value: result.data.reduce((sum, c) => sum + (c.contract_amount || 0), 0),
          avg_value: result.data.reduce((sum, c) => sum + (c.contract_amount || 0), 0) / result.count
        };
        break;
        
      case 'customers':
        metrics.customers = {
          total: result.count,
          individual: result.data.filter(c => c.customer_type === 'individual').length,
          corporate: result.data.filter(c => c.customer_type === 'corporate').length,
          blacklisted: result.data.filter(c => c.is_blacklisted).length
        };
        break;
        
      case 'invoices':
        const paid = result.data.filter(i => i.status === 'paid');
        const pending = result.data.filter(i => i.status === 'pending');
        metrics.invoices = {
          total: result.count,
          paid: paid.length,
          pending: pending.length,
          total_amount: result.data.reduce((sum, i) => sum + (i.total_amount || 0), 0),
          paid_amount: paid.reduce((sum, i) => sum + (i.total_amount || 0), 0),
          pending_amount: pending.reduce((sum, i) => sum + (i.total_amount || 0), 0)
        };
        break;
    }
  });
  
  return metrics;
}

// Generate intelligent insights
function generateInsights(data: DatabaseQueryResult[], intent: string, metrics: any): string[] {
  const insights: string[] = [];
  
  // Financial insights
  if (metrics.contracts && metrics.invoices) {
    const collectionRate = (metrics.invoices.paid_amount / metrics.invoices.total_amount) * 100;
    insights.push(`معدل التحصيل: ${collectionRate.toFixed(1)}%`);
    
    if (collectionRate < 70) {
      insights.push('معدل التحصيل منخفض - يتطلب متابعة');
    }
  }
  
  // Customer insights
  if (metrics.customers) {
    const corporateRatio = (metrics.customers.corporate / metrics.customers.total) * 100;
    insights.push(`نسبة العملاء المؤسسيين: ${corporateRatio.toFixed(1)}%`);
    
    if (metrics.customers.blacklisted > 0) {
      insights.push(`${metrics.customers.blacklisted} عميل محظور - مراجعة مطلوبة`);
    }
  }
  
  // Contract insights
  if (metrics.contracts) {
    const activeRatio = (metrics.contracts.active / metrics.contracts.total) * 100;
    insights.push(`نسبة العقود النشطة: ${activeRatio.toFixed(1)}%`);
    
    insights.push(`متوسط قيمة العقد: ${metrics.contracts.avg_value.toFixed(3)} د.ك`);
  }
  
  return insights;
}

// Generate actionable recommendations
function generateRecommendations(insights: string[], intent: string): string[] {
  const recommendations: string[] = [];
  
  // Based on insights, generate specific recommendations
  insights.forEach(insight => {
    if (insight.includes('معدل التحصيل منخفض')) {
      recommendations.push('تفعيل نظام المتابعة الآلية للمدفوعات المتأخرة');
      recommendations.push('مراجعة شروط الدفع في العقود الجديدة');
    }
    
    if (insight.includes('عميل محظور')) {
      recommendations.push('مراجعة دورية لقائمة العملاء المحظورين');
      recommendations.push('تحديث سياسات قبول العملاء الجدد');
    }
    
    if (insight.includes('نسبة العقود النشطة') && parseFloat(insight.match(/\d+\.\d+/)?.[0] || '0') < 80) {
      recommendations.push('تنشيط حملة تجديد العقود');
      recommendations.push('مراجعة أسباب عدم تجديد العقود');
    }
  });
  
  // Add general recommendations based on intent
  if (intent === 'financial_overview') {
    recommendations.push('إعداد تقرير مالي شهري');
    recommendations.push('مراجعة الميزانية وتحديث التوقعات');
  }
  
  return recommendations;
}

// Generate visualizations data
function generateVisualizations(data: DatabaseQueryResult[], intent: string): any[] {
  const visualizations: any[] = [];
  
  data.forEach(result => {
    switch (result.table) {
      case 'contracts':
        const statusCounts = result.data.reduce((acc, contract) => {
          acc[contract.status] = (acc[contract.status] || 0) + 1;
          return acc;
        }, {});
        
        visualizations.push({
          type: 'pie',
          title: 'توزيع حالات العقود',
          data: Object.entries(statusCounts).map(([status, count]) => ({
            name: status,
            value: count
          }))
        });
        break;
        
      case 'payments':
        // Monthly payment trends
        const monthlyPayments = result.data.reduce((acc, payment) => {
          const month = new Date(payment.payment_date).toISOString().substring(0, 7);
          acc[month] = (acc[month] || 0) + payment.amount;
          return acc;
        }, {});
        
        visualizations.push({
          type: 'line',
          title: 'اتجاه المدفوعات الشهرية',
          data: Object.entries(monthlyPayments).map(([month, amount]) => ({
            month,
            amount
          })).sort((a, b) => a.month.localeCompare(b.month))
        });
        break;
    }
  });
  
  return visualizations;
}

// Fallback analysis without OpenAI
function generateFallbackAnalysis(
  query: string,
  data: DatabaseQueryResult[],
  intent: string,
  insights: string[],
  metrics: any
): string {
  let analysis = `📊 **تحليل شامل لـ: ${query}**\n\n`;
  
  // Add data summary
  analysis += '**ملخص البيانات:**\n';
  data.forEach(result => {
    analysis += `• ${result.summary}\n`;
  });
  
  // Add key insights
  if (insights.length > 0) {
    analysis += '\n**النتائج الرئيسية:**\n';
    insights.forEach(insight => {
      analysis += `• ${insight}\n`;
    });
  }
  
  // Add metrics summary
  if (Object.keys(metrics).length > 0) {
    analysis += '\n**المؤشرات الرئيسية:**\n';
    if (metrics.contracts) {
      analysis += `• إجمالي قيمة العقود: ${metrics.contracts.total_value.toFixed(3)} د.ك\n`;
      analysis += `• متوسط قيمة العقد: ${metrics.contracts.avg_value.toFixed(3)} د.ك\n`;
    }
    if (metrics.invoices) {
      analysis += `• إجمالي المبالغ المفوترة: ${metrics.invoices.total_amount.toFixed(3)} د.ك\n`;
      analysis += `• إجمالي المبالغ المحصلة: ${metrics.invoices.paid_amount.toFixed(3)} د.ك\n`;
    }
  }
  
  return analysis;
}

// AI-powered analysis using OpenAI
async function generateAIAnalysis(
  query: string,
  data: DatabaseQueryResult[],
  intent: string,
  insights: string[],
  metrics: any,
  analysisType: 'basic' | 'comprehensive' | 'predictive'
): Promise<string> {
  try {
    const systemPrompt = `أنت مساعد ذكي متخصص في تحليل البيانات المالية والإدارية. قم بتحليل البيانات المقدمة وقدم رؤى ذكية وتوصيات عملية.

نوع التحليل: ${analysisType}
القصد من الاستعلام: ${intent}
الاستعلام: ${query}

البيانات المسترجعة:
${data.map(d => `- ${d.table}: ${d.summary}`).join('\n')}

المؤشرات:
${JSON.stringify(metrics, null, 2)}

الرؤى المكتشفة:
${insights.join('\n')}

يرجى تقديم تحليل شامل يتضمن:
1. ملخص تنفيذي
2. تحليل النتائج الرئيسية
3. نقاط القوة والضعف
4. توصيات عملية قابلة للتنفيذ
5. تحليل المخاطر والفرص

استخدم اللغة العربية وقدم الأرقام بوضوح.`;

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
          { role: 'user', content: query }
        ],
        max_tokens: analysisType === 'comprehensive' ? 1500 : 1000,
        temperature: 0.7
      }),
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || generateFallbackAnalysis(query, data, intent, insights, metrics);
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    return generateFallbackAnalysis(query, data, intent, insights, metrics);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, company_id, user_id, analysis_type = 'basic', include_tables, exclude_tables, context }: SmartAnalysisRequest = await req.json();

    if (!query || !company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    console.log(`🧠 Enhanced AI Engine processing query: "${query}" for company: ${company_id}`);

    // Step 1: Classify the query intelligently
    const classification = classifyQuery(query);
    console.log(`📝 Classification: ${classification.intent} (confidence: ${classification.confidence})`);

    // Step 2: Determine tables to query (with overrides)
    let tablesToQuery = classification.tables;
    if (include_tables) {
      tablesToQuery = [...new Set([...tablesToQuery, ...include_tables])];
    }
    if (exclude_tables) {
      tablesToQuery = tablesToQuery.filter(table => !exclude_tables.includes(table));
    }

    console.log(`🗄️ Querying tables: ${tablesToQuery.join(', ')}`);

    // Step 3: Retrieve relevant data with smart filtering
    const retrievedData = await retrieveRelevantData(
      tablesToQuery,
      company_id,
      classification.intent,
      classification.entities
    );

    console.log(`📊 Retrieved data from ${retrievedData.length} tables`);

    // Step 4: Generate advanced analysis
    const analysisResult = await generateAdvancedAnalysis(
      query,
      retrievedData,
      classification.intent,
      analysis_type
    );

    const processingTime = Date.now() - startTime;

    // Step 5: Log the query for learning
    try {
      await supabase.from('ai_query_intents').insert({
        company_id,
        original_query: query,
        intent_classification: classification.intent,
        confidence_score: classification.confidence,
        context_data: {
          analysis_type,
          tables_queried: tablesToQuery,
          data_sources: retrievedData.map(d => d.table),
          processing_time: processingTime
        },
        created_by: user_id
      });
    } catch (logError) {
      console.error('Error logging query:', logError);
    }

    const response: AIResponse = {
      success: true,
      analysis: analysisResult.analysis,
      data: {
        retrieved_data: retrievedData,
        insights: analysisResult.insights,
        recommendations: analysisResult.recommendations,
        metrics: analysisResult.metrics,
        visualizations: analysisResult.visualizations
      },
      confidence: classification.confidence,
      processing_time: processingTime,
      sources: retrievedData.map(d => d.table)
    };

    console.log(`✅ Analysis completed in ${processingTime}ms`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in enhanced AI engine:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});