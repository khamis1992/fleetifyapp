import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  Building, 
  ShoppingCart, 
  Wrench, 
  Briefcase, 
  Stethoscope,
  GraduationCap,
  Home,
  ArrowRight 
} from 'lucide-react';
import { WizardData } from '../AccountingSystemWizard';
import { useTemplateSystem } from '@/hooks/useTemplateSystem';

interface BusinessType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  popular?: boolean;
  accounts: {
    assets: string[];
    liabilities: string[];
    revenue: string[];
    expenses: string[];
  };
}

const BUSINESS_TYPES: BusinessType[] = [
  {
    id: 'car_rental',
    name: 'تأجير السيارات',
    description: 'شركات تأجير المركبات والنقل',
    icon: Car,
    popular: true,
    accounts: {
      assets: ['أسطول المركبات', 'عهد السائقين', 'تأمينات المركبات'],
      liabilities: ['تأمينات العملاء', 'ودائع العقود'],
      revenue: ['إيرادات التأجير', 'رسوم إضافية', 'إيرادات التأمين'],
      expenses: ['صيانة المركبات', 'وقود', 'تأمين الأسطول', 'رسوم ترخيص']
    }
  },
  {
    id: 'professional_services',
    name: 'الخدمات المهنية',
    description: 'استشارات، محاماة، محاسبة',
    icon: Briefcase,
    accounts: {
      assets: ['أتعاب مستحقة', 'مصاريف مدفوعة مقدماً'],
      liabilities: ['أتعاب مقبوضة مقدماً', 'مكافآت مستحقة'],
      revenue: ['أتعاب استشارية', 'أتعاب قانونية', 'خدمات محاسبية'],
      expenses: ['مصاريف انتقال', 'اشتراكات مهنية', 'تدريب الموظفين']
    }
  },
  {
    id: 'retail_trade',
    name: 'التجارة',
    description: 'بيع بالتجزئة والجملة',
    icon: ShoppingCart,
    accounts: {
      assets: ['مخزون البضائع', 'عملاء التجزئة', 'عملاء الجملة'],
      liabilities: ['موردين محليين', 'موردين خارجيين', 'ضرائب مستحقة'],
      revenue: ['مبيعات التجزئة', 'مبيعات الجملة', 'خصومات مكسوبة'],
      expenses: ['تكلفة البضاعة', 'مصاريف شحن', 'مصاريف تسويق']
    }
  },
  {
    id: 'construction',
    name: 'المقاولات',
    description: 'مقاولات البناء والتشييد',
    icon: Building,
    accounts: {
      assets: ['مشاريع تحت التنفيذ', 'معدات البناء', 'مواد خام'],
      liabilities: ['مقاولين فرعيين', 'ضمانات المشاريع'],
      revenue: ['إيرادات المقاولات', 'أعمال إضافية'],
      expenses: ['تكلفة المواد', 'أجور العمال', 'إيجار المعدات']
    }
  },
  {
    id: 'manufacturing',
    name: 'التصنيع',
    description: 'المصانع والإنتاج',
    icon: Wrench,
    accounts: {
      assets: ['مواد خام', 'إنتاج تحت التشغيل', 'مخزون جاهز'],
      liabilities: ['موردي المواد', 'أجور مستحقة'],
      revenue: ['مبيعات المنتجات', 'مبيعات المخلفات'],
      expenses: ['تكلفة المواد', 'أجور مباشرة', 'مصاريف تصنيع']
    }
  },
  {
    id: 'medical',
    name: 'الخدمات الطبية',
    description: 'عيادات ومراكز طبية',
    icon: Stethoscope,
    accounts: {
      assets: ['أجهزة طبية', 'مستلزمات طبية', 'مرضى مدينون'],
      liabilities: ['تأمينات طبية', 'أدوية مستحقة'],
      revenue: ['رسوم الكشف', 'رسوم العمليات', 'رسوم تأمين'],
      expenses: ['أدوية ومستلزمات', 'صيانة الأجهزة', 'رواتب طبية']
    }
  },
  {
    id: 'education',
    name: 'التعليم',
    description: 'مدارس ومعاهد تعليمية',
    icon: GraduationCap,
    accounts: {
      assets: ['رسوم مستحقة', 'أثاث مدرسي', 'كتب ومناهج'],
      liabilities: ['رسوم مقبوضة مقدماً', 'مكافآت معلمين'],
      revenue: ['رسوم دراسية', 'رسوم أنشطة', 'رسوم نقل'],
      expenses: ['رواتب المعلمين', 'مصاريف تعليمية', 'صيانة المرافق']
    }
  },
  {
    id: 'real_estate',
    name: 'العقارات',
    description: 'إدارة وتطوير العقارات',
    icon: Home,
    accounts: {
      assets: ['عقارات استثمارية', 'مشاريع عقارية', 'مستأجرين'],
      liabilities: ['ودائع الإيجار', 'صيانة مستحقة'],
      revenue: ['إيرادات الإيجار', 'عمولات بيع', 'خدمات إدارية'],
      expenses: ['صيانة العقارات', 'ضرائب عقارية', 'تسويق عقاري']
    }
  }
];

