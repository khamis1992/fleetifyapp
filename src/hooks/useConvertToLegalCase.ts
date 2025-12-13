import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DelinquentCustomer } from "./useDelinquentCustomers";

export interface ConvertToCaseData {
  delinquentCustomer: DelinquentCustomer;
  additionalNotes?: string;
  attachments?: string[];
}

export const useConvertToLegalCase = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConvertToCaseData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { delinquentCustomer, additionalNotes, attachments } = data;

      // Get user's company
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('فشل في جلب بيانات المستخدم');
      }

      if (!profile?.company_id) {
        console.error('No company_id in profile for user:', user.id);
        throw new Error('لم يتم تحديد الشركة للمستخدم');
      }

      // Generate case number (will be done by RPC function or sequence)
      const caseNumberPrefix = 'LC';
      const timestamp = Date.now().toString().slice(-6);
      const caseNumber = `${caseNumberPrefix}-${new Date().getFullYear()}-${timestamp}`;

      // Determine case priority based on risk score
      let priority: string;
      if (delinquentCustomer.risk_score >= 85) {
        priority = 'urgent';
      } else if (delinquentCustomer.risk_score >= 70) {
        priority = 'high';
      } else if (delinquentCustomer.risk_score >= 60) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      // Generate auto description
      const autoDescription = `
قضية تحصيل إيجارات متأخرة

معلومات العميل:
- الاسم: ${delinquentCustomer.customer_name}
- رقم العميل: ${delinquentCustomer.customer_code}
- رقم العقد: ${delinquentCustomer.contract_number}
- المركبة: ${delinquentCustomer.vehicle_plate || 'غير محدد'}
- الهاتف: ${delinquentCustomer.phone || 'غير محدد'}
- البريد: ${delinquentCustomer.email || 'غير محدد'}

تفاصيل المديونية:
- عدد الأشهر المتأخرة: ${delinquentCustomer.months_unpaid} شهر
- إجمالي الإيجارات المستحقة: ${delinquentCustomer.overdue_amount.toLocaleString('ar-KW')} د.ك
- غرامات التأخير: ${delinquentCustomer.late_penalty.toLocaleString('ar-KW')} د.ك
- المخالفات المرورية: ${delinquentCustomer.violations_amount.toLocaleString('ar-KW')} د.ك (${delinquentCustomer.violations_count} مخالفة)
- الإجمالي الكلي: ${delinquentCustomer.total_debt.toLocaleString('ar-KW')} د.ك

معلومات التأخير:
- عدد الأيام المتأخرة: ${delinquentCustomer.days_overdue} يوم
- درجة المخاطر: ${delinquentCustomer.risk_score} (${delinquentCustomer.risk_level})
- آخر دفعة: ${delinquentCustomer.last_payment_date ? new Date(delinquentCustomer.last_payment_date).toLocaleDateString('ar-KW') : 'لا يوجد'}
- مبلغ آخر دفعة: ${delinquentCustomer.last_payment_amount.toLocaleString('ar-KW')} د.ك

سجل قانوني:
- قضايا سابقة: ${delinquentCustomer.has_previous_legal_cases ? `نعم (${delinquentCustomer.previous_legal_cases_count} قضية)` : 'لا'}
- في القائمة السوداء: ${delinquentCustomer.is_blacklisted ? 'نعم' : 'لا'}

الإجراء الموصى به: ${delinquentCustomer.recommended_action.label}

${additionalNotes ? `\nملاحظات إضافية:\n${additionalNotes}` : ''}
      `.trim();

      // Create legal case
      const { data: legalCase, error: caseError } = await supabase
        .from('legal_cases')
        .insert({
          company_id: profile.company_id,
          case_number: caseNumber,
          case_title: `تحصيل إيجارات متأخرة من ${delinquentCustomer.customer_name}`,
          case_title_ar: `تحصيل إيجارات متأخرة من ${delinquentCustomer.customer_name}`,
          case_type: 'rental', // or 'civil'
          case_status: 'active',
          priority,
          client_id: delinquentCustomer.customer_id,
          client_name: delinquentCustomer.customer_name,
          client_phone: delinquentCustomer.phone,
          client_email: delinquentCustomer.email,
          description: autoDescription,
          case_value: delinquentCustomer.total_debt,
          legal_fees: delinquentCustomer.total_debt * 0.10, // 10% legal fees
          court_fees: delinquentCustomer.total_debt * 0.01, // 1% court fees
          other_expenses: 200, // Fixed amount
          total_costs: (delinquentCustomer.total_debt * 0.11) + 200,
          billing_status: 'pending',
          tags: ['تحصيل_ديون', 'عميل_متعثر', 'إيجارات_متأخرة'],
          notes: `تم الإنشاء تلقائياً من نظام تتبع العملاء المتأخرين\nدرجة المخاطر: ${delinquentCustomer.risk_score}\nأيام التأخير: ${delinquentCustomer.days_overdue}`,
          is_confidential: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (caseError) throw caseError;

      // Update contract status to "under_legal_procedure"
      if (delinquentCustomer.contract_id) {
        const { error: contractUpdateError } = await supabase
          .from('contracts')
          .update({ 
            status: 'under_legal_procedure',
            updated_at: new Date().toISOString()
          })
          .eq('id', delinquentCustomer.contract_id);

        if (contractUpdateError) {
          console.error('Error updating contract status:', contractUpdateError);
          // Don't throw - the legal case was created successfully
        }
      }

      // ===== إنشاء القيد المحاسبي لنقل الذمم للتحصيل القانوني =====
      try {
        // حساب نسبة المخصص بناءً على أيام التأخير
        let provisionRate = 0.25; // 25% افتراضي
        if (delinquentCustomer.days_overdue > 365) {
          provisionRate = 1.0; // 100%
        } else if (delinquentCustomer.days_overdue > 270) {
          provisionRate = 0.75; // 75%
        } else if (delinquentCustomer.days_overdue > 180) {
          provisionRate = 0.50; // 50%
        }
        
        const provisionAmount = delinquentCustomer.total_debt * provisionRate;
        const today = new Date().toISOString().split('T')[0];
        const journalNumber = `JV-LEGAL-${Date.now().toString().slice(-8)}`;

        // 1. إنشاء قيد نقل الذمم للتحصيل القانوني
        const { data: transferEntry, error: transferError } = await supabase
          .from('journal_entries')
          .insert({
            company_id: profile.company_id,
            journal_number: journalNumber,
            entry_date: today,
            description: `نقل ذمم للتحصيل القانوني - ${delinquentCustomer.customer_name} - عقد ${delinquentCustomer.contract_number}`,
            total_debit: delinquentCustomer.total_debt,
            total_credit: delinquentCustomer.total_debt,
            status: 'posted',
            source: 'legal',
            reference_type: 'legal_case',
            reference_id: legalCase.id,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (!transferError && transferEntry) {
          // سطور القيد: من ذمم التحصيل القانوني إلى ذمم العملاء
          await supabase.from('journal_entry_lines').insert([
            {
              entry_id: transferEntry.id,
              company_id: profile.company_id,
              account_code: '1203', // ذمم تحت التحصيل القانوني
              line_description: `نقل ذمم ${delinquentCustomer.customer_name} للتحصيل القانوني`,
              debit_amount: delinquentCustomer.total_debt,
              credit_amount: 0,
              line_number: 1,
            },
            {
              entry_id: transferEntry.id,
              company_id: profile.company_id,
              account_code: '1200', // ذمم العملاء
              line_description: `نقل ذمم ${delinquentCustomer.customer_name} للتحصيل القانوني`,
              debit_amount: 0,
              credit_amount: delinquentCustomer.total_debt,
              line_number: 2,
            },
          ]);
        }

        // 2. إنشاء قيد المخصص
        const provisionJournalNumber = `JV-PROV-${Date.now().toString().slice(-8)}`;
        const { data: provisionEntry, error: provisionError } = await supabase
          .from('journal_entries')
          .insert({
            company_id: profile.company_id,
            journal_number: provisionJournalNumber,
            entry_date: today,
            description: `مخصص ديون مشكوك فيها (${Math.round(provisionRate * 100)}%) - ${delinquentCustomer.customer_name}`,
            total_debit: provisionAmount,
            total_credit: provisionAmount,
            status: 'posted',
            source: 'legal',
            reference_type: 'legal_case',
            reference_id: legalCase.id,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (!provisionError && provisionEntry) {
          await supabase.from('journal_entry_lines').insert([
            {
              entry_id: provisionEntry.id,
              company_id: profile.company_id,
              account_code: '5401', // مصروف الديون المشكوك فيها
              line_description: `مخصص ديون ${delinquentCustomer.customer_name} (${Math.round(provisionRate * 100)}%)`,
              debit_amount: provisionAmount,
              credit_amount: 0,
              line_number: 1,
            },
            {
              entry_id: provisionEntry.id,
              company_id: profile.company_id,
              account_code: '1204', // مخصص الديون المشكوك فيها
              line_description: `مخصص ديون ${delinquentCustomer.customer_name} (${Math.round(provisionRate * 100)}%)`,
              debit_amount: 0,
              credit_amount: provisionAmount,
              line_number: 2,
            },
          ]);
        }

        console.log('✅ تم إنشاء القيود المحاسبية بنجاح');
      } catch (journalError) {
        console.error('⚠️ خطأ في إنشاء القيود المحاسبية:', journalError);
        // لا نوقف العملية - القضية تم إنشاؤها بنجاح
      }
      
      // Create activity log for the legal case
      await supabase
        .from('legal_case_activities')
        .insert({
          case_id: legalCase.id,
          company_id: profile.company_id,
          activity_type: 'case_created',
          activity_title: 'تم إنشاء القضية من نظام العملاء المتأخرين',
          activity_description: `تم إنشاء القضية تلقائياً للعميل: ${delinquentCustomer.customer_name}\nالمبلغ الإجمالي: ${delinquentCustomer.total_debt.toLocaleString('ar-KW')} د.ك`,
          created_by: user.id,
        });

      return legalCase;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['delinquency-stats'] });
      
      toast.success('تم إنشاء القضية القانونية بنجاح', {
        description: `رقم القضية: ${data.case_number}`,
        duration: 5000,
      });
    },
    onError: (error) => {
      console.error('Error converting to legal case:', error);
      toast.error('حدث خطأ أثناء إنشاء القضية القانونية', {
        description: 'يرجى المحاولة مرة أخرى',
      });
    },
  });
};

// Hook for batch conversion (multiple customers at once)
export const useBulkConvertToLegalCase = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (delinquentCustomers: DelinquentCustomer[]) => {
      if (!user?.id) throw new Error('User not authenticated');

      const results = [];
      const errors = [];

      for (const customer of delinquentCustomers) {
        try {
          const convertHook = useConvertToLegalCase();
          const result = await convertHook.mutateAsync({
            delinquentCustomer: customer,
          });
          results.push(result);
        } catch (error) {
          errors.push({ customer: customer.customer_name, error });
        }
      }

      return { results, errors };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      queryClient.invalidateQueries({ queryKey: ['delinquency-stats'] });

      toast.success(`تم إنشاء ${data.results.length} قضية قانونية بنجاح`, {
        description: data.errors.length > 0 ? `فشل إنشاء ${data.errors.length} قضية` : undefined,
        duration: 5000,
      });
    },
    onError: (error) => {
      console.error('Error in bulk conversion:', error);
      toast.error('حدث خطأ أثناء العملية الجماعية');
    },
  });
};
