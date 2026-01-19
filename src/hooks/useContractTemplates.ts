/**
 * Contract Templates Hook
 * 
 * Manages contract templates for quick contract creation
 * 
 * Features:
 * - Preset templates (Weekend Special, Monthly Corporate, Long-term)
 * - Custom user templates
 * - One-click apply
 * - Template CRUD operations
 * - Company-scoped templates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCurrentCompanyId } from './useUnifiedCompanyAccess';

export interface ContractTemplate {
  id: string;
  company_id: string;
  template_name: string;
  template_type: 'preset' | 'custom';
  contract_type: 'rent_to_own' | 'daily_rental' | 'weekly_rental' | 'monthly_rental' | 'yearly_rental';
  rental_days: number;
  description?: string;
  terms?: string;
  is_active: boolean;
  preset_config?: {
    discountPercentage?: number;
    minDays?: number;
    maxDays?: number;
    features?: string[];
  };
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractTemplateData {
  template_name: string;
  contract_type: 'rent_to_own' | 'daily_rental' | 'weekly_rental' | 'monthly_rental' | 'yearly_rental';
  rental_days: number;
  description?: string;
  terms?: string;
  preset_config?: {
    discountPercentage?: number;
    minDays?: number;
    maxDays?: number;
    features?: string[];
  };
}

/**
 * Preset templates configuration
 */
export const PRESET_TEMPLATES: Omit<ContractTemplate, 'id' | 'company_id' | 'created_by' | 'created_at' | 'updated_at'>[] = [
  {
    template_name: 'عرض نهاية الأسبوع',
    template_type: 'preset',
    contract_type: 'daily_rental',
    rental_days: 3,
    description: 'عرض خاص لنهاية الأسبوع (الخميس-السبت) مع خصم 10%',
    terms: `شروط عرض نهاية الأسبوع:
- الفترة: 3 أيام (الخميس-السبت)
- خصم 10% على السعر اليومي
- التأمين الشامل مشمول
- كيلومترات غير محدودة
- إمكانية التمديد بنفس السعر
- لا يوجد رسوم تسليم متأخر لليوم الأول`,
    is_active: true,
    preset_config: {
      discountPercentage: 10,
      minDays: 3,
      maxDays: 3,
      features: ['weekend_special', 'insurance_included', 'unlimited_km', 'flexible_extension']
    }
  },
  {
    template_name: 'شهري للشركات',
    template_type: 'preset',
    contract_type: 'monthly_rental',
    rental_days: 30,
    description: 'عقد شهري مخصص للشركات مع مزايا إضافية وخصم 15%',
    terms: `شروط العقد الشهري للشركات:
- المدة: 30 يوم
- خصم 15% على السعر الشهري
- صيانة دورية مجانية
- استبدال المركبة في حالة العطل
- خدمة عملاء مخصصة 24/7
- فاتورة شهرية موحدة
- إمكانية إضافة سائقين متعددين
- تقارير استخدام شهرية`,
    is_active: true,
    preset_config: {
      discountPercentage: 15,
      minDays: 30,
      maxDays: 30,
      features: ['corporate', 'maintenance_included', 'vehicle_replacement', 'priority_support', 'multi_driver', 'monthly_reports']
    }
  },
  {
    template_name: 'طويل الأمد (6 أشهر+)',
    template_type: 'preset',
    contract_type: 'yearly_rental',
    rental_days: 180,
    description: 'عقد طويل الأمد لمدة 6 أشهر أو أكثر مع خصم 25% ومزايا شاملة',
    terms: `شروط العقد طويل الأمد:
- المدة: 180 يوم كحد أدنى (6 أشهر)
- خصم 25% على السعر السنوي
- تأمين شامل مجاني
- صيانة دورية شاملة مجانية
- استبدال المركبة مجاناً
- خدمة غسيل شهرية مجانية
- إطارات جديدة بعد 6 أشهر
- تجديد تلقائي بنفس الشروط
- إلغاء مرن بإشعار 30 يوم`,
    is_active: true,
    preset_config: {
      discountPercentage: 25,
      minDays: 180,
      maxDays: 365,
      features: ['long_term', 'insurance_included', 'full_maintenance', 'vehicle_replacement', 'car_wash', 'new_tires', 'auto_renew', 'flexible_cancel']
    }
  }
];

/**
 * Hook to fetch contract templates
 */
export const useContractTemplates = () => {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['contract-templates', companyId],
    queryFn: async ({ signal }) => {
      if (!companyId) return [];

      // Fetch custom templates
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (error) {
        console.error('Error fetching contract templates:', error);
        throw error;
      }

      // Merge preset templates with custom templates
      const presetTemplates = PRESET_TEMPLATES.map((preset, index) => ({
        ...preset,
        id: `preset-${index}`,
        company_id: companyId,
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      return [...presetTemplates, ...(data || [])];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to create custom contract template
 */
export const useCreateContractTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = useCurrentCompanyId();

  return useMutation({
    mutationFn: async (templateData: ContractTemplateData) => {
      if (!companyId || !user?.id) {
        throw new Error('Company ID or user ID not available');
      }

      const { data, error } = await supabase
        .from('contract_templates')
        .insert([{
          ...templateData,
          company_id: companyId,
          template_type: 'custom',
          is_active: true,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success('تم حفظ القالب بنجاح');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error('فشل في حفظ القالب');
    },
  });
};

/**
 * Hook to update contract template
 */
export const useUpdateContractTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      templateId, 
      data 
    }: { 
      templateId: string; 
      data: Partial<ContractTemplateData> 
    }) => {
      // Prevent updating preset templates
      if (templateId.startsWith('preset-')) {
        throw new Error('Cannot update preset templates');
      }

      const { data: updated, error } = await supabase
        .from('contract_templates')
        .update(data)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success('تم تحديث القالب بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating template:', error);
      if (error.message.includes('preset')) {
        toast.error('لا يمكن تعديل القوالب المحددة مسبقاً');
      } else {
        toast.error('فشل في تحديث القالب');
      }
    },
  });
};

/**
 * Hook to delete contract template
 */
export const useDeleteContractTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      // Prevent deleting preset templates
      if (templateId.startsWith('preset-')) {
        throw new Error('Cannot delete preset templates');
      }

      // Soft delete - set is_active to false
      const { error } = await supabase
        .from('contract_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success('تم حذف القالب بنجاح');
    },
    onError: (error: any) => {
      console.error('Error deleting template:', error);
      if (error.message.includes('preset')) {
        toast.error('لا يمكن حذف القوالب المحددة مسبقاً');
      } else {
        toast.error('فشل في حذف القالب');
      }
    },
  });
};

/**
 * Utility: Apply template to contract data
 */
export const applyTemplateToContract = (
  template: ContractTemplate,
  baseData: Partial<any> = {}
) => {
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = new Date(today.setDate(today.getDate() + template.rental_days))
    .toISOString()
    .slice(0, 10);

  return {
    ...baseData,
    contract_type: template.contract_type,
    rental_days: template.rental_days,
    start_date: startDate,
    end_date: endDate,
    description: template.description || baseData.description || '',
    terms: template.terms || baseData.terms || '',
    // Preserve existing customer_id and vehicle_id
    customer_id: baseData.customer_id || '',
    vehicle_id: baseData.vehicle_id || '',
  };
};

/**
 * Utility: Calculate discount from template
 */
export const calculateTemplateDiscount = (
  baseAmount: number,
  template: ContractTemplate
): number => {
  if (!template.preset_config?.discountPercentage) return baseAmount;
  
  const discount = (baseAmount * template.preset_config.discountPercentage) / 100;
  return baseAmount - discount;
};

/**
 * Utility: Check if template is applicable for rental days
 */
export const isTemplateApplicable = (
  template: ContractTemplate,
  rentalDays: number
): boolean => {
  const { minDays, maxDays } = template.preset_config || {};
  
  if (minDays && rentalDays < minDays) return false;
  if (maxDays && rentalDays > maxDays) return false;
  
  return true;
};


/**
 * Hook to get template by contract type
 */
export const useTemplateByType = (contractType: string) => {
  const { data: templates } = useContractTemplates();
  
  if (!templates || !contractType) return null;
  
  // Find template matching the contract type
  const template = templates.find(t => t.contract_type === contractType);
  
  return template || null;
};

/**
 * Hook to apply template to contract data
 */
export const useApplyTemplate = () => {
  return {
    applyTemplate: (template: ContractTemplate, baseData: Partial<any> = {}) => {
      return applyTemplateToContract(template, baseData);
    }
  };
};

/**
 * Utility: Get default duration by contract type
 */
export const getDefaultDurationByType = (contractType: string): number => {
  switch (contractType) {
    case 'daily_rental':
      return 1;
    case 'weekly_rental':
      return 7;
    case 'monthly_rental':
      return 30;
    case 'yearly_rental':
      return 365;
    case 'rent_to_own':
      return 365;
    default:
      return 1;
  }
};

