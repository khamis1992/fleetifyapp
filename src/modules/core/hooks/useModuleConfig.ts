import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { BusinessType, ModuleName, ModuleSettings, ModuleContext } from '@/types/modules';
import { MODULE_REGISTRY, BUSINESS_TYPE_MODULES } from '@/modules/moduleRegistry';
import { useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { logQueryStatus, logError } from '@/utils/pageLoadDiagnostics';

/**
 * Hook for fetching module configuration for the current company
 * FIXED: React error #310 - Added useMemo/useCallback to prevent infinite re-renders
 */

// Hook لجلب تكوين الوحدات للشركة الحالية
export const useModuleConfig = () => {
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  
  // Calculate browse mode using stable values
  const userCompanyId = user?.company?.id;
  const isBrowsingMode = companyId !== userCompanyId;
  
  // Force invalidate queries when switching companies in browse mode
  useEffect(() => {
    if (isBrowsingMode && companyId) {
      logger.info('🔄 [MODULE_CONFIG] Browse mode detected - invalidating all queries for company:', companyId);
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['module-settings'] });
    }
  }, [companyId, isBrowsingMode, queryClient]);
  
  logger.debug('🔧 [MODULE_CONFIG] Company ID:', companyId, 'User company:', user?.company?.id, 'Is Browse Mode:', isBrowsingMode);

  // جلب بيانات الشركة
  const { data: company, refetch: refetchCompany, isLoading: isCompanyLoading, error: companyError, status: companyStatus } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      logger.debug('🔧 [MODULE_CONFIG] Fetching company data for:', companyId);
      logQueryStatus('/dashboard', ['company', companyId], 'fetching');
      
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, business_type, active_modules, industry_config, custom_branding')
        .eq('id', companyId)
        .single();

      if (error) {
        logger.error('🔧 [MODULE_CONFIG] Error fetching company:', error);
        logQueryStatus('/dashboard', ['company', companyId], 'error', null, error);
        logError('/dashboard', error, 'company_query');
        throw error;
      }
      
      logger.debug('🔧 [MODULE_CONFIG] Company data fetched:', data);
      logQueryStatus('/dashboard', ['company', companyId], 'success', data);
      return data;
    },
    enabled: !!companyId,
    staleTime: isBrowsingMode ? 30 * 1000 : 5 * 60 * 1000, // 30s cache in browse mode
    refetchOnWindowFocus: false, // Disable automatic refetch on focus
    refetchOnMount: false, // Don't always refetch on mount
    gcTime: isBrowsingMode ? 2 * 60 * 1000 : 5 * 60 * 1000, // 2min garbage collection in browse mode
    retry: 2 // Limit retries
  });

  // جلب إعدادات الوحدات
  const { data: moduleSettings, refetch: refetchModuleSettings } = useQuery({
    queryKey: ['module-settings', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      logger.debug('🔧 [MODULE_CONFIG] Fetching module settings for:', companyId);
      const { data, error } = await supabase
        .from('module_settings')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_enabled', true);

      if (error) {
        logger.error('🔧 [MODULE_CONFIG] Error fetching module settings:', error);
        throw error;
      }
      logger.debug('🔧 [MODULE_CONFIG] Module settings fetched:', data);
      return data as ModuleSettings[];
    },
    enabled: !!companyId,
    staleTime: isBrowsingMode ? 30 * 1000 : 5 * 60 * 1000, // 30s cache in browse mode
    refetchOnWindowFocus: false, // Disable automatic refetch on focus
    refetchOnMount: false, // Don't always refetch on mount
    gcTime: isBrowsingMode ? 2 * 60 * 1000 : 5 * 60 * 1000, // 2min garbage collection in browse mode
    retry: 2 // Limit retries
  });

  // تحويل إعدادات الوحدات إلى كائن - use useMemo to prevent infinite re-renders
  const moduleSettingsMap = useMemo<Record<ModuleName, ModuleSettings>>(() => {
    return moduleSettings?.reduce((acc, setting) => {
      acc[setting.module_name] = setting;
      return acc;
    }, {} as Record<ModuleName, ModuleSettings>) || {} as Record<ModuleName, ModuleSettings>;
  }, [moduleSettings]);

  // الحصول على الوحدات المتاحة حسب نوع النشاط - use useMemo to prevent infinite re-renders
  const availableModules = useMemo(() => {
    return company?.business_type 
      ? BUSINESS_TYPE_MODULES[company.business_type as BusinessType].map(moduleName => MODULE_REGISTRY[moduleName])
      : [];
  }, [company?.business_type]);

  // الوحدات النشطة من جدول الشركات - use useMemo to prevent infinite re-renders
  const companyActiveModules = useMemo(() => {
    return (company?.active_modules || []) as ModuleName[];
  }, [company?.active_modules]);

  // الوحدات المفعلة فعلياً - إذا لم توجد إعدادات، نستخدم active_modules من الشركة - use useMemo to prevent infinite re-renders
  const enabledModules = useMemo(() => {
    return moduleSettings && moduleSettings.length > 0 
      ? companyActiveModules.filter(moduleName => 
          moduleSettingsMap[moduleName]?.is_enabled !== false
        )
      : companyActiveModules; // fallback to company active_modules if no settings exist
  }, [moduleSettings, companyActiveModules, moduleSettingsMap]);

  logger.debug('🔧 [MODULE_CONFIG] =================================');
  logger.debug('🔧 [MODULE_CONFIG] Company ID:', company?.id);
  logger.debug('🔧 [MODULE_CONFIG] Business Type:', company?.business_type);
  logger.debug('🔧 [MODULE_CONFIG] Company Active Modules:', companyActiveModules);
  logger.debug('🔧 [MODULE_CONFIG] Module Settings Count:', moduleSettings?.length || 0);
  logger.debug('🔧 [MODULE_CONFIG] Module Settings:', moduleSettings?.map(s => ({ module: s.module_name, enabled: s.is_enabled })));
  logger.debug('🔧 [MODULE_CONFIG] Final Enabled Modules:', enabledModules);
  logger.debug('🔧 [MODULE_CONFIG] Is Browse Mode:', isBrowsingMode);
  logger.debug('🔧 [MODULE_CONFIG] ================================= END');

  // Use useMemo to prevent recreating moduleContext on every render - this was causing infinite re-renders (React error #310)
  const moduleContext: ModuleContext = useMemo(() => ({
    businessType: (company?.business_type as BusinessType) || 'car_rental',
    activeModules: enabledModules || [],
    moduleSettings: moduleSettingsMap as Record<ModuleName, ModuleSettings> || {},
    availableModules: availableModules || []
  }), [company?.business_type, enabledModules, moduleSettingsMap, availableModules]);

  // تحسين منطق التحميل - نعتبر البيانات محملة فقط عندما تكون بيانات الشركة موجودة ومعرفة
  // وجود business_type أمر ضروري لاتخاذ قرار عرض الـ dashboard الصحيح
  const isDataLoaded = !!company && !!company.business_type && moduleSettings !== undefined;
  
  logger.debug('🔧 [MODULE_CONFIG] Loading Status Check:', {
    hasCompany: !!company,
    hasBusinessType: !!company?.business_type,
    hasModuleSettings: moduleSettings !== undefined,
    isDataLoaded,
    companyId
  });

  // Use useCallback to memoize the refresh function - prevents causing re-renders in components using this
  const refreshData = useCallback(() => {
    logger.info('🔧 [MODULE_CONFIG] Force refreshing data...');
    // Use refetch instead of resetQueries to avoid infinite loops
    Promise.all([refetchCompany(), refetchModuleSettings()]);
  }, [refetchCompany, refetchModuleSettings]);

  return {
    company,
    moduleContext,
    isLoading: !isDataLoaded,
    // وظائف مساعدة
    isModuleEnabled: (moduleName: ModuleName) => enabledModules.includes(moduleName),
    getModuleConfig: (moduleName: ModuleName) => MODULE_REGISTRY[moduleName],
    getModuleSettings: (moduleName: ModuleName) => moduleSettingsMap[moduleName] || null,
    // Refresh functions for Browse Mode
    refreshData,
    isBrowsingMode,
    currentCompanyId: companyId
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