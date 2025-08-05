import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// أنواع البيانات المختلفة في النظام
export interface SystemData {
  customers: CustomerData[];
  contracts: ContractData[];
  vehicles: VehicleData[];
  invoices: InvoiceData[];
  payments: PaymentData[];
  companies: CompanyData[];
  employees: EmployeeData[];
  legalCases: LegalCaseData[];
}

export interface CustomerData {
  id: string;
  company_id: string;
  first_name: string;
  first_name_ar: string;
  last_name: string;
  last_name_ar: string;
  phone: string;
  email: string;
  national_id: string;
  passport_number: string;
  license_number: string;
  license_expiry: string;
  address: string;
  city: string;
  country: string;
  customer_type: string;
  is_active: boolean;
  is_blacklisted: boolean;
  blacklist_reason: string;
  credit_limit: number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  company_name: string;
  date_of_birth: string;
  documents: any;
  notes: string;
  created_at: string;
  updated_at: string;
  // بيانات محسوبة
  totalContracts?: number;
  activeContracts?: number;
  totalDebt?: number;
  paymentHistory?: PaymentSummary;
  riskScore?: number;
  legalIssues?: LegalIssueSummary[];
}

export interface ContractData {
  id: string;
  company_id: string;
  customer_id: string;
  contract_number: string;
  contract_date: string;
  start_date: string;
  end_date: string;
  contract_type: string;
  contract_amount: number;
  monthly_amount: number;
  status: string;
  vehicle_id: string;
  vehicle_returned: boolean;
  auto_renew_enabled: boolean;
  renewal_terms: any;
  terms: string;
  description: string;
  suspension_reason: string;
  // بيانات مرتبطة
  customer?: CustomerData;
  vehicle?: VehicleData;
  invoices?: InvoiceData[];
  payments?: PaymentData[];
  // بيانات محسوبة
  remainingAmount?: number;
  daysRemaining?: number;
  paymentStatus?: 'current' | 'overdue' | 'paid';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface VehicleData {
  id: string;
  company_id: string;
  make: string;
  model: string;
  year: number;
  plate_number: string;
  vin: string;
  color: string;
  fuel_type: string;
  transmission: string;
  mileage: number;
  status: string;
  insurance_expiry: string;
  registration_expiry: string;
  last_service_date: string;
  next_service_due: string;
  // بيانات مرتبطة
  currentContract?: ContractData;
  maintenanceHistory?: MaintenanceRecord[];
  // بيانات محسوبة
  utilizationRate?: number;
  maintenanceCost?: number;
  profitability?: number;
}

export interface InvoiceData {
  id: string;
  company_id: string;
  customer_id: string;
  contract_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
  description: string;
  // بيانات محسوبة
  remainingAmount?: number;
  daysOverdue?: number;
  paymentStatus?: 'paid' | 'partial' | 'overdue' | 'pending';
}

export interface PaymentData {
  id: string;
  company_id: string;
  customer_id: string;
  contract_id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  status: string;
  notes: string;
}

export interface CompanyData {
  id: string;
  name: string;
  name_ar: string;
  registration_number: string;
  tax_number: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  settings: any;
  // إحصائيات
  totalCustomers?: number;
  totalContracts?: number;
  totalVehicles?: number;
  monthlyRevenue?: number;
  activeContracts?: number;
}

export interface EmployeeData {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  hire_date: string;
  is_active: boolean;
  permissions: string[];
}

export interface LegalCaseData {
  id: string;
  company_id: string;
  customer_id: string;
  contract_id: string;
  case_type: string;
  status: string;
  description: string;
  created_date: string;
  resolution_date: string;
  outcome: string;
  legal_costs: number;
  notes: string;
}

// أنواع البيانات المحسوبة والملخصة
export interface PaymentSummary {
  totalPaid: number;
  totalOutstanding: number;
  averagePaymentDelay: number;
  paymentReliability: 'excellent' | 'good' | 'fair' | 'poor';
  lastPaymentDate: string;
}

export interface LegalIssueSummary {
  type: string;
  count: number;
  lastOccurrence: string;
  resolution: string;
  impact: 'low' | 'medium' | 'high';
}

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  service_date: string;
  service_type: string;
  cost: number;
  mileage: number;
  description: string;
  next_service_due: string;
}

