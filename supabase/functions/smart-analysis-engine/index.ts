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

interface TrendAnalysisRequest {
  company_id: string;
  analysis_type: 'revenue' | 'customer_behavior' | 'contract_performance' | 'risk_assessment' | 'comprehensive';
  time_period: '30d' | '90d' | '6m' | '1y' | 'all';
  include_predictions?: boolean;
}

interface TrendPattern {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  strength: number; // 0-1
  confidence: number; // 0-1
  seasonal_pattern?: boolean;
  key_drivers: string[];
}

interface RiskIndicator {
  risk_type: 'financial' | 'operational' | 'customer' | 'regulatory';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-1
  impact: number; // 0-1
  description: string;
  recommended_actions: string[];
  timeline: string;
}

interface PredictiveInsight {
  metric: string;
  current_value: number;
  predicted_value: number;
  prediction_date: string;
  confidence: number;
  factors: string[];
}

interface SmartAnalysisResult {
  company_id: string;
  analysis_date: string;
  trends: TrendPattern[];
  risks: RiskIndicator[];
  predictions: PredictiveInsight[];
  performance_score: number;
  key_insights: string[];
  recommendations: string[];
  benchmarks: any;
}

// Advanced pattern detection algorithms
class PatternDetector {
  static detectTrend(data: number[]): { trend: string; strength: number } {
    if (data.length < 3) return { trend: 'stable', strength: 0 };
    
    let increases = 0;
    let decreases = 0;
    let volatility = 0;
    
    for (let i = 1; i < data.length; i++) {
      const change = (data[i] - data[i-1]) / data[i-1];
      if (change > 0.05) increases++;
      else if (change < -0.05) decreases++;
      
      volatility += Math.abs(change);
    }
    
    volatility /= data.length - 1;
    
    if (volatility > 0.3) return { trend: 'volatile', strength: volatility };
    
    const trendRatio = increases / (increases + decreases);
    if (trendRatio > 0.7) return { trend: 'increasing', strength: trendRatio };
    if (trendRatio < 0.3) return { trend: 'decreasing', strength: 1 - trendRatio };
    
    return { trend: 'stable', strength: 0.5 };
  }
  
  static detectSeasonality(data: number[], period: number = 12): boolean {
    if (data.length < period * 2) return false;
    
    let correlation = 0;
    const dataPoints = Math.floor(data.length / period);
    
    for (let i = 0; i < dataPoints - 1; i++) {
      for (let j = 0; j < period; j++) {
        const idx1 = i * period + j;
        const idx2 = (i + 1) * period + j;
        if (idx2 < data.length) {
          const corr = Math.abs(data[idx1] - data[idx2]) / Math.max(data[idx1], data[idx2]);
          correlation += (1 - corr);
        }
      }
    }
    
    return (correlation / (dataPoints * period)) > 0.6;
  }
}

// Risk assessment engine
class RiskAssessment {
  static async assessFinancialRisk(companyId: string): Promise<RiskIndicator[]> {
    const risks: RiskIndicator[] = [];
    
    // Get financial data
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, status, due_date, created_at')
      .eq('company_id', companyId);
    
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .eq('company_id', companyId);
    
    if (!invoices || !payments) return risks;
    
    // Calculate collection ratio
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalCollected = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const collectionRatio = totalInvoiced > 0 ? totalCollected / totalInvoiced : 1;
    
    if (collectionRatio < 0.7) {
      risks.push({
        risk_type: 'financial',
        severity: collectionRatio < 0.5 ? 'critical' : 'high',
        probability: 0.8,
        impact: 0.9,
        description: `معدل التحصيل منخفض: ${(collectionRatio * 100).toFixed(1)}%`,
        recommended_actions: [
          'تفعيل نظام المتابعة الآلية للمدفوعات',
          'مراجعة شروط الدفع في العقود',
          'تنفيذ حملة تحصيل مكثفة'
        ],
        timeline: 'immediate'
      });
    }
    
    // Check overdue invoices
    const now = new Date();
    const overdueInvoices = invoices.filter(inv => 
      inv.status !== 'paid' && new Date(inv.due_date) < now
    );
    
    if (overdueInvoices.length > invoices.length * 0.2) {
      risks.push({
        risk_type: 'financial',
        severity: 'medium',
        probability: 0.7,
        impact: 0.6,
        description: `${overdueInvoices.length} فاتورة متأخرة السداد`,
        recommended_actions: [
          'التواصل الفوري مع العملاء المتأخرين',
          'تطبيق غرامات التأخير',
          'مراجعة السياسات الائتمانية'
        ],
        timeline: 'within_week'
      });
    }
    
    return risks;
  }
  
