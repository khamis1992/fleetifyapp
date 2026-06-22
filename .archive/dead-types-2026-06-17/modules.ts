// أنواع البيانات للنظام المعياري
export type BusinessType = 
  | 'car_rental'
  | 'real_estate'
  | 'retail'
  | 'medical'
  | 'manufacturing'
  | 'restaurant'
  | 'logistics'
  | 'education'
  | 'consulting'
  | 'construction';

export type ModuleName =
  | 'core'
  | 'finance'
  | 'vehicles'
  | 'properties'
  | 'contracts'
  | 'customers'
  | 'tenants'
  | 'inventory'
  | 'sales'
  | 'suppliers'
  | 'patients'
  | 'appointments'
  | 'medical_records'
  | 'menu'
  | 'orders';

export interface BusinessTemplate {
  id: string;
  template_name: string;
  template_name_ar?: string;
  business_type: BusinessType;
  description?: string;
  description_ar?: string;
  default_modules: ModuleName[];
  default_chart_accounts?: Record<string, any>;
  default_settings?: Record<string, any>;
  icon_name?: string;
  color_scheme?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModuleSettings {
  id: string;
  company_id: string;
  module_name: ModuleName;
  module_config: Record<string, any>;
  is_enabled: boolean;
  version: string;
  last_updated: string;
  updated_by?: string;
}

export interface ModuleConfig {
  name: ModuleName;
  display_name: string;
  display_name_ar: string;
  icon: string;
  description: string;
  description_ar: string;
  routes: ModuleRoute[];
  permissions: string[];
  required_modules?: ModuleName[];
  version: string;
  is_premium?: boolean;
}

export interface ModuleRoute {
  path: string;
  label: string;
  label_ar: string;
  icon: string;
  component?: string;
  permission?: string;
  children?: ModuleRoute[];
}

export interface Company {
  id: string;
  name: string;
  name_ar?: string;
  business_type: BusinessType;
  industry_config: Record<string, any>;
  active_modules: ModuleName[];
  company_template: string;
  custom_branding: Record<string, any>;
  // ... باقي الحقول الموجودة
}

export interface ModuleContext {
  businessType: BusinessType;
  activeModules: ModuleName[];
  moduleSettings: Record<ModuleName, ModuleSettings>;
  availableModules: ModuleConfig[];
}