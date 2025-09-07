import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContractData {
  customer_name?: string;
  customer_phone?: string;
  vehicle_number?: string;
  contract_number?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  contract_amount?: string | number;
  monthly_amount?: string | number;
  description?: string;
  terms?: string;
  rowNumber?: number;
}

interface ProcessingResult {
  processed_data: ContractData;
  suggestions: string[];
  corrections: Array<{
    field: string;
    original_value: any;
    suggested_value: any;
    reason: string;
    confidence: number;
  }>;
  validation_issues: Array<{
    field: string;
    issue: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  auto_fixes_applied: Array<{
    field: string;
    fix_description: string;
  }>;
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractData, companyId, options = {} } = await req.json();
    
    console.log('🤖 [INTELLIGENT_PROCESSOR] Processing contract data:', contractData);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize processing result
    const result: ProcessingResult = {
      processed_data: { ...contractData },
      suggestions: [],
      corrections: [],
      validation_issues: [],
      auto_fixes_applied: []
    };

    // 1. Smart data cleaning and normalization
    await cleanAndNormalizeData(result, contractData);

    // 2. AI-powered contract type detection
    if (openAIApiKey && (!contractData.contract_type || isUnclearValue(contractData.contract_type))) {
      await detectContractType(result, contractData);
    }

    // 3. Intelligent date processing
    await processDateFields(result, contractData);

    // 4. Smart amount handling
    await processAmountFields(result, contractData);

    // 5. Customer and vehicle validation
    await validateCustomerAndVehicle(result, contractData, supabase, companyId);

    // 6. Generate intelligent suggestions
    await generateIntelligentSuggestions(result, contractData);

    // 7. Final validation
    await performFinalValidation(result);

    console.log('✅ [INTELLIGENT_PROCESSOR] Processing complete:', result);

    return new Response(JSON.stringify({
      success: true,
      result: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [INTELLIGENT_PROCESSOR] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions

function isUnclearValue(value: any): boolean {
  if (!value) return true;
  const str = String(value).toLowerCase().trim();
  const unclearPatterns = [
    'غير محدد', 'unknown', 'unclear', 'n/a', 'na', 'null', 'undefined',
    'عقد', 'contract', 'اتفاقية', 'agreement', '؟', '?'
  ];
  return unclearPatterns.some(pattern => str.includes(pattern)) || str.length < 3;
}

async function cleanAndNormalizeData(result: ProcessingResult, data: ContractData) {
  console.log('🧹 [CLEAN_DATA] Starting data cleaning...');
  
  // Clean customer name
  if (data.customer_name) {
    const cleaned = data.customer_name.trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u0600-\u06FF]/g, '');
    
    if (cleaned !== data.customer_name) {
      result.processed_data.customer_name = cleaned;
      result.auto_fixes_applied.push({
        field: 'customer_name',
        fix_description: 'تم تنظيف اسم العميل وإزالة الرموز غير الضرورية'
      });
    }
  }

  // Clean and validate phone numbers
  if (data.customer_phone) {
    const cleaned = cleanPhoneNumber(data.customer_phone);
    if (cleaned !== data.customer_phone) {
      result.processed_data.customer_phone = cleaned;
      result.auto_fixes_applied.push({
        field: 'customer_phone',
        fix_description: 'تم تنسيق رقم الهاتف ليكون بالصيغة الكويتية الصحيحة'
      });
    }
  }

  // Clean vehicle number
  if (data.vehicle_number) {
    const cleaned = String(data.vehicle_number).trim().replace(/\s+/g, '');
    if (cleaned !== data.vehicle_number) {
      result.processed_data.vehicle_number = cleaned;
      result.auto_fixes_applied.push({
        field: 'vehicle_number',
        fix_description: 'تم تنظيف رقم المركبة'
      });
    }
  }
}

function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Kuwaiti numbers
  if (cleaned.startsWith('965')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('5') || cleaned.startsWith('6') || cleaned.startsWith('9')) {
    cleaned = '+965' + cleaned;
  } else if (!cleaned.startsWith('+965')) {
    cleaned = '+965' + cleaned.replace(/^0+/, '');
  }
  
  return cleaned;
}

async function detectContractType(result: ProcessingResult, data: ContractData) {
  if (!openAIApiKey) return;
  
  console.log('🔍 [AI_DETECTION] Detecting contract type...');
  
  try {
    const prompt = `
Analyze this contract data and determine the most appropriate contract type in Arabic.

Contract Data:
- Description: ${data.description || 'غير محدد'}
- Terms: ${data.terms || 'غير محدد'}
- Monthly Amount: ${data.monthly_amount || 'غير محدد'}
- Contract Amount: ${data.contract_amount || 'غير محدد'}
- Duration: ${data.start_date} to ${data.end_date}

Based on common Kuwaiti vehicle rental contracts, choose ONE of these types:
- rental: إيجار عادي
- rent_to_own: إيجار منتهي بالتمليك
- lease: تأجير تشغيلي
- installment: تقسيط
- maintenance: صيانة

Respond with only the type key (e.g., "rent_to_own") and a brief Arabic explanation.
Format: TYPE|EXPLANATION
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.1,
      }),
    });

    const aiResult = await response.json();
    const aiContent = aiResult.choices[0]?.message?.content?.trim();
    
    if (aiContent && aiContent.includes('|')) {
      const [detectedType, explanation] = aiContent.split('|');
      
      result.processed_data.contract_type = detectedType.trim();
      result.corrections.push({
        field: 'contract_type',
        original_value: data.contract_type,
        suggested_value: detectedType.trim(),
        reason: explanation.trim(),
        confidence: 0.85
      });
      
      result.suggestions.push(`تم اقتراح نوع العقد: ${explanation.trim()}`);
    }
  } catch (error) {
    console.error('AI detection error:', error);
    result.validation_issues.push({
      field: 'contract_type',
      issue: 'فشل في تحديد نوع العقد تلقائياً',
      severity: 'warning'
    });
  }
}

async function processDateFields(result: ProcessingResult, data: ContractData) {
  console.log('📅 [DATE_PROCESSING] Processing dates...');
  
  // Auto-complete dates if missing
  if (data.start_date && !data.end_date) {
    const startDate = new Date(data.start_date);
    if (!isNaN(startDate.getTime())) {
      // Default to 1 year for rent_to_own, 6 months for others
      const monthsToAdd = data.contract_type === 'rent_to_own' ? 12 : 6;
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + monthsToAdd);
      
      result.processed_data.end_date = endDate.toISOString().split('T')[0];
      result.auto_fixes_applied.push({
        field: 'end_date',
        fix_description: `تم تحديد تاريخ النهاية تلقائياً (${monthsToAdd} شهر من تاريخ البداية)`
      });
    }
  }

  // Validate date logic
  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    
    if (start >= end) {
      result.validation_issues.push({
        field: 'end_date',
        issue: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
        severity: 'error'
      });
    }
  }
}

async function processAmountFields(result: ProcessingResult, data: ContractData) {
  console.log('💰 [AMOUNT_PROCESSING] Processing amounts...');
  
  // Auto-calculate monthly amount if missing
  if (data.contract_amount && !data.monthly_amount && data.start_date && data.end_date) {
    const contractAmount = parseFloat(String(data.contract_amount));
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    
    if (!isNaN(contractAmount) && contractAmount > 0) {
      const monthsDiff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const monthlyAmount = Math.round((contractAmount / monthsDiff) * 100) / 100;
      
      result.processed_data.monthly_amount = monthlyAmount;
      result.auto_fixes_applied.push({
        field: 'monthly_amount',
        fix_description: `تم حساب القسط الشهري تلقائياً: ${monthlyAmount} دينار كويتي`
      });
    }
  }

  // Validate amounts
  const contractAmount = parseFloat(String(data.contract_amount || 0));
  const monthlyAmount = parseFloat(String(data.monthly_amount || 0));
  
  if (contractAmount < 0 || monthlyAmount < 0) {
    result.validation_issues.push({
      field: 'amounts',
      issue: 'المبالغ لا يمكن أن تكون سالبة',
      severity: 'error'
    });
  }
  
  if (monthlyAmount > contractAmount && contractAmount > 0) {
    result.validation_issues.push({
      field: 'monthly_amount',
      issue: 'القسط الشهري أكبر من مبلغ العقد الإجمالي',
      severity: 'warning'
    });
  }
}

async function validateCustomerAndVehicle(result: ProcessingResult, data: ContractData, supabase: any, companyId: string) {
  console.log('👥 [VALIDATION] Validating customer and vehicle...');
  
  // Check if customer exists
  if (data.customer_name) {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, first_name, last_name, company_name')
      .eq('company_id', companyId)
      .or(`company_name.ilike.%${data.customer_name}%,first_name.ilike.%${data.customer_name}%,last_name.ilike.%${data.customer_name}%`)
      .limit(5);
    
    if (customers && customers.length > 0) {
      result.suggestions.push(`تم العثور على ${customers.length} عميل مشابه في النظام`);
    } else {
      result.suggestions.push('سيتم إنشاء عميل جديد تلقائياً');
    }
  }

  // Check if vehicle exists
  if (data.vehicle_number) {
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, plate_number, make, model')
      .eq('company_id', companyId)
      .ilike('plate_number', `%${data.vehicle_number}%`)
      .limit(5);
    
    if (vehicles && vehicles.length > 0) {
      result.suggestions.push(`تم العثور على ${vehicles.length} مركبة مشابهة في النظام`);
    } else {
      result.validation_issues.push({
        field: 'vehicle_number',
        issue: 'لم يتم العثور على مركبة بهذا الرقم في النظام',
        severity: 'warning'
      });
    }
  }
}

async function generateIntelligentSuggestions(result: ProcessingResult, data: ContractData) {
  console.log('💡 [SUGGESTIONS] Generating intelligent suggestions...');
  
  // Suggest contract number if missing
  if (!data.contract_number) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const suggested = `CNT-${year}${month}${day}-${random}`;
    result.processed_data.contract_number = suggested;
    result.auto_fixes_applied.push({
      field: 'contract_number',
      fix_description: `تم إنشاء رقم عقد تلقائي: ${suggested}`
    });
  }

  // Suggest improvements for description
  if (!data.description || data.description.length < 10) {
    const contractType = result.processed_data.contract_type || data.contract_type;
    let suggestedDesc = '';
    
    switch (contractType) {
      case 'rent_to_own':
        suggestedDesc = 'عقد إيجار منتهي بالتمليك للمركبة';
        break;
      case 'rental':
        suggestedDesc = 'عقد إيجار مركبة';
        break;
      case 'lease':
        suggestedDesc = 'عقد تأجير تشغيلي للمركبة';
        break;
      default:
        suggestedDesc = 'عقد استئجار مركبة';
    }
    
    if (data.vehicle_number) {
      suggestedDesc += ` رقم ${data.vehicle_number}`;
    }
    
    result.corrections.push({
      field: 'description',
      original_value: data.description,
      suggested_value: suggestedDesc,
      reason: 'وصف مقترح بناءً على نوع العقد',
      confidence: 0.7
    });
  }
}

async function performFinalValidation(result: ProcessingResult) {
  console.log('✅ [FINAL_VALIDATION] Performing final validation...');
  
  const required = ['customer_name', 'contract_type', 'start_date', 'end_date'];
  
  for (const field of required) {
    if (!result.processed_data[field as keyof ContractData]) {
      result.validation_issues.push({
        field,
        issue: `الحقل ${field} مطلوب`,
        severity: 'error'
      });
    }
  }

  // Calculate confidence score
  const totalIssues = result.validation_issues.length;
  const errors = result.validation_issues.filter(i => i.severity === 'error').length;
  const warnings = result.validation_issues.filter(i => i.severity === 'warning').length;
  
  let confidence = 1.0;
  confidence -= (errors * 0.3);
  confidence -= (warnings * 0.1);
  confidence += (result.auto_fixes_applied.length * 0.05);
  
  result.suggestions.push(`مستوى الثقة في البيانات: ${Math.round(confidence * 100)}%`);
}