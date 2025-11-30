import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModuleName } from '@/types/modules';
import { MODULE_REGISTRY } from '@/modules/moduleRegistry';
import { 
  Settings, 
  Calculator, 
  Car, 
  Building, 
  FileText, 
  Users, 
  UserCheck, 
  Package, 
  ShoppingCart, 
  Truck, 
  Heart, 
  Calendar, 
  Clipboard, 
  ChefHat, 
  ClipboardList,
  AlertTriangle,
  Lock
} from 'lucide-react';

// خريطة الأيقونات
const MODULE_ICONS: Record<ModuleName, React.ComponentType<{ className?: string }>> = {
  core: Settings,
  finance: Calculator,
  vehicles: Car,
  properties: Building,
  contracts: FileText,
  customers: Users,
  tenants: UserCheck,
  inventory: Package,
  sales: ShoppingCart,
  suppliers: Truck,
  patients: Heart,
  appointments: Calendar,
  medical_records: Clipboard,
  menu: ChefHat,
  orders: ClipboardList
};

interface CompanyModulesManagerProps {
  activeModules: ModuleName[];
  onModulesChange: (modules: ModuleName[]) => void;
  readOnly?: boolean;
}

export const CompanyModulesManager: React.FC<CompanyModulesManagerProps> = ({
  activeModules,
  onModulesChange,
  readOnly = false
}) => {
  // التحقق من الوحدات المطلوبة
  const getRequiredModules = (moduleName: ModuleName): ModuleName[] => {
    const moduleConfig = MODULE_REGISTRY[moduleName];
    return moduleConfig?.required_modules || [];
  };

  // التحقق من الوحدات التي تعتمد على وحدة معينة
  const getDependentModules = (moduleName: ModuleName): ModuleName[] => {
    const dependents: ModuleName[] = [];
    Object.entries(MODULE_REGISTRY).forEach(([name, config]) => {
      if (config.required_modules?.includes(moduleName)) {
        dependents.push(name as ModuleName);
      }
    });
    return dependents;
  };

  // التحقق من إمكانية تعطيل الوحدة
  const canDisableModule = (moduleName: ModuleName): { canDisable: boolean; reason?: string } => {
    // لا يمكن تعطيل وحدة core
    if (moduleName === 'core') {
      return { canDisable: false, reason: 'وحدة النواة الأساسية مطلوبة ولا يمكن تعطيلها' };
    }

    // التحقق من الوحدات المعتمدة على هذه الوحدة
    const dependents = getDependentModules(moduleName);
    const activeDependents = dependents.filter(dep => activeModules.includes(dep));
    
    if (activeDependents.length > 0) {
      const dependentNames = activeDependents.map(dep => MODULE_REGISTRY[dep].display_name_ar).join('، ');
      return { 
        canDisable: false, 
        reason: `لا يمكن تعطيل هذه الوحدة لأن الوحدات التالية تعتمد عليها: ${dependentNames}` 
      };
    }

    return { canDisable: true };
  };

  // التحقق من إمكانية تفعيل الوحدة
  const canEnableModule = (moduleName: ModuleName): { canEnable: boolean; missingModules?: ModuleName[] } => {
    const requiredModules = getRequiredModules(moduleName);
    const missingModules = requiredModules.filter(req => !activeModules.includes(req));
    
    if (missingModules.length > 0) {
      return { canEnable: false, missingModules };
    }

    return { canEnable: true };
  };

  // تبديل حالة الوحدة
  const handleToggleModule = (moduleName: ModuleName, enabled: boolean) => {
    if (readOnly) return;

    if (enabled) {
      // تفعيل الوحدة
      const { canEnable, missingModules } = canEnableModule(moduleName);
      if (!canEnable && missingModules) {
        // تفعيل الوحدات المطلوبة تلقائياً
        const newModules = [...new Set([...activeModules, ...missingModules, moduleName])];
        onModulesChange(newModules);
      } else {
        onModulesChange([...activeModules, moduleName]);
      }
    } else {
      // تعطيل الوحدة
      const { canDisable } = canDisableModule(moduleName);
      if (canDisable) {
        onModulesChange(activeModules.filter(m => m !== moduleName));
      }
    }
  };

  // تجميع الوحدات حسب الفئة
  const moduleCategories = {
    core: ['core', 'finance'] as ModuleName[],
    business: ['vehicles', 'properties', 'contracts', 'customers', 'tenants'] as ModuleName[],
    commerce: ['inventory', 'sales', 'suppliers'] as ModuleName[],
    medical: ['patients', 'appointments', 'medical_records'] as ModuleName[],
    restaurant: ['menu', 'orders'] as ModuleName[]
  };

  const categoryNames: Record<string, string> = {
    core: 'الوحدات الأساسية',
    business: 'إدارة الأعمال',
    commerce: 'التجارة والمخزون',
    medical: 'الخدمات الطبية',
    restaurant: 'المطاعم'
  };

  return (
    <div className="space-y-6">
      {/* تنبيه */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          تعطيل وحدة قد يؤثر على وظائف النظام. تأكد من عدم حاجة الشركة للوحدة قبل تعطيلها.
        </AlertDescription>
      </Alert>

      {/* الوحدات المفعلة حالياً */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">الوحدات المفعلة حالياً</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {activeModules.map(moduleName => {
              const config = MODULE_REGISTRY[moduleName];
              const Icon = MODULE_ICONS[moduleName];
              return (
                <Badge key={moduleName} variant="default" className="gap-1 py-1 px-2">
                  <Icon className="h-3 w-3" />
                  {config?.display_name_ar || moduleName}
                </Badge>
              );
            })}
            {activeModules.length === 0 && (
              <span className="text-sm text-muted-foreground">لا توجد وحدات مفعلة</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* قائمة الوحدات */}
      {Object.entries(moduleCategories).map(([category, modules]) => {
        // إخفاء الفئات الفارغة
        const availableModules = modules.filter(m => MODULE_REGISTRY[m]);
        if (availableModules.length === 0) return null;

        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{categoryNames[category]}</CardTitle>
              <CardDescription>
                {category === 'core' && 'الوحدات الأساسية للنظام'}
                {category === 'business' && 'وحدات إدارة الأعمال والعملاء'}
                {category === 'commerce' && 'وحدات التجارة والمخزون'}
                {category === 'medical' && 'وحدات الخدمات الطبية والصحية'}
                {category === 'restaurant' && 'وحدات إدارة المطاعم'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableModules.map(moduleName => {
                const config = MODULE_REGISTRY[moduleName];
                const Icon = MODULE_ICONS[moduleName];
                const isActive = activeModules.includes(moduleName);
                const { canDisable, reason: disableReason } = canDisableModule(moduleName);
                const { canEnable, missingModules } = canEnableModule(moduleName);
                const isLocked = moduleName === 'core';

                return (
                  <div 
                    key={moduleName}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isActive ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{config?.display_name_ar}</span>
                          {isLocked && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {config?.description_ar}
                        </p>
                        {/* عرض الوحدات المطلوبة */}
                        {config?.required_modules && config.required_modules.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            يتطلب: {config.required_modules.map(req => 
                              MODULE_REGISTRY[req]?.display_name_ar
                            ).join('، ')}
                          </p>
                        )}
                        {/* تحذير عند عدم إمكانية التعطيل */}
                        {isActive && !canDisable && disableReason && (
                          <p className="text-xs text-amber-600 mt-1">
                            {disableReason}
                          </p>
                        )}
                        {/* معلومات عن الوحدات المطلوبة عند التفعيل */}
                        {!isActive && !canEnable && missingModules && (
                          <p className="text-xs text-blue-600 mt-1">
                            سيتم تفعيل: {missingModules.map(m => 
                              MODULE_REGISTRY[m]?.display_name_ar
                            ).join('، ')} تلقائياً
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => handleToggleModule(moduleName, checked)}
                      disabled={readOnly || (isActive && !canDisable)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