// معايير البحث والتصفية
export interface DataQuery {
  entityType: keyof SystemData;
  filters?: Record<string, any>;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeRelated?: boolean;
  computeMetrics?: boolean;
}

export interface DataRelationship {
  fromEntity: string;
  toEntity: string;
  relationship: 'one-to-one' | 'one-to-many' | 'many-to-many';
  foreignKey: string;
  description: string;
}

export interface DataAggregation {
  groupBy: string;
  metrics: Array<{
    field: string;
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max';
    alias: string;
  }>;
  filters?: Record<string, any>;
}

export const useUniversalDataReader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataCache, setDataCache] = useState<Map<string, any>>(new Map());

  // تعريف العلاقات بين الجداول
  const dataRelationships: DataRelationship[] = useMemo(() => [
    {
      fromEntity: 'customers',
      toEntity: 'contracts',
      relationship: 'one-to-many',
      foreignKey: 'customer_id',
      description: 'العميل يمكن أن يكون له عدة عقود'
    },
    {
      fromEntity: 'contracts',
      toEntity: 'vehicles',
      relationship: 'one-to-one',
      foreignKey: 'vehicle_id',
      description: 'كل عقد مرتبط بمركبة واحدة'
    },
    {
      fromEntity: 'contracts',
      toEntity: 'invoices',
      relationship: 'one-to-many',
      foreignKey: 'contract_id',
      description: 'العقد يمكن أن يكون له عدة فواتير'
    },
    {
      fromEntity: 'invoices',
      toEntity: 'payments',
      relationship: 'one-to-many',
      foreignKey: 'invoice_id',
      description: 'الفاتورة يمكن أن تكون لها عدة مدفوعات'
    },
    {
      fromEntity: 'customers',
      toEntity: 'legalCases',
      relationship: 'one-to-many',
      foreignKey: 'customer_id',
      description: 'العميل يمكن أن يكون له عدة قضايا قانونية'
    }
  ], []);

  // قراءة بيانات العملاء مع التفاصيل الكاملة
  const readCustomerData = useCallback(async (
    companyId: string,
    customerId?: string,
    includeRelated: boolean = true
  ): Promise<CustomerData[]> => {
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId);

      if (customerId) {
        query = query.eq('id', customerId);
      }

      const { data: customers, error } = await query;
      if (error) throw error;

      if (!includeRelated) {
        return customers || [];
      }

      // إثراء البيانات بالمعلومات المرتبطة
      const enrichedCustomers = await Promise.all(
        (customers || []).map(async (customer) => {
          // جلب العقود
          const { data: contracts } = await supabase
            .from('contracts')
            .select('*')
            .eq('customer_id', customer.id);

          // جلب الفواتير
          const { data: invoices } = await supabase
            .from('invoices')
            .select('*')
            .eq('customer_id', customer.id);

          // جلب المدفوعات
          const { data: payments } = await supabase
            .from('bank_transactions')
            .select('*')
            .eq('customer_id', customer.id);

          // حساب المقاييس
          const totalContracts = contracts?.length || 0;
          const activeContracts = contracts?.filter(c => c.status === 'active').length || 0;
          const totalDebt = invoices?.reduce((sum, inv) => sum + (inv.amount - (inv.paid_amount || 0)), 0) || 0;

          // تحليل تاريخ المدفوعات
          const paymentHistory: PaymentSummary = {
            totalPaid: payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
            totalOutstanding: totalDebt,
            averagePaymentDelay: 0, // يحتاج حساب معقد
            paymentReliability: totalDebt > 0 ? 'poor' : 'excellent',
            lastPaymentDate: payments?.[0]?.created_at || ''
          };

          // حساب نقاط المخاطر
          let riskScore = 0;
          if (customer.is_blacklisted) riskScore += 50;
          if (totalDebt > 0) riskScore += Math.min(totalDebt / 1000, 30);
          if (activeContracts === 0) riskScore += 10;

          return {
            ...customer,
            totalContracts,
            activeContracts,
            totalDebt,
            paymentHistory,
            riskScore,
            legalIssues: [] // سيتم تطويره لاحقاً
          };
        })
      );

      return enrichedCustomers;
    } catch (error) {
      console.error('خطأ في قراءة بيانات العملاء:', error);
      throw error;
    }
  }, []);

  // قراءة بيانات العقود مع التفاصيل الكاملة
  const readContractData = useCallback(async (
    companyId: string,
    contractId?: string,
    includeRelated: boolean = true
  ): Promise<ContractData[]> => {
    try {
      let query = supabase
        .from('contracts')
        .select('*')
        .eq('company_id', companyId);

      if (contractId) {
        query = query.eq('id', contractId);
      }

      const { data: contracts, error } = await query;
      if (error) throw error;

      if (!includeRelated) {
        return contracts || [];
      }

      // إثراء البيانات بالمعلومات المرتبطة
      const enrichedContracts = await Promise.all(
        (contracts || []).map(async (contract) => {
          // جلب بيانات العميل
          const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('id', contract.customer_id)
            .single();

          // جلب بيانات المركبة
          const { data: vehicle } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', contract.vehicle_id)
            .single();

          // جلب الفواتير
          const { data: invoices } = await supabase
            .from('invoices')
            .select('*')
            .eq('contract_id', contract.id);

          // جلب المدفوعات
          const { data: payments } = await supabase
            .from('bank_transactions')
            .select('*')
            .eq('contract_id', contract.id);

          // حساب المقاييس
          const totalInvoiced = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0;
          const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
          const remainingAmount = totalInvoiced - totalPaid;

          // حساب الأيام المتبقية
          const endDate = new Date(contract.end_date);
          const today = new Date();
          const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // تحديد حالة الدفع
          let paymentStatus: 'current' | 'overdue' | 'paid' = 'current';
          if (remainingAmount <= 0) {
            paymentStatus = 'paid';
          } else if (daysRemaining < 0) {
            paymentStatus = 'overdue';
          }

          // تقييم مستوى المخاطر
          let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
          if (paymentStatus === 'overdue') {
            riskLevel = daysRemaining < -30 ? 'critical' : 'high';
          } else if (remainingAmount > contract.monthly_amount * 2) {
            riskLevel = 'medium';
          }

          return {
            ...contract,
            customer,
            vehicle,
            invoices,
            payments,
            remainingAmount,
            daysRemaining,
            paymentStatus,
            riskLevel
          };
        })
      );

      return enrichedContracts;
    } catch (error) {
      console.error('خطأ في قراءة بيانات العقود:', error);
      throw error;
    }
  }, []);

  // البحث الذكي عبر جميع البيانات
  const smartSearch = useCallback(async (
    companyId: string,
    searchTerm: string,
    entityTypes?: (keyof SystemData)[]
  ): Promise<{
    customers: CustomerData[];
    contracts: ContractData[];
    vehicles: VehicleData[];
    invoices: InvoiceData[];
  }> => {
    const results = {
      customers: [] as CustomerData[],
      contracts: [] as ContractData[],
      vehicles: [] as VehicleData[],
      invoices: [] as InvoiceData[]
    };

    try {
      const searchTypes = entityTypes || ['customers', 'contracts', 'vehicles', 'invoices'];

      // البحث في العملاء
      if (searchTypes.includes('customers')) {
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('company_id', companyId)
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,national_id.ilike.%${searchTerm}%`);
        
        results.customers = customers || [];
      }

      // البحث في العقود
      if (searchTypes.includes('contracts')) {
        const { data: contracts } = await supabase
          .from('contracts')
          .select('*, customers(*)')
          .eq('company_id', companyId)
          .or(`contract_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        
        results.contracts = contracts || [];
      }

      // البحث في المركبات (إذا كان الجدول موجود)
      if (searchTypes.includes('vehicles')) {
        // سيتم تطويره عند توفر جدول المركبات
        results.vehicles = [];
      }

      // البحث في الفواتير
      if (searchTypes.includes('invoices')) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('company_id', companyId)
          .or(`invoice_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        
        results.invoices = invoices || [];
      }

      return results;
    } catch (error) {
      console.error('خطأ في البحث الذكي:', error);
      throw error;
    }
  }, []);

  // تجميع البيانات وحساب الإحصائيات
  const aggregateData = useCallback(async (
    companyId: string,
    aggregation: DataAggregation
  ): Promise<any[]> => {
    try {
      // هذه وظيفة معقدة تحتاج لتطوير متقدم
      // سيتم تطويرها لاحقاً بناءً على المتطلبات المحددة
      return [];
    } catch (error) {
      console.error('خطأ في تجميع البيانات:', error);
      throw error;
    }
  }, []);

  // تحليل العلاقات بين البيانات
  const analyzeRelationships = useCallback(async (
    companyId: string,
    entityId: string,
    entityType: keyof SystemData
  ): Promise<{
    directRelations: any[];
    indirectRelations: any[];
    insights: string[];
  }> => {
    const directRelations: any[] = [];
    const indirectRelations: any[] = [];
    const insights: string[] = [];

    try {
      switch (entityType) {
        case 'customers':
          // العلاقات المباشرة: العقود
          const { data: customerContracts } = await supabase
            .from('contracts')
            .select('*')
            .eq('customer_id', entityId)
            .eq('company_id', companyId);

          directRelations.push({
            type: 'contracts',
            data: customerContracts,
            count: customerContracts?.length || 0
          });

          // العلاقات غير المباشرة: الفواتير والمدفوعات
          if (customerContracts?.length) {
            const contractIds = customerContracts.map(c => c.id);
            
            const { data: relatedInvoices } = await supabase
              .from('invoices')
              .select('*')
              .in('contract_id', contractIds);

            indirectRelations.push({
              type: 'invoices',
              data: relatedInvoices,
              count: relatedInvoices?.length || 0
            });

            // تحليل الأنماط
            const activeContracts = customerContracts.filter(c => c.status === 'active');
            const totalValue = customerContracts.reduce((sum, c) => sum + c.contract_amount, 0);

            insights.push(`العميل لديه ${customerContracts.length} عقد، منها ${activeContracts.length} نشط`);
            insights.push(`إجمالي قيمة العقود: ${totalValue.toLocaleString()} ريال`);
          }
          break;

        case 'contracts':
          // العلاقات المباشرة: العميل والمركبة
          const { data: contractCustomer } = await supabase
            .from('customers')
            .select('*')
            .eq('id', entityId)
            .single();

          if (contractCustomer) {
            directRelations.push({
              type: 'customer',
              data: contractCustomer,
              count: 1
            });
          }

          // الفواتير والمدفوعات
          const { data: contractInvoices } = await supabase
            .from('invoices')
            .select('*')
            .eq('contract_id', entityId);

          directRelations.push({
            type: 'invoices',
            data: contractInvoices,
            count: contractInvoices?.length || 0
          });

          break;
      }

      return {
        directRelations,
        indirectRelations,
        insights
      };
    } catch (error) {
      console.error('خطأ في تحليل العلاقات:', error);
      throw error;
    }
  }, []);

  // الحصول على إحصائيات الشركة الشاملة
  const getCompanyStatistics = useCallback(async (companyId: string) => {
    try {
      const [
        { count: customersCount },
        { count: contractsCount },
        { count: invoicesCount }
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('company_id', companyId)
      ]);

      // حساب الإيرادات الشهرية
      const { data: monthlyRevenue } = await supabase
        .from('invoices')
        .select('amount')
        .eq('company_id', companyId)
        .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString());

      const totalMonthlyRevenue = monthlyRevenue?.reduce((sum, inv) => sum + inv.amount, 0) || 0;

      // العقود النشطة
      const { count: activeContractsCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'active');

      return {
        totalCustomers: customersCount || 0,
        totalContracts: contractsCount || 0,
        totalInvoices: invoicesCount || 0,
        activeContracts: activeContractsCount || 0,
        monthlyRevenue: totalMonthlyRevenue,
        dataLastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الشركة:', error);
      throw error;
    }
  }, []);

  return {
    // قراءة البيانات الأساسية
    readCustomerData,
    readContractData,
    
    // البحث والتصفية
    smartSearch,
    
    // التحليل والتجميع
    aggregateData,
    analyzeRelationships,
    
    // الإحصائيات
    getCompanyStatistics,
    
    // معلومات النظام
    dataRelationships,
    
    // حالة النظام
    isLoading,
    error,
    dataCache: Array.from(dataCache.entries())
  };
};

