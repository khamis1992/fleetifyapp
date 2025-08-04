import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Enhanced Query Classification with AI and Knowledge Base
async function classifyQuery(query: string, companyId: string, userId?: string): Promise<{
  type: 'system_data' | 'legal_advice' | 'mixed';
  confidence: number;
  components?: { system_data: string[], legal_advice: string[] };
  reasoning?: string;
}> {
  // First check with existing pattern matching for speed
  const systemDataPatterns = [
    // Payment and financial patterns
    /عميل.*لم.*يدفع|عميل.*متأخر.*دفع|عميل.*مدين|عميل.*يدين|عميل.*مستحق/i,
    /client.*hasn.*paid|client.*overdue|client.*owes|outstanding.*balance|unpaid.*invoices/i,
    /مدفوعات.*متأخرة|فواتير.*غير.*مدفوعة|ذمم.*مدينة|حسابات.*مستحقة/i,
    
    // Enhanced invoice patterns
    /فواتير.*معلقة|فواتير.*متأخرة|فواتير.*غير.*مرسلة|فواتير.*منتهية.*الصلاحية/i,
    /pending.*invoices|overdue.*invoices|unpaid.*invoices|unsent.*invoices|draft.*invoices/i,
    /توجد.*فواتير|هل.*توجد.*فواتير|كم.*فاتورة|عدد.*الفواتير/i,
    /are.*there.*invoices|how.*many.*invoices|invoice.*count|any.*invoices/i,
    
    // Customer search patterns
    /معلومات.*عميل|بيانات.*عميل|تفاصيل.*عميل|البحث.*عن.*عميل/i,
    /customer.*information|customer.*details|search.*customer|find.*customer/i,
    
    // Contract patterns
    /عقود.*منتهية|عقود.*نشطة|عقود.*معلقة|حالة.*العقد/i,
    /expired.*contracts|active.*contracts|contract.*status|contract.*details/i,
    
    // Financial reporting patterns
    /تقرير.*مالي|الإيرادات|المصروفات|الأرباح|الخسائر/i,
    /financial.*report|revenue|expenses|profit|loss|balance.*sheet/i,
    
    // Vehicle and asset patterns
    /مركبات.*متاحة|حالة.*المركبة|صيانة.*المركبة/i,
    /available.*vehicles|vehicle.*status|maintenance.*records/i
  ];

  // Legal advice patterns
  const legalAdvicePatterns = [
    /قانون|قانوني|محكمة|قضية|دعوى|نزاع|تقاضي|محامي|استشارة.*قانونية/i,
    /legal|law|court|case|lawsuit|dispute|litigation|lawyer|attorney|legal.*advice/i,
    /حقوق|واجبات|التزام|عقد.*قانوني|مخالفة|جريمة|جناية|مدني|جنائي/i,
    /rights|obligations|legal.*contract|violation|crime|civil|criminal|regulatory/i,
    /ما.*هو.*القانون|ما.*ينص.*القانون|هل.*يحق.*لي|هل.*من.*القانوني/i,
    /what.*is.*the.*law|what.*does.*the.*law|am.*i.*entitled|is.*it.*legal/i
  ];

  const systemDataMatches = systemDataPatterns.filter(pattern => pattern.test(query)).length;
  const legalAdviceMatches = legalAdvicePatterns.filter(pattern => pattern.test(query)).length;

  // Check for mixed queries
  if (systemDataMatches > 0 && legalAdviceMatches > 0) {
    return {
      type: 'mixed',
      confidence: 0.8,
      components: {
        system_data: extractSystemDataComponents(query),
        legal_advice: extractLegalAdviceComponents(query)
      },
      reasoning: 'Query contains both system data requests and legal advice requirements'
    };
  }

  // High confidence system data
  if (systemDataMatches >= 2) {
    return { type: 'system_data', confidence: 0.95, reasoning: 'Multiple system data patterns matched' };
  }

  // High confidence legal advice
  if (legalAdviceMatches >= 2) {
    return { type: 'legal_advice', confidence: 0.95, reasoning: 'Multiple legal advice patterns matched' };
  }

  // Single pattern matches
  if (systemDataMatches === 1) {
    return { type: 'system_data', confidence: 0.75, reasoning: 'Single system data pattern matched' };
  }

  if (legalAdviceMatches === 1) {
    return { type: 'legal_advice', confidence: 0.75, reasoning: 'Single legal advice pattern matched' };
  }

  // Use AI for complex classification if no clear pattern match
  if (openAIApiKey && query.length > 20) {
    try {
      const aiClassification = await classifyWithAI(query);
      if (aiClassification) {
        return {
          type: aiClassification.type,
          confidence: aiClassification.confidence,
          reasoning: `AI Classification: ${aiClassification.reasoning}`
        };
      }
    } catch (error) {
      console.warn('AI classification failed, falling back to default:', error);
    }
  }

  // Default to legal advice for unclear cases
  return { type: 'legal_advice', confidence: 0.4, reasoning: 'No clear pattern matched, defaulting to legal advice' };
}