  static async assessCustomerRisk(companyId: string): Promise<RiskIndicator[]> {
    const risks: RiskIndicator[] = [];
    
    const { data: customers } = await supabase
      .from('customers')
      .select('id, is_blacklisted, total_contracts, created_at')
      .eq('company_id', companyId);
    
    if (!customers) return risks;
    
    const blacklistedCount = customers.filter(c => c.is_blacklisted).length;
    const blacklistRatio = blacklistedCount / customers.length;
    
    if (blacklistRatio > 0.1) {
      risks.push({
        risk_type: 'customer',
        severity: blacklistRatio > 0.2 ? 'high' : 'medium',
        probability: 0.6,
        impact: 0.7,
        description: `نسبة عالية من العملاء المحظورين: ${(blacklistRatio * 100).toFixed(1)}%`,
        recommended_actions: [
          'تحسين عملية فحص العملاء الجدد',
          'مراجعة أسباب حظر العملاء',
          'تطوير برنامج استرداد العملاء'
        ],
        timeline: 'within_month'
      });
    }
    
    return risks;
  }
}

// Predictive analytics engine
class PredictiveAnalytics {
  static async predictRevenue(companyId: string, months: number = 3): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    // Get historical revenue data
    const { data: contracts } = await supabase
      .from('contracts')
      .select('contract_amount, start_date, end_date, status')
      .eq('company_id', companyId)
      .eq('status', 'active');
    
    if (!contracts || contracts.length === 0) return insights;
    
    // Calculate monthly revenue trend
    const monthlyRevenue: Record<string, number> = {};
    
    contracts.forEach(contract => {
      const startDate = new Date(contract.start_date);
      const endDate = new Date(contract.end_date);
      const monthlyAmount = contract.contract_amount / 
        (Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const monthKey = currentDate.toISOString().substring(0, 7);
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + monthlyAmount;
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    });
    
    const revenueValues = Object.values(monthlyRevenue);
    const avgRevenue = revenueValues.reduce((sum, val) => sum + val, 0) / revenueValues.length;
    const trendAnalysis = PatternDetector.detectTrend(revenueValues);
    
    // Predict future revenue
    let growthRate = 0;
    if (trendAnalysis.trend === 'increasing') growthRate = 0.05 * trendAnalysis.strength;
    else if (trendAnalysis.trend === 'decreasing') growthRate = -0.03 * trendAnalysis.strength;
    
    for (let i = 1; i <= months; i++) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i);
      
      const predictedRevenue = avgRevenue * Math.pow(1 + growthRate, i);
      
      insights.push({
        metric: 'monthly_revenue',
        current_value: avgRevenue,
        predicted_value: predictedRevenue,
        prediction_date: futureDate.toISOString().substring(0, 7),
        confidence: Math.max(0.5, 1 - (i * 0.1)), // Confidence decreases with time
        factors: [
          'اتجاه الإيرادات التاريخي',
          'العقود النشطة الحالية',
          'الموسمية في الأعمال'
        ]
      });
    }
    
    return insights;
  }
  
  static async predictCustomerChurn(companyId: string): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    
    // Get customer contract history
    const { data: customers } = await supabase
      .from('customers')
      .select(`
        id, created_at, is_active,
        contracts(id, status, start_date, end_date)
      `)
      .eq('company_id', companyId);
    
    if (!customers) return insights;
    
    let churnedCustomers = 0;
    let totalCustomers = customers.length;
    
    // Calculate historical churn rate
    customers.forEach(customer => {
      const contracts = customer.contracts || [];
      const activeContracts = contracts.filter(c => c.status === 'active');
      if (activeContracts.length === 0 && contracts.length > 0) {
        churnedCustomers++;
      }
    });
    
    const currentChurnRate = churnedCustomers / totalCustomers;
    const predictedChurnRate = Math.min(currentChurnRate * 1.1, 0.5); // Slight increase expected
    
    insights.push({
      metric: 'customer_churn_rate',
      current_value: currentChurnRate,
      predicted_value: predictedChurnRate,
      prediction_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      confidence: 0.7,
      factors: [
        'معدل انقطاع العملاء التاريخي',
        'حالة العقود المنتهية',
        'سلوك تجديد العقود'
      ]
    });
    
    return insights;
  }
}

