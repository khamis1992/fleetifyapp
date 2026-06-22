import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface NumericalQuery {
  original_query: string;
  query_type: 'count' | 'sum' | 'percentage' | 'average' | 'list';
  entity_type: 'customers' | 'contracts' | 'invoices' | 'payments' | 'vehicles' | 'legal_cases';
  filters: {
    status?: string;
    active?: boolean;
    blacklisted?: boolean;
    payment_status?: string;
    date_range?: { start: string; end: string };
    amount_range?: { min?: number; max?: number };
  };
  arabic_context: {
    keywords: string[];
    negations: string[];
    time_references: string[];
  };
}

export interface NumericalResult {
  success: boolean;
  result_type: 'number' | 'list' | 'percentage';
  value: number | string;
  description: string;
  details?: any[];
  sql_executed?: string;
  processing_time?: number;
}

// Enhanced Arabic query patterns for numerical queries
const NUMERICAL_PATTERNS = {
  count_queries: [
    {
      pattern: /(كم|عدد).*(عميل|عملاء).*(لم يسدد|ما دفع|ما سدد|متأخر|مدين)/i,
      entity: 'customers',
      filter_type: 'unpaid',
      query_type: 'count'
    },
    {
      pattern: /(كم|عدد).*(عميل|عملاء).*(نشط|نشطة|نشطين|فعال)/i,
      entity: 'customers', 
      filter_type: 'active',
      query_type: 'count'
    },
    {
      pattern: /(كم|عدد).*(عميل|عملاء).*(محظور|محظورة|أسود)/i,
      entity: 'customers',
      filter_type: 'blacklisted', 
      query_type: 'count'
    },
    {
      pattern: /(كم|عدد).*(عقد|عقود).*(نشط|فعال|جاري)/i,
      entity: 'contracts',
      filter_type: 'active',
      query_type: 'count'
    },
    {
      pattern: /(كم|عدد).*(فاتورة|فواتير).*(غير مدفوع|معلق)/i,
      entity: 'invoices',
      filter_type: 'unpaid',
      query_type: 'count'
    }
  ],
  sum_queries: [
    {
      pattern: /(إجمالي|مجموع).*(مبلغ|مبالغ).*(مستحق|غير مدفوع)/i,
      entity: 'invoices',
      filter_type: 'outstanding_amount',
      query_type: 'sum'
    },
    {
      pattern: /(إجمالي|مجموع).*(إيرادات|دخل)/i,
      entity: 'payments',
      filter_type: 'total_revenue',
      query_type: 'sum'
    }
  ],
  list_queries: [
    {
      pattern: /(اعرض|أظهر|قائمة).*(عميل|عملاء).*(لم يسدد|متأخر|مدين)/i,
      entity: 'customers',
      filter_type: 'unpaid',
      query_type: 'list'
    }
  ]
};

