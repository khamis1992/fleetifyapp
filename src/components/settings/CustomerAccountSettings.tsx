import React from 'react';
import { useForm, Controller } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  CreditCard, 
  Settings as SettingsIcon,
  InfoIcon,
  Save
} from "lucide-react";
import { 
  useCompanyAccountSettings,
  useUpdateCompanyAccountSettings,
  CompanyAccountSettings
} from "@/hooks/useCustomerAccounts";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";

export function CustomerAccountSettings() {
  const { data: settings, isLoading } = useCompanyAccountSettings();
  const { data: chartOfAccounts } = useChartOfAccounts();
  const updateSettingsMutation = useUpdateCompanyAccountSettings();

  const { register, handleSubmit, control, watch, reset } = useForm<CompanyAccountSettings>({
    defaultValues: {
      enable_account_selection: true,
      default_receivables_account_id: null,
      account_prefix: "CUST-",
      auto_create_account: true,
      account_naming_pattern: 'customer_name',
      account_group_by: 'customer_type'
    }
  });

  React.useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const enableAccountSelection = watch('enable_account_selection');
  const autoCreateAccount = watch('auto_create_account');

  const onSubmit = async (data: CompanyAccountSettings) => {
    await updateSettingsMutation.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <LoadingSpinner className="h-6 w-6" />
          <span className="mr-2">جاري تحميل الإعدادات...</span>
        </CardContent>
      </Card>
    );
  }

  // حسابات الذمم المدينة المتاحة
  const receivableAccounts = chartOfAccounts?.filter(account => 
    account.account_type === 'assets' && 
    (account.account_name.toLowerCase().includes('receivable') ||
     account.account_name.includes('مدين') ||
     account.account_name.includes('ذمم') ||
     account.account_code.startsWith('112'))
  ) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          إعدادات الحسابات المحاسبية للعملاء
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* تمكين اختيار الحسابات */}
          <div className="space-y-4">
            <Controller
              name="enable_account_selection"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      السماح باختيار الحسابات المحاسبية
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      يمكن للمستخدمين اختيار حسابات محاسبية مخصصة للعملاء
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

            {enableAccountSelection && (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  عند تمكين هذا الخيار، سيتمكن المستخدمون من ربط العملاء بحسابات محاسبية محددة.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* الإنشاء التلقائي للحسابات */}
          <div className="space-y-4">
            <Controller
              name="auto_create_account"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      إنشاء الحسابات تلقائياً
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      ينشئ النظام حساباً محاسبياً جديداً لكل عميل تلقائياً
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          </div>

          {/* إعدادات الحساب الافتراضي */}
          {autoCreateAccount && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                إعدادات الحسابات التلقائية
              </h4>

              {/* الحساب الأب للمدينين */}
              <div className="space-y-2">
                <Label>الحساب الرئيسي للمدينين</Label>
                <Controller
                  name="default_receivables_account_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب الرئيسي..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">استخدام الافتراضي</SelectItem>
                        {receivableAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  سيتم إنشاء حسابات فرعية تحت هذا الحساب
                </p>
              </div>

              {/* بادئة رمز الحساب */}
              <div className="space-y-2">
                <Label>بادئة رمز الحساب</Label>
                <Input
                  {...register('account_prefix')}
                  placeholder="CUST-"
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  ستُضاف هذه البادئة قبل رقم الحساب
                </p>
              </div>

              {/* نمط تسمية الحسابات */}
              <div className="space-y-2">
                <Label>نمط تسمية الحسابات</Label>
                <Controller
                  name="account_naming_pattern"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer_name">اسم العميل</SelectItem>
                        <SelectItem value="customer_id">معرف العميل</SelectItem>
                        <SelectItem value="custom">مخصص</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  كيفية تسمية الحسابات المحاسبية الجديدة
                </p>
              </div>

              {/* تجميع الحسابات */}
              <div className="space-y-2">
                <Label>تجميع الحسابات حسب</Label>
                <Controller
                  name="account_group_by"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer_type">نوع العميل (فرد/شركة)</SelectItem>
                        <SelectItem value="none">بدون تجميع</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  طريقة تجميع الحسابات في الهيكل المحاسبي
                </p>
              </div>
            </div>
          )}

          {/* أزرار الحفظ */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="flex items-center gap-2"
            >
              {updateSettingsMutation.isPending ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ الإعدادات
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}