// Main analysis orchestrator
async function performSmartAnalysis(request: TrendAnalysisRequest): Promise<SmartAnalysisResult> {
  const { company_id, analysis_type, include_predictions = true } = request;
  
  console.log(`🔍 Starting smart analysis for company ${company_id}, type: ${analysis_type}`);
  
  // Initialize result structure
  const result: SmartAnalysisResult = {
    company_id,
    analysis_date: new Date().toISOString(),
    trends: [],
    risks: [],
    predictions: [],
    performance_score: 0,
    key_insights: [],
    recommendations: [],
    benchmarks: {}
  };
  
  try {
    // Perform risk assessments
    const [financialRisks, customerRisks] = await Promise.all([
      RiskAssessment.assessFinancialRisk(company_id),
      RiskAssessment.assessCustomerRisk(company_id)
    ]);
    
    result.risks = [...financialRisks, ...customerRisks];
    
    // Perform predictive analysis if requested
    if (include_predictions) {
      const [revenuePredictwions, churnPredictions] = await Promise.all([
        PredictiveAnalytics.predictRevenue(company_id),
        PredictiveAnalytics.predictCustomerChurn(company_id)
      ]);
      
      result.predictions = [...revenuePredictwions, ...churnPredictions];
    }
    
    // Calculate performance score based on risks and trends
    let score = 100;
    result.risks.forEach(risk => {
      if (risk.severity === 'critical') score -= 20;
      else if (risk.severity === 'high') score -= 10;
      else if (risk.severity === 'medium') score -= 5;
    });
    
    result.performance_score = Math.max(0, score);
    
    // Generate key insights
    result.key_insights = generateKeyInsights(result);
    
    // Generate recommendations
    result.recommendations = generateRecommendations(result);
    
    // Store analysis results for learning
    await supabase.from('ai_analysis_results').insert({
      company_id,
      analysis_type,
      results: result,
      confidence_score: calculateOverallConfidence(result)
    });
    
    return result;
    
  } catch (error) {
    console.error('Error in smart analysis:', error);
    throw error;
  }
}

function generateKeyInsights(result: SmartAnalysisResult): string[] {
  const insights: string[] = [];
  
  // Risk-based insights
  const criticalRisks = result.risks.filter(r => r.severity === 'critical');
  if (criticalRisks.length > 0) {
    insights.push(`تم اكتشاف ${criticalRisks.length} مخاطر حرجة تتطلب اهتماماً فورياً`);
  }
  
  const financialRisks = result.risks.filter(r => r.risk_type === 'financial');
  if (financialRisks.length > 0) {
    insights.push('هناك تحديات في الأداء المالي تحتاج لمراجعة عاجلة');
  }
  
  // Performance insights
  if (result.performance_score > 80) {
    insights.push('الأداء العام للشركة ممتاز مع فرص للتحسين');
  } else if (result.performance_score > 60) {
    insights.push('الأداء العام جيد مع بعض المجالات التي تحتاج تطوير');
  } else {
    insights.push('الأداء العام يحتاج تحسينات جوهرية');
  }
  
  // Prediction insights
  const revenuePredictions = result.predictions.filter(p => p.metric === 'monthly_revenue');
  if (revenuePredictions.length > 0) {
    const avgGrowth = revenuePredictions.reduce((sum, p) => 
      sum + ((p.predicted_value - p.current_value) / p.current_value), 0) / revenuePredictions.length;
    
    if (avgGrowth > 0.05) {
      insights.push('التوقعات تشير إلى نمو إيجابي في الإيرادات');
    } else if (avgGrowth < -0.05) {
      insights.push('التوقعات تشير إلى تراجع محتمل في الإيرادات');
    }
  }
  
  return insights;
}

function generateRecommendations(result: SmartAnalysisResult): string[] {
  const recommendations: string[] = [];
  
  // Risk-based recommendations
  result.risks.forEach(risk => {
    recommendations.push(...risk.recommended_actions);
  });
  
  // Performance-based recommendations
  if (result.performance_score < 70) {
    recommendations.push('إجراء مراجعة شاملة للعمليات والاستراتيجيات');
    recommendations.push('تطوير خطة تحسين شاملة مع جدول زمني واضح');
  }
  
  // General strategic recommendations
  recommendations.push('تنفيذ نظام مراقبة دورية للمؤشرات الرئيسية');
  recommendations.push('إعداد تقارير شهرية لمتابعة التقدم');
  
  return [...new Set(recommendations)]; // Remove duplicates
}

function calculateOverallConfidence(result: SmartAnalysisResult): number {
  let totalConfidence = 0;
  let count = 0;
  
  result.predictions.forEach(p => {
    totalConfidence += p.confidence;
    count++;
  });
  
  result.risks.forEach(r => {
    totalConfidence += r.probability;
    count++;
  });
  
  return count > 0 ? totalConfidence / count : 0.5;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: TrendAnalysisRequest = await req.json();

    if (!request.company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Company ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🧠 Smart Analysis Engine processing request for company: ${request.company_id}`);

    const startTime = Date.now();
    const result = await performSmartAnalysis(request);
    const processingTime = Date.now() - startTime;

    console.log(`✅ Analysis completed in ${processingTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      result,
      processing_time: processingTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in smart analysis engine:', error);
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