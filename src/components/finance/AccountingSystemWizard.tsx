import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Car, 
  Calculator, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Target,
  AlertTriangle
} from 'lucide-react';
import { BusinessTypeSelection } from './wizard/BusinessTypeSelection';
import { AccountsCustomization } from './wizard/AccountsCustomization';
import { AccountsMapping } from './wizard/AccountsMapping';
import { BankSetup } from './wizard/BankSetup';
import { WizardCompletion } from './wizard/WizardCompletion';
import { ConflictResolutionDialog, ConflictResolutionStrategy } from './ConflictResolutionDialog';
import { useAccountingWizard } from '@/hooks/useAccountingWizard';
import { useAccountConflictCheck } from '@/hooks/useAccountConflictCheck';
import { toast } from 'sonner';

export interface WizardData {
  businessType: string;
  selectedAccounts: string[];
  accountMappings: Record<string, string>;
  bankAccounts: Array<{
    name: string;
    accountNumber: string;
    currency: string;
    openingBalance: number;
  }>;
}

const STEPS = [
  { id: 1, title: 'نوع النشاط', icon: Building2 },
  { id: 2, title: 'تخصيص الحسابات', icon: Calculator },
  { id: 3, title: 'ربط الحسابات', icon: Target },
  { id: 4, title: 'الحسابات المصرفية', icon: Car },
  { id: 5, title: 'الانتهاء', icon: CheckCircle }
];

export const AccountingSystemWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    businessType: '',
    selectedAccounts: [],
    accountMappings: {},
    bankAccounts: []
  });
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);

  const { setupAccountingSystem, isLoading, progress } = useAccountingWizard();
  const { conflictInfo, hasConflicts, refetch: refetchConflicts } = useAccountConflictCheck();

  const updateWizardData = (stepData: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...stepData }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    try {
      // فحص التضاربات أولاً
      await refetchConflicts();
      
      if (hasConflicts && conflictInfo) {
        setShowConflictDialog(true);
      } else {
        // لا توجد تضاربات، التنفيذ مباشرة
        await setupAccountingSystem({ 
          wizardData,
          conflictStrategy: 'skip' 
        });
        toast.success('تم إعداد النظام المحاسبي بنجاح!');
      }
    } catch (error) {
      console.error('Error in handleFinish:', error);
      toast.error('حدث خطأ في إعداد النظام المحاسبي');
    }
  };

  const handleConflictResolution = async (strategy: ConflictResolutionStrategy) => {
    try {
      setIsResolvingConflict(true);
      
      await setupAccountingSystem({ 
        wizardData,
        conflictStrategy: strategy
      });
      
      setShowConflictDialog(false);
      toast.success('تم إعداد النظام المحاسبي بنجاح!');
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error('حدث خطأ في إعداد النظام المحاسبي');
    } finally {
      setIsResolvingConflict(false);
    }
  };

  const getCurrentStepComponent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BusinessTypeSelection
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <AccountsCustomization
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <AccountsMapping
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <BankSetup
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 5:
        return (
          <WizardCompletion
            data={wizardData}
            onFinish={handleFinish}
            onBack={prevStep}
            isLoading={isLoading}
            progress={progress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">معالج الإعداد المحاسبي</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          إعداد نظام محاسبي متكامل خلال دقائق معدودة، مخصص لاحتياجات شركتك
        </p>
        <Badge variant="secondary" className="mt-2">
          مناسب للشركات بدون محاسب
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                  ${isActive ? 'border-primary bg-primary text-primary-foreground' : 
                    isCompleted ? 'border-green-500 bg-green-500 text-white' : 
                    'border-muted bg-background text-muted-foreground'}
                `}>
                  <Icon className="h-5 w-5" />
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`
                    h-0.5 w-16 mx-2 transition-colors
                    ${isCompleted ? 'bg-green-500' : 'bg-muted'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          {STEPS.map(step => (
            <span 
              key={step.id} 
              className={`
                ${currentStep === step.id ? 'text-primary font-medium' : 
                  currentStep > step.id ? 'text-green-600' : 'text-muted-foreground'}
              `}
            >
              {step.title}
            </span>
          ))}
        </div>
        
        <Progress 
          value={(currentStep / STEPS.length) * 100} 
          className="mt-4" 
        />
      </div>

      {/* Alert for Al-Araf Company */}
      {wizardData.businessType === 'car_rental' && (
        <Alert className="mb-6">
          <Car className="h-4 w-4" />
          <AlertDescription>
            تم اكتشاف أن نشاطكم هو تأجير السيارات. سيتم إنشاء حسابات خاصة لإدارة الأسطول والعقود والإيرادات الإيجارية.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-primary">الخطوة {currentStep}</span>
            <ArrowLeft className="h-4 w-4" />
            {STEPS[currentStep - 1]?.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getCurrentStepComponent()}
        </CardContent>
      </Card>

      {/* حوار حل التضاربات */}
      {conflictInfo && (
        <ConflictResolutionDialog
          open={showConflictDialog}
          onOpenChange={setShowConflictDialog}
          conflictInfo={conflictInfo}
          onResolve={handleConflictResolution}
          isResolving={isResolvingConflict}
        />
      )}

      {/* Tips */}
      <Card className="mt-6 bg-blue-50/50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">نصائح مهمة:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• يمكنك دائماً تعديل الحسابات لاحقاً من قسم المالية</li>
                <li>• سيتم إنشاء حسابات فرعية تلقائياً للعملاء والموردين</li>
                <li>• التقارير المالية ستكون جاهزة فور الانتهاء من الإعداد</li>
                <li>• يمكنك إضافة المزيد من الحسابات حسب الحاجة</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};