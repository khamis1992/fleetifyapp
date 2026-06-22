import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface TrendPattern {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  strength: number;
  confidence: number;
  seasonal_pattern?: boolean;
  key_drivers: string[];
}

export interface RiskIndicator {
  risk_type: 'financial' | 'operational' | 'customer' | 'regulatory';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: number;
  description: string;
  recommended_actions: string[];
  timeline: string;
}

export interface PredictiveInsight {
  metric: string;
  current_value: number;
  predicted_value: number;
  prediction_date: string;
  confidence: number;
  factors: string[];
}

export interface SmartAnalysisResult {
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

export interface BehaviorAnalysis {
  customer_patterns: {
    payment_behavior: string;
    contract_renewal_rate: number;
    average_contract_duration: number;
    preferred_payment_methods: string[];
  };
  seasonal_trends: {
    peak_months: string[];
    low_months: string[];
    growth_pattern: string;
  };
  operational_patterns: {
    vehicle_utilization: number;
    maintenance_frequency: string;
    employee_productivity: number;
  };
}

export const useSmartAnalytics = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { companyId } = useUnifiedCompanyAccess();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Main smart analysis function
  const performSmartAnalysis = useCallback(async (
    analysisType: 'revenue' | 'customer_behavior' | 'contract_performance' | 'risk_assessment' | 'comprehensive' = 'comprehensive',
    timePeriod: '30d' | '90d' | '6m' | '1y' | 'all' = '90d',
    includePredictions: boolean = true
  ): Promise<SmartAnalysisResult> => {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب');
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('smart-analysis-engine', {
        body: {
          company_id: companyId,
          analysis_type: analysisType,
          time_period: timePeriod,
          include_predictions: includePredictions
        }
      });

      if (error) {
        throw new Error(error.message || 'حدث خطأ في التحليل الذكي');
      }

      if (!data.success) {
        throw new Error(data.error || 'فشل في إجراء التحليل');
      }

      return data.result as SmartAnalysisResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, [companyId]);

  // Behavior analysis function
  const analyzeBehaviorPatterns = useCallback(async (): Promise<BehaviorAnalysis> => {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب');
    }

    try {
      // Get customer payment behavior
      const { data: payments } = await supabase
        .from('payments')
        .select('payment_method, payment_date, amount, customer_id')
        .eq('company_id', companyId);

      // Get contract patterns
      const { data: contracts } = await supabase
        .from('contracts')
        .select('start_date, end_date, status, customer_id, contract_amount')
        .eq('company_id', companyId);

      // Get vehicle utilization
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('status, current_mileage')
        .eq('company_id', companyId);

      // Analyze payment behavior
      const paymentMethods = payments?.reduce((acc: Record<string, number>, payment) => {
        acc[payment.payment_method] = (acc[payment.payment_method] || 0) + 1;
        return acc;
      }, {}) || {};

      const preferredMethods = Object.entries(paymentMethods)
        .sort(([,a], [,b]) => b - a)
        .map(([method]) => method);

      // Analyze contract patterns
      const activeContracts = contracts?.filter(c => c.status === 'active') || [];
      const completedContracts = contracts?.filter(c => c.status === 'completed') || [];
      
      const renewalRate = contracts?.length > 0 ? 
        (activeContracts.length / contracts.length) * 100 : 0;

      const avgDuration = completedContracts.length > 0 ?
        completedContracts.reduce((sum, contract) => {
          const start = new Date(contract.start_date);
          const end = new Date(contract.end_date);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / completedContracts.length : 0;

      // Analyze seasonal trends
      const monthlyRevenue: Record<string, number> = {};
      contracts?.forEach(contract => {
        const month = new Date(contract.start_date).getMonth();
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (contract.contract_amount || 0);
      });

      const revenueEntries = Object.entries(monthlyRevenue)
        .map(([month, revenue]) => ({ month: parseInt(month), revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      const peakMonths = revenueEntries.slice(0, 3).map(e => {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                       'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return months[e.month];
      });

      const lowMonths = revenueEntries.slice(-2).map(e => {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                       'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return months[e.month];
      });

      // Vehicle utilization
      const totalVehicles = vehicles?.length || 0;
      const activeVehicles = vehicles?.filter(v => v.status === 'rented').length || 0;
      const utilization = totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0;

      const behaviorAnalysis: BehaviorAnalysis = {
        customer_patterns: {
          payment_behavior: preferredMethods[0] || 'غير محدد',
          contract_renewal_rate: renewalRate,
          average_contract_duration: Math.round(avgDuration),
          preferred_payment_methods: preferredMethods.slice(0, 3)
        },
        seasonal_trends: {
          peak_months: peakMonths,
          low_months: lowMonths,
          growth_pattern: revenueEntries.length > 6 ? 'متغير موسمياً' : 'ثابت'
        },
        operational_patterns: {
          vehicle_utilization: utilization,
          maintenance_frequency: 'شهري', // This would need more data analysis
          employee_productivity: 85 // This would need more complex calculation
        }
      };

      return behaviorAnalysis;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ في تحليل السلوك';
      setError(errorMessage);
      throw err;
    }
  }, [companyId]);

  // Risk monitoring function
  const monitorRisks = useCallback(async (): Promise<RiskIndicator[]> => {
    const analysis = await performSmartAnalysis('risk_assessment', '90d', false);
    return analysis.risks;
  }, [performSmartAnalysis]);

  // Performance benchmarking
  const getBenchmarks = useCallback(async (): Promise<any> => {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب');
    }

    try {
      // This would typically compare with industry standards
      // For now, we'll return some sample benchmarks
      return {
        industry_averages: {
          collection_rate: 85,
          customer_satisfaction: 78,
          contract_renewal_rate: 65,
          vehicle_utilization: 75
        },
        your_performance: {
          collection_rate: 0, // Will be calculated
          customer_satisfaction: 0,
          contract_renewal_rate: 0,
          vehicle_utilization: 0
        },
        ranking: 'متوسط', // Based on comparison
        improvement_areas: [
          'تحسين معدل التحصيل',
          'زيادة رضا العملاء',
          'تطوير استراتيجية التجديد'
        ]
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ في جلب المعايير');
      throw err;
    }
  }, [companyId]);

  // Trend forecasting
  const forecastTrends = useCallback(async (metric: string, periods: number = 6): Promise<PredictiveInsight[]> => {
    const analysis = await performSmartAnalysis('comprehensive', '1y', true);
    return analysis.predictions.filter(p => p.metric.includes(metric));
  }, [performSmartAnalysis]);

  return {
    // Core functions
    performSmartAnalysis,
    analyzeBehaviorPatterns,
    monitorRisks,
    getBenchmarks,
    forecastTrends,
    
    // State
    isAnalyzing,
    error,
    
    // Utilities
    clearError
  };
};