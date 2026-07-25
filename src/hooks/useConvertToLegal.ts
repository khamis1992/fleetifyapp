/**
 * Hook لتحويل العقد إلى قضية قانونية
 * يقوم بإنشاء قضية جديدة وتحديث حالة العقد والمركبة
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ConvertToLegalParams {
  contractId: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  caseType?: 'payment_collection' | 'contract_breach' | 'vehicle_damage' | 'other';
  vehicleReturned?: boolean;
}

export interface ContractForLegal {
  id: string;
  contract_number: string;
  customer_id: string;
  vehicle_id?: string | null;
  company_id: string;
  contract_amount: number;
  total_paid?: number | null;
  balance_due?: number | null;
  late_fine_amount?: number | null;
  monthly_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  vehicle_returned?: boolean | null;
  customer?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    first_name_ar?: string | null;
    last_name_ar?: string | null;
    company_name?: string | null;
    company_name_ar?: string | null;
    phone?: string | null;
    email?: string | null;
    national_id?: string | null;
    customer_type?: string | null;
  } | null;
  vehicle?: {
    id: string;
    plate_number?: string | null;
    make?: string | null;
    model?: string | null;
    year?: number | null;
  } | null;
}

/**
 * Hook للتحقق من وجود قضية سابقة للعقد
 */
export const useExistingLegalCase = (contractId: string) => {
  return useQuery({
    queryKey: ['existing-legal-case', contractId],
    queryFn: async () => {
      if (!contractId) return null;
      
      const { data, error } = await supabase
        .from('legal_cases')
        .select('id, case_number, case_status, case_title, created_at')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!contractId,
  });
};

/**
 * Hook لحساب قيمة القضية التلقائية
 */
export const useCalculateCaseValue = (
  contractId: string,
  companyId?: string,
  vehicleReturned = false
) => {
  return useQuery({
    queryKey: ['calculate-case-value', contractId, vehicleReturned],
    queryFn: async () => {
      if (!contractId || !companyId) return { totalValue: 0, breakdown: {} };

      // جلب بيانات العقد
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('balance_due, late_fine_amount, customer_id')
        .eq('company_id', companyId)
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;

      const [{ data: invoices, error: invoicesError }, { data: violations, error: violationsError }] =
        await Promise.all([
          supabase
            .from('invoices')
            .select('total_amount, paid_amount, balance_due, status')
            .eq('company_id', companyId)
            .eq('contract_id', contractId),
          supabase
            .from('penalties')
            .select('amount')
            .eq('company_id', companyId)
            .eq('contract_id', contractId)
            .neq('payment_status', 'paid')
            .neq('status', 'cancelled'),
        ]);

      if (invoicesError) throw invoicesError;
      if (violationsError) {
        console.warn('Error fetching violations:', violationsError);
      }

      const activeInvoices = (invoices || []).filter((invoice) =>
        !['cancelled', 'canceled', 'void', 'reversed'].includes(
          String(invoice.status || '').toLowerCase()
        )
      );
      const invoiceBalance = activeInvoices.reduce((sum, invoice) => {
        const calculatedBalance = Math.max(
          Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0),
          0
        );
        return sum + Math.max(Number(invoice.balance_due ?? calculatedBalance), 0);
      }, 0);
      const contractBalance = Number(contract?.balance_due || 0);
      const balanceDue = vehicleReturned && activeInvoices.length > 0
        ? invoiceBalance
        : contractBalance;
      const lateFines = contract?.late_fine_amount || 0;
      const trafficViolations = violations?.reduce((sum, v) => sum + (Number(v.amount) || 0), 0) || 0;

      return {
        totalValue: balanceDue + lateFines,
        breakdown: {
          balanceDue,
          contractBalance,
          invoiceBalance,
          lateFines,
          trafficViolations,
        },
      };
    },
    enabled: !!contractId && !!companyId,
  });
};

/**
 * Hook الرئيسي لتحويل العقد إلى قضية قانونية
 */
