import React, { useState, useEffect } from 'react';
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
import { useCreateAccount } from '@/hooks/useChartOfAccounts';
import { ParentAccountSelector } from '../ParentAccountSelector';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface WizardData {
  accountName: string;
  accountNameAr: string;
  accountType: string;
  parentAccountId?: string;
  suggestedCode?: string;
  accountCode?: string;
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

export const SmartAccountWizardTab: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    accountName: '',
    accountNameAr: '',
    accountType: 'assets',
  });

  const createSmartAccount = useCreateSmartAccount();
  const createAccount = useCreateAccount();
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
          setWizardData(prev => ({ 
            ...prev, 
            suggestedCode: code,
            // Only update accountCode if it's empty or matches the previous suggestion
            accountCode: !prev.accountCode || prev.accountCode === prev.suggestedCode ? code : prev.accountCode
          }));
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
    // If user has customized the account code, use manual creation
    const useCustomCode = wizardData.accountCode && wizardData.accountCode !== wizardData.suggestedCode;
    
    if (useCustomCode) {
      // Use regular account creation with custom code
      createAccount.mutate({
        account_code: wizardData.accountCode!,
        account_name: wizardData.accountName,
        account_name_ar: wizardData.accountNameAr || '',
        account_type: wizardData.accountType,
        balance_type: wizardData.balanceType || 'debit',
        parent_account_id: wizardData.parentAccountId || '',
        is_header: false,
        description: ''
      }, {
        onSuccess: () => {
          resetWizard();
        },
      });
    } else {
      // Use smart account creation with auto-generated code
      createSmartAccount.mutate({
        accountName: wizardData.accountName,
        accountNameAr: wizardData.accountNameAr,
        accountType: wizardData.accountType,
        parentAccountId: wizardData.parentAccountId,
        autoGenerateCode: true,
      }, {
        onSuccess: () => {
          resetWizard();
        },
      });
    }
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
        <ParentAccountSelector
          value={wizardData.parentAccountId}
          onValueChange={(value) => setWizardData(prev => ({ ...prev, parentAccountId: value }))}
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
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">كود الحساب</span>
            </div>
            <div>
              <Label htmlFor="accountCode">كود الحساب (قابل للتعديل)</Label>
              <Input
                id="accountCode"
                value={wizardData.accountCode || wizardData.suggestedCode}
                onChange={(e) => setWizardData(prev => ({ ...prev, accountCode: e.target.value }))}
                placeholder="أدخل كود الحساب"
                className="font-mono"
              />
              {wizardData.suggestedCode && wizardData.accountCode !== wizardData.suggestedCode && (
                <div className="text-xs text-muted-foreground mt-1">
                  الكود المقترح: {wizardData.suggestedCode}
                </div>
              )}
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
            <Label className="text-xs text-muted-foreground">كود الحساب</Label>
            <div className="flex items-center gap-2">
              <Input
                value={wizardData.accountCode || wizardData.suggestedCode || ''}
                onChange={(e) => setWizardData(prev => ({ ...prev, accountCode: e.target.value }))}
                className="font-mono text-lg font-bold flex-1"
                placeholder="سيتم توليده تلقائياً"
              />
              {wizardData.suggestedCode && wizardData.accountCode !== wizardData.suggestedCode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWizardData(prev => ({ ...prev, accountCode: prev.suggestedCode }))}
                  className="whitespace-nowrap"
                >
                  استعادة المقترح
                </Button>
              )}
            </div>
            {wizardData.suggestedCode && wizardData.accountCode !== wizardData.suggestedCode && (
              <div className="text-xs text-muted-foreground">
                الكود المقترح: {wizardData.suggestedCode}
              </div>
            )}
          </div>

          {createSmartAccount.isError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {createSmartAccount.error?.message}
            </div>
          )}
          {createAccount.isError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {createAccount.error?.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          معالج إنشاء الحسابات الذكي
        </CardTitle>
        <CardDescription>
          أداة ذكية لإنشاء الحسابات مع تولید الأكواد تلقائياً وتحديد المستويات
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
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
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-4" />
              )}
            </div>
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
                disabled={createSmartAccount.isPending || createAccount.isPending}
                className="flex items-center gap-2"
              >
                {(createSmartAccount.isPending || createAccount.isPending) ? (
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
      </CardContent>
    </Card>
  );
};