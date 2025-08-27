import React, { useState } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Control } from 'react-hook-form';
import { LinkIcon, Eye, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { VendorAccountSelector } from '@/components/finance/VendorAccountSelector';

interface AccountLinkingProps {
  control: Control<any>;
  customerType: string;
  customerName?: string;
  companyName?: string;
}

export const AccountLinking: React.FC<AccountLinkingProps> = ({ 
  control, 
  customerType,
  customerName,
  companyName 
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const getCustomerDisplayName = () => {
    if (customerType === 'company') {
      return companyName || 'الشركة';
    }
    return customerName || 'العميل';
  };

  const generateAccountCode = (accountType: string) => {
    const baseCode = customerType === 'company' ? '1210' : '1211';
    const suffix = Math.random().toString().slice(2, 5);
    return `${baseCode}${suffix}`;
  };

  const accountTypes = [
    {
      id: 'receivables',
      name: 'ذمم مدينة - عملاء',
      description: 'حساب المبالغ المستحقة من العميل',
      required: true,
      color: 'bg-primary/10 text-primary border-primary/20'
    },
    {
      id: 'advances',
      name: 'سلف وعهد عملاء',
      description: 'حساب السلف والعهد المدفوعة للعميل',
      required: false,
      color: 'bg-secondary/10 text-secondary border-secondary/20'
    },
    {
      id: 'deposits',
      name: 'أمانات عملاء',
      description: 'حساب الأمانات المحصلة من العميل',
      required: false,
      color: 'bg-accent/10 text-accent border-accent/20'
    },
    {
      id: 'discounts',
      name: 'خصومات مسموحة',
      description: 'حساب الخصومات الممنوحة للعميل',
      required: false,
      color: 'bg-warning/10 text-warning border-warning/20'
    }
  ];

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <LinkIcon className="h-5 w-5 text-primary" />
          ربط الحسابات المحاسبية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-Generation Alert */}
        <Alert className="border-primary/20 bg-primary/5">
          <Zap className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            سيتم إنشاء الحسابات المحاسبية تلقائياً للعميل "{getCustomerDisplayName()}" 
            بناءً على التصنيف والنوع المحدد. يمكنك مراجعة الحسابات المقترحة أدناه.
          </AlertDescription>
        </Alert>

        {/* Account Types Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">أنواع الحسابات المطلوبة</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewVisible(!previewVisible)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {previewVisible ? 'إخفاء المعاينة' : 'معاينة الحسابات'}
            </Button>
          </div>

          <div className="grid gap-4">
            {accountTypes.map((accountType) => (
              <div key={accountType.id} className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{accountType.name}</span>
                        {accountType.required && (
                          <Badge variant="destructive" className="text-xs">
                            مطلوب
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {accountType.description}
                      </p>
                    </div>
                  </div>
                  
                  <FormField
                    control={control}
                    name={`accounts.${accountType.id}`}
                    render={({ field }) => (
                      <FormItem className="min-w-[250px]">
                        <FormControl>
                          <VendorAccountSelector
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="اختر الحساب المحاسبي"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Preview Section */}
                {previewVisible && (
                  <div className={`p-3 rounded-md border ${accountType.color}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span>كود الحساب المقترح:</span>
                      <span className="font-mono">{generateAccountCode(accountType.id)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span>اسم الحساب:</span>
                      <span>{getCustomerDisplayName()} - {accountType.name}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Account Generation Summary */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            ملخص الحسابات المحاسبية
          </h4>
          
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>عدد الحسابات المطلوبة:</span>
              <span className="font-medium">{accountTypes.filter(t => t.required).length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>عدد الحسابات الاختيارية:</span>
              <span className="font-medium">{accountTypes.filter(t => !t.required).length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>نمط ترقيم الحسابات:</span>
              <span className="font-medium">تلقائي حسب نوع العميل</span>
            </div>
          </div>
        </div>

        {/* Validation Alert */}
        <Alert className="border-warning/20 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            تأكد من اختيار الحسابات المحاسبية المناسبة قبل الحفظ. 
            لا يمكن تعديل ربط الحسابات بعد إنشاء العميل إلا من قبل المدير المالي.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};