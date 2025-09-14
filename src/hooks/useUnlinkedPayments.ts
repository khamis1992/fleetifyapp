import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUnlinkedPayments = () => {
  return useQuery({
    queryKey: ['unlinked-payments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('المستخدم غير مسجل الدخول');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('لم يتم العثور على بيانات الشركة');
      }

      // Get payments that are not linked to contracts
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          payment_number,
          payment_date,
          amount,
          agreement_number,
          reference_number,
          payment_method,
          payment_status,
          created_at
        `)
        .eq('company_id', profile.company_id)
        .is('contract_id', null)
        .order('payment_date', { ascending: false });

      if (error) {
        throw new Error(`خطأ في جلب المدفوعات غير المربوطة: ${error.message}`);
      }

      return data || [];
    },
    enabled: true,
  });
};