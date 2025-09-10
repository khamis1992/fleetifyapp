import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { BusinessType, ModuleName, ModuleSettings, ModuleContext } from '@/types/modules';
import { MODULE_REGISTRY, BUSINESS_TYPE_MODULES } from '@/modules/moduleRegistry';

// Hook لجلب تكوين الوحدات للشركة الحالية
export const useModuleConfig = () => {
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();
  
  console.log('🔧 [MODULE_CONFIG] Company ID:', companyId, 'User company:', user?.company?.id, 'Is Browse Mode:', companyId !== user?.company?.id);

  // جلب بيانات الشركة
  const { data: company } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('id, business_type, active_modules, industry_config, custom_branding')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      console.log('🔧 [MODULE_CONFIG] Company data fetched:', data);
      return data;
    },
    enabled: !!companyId
  });

  // جلب إعدادات الوحدات
  const { data: moduleSettings } = useQuery({
    queryKey: ['module-settings', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('module_settings')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_enabled', true);

      if (error) throw error;
      return data as ModuleSettings[];
    },
    enabled: !!companyId
  });

  // تحويل إعدادات الوحدات إلى كائن
  const moduleSettingsMap = moduleSettings?.reduce((acc, setting) => {
    acc[setting.module_name] = setting;
    return acc;
  }, {} as Record<ModuleName, ModuleSettings>) || {};

  // الحصول على الوحدات المتاحة حسب نوع النشاط
  const availableModules = company?.business_type 
    ? BUSINESS_TYPE_MODULES[company.business_type as BusinessType].map(moduleName => MODULE_REGISTRY[moduleName])
    : [];

  // الوحدات النشطة
  const activeModules = (company?.active_modules || []) as ModuleName[];

  // الوحدات المفعلة فعلياً (النشطة + لها إعدادات مفعلة)
  const enabledModules = activeModules.filter(moduleName => 
    moduleSettingsMap[moduleName]?.is_enabled !== false
  );

  const moduleContext: ModuleContext = {
    businessType: company?.business_type as BusinessType || 'car_rental',
    activeModules: enabledModules,
    moduleSettings: moduleSettingsMap as Record<ModuleName, ModuleSettings>,
    availableModules
  };

  return {
    company,
    moduleContext,
    isLoading: !company || !moduleSettings,
    // وظائف مساعدة
    isModuleEnabled: (moduleName: ModuleName) => enabledModules.includes(moduleName),
    getModuleConfig: (moduleName: ModuleName) => MODULE_REGISTRY[moduleName],
    getModuleSettings: (moduleName: ModuleName) => moduleSettingsMap[moduleName]
  };
};

// Hook للحصول على الوحدات المفعلة فقط
export const useEnabledModules = () => {
  const { moduleContext, isLoading } = useModuleConfig();
  
  return {
    enabledModules: moduleContext.activeModules,
    availableModules: moduleContext.availableModules.filter(module => 
      moduleContext.activeModules.includes(module.name)
    ),
    isLoading
  };
};

// Hook للتحقق من صلاحية الوصول لوحدة معينة
export const useModuleAccess = (moduleName: ModuleName) => {
  const { isModuleEnabled, isLoading } = useModuleConfig();
  
  return {
    hasAccess: !isLoading && isModuleEnabled(moduleName),
    isLoading
  };
};