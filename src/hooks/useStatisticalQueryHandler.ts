import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatisticalQueryClassification } from './useStatisticalQueryClassifier';

interface StatisticalBreakdown {
  category: string;
  value: number;
  percentage?: number;
}

interface StatisticalData {
  value: number;
  label: string;
  description: string;
  chartData?: any[];
  breakdown?: StatisticalBreakdown[];
}

interface StatisticalVisualization {
  type: 'card' | 'bar_chart' | 'pie_chart' | 'line_chart' | 'table';
  title: string;
  data: any;
  config?: any;
}

export interface StatisticalResponse {
  success: boolean;
  data: StatisticalData;
  visualizations: StatisticalVisualization[];
  suggestions: string[];
  metadata: {
    query: string;
    executionTime: number;
    dataSource: 'database' | 'cache';
    refreshedAt: Date;
  };
}

export const useStatisticalQueryHandler = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContractStatistics = async (
    classification: StatisticalQueryClassification,
    companyId: string
  ): Promise<StatisticalData> => {
    const { filters, statisticalType } = classification;
    
    // Build base query
    let baseQuery = supabase
      .from('contracts')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId);
    
    // Apply status filter if present
    if (filters?.status) {
      baseQuery = baseQuery.eq('status', filters.status);
    }
    
    const { data, error, count } = await baseQuery;
    
    if (error) throw error;
    
    if (statisticalType === 'count') {
      // Get breakdown by status for all contracts in company
      const statusQueryResult = await supabase
        .from('contracts')
        .select('status')
        .eq('company_id', companyId);
      
      const statusData = statusQueryResult.data || [];
      
      const breakdown = statusData.reduce((acc: StatisticalBreakdown[], contract) => {
        const status = contract.status || 'غير محدد';
        const existing = acc.find(item => item.category === status);
        if (existing) {
          existing.value++;
        } else {
          acc.push({ category: status, value: 1 });
        }
        return acc;
      }, []);
      
      // Calculate percentages
      const total = breakdown.reduce((sum, item) => sum + item.value, 0);
      breakdown.forEach(item => {
        item.percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
      });
      
      const statusLabel = filters?.status ? getStatusLabel(filters.status) : 'العقود';
      
      return {
        value: count || 0,
        label: `عدد ${statusLabel}`,
        description: `إجمالي عدد ${statusLabel}`,
        breakdown,
        chartData: breakdown.map(item => ({
          name: getStatusLabel(item.category),
          value: item.value,
          percentage: item.percentage
        }))
      };
    }
    
    if (statisticalType === 'sum') {
      const totalAmount = data?.reduce((sum, contract) => sum + (contract.contract_amount || 0), 0) || 0;
      
      return {
        value: totalAmount,
        label: 'إجمالي قيمة العقود',
        description: 'إجمالي قيمة العقود المحددة',
        chartData: data?.map(contract => ({
          name: contract.contract_number,
          value: contract.contract_amount || 0
        })) || []
      };
    }
    
    return {
      value: count || 0,
      label: 'العقود',
      description: 'إحصائيات العقود',
      breakdown: []
    };
  };

  const handleCustomerStatistics = async (
    classification: StatisticalQueryClassification,
    companyId: string
  ): Promise<StatisticalData> => {
    const { filters } = classification;
    
    let baseQuery = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId);
    
    // Apply filters
    if (filters?.status === 'active') {
      baseQuery = baseQuery.eq('is_active', true);
    } else if (filters?.status) {
      baseQuery = baseQuery.eq('is_active', false);
    }
    
    const { data, error, count } = await baseQuery;
    if (error) throw error;
    
    // Get breakdown by customer type
    const breakdown = data?.reduce((acc: StatisticalBreakdown[], customer) => {
      const type = customer.customer_type || 'غير محدد';
      const existing = acc.find(item => item.category === type);
      if (existing) {
        existing.value++;
      } else {
        acc.push({ category: type, value: 1 });
      }
      return acc;
    }, []) || [];
    
    const total = breakdown.reduce((sum, item) => sum + item.value, 0);
    breakdown.forEach(item => {
      item.percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
    });
    
    return {
      value: count || 0,
      label: 'عدد العملاء',
      description: 'إجمالي عدد العملاء المسجلين',
      breakdown,
      chartData: breakdown.map(item => ({
        name: getCustomerTypeLabel(item.category),
        value: item.value,
        percentage: item.percentage
      }))
    };
  };

  const processStatisticalQuery = async (
    query: string,
    classification: StatisticalQueryClassification,
    companyId: string
  ): Promise<StatisticalResponse> => {
    setIsProcessing(true);
    setError(null);
    const startTime = Date.now();
    
    try {
      let responseData: StatisticalData;
      
      switch (classification.queryCategory) {
        case 'contracts':
          responseData = await handleContractStatistics(classification, companyId);
          break;
        case 'customers':
          responseData = await handleCustomerStatistics(classification, companyId);
          break;
        default:
          throw new Error('نوع الاستفسار الإحصائي غير مدعوم');
      }
      
      // Generate visualizations
      const visualizations: StatisticalVisualization[] = [];
      
      // Main metric card
      visualizations.push({
        type: 'card',
        title: responseData.label,
        data: {
          value: responseData.value,
          description: responseData.description
        }
      });
      
      // Chart visualization if breakdown is available
      if (responseData.breakdown && responseData.breakdown.length > 0) {
        visualizations.push({
          type: 'pie_chart',
          title: 'التوزيع حسب النوع',
          data: responseData.chartData || responseData.breakdown,
          config: {
            colors: ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
          }
        });
        
        visualizations.push({
          type: 'bar_chart',
          title: 'الإحصائيات التفصيلية',
          data: responseData.chartData || responseData.breakdown,
          config: {
            xAxis: 'name',
            yAxis: 'value'
          }
        });
        
        // Table for detailed breakdown
        visualizations.push({
          type: 'table',
          title: 'التفاصيل',
          data: responseData.breakdown
        });
      }
      
      // Generate suggestions
      const suggestions = generateSuggestions(classification, responseData);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: responseData,
        visualizations,
        suggestions,
        metadata: {
          query,
          executionTime,
          dataSource: 'database',
          refreshedAt: new Date()
        }
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ في معالجة الاستفسار الإحصائي';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSuggestions = (
    classification: StatisticalQueryClassification,
    data: StatisticalData
  ): string[] => {
    const suggestions: string[] = [];
    
    if (classification.queryCategory === 'contracts') {
      suggestions.push('عرض تفاصيل العقود حسب النوع');
      suggestions.push('مقارنة العقود بين فترات مختلفة');
      suggestions.push('تحليل اتجاهات العقود الشهرية');
      if (data.value > 0) {
        suggestions.push('عرض العقود المنتهية الصلاحية');
      }
    }
    
    if (classification.queryCategory === 'customers') {
      suggestions.push('تحليل نشاط العملاء');
      suggestions.push('عرض العملاء المتأخرين في السداد');
      suggestions.push('إحصائيات العملاء الجدد');
    }
    
    return suggestions;
  };

  return {
    processStatisticalQuery,
    isProcessing,
    error,
    clearError: () => setError(null)
  };
};

// Helper functions
const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    'active': 'العقود النشطة',
    'cancelled': 'العقود الملغية',
    'completed': 'العقود المكتملة',
    'suspended': 'العقود المعلقة',
    'draft': 'العقود المسودة'
  };
  return statusLabels[status] || status;
};

const getCustomerTypeLabel = (type: string): string => {
  const typeLabels: Record<string, string> = {
    'individual': 'أفراد',
    'company': 'شركات',
    'government': 'جهات حكومية'
  };
  return typeLabels[type] || type;
};