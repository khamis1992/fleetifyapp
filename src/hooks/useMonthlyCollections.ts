import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { getInvoiceBillingMonthKey, getLocalMonthKey, isActiveInvoice } from '@/utils/invoiceBillingMonth';

export interface MonthlyCollectionItem {
  contract_id: string;
  contract_number: string;
  customer_name: string;
  customer_id: string;
  invoice_id: string;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  status: 'paid' | 'unpaid' | 'partially_paid' | 'overdue';
  due_date: string;
  payment_date?: string;
  is_paid?: boolean; // لتسهيل الفلترة
}

export interface MonthlyCollectionStats {
  totalDue: number;
  totalCollected: number;
  totalPending: number;
  collectionRate: number;
  paidCount: number;
  pendingCount: number;
}

interface MonthlyCollectionInternalItem extends MonthlyCollectionItem {
  billing_month: string | null;
  is_current_month: boolean;
  is_due_current_month: boolean;
}

const getDateMonthKey = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return getLocalMonthKey(date);
};

// Updated: 2026-01-31 - Fixed payment status display
export const useMonthlyCollections = () => {
  const { user } = useAuth();

  // Get employee's profile
  const { data: profile } = useQuery({
    queryKey: ['employee-profile-collections', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User is not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: collections = [], isLoading, refetch } = useQuery({
    queryKey: ['monthly-collections', 'v3-current-due-month', profile?.id],
    queryFn: async () => {
      if (!profile?.id || !profile.company_id) return [];

      const today = new Date();
      const currentMonthKey = getLocalMonthKey(today);

      // جلب جميع الفواتير للعقود المخصصة للموظف فقط
      // استخدام inner join للتأكد من جلب العقود المخصصة فقط
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          paid_amount,
          status,
          payment_status,
          due_date,
          invoice_date,
          invoice_month,
          contract_id,
          contracts!inner (
            id,
            contract_number,
            assigned_to_profile_id,
            status,
            customers!inner (
              id,
              first_name,
              last_name,
              first_name_ar,
              last_name_ar,
              company_name,
              company_name_ar,
              customer_type
            )
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('contracts.assigned_to_profile_id', profile.id)
        .eq('contracts.status', 'active')
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      console.log('📊 Total invoices fetched for employee:', data?.length);
      console.log('👤 Employee profile ID:', profile.id);
      console.log('📅 Current month:', currentMonthKey);
      
      // تحويل جميع البيانات أولاً
      const allInvoices = (data || []).filter(isActiveInvoice).map(inv => {
        const contract = inv.contracts as any;
        const customer = contract.customers;
        const customerName = formatCustomerName(customer);

        let status: MonthlyCollectionItem['status'] = 'unpaid';
        const isPaid = inv.payment_status === 'paid';
        
        if (isPaid) status = 'paid';
        else if (inv.paid_amount && inv.paid_amount > 0 && inv.paid_amount < inv.total_amount) status = 'partially_paid';
        else if (new Date(inv.due_date || inv.invoice_date) < new Date() && !isPaid) status = 'overdue';

        // invoice_month is the canonical accounting period; due_date is only a payment deadline.
        const billingMonth = getInvoiceBillingMonthKey(inv);
        const isCurrentMonth = billingMonth === currentMonthKey;
        const dueMonth = getDateMonthKey(inv.due_date || inv.invoice_date);
        const isDueCurrentMonth = dueMonth === currentMonthKey;
        
        console.log('🔍 Invoice check:', {
          invoice_number: inv.invoice_number,
          invoice_month: inv.invoice_month,
          due_date: inv.due_date,
          invoice_date: inv.invoice_date,
          billing_month: billingMonth,
          due_month: dueMonth,
          current_month: currentMonthKey,
          isCurrentMonth,
          isDueCurrentMonth,
          amount: inv.total_amount,
          paid_amount: inv.paid_amount,
          status: inv.payment_status
        });

        return {
          contract_id: contract.id,
          contract_number: contract.contract_number,
          customer_name: customerName,
          customer_id: customer.id,
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          amount: inv.total_amount,
          paid_amount: inv.paid_amount || 0,
          status,
          due_date: inv.due_date || inv.invoice_date,
          payment_date: undefined,
          is_paid: isPaid,
          billing_month: billingMonth,
          is_current_month: isCurrentMonth,
          is_due_current_month: isDueCurrentMonth,
        } as MonthlyCollectionInternalItem;
      });

      const currentMonthInvoicesCount = allInvoices.filter((i: any) => i.is_current_month && i.is_due_current_month).length;
      const totalForCurrentMonth = allInvoices
        .filter((i: any) => i.is_current_month && i.is_due_current_month)
        .reduce((sum, inv) => sum + inv.amount, 0);
      
      console.log('📅 Total invoices:', allInvoices.length);
      console.log('📅 Current month invoices:', currentMonthInvoicesCount);
      console.log('💰 Total for current month:', totalForCurrentMonth);
      
      if (currentMonthInvoicesCount === 0 && allInvoices.length > 0) {
        console.warn('⚠️ No invoices for current month! All invoices are for other months.');
        
        // تجميع الفواتير حسب الشهر
        const invoicesByMonth = allInvoices.reduce((acc: any, inv: any) => {
          const month = inv.billing_month || 'unknown';
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});
        
        console.log('📋 Invoices by month:', invoicesByMonth);
        console.log('📋 Sample invoices (first 5):', allInvoices.slice(0, 5).map((inv: any) => ({
          invoice: inv.invoice_number,
          due_date: inv.due_date,
          month: inv.billing_month,
          amount: inv.amount
        })));
      }

      // إرجاع جميع الفواتير (سيتم الفلترة في الإحصائيات)
      return allInvoices;
    },
    enabled: !!profile?.id
  });

  // فلترة الفواتير غير المدفوعة للعرض في القائمة: شهر الفاتورة الحالي وتاريخ استحقاقها في الشهر الحالي فقط.
  const currentMonthDueInvoices = collections.filter(
    (c: any) => c.is_current_month && c.is_due_current_month
  );

  const unpaidCollections = currentMonthDueInvoices.filter(c => c.status !== 'paid');

  console.log('📊 Using invoices for stats:', {
    currentMonthCount: currentMonthDueInvoices.length,
    unpaidCount: unpaidCollections.length,
    usingCurrentMonth: currentMonthDueInvoices.length > 0
  });

  const stats: MonthlyCollectionStats = {
    totalDue: currentMonthDueInvoices.reduce((sum, item) => sum + item.amount, 0),
    totalCollected: currentMonthDueInvoices.reduce((sum, item) => sum + item.paid_amount, 0),
    totalPending: 0, // سيتم حسابه بعد قليل
    collectionRate: 0,
    paidCount: currentMonthDueInvoices.filter(c => c.status === 'paid').length,
    pendingCount: currentMonthDueInvoices.filter(c => c.status !== 'paid').length
  };

  stats.totalPending = currentMonthDueInvoices.reduce(
    (sum, item) => sum + Math.max(0, item.amount - item.paid_amount),
    0
  );
  
  // نسبة التحصيل = (المحصل / المستهدف) × 100
  stats.collectionRate = stats.totalDue > 0 
    ? Math.round((stats.totalCollected / stats.totalDue) * 100) 
    : 0;

  console.log('📊 Stats calculated:', {
    totalDue: stats.totalDue,
    totalCollected: stats.totalCollected,
    totalPending: stats.totalPending,
    collectionRate: stats.collectionRate,
    invoicesUsedForStats: currentMonthDueInvoices.length,
    unpaidCollectionsCount: unpaidCollections.length
  });

  return {
    collections: unpaidCollections, // الفواتير غير المدفوعة للعرض
    allCollections: collections,    // جميع الفواتير (للإحصائيات)
    stats,
    isLoading,
    refetch
  };
};
