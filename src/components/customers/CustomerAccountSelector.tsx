import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  CreditCard, 
  Plus, 
  Unlink, 
  InfoIcon,
  Building,
  DollarSign
} from "lucide-react";
import { 
  useAvailableCustomerAccounts,
  useCustomerLinkedAccounts,
  useLinkAccountToCustomer,
  useUnlinkAccountFromCustomer,
  useCompanyAccountSettings
} from "@/hooks/useCustomerAccounts";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

interface CustomerAccountSelectorProps {
  customerId: string;
  customerName: string;
  mode?: 'view' | 'edit';
  companyId?: string;
}

export function CustomerAccountSelector({ 
  customerId, 
  customerName, 
  mode = 'view',
  companyId
}: CustomerAccountSelectorProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);

  const { data: availableAccounts, isLoading: loadingAvailable } = useAvailableCustomerAccounts(companyId);
  const { data: linkedAccounts, isLoading: loadingLinked } = useCustomerLinkedAccounts(customerId);
  const { data: companySettings } = useCompanyAccountSettings(companyId);
  const linkAccountMutation = useLinkAccountToCustomer();
  const unlinkAccountMutation = useUnlinkAccountFromCustomer();
  const { formatCurrency } = useCurrencyFormatter();

  const handleLinkAccount = async () => {
    if (!selectedAccountId) return;
    
    setIsLinking(true);
    try {
      await linkAccountMutation.mutateAsync({
        customerId,
        accountId: selectedAccountId
      });
      setSelectedAccountId("");
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkAccount = async (customerAccountId: string) => {
    await unlinkAccountMutation.mutateAsync({
      customerId,
      customerAccountId
    });
  };

  if (loadingLinked || loadingAvailable) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <LoadingSpinner className="h-6 w-6" />
          <span className="mr-2">جاري تحميل الحسابات...</span>
        </CardContent>
      </Card>
    );
  }

  // إذا كانت الشركة لا تدعم اختيار الحسابات
  if (!companySettings?.enable_account_selection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            الحسابات المحاسبية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              يتم إنشاء الحسابات المحاسبية تلقائياً للعملاء في هذه الشركة.
            </AlertDescription>
          </Alert>
          
          {linkedAccounts && linkedAccounts.length > 0 && (
            <div className="mt-4 space-y-2">
              {linkedAccounts.map((link: any) => (
                <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{link.chart_of_accounts?.account_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {link.chart_of_accounts?.account_code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(link.chart_of_accounts?.current_balance ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Debug: تشخيص بيانات الحسابات
  console.log('🔍 [CustomerAccountSelector] Debug Info:', {
    totalAvailableAccounts: availableAccounts?.length || 0,
    availableAccounts: availableAccounts,
    searchingForAccount: '1130201',
    account1130201: availableAccounts?.find(acc => acc.account_code === '1130201'),
    companyId: companyId
  });

  const availableAccountsForSelection = availableAccounts?.filter(acc => acc.is_available) || [];
  
  // Debug: تشخيص بعد الفلترة
  console.log('🔍 [CustomerAccountSelector] After filtering:', {
    filteredAccountsCount: availableAccountsForSelection.length,
    account1130201AfterFilter: availableAccountsForSelection.find(acc => acc.account_code === '1130201'),
    allFilteredAccountCodes: availableAccountsForSelection.map(acc => acc.account_code)
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          إدارة الحسابات المحاسبية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* الحسابات المرتبطة حالياً */}
        {linkedAccounts && linkedAccounts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">الحسابات المرتبطة:</h4>
            {linkedAccounts.map((link: any) => (
              <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">{link.chart_of_accounts?.account_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {link.chart_of_accounts?.account_code}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(link.chart_of_accounts?.current_balance ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                  </Badge>
                  {mode === 'edit' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlinkAccount(link.id)}
                      disabled={unlinkAccountMutation.isPending}
                    >
                      <Unlink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* إضافة حساب جديد */}
        {mode === 'edit' && availableAccountsForSelection.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium text-sm">ربط حساب جديد:</h4>
            <div className="flex gap-2">
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="اختر حساب محاسبي..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAccountsForSelection.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{account.account_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {account.account_code} | {account.parent_account_name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleLinkAccount}
                disabled={!selectedAccountId || isLinking || linkAccountMutation.isPending}
                size="sm"
              >
                {isLinking || linkAccountMutation.isPending ? (
                  <LoadingSpinner className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                ربط
              </Button>
            </div>
          </div>
        )}

        {/* رسالة عدم وجود حسابات متاحة */}
        {mode === 'edit' && availableAccountsForSelection.length === 0 && availableAccounts && availableAccounts.length > 0 && (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              لا توجد حسابات محاسبية متاحة للربط. جميع الحسابات المناسبة للعملاء مستخدمة حالياً.
              <br />
              <span className="text-sm text-muted-foreground mt-1 block">
                إجمالي الحسابات الموجودة: {availableAccounts.length} - جميعها مرتبطة بعملاء آخرين
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* رسالة عدم وجود حسابات في دليل الحسابات */}
        {mode === 'edit' && (!availableAccounts || availableAccounts.length === 0) && (
          <Alert className="border-orange-200 bg-orange-50">
            <InfoIcon className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              لا توجد حسابات مناسبة للعملاء في دليل الحسابات. 
              <br />
              <span className="text-sm mt-1 block">
                يحتاج النظام إلى حسابات من نوع "الأصول" أو حسابات تحتوي على كلمات مثل "مدين"، "ذمم"، "عميل" أو "receivable"
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Debug Panel */}
        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-blue-200">
          <h4 className="font-bold text-sm mb-2 text-blue-700">🔍 معلومات التشخيص</h4>
          <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
            <p><strong>إجمالي الحسابات المتاحة:</strong> {availableAccounts?.length || 0}</p>
            <p><strong>الحسابات بعد فلترة is_available:</strong> {availableAccountsForSelection.length}</p>
            <p><strong>الحساب المطلوب (1130201):</strong> {
              availableAccounts?.find(acc => acc.account_code === '1130201') ? 
              `موجود - متاح: ${availableAccounts.find(acc => acc.account_code === '1130201')?.is_available}` : 
              'غير موجود'
            }</p>
            <p><strong>الحساب بعد الفلترة:</strong> {
              availableAccountsForSelection.find(acc => acc.account_code === '1130201') ? 
              'موجود في القائمة المنسدلة' : 
              'مفقود من القائمة المنسدلة'
            }</p>
            <details className="mt-2">
              <summary className="cursor-pointer font-medium">عرض جميع أكواد الحسابات المفلترة</summary>
              <div className="mt-1 p-2 bg-white dark:bg-slate-700 rounded text-xs">
                {availableAccountsForSelection.map(acc => acc.account_code).join(', ') || 'لا توجد حسابات'}
              </div>
            </details>
          </div>
        </div>

        {/* رسالة عدم وجود حسابات مرتبطة */}
        {(!linkedAccounts || linkedAccounts.length === 0) && (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              {companySettings?.auto_create_account 
                ? "سيتم إنشاء حساب محاسبي تلقائياً لهذا العميل." 
                : "لم يتم ربط أي حساب محاسبي بهذا العميل بعد."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}