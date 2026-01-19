import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  CheckCircle, 
  Sparkles,
  Building,
  Calculator,
  CreditCard,
  TrendingUp,
  FileText,
  Users,
  BarChart3
} from 'lucide-react';
import { WizardData } from '../AccountingSystemWizard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface Props {
  data: WizardData;
  onFinish: () => void;
  onBack: () => void;
  isLoading: boolean;
  progress: number;
}

const BUSINESS_TYPE_NAMES: Record<string, string> = {
  car_rental: 'تأجير السيارات',
  professional_services: 'الخدمات المهنية',
  retail_trade: 'التجارة',
  construction: 'المقاولات',
  manufacturing: 'التصنيع',
  medical: 'الخدمات الطبية',
  education: 'التعليم',
  real_estate: 'العقارات'
};

const SETUP_STEPS = [
  { id: 1, title: 'إنشاء دليل الحسابات', icon: Calculator, description: 'إنشاء الحسابات المحاسبية المطلوبة' },
  { id: 2, title: 'ربط الحسابات', icon: Building, description: 'ربط الحسابات الأساسية بالعمليات' },
  { id: 3, title: 'إعداد البنوك', icon: CreditCard, description: 'إضافة الحسابات المصرفية' },
  { id: 4, title: 'إنشاء حسابات فرعية', icon: Users, description: 'إنشاء حسابات للعملاء والموردين' },
  { id: 5, title: 'إعداد التقارير', icon: BarChart3, description: 'تجهيز التقارير المالية' }
];

export const WizardCompletion: React.FC<Props> = ({ 
  data, 
  onFinish, 
  onBack, 
  isLoading, 
  progress 
}) => {
  const getCurrentStep = () => {
    if (progress <= 20) return 1;
    if (progress <= 40) return 2;
    if (progress <= 60) return 3;
    if (progress <= 80) return 4;
    return 5;
  };

  const currentStep = getCurrentStep();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">
          {isLoading ? 'جاري إعداد النظام المحاسبي...' : 'مراجعة الإعداد والانتهاء'}
        </h3>
        <p className="text-muted-foreground">
          {isLoading 
            ? 'يرجى الانتظار بينما يتم إعداد النظام المحاسبي لشركتك'
            : 'راجع الإعدادات المختارة واضغط "إنشاء النظام" للانتهاء'
          }
        </p>
      </div>

      {isLoading && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-primary">تقدم الإعداد</h4>
                <Badge variant="secondary">{progress}%</Badge>
              </div>
              
              <Progress value={progress} className="w-full" />
              
              <div className="space-y-3">
                {SETUP_STEPS.map((step) => {
                  const Icon = step.icon;
                  const isCompleted = currentStep > step.id;
                  const isCurrent = currentStep === step.id;
                  
                  return (
                    <div 
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isCompleted ? 'bg-green-50 text-green-800' :
                        isCurrent ? 'bg-primary/10 text-primary' :
                        'bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${
                        isCompleted ? 'bg-green-100' :
                        isCurrent ? 'bg-primary/20' :
                        'bg-muted'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : isCurrent ? (
                          <LoadingSpinner className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{step.title}</div>
                        <div className="text-sm opacity-80">{step.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                ملخص الإعداد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">نوع النشاط</div>
                    <div className="text-lg">
                      {BUSINESS_TYPE_NAMES[data.businessType] || data.businessType}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">عدد الحسابات</div>
                    <div className="text-lg">{data.selectedAccounts?.length || 0} حساب</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">الحسابات المصرفية</div>
                    <div className="text-lg">
                      {data.bankAccounts?.length || 0} حساب بنكي
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">ربط الحسابات</div>
                    <div className="text-lg">
                      {Object.keys(data.accountMappings || {}).length} ربط تلقائي
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Accounts Summary */}
          {data.bankAccounts && data.bankAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  الحسابات المصرفية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.bankAccounts.map((bank, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium">{bank.name}</div>
                        <div className="text-sm text-muted-foreground">{bank.accountNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {bank.openingBalance.toLocaleString('ar-KW', { 
                            minimumFractionDigits: 3,
                            maximumFractionDigits: 3 
                          })} {bank.currency}
                        </div>
                        <div className="text-sm text-muted-foreground">رصيد افتتاحي</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* What happens next */}
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">ما سيحدث بعد الانتهاء:</div>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>إنشاء دليل الحسابات المخصص لنشاطك</li>
                  <li>ربط الحسابات بالعمليات المختلفة</li>
                  <li>إنشاء حسابات فرعية للعملاء والموردين</li>
                  <li>تجهيز التقارير المالية الأساسية</li>
                  <li>إعداد لوحة تحكم مالية مبسطة</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={onBack}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          السابق
        </Button>
        
        <Button 
          onClick={onFinish}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <LoadingSpinner className="h-4 w-4" />
              جاري الإعداد...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              إنشاء النظام المحاسبي
            </>
          )}
        </Button>
      </div>
    </div>
  );
};