export const useNumericalQueryHandler = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { companyId } = useUnifiedCompanyAccess();

  // Parse Arabic numerical query
  const parseNumericalQuery = useCallback((query: string): NumericalQuery | null => {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check all patterns
    for (const category of Object.values(NUMERICAL_PATTERNS)) {
      for (const pattern of category) {
        if (pattern.pattern.test(normalizedQuery)) {
          // Extract additional context
          const keywords = [];
          const negations = [];
          const timeReferences = [];

          // Extract keywords
          if (normalizedQuery.includes('نشط')) keywords.push('نشط');
          if (normalizedQuery.includes('محظور')) keywords.push('محظور');
          if (normalizedQuery.includes('مدفوع')) keywords.push('مدفوع');
          
          // Extract negations
          if (normalizedQuery.includes('لم') || normalizedQuery.includes('ما') || normalizedQuery.includes('غير')) {
            negations.push('نفي');
          }

          // Extract time references
          if (normalizedQuery.includes('اليوم')) timeReferences.push('اليوم');
          if (normalizedQuery.includes('الشهر')) timeReferences.push('الشهر');
          if (normalizedQuery.includes('السنة')) timeReferences.push('السنة');

          return {
            original_query: query,
            query_type: pattern.query_type as any,
            entity_type: pattern.entity as any,
            filters: {
              status: pattern.filter_type === 'active' ? 'active' : 
                     pattern.filter_type === 'unpaid' ? 'unpaid' : undefined,
              active: pattern.filter_type === 'active' ? true : undefined,
              blacklisted: pattern.filter_type === 'blacklisted' ? true : undefined,
              payment_status: pattern.filter_type === 'unpaid' ? 'unpaid' : undefined
            },
            arabic_context: {
              keywords,
              negations,
              time_references: timeReferences
            }
          };
        }
      }
    }

    return null;
  }, []);

  // Execute numerical query
  const executeNumericalQuery = useCallback(async (parsedQuery: NumericalQuery): Promise<NumericalResult> => {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب');
    }

    const startTime = Date.now();

    try {
      let result: NumericalResult;

      switch (parsedQuery.entity_type) {
        case 'customers':
          result = await executeCustomerQuery(parsedQuery);
          break;
        case 'contracts':
          result = await executeContractQuery(parsedQuery);
          break;
        case 'invoices':
          result = await executeInvoiceQuery(parsedQuery);
          break;
        case 'payments':
          result = await executePaymentQuery(parsedQuery);
          break;
        default:
          throw new Error(`نوع الكيان غير مدعوم: ${parsedQuery.entity_type}`);
      }

      result.processing_time = Date.now() - startTime;
      return result;

    } catch (err) {
      throw new Error(`خطأ في تنفيذ الاستعلام: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
    }
  }, [companyId]);

  // Execute customer queries
  const executeCustomerQuery = async (parsedQuery: NumericalQuery): Promise<NumericalResult> => {
    let query = supabase
      .from('customers')
      .select('id, first_name, last_name, company_name, customer_type, is_active, is_blacklisted, email, phone')
      .eq('company_id', companyId);

    // Apply filters
    if (parsedQuery.filters.active !== undefined) {
      query = query.eq('is_active', parsedQuery.filters.active);
    }
    if (parsedQuery.filters.blacklisted !== undefined) {
      query = query.eq('is_blacklisted', parsedQuery.filters.blacklisted);
    }

    // For unpaid customers, we need to check invoices
    if (parsedQuery.filters.payment_status === 'unpaid') {
      const { data: unpaidInvoices } = await supabase
        .from('invoices')
        .select('customer_id')
        .eq('company_id', companyId)
        .eq('payment_status', 'unpaid');

      if (unpaidInvoices) {
        const customerIds = [...new Set(unpaidInvoices.map(inv => inv.customer_id))];
        query = query.in('id', customerIds);
      }
    }

    const { data, error } = await query;
    
    if (error) throw error;

    if (parsedQuery.query_type === 'count') {
      return {
        success: true,
        result_type: 'number',
        value: data?.length || 0,
        description: getCountDescription(parsedQuery, data?.length || 0)
      };
    } else if (parsedQuery.query_type === 'list') {
      return {
        success: true,
        result_type: 'list',
        value: `${data?.length || 0} عميل`,
        description: getListDescription(parsedQuery),
        details: data?.slice(0, 10) // Limit to first 10 for display
      };
    }

    return {
      success: true,
      result_type: 'number',
      value: data?.length || 0,
      description: 'عدد العملاء'
    };
  };

  // Execute contract queries
  const executeContractQuery = async (parsedQuery: NumericalQuery): Promise<NumericalResult> => {
    let query = supabase
      .from('contracts')
      .select('id, contract_number, status, contract_amount, start_date, end_date')
      .eq('company_id', companyId);

    if (parsedQuery.filters.status) {
      query = query.eq('status', parsedQuery.filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      success: true,
      result_type: 'number',
      value: data?.length || 0,
      description: getCountDescription(parsedQuery, data?.length || 0)
    };
  };

  // Execute invoice queries
  const executeInvoiceQuery = async (parsedQuery: NumericalQuery): Promise<NumericalResult> => {
    let query = supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, payment_status, due_date')
      .eq('company_id', companyId);

    if (parsedQuery.filters.payment_status) {
      query = query.eq('payment_status', parsedQuery.filters.payment_status);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (parsedQuery.query_type === 'sum') {
      const total = data?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0;
      return {
        success: true,
        result_type: 'number',
        value: total,
        description: `إجمالي المبلغ: ${total.toLocaleString()} د.ك`
      };
    }

    return {
      success: true,
      result_type: 'number',
      value: data?.length || 0,
      description: getCountDescription(parsedQuery, data?.length || 0)
    };
  };

  // Execute payment queries
  const executePaymentQuery = async (parsedQuery: NumericalQuery): Promise<NumericalResult> => {
    const { data, error } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .eq('company_id', companyId);

    if (error) throw error;

    const total = data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    
    return {
      success: true,
      result_type: 'number',
      value: total,
      description: `إجمالي الإيرادات: ${total.toLocaleString()} د.ك`
    };
  };

  // Generate descriptions
  const getCountDescription = (parsedQuery: NumericalQuery, count: number): string => {
    const { entity_type, filters, arabic_context } = parsedQuery;
    
    if (entity_type === 'customers') {
      if (filters.blacklisted) {
        return `${count} عميل محظور`;
      } else if (filters.active) {
        return `${count} عميل نشط`;
      } else if (filters.payment_status === 'unpaid') {
        return `${count} عميل لم يسدد`;
      }
      return `${count} عميل`;
    } else if (entity_type === 'contracts') {
      if (filters.status === 'active') {
        return `${count} عقد نشط`;
      }
      return `${count} عقد`;
    } else if (entity_type === 'invoices') {
      if (filters.payment_status === 'unpaid') {
        return `${count} فاتورة غير مدفوعة`;
      }
      return `${count} فاتورة`;
    }
    
    return `${count} عنصر`;
  };

  const getListDescription = (parsedQuery: NumericalQuery): string => {
    const { entity_type, filters } = parsedQuery;
    
    if (entity_type === 'customers' && filters.payment_status === 'unpaid') {
      return 'قائمة العملاء الذين لم يسددوا مدفوعاتهم';
    }
    
    return 'قائمة النتائج';
  };

  // Main processing function
  const processNumericalQuery = useCallback(async (query: string): Promise<NumericalResult> => {
    setIsProcessing(true);
    setError(null);

    try {
      // Parse the query
      const parsedQuery = parseNumericalQuery(query);
      
      if (!parsedQuery) {
        throw new Error('لم يتم التعرف على نوع الاستعلام الرقمي');
      }

      // Execute the query
      const result = await executeNumericalQuery(parsedQuery);
      
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [parseNumericalQuery, executeNumericalQuery]);

  // Check if query is numerical
  const isNumericalQuery = useCallback((query: string): boolean => {
    const numericalIndicators = ['كم', 'عدد', 'إجمالي', 'مجموع', 'اعرض', 'أظهر', 'قائمة'];
    return numericalIndicators.some(indicator => query.includes(indicator));
  }, []);

  return {
    processNumericalQuery,
    isNumericalQuery,
    parseNumericalQuery,
    isProcessing,
    error,
    clearError: () => setError(null)
  };
};