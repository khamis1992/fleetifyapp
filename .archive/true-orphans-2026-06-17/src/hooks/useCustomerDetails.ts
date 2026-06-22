/**
 * Hook شامل لجلب جميع بيانات العميل المتكاملة
 * يجمع البيانات من جميع الجداول المرتبطة بالعميل
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';

// أنواع البيانات
export interface CustomerBasicInfo {
  id: string;
  customer_code: string;
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  company_name?: string;
  company_name_ar?: string;
  email?: string;
  phone: string;
  alternative_phone?: string;
  national_id?: string;
  national_id_expiry?: string;
  passport_number?: string;
  license_number?: string;
  license_expiry?: string;
  address?: string;
  address_ar?: string;
  city?: string;
  country?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  credit_limit?: number;
  is_blacklisted?: boolean;
  blacklist_reason?: string;
  notes?: string;
  is_active?: boolean;
  auto_pay_enabled?: boolean;
  created_at: string;
}

export interface CustomerBalance {
  current_balance: number;
  overdue_amount: number;
  days_overdue: number;
  credit_limit: number;
  credit_used: number;
  credit_available: number;
  last_payment_date?: string;
  last_payment_amount?: number;
}

export interface CustomerFinancialSummary {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  average_days_to_pay: number;
  credit_score: number;
  risk_level: string;
  last_payment_date?: string;
}

export interface CustomerPaymentScore {
  score: number;
  category: string;
  late_payments_deduction: number;
  broken_promises_deduction: number;
  early_payments_bonus: number;
  calculated_at: string;
}

export interface PaymentBehavior {
  average_days_to_pay: number;
  preferred_payment_method?: string;
  best_day_to_contact?: string;
  best_time_to_contact?: string;
  response_rate: number;
  promise_keeping_rate: number;
  on_time_payment_rate: number;
  typical_delay_days: number;
  prefers_reminders: boolean;
}

export interface CustomerContract {
  id: string;
  contract_number: string;
  status: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  vehicle_id?: string;
}

export interface CustomerInvoice {
  id: string;
  invoice_number?: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  due_date?: string;
  created_at: string;
}

export interface CustomerNote {
  id: string;
  note_type: string;
  title: string;
  content: string;
  is_important: boolean;
  created_at: string;
  created_by?: string;
}

export interface ScheduledFollowup {
  id: string;
  followup_type: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: string;
  priority: string;
  title: string;
  description?: string;
}

export interface PaymentPromise {
  id: string;
  promise_date: string;
  promised_amount: number;
  actual_paid_amount?: number;
  actual_paid_date?: string;
  status: string;
  contact_method?: string;
  notes?: string;
}

export interface LegalCase {
  id: string;
  case_number: string;
  case_title: string;
  case_type: string;
  case_status: string;
  priority: string;
  case_value?: number;
  filing_date?: string;
  hearing_date?: string;
}

export interface CustomerPenalty {
  id: string;
  penalty_number: string;
  violation_type?: string;
  penalty_date: string;
  amount: number;
  status?: string;
  payment_status?: string;
  vehicle_plate?: string;
}

export interface CustomerDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_path?: string;
  uploaded_at?: string;
  is_required: boolean;
}

export interface CustomerHealthScore {
  overall: number; // 0-100
  financial: number;
  engagement: number;
  risk: number;
  trend: 'up' | 'down' | 'stable';
  factors: {
    positive: string[];
    negative: string[];
  };
}

export interface CustomerDetails {
  basic: CustomerBasicInfo | null;
  balance: CustomerBalance | null;
  financial: CustomerFinancialSummary | null;
  paymentScore: CustomerPaymentScore | null;
  behavior: PaymentBehavior | null;
  contracts: CustomerContract[];
  invoices: CustomerInvoice[];
  notes: CustomerNote[];
  followups: ScheduledFollowup[];
  promises: PaymentPromise[];
  legalCases: LegalCase[];
  penalties: CustomerPenalty[];
  documents: CustomerDocument[];
  healthScore: CustomerHealthScore;
}

// حساب نقاط صحة العميل
function calculateHealthScore(data: Partial<CustomerDetails>): CustomerHealthScore {
  let financialScore = 100;
  let engagementScore = 100;
  let riskScore = 100;
  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];

  // حساب النقاط المالية
  if (data.balance) {
    if (data.balance.overdue_amount > 0) {
      financialScore -= Math.min(40, (data.balance.days_overdue || 0) * 2);
      negativeFactors.push(`مبالغ متأخرة: ${data.balance.overdue_amount.toLocaleString()} ر.ق`);
    }
    if (data.balance.current_balance <= 0) {
      financialScore += 10;
      positiveFactors.push('رصيد مسدد بالكامل');
    }
  }

  if (data.paymentScore) {
    financialScore = Math.round((financialScore + data.paymentScore.score) / 2);
    if (data.paymentScore.early_payments_bonus > 0) {
      positiveFactors.push('دفع مبكر متكرر');
    }
    if (data.paymentScore.broken_promises_deduction > 10) {
      negativeFactors.push('وعود دفع غير ملتزم بها');
    }
  }

  // حساب نقاط التفاعل
  if (data.notes && data.notes.length > 0) {
    const recentNotes = data.notes.filter(n => {
      const noteDate = new Date(n.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return noteDate >= thirtyDaysAgo;
    });
    if (recentNotes.length > 0) {
      engagementScore += 10;
      positiveFactors.push(`${recentNotes.length} تفاعل خلال 30 يوم`);
    }
  } else {
    engagementScore -= 20;
    negativeFactors.push('لا يوجد تواصل مسجل');
  }

  if (data.behavior) {
    if (data.behavior.response_rate > 70) {
      engagementScore += 15;
      positiveFactors.push('معدل استجابة ممتاز');
    }
    if (data.behavior.response_rate < 30) {
      engagementScore -= 20;
      negativeFactors.push('معدل استجابة ضعيف');
    }
  }

  // حساب نقاط المخاطر
  if (data.basic?.is_blacklisted) {
    riskScore = 0;
    negativeFactors.push('العميل في القائمة السوداء');
  }

  if (data.legalCases && data.legalCases.length > 0) {
    const activeCases = data.legalCases.filter(c => 
      c.case_status !== 'closed' && c.case_status !== 'resolved'
    );
    if (activeCases.length > 0) {
      riskScore -= activeCases.length * 15;
      negativeFactors.push(`${activeCases.length} قضية قانونية نشطة`);
    }
  }

  if (data.financial?.risk_level === 'high') {
    riskScore -= 25;
    negativeFactors.push('مستوى مخاطر مرتفع');
  } else if (data.financial?.risk_level === 'low') {
    riskScore += 10;
    positiveFactors.push('مستوى مخاطر منخفض');
  }

  // تحديد الاتجاه
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (data.behavior?.on_time_payment_rate) {
    if (data.behavior.on_time_payment_rate > 70) trend = 'up';
    else if (data.behavior.on_time_payment_rate < 40) trend = 'down';
  }

  // حساب النتيجة الإجمالية
  const overall = Math.round(
    Math.max(0, Math.min(100, 
      (financialScore * 0.4) + (engagementScore * 0.3) + (riskScore * 0.3)
    ))
  );

  return {
    overall,
    financial: Math.max(0, Math.min(100, financialScore)),
    engagement: Math.max(0, Math.min(100, engagementScore)),
    risk: Math.max(0, Math.min(100, riskScore)),
    trend,
    factors: {
      positive: positiveFactors.slice(0, 5),
      negative: negativeFactors.slice(0, 5),
    },
  };
}

// Hook الرئيسي لجلب تفاصيل العميل
export function useCustomerDetails(customerId: string | null) {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['customer-details', customerId, companyId],
    queryFn: async (): Promise<CustomerDetails> => {
      if (!customerId || !companyId) {
        throw new Error('Customer ID and Company ID are required');
      }

      // جلب البيانات الأساسية
      const [
        basicResult,
        balanceResult,
        financialResult,
        scoreResult,
        behaviorResult,
        contractsResult,
        invoicesResult,
        notesResult,
        followupsResult,
        promisesResult,
        legalResult,
        penaltiesResult,
        documentsResult,
      ] = await Promise.all([
        // البيانات الأساسية للعميل
        supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .eq('company_id', companyId)
          .single(),

        // رصيد العميل
        supabase
          .from('customer_balances')
          .select('*')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .single(),

        // الملخص المالي
        supabase
          .from('customer_financial_summary')
          .select('*')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .order('summary_date', { ascending: false })
          .limit(1)
          .single(),

        // نقاط الدفع
        supabase
          .from('customer_payment_scores')
          .select('*')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single(),

        // سلوك الدفع
        supabase
          .from('payment_behavior_analytics')
          .select('*')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .single(),

        // العقود
        supabase
          .from('contracts')
          .select('id, contract_number, status, start_date, end_date, monthly_amount, vehicle_id')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false }),

        // الفواتير
        supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, paid_amount, payment_status, due_date, created_at')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(20),

        // الملاحظات
        supabase
          .from('customer_notes')
          .select('*')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(50),

        // المتابعات المجدولة
        supabase
          .from('scheduled_followups')
          .select('*')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .order('scheduled_date', { ascending: true }),

        // وعود الدفع
        supabase
          .from('payment_promises')
          .select('*')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .order('promise_date', { ascending: false })
          .limit(10),

        // القضايا القانونية
        supabase
          .from('legal_cases')
          .select('id, case_number, case_title, case_type, case_status, priority, case_value, filing_date, hearing_date')
          .eq('client_id', customerId)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false }),

        // المخالفات
        supabase
          .from('penalties')
          .select('id, penalty_number, violation_type, penalty_date, amount, status, payment_status, vehicle_plate')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .order('penalty_date', { ascending: false }),

        // المستندات
        supabase
          .from('customer_documents')
          .select('id, document_type, document_name, file_path, uploaded_at, is_required')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .order('uploaded_at', { ascending: false }),
      ]);

      const details: Partial<CustomerDetails> = {
        basic: basicResult.data as CustomerBasicInfo || null,
        balance: balanceResult.data as CustomerBalance || null,
        financial: financialResult.data as CustomerFinancialSummary || null,
        paymentScore: scoreResult.data as CustomerPaymentScore || null,
        behavior: behaviorResult.data as PaymentBehavior || null,
        contracts: (contractsResult.data || []) as CustomerContract[],
        invoices: (invoicesResult.data || []) as CustomerInvoice[],
        notes: (notesResult.data || []) as CustomerNote[],
        followups: (followupsResult.data || []) as ScheduledFollowup[],
        promises: (promisesResult.data || []) as PaymentPromise[],
        legalCases: (legalResult.data || []) as LegalCase[],
        penalties: (penaltiesResult.data || []) as CustomerPenalty[],
        documents: (documentsResult.data || []) as CustomerDocument[],
      };

      // حساب نقاط الصحة
      const healthScore = calculateHealthScore(details);

      return {
        ...details,
        healthScore,
      } as CustomerDetails;
    },
    enabled: !!customerId && !!companyId,
    staleTime: 1000 * 60 * 2, // 2 دقيقة
    gcTime: 1000 * 60 * 10, // 10 دقائق
  });
}

// Hook لجلب إحصائيات سريعة للعميل
export function useCustomerQuickStats(customerId: string | null) {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['customer-quick-stats', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return null;

      const [invoicesResult, paymentsResult, contractsResult] = await Promise.all([
        supabase
          .from('invoices')
          .select('total_amount, paid_amount, payment_status')
          .eq('customer_id', customerId)
          .eq('company_id', companyId),

        supabase
          .from('payments')
          .select('amount, payment_date')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .order('payment_date', { ascending: false })
          .limit(1),

        supabase
          .from('contracts')
          .select('id, status')
          .eq('customer_id', customerId)
          .eq('company_id', companyId),
      ]);

      const invoices = invoicesResult.data || [];
      const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
      const outstanding = totalInvoiced - totalPaid;
      const overdueCount = invoices.filter(inv => 
        inv.payment_status !== 'paid' && inv.payment_status !== 'cancelled'
      ).length;

      const contracts = contractsResult.data || [];
      const activeContracts = contracts.filter(c => c.status === 'active').length;

      const lastPayment = paymentsResult.data?.[0];

      return {
        totalInvoiced,
        totalPaid,
        outstanding,
        overdueCount,
        activeContracts,
        totalContracts: contracts.length,
        lastPaymentDate: lastPayment?.payment_date || null,
        lastPaymentAmount: lastPayment?.amount || null,
      };
    },
    enabled: !!customerId && !!companyId,
    staleTime: 1000 * 60 * 5,
  });
}

