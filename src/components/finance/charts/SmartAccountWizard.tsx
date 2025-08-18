import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Wand2, 
  Code, 
  Layers, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import { useCreateSmartAccount, useSuggestAccountCode } from '@/hooks/useChartValidation';
import { SmartParentSelector } from '../enhanced-editing/SmartParentSelector';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SmartAccountWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WizardData {
  accountName: string;
  accountNameAr: string;
  accountType: string;
  parentAccountId?: string;
  suggestedCode?: string;
  balanceType?: string;
  accountLevel?: number;
}

const ACCOUNT_TYPES = [
  { value: 'assets', label: 'الأصول', balanceType: 'debit' },
  { value: 'liabilities', label: 'الخصوم', balanceType: 'credit' },
  { value: 'equity', label: 'حقوق الملكية', balanceType: 'credit' },
  { value: 'revenue', label: 'الإيرادات', balanceType: 'credit' },
  { value: 'expenses', label: 'المصروفات', balanceType: 'debit' },
];

export const SmartAccountWizard: React.FC<SmartAccountWizardProps> = ({
  open,
  onOpenChange,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    accountName: '',
    accountNameAr: '',
    accountType: 'assets',
  });

  const createSmartAccount = useCreateSmartAccount();
  const suggestCode = useSuggestAccountCode();

  const steps = [
    { id: 1, title: 'المعلومات الأساسية', description: 'أدخل اسم الحساب ونوعه' },
    { id: 2, title: 'الهيكل الهرمي', description: 'اختر الحساب الأب والموقع' },
    { id: 3, title: 'المراجعة والإنشاء', description: 'راجع البيانات وأنشئ الحساب' },
  ];

  // Auto-suggest code when type or parent changes
  useEffect(() => {
    if (wizardData.accountType || wizardData.parentAccountId) {
      suggestCode.mutate({
        accountType: wizardData.accountType,
        parentAccountId: wizardData.parentAccountId,
      }, {
        onSuccess: (code) => {
          setWizardData(prev => ({ ...prev, suggestedCode: code }));
        },
      });
    }
  }, [wizardData.accountType, wizardData.parentAccountId]);

  // Auto-set balance type when account type changes
  useEffect(() => {
    const accountTypeInfo = ACCOUNT_TYPES.find(t => t.value === wizardData.accountType);
    if (accountTypeInfo) {
      setWizardData(prev => ({ 
        ...prev, 
        balanceType: accountTypeInfo.balanceType 
      }));
    }
  }, [wizardData.accountType]);

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = () => {
    createSmartAccount.mutate({
      accountName: wizardData.accountName,
      accountNameAr: wizardData.accountNameAr,
      accountType: wizardData.accountType,
      parentAccountId: wizardData.parentAccountId,
      autoGenerateCode: true,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetWizard();
      },
    });
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setWizardData({
      accountName: '',
      accountNameAr: '',
      accountType: 'assets',
    });
  };

  const canProceedFromStep1 = wizardData.accountName.trim() !== '';
  const canProceedFromStep2 = true; // Parent is optional

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="accountName">اسم الحساب (بالإنجليزية) *</Label>
        <Input
          id="accountName"
          value={wizardData.accountName}
          onChange={(e) => setWizardData(prev => ({ ...prev, accountName: e.target.value }))}
          placeholder="مثال: Cash in Hand"
          required
        />
      </div>

      <div>
        <Label htmlFor="accountNameAr">اسم الحساب (بالعربية)</Label>
        <Input
          id="accountNameAr"
          value={wizardData.accountNameAr}
          onChange={(e) => setWizardData(prev => ({ ...prev, accountNameAr: e.target.value }))}
          placeholder="مثال: النقدية في الصندوق"
        />
      </div>

      <div>
        <Label htmlFor="accountType">نوع الحساب *</Label>
        <Select
          value={wizardData.accountType}
          onValueChange={(value) => setWizardData(prev => ({ ...prev, accountType: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center justify-between w-full">
                  <span>{type.label}</span>
                  <Badge variant="outline" className="ml-2">
                    {type.balanceType === 'debit' ? 'مدين' : 'دائن'}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {wizardData.balanceType && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm">
                طبيعة الرصيد: <strong>{wizardData.balanceType === 'debit' ? 'مدين' : 'دائن'}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="parentAccount">الحساب الأب (اختياري)</Label>
        <SmartParentSelector
          value={wizardData.parentAccountId}
          onValueChange={(value) => setWizardData(prev => ({ ...prev, parentAccountId: value }))}
          accountName={wizardData.accountName}
          accountType={wizardData.accountType}
          placeholder="اختر الحساب الأب (اختياري للمستوى الأول)"
        />
      </div>

      {suggestCode.isPending && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          جاري اقتراح كود الحساب...
        </div>
      )}

      {wizardData.suggestedCode && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              <span className="text-sm">
                كود الحساب المقترح: <strong className="font-mono">{wizardData.suggestedCode}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">معلومات إضافية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>المستوى المتوقع:</span>
            <Badge variant="secondary">
              <Layers className="h-3 w-3 mr-1" />
              {wizardData.parentAccountId ? 'تلقائي (مستوى الأب + 1)' : '1'}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>نوع الحساب:</span>
            <Badge>
              {ACCOUNT_TYPES.find(t => t.value === wizardData.accountType)?.label}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>طبيعة الرصيد:</span>
            <Badge variant={wizardData.balanceType === 'debit' ? 'default' : 'secondary'}>
              {wizardData.balanceType === 'debit' ? 'مدين' : 'دائن'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            مراجعة بيانات الحساب الجديد
          </CardTitle>
          <CardDescription>
            تأكد من صحة البيانات قبل إنشاء الحساب
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">اسم الحساب</Label>
              <div className="font-medium">{wizardData.accountName}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">الاسم بالعربية</Label>
              <div className="font-medium">{wizardData.accountNameAr || 'غير محدد'}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">نوع الحساب</Label>
              <div className="font-medium">
                {ACCOUNT_TYPES.find(t => t.value === wizardData.accountType)?.label}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">طبيعة الرصيد</Label>
              <div className="font-medium">
                {wizardData.balanceType === 'debit' ? 'مدين' : 'دائن'}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">كود الحساب المقترح</Label>
            <div className="font-mono text-lg font-bold text-primary">
              {wizardData.suggestedCode || 'سيتم توليده تلقائياً'}
            </div>
          </div>

          {createSmartAccount.isError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {createSmartAccount.error?.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            معالج إنشاء الحسابات الذكي
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep >= step.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {step.id}
                </div>
                <div className="ml-3 hidden sm:block">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {step.description}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            السابق
          </Button>

          <div className="flex gap-2">
            {currentStep < steps.length ? (
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !canProceedFromStep1) ||
                  (currentStep === 2 && !canProceedFromStep2)
                }
                className="flex items-center gap-2"
              >
                التالي
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={createSmartAccount.isPending}
                className="flex items-center gap-2"
              >
                {createSmartAccount.isPending ? (
                  <>
                    <LoadingSpinner className="h-4 w-4" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    إنشاء الحساب
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};