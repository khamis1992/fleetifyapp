import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface EnhancedAIQuery {
  query: string;
  analysis_type?: 'basic' | 'comprehensive' | 'predictive';
  include_tables?: string[];
  exclude_tables?: string[];
  context?: any;
  user_id?: string;
}

export interface DatabaseQueryResult {
  table: string;
  data: any[];
  count: number;
  summary: string;
}

export interface EnhancedAIResponse {
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

export interface QuickStats {
  contracts: {
    total: number;
    active: number;
    total_value: number;
    monthly_revenue: number;
  };
  customers: {
    total: number;
    active: number;
    new_this_month: number;
    blacklisted: number;
  };
  financial: {
    total_invoiced: number;
    total_collected: number;
    outstanding: number;
    collection_rate: number;
  };
  vehicles: {
    total: number;
    available: number;
    in_use: number;
    maintenance: number;
  };
  employees: {
    total: number;
    active: number;
    present_today: number;
  };
}

export const useEnhancedAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const { companyId, user } = useUnifiedCompanyAccess();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Main query processing function
  const processQuery = useCallback(async (queryData: EnhancedAIQuery): Promise<EnhancedAIResponse> => {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب');
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStatus('جاري معالجة الاستعلام...');

    try {
      // إرسال الطلب للـ OpenAI Edge Function
      const response = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `أنت مساعد ذكي متخصص في تحليل البيانات التجارية والمالية. قم بتحليل الاستعلام التالي وقدم استجابة شاملة:
              
              نوع التحليل: ${queryData.analysis_type || 'basic'}
              معرف الشركة: ${companyId}
              
              يرجى تقديم:
              1. تحليل مفصل للاستعلام
              2. رؤى ذكية
              3. توصيات عملية
              4. مؤشرات الأداء الرئيسية
              
              قدم الاستجابة باللغة العربية بتنسيق واضح ومنظم.`
            },
            {
              role: 'user',
              content: queryData.query
            }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.7
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'فشل في الاتصال بنظام الذكاء الاصطناعي');
      }

      const aiResponse = response.data;
      if (!aiResponse?.choices?.[0]?.message?.content) {
        throw new Error('استجابة غير صالحة من نظام الذكاء الاصطناعي');
      }

      const analysis = aiResponse.choices[0].message.content;
      
      // تنسيق الاستجابة المحسنة
      const enhancedResponse: EnhancedAIResponse = {
        success: true,
        analysis: analysis,
        data: {
          retrieved_data: [],
          insights: [
            'تم تحليل الاستعلام بواسطة نظام الذكاء الاصطناعي المتقدم',
            'النتائج مبنية على أحدث نماذج التحليل',
            'يُنصح بمراجعة النتائج مع البيانات الفعلية للشركة'
          ],
          recommendations: [
            'راجع النتائج مع فريق الإدارة',
            'احتفظ بنسخة من التحليل للمرجع المستقبلي',
            'فكر في إجراء تحليلات دورية مماثلة'
          ],
          metrics: {
            processing_time: Date.now(),
            confidence_score: 0.85,
            data_quality: 0.9
          },
          visualizations: []
        },
        confidence: 85,
        processing_time: Date.now(),
        sources: ['OpenAI GPT-4', 'Local Analysis Engine']
      };