const useLegacyConvertToLegal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ConvertToLegalParams & { contract: ContractForLegal }) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      const { contract, notes, priority = 'high', caseType = 'payment_collection' } = params;

      // التحقق من عدم وجود قضية سابقة مفتوحة (نشطة أو تحت الإجراء أو معلقة)
      const { data: existingCase } = await supabase
        .from('legal_cases')
        .select('id, case_number, case_status')
        .eq('contract_id', contract.id)
        .in('case_status', ['active', 'pending', 'on_hold', 'under_review'])
        .maybeSingle();

      if (existingCase) {
        throw new Error(`يوجد قضية مفتوحة سابقاً لهذا العقد: ${existingCase.case_number}`);
      }

      // حساب قيمة القضية
      const { data: violations } = await supabase
        .from('penalties')
        .select('amount')
        .eq('contract_id', contract.id)
        .neq('payment_status', 'paid')
        .neq('status', 'cancelled');

      const trafficViolationsTotal = violations?.reduce((sum, v) => sum + (Number(v.amount) || 0), 0) || 0;
      const totalCaseValue = (contract.balance_due || 0) + (contract.late_fine_amount || 0) + trafficViolationsTotal;

      // الحصول على اسم العميل
      const customerName = contract.customer
        ? contract.customer.customer_type === 'corporate'
          ? contract.customer.company_name_ar || contract.customer.company_name || 'عميل'
          : `${contract.customer.first_name_ar || contract.customer.first_name || ''} ${contract.customer.last_name_ar || contract.customer.last_name || ''}`.trim() || 'عميل'
        : 'عميل غير محدد';

      // توليد رقم القضية
      const { data: caseNumber, error: numberError } = await supabase
        .rpc('generate_legal_case_number', { company_id_param: contract.company_id });

      if (numberError) {
        console.warn('Error generating case number, using fallback:', numberError);
      }

      const finalCaseNumber = caseNumber || `LC-${contract.contract_number}-${Date.now()}`;

      // إنشاء القضية القانونية
      const { data: legalCase, error: caseError } = await supabase
        .from('legal_cases')
        .insert({
          company_id: contract.company_id,
          contract_id: contract.id,
          case_number: finalCaseNumber,
          case_title: `تحصيل مستحقات عقد ${contract.contract_number}`,
          case_title_ar: `تحصيل مستحقات عقد ${contract.contract_number}`,
          case_type: caseType,
          case_status: 'pending',  // تحت الإجراء - لم تُفتح في المحكمة بعد
          priority,
          client_id: contract.customer_id,
          client_name: customerName,
          client_phone: contract.customer?.phone || null,
          client_email: contract.customer?.email || null,
          case_value: totalCaseValue,
          description: `قضية تحصيل مستحقات للعقد رقم ${contract.contract_number}
          
المبلغ المتبقي: ${contract.balance_due || 0}
غرامات التأخير: ${contract.late_fine_amount || 0}
المخالفات المرورية: ${trafficViolationsTotal}
إجمالي المطالبة: ${totalCaseValue}

${notes ? `ملاحظات: ${notes}` : ''}`,
          notes: `
رقم العقد: ${contract.contract_number}
رقم هوية العميل: ${contract.customer?.national_id || '-'}
رقم لوحة المركبة: ${contract.vehicle?.plate_number || '-'}
نوع المركبة: ${contract.vehicle?.make || '-'} ${contract.vehicle?.model || '-'} ${contract.vehicle?.year || ''}
تاريخ بداية العقد: ${contract.start_date}
تاريخ نهاية العقد: ${contract.end_date}
المبلغ الشهري: ${contract.monthly_amount}
إجمالي العقد: ${contract.contract_amount}
المدفوع: ${contract.total_paid}
`,
          legal_fees: 0,
          court_fees: 0,
          other_expenses: 0,
          total_costs: 0,
          billing_status: 'pending',
          is_confidential: false,
          legal_team: [],
          tags: ['تحويل_من_عقد', contract.contract_number],
          filing_date: new Date().toISOString().split('T')[0],
          created_by: user.id,
        })
        .select()
        .single();

      if (caseError) throw caseError;

      // تحديث حالة العقد
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          status: 'under_legal_procedure',
          suspension_reason: `تم التحويل للشؤون القانونية - قضية رقم ${finalCaseNumber}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id);

      if (contractError) throw contractError;

      // ملاحظة: لا نغير حالة المركبة هنا
      // المركبة تبقى 'rented' لأن العقد لا يزال قائماً
      // فقط تم تحويله للشؤون القانونية لمتابعة المستحقات المالية

      // تسجيل العملية في سجل العمليات
      try {
        await supabase
          .from('contract_operations_log')
          .insert({
            contract_id: contract.id,
            company_id: contract.company_id,
            operation_type: 'convert_to_legal',
            operation_details: {
              legal_case_id: legalCase.id,
              legal_case_number: finalCaseNumber,
              total_case_value: totalCaseValue,
            },
            old_values: {
              status: contract.status,
              vehicle_status: 'rented',
            },
            new_values: {
              status: 'under_legal_procedure',
              vehicle_status: 'available',
              legal_case_id: legalCase.id,
              legal_case_number: finalCaseNumber,
            },
            notes: `تم تحويل العقد إلى الشؤون القانونية - قضية رقم ${finalCaseNumber}`,
            performed_by: user.id,
          });
      } catch (logError) {
        console.warn('Error logging operation:', logError);
      }

      // إنشاء نشاط في سجل القضية
      try {
        await supabase
          .from('legal_case_activities')
          .insert({
            case_id: legalCase.id,
            company_id: contract.company_id,
            activity_type: 'case_created',
            activity_title: 'تم إنشاء القضية من عقد',
            activity_description: `تم إنشاء هذه القضية تلقائياً من العقد رقم ${contract.contract_number}`,
            created_by: user.id,
          });
      } catch (activityError) {
        console.warn('Error creating activity:', activityError);
      }

      return {
        legalCase,
        caseNumber: finalCaseNumber,
        totalCaseValue,
      };
    },
    onSuccess: (data) => {
      // تحديث جميع البيانات المتأثرة
      queryClient.invalidateQueries({ queryKey: ['contract-details'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['legal-case-stats'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      toast.success(`تم التحويل بنجاح - قضية رقم ${data.caseNumber}`, {
        description: `قيمة المطالبة: ${data.totalCaseValue.toLocaleString()} ر.ق`,
        action: {
          label: 'عرض القضية',
          onClick: () => {
            window.location.href = `/legal/cases?view=dashboard&case=${data.legalCase.id}`;
          },
        },
      });
    },
    onError: (error: Error) => {
      console.error('Error converting to legal:', error);
      toast.error('فشل في تحويل العقد للشؤون القانونية', {
        description: error.message,
      });
    },
  });
};

/**
 * Hook لإغلاق قضية قانونية محددة
 */
const useLegacyCloseLegalCase = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, reason }: { caseId: string; reason: string }) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      const { data: legalCase, error: fetchError } = await supabase
        .from('legal_cases')
        .select('id, notes')
        .eq('id', caseId)
        .single();

      if (fetchError) throw fetchError;

      const updatedNotes = `${legalCase.notes || ''}\n\nتم إغلاق القضية يدوياً: ${reason}`;
      const { error: updateError } = await supabase
        .from('legal_cases')
        .update({
          case_status: 'closed',
          notes: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId);

      if (updateError) throw updateError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['existing-legal-case'] });
      
      toast.success('تم إغلاق القضية بنجاح');
    },
    onError: (error: Error) => {
      toast.error('فشل في إغلاق القضية', {
        description: error.message,
      });
    },
  });
};

const useLegacyRevertFromLegal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contractId, reason }: { contractId: string; reason: string }) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // جلب بيانات العقد الحالية
      const { data: contract, error: fetchError } = await supabase
        .from('contracts')
        .select('id, company_id, vehicle_id, status')
        .eq('id', contractId)
        .single();

      if (fetchError) throw fetchError;
      if (contract.status !== 'under_legal_procedure') {
        throw new Error('العقد ليس تحت الإجراء القانوني');
      }

      // تحديث حالة العقد
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          status: 'active',
          suspension_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractId);

      if (contractError) throw contractError;

      // تحديث حالة المركبة إلى مؤجرة
      if (contract.vehicle_id) {
        await supabase
          .from('vehicles')
          .update({
            status: 'rented',
            updated_at: new Date().toISOString(),
          })
          .eq('id', contract.vehicle_id);
      }

      // إغلاق القضايا المرتبطة
      const { data: existingCases } = await supabase
        .from('legal_cases')
        .select('id, notes')
        .eq('contract_id', contractId)
        .eq('case_status', 'active');

      if (existingCases && existingCases.length > 0) {
        for (const legalCase of existingCases) {
          const updatedNotes = `${legalCase.notes || ''}\n\nتم إلغاء الإجراء القانوني: ${reason}`;
          await supabase
            .from('legal_cases')
            .update({
              case_status: 'closed',
              notes: updatedNotes,
            })
            .eq('id', legalCase.id);
        }
      }

      // تسجيل العملية
      await supabase
        .from('contract_operations_log')
        .insert({
          contract_id: contractId,
          company_id: contract.company_id,
          operation_type: 'revert_from_legal',
          operation_details: { reason },
          old_values: { status: 'under_legal_procedure' },
          new_values: { status: 'active' },
          notes: `تم إلغاء الإجراء القانوني: ${reason}`,
          performed_by: user.id,
        });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-details'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      toast.success('تم إلغاء الإجراء القانوني بنجاح');
    },
    onError: (error: Error) => {
      toast.error('فشل في إلغاء الإجراء القانوني', {
        description: error.message,
      });
    },
  });
};

void useLegacyConvertToLegal;
void useLegacyCloseLegalCase;
void useLegacyRevertFromLegal;

type ConvertLegalResult = {
  legal_case: { id: string };
  case_number: string;
  total_case_value: number;
};

export const useConvertToLegal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: ConvertToLegalParams & { contract: ContractForLegal }) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');
      const { data, error } = await supabase.rpc('convert_contract_to_legal_v1', {
        p_company_id: params.contract.company_id,
        p_contract_id: params.contract.id,
        p_notes: params.notes || '',
        p_priority: params.priority || 'high',
        p_case_type: params.caseType || 'payment_collection',
        p_vehicle_returned: params.vehicleReturned ?? false,
        p_actor_id: user.id,
      });
      if (error) throw error;
      const result = data as unknown as ConvertLegalResult;
      return { legalCase: result.legal_case, caseNumber: result.case_number, totalCaseValue: Number(result.total_case_value || 0) };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contract-details'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['legal-case-stats'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`تم التحويل بنجاح - قضية رقم ${data.caseNumber}`);
    },
    onError: (error: Error) => toast.error('فشل في تحويل العقد للشؤون القانونية', { description: error.message }),
  });
};

export const useCloseLegalCase = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ caseId, reason }: { caseId: string; reason: string }) => {
      if (!user?.id || !user.profile?.company_id) throw new Error('المستخدم غير مصرح له');
      const { data, error } = await supabase.rpc('close_legal_case_outcome_v1', {
        p_company_id: user.profile.company_id,
        p_case_id: caseId,
        p_case_direction: 'filed_by_us',
        p_outcome_type: 'withdrawn',
        p_outcome_amount: 0,
        p_outcome_amount_type: 'none',
        p_payment_direction: 'none',
        p_outcome_date: new Date().toISOString().slice(0, 10),
        p_outcome_notes: reason,
        p_actor_id: user.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['existing-legal-case'] });
      toast.success('تم إغلاق القضية بنجاح');
    },
    onError: (error: Error) => toast.error('فشل في إغلاق القضية', { description: error.message }),
  });
};

export const useRevertFromLegal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contractId, reason }: { contractId: string; reason: string }) => {
      if (!user?.id || !user.profile?.company_id) throw new Error('المستخدم غير مصرح له');
      const { data, error } = await supabase.rpc('revert_contract_from_legal_v1', {
        p_company_id: user.profile.company_id,
        p_contract_id: contractId,
        p_reason: reason,
        p_actor_id: user.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-details'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('تم إلغاء الإجراء القانوني بنجاح');
    },
    onError: (error: Error) => toast.error('فشل في إلغاء الإجراء القانوني', { description: error.message }),
  });
};

