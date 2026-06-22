import { BusinessType, ModuleName } from '@/types/modules';
import { BUSINESS_TYPE_MODULES, MODULE_REGISTRY } from '@/modules/moduleRegistry';

// وظائف مساعدة للوحدات
export const moduleUtils = {
  // التحقق من توافق الوحدة مع نوع النشاط
  isModuleCompatible: (moduleName: ModuleName, businessType: BusinessType): boolean => {
    return BUSINESS_TYPE_MODULES[businessType]?.includes(moduleName) || false;
  },

  // الحصول على الوحدات المطلوبة لوحدة معينة
  getRequiredModules: (moduleName: ModuleName): ModuleName[] => {
    const moduleConfig = MODULE_REGISTRY[moduleName];
    return moduleConfig?.required_modules || [];
  },

  // التحقق من توفر جميع الوحدات المطلوبة
  areRequiredModulesEnabled: (moduleName: ModuleName, enabledModules: ModuleName[]): boolean => {
    const requiredModules = moduleUtils.getRequiredModules(moduleName);
    return requiredModules.every(required => enabledModules.includes(required));
  },

  // الحصول على الوحدات المتاحة لنوع نشاط معين
  getAvailableModules: (businessType: BusinessType): ModuleName[] => {
    return BUSINESS_TYPE_MODULES[businessType] || [];
  },

  // ترتيب الوحدات حسب التبعيات
  sortModulesByDependencies: (modules: ModuleName[]): ModuleName[] => {
    const sorted: ModuleName[] = [];
    const visited = new Set<ModuleName>();
    
    const visit = (moduleName: ModuleName) => {
      if (visited.has(moduleName)) return;
      visited.add(moduleName);
      
      const requiredModules = moduleUtils.getRequiredModules(moduleName);
      requiredModules.forEach(required => {
        if (modules.includes(required)) {
          visit(required);
        }
      });
      
      sorted.push(moduleName);
    };
    
    modules.forEach(visit);
    return sorted;
  },

  // تصفية الوحدات بناءً على الصلاحيات
  filterModulesByPermissions: (modules: ModuleName[], userPermissions: string[]): ModuleName[] => {
    return modules.filter(moduleName => {
      const moduleConfig = MODULE_REGISTRY[moduleName];
      if (!moduleConfig) return false;
      
      // التحقق من وجود صلاحية واحدة على الأقل للوحدة
      return moduleConfig.permissions.some(permission => 
        userPermissions.includes(permission)
      );
    });
  },

  // إنشاء مسارات الشريط الجانبي للوحدات المفعلة
  generateSidebarRoutes: (enabledModules: ModuleName[]) => {
    const routes: any[] = [];
    
    enabledModules.forEach(moduleName => {
      const moduleConfig = MODULE_REGISTRY[moduleName];
      if (moduleConfig && moduleConfig.routes.length > 0) {
        routes.push(...moduleConfig.routes);
      }
    });
    
    return routes;
  }
};