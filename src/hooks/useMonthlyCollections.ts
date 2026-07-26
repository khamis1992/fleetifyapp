import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, format } from 'date-fns';
import { formatCustomerName } from '@/utils/formatCustomerName';

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
    queryKey: ['monthly-collections', 'v2', profile?.id],
    queryFn: async () => {
      if (!profile?.id || !profile.company_id) return [];

      const today = new Date();
      const currentMonthStart = startOfMonth(today);

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
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      console.log('📊 Total invoices fetched for employee:', data?.length);
      console.log('👤 Employee profile ID:', profile.id);
      console.log('📅 Current month start:', format(currentMonthStart, 'yyyy-MM-dd'));
      
      // تحويل جميع البيانات أولاً
      const allInvoices = (data || []).map(inv => {
        const contract = inv.contracts as any;
        const customer = contract.customers;
        const customerName = formatCustomerName(customer);

        let status: MonthlyCollectionItem['status'] = 'unpaid';
        const isPaid = inv.payment_status === 'paid';
        
        if (isPaid) status = 'paid';
        else if (inv.paid_amount && inv.paid_amount > 0 && inv.paid_amount < inv.total_amount) status = 'partially_paid';
        else if (new Date(inv.due_date || inv.invoice_date) < new Date() && !isPaid) status = 'overdue';

        // تحديد شهر الفاتورة
        const invoiceDate = new Date(inv.due_date || inv.invoice_date);
        const invoiceMonthStart = startOfMonth(invoiceDate);
        const isCurrentMonth = invoiceMonthStart.getTime() === currentMonthStart.getTime();
        
        console.log('🔍 Invoice check:', {
          invoice_number: inv.invoice_number,
          due_date: inv.due_date,
          invoice_date: inv.invoice_date,
          invoiceMonthStart: format(invoiceMonthStart, 'yyyy-MM-dd'),
          currentMonthStart: format(currentMonthStart, 'yyyy-MM-dd'),
          isCurrentMonth,
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
          is_paid: isPaid,
          is_current_month: isCurrentMonth, // علامة لتحديد إذا كانت الفاتورة تخص الشهر الحالي
        } as MonthlyCollectionItem & { is_current_month?: boolean };
      });

      const currentMonthInvoicesCount = allInvoices.filter((i: any) => i.is_current_month).length;
      const totalForCurrentMonth = allInvoices.filter((i: any) => i.is_current_month).reduce((sum, inv) => sum + inv.amount, 0);
      
      console.log('📅 Total invoices:', allInvoices.length);
      console.log('📅 Current month invoices:', currentMonthInvoicesCount);
      console.log('💰 Total for current month:', totalForCurrentMonth);
      
      if (currentMonthInvoicesCount === 0 && allInvoices.length > 0) {
        console.warn('⚠️ No invoices for current month! All invoices are for other months.');
        
        // تجميع الفواتير حسب الشهر
        const invoicesByMonth = allInvoices.reduce((acc: any, inv: any) => {
          const month = format(startOfMonth(new Date(inv.due_date)), 'yyyy-MM');
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});
        
        console.log('📋 Invoices by month:', invoicesByMonth);
        console.log('📋 Sample invoices (first 5):', allInvoices.slice(0, 5).map((inv: any) => ({
          invoice: inv.invoice_number,
          due_date: inv.due_date,
          month: format(startOfMonth(new Date(inv.due_date)), 'yyyy-MM'),
          amount: inv.amount
        })));
      }

      // إرجاع جميع الفواتير (سيتم الفلترة في الإحصائيات)
      return allInvoices;
    },
    enabled: !!profile?.id
  });

  // فلترة الفواتير غير المدفوعة للعرض في القائمة (جميع الفواتير غير المدفوعة)
  const unpaidCollections = collections.filter(c => c.status !== 'paid');

  // فلترة فواتير الشهر الحالي فقط للإحصائيات
  const currentMonthInvoices = collections.filter((c: any) => c.is_current_month);

  // Monthly cards must always represent the current month. Historical overdue
  // invoices remain in the collection list, but must not inflate this metric.
  const invoicesForStats = currentMonthInvoices;

  console.log('📊 Using invoices for stats:', {
    currentMonthCount: currentMonthInvoices.length,
    unpaidCount: unpaidCollections.length,
    usingCurrentMonth: currentMonthInvoices.length > 0
  });

  const stats: MonthlyCollectionStats = {
    totalDue: invoicesForStats.reduce((sum, item) => sum + item.amount, 0),
    totalCollected: invoicesForStats.reduce((sum, item) => sum + item.paid_amount, 0),
    totalPending: 0, // سيتم حسابه بعد قليل
    collectionRate: 0,
    paidCount: invoicesForStats.filter(c => c.status === 'paid').length,
    pendingCount: invoicesForStats.filter(c => c.status !== 'paid').length
  };

  stats.totalPending = invoicesForStats.reduce(
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
    invoicesUsedForStats: invoicesForStats.length,
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
