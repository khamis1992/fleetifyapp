import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

interface LateFineSettings {
  id?: string;
  company_id: string;
  fine_type: 'percentage' | 'fixed_amount';
  fine_rate: number; // نسبة أو مبلغ ثابت
  grace_period_days: number; // فترة السماح قبل تطبيق الغرامة
  max_fine_amount?: number; // الحد الأقصى للغرامة
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ContractFineCalculation {
  contract_id: string;
  days_overdue: number;
  fine_amount: number;
  total_amount_due: number;
}

// hook لجلب إعدادات الغرامات
export const useLateFineSettings = () => {
  const { user, companyFilter } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: ['late-fine-settings', companyFilter?.company_id],
    queryFn: async () => {
      if (!companyFilter?.company_id) throw new Error('Company ID not found');
      
      // استخدام RPC function للوصول للبيانات
      const { data, error } = await supabase.rpc('get_late_fine_settings', {
        p_company_id: companyFilter.company_id
      });
      
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!user?.id && !!companyFilter?.company_id,
  });
};

// hook لحفظ أو تحديث إعدادات الغرامات
export const useUpdateLateFineSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyFilter } = useUnifiedCompanyAccess();
  
  return useMutation({
    mutationFn: async (settings: Omit<LateFineSettings, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!companyFilter?.company_id) throw new Error('Company ID not found');
      
      const { data, error } = await supabase.rpc('upsert_late_fine_settings', {
        p_company_id: companyFilter.company_id,
        p_fine_type: settings.fine_type,
        p_fine_rate: settings.fine_rate,
        p_grace_period_days: settings.grace_period_days,
        p_max_fine_amount: settings.max_fine_amount,
        p_is_active: settings.is_active
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "تم حفظ الإعدادات",
        description: "تم تحديث إعدادات الغرامات المتأخرة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['late-fine-settings'] });
    },
    onError: (error) => {
      toast({
        title: "خطأ في حفظ الإعدادات",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// دالة حساب الغرامة
export const calculateLateFine = (
  contractAmount: number,
  endDate: string,
  settings: LateFineSettings | null
): ContractFineCalculation | null => {
  if (!settings || !settings.is_active) return null;
  
  const today = new Date();
  const contractEndDate = new Date(endDate);
  const timeDiff = today.getTime() - contractEndDate.getTime();
  const daysOverdue = Math.floor(timeDiff / (1000 * 3600 * 24));
  
  // التحقق من فترة السماح
  if (daysOverdue <= settings.grace_period_days) {
    return {
      contract_id: '',
      days_overdue: Math.max(0, daysOverdue),
      fine_amount: 0,
      total_amount_due: contractAmount,
    };
  }
  
  const actualOverdueDays = daysOverdue - settings.grace_period_days;
  let fineAmount = 0;
  
  if (settings.fine_type === 'percentage') {
    // حساب الغرامة كنسبة من المبلغ الأساسي
    fineAmount = (contractAmount * settings.fine_rate / 100) * actualOverdueDays;
  } else {
    // حساب الغرامة كمبلغ ثابت يومي
    fineAmount = settings.fine_rate * actualOverdueDays;
  }
  
  // تطبيق الحد الأقصى للغرامة إذا كان محدداً
  if (settings.max_fine_amount && fineAmount > settings.max_fine_amount) {
    fineAmount = settings.max_fine_amount;
  }
  
  return {
    contract_id: '',
    days_overdue: daysOverdue,
    fine_amount: Math.round(fineAmount * 1000) / 1000, // تقريب إلى 3 منازل عشرية
    total_amount_due: contractAmount + fineAmount,
  };
};

// hook لحساب الغرامات لجميع العقود المتأخرة
export const useCalculateLateFines = () => {
  const { toast } = useToast();
  const { companyFilter } = useUnifiedCompanyAccess();
  
  return useMutation({
    mutationFn: async () => {
      if (!companyFilter?.company_id) throw new Error('Company ID not found');
      
      // استدعاء Edge Function لحساب وتحديث الغرامات
      const { data, error } = await supabase.functions.invoke('calculate-late-fines', {
        body: { company_id: companyFilter.company_id }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "تم حساب الغرامات",
        description: `تم تحديث ${data.updated_contracts} عقد بالغرامات المتأخرة`,
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في حساب الغرامات",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};