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
    const { filters, statisticalType } = classification;
    
    // Handle different customer query types
    switch (statisticalType) {
      case 'count_active':
        return await getActiveCustomersStats(companyId);
      
      case 'count_all':
        return await getAllCustomersStats(companyId);
      
      case 'count_blacklisted':
        return await getBlacklistedCustomersStats(companyId);
      
      case 'count_inactive':
        return await getInactiveCustomersStats(companyId);
      
      case 'count_smart':
        return await getSmartCustomersStats(companyId);
      
      case 'detailed_analytics':
        return await getDetailedCustomerAnalytics(companyId);
      
      case 'breakdown':
        return await getCustomerBreakdown(companyId);
      
      default:
        return await getBasicCustomerStats(companyId, filters);
    }
  };

  // Enhanced customer statistics functions
  const getActiveCustomersStats = async (companyId: string): Promise<StatisticalData> => {
    const { data, error, count } = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('is_active', true)
      .eq('is_blacklisted', false);
    
    if (error) throw error;
    
    return {
      value: count || 0,
      label: 'العملاء النشطين',
      description: 'عدد العملاء النشطين والمفعلين حالياً',
      chartData: data?.map(customer => ({
        name: customer.customer_type === 'individual' 
          ? `${customer.first_name} ${customer.last_name}` 
          : customer.company_name,
        type: getCustomerTypeLabel(customer.customer_type),
        active_since: customer.created_at
      })) || []
    };
  };

  const getAllCustomersStats = async (companyId: string): Promise<StatisticalData> => {
    const { data, error, count } = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId);
    
    if (error) throw error;
    
    const breakdown = data?.reduce((acc: StatisticalBreakdown[], customer) => {
      const status = customer.is_active ? 'نشط' : 'غير نشط';
      const existing = acc.find(item => item.category === status);
      if (existing) {
        existing.value++;
      } else {
        acc.push({ category: status, value: 1 });
      }
      return acc;
    }, []) || [];
    
    const total = breakdown.reduce((sum, item) => sum + item.value, 0);
    breakdown.forEach(item => {
      item.percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
    });
    
    return {
      value: count || 0,
      label: 'جميع العملاء المسجلين',
      description: 'إجمالي عدد العملاء المسجلين في النظام',
      breakdown,
      chartData: breakdown.map(item => ({
        name: item.category,
        value: item.value,
        percentage: item.percentage
      }))
    };
  };

  const getBlacklistedCustomersStats = async (companyId: string): Promise<StatisticalData> => {
    const { data, error, count } = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('is_blacklisted', true);
    
    if (error) throw error;
    
    return {
      value: count || 0,
      label: 'العملاء المحظورين',
      description: 'عدد العملاء المدرجين في القائمة السوداء',
      chartData: data?.map(customer => ({
        name: customer.customer_type === 'individual' 
          ? `${customer.first_name} ${customer.last_name}` 
          : customer.company_name,
        reason: customer.blacklist_reason || 'غير محدد',
        blacklisted_at: customer.updated_at
      })) || []
    };
  };

  const getInactiveCustomersStats = async (companyId: string): Promise<StatisticalData> => {
    const { data, error, count } = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('is_active', false)
      .eq('is_blacklisted', false);
    
    if (error) throw error;
    
    return {
      value: count || 0,
      label: 'العملاء غير النشطين',
      description: 'عدد العملاء المعطلين أو غير النشطين',
      chartData: data?.map(customer => ({
        name: customer.customer_type === 'individual' 
          ? `${customer.first_name} ${customer.last_name}` 
          : customer.company_name,
        type: getCustomerTypeLabel(customer.customer_type),
        deactivated_at: customer.updated_at
      })) || []
    };
  };

  const getSmartCustomersStats = async (companyId: string): Promise<StatisticalData> => {
    // This is for ambiguous queries - show both active and total with explanation
    const [activeResult, allResult] = await Promise.all([
      getActiveCustomersStats(companyId),
      getAllCustomersStats(companyId)
    ]);
    
    return {
      value: allResult.value,
      label: 'إحصائيات العملاء الذكية',
      description: `إجمالي: ${allResult.value} عميل (منهم ${activeResult.value} نشط و ${allResult.value - activeResult.value} غير نشط)`,
      breakdown: [
        { category: 'العملاء النشطين', value: activeResult.value, percentage: Math.round((activeResult.value / allResult.value) * 100) },
        { category: 'العملاء غير النشطين', value: allResult.value - activeResult.value, percentage: Math.round(((allResult.value - activeResult.value) / allResult.value) * 100) }
      ],
      chartData: [
        { name: 'نشط', value: activeResult.value, color: '#10b981' },
        { name: 'غير نشط', value: allResult.value - activeResult.value, color: '#ef4444' }
      ]
    };
  };

  const getDetailedCustomerAnalytics = async (companyId: string): Promise<StatisticalData> => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId);
    
    if (error) throw error;
    
    const analytics = {
      total: data?.length || 0,
      active: data?.filter(c => c.is_active && !c.is_blacklisted).length || 0,
      inactive: data?.filter(c => !c.is_active && !c.is_blacklisted).length || 0,
      blacklisted: data?.filter(c => c.is_blacklisted).length || 0,
      individual: data?.filter(c => c.customer_type === 'individual').length || 0,
      corporate: data?.filter(c => c.customer_type === 'corporate').length || 0,
      other: data?.filter(c => c.customer_type && !['individual', 'corporate'].includes(c.customer_type)).length || 0
    };
    
    const breakdown = [
      { category: 'أفراد', value: analytics.individual, percentage: Math.round((analytics.individual / analytics.total) * 100) },
      { category: 'شركات', value: analytics.corporate, percentage: Math.round((analytics.corporate / analytics.total) * 100) },
      { category: 'أخرى', value: analytics.other, percentage: Math.round((analytics.other / analytics.total) * 100) }
    ];
    
    return {
      value: analytics.total,
      label: 'تحليل تفصيلي للعملاء',
      description: `نشط: ${analytics.active}, غير نشط: ${analytics.inactive}, محظور: ${analytics.blacklisted}`,
      breakdown,
      chartData: breakdown.map(item => ({
        name: item.category,
        value: item.value,
        percentage: item.percentage
      }))
    };
  };

  const getCustomerBreakdown = async (companyId: string): Promise<StatisticalData> => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId);
    
    if (error) throw error;
    
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
      value: total,
      label: 'توزيع العملاء حسب النوع',
      description: 'تصنيف العملاء حسب النوع (أفراد، شركات، جهات حكومية)',
      breakdown,
      chartData: breakdown.map(item => ({
        name: getCustomerTypeLabel(item.category),
        value: item.value,
        percentage: item.percentage
      }))
    };
  };

  const getBasicCustomerStats = async (companyId: string, filters?: any): Promise<StatisticalData> => {
    let baseQuery = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId);
    
    // Apply filters
    if (filters?.active !== undefined) {
      baseQuery = baseQuery.eq('is_active', filters.active);
    }
    if (filters?.blacklisted !== undefined) {
      baseQuery = baseQuery.eq('is_blacklisted', filters.blacklisted);
    }
    
    const { data, error, count } = await baseQuery;
    if (error) throw error;
    
    return {
      value: count || 0,
      label: 'عدد العملاء',
      description: 'إحصائيات أساسية للعملاء',
      chartData: []
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
      // Enhanced smart suggestions based on query type
      switch (classification.statisticalType) {
        case 'count_active':
          suggestions.push('مقارنة العملاء النشطين بالشهر الماضي');
          suggestions.push('عرض أكثر العملاء نشاطاً');
          suggestions.push('تحليل أوقات نشاط العملاء');
          break;
          
        case 'count_all':
          suggestions.push('معدل نمو العملاء الشهري');
          suggestions.push('تحليل العملاء حسب تاريخ التسجيل');
          suggestions.push('مقارنة العملاء النشطين مقابل غير النشطين');
          break;
          
        case 'count_blacklisted':
          suggestions.push('أسباب حظر العملاء');
          suggestions.push('اتجاهات حظر العملاء');
          suggestions.push('مراجعة حالات الحظر');
          break;
          
        case 'count_inactive':
          suggestions.push('أسباب عدم نشاط العملاء');
          suggestions.push('خطة إعادة تفعيل العملاء');
          suggestions.push('آخر نشاط للعملاء المعطلين');
          break;
          
        case 'count_smart':
          if (classification.smartContext?.needsClarification) {
            suggestions.push(...(classification.smartContext.suggestedRefinements || []));
          } else {
            suggestions.push('توضيح نوع العملاء المطلوب');
            suggestions.push('عرض إحصائيات مفصلة');
          }
          break;
          
        case 'detailed_analytics':
          suggestions.push('تحليل اتجاهات العملاء');
          suggestions.push('تقرير أداء العملاء');
          suggestions.push('مقاييس رضا العملاء');
          break;
          
        case 'breakdown':
          suggestions.push('مقارنة أنواع العملاء');
          suggestions.push('نمو كل نوع من العملاء');
          suggestions.push('تحليل تفضيلات العملاء حسب النوع');
          break;
          
        default:
          suggestions.push('تحليل نشاط العملاء');
          suggestions.push('عرض العملاء المتأخرين في السداد');
          suggestions.push('إحصائيات العملاء الجدد');
      }
      
      // Add context-sensitive suggestions
      if (data.value > 100) {
        suggestions.push('تقسيم العملاء حسب المناطق الجغرافية');
      }
      
      if (data.breakdown && data.breakdown.length > 0) {
        suggestions.push('تحليل أداء كل فئة من العملاء');
      }
    }
    
    // Add smart context suggestions
    if (classification.smartContext?.suggestedRefinements?.length) {
      suggestions.unshift('💡 اقتراحات للحصول على معلومات أكثر دقة:');
      suggestions.push(...classification.smartContext.suggestedRefinements.map(s => `• ${s}`));
    }
    
    return suggestions.slice(0, 6); // Limit to 6 suggestions
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