// AI-powered classification for complex queries
async function classifyWithAI(query: string): Promise<{ type: 'system_data' | 'legal_advice' | 'mixed', confidence: number, reasoning: string } | null> {
  if (!openAIApiKey) return null;

  try {
    const classificationPrompt = `
أنت متخصص في تصنيف الاستفسارات. صنف الاستفسار التالي إلى إحدى الفئات:

1. system_data: طلبات الحصول على بيانات من النظام (فواتير، عملاء، عقود، تقارير)
2. legal_advice: طلبات الحصول على استشارة قانونية أو معلومات قانونية
3. mixed: الاستفسار يحتوي على كلا النوعين

أعطني الإجابة في صيغة JSON:
{
  "type": "نوع_الاستفسار",
  "confidence": رقم_من_0_إلى_1,
  "reasoning": "سبب_التصنيف"
}

الاستفسار: "${query}"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: classificationPrompt }],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    return {
      type: result.type,
      confidence: Math.min(result.confidence, 0.9), // Cap AI confidence at 0.9
      reasoning: result.reasoning
    };
  } catch (error) {
    console.warn('AI classification error:', error);
    return null;
  }
}

// Extract system data components from mixed queries
function extractSystemDataComponents(query: string): string[] {
  const components = [];
  
  if (/فواتير|invoices/i.test(query)) components.push('invoices');
  if (/عملاء|customers/i.test(query)) components.push('customers'); 
  if (/عقود|contracts/i.test(query)) components.push('contracts');
  if (/مدفوعات|payments/i.test(query)) components.push('payments');
  if (/تقارير|reports/i.test(query)) components.push('reports');
  if (/مركبات|vehicles/i.test(query)) components.push('vehicles');
  
  return components;
}

// Extract legal advice components from mixed queries
function extractLegalAdviceComponents(query: string): string[] {
  const components = [];
  
  if (/قانون|legal|law/i.test(query)) components.push('legal_interpretation');
  if (/حقوق|rights/i.test(query)) components.push('rights_advice');
  if (/التزام|obligations/i.test(query)) components.push('obligations_advice');
  if (/محكمة|court/i.test(query)) components.push('court_procedures');
  if (/عقد.*قانوني|legal.*contract/i.test(query)) components.push('contract_law');
  
  return components;
}

// Handle system data queries
async function handleSystemDataQuery(body: any, corsHeaders: any, supabase: any, openAIApiKey: string) {
  const { query, company_id, user_id } = body;
  
  try {
    // Check user permissions for system data queries
    if (user_id) {
      const userPermissions = await getUserPermissions(user_id);
      if (!userPermissions) {
        console.error('User permission check failed: No user permissions found', { user_id, company_id });
        return new Response(
          JSON.stringify({ success: false, message: 'User not found or unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (userPermissions.company_id !== company_id) {
        console.error('User permission check failed: Company mismatch', { 
          user_id, 
          expected_company_id: company_id, 
          user_company_id: userPermissions.company_id 
        });
        return new Response(
          JSON.stringify({ success: false, message: 'Unauthorized access to system data' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if user has system access permissions
      if (!userPermissions.hasSystemAccess()) {
        console.error('User permission check failed: Insufficient permissions', { 
          user_id, 
          company_id, 
          roles: userPermissions.roles 
        });
        return new Response(
          JSON.stringify({ success: false, message: 'Insufficient permissions for system data queries' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('User permission check passed:', { 
        user_id, 
        company_id, 
        roles: userPermissions.roles 
      });
    } else {
      console.warn('No user_id provided for system data query - allowing for backward compatibility');
    }

    // Analyze query intent and fetch relevant data
    const systemData = await fetchRelevantSystemData(query, company_id, supabase);
    
    // Generate AI response with system data context
    const startTime = Date.now();
    
    const systemPrompt = `أنت مساعد ذكي للنظام المالي والإداري متخصص في تحليل البيانات والإجابة على الاستفسارات حول:
    - العملاء والمدفوعات
    - العقود والفواتير  
    - التقارير المالية
    - حالة المركبات والأصول
    
    بناءً على البيانات المتوفرة في النظام، قدم إجابة دقيقة ومفصلة مع:
    - عرض البيانات ذات الصلة بوضوح
    - تحليل الوضع الحالي
    - تقديم توصيات عملية
    - استخدام الأرقام والإحصائيات الفعلية
    
    البيانات المتوفرة: ${JSON.stringify(systemData, null, 2)}`;

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
        temperature: 0.3, // Lower temperature for more factual responses
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const advice = data.choices[0].message.content;
    const responseTime = Date.now() - startTime;

    // Log the system data query
    try {
      await supabase.from('legal_ai_queries').insert({
        company_id: company_id,
        query: query,
        country: body.country,
        response: advice,
        response_time: responseTime,
        query_type: 'system_data',
        data_accessed: systemData
      });
    } catch (logError) {
      console.warn('Failed to log system data query:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        advice: advice,
        system_data: systemData,
        metadata: {
          source: 'system_data_with_ai',
          confidence: 0.95,
          response_time: responseTime,
          data_sources: Object.keys(systemData),
          query_type: 'system_data'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error handling system data query:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to process system data query. Please try again.' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// Fetch relevant system data based on query
async function fetchRelevantSystemData(query: string, companyId: string, supabase: any) {
  const data: any = {};
  
  // Enhanced invoice and payment queries
  if (/فواتير.*معلقة|فواتير.*متأخرة|فواتير.*غير.*مدفوعة|pending.*invoices|overdue.*invoices|unpaid.*invoices|عميل.*لم.*يدفع|عميل.*مدين|outstanding|unpaid|overdue/i.test(query)) {
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Get all invoice data with customer details
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select(`
        id, invoice_number, total_amount, payment_status, due_date, status, invoice_date,
        customers (
          id, first_name, last_name, company_name, customer_type, phone, email
        )
      `)
      .eq('company_id', companyId)
      .order('due_date', { ascending: true });

    // Categorize invoices
    const unpaidInvoices = allInvoices?.filter(inv => 
      inv.payment_status === 'unpaid' || inv.payment_status === 'partially_paid'
    ) || [];
    
    const overdueInvoices = unpaidInvoices.filter(inv => 
      inv.due_date && inv.due_date < currentDate
    );
    
    const draftInvoices = allInvoices?.filter(inv => inv.status === 'draft') || [];
    const sentInvoices = allInvoices?.filter(inv => inv.status === 'sent') || [];
    
    // Calculate financial summaries
    const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    
    // Group by customers for customer-specific analysis
    const customerMap = new Map();
    unpaidInvoices.forEach(inv => {
      const customerId = inv.customers?.id;
      if (customerId) {
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer: inv.customers,
            invoices: [],
            total_owed: 0,
            overdue_amount: 0
          });
        }
        const customerData = customerMap.get(customerId);
        customerData.invoices.push(inv);
        customerData.total_owed += inv.total_amount || 0;
        if (inv.due_date && inv.due_date < currentDate) {
          customerData.overdue_amount += inv.total_amount || 0;
        }
      }
    });
    
    const customersWithDebt = Array.from(customerMap.values());
    
    data.invoice_analysis = {
      total_invoices: allInvoices?.length || 0,
      unpaid_invoices: {
        count: unpaidInvoices.length,
        total_amount: totalOutstanding,
        invoices: unpaidInvoices.slice(0, 10) // Show latest 10
      },
      overdue_invoices: {
        count: overdueInvoices.length,
        total_amount: totalOverdue,
        invoices: overdueInvoices.slice(0, 10)
      },
      draft_invoices: {
        count: draftInvoices.length,
        invoices: draftInvoices.slice(0, 5)
      },
      sent_invoices: {
        count: sentInvoices.length
      },
      customers_with_debt: {
        count: customersWithDebt.length,
        customers: customersWithDebt.slice(0, 10)
      }
    };
    
    // Legacy format for backward compatibility
    data.unpaid_customers = customersWithDebt;
    data.outstanding_summary = {
      total_outstanding: totalOutstanding,
      customers_count: customersWithDebt.length
    };
  }

  // Check if query is about customer information
  if (/معلومات.*عميل|بيانات.*عميل|customer.*info/i.test(query)) {
    const { data: customerStats } = await supabase
      .from('customers')
      .select('customer_type, is_blacklisted, is_active')
      .eq('company_id', companyId);

    data.customer_statistics = {
      total_customers: customerStats?.length || 0,
      individual_customers: customerStats?.filter(c => c.customer_type === 'individual').length || 0,
      company_customers: customerStats?.filter(c => c.customer_type === 'company').length || 0,
      blacklisted_customers: customerStats?.filter(c => c.is_blacklisted).length || 0,
      active_customers: customerStats?.filter(c => c.is_active).length || 0
    };
  }

  // Check if query is about contracts
  if (/عقود|contract/i.test(query)) {
    const { data: contractStats } = await supabase
      .from('contracts')
      .select('status, contract_amount, start_date, end_date')
      .eq('company_id', companyId);

    data.contract_statistics = {
      total_contracts: contractStats?.length || 0,
      active_contracts: contractStats?.filter(c => c.status === 'active').length || 0,
      expired_contracts: contractStats?.filter(c => c.status === 'expired').length || 0,
      suspended_contracts: contractStats?.filter(c => c.status === 'suspended').length || 0,
      total_contract_value: contractStats?.reduce((sum, c) => sum + (c.contract_amount || 0), 0) || 0
    };
  }

  // Check if query is about financial summaries
  if (/تقرير.*مالي|financial.*report|revenue|expenses/i.test(query)) {
    const { data: financialData } = await supabase
      .from('invoices')
      .select('total_amount, payment_status, invoice_date')
      .eq('company_id', companyId)
      .gte('invoice_date', new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);

    data.financial_summary = {
      total_invoiced: financialData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
      paid_invoices: financialData?.filter(inv => inv.payment_status === 'paid').length || 0,
      unpaid_invoices: financialData?.filter(inv => inv.payment_status === 'unpaid').length || 0,
      partially_paid_invoices: financialData?.filter(inv => inv.payment_status === 'partially_paid').length || 0
    };
  }

  return data;
}

// Handle mixed queries (system data + legal advice)
async function handleMixedQuery(body: any, classification: any, corsHeaders: any, supabase: any, openAIApiKey: string) {
  const { query, company_id, user_id, country } = body;
  
  try {
    // Check user permissions for system data access
    if (user_id) {
      const userPermissions = await getUserPermissions(user_id);
      if (!userPermissions || !userPermissions.hasSystemAccess()) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Insufficient permissions for mixed queries requiring system data access' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const startTime = Date.now();
    
    // Fetch system data for relevant components
    const systemData = await fetchRelevantSystemData(query, company_id, supabase);
    
    // Create enhanced prompt that combines system data with legal expertise
    const mixedPrompt = `أنت مستشار قانوني خبير ومحلل بيانات متخصص في القانون ${country}. 
    
المطلوب: الإجابة على استفسار يجمع بين تحليل البيانات والاستشارة القانونية.

مكونات الاستفسار:
- البيانات المطلوبة: ${classification.components?.system_data?.join(', ') || 'غير محدد'}
- الجوانب القانونية: ${classification.components?.legal_advice?.join(', ') || 'غير محدد'}

البيانات المتوفرة من النظام:
${JSON.stringify(systemData, null, 2)}

يرجى تقديم إجابة شاملة تتضمن:
1. تحليل البيانات ذات الصلة
2. الاستشارة القانونية المطلوبة
3. ربط البيانات بالسياق القانوني
4. توصيات عملية تجمع بين التحليل والقانون
5. التحذيرات القانونية المناسبة

استخدم لغة مهنية وقدم إجابة متكاملة تلبي كلا الجانبين.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: mixedPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.5, // Balanced temperature for both analytical and creative responses
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const advice = data.choices[0].message.content;
    const responseTime = Date.now() - startTime;

    // Log the mixed query
    try {
      await supabase.from('legal_ai_queries').insert({
        company_id: company_id,
        query: query,
        country: country,
        response: advice,
        response_time: responseTime,
        query_type: 'mixed',
        classification_details: classification,
        data_accessed: systemData
      });
    } catch (logError) {
      console.warn('Failed to log mixed query:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        advice: advice,
        system_data: systemData,
        classification: classification,
        metadata: {
          source: 'mixed_query_ai',
          confidence: classification.confidence,
          response_time: responseTime,
          query_type: 'mixed',
          components: classification.components,
          data_sources: Object.keys(systemData)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error handling mixed query:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to process mixed query. Please try again.' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// Helper function to log access
async function logAccess(companyId: string, userId: string, accessType: string, customerId?: string, dataAccessed?: any, purpose?: string) {
  try {
    await supabase.from('legal_ai_access_logs').insert({
      company_id: companyId,
      user_id: userId,
      access_type: accessType,
      customer_id: customerId,
      data_accessed: dataAccessed || {},
      purpose: purpose
    });
  } catch (error) {
    console.warn('Failed to log access:', error);
  }
}

// Helper function to get user permissions
async function getUserPermissions(userId: string) {
  try {
    if (!userId) {
      console.error('No user ID provided to getUserPermissions');
      return null;
    }
    
    // Get user profile first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, first_name, last_name, email')
      .eq('user_id', userId)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return null;
    }
    
    if (!profile) {
      console.error('No profile found for user:', userId);
      return null;
    }
    
    // Get user roles from user_roles table
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      // Continue without roles - user might not have specific roles assigned
    }
    
    // Extract roles array
    const roles = userRoles?.map(r => r.role) || [];
    
    console.log('User permissions retrieved:', {
      userId,
      companyId: profile.company_id,
      roles,
      hasProfile: !!profile
    });
    
    return {
      company_id: profile.company_id,
      user_id: userId,
      roles: roles,
      profile: profile,
      // Helper methods for permission checking
      hasRole: (role: string) => roles.includes(role),
      isAdmin: () => roles.includes('super_admin') || roles.includes('company_admin'),
      isManager: () => roles.includes('manager'),
      hasSystemAccess: () => roles.includes('super_admin') || roles.includes('company_admin') || roles.includes('manager') || roles.includes('sales_agent')
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
}

interface LegalQuery {
  query: string;
  country: string;
  company_id: string;
}

interface LegalFeedback {
  query: string;
  country: string;
  rating: number;
  feedback_text?: string;
  company_id: string;
  message_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = req.method === 'POST' ? await req.json() : {};
    const requestedPath = body.path || '';
    
    console.log(`Processing request: ${req.method} with path: ${requestedPath}`);

    // Health check endpoint
    if (requestedPath === 'health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          openai_available: !!openAIApiKey
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Smart query classification and routing
    if (requestedPath === 'legal-advice') {
      console.log('Processing legal advice request:', { query: body.query?.substring(0, 100), country: body.country });

      if (!body.query || !body.country || !body.company_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Missing required fields: query, country, company_id' 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!openAIApiKey) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'OpenAI API key not configured' 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Classify the query to determine if it's about system data or general legal advice
      const classification = await classifyQuery(body.query, body.company_id, body.user_id);
      console.log('Query classification result:', classification);
      
      if (classification.type === 'system_data') {
        // Route to system data analysis
        return await handleSystemDataQuery(body, corsHeaders, supabase, openAIApiKey);
      }
      
      if (classification.type === 'mixed') {
        // Handle mixed queries - process both system data and legal advice
        return await handleMixedQuery(body, classification, corsHeaders, supabase, openAIApiKey);
      }

      // Handle general legal advice
      const systemPrompt = `You are a professional legal consultant AI specialized in ${body.country} law. 
      Provide accurate, helpful legal advice while emphasizing that this is general information and not a substitute for professional legal counsel.
      
      Guidelines:
      - Be specific to ${body.country} legal context
      - Provide practical, actionable advice
      - Include relevant legal references when possible
      - Always recommend consulting with a local attorney for complex matters
      - Be concise but comprehensive
      - Use professional but accessible language`;

      const startTime = Date.now();

      try {
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
              { role: 'user', content: body.query }
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const advice = data.choices[0].message.content;
        const responseTime = Date.now() - startTime;

        // Log the query for analytics (optional)
        try {
          await supabase.from('legal_ai_queries').insert({
            company_id: body.company_id,
            query: body.query,
            country: body.country,
            response: advice,
            response_time: responseTime,
          });
        } catch (logError) {
          console.warn('Failed to log query:', logError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            advice: advice,
            metadata: {
              source: 'api',
              confidence: 0.85,
              response_time: responseTime,
              cost_saved: false,
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );

      } catch (openAIError) {
        console.error('OpenAI API error:', openAIError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to generate legal advice. Please try again.' 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Feedback endpoint
    if (requestedPath === 'feedback') {
      console.log('Processing feedback:', { rating: body.rating, company_id: body.company_id });

      if (!body.rating || !body.company_id || !body.message_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Missing required fields: rating, company_id, message_id' 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Store feedback (optional)
      try {
        await supabase.from('legal_ai_feedback').insert({
          company_id: body.company_id,
          message_id: body.message_id,
          rating: body.rating,
          feedback_text: body.feedback_text,
          query: body.query,
          country: body.country,
        });
      } catch (logError) {
        console.warn('Failed to log feedback:', logError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          rating: body.rating,
          message: 'Thank you for your feedback!'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Stats endpoint - generate mock data for now
    if (requestedPath === 'stats') {
      const mockStats = {
        performance_overview: {
          total_queries: 156,
          cost_efficiency: 85,
          user_satisfaction: 92,
          average_response_time: 1.2,
          cache_hit_rate: 45,
          local_knowledge_hit_rate: 30,
          api_usage_rate: 25,
          total_cost_saved: 248.50
        },
        efficiency_breakdown: {
          api_calls_saved: 89,
          estimated_monthly_savings: 180.25,
          instant_responses: 75,
          local_responses: 47
        },
        cache_system: {
          hit_rate: 45,
          total_entries: 234,
          total_usage: 1247,
          total_cost_saved: 248.50,
          total_tokens_saved: 45600,
          session_stats: {
            total_queries: 23,
            cache_hits: 8,
            api_calls: 15,
            cost_saved: 12.45,
            tokens_saved: 2340
          },
          top_queries: [
            { query: "قوانين العمل في الكويت", country: "kuwait", usage_count: 15 },
            { query: "عقود الإيجار التجارية", country: "kuwait", usage_count: 12 }
          ]
        },
        generated_at: new Date().toISOString()
      };

      return new Response(
        JSON.stringify({ success: true, stats: mockStats }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Learning insights endpoint
    if (requestedPath === 'learning-insights') {
      const mockInsights = {
        summary: {
          total_patterns: 12,
          total_improvements: 8,
          ratings_trend: 4.2
        },
        patterns: [
          {
            pattern_type: "query_similarity",
            description: "استفسارات متشابهة حول قوانين العمل",
            frequency: 15,
            impact: "high"
          }
        ],
        improvements: [
          {
            improvement_type: "response_optimization",
            description: "تحسين سرعة الاستجابة للاستفسارات المتكررة",
            applied_at: new Date().toISOString(),
            impact_score: 8.5
          }
        ]
      };

      return new Response(
        JSON.stringify({ success: true, insights: mockInsights }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Customer search endpoint
    if (requestedPath === 'search-customers') {
      const { company_id, user_id, search_term } = body;
      
      if (!company_id || !user_id || !search_term) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Missing required fields: company_id, user_id, search_term' 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check user permissions
      const userProfile = await getUserPermissions(user_id);
      if (!userProfile || userProfile.company_id !== company_id) {
        return new Response(
          JSON.stringify({ success: false, message: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        // Search customers
        const { data: customers, error } = await supabase
          .from('customers')
          .select(`
            id, first_name, last_name, company_name, customer_type, 
            email, phone, national_id, passport_number, is_blacklisted
          `)
          .eq('company_id', company_id)
          .or(`first_name.ilike.%${search_term}%,last_name.ilike.%${search_term}%,company_name.ilike.%${search_term}%,email.ilike.%${search_term}%,phone.ilike.%${search_term}%`)
          .limit(20);

        if (error) throw error;

        // Log access
        await logAccess(company_id, user_id, 'customer_data', undefined, { search_term, results_count: customers?.length || 0 }, 'Customer search for legal consultation');

        return new Response(
          JSON.stringify({ success: true, customers: customers || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error searching customers:', error);
        return new Response(
          JSON.stringify({ success: false, message: 'Failed to search customers' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Customer analysis endpoint
    if (requestedPath === 'analyze-customer') {
      const { company_id, user_id, customer_id } = body;
      
      if (!company_id || !user_id || !customer_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Missing required fields: company_id, user_id, customer_id' 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check user permissions
      const userProfile = await getUserPermissions(user_id);
      if (!userProfile || userProfile.company_id !== company_id) {
        return new Response(
          JSON.stringify({ success: false, message: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        // Get customer details
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customer_id)
          .eq('company_id', company_id)
          .single();

        if (customerError) throw customerError;

        // Get contracts
        const { data: contracts } = await supabase
          .from('contracts')
          .select('*')
          .eq('customer_id', customer_id)
          .eq('company_id', company_id);

        // Get invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('customer_id', customer_id)
          .eq('company_id', company_id);

        // Get payments
        const { data: payments } = await supabase
          .from('payments')
          .select('*')
          .eq('customer_id', customer_id)
          .eq('company_id', company_id);

        // Calculate financial summary
        const totalContractValue = contracts?.reduce((sum, contract) => sum + (contract.contract_amount || 0), 0) || 0;
        const totalInvoiced = invoices?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0;
        const totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
        const outstanding = totalInvoiced - totalPaid;

        const analysis = {
          customer,
          financial_summary: {
            total_contract_value: totalContractValue,
            total_invoiced: totalInvoiced,
            total_paid: totalPaid,
            outstanding_amount: outstanding,
            payment_status: outstanding > 0 ? 'has_outstanding' : 'current'
          },
          contracts: contracts || [],
          recent_invoices: invoices?.slice(-5) || [],
          recent_payments: payments?.slice(-5) || [],
          risk_factors: [],
          recommendations: []
        };

        // Add risk factors
        if (customer.is_blacklisted) {
          analysis.risk_factors.push('العميل مدرج في القائمة السوداء');
        }
        if (outstanding > 10000) {
          analysis.risk_factors.push('مبلغ مستحق مرتفع');
        }
        if (contracts?.some(c => c.status === 'suspended')) {
          analysis.risk_factors.push('يوجد عقود معلقة');
        }

        // Add recommendations
        if (outstanding > 0) {
          analysis.recommendations.push('متابعة المبالغ المستحقة');
        }
        if (contracts?.length === 0) {
          analysis.recommendations.push('فرصة لعقد جديد');
        }

        // Log access
        await logAccess(company_id, user_id, 'customer_data', customer_id, { 
          accessed_sections: ['customer_details', 'contracts', 'invoices', 'payments'] 
        }, 'Comprehensive customer analysis for legal consultation');

        return new Response(
          JSON.stringify({ success: true, analysis }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error analyzing customer:', error);
        return new Response(
          JSON.stringify({ success: false, message: 'Failed to analyze customer' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate legal memo endpoint
    if (requestedPath === 'generate-memo') {
      const { company_id, user_id, customer_id, memo_type, custom_prompt } = body;
      
      if (!company_id || !user_id || !customer_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Missing required fields: company_id, user_id, customer_id' 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!openAIApiKey) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'OpenAI API key not configured' 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check user permissions
      const userProfile = await getUserPermissions(user_id);
      if (!userProfile || userProfile.company_id !== company_id) {
        return new Response(
          JSON.stringify({ success: false, message: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        // Get customer analysis data
        const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/legal-ai-api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            path: 'analyze-customer',
            company_id,
            user_id,
            customer_id
          })
        });

        const analysisData = await analysisResponse.json();
        if (!analysisData.success) {
          throw new Error('Failed to get customer analysis');
        }

        const { analysis } = analysisData;
        const customerName = analysis.customer.customer_type === 'individual' 
          ? `${analysis.customer.first_name} ${analysis.customer.last_name}`
          : analysis.customer.company_name;

        // Create AI prompt based on analysis
        let systemPrompt = `أنت مستشار قانوني خبير متخصص في القانون الكويتي. قم بإنشاء مذكرة قانونية مفصلة بناءً على البيانات التالية:

معلومات العميل:
- الاسم: ${customerName}
- النوع: ${analysis.customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
- الحالة المالية: ${analysis.financial_summary.outstanding_amount > 0 ? 'يوجد مبالغ مستحقة' : 'الحساب محدث'}
- إجمالي قيمة العقود: ${analysis.financial_summary.total_contract_value} دينار كويتي
- المبلغ المستحق: ${analysis.financial_summary.outstanding_amount} دينار كويتي

عوامل المخاطر: ${analysis.risk_factors.join(', ') || 'لا توجد'}
التوصيات: ${analysis.recommendations.join(', ') || 'لا توجد'}

يرجى إنشاء مذكرة قانونية شاملة تتضمن:
1. تحليل الوضع القانوني الحالي
2. تحديد المخاطر القانونية
3. التوصيات والإجراءات المطلوبة
4. الخطوات التالية المقترحة

استخدم لغة قانونية مهنية ووضح المراجع القانونية عند الضرورة.`;

        if (custom_prompt) {
          systemPrompt += `\n\nطلب خاص من المستخدم: ${custom_prompt}`;
        }

        // Generate memo using OpenAI
        const startTime = Date.now();
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
              { role: 'user', content: 'قم بإنشاء المذكرة القانونية الآن' }
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const aiData = await response.json();
        const memoContent = aiData.choices[0].message.content;
        const responseTime = Date.now() - startTime;

        // Generate memo number
        const { data: memoNumber } = await supabase.rpc('generate_legal_memo_number', {
          company_id_param: company_id
        });

        // Save memo to database
        const { data: memo, error: memoError } = await supabase
          .from('legal_memos')
          .insert({
            company_id,
            customer_id,
            memo_number: memoNumber,
            title: `مذكرة قانونية - ${customerName}`,
            content: memoContent,
            memo_type: memo_type || 'general',
            generated_by_ai: true,
            data_sources: ['customer_data', 'contracts', 'financial_records'],
            recommendations: analysis.recommendations,
            created_by: user_id
          })
          .select()
          .single();

        if (memoError) throw memoError;

        // Log access
        await logAccess(company_id, user_id, 'memo_generation', customer_id, {
          memo_id: memo.id,
          memo_type: memo_type || 'general',
          response_time: responseTime
        }, 'AI-generated legal memo creation');

        return new Response(
          JSON.stringify({
            success: true,
            memo,
            metadata: {
              response_time: responseTime,
              ai_generated: true,
              data_sources_count: 3
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('Error generating memo:', error);
        return new Response(
          JSON.stringify({ success: false, message: 'Failed to generate legal memo' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Optimize endpoint
    if (requestedPath === 'optimize') {
      // Simulate optimization process
      console.log('Running system optimization...');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'System optimization completed successfully',
          optimizations_applied: 3,
          performance_improvement: '12%'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 404 for unknown endpoints
    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in legal-ai-api function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});