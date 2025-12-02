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
}

export interface ContractForLegal {
  id: string;
  contract_number: string;
  customer_id: string;
  vehicle_id?: string;
  company_id: string;
  contract_amount: number;
  total_paid: number;
  balance_due: number;
  late_fine_amount: number;
  monthly_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  customer?: {
    id: string;
    first_name?: string;
    last_name?: string;
    first_name_ar?: string;
    last_name_ar?: string;
    company_name?: string;
    company_name_ar?: string;
    phone?: string;
    email?: string;
    national_id?: string;
    customer_type?: string;
  };
  vehicle?: {
    id: string;
    plate_number?: string;
    make?: string;
    model?: string;
    year?: number;
  };
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
export const useCalculateCaseValue = (contractId: string, companyId?: string) => {
  return useQuery({
    queryKey: ['calculate-case-value', contractId],
    queryFn: async () => {
      if (!contractId || !companyId) return { totalValue: 0, breakdown: {} };

      // جلب بيانات العقد
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('balance_due, late_fine_amount, customer_id')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;

      // جلب المخالفات المرورية غير المدفوعة
      const { data: violations, error: violationsError } = await supabase
        .from('traffic_violations')
        .select('total_amount')
        .eq('contract_id', contractId)
        .eq('status', 'pending');

      if (violationsError) {
        console.warn('Error fetching violations:', violationsError);
      }

      const balanceDue = contract?.balance_due || 0;
      const lateFines = contract?.late_fine_amount || 0;
      const trafficViolations = violations?.reduce((sum, v) => sum + (v.total_amount || 0), 0) || 0;

      return {
        totalValue: balanceDue + lateFines + trafficViolations,
        breakdown: {
          balanceDue,
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
export const useConvertToLegal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ConvertToLegalParams & { contract: ContractForLegal }) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      const { contract, notes, priority = 'high', caseType = 'payment_collection' } = params;

      // التحقق من عدم وجود قضية سابقة مفتوحة
      const { data: existingCase } = await supabase
        .from('legal_cases')
        .select('id, case_number, case_status')
        .eq('contract_id', contract.id)
        .in('case_status', ['active', 'pending', 'on_hold'])
        .maybeSingle();

      if (existingCase) {
        throw new Error(`يوجد قضية مفتوحة سابقاً لهذا العقد: ${existingCase.case_number}`);
      }

      // حساب قيمة القضية
      const { data: violations } = await supabase
        .from('traffic_violations')
        .select('total_amount')
        .eq('contract_id', contract.id)
        .eq('status', 'pending');

      const trafficViolationsTotal = violations?.reduce((sum, v) => sum + (v.total_amount || 0), 0) || 0;
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
          case_status: 'active',
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

      // تحديث حالة المركبة إلى متوفرة
      if (contract.vehicle_id) {
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .update({
            status: 'available',
            updated_at: new Date().toISOString(),
          })
          .eq('id', contract.vehicle_id);

        if (vehicleError) {
          console.warn('Error updating vehicle status:', vehicleError);
        }
      }

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
 * Hook لإلغاء الإجراء القانوني واستعادة العقد
 */
export const useRevertFromLegal = () => {
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

