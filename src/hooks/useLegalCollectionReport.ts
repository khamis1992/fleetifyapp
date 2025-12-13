/**
 * Hook لتقرير الذمم تحت التحصيل القانوني
 * يعرض جميع العقود المحولة للقضايا القانونية مع تفاصيلها المالية
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyFilter } from "@/hooks/useCompanyScope";

export interface LegalCollectionItem {
  // معلومات العقد
  contract_id: string;
  contract_number: string;
  contract_status: string;
  
  // معلومات العميل
  customer_id: string;
  customer_name: string;
  customer_code: string;
  customer_phone: string | null;
  
  // معلومات القضية
  case_id: string;
  case_number: string;
  case_status: string;
  case_type: string;
  filing_date: string | null;
  hearing_date: string | null;
  
  // المبالغ المالية
  original_debt: number; // المبلغ الأصلي
  provision_amount: number; // مبلغ المخصص
  provision_rate: number; // نسبة المخصص
  net_receivable: number; // صافي المستحق
  collected_amount: number; // المبلغ المحصل
  remaining_amount: number; // المتبقي
  
  // التكاليف القانونية
  legal_fees: number;
  court_fees: number;
  total_costs: number;
  
  // معلومات إضافية
  days_in_legal: number; // أيام تحت الإجراء القانوني
  created_at: string;
}

export interface LegalCollectionSummary {
  total_cases: number;
  total_original_debt: number;
  total_provision: number;
  total_net_receivable: number;
  total_collected: number;
  total_remaining: number;
  total_legal_costs: number;
  collection_rate: number; // نسبة التحصيل
  
  // تفصيل حسب الحالة
  by_status: {
    active: number;
    closed: number;
    won: number;
    lost: number;
    settled: number;
  };
}

export const useLegalCollectionReport = () => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();

  return useQuery({
    queryKey: ['legal-collection-report', companyFilter],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // جلب العقود تحت الإجراءات القانونية مع القضايا المرتبطة
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          status,
          balance_due,
          customer_id,
          created_at,
          customers!inner (
            id,
            customer_code,
            first_name,
            last_name,
            company_name,
            phone
          )
        `)
        .eq('company_id', companyFilter.company_id)
        .eq('status', 'under_legal_procedure');

      if (contractsError) throw contractsError;

      // جلب القضايا القانونية المرتبطة
      const { data: legalCases, error: casesError } = await supabase
        .from('legal_cases')
        .select(`
          id,
          case_number,
          case_status,
          case_type,
          case_value,
          filing_date,
          hearing_date,
          legal_fees,
          court_fees,
          total_costs,
          client_id,
          created_at
        `)
        .eq('company_id', companyFilter.company_id);

      if (casesError) throw casesError;

      // جلب المدفوعات المرتبطة بالعقود
      const contractIds = contracts?.map(c => c.id) || [];
      const { data: payments } = await supabase
        .from('payments')
        .select('contract_id, amount, payment_status')
        .in('contract_id', contractIds)
        .eq('payment_status', 'completed');

      // حساب المبالغ المحصلة لكل عقد
      const paymentsByContract: Record<string, number> = {};
      payments?.forEach(p => {
        if (p.contract_id) {
          paymentsByContract[p.contract_id] = (paymentsByContract[p.contract_id] || 0) + (p.amount || 0);
        }
      });

      // بناء البيانات
      const items: LegalCollectionItem[] = [];
      
      contracts?.forEach(contract => {
        const customer = contract.customers as any;
        const customerName = customer?.company_name || 
          `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 
          'غير محدد';

        // البحث عن القضية المرتبطة
        const relatedCase = legalCases?.find(c => c.client_id === contract.customer_id);
        
        if (relatedCase) {
          const originalDebt = relatedCase.case_value || contract.balance_due || 0;
          const daysInLegal = Math.floor(
            (new Date().getTime() - new Date(relatedCase.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // حساب نسبة المخصص
          let provisionRate = 0.25;
          if (daysInLegal > 365) provisionRate = 1.0;
          else if (daysInLegal > 270) provisionRate = 0.75;
          else if (daysInLegal > 180) provisionRate = 0.50;

          const provisionAmount = originalDebt * provisionRate;
          const collectedAmount = paymentsByContract[contract.id] || 0;
          const remainingAmount = originalDebt - collectedAmount;

          items.push({
            contract_id: contract.id,
            contract_number: contract.contract_number,
            contract_status: contract.status,
            customer_id: contract.customer_id,
            customer_name: customerName,
            customer_code: customer?.customer_code || '',
            customer_phone: customer?.phone,
            case_id: relatedCase.id,
            case_number: relatedCase.case_number,
            case_status: relatedCase.case_status,
            case_type: relatedCase.case_type,
            filing_date: relatedCase.filing_date,
            hearing_date: relatedCase.hearing_date,
            original_debt: originalDebt,
            provision_amount: provisionAmount,
            provision_rate: provisionRate,
            net_receivable: originalDebt - provisionAmount,
            collected_amount: collectedAmount,
            remaining_amount: remainingAmount,
            legal_fees: relatedCase.legal_fees || 0,
            court_fees: relatedCase.court_fees || 0,
            total_costs: relatedCase.total_costs || 0,
            days_in_legal: daysInLegal,
            created_at: relatedCase.created_at,
          });
        }
      });

      // حساب الملخص
      const summary: LegalCollectionSummary = {
        total_cases: items.length,
        total_original_debt: items.reduce((sum, i) => sum + i.original_debt, 0),
        total_provision: items.reduce((sum, i) => sum + i.provision_amount, 0),
        total_net_receivable: items.reduce((sum, i) => sum + i.net_receivable, 0),
        total_collected: items.reduce((sum, i) => sum + i.collected_amount, 0),
        total_remaining: items.reduce((sum, i) => sum + i.remaining_amount, 0),
        total_legal_costs: items.reduce((sum, i) => sum + i.total_costs, 0),
        collection_rate: items.length > 0 
          ? (items.reduce((sum, i) => sum + i.collected_amount, 0) / items.reduce((sum, i) => sum + i.original_debt, 0)) * 100 
          : 0,
        by_status: {
          active: items.filter(i => i.case_status === 'active').length,
          closed: items.filter(i => i.case_status === 'closed').length,
          won: items.filter(i => i.case_status === 'won').length,
          lost: items.filter(i => i.case_status === 'lost').length,
          settled: items.filter(i => i.case_status === 'settled').length,
        },
      };

      return { items, summary };
    },
    enabled: !!user?.id && !!companyFilter.company_id,
    staleTime: 60000, // Cache for 1 minute
  });
};

/**
 * Hook لجلب إحصائيات سريعة للذمم تحت التحصيل القانوني
 */
export const useLegalCollectionStats = () => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();

  return useQuery({
    queryKey: ['legal-collection-stats', companyFilter],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // عدد العقود تحت الإجراءات القانونية
      const { count: contractsCount } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyFilter.company_id)
        .eq('status', 'under_legal_procedure');

      // إجمالي المبالغ من القضايا
      const { data: cases } = await supabase
        .from('legal_cases')
        .select('case_value, case_status')
        .eq('company_id', companyFilter.company_id);

      const totalValue = cases?.reduce((sum, c) => sum + (c.case_value || 0), 0) || 0;
      const activeCases = cases?.filter(c => c.case_status === 'active').length || 0;

      return {
        contracts_under_legal: contractsCount || 0,
        total_legal_value: totalValue,
        active_cases: activeCases,
        total_cases: cases?.length || 0,
      };
    },
    enabled: !!user?.id && !!companyFilter.company_id,
    staleTime: 30000,
  });
};