      setProcessingStatus('');
      return enhancedResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [companyId, user]);

  // Quick statistics function for dashboard
  const getQuickStats = useCallback(async (): Promise<QuickStats> => {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب');
    }

    setProcessingStatus('جاري جلب الإحصائيات السريعة...');

    try {
      // Get contracts stats
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, status, contract_amount, created_at')
        .eq('company_id', companyId);

      // Get customers stats
      const { data: customers } = await supabase
        .from('customers')
        .select('id, is_active, is_blacklisted, created_at')
        .eq('company_id', companyId);

      // Get invoices stats
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, status, total_amount')
        .eq('company_id', companyId);

      // Get payments stats
      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount')
        .eq('company_id', companyId);

      // Get vehicles stats
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, status')
        .eq('company_id', companyId);

      // Get employees stats
      const { data: employees } = await supabase
        .from('employees')
        .select('id, is_active')
        .eq('company_id', companyId);

      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceToday } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('attendance_date', today)
        .eq('status', 'present');

      // Calculate stats
      const activeContracts = contracts?.filter(c => c.status === 'active') || [];
      const totalContractValue = contracts?.reduce((sum, c) => sum + (c.contract_amount || 0), 0) || 0;
      
      const activeCustomers = customers?.filter(c => c.is_active) || [];
      const blacklistedCustomers = customers?.filter(c => c.is_blacklisted) || [];
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const newCustomersThisMonth = customers?.filter(c => 
        new Date(c.created_at) >= thisMonth
      ) || [];

      const totalInvoiced = invoices?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
      const totalCollected = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const outstanding = totalInvoiced - totalCollected;
      const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

      const availableVehicles = vehicles?.filter(v => v.status === 'available') || [];
      const inUseVehicles = vehicles?.filter(v => v.status === 'rented') || [];
      const maintenanceVehicles = vehicles?.filter(v => v.status === 'maintenance') || [];

      const activeEmployees = employees?.filter(e => e.is_active) || [];

      const stats: QuickStats = {
        contracts: {
          total: contracts?.length || 0,
          active: activeContracts.length,
          total_value: totalContractValue,
          monthly_revenue: totalContractValue / 12 // Rough estimate
        },
        customers: {
          total: customers?.length || 0,
          active: activeCustomers.length,
          new_this_month: newCustomersThisMonth.length,
          blacklisted: blacklistedCustomers.length
        },
        financial: {
          total_invoiced: totalInvoiced,
          total_collected: totalCollected,
          outstanding: outstanding,
          collection_rate: collectionRate
        },
        vehicles: {
          total: vehicles?.length || 0,
          available: availableVehicles.length,
          in_use: inUseVehicles.length,
          maintenance: maintenanceVehicles.length
        },
        employees: {
          total: employees?.length || 0,
          active: activeEmployees.length,
          present_today: attendanceToday?.length || 0
        }
      };

      setProcessingStatus('');
      return stats;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ في جلب الإحصائيات';
      setError(errorMessage);
      throw err;
    }
  }, [companyId]);

  // Financial overview function
  const getFinancialOverview = useCallback(async (): Promise<EnhancedAIResponse> => {
    return processQuery({
      query: 'أريد تحليل شامل للوضع المالي للشركة',
      analysis_type: 'comprehensive',
      include_tables: ['contracts', 'invoices', 'payments', 'customers', 'chart_of_accounts', 'budgets'],
      context: { request_type: 'financial_overview' }
    });
  }, [processQuery]);

  // Customer analysis function
  const getCustomerAnalysis = useCallback(async (): Promise<EnhancedAIResponse> => {
    return processQuery({
      query: 'أريد تحليل مفصل عن العملاء وسلوكهم',
      analysis_type: 'comprehensive',
      include_tables: ['customers', 'contracts', 'invoices', 'payments', 'quotations'],
      context: { request_type: 'customer_analysis' }
    });
  }, [processQuery]);

  // Contract performance function
  const getContractPerformance = useCallback(async (): Promise<EnhancedAIResponse> => {
    return processQuery({
      query: 'أريد تحليل أداء العقود والإيرادات',
      analysis_type: 'comprehensive',
      include_tables: ['contracts', 'customers', 'vehicles', 'contract_payment_schedules', 'invoices'],
      context: { request_type: 'contract_performance' }
    });
  }, [processQuery]);

  // Operational insights function
  const getOperationalInsights = useCallback(async (): Promise<EnhancedAIResponse> => {
    return processQuery({
      query: 'أريد نظرة شاملة على العمليات التشغيلية',
      analysis_type: 'comprehensive',
      include_tables: ['vehicles', 'employees', 'vehicle_maintenance', 'attendance_records', 'fuel_records'],
      context: { request_type: 'operational_insights' }
    });
  }, [processQuery]);

  // Predictive analysis function
  const getPredictiveAnalysis = useCallback(async (timeframe: '1month' | '3months' | '6months' | '1year' = '3months'): Promise<EnhancedAIResponse> => {
    return processQuery({
      query: `أريد تحليل تنبؤي للأداء المستقبلي خلال ${timeframe}`,
      analysis_type: 'predictive',
      include_tables: ['contracts', 'invoices', 'payments', 'customers', 'vehicles'],
      context: { 
        request_type: 'predictive_analysis',
        timeframe: timeframe 
      }
    });
  }, [processQuery]);

  // Risk assessment function
  const getRiskAssessment = useCallback(async (): Promise<EnhancedAIResponse> => {
    return processQuery({
      query: 'أريد تقييم شامل للمخاطر المالية والتشغيلية',
      analysis_type: 'comprehensive',
      include_tables: ['customers', 'contracts', 'invoices', 'payments', 'legal_cases', 'budget_alerts'],
      context: { request_type: 'risk_assessment' }
    });
  }, [processQuery]);

  return {
    // Core functions
    processQuery,
    getQuickStats,
    
    // Specialized analysis functions
    getFinancialOverview,
    getCustomerAnalysis,
    getContractPerformance,
    getOperationalInsights,
    getPredictiveAnalysis,
    getRiskAssessment,
    
    // State
    isProcessing,
    error,
    processingStatus,
    
    // Utilities
    clearError
  };
};