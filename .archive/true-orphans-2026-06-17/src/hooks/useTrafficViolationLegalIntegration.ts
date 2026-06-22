import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Hook to automatically create legal case for traffic violations
 */
export const useCreateLegalCaseFromViolation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (violationId: string) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      // Get violation details
      const { data: violation, error: violationError } = await supabase
        .from('traffic_violations')
        .select(`
          *,
          vehicles (
            id,
            plate_number,
            make,
            model
          ),
          customers (
            id,
            full_name,
            phone,
            email
          )
        `)
        .eq('id', violationId)
        .single();

      if (violationError) throw violationError;
      if (!violation) throw new Error('لم يتم العثور على المخالفة');

      // Check if legal case already exists for this violation
      const { data: existingCase } = await supabase
        .from('legal_cases')
        .select('id')
        .eq('company_id', profile.company_id)
        .eq('case_type', 'traffic')
        .contains('tags', ['مخالفة مرورية', violation.violation_number])
        .single();

      if (existingCase) {
        throw new Error('يوجد قضية قانونية مسجلة بالفعل لهذه المخالفة');
      }

      // Generate case number
      const { data: caseNumber, error: numberError } = await supabase
        .rpc('generate_legal_case_number', { company_id_param: profile.company_id });

      if (numberError) throw numberError;

      // Determine client info based on who is responsible
      let clientId = null;
      let clientName = 'الشركة';
      let clientPhone = null;
      let clientEmail = null;

      if (violation.responsible_party === 'customer' && violation.customer_id) {
        clientId = violation.customer_id;
        clientName = (violation.customers as any)?.full_name || 'غير معروف';
        clientPhone = (violation.customers as any)?.phone;
        clientEmail = (violation.customers as any)?.email;
      }

      // Create legal case
      const { data: legalCase, error: caseError } = await supabase
        .from('legal_cases')
        .insert({
          company_id: profile.company_id,
          case_number: caseNumber,
          case_title: `Traffic Violation - ${violation.violation_type}`,
          case_title_ar: `مخالفة مرورية - ${violation.violation_type}`,
          case_type: 'traffic',
          case_status: 'active',
          priority: violation.fine_amount >= 1000 ? 'high' : 'medium',
          client_id: clientId,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail,
          description: `مخالفة مرورية رقم ${violation.violation_number} للمركبة ${(violation.vehicles as any)?.plate_number}. المسؤول: ${violation.responsible_party === 'company' ? 'الشركة' : 'العميل'}`,
          case_value: violation.fine_amount,
          police_station: violation.location,
          police_report_number: violation.violation_number,
          legal_fees: 0,
          court_fees: 0,
          other_expenses: 0,
          total_costs: 0,
          billing_status: 'pending',
          tags: ['مخالفة مرورية', violation.violation_number, violation.violation_type],
          legal_team: [],
          is_confidential: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (caseError) throw caseError;

      // Create activity log
      await supabase
        .from('legal_case_activities')
        .insert({
          case_id: legalCase.id,
          company_id: profile.company_id,
          activity_type: 'case_created',
          activity_title: 'تم إنشاء قضية من مخالفة مرورية',
          activity_description: `تم إنشاء القضية ${legalCase.case_number} من المخالفة المرورية ${violation.violation_number}`,
          created_by: user.id,
        });

      return legalCase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      toast.success('تم إنشاء قضية قانونية من المخالفة المرورية');
    },
    onError: (error: unknown) => {
      console.error('Error creating legal case from violation:', error);
      toast.error(error.message || 'حدث خطأ أثناء إنشاء القضية');
    },
  });
};

/**
 * Hook to close legal case when traffic violation is paid
 */
export const useCloseLegalCaseFromViolation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (violationNumber: string) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      // Find active traffic case for this violation
      const { data: cases, error: casesError } = await supabase
        .from('legal_cases')
        .select('id, case_number')
        .eq('company_id', profile.company_id)
        .eq('case_type', 'traffic')
        .eq('case_status', 'active')
        .contains('tags', [violationNumber]);

      if (casesError) throw casesError;

      if (!cases || cases.length === 0) {
        return { closed: 0 };
      }

      // Close all matching cases
      const caseIds = cases.map(c => c.id);
      const { error: updateError } = await supabase
        .from('legal_cases')
        .update({
          case_status: 'closed',
          notes: `تم إغلاق القضية تلقائياً بسبب سداد المخالفة المرورية ${violationNumber}`,
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
            activity_description: `تم إغلاق القضية ${legalCase.case_number} تلقائياً بسبب سداد المخالفة المرورية`,
            created_by: user.id,
          });
      }

      return { closed: cases.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      
      if (result.closed > 0) {
        toast.success(`تم إغلاق ${result.closed} قضية تلقائياً بعد سداد المخالفة`);
      }
    },
    onError: (error: unknown) => {
      console.error('Error closing legal case from violation:', error);
      toast.error('حدث خطأ أثناء إغلاق القضية');
    },
  });
};