interface Props {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
}

export const BusinessTypeSelection: React.FC<Props> = ({ data, onUpdate, onNext }) => {
  const { getAccountsByType, loading } = useTemplateSystem(data.businessType);
  
  const handleSelectBusinessType = (businessType: string) => {
    onUpdate({ businessType });
  };

  const selectedType = BUSINESS_TYPES.find(type => type.id === data.businessType);
  const realAccounts = getAccountsByType();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">اختر نوع نشاطك التجاري</h3>
        <p className="text-muted-foreground">
          سيتم تخصيص دليل الحسابات بناءً على نوع النشاط المختار
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUSINESS_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = data.businessType === type.id;
          
          return (
            <Card 
              key={type.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary border-primary' : ''
              }`}
              onClick={() => handleSelectBusinessType(type.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                      {type.popular && (
                        <Badge variant="secondary" className="mt-1">شائع</Badge>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="text-primary">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {type.description}
                </p>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    أمثلة على الحسابات:
                  </div>
                  <div className="text-xs space-y-1">
                    {isSelected && realAccounts.revenue.length > 0 ? (
                      <>
                        <div>• {realAccounts.revenue.slice(0, 2).map(acc => acc.name_ar).join('، ')}</div>
                        <div>• {realAccounts.expenses.slice(0, 2).map(acc => acc.name_ar).join('، ')}</div>
                      </>
                    ) : (
                      <>
                        <div>• {type.accounts.revenue.slice(0, 2).join('، ')}</div>
                        <div>• {type.accounts.expenses.slice(0, 2).join('، ')}</div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedType && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-primary">
                الحسابات المقترحة لـ {selectedType.name}:
              </h4>
              {loading ? (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">جاري تحميل الحسابات...</div>
                </div>
              ) : realAccounts.revenue.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-green-700 mb-2">الإيرادات:</div>
                    <ul className="space-y-1">
                      {realAccounts.revenue.slice(0, 5).map((account) => (
                        <li key={account.code} className="text-muted-foreground">• {account.name_ar}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-red-700 mb-2">المصروفات:</div>
                    <ul className="space-y-1">
                      {realAccounts.expenses.slice(0, 5).map((account) => (
                        <li key={account.code} className="text-muted-foreground">• {account.name_ar}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-green-700 mb-2">الإيرادات:</div>
                    <ul className="space-y-1">
                      {selectedType.accounts.revenue.map((account, index) => (
                        <li key={index} className="text-muted-foreground">• {account}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-red-700 mb-2">المصروفات:</div>
                    <ul className="space-y-1">
                      {selectedType.accounts.expenses.map((account, index) => (
                        <li key={index} className="text-muted-foreground">• {account}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end pt-6">
        <Button 
          onClick={onNext} 
          disabled={!data.businessType}
          className="flex items-center gap-2"
        >
          التالي
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};