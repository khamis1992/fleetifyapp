import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCanonicalRentalArrears } from '@/hooks/useCanonicalRentalArrears';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { fetchRentalArrears, type VerifiedRentalArrears } from '@/services/rentalArrears';
import { contractBusinessDate } from '@/utils/contractScheduleSettlement';
import { convertSelectedContractsToLegal } from '@/services/batchContractLegalConversion';
import { refreshLegalConversionQueries } from '@/utils/legalConversionQueries';

export type LatePaymentCustomer = VerifiedRentalArrears;
export const useLatePaymentCustomers = useCanonicalRentalArrears;

/**
 * Hook to automatically create legal cases for customers with 30+ days overdue
 */
export const useAutoCreateLegalCases = () => {
  const { user } = useAuth();
  const {companyId,isInitializing}=useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: async (customers: LatePaymentCustomer[]) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      if(isInitializing||!companyId) throw new Error('تعذر التحقق من الشركة');
      const current=await fetchRentalArrears(companyId,contractBusinessDate());
      const verifiedById=new Map(current.verified.map(row=>[row.contract_id,row]));
      const failed:Array<{contractId:string;message:string}>=[];
      const eligible:VerifiedRentalArrears[]=[];
      for(const selected of customers) {
        const fresh=verifiedById.get(selected.contract_id);
        if(!fresh||fresh.customer_id!==selected.customer_id||fresh.days_overdue<30) {
          failed.push({contractId:selected.contract_id,message:'تغيرت المتأخرات أو تحتاج مطابقة؛ لم يبدأ التحويل لهذا العقد.'});
        } else eligible.push(fresh);
      }
      if(eligible.length===0) return {converted:[],failed,ineligible:0};
      const result=await convertSelectedContractsToLegal(companyId,user.id,eligible);
      return {...result,failed:[...failed,...result.failed]};
    },
    onSuccess: (result) => {
      if (result.converted.length > 0) {
        toast.success(`تم تأكيد تحويل ${result.converted.length} عقد عبر المسار القانوني`);
      }
      if (result.failed.length > 0) toast.error(`تعذر تأكيد تحويل ${result.failed.length} عقد؛ راجع التفاصيل قبل إعادة المحاولة.`);
    },
    onSettled: async () => {
      if (!await refreshLegalConversionQueries(queryClient)) toast.error('تعذر تحديث بعض البيانات؛ تحقق من حالة العقود دون إعادة التحويل.');
    },
    onError: (error: unknown) => {
      console.error('Error auto-creating legal cases:', error);
      toast.error('حدث خطأ أثناء إنشاء القضايا التلقائية');
    },
  });
};

/**
 * Hook to remove customer from legal cases when they pay
 */
export const useRemoveFromLegalCases = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      // Find active rental cases for this customer
      const { data: cases, error: casesError } = await supabase
        .from('legal_cases')
        .select('id, case_number')
        .eq('company_id', profile.company_id)
        .eq('client_id', customerId)
        .eq('case_type', 'rental')
        .eq('case_status', 'active');

      if (casesError) throw casesError;

      if (!cases || cases.length === 0) {
        return { closed: 0 };
      }

      // Close all active rental cases for this customer
      const caseIds = cases.map(c => c.id);
      const { error: updateError } = await supabase
        .from('legal_cases')
        .update({
          case_status: 'closed',
          notes: `تم إغلاق القضية تلقائياً بسبب سداد المبلغ المستحق`,
        })
        .in('id', caseIds);

      if (updateError) throw updateError;

      // Create activity logs
      for (const legalCase of cases) {
        await supabase
          .from('legal_case_activities')
          .insert({
            case_id: legalCase.id,
            company_id: profile.company_id,
            activity_type: 'case_closed',
            activity_title: 'تم إغلاق القضية تلقائياً',
            activity_description: `تم إغلاق القضية ${legalCase.case_number} تلقائياً بسبب سداد المبلغ المستحق`,
            created_by: user.id,
          });
      }

      return { closed: cases.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      
      if (result.closed > 0) {
        toast.success(`تم إغلاق ${result.closed} قضية تلقائياً بعد السداد`);
      }
    },
    onError: (error: unknown) => {
      console.error('Error closing legal cases:', error);
      toast.error('حدث خطأ أثناء إغلاق القضايا');
    },
  });
};

