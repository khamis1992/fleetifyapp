import React, { useState, useEffect } from 'react';
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
  DollarSign,
  RefreshCw,
  Eye
} from "lucide-react";
import { 
  useAvailableCustomerAccounts,
  useCustomerLinkedAccounts,
  useLinkAccountToCustomer,
  useUnlinkAccountFromCustomer,
  useCompanyAccountSettings
} from "@/hooks/useCustomerAccounts";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  const [useNativeSelect, setUseNativeSelect] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const queryClient = useQueryClient();

  const { data: availableAccounts, isLoading: loadingAvailable } = useAvailableCustomerAccounts(companyId);
  const { data: linkedAccounts, isLoading: loadingLinked } = useCustomerLinkedAccounts(customerId);
  const { data: companySettings } = useCompanyAccountSettings(companyId);
  const linkAccountMutation = useLinkAccountToCustomer();
  const unlinkAccountMutation = useUnlinkAccountFromCustomer();

  // Force re-render when data changes
  useEffect(() => {
    if (availableAccounts) {
      setLastUpdate(new Date());
      console.log('🔄 [CustomerAccountSelector] Data updated at:', new Date().toLocaleTimeString());
    }
  }, [availableAccounts]);

  // Enhanced force refresh function with comprehensive cache clearing
  const handleForceRefresh = () => {
    console.log('🔄 [REFRESH] Starting comprehensive refresh...');
    
    // Clear all related caches
    queryClient.invalidateQueries({ queryKey: ['available-customer-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['available-customer-accounts-v2'] });
    queryClient.invalidateQueries({ queryKey: ['customer-linked-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['company-account-settings'] });
    
    // Remove cached data completely
    queryClient.removeQueries({ queryKey: ['available-customer-accounts'] });
    queryClient.removeQueries({ queryKey: ['available-customer-accounts-v2'] });
    
    setRefreshKey(prev => prev + 1);
    setLastUpdate(new Date());
    
    console.log('🔄 [REFRESH] Cache cleared, forcing re-fetch...');
    toast.success('تم تحديث البيانات بالكامل');
  };
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

  // تشخيص المشكلة الحقيقية: إزالة فلترة is_available مؤقتاً لاختبار العرض
  const availableAccountsForSelection = React.useMemo(() => {
    if (!availableAccounts) return [];
    
    console.log('🔍 [FILTERING] Starting filtering process:', {
      totalAccounts: availableAccounts.length,
      timestamp: new Date().toLocaleTimeString()
    });
    
    // إظهار جميع الحسابات بدون فلترة is_available للتشخيص
    const filtered = availableAccounts.filter(acc => {
      // التأكد من أن الحساب لديه معرف صحيح
      const hasValidId = Boolean(acc.id);
      const hasValidCode = Boolean(acc.account_code);
      
      // Special logging for account 1130201
      if (acc.account_code === '1130201') {
        console.log('🎯 [FILTERING] Account 1130201 complete analysis:', {
          account: acc,
          hasValidId: hasValidId,
          hasValidCode: hasValidCode,
          isAvailable: acc.is_available,
          willBeIncluded: hasValidId && hasValidCode
        });
      }
      
      // إرجاع جميع الحسابات التي لديها معرف وكود صحيح (بدون فلترة is_available)
      return hasValidId && hasValidCode;
    });
    
    console.log('🔍 [FILTERING] Filter results (no is_available filter):', {
      originalCount: availableAccounts.length,
      filteredCount: filtered.length,
      account1130201Found: !!filtered.find(acc => acc.account_code === '1130201'),
      allCodes: filtered.map(acc => ({ code: acc.account_code, available: acc.is_available }))
    });
    
    return filtered;
  }, [availableAccounts]);
  
  // Additional validation logging
  React.useEffect(() => {
    if (availableAccountsForSelection.length > 0) {
      const target = availableAccountsForSelection.find(acc => acc.account_code === '1130201');
      console.log('📊 [VALIDATION] Account 1130201 in selection list:', {
        found: !!target,
        account: target,
        listLength: availableAccountsForSelection.length
      });
    }
  }, [availableAccountsForSelection]);

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

        {/* أزرار التشخيص والتحكم */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            onClick={handleForceRefresh} 
            size="sm" 
            variant="outline"
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            تحديث البيانات
          </Button>
          <Button 
            onClick={() => setUseNativeSelect(!useNativeSelect)} 
            size="sm" 
            variant="outline"
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            {useNativeSelect ? 'عرض Radix' : 'عرض HTML'}
          </Button>
        </div>

        {/* إضافة حساب جديد */}
        {mode === 'edit' && availableAccountsForSelection.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium text-sm">ربط حساب جديد:</h4>
            <div className="flex gap-2">
              {useNativeSelect ? (
                /* Native HTML Select for testing */
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">اختر حساب محاسبي جديد (HTML Select)</label>
                  <select 
                    value={selectedAccountId} 
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    disabled={isLinking}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="">اختر حساب محاسبي جديد</option>
                    {availableAccountsForSelection.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_code} - {account.account_name}
                        {account.account_name_ar && ` (${account.account_name_ar})`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Original Radix Select */
                <Select 
                  key={`select-${refreshKey}`}
                  value={selectedAccountId} 
                  onValueChange={setSelectedAccountId}
                >
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
              )}
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

        {/* رسالة عدم وجود حسابات متاحة - محدثة */}
        {mode === 'edit' && availableAccountsForSelection.length === 0 && availableAccounts && availableAccounts.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <InfoIcon className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>تشخيص المشكلة:</strong> يوجد {availableAccounts.length} حساب في البيانات الأصلية لكن لا يظهر أي منها في القائمة.
              <br />
              <span className="text-sm mt-1 block">
                هذا يشير إلى مشكلة في العرض أو الفلترة، وليس في البيانات نفسها.
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

        {/* Enhanced Debug Panel */}
        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-blue-200">
          <h4 className="font-bold text-sm mb-2 text-blue-700">🔍 معلومات التشخيص المتقدمة</h4>
          <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
            <p><strong>آخر تحديث:</strong> {lastUpdate.toLocaleTimeString()}</p>
            <p><strong>مفتاح التحديث:</strong> {refreshKey}</p>
            <p><strong>نوع القائمة المنسدلة:</strong> {useNativeSelect ? 'HTML Select' : 'Radix Select'}</p>
            <p><strong>إجمالي الحسابات المتاحة:</strong> {availableAccounts?.length || 0}</p>
            <p><strong>الحسابات بعد الفلترة الأساسية:</strong> {availableAccountsForSelection.length}</p>
            <p className="bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded"><strong>الحساب المطلوب (1130201):</strong> {
              availableAccounts?.find(acc => acc.account_code === '1130201') ? 
              `✅ موجود في البيانات - is_available: ${availableAccounts.find(acc => acc.account_code === '1130201')?.is_available}` : 
              '❌ غير موجود في البيانات'
            }</p>
            <p className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded"><strong>الحساب في القائمة النهائية:</strong> {
              availableAccountsForSelection.find(acc => acc.account_code === '1130201') ? 
              '✅ موجود في القائمة المنسدلة' : 
              '❌ مفقود من القائمة المنسدلة - هذه هي المشكلة!'
            }</p>
            <details className="mt-2">
              <summary className="cursor-pointer font-medium">عرض جميع أكواد الحسابات المفلترة</summary>
              <div className="mt-1 p-2 bg-white dark:bg-slate-700 rounded text-xs">
                {availableAccountsForSelection.map(acc => acc.account_code).join(', ') || 'لا توجد حسابات'}
              </div>
            </details>
            <details className="mt-2">
              <summary className="cursor-pointer font-medium">عرض البيانات الخام</summary>
              <div className="mt-1 p-2 bg-white dark:bg-slate-700 rounded text-xs">
                <pre className="whitespace-pre-wrap text-xs">
                  {JSON.stringify({
                    availableAccounts: availableAccounts?.slice(0, 3), // First 3 for brevity
                    targetAccount: availableAccounts?.find(acc => acc.account_code === '1130201'),
                    filteredCount: availableAccountsForSelection.length
                  }, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        </div>

        {/* Test Component - Direct Account Display */}
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
          <h4 className="font-bold text-sm mb-2 text-yellow-700 dark:text-yellow-300">🧪 اختبار العرض المباشر</h4>
          <div className="space-y-2">
            {availableAccountsForSelection.slice(0, 5).map((account) => (
              <div 
                key={account.id}
                className={`p-2 rounded border text-xs ${
                  account.account_code === '1130201' 
                    ? 'bg-green-100 border-green-300 dark:bg-green-900/20' 
                    : 'bg-white border-gray-200 dark:bg-slate-700'
                }`}
              >
                <strong>{account.account_code}</strong> - {account.account_name}
                {account.account_code === '1130201' && (
                  <Badge className="ml-2 bg-green-500">المطلوب!</Badge>
                )}
              </div>
            ))}
            {availableAccountsForSelection.length > 5 && (
              <p className="text-xs text-muted-foreground">
                ... و {availableAccountsForSelection.length - 5} حساب آخر
              </p>
            )}
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