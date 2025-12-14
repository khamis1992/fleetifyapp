/**
 * Hook لجلب إحصائيات العملاء الشاملة
 * يجمع البيانات من جميع الجداول المرتبطة
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { differenceInDays, startOfDay, startOfWeek, startOfMonth } from 'date-fns';

// أنواع البيانات
export interface CustomerStats {
  // إحصائيات أساسية
  totalCustomers: number;
  activeCustomers: number;
  individualCount: number;
  corporateCount: number;
  vipCount: number;
  blacklistedCount: number;
  
  // إحصائيات الأسبوع
  newCustomersThisWeek: number;
  newCustomersThisMonth: number;
  
  // إحصائيات العقود
  customersWithActiveContracts: number;
  customersWithoutContracts: number;
  
  // إحصائيات مالية
  totalOutstanding: number;
  customersWithOverdue: number;
  
  // تنبيهات الوثائق
  expiringLicenses: number;
  expiredLicenses: number;
  expiringNationalIds: number;
  expiredNationalIds: number;
  
  // تفاعلات
  interactionsToday: number;
  interactionsThisWeek: number;
}

export interface DocumentAlert {
  customerId: string;
  customerName: string;
  customerCode: string;
  phone: string;
  documentType: 'license' | 'national_id';
  expiryDate: string;
  daysUntilExpiry: number;
  status: 'expired' | 'expiring_soon' | 'expiring';
}

export interface CustomerWithFinancials {
  id: string;
  customer_code: string;
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  phone: string;
  email?: string;
  is_active: boolean;
  is_vip?: boolean;
  is_blacklisted?: boolean;
  customer_type?: string;
  license_expiry?: string;
  national_id_expiry?: string;
  created_at: string;
  // بيانات مالية محسوبة
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdueAmount: number;
  activeContracts: number;
  lastContactDays: number | null;
  healthScore: number;
}

// Hook للإحصائيات الشاملة
export function useCustomerStats() {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['customer-stats', companyId],
    queryFn: async (): Promise<CustomerStats> => {
      if (!companyId) throw new Error('Company ID required');

      const today = startOfDay(new Date());
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const monthStart = startOfMonth(today);

      // جلب بيانات العملاء
      const { data: customers } = await supabase
        .from('customers')
        .select('id, is_active, customer_type, is_vip, is_blacklisted, created_at, license_expiry, national_id_expiry')
        .eq('company_id', companyId);

      // جلب العقود النشطة
      const { data: activeContracts } = await supabase
        .from('contracts')
        .select('customer_id')
        .eq('company_id', companyId)
        .eq('status', 'active');

      // جلب الفواتير
      const { data: invoices } = await supabase
        .from('invoices')
        .select('customer_id, total_amount, paid_amount, payment_status, due_date')
        .eq('company_id', companyId);

      // جلب التفاعلات
      const { data: interactions } = await supabase
        .from('customer_notes')
        .select('created_at')
        .eq('company_id', companyId)
        .gte('created_at', weekStart.toISOString());

      // حساب الإحصائيات
      const customersList = customers || [];
      const activeCustomers = customersList.filter(c => c.is_active);
      
      // عدد العملاء الجدد
      const newThisWeek = customersList.filter(c => 
        new Date(c.created_at) >= weekStart
      ).length;
      
      const newThisMonth = customersList.filter(c => 
        new Date(c.created_at) >= monthStart
      ).length;

      // عملاء بعقود نشطة
      const customersWithContracts = new Set(activeContracts?.map(c => c.customer_id) || []);

      // حساب المستحقات
      let totalOutstanding = 0;
      const overdueCustomers = new Set<string>();
      
      invoices?.forEach(inv => {
        const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
        if (remaining > 0) {
          totalOutstanding += remaining;
          if (inv.due_date && new Date(inv.due_date) < today) {
            if (inv.customer_id) overdueCustomers.add(inv.customer_id);
          }
        }
      });

      // تنبيهات الوثائق
      let expiringLicenses = 0;
      let expiredLicenses = 0;
      let expiringNationalIds = 0;
      let expiredNationalIds = 0;

      customersList.forEach(c => {
        if (c.license_expiry) {
          const days = differenceInDays(new Date(c.license_expiry), today);
          if (days < 0) expiredLicenses++;
          else if (days <= 30) expiringLicenses++;
        }
        if (c.national_id_expiry) {
          const days = differenceInDays(new Date(c.national_id_expiry), today);
          if (days < 0) expiredNationalIds++;
          else if (days <= 30) expiringNationalIds++;
        }
      });

      // التفاعلات
      const interactionsToday = (interactions || []).filter(i => 
        new Date(i.created_at) >= today
      ).length;

      return {
        totalCustomers: customersList.length,
        activeCustomers: activeCustomers.length,
        individualCount: customersList.filter(c => c.customer_type === 'individual').length,
        corporateCount: customersList.filter(c => c.customer_type === 'corporate').length,
        vipCount: customersList.filter(c => c.is_vip).length,
        blacklistedCount: customersList.filter(c => c.is_blacklisted).length,
        newCustomersThisWeek: newThisWeek,
        newCustomersThisMonth: newThisMonth,
        customersWithActiveContracts: customersWithContracts.size,
        customersWithoutContracts: customersList.length - customersWithContracts.size,
        totalOutstanding,
        customersWithOverdue: overdueCustomers.size,
        expiringLicenses,
        expiredLicenses,
        expiringNationalIds,
        expiredNationalIds,
        interactionsToday,
        interactionsThisWeek: interactions?.length || 0,
      };
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
}

// Hook لتنبيهات الوثائق المنتهية
export function useDocumentAlerts(daysThreshold: number = 30) {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['document-alerts', companyId, daysThreshold],
    queryFn: async (): Promise<DocumentAlert[]> => {
      if (!companyId) return [];

      const today = startOfDay(new Date());

      const { data: customers } = await supabase
        .from('customers')
        .select('id, customer_code, first_name, last_name, first_name_ar, last_name_ar, phone, license_expiry, national_id_expiry')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (!customers) return [];

      const alerts: DocumentAlert[] = [];

      customers.forEach(customer => {
        const getName = () => {
          const arName = `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
          const enName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
          return arName || enName || customer.customer_code || 'غير معرف';
        };

        // رخصة القيادة
        if (customer.license_expiry) {
          const days = differenceInDays(new Date(customer.license_expiry), today);
          if (days <= daysThreshold) {
            alerts.push({
              customerId: customer.id,
              customerName: getName(),
              customerCode: customer.customer_code || '',
              phone: customer.phone || '',
              documentType: 'license',
              expiryDate: customer.license_expiry,
              daysUntilExpiry: days,
              status: days < 0 ? 'expired' : days <= 7 ? 'expiring_soon' : 'expiring',
            });
          }
        }

        // الهوية الوطنية
        if (customer.national_id_expiry) {
          const days = differenceInDays(new Date(customer.national_id_expiry), today);
          if (days <= daysThreshold) {
            alerts.push({
              customerId: customer.id,
              customerName: getName(),
              customerCode: customer.customer_code || '',
              phone: customer.phone || '',
              documentType: 'national_id',
              expiryDate: customer.national_id_expiry,
              daysUntilExpiry: days,
              status: days < 0 ? 'expired' : days <= 7 ? 'expiring_soon' : 'expiring',
            });
          }
        }
      });

      // ترتيب حسب الأولوية (الأكثر إلحاحاً أولاً)
      return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook لجلب العملاء مع البيانات المالية
export function useCustomersWithFinancials(filters?: {
  search?: string;
  paymentStatus?: 'all' | 'paid' | 'overdue' | 'pending';
  documentStatus?: 'all' | 'valid' | 'expiring' | 'expired';
  hasActiveContract?: boolean;
  limit?: number;
  offset?: number;
}) {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['customers-with-financials', companyId, filters],
    queryFn: async (): Promise<{ data: CustomerWithFinancials[]; total: number }> => {
      if (!companyId) return { data: [], total: 0 };

      const today = startOfDay(new Date());

      // جلب العملاء
      let query = supabase
        .from('customers')
        .select('id, customer_code, first_name, last_name, first_name_ar, last_name_ar, phone, email, is_active, is_vip, is_blacklisted, customer_type, license_expiry, national_id_expiry, created_at', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (filters?.search) {
        const search = filters.search;
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,first_name_ar.ilike.%${search}%,last_name_ar.ilike.%${search}%,phone.ilike.%${search}%,customer_code.ilike.%${search}%`);
      }

      query = query.order('created_at', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data: customers, count } = await query;

      if (!customers || customers.length === 0) {
        return { data: [], total: 0 };
      }

      const customerIds = customers.map(c => c.id);

      // جلب الفواتير
      const { data: invoices } = await supabase
        .from('invoices')
        .select('customer_id, total_amount, paid_amount, due_date, payment_status')
        .eq('company_id', companyId)
        .in('customer_id', customerIds);

      // جلب العقود النشطة
      const { data: contracts } = await supabase
        .from('contracts')
        .select('customer_id')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .in('customer_id', customerIds);

      // جلب آخر تفاعل
      const { data: lastNotes } = await supabase
        .from('customer_notes')
        .select('customer_id, created_at')
        .eq('company_id', companyId)
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false });

      // تجميع البيانات لكل عميل
      const invoicesByCustomer: Record<string, typeof invoices> = {};
      invoices?.forEach(inv => {
        if (!invoicesByCustomer[inv.customer_id]) {
          invoicesByCustomer[inv.customer_id] = [];
        }
        invoicesByCustomer[inv.customer_id].push(inv);
      });

      const contractCountByCustomer: Record<string, number> = {};
      contracts?.forEach(c => {
        contractCountByCustomer[c.customer_id] = (contractCountByCustomer[c.customer_id] || 0) + 1;
      });

      const lastNoteByCustomer: Record<string, string> = {};
      lastNotes?.forEach(n => {
        if (!lastNoteByCustomer[n.customer_id]) {
          lastNoteByCustomer[n.customer_id] = n.created_at;
        }
      });

      // بناء قائمة العملاء مع البيانات المالية
      let result: CustomerWithFinancials[] = customers.map(customer => {
        const customerInvoices = invoicesByCustomer[customer.id] || [];
        
        let totalInvoiced = 0;
        let totalPaid = 0;
        let overdueAmount = 0;
        
        customerInvoices.forEach(inv => {
          totalInvoiced += inv.total_amount || 0;
          totalPaid += inv.paid_amount || 0;
          const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
          if (remaining > 0 && inv.due_date && new Date(inv.due_date) < today) {
            overdueAmount += remaining;
          }
        });

        const outstanding = totalInvoiced - totalPaid;
        const activeContracts = contractCountByCustomer[customer.id] || 0;
        
        const lastContact = lastNoteByCustomer[customer.id];
        const lastContactDays = lastContact 
          ? differenceInDays(today, new Date(lastContact))
          : null;

        // حساب نقاط الصحة البسيطة
        let healthScore = 100;
        if (overdueAmount > 0) healthScore -= 30;
        if (outstanding > 10000) healthScore -= 20;
        if (lastContactDays === null) healthScore -= 10;
        else if (lastContactDays > 30) healthScore -= 15;
        if (customer.is_blacklisted) healthScore = 0;
        healthScore = Math.max(0, Math.min(100, healthScore));

        return {
          ...customer,
          totalInvoiced,
          totalPaid,
          outstanding,
          overdueAmount,
          activeContracts,
          lastContactDays,
          healthScore,
        };
      });

      // تطبيق الفلاتر الإضافية
      if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
        result = result.filter(c => {
          if (filters.paymentStatus === 'paid') return c.outstanding === 0;
          if (filters.paymentStatus === 'overdue') return c.overdueAmount > 0;
          if (filters.paymentStatus === 'pending') return c.outstanding > 0 && c.overdueAmount === 0;
          return true;
        });
      }

      if (filters?.documentStatus && filters.documentStatus !== 'all') {
        result = result.filter(c => {
          const licenseDays = c.license_expiry 
            ? differenceInDays(new Date(c.license_expiry), today)
            : 999;
          const idDays = c.national_id_expiry 
            ? differenceInDays(new Date(c.national_id_expiry), today)
            : 999;
          const minDays = Math.min(licenseDays, idDays);
          
          if (filters.documentStatus === 'expired') return minDays < 0;
          if (filters.documentStatus === 'expiring') return minDays >= 0 && minDays <= 30;
          if (filters.documentStatus === 'valid') return minDays > 30;
          return true;
        });
      }

      if (filters?.hasActiveContract !== undefined) {
        result = result.filter(c => 
          filters.hasActiveContract ? c.activeContracts > 0 : c.activeContracts === 0
        );
      }

      return { data: result, total: count || result.length };
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 2,
  });
}

