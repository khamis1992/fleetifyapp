import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BusinessType, ModuleName } from '@/types/modules';
import { 
  Car, 
  Building, 
  ShoppingBag, 
  Stethoscope, 
  Factory, 
  UtensilsCrossed, 
  Truck, 
  GraduationCap, 
  Users, 
  Hammer 
} from 'lucide-react';

export interface BusinessTypeOption {
  type: BusinessType;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  icon: React.ComponentType<any>;
  modules: ModuleName[];
  color: string;
}

const businessTypes: BusinessTypeOption[] = [
  {
    type: 'car_rental',
    name: 'Car Rental',
    name_ar: 'تأجير السيارات',
    description: 'Vehicle rental and fleet management',
    description_ar: 'تأجير المركبات وإدارة الأسطول',
    icon: Car,
    modules: ['core', 'finance', 'vehicles', 'contracts', 'customers'],
    color: 'from-blue-500 to-blue-600'
  },
  {
    type: 'real_estate',
    name: 'Real Estate',
    name_ar: 'العقارات',
    description: 'Property management and rentals',
    description_ar: 'إدارة العقارات والإيجارات',
    icon: Building,
    modules: ['core', 'finance', 'properties', 'contracts', 'customers', 'tenants'],
    color: 'from-green-500 to-green-600'
  },
  {
    type: 'retail',
    name: 'Retail',
    name_ar: 'التجارة التجزئة',
    description: 'Retail sales and inventory management',
    description_ar: 'البيع بالتجزئة وإدارة المخزون',
    icon: ShoppingBag,
    modules: ['core', 'finance', 'inventory', 'sales', 'customers', 'suppliers'],
    color: 'from-purple-500 to-purple-600'
  },
  {
    type: 'medical',
    name: 'Medical',
    name_ar: 'الطبي',
    description: 'Healthcare and medical services',
    description_ar: 'الرعاية الصحية والخدمات الطبية',
    icon: Stethoscope,
    modules: ['core', 'finance', 'patients', 'appointments', 'medical_records'],
    color: 'from-red-500 to-red-600'
  },
  {
    type: 'manufacturing',
    name: 'Manufacturing',
    name_ar: 'التصنيع',
    description: 'Manufacturing and production',
    description_ar: 'التصنيع والإنتاج',
    icon: Factory,
    modules: ['core', 'finance', 'inventory', 'suppliers', 'sales'],
    color: 'from-slate-500 to-slate-600'
  },
  {
    type: 'restaurant',
    name: 'Restaurant',
    name_ar: 'المطاعم',
    description: 'Restaurant and food service',
    description_ar: 'المطاعم وخدمات الطعام',
    icon: UtensilsCrossed,
    modules: ['core', 'finance', 'menu', 'orders', 'customers', 'inventory'],
    color: 'from-orange-500 to-orange-600'
  },
  {
    type: 'logistics',
    name: 'Logistics',
    name_ar: 'اللوجستيات',
    description: 'Logistics and transportation',
    description_ar: 'اللوجستيات والنقل',
    icon: Truck,
    modules: ['core', 'finance', 'vehicles', 'customers', 'contracts'],
    color: 'from-cyan-500 to-cyan-600'
  },
  {
    type: 'education',
    name: 'Education',
    name_ar: 'التعليم',
    description: 'Educational institutions',
    description_ar: 'المؤسسات التعليمية',
    icon: GraduationCap,
    modules: ['core', 'finance', 'customers'],
    color: 'from-indigo-500 to-indigo-600'
  },
  {
    type: 'consulting',
    name: 'Consulting',
    name_ar: 'الاستشارات',
    description: 'Professional consulting services',
    description_ar: 'خدمات الاستشارات المهنية',
    icon: Users,
    modules: ['core', 'finance', 'customers', 'contracts'],
    color: 'from-teal-500 to-teal-600'
  },
  {
    type: 'construction',
    name: 'Construction',
    name_ar: 'البناء والتشييد',
    description: 'Construction and building',
    description_ar: 'البناء والتشييد',
    icon: Hammer,
    modules: ['core', 'finance', 'customers', 'contracts', 'suppliers'],
    color: 'from-yellow-500 to-yellow-600'
  }
];

interface BusinessTypeSelectorProps {
  selectedType?: BusinessType;
  onTypeSelect: (type: BusinessType) => void;
  showModules?: boolean;
}

export const BusinessTypeSelector: React.FC<BusinessTypeSelectorProps> = ({
  selectedType,
  onTypeSelect,
  showModules = true
}) => {
  const moduleNames: Record<ModuleName, string> = {
    core: 'النواة الأساسية',
    finance: 'المالية',
    vehicles: 'المركبات',
    properties: 'العقارات',
    contracts: 'العقود',
    customers: 'العملاء',
    tenants: 'المستأجرين',
    inventory: 'المخزون',
    sales: 'المبيعات',
    suppliers: 'الموردين',
    patients: 'المرضى',
    appointments: 'المواعيد',
    medical_records: 'السجلات الطبية',
    menu: 'القائمة',
    orders: 'الطلبات'
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">اختر نوع النشاط التجاري</h3>
        <p className="text-sm text-muted-foreground mb-4">
          سيتم تفعيل الوحدات المناسبة لنوع النشاط المحدد تلقائياً
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businessTypes.map((business) => {
          const Icon = business.icon;
          const isSelected = selectedType === business.type;

          return (
            <Card 
              key={business.type}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onTypeSelect(business.type)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${business.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {isSelected && (
                    <Badge variant="default">محدد</Badge>
                  )}
                </div>
                <CardTitle className="text-base">{business.name_ar}</CardTitle>
                <CardDescription className="text-sm">
                  {business.description_ar}
                </CardDescription>
              </CardHeader>

              {showModules && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      الوحدات المتضمنة:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {business.modules.slice(0, 4).map((module) => (
                        <Badge 
                          key={module} 
                          variant="secondary" 
                          className="text-xs py-0.5 px-2"
                        >
                          {moduleNames[module]}
                        </Badge>
                      ))}
                      {business.modules.length > 4 && (
                        <Badge variant="outline" className="text-xs py-0.5 px-2">
                          +{business.modules.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {selectedType && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${
                businessTypes.find(b => b.type === selectedType)?.color
              } text-white`}>
                {React.createElement(
                  businessTypes.find(b => b.type === selectedType)?.icon || Car,
                  { className: "h-5 w-5" }
                )}
              </div>
              <div>
                <h4 className="font-semibold">
                  {businessTypes.find(b => b.type === selectedType)?.name_ar}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {businessTypes.find(b => b.type === selectedType)?.description_ar}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">الوحدات التي سيتم تفعيلها:</p>
              <div className="flex flex-wrap gap-2">
                {businessTypes.find(b => b.type === selectedType)?.modules.map((module) => (
                  <Badge key={module} variant="default" className="text-xs">
                    {moduleNames[module]}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export { businessTypes };