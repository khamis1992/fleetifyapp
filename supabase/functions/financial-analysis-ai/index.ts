import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisData, companyType, language = 'ar', userId } = await req.json();
    
    console.log('Request body received:', { 
      hasAnalysisData: !!analysisData, 
      companyType, 
      language,
      userId,
      overallScore: analysisData?.overallScore 
    });
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured - please add the API key in Supabase settings');
    }

    if (!analysisData) {
      throw new Error('Analysis data is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting AI financial analysis...');

    const systemPrompt = language === 'ar' ? `
أنت خبير محاسبي ومالي متخصص في تحليل الأنظمة المحاسبية. قم بتحليل البيانات المالية المقدمة وتوفير:

1. تحليل شامل لحالة النظام المالي
2. تحديد المشاكل والنواقص الحرجة
3. اقتراحات محددة للتحسين مرتبة حسب الأولوية
4. تقييم المخاطر المالية والتشغيلية
5. خطة عمل واضحة للإصلاح

كن دقيقاً ومحدداً في تحليلك واستخدم أفضل الممارسات المحاسبية.
` : `
You are an expert financial and accounting analyst specializing in accounting system analysis. Analyze the provided financial data and provide:

1. Comprehensive analysis of financial system status
2. Identify critical issues and gaps
3. Specific improvement suggestions prioritized
4. Assessment of financial and operational risks  
5. Clear action plan for fixes

Be precise and specific in your analysis using accounting best practices.
`;

    const userPrompt = `
Financial System Analysis Data:
- Total Accounts: ${analysisData.totalAccounts}
- Chart of Accounts Score: ${analysisData.chartOfAccountsScore}%
- Linkage Score: ${analysisData.linkageScore}%
- Cost Centers Score: ${analysisData.costCentersScore}%
- Operations Score: ${analysisData.operationsScore}%
- Overall Score: ${analysisData.overallScore}%

Detailed Metrics:
- Linked Customers: ${analysisData.linkedCustomers}/${analysisData.linkedCustomers + analysisData.unlinkedCustomers}
- Linked Vehicles: ${analysisData.linkedVehicles}/${analysisData.linkedVehicles + analysisData.unlinkedVehicles}
- Linked Contracts: ${analysisData.linkedContracts}/${analysisData.linkedContracts + analysisData.unlinkedContracts}
- Active Cost Centers: ${analysisData.activeCostCenters}
- Recent Journal Entries: ${analysisData.recentJournalEntries}

Company Type: ${companyType || 'Vehicle Rental/Leasing'}

Current Issues:
${analysisData.issues?.map((issue: any) => `- ${issue.title}: ${issue.description}`).join('\n') || 'No specific issues reported'}

Please provide a detailed analysis and actionable recommendations.
`;

    console.log('Calling OpenAI with prompt length:', userPrompt.length);

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const aiResult = await response.json();
    console.log('OpenAI result received, choices length:', aiResult.choices?.length);
    
    if (!aiResult.choices || aiResult.choices.length === 0) {
      throw new Error('No AI response received');
    }
    
    const analysis = aiResult.choices[0].message.content;

    console.log('AI analysis completed successfully');

    // Parse AI response into structured format
    const structuredAnalysis = {
      analysis: analysis,
      confidence: calculateConfidence(analysisData),
      recommendations: extractRecommendations(analysis),
      riskLevel: assessRiskLevel(analysisData),
      urgentActions: extractUrgentActions(analysis),
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(structuredAnalysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in financial analysis AI:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback: true 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateConfidence(data: any): number {
  const scores = [
    data.chartOfAccountsScore,
    data.linkageScore,
    data.costCentersScore,
    data.operationsScore
  ];
  
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avgScore);
}

function extractRecommendations(analysis: string): string[] {
  // Simple extraction - in production, could use more sophisticated parsing
  const lines = analysis.split('\n');
  const recommendations = lines
    .filter(line => line.includes('اقتراح') || line.includes('يجب') || line.includes('recommendation'))
    .slice(0, 5);
  
  return recommendations.length > 0 ? recommendations : [
    'تحسين ربط الحسابات بالكيانات',
    'إنشاء مراكز تكلفة إضافية',
    'مراجعة هيكل دليل الحسابات'
  ];
}

function assessRiskLevel(data: any): 'low' | 'medium' | 'high' | 'critical' {
  const overallScore = data.overallScore;
  
  if (overallScore >= 85) return 'low';
  if (overallScore >= 70) return 'medium';
  if (overallScore >= 50) return 'high';
  return 'critical';
}

function extractUrgentActions(analysis: string): string[] {
  const lines = analysis.split('\n');
  const urgentActions = lines
    .filter(line => line.includes('عاجل') || line.includes('فوري') || line.includes('urgent'))
    .slice(0, 3);
    
  return urgentActions.length > 0 ? urgentActions : [
    'مراجعة الحسابات غير المربوطة',
    'تحديث مراكز التكلفة'
  ];
}