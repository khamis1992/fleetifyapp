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
  
  const isBrowsingMode = companyId !== user?.company?.id;
  console.log('🔧 [MODULE_CONFIG] Company ID:', companyId, 'User company:', user?.company?.id, 'Is Browse Mode:', isBrowsingMode);

  // جلب بيانات الشركة
  const { data: company, refetch: refetchCompany } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      console.log('🔧 [MODULE_CONFIG] Fetching company data for:', companyId);
      const { data, error } = await supabase
        .from('companies')
        .select('id, business_type, active_modules, industry_config, custom_branding')
        .eq('id', companyId)
        .single();

      if (error) {
        console.error('🔧 [MODULE_CONFIG] Error fetching company:', error);
        throw error;
      }
      console.log('🔧 [MODULE_CONFIG] Company data fetched:', data);
      return data;
    },
    enabled: !!companyId,
    staleTime: isBrowsingMode ? 0 : 5 * 60 * 1000, // No caching in browse mode
    refetchOnWindowFocus: isBrowsingMode
  });

  // جلب إعدادات الوحدات
  const { data: moduleSettings, refetch: refetchModuleSettings } = useQuery({
    queryKey: ['module-settings', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      console.log('🔧 [MODULE_CONFIG] Fetching module settings for:', companyId);
      const { data, error } = await supabase
        .from('module_settings')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_enabled', true);

      if (error) {
        console.error('🔧 [MODULE_CONFIG] Error fetching module settings:', error);
        throw error;
      }
      console.log('🔧 [MODULE_CONFIG] Module settings fetched:', data);
      return data as ModuleSettings[];
    },
    enabled: !!companyId,
    staleTime: isBrowsingMode ? 0 : 5 * 60 * 1000, // No caching in browse mode
    refetchOnWindowFocus: isBrowsingMode
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

  // الوحدات النشطة من جدول الشركات
  const companyActiveModules = (company?.active_modules || []) as ModuleName[];

  // الوحدات المفعلة فعلياً - إذا لم توجد إعدادات، نستخدم active_modules من الشركة
  const enabledModules = moduleSettings && moduleSettings.length > 0 
    ? companyActiveModules.filter(moduleName => 
        moduleSettingsMap[moduleName]?.is_enabled !== false
      )
    : companyActiveModules; // fallback to company active_modules if no settings exist

  console.log('🔧 [MODULE_CONFIG] =================================');
  console.log('🔧 [MODULE_CONFIG] Company ID:', company?.id);
  console.log('🔧 [MODULE_CONFIG] Business Type:', company?.business_type);
  console.log('🔧 [MODULE_CONFIG] Company Active Modules:', companyActiveModules);
  console.log('🔧 [MODULE_CONFIG] Module Settings Count:', moduleSettings?.length || 0);
  console.log('🔧 [MODULE_CONFIG] Module Settings:', moduleSettings?.map(s => ({ module: s.module_name, enabled: s.is_enabled })));
  console.log('🔧 [MODULE_CONFIG] Final Enabled Modules:', enabledModules);
  console.log('🔧 [MODULE_CONFIG] Is Browse Mode:', isBrowsingMode);
  console.log('🔧 [MODULE_CONFIG] ================================= END');

  const moduleContext: ModuleContext = {
    businessType: company?.business_type as BusinessType,
    activeModules: enabledModules,
    moduleSettings: moduleSettingsMap as Record<ModuleName, ModuleSettings>,
    availableModules
  };

  // تحسين منطق التحميل - نعتبر البيانات محملة فقط عندما تكون بيانات الشركة موجودة ومعرفة
  const isDataLoaded = !!company && !!moduleSettings && !!company.business_type;

  return {
    company,
    moduleContext,
    isLoading: !isDataLoaded,
    // وظائف مساعدة
    isModuleEnabled: (moduleName: ModuleName) => enabledModules.includes(moduleName),
    getModuleConfig: (moduleName: ModuleName) => MODULE_REGISTRY[moduleName],
    getModuleSettings: (moduleName: ModuleName) => moduleSettingsMap[moduleName],
    // Refresh functions for Browse Mode
    refreshData: () => {
      console.log('🔧 [MODULE_CONFIG] Refreshing data...');
      refetchCompany();
      refetchModuleSettings();
    }
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