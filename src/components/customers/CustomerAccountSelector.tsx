import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreditCard, Plus, Unlink, InfoIcon, Building, DollarSign, RefreshCw, Eye } from "lucide-react";
import { useAvailableCustomerAccounts, useCustomerLinkedAccounts, useLinkAccountToCustomer, useUnlinkAccountFromCustomer, useCompanyAccountSettings } from "@/hooks/useCustomerAccounts";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
interface CustomerAccountSelectorProps {
  customerId: string;
  customerName: string;
  mode?: 'view' | 'edit';
  companyId?: string;
}
interface CustomerAccountFormSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  companyId?: string;
}

// Form component for selecting accounts in customer creation
export function CustomerAccountFormSelector({
  value,
  onValueChange,
  placeholder = "اختر الحساب المحاسبي",
  disabled = false,
  companyId
}: CustomerAccountFormSelectorProps) {
  const {
    data: availableAccounts,
    isLoading,
    error,
    refetch
  } = useAvailableCustomerAccounts(companyId);
  const [showDebug, setShowDebug] = React.useState(true); // Enable debug by default

  console.log('🔧 CustomerAccountFormSelector (Chart Source):', {
    companyId,
    accountsCount: availableAccounts?.length || 0,
    isLoading,
    error: error?.message,
    value,
    found1130201: !!availableAccounts?.find(acc => acc.account_code === '1130201')
  });
  if (isLoading) {
    return <div className="flex items-center justify-center py-4">
        <LoadingSpinner />
        <span className="mr-2 text-sm text-muted-foreground">جاري تحميل الحسابات...</span>
      </div>;
  }
  if (error) {
    return <Alert variant="destructive">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          حدث خطأ في تحميل الحسابات: {error.message}
          <Button variant="link" size="sm" onClick={() => refetch()} className="p-0 ml-2 text-destructive underline">
            إعادة المحاولة
          </Button>
        </AlertDescription>
      </Alert>;
  }
  const filteredAccounts = availableAccounts?.filter(account => account.is_available) || [];
  const account1130201 = filteredAccounts.find(acc => acc.account_code === '1130201');
  return <div className="space-y-2">


      {/* Main HTML Select Component - Guaranteed to work */}
      <div className="space-y-2">
        <select value={value || ''} onChange={e => onValueChange(e.target.value)} disabled={disabled} className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          <option value="">{placeholder}</option>
          {filteredAccounts.map(account => <option key={account.id} value={account.id} style={{
          fontWeight: account.account_code === '1130201' ? 'bold' : 'normal',
          backgroundColor: account.account_code === '1130201' ? '#dcfce7' : 'white',
          color: 'black'
        }}>
              {account.account_code} - {account.account_name}
              {account.account_name_ar && account.account_name_ar !== account.account_name ? ` (${account.account_name_ar})` : ''}
              {account.account_code === '1130201' ? ' 🎯 الهدف' : ''}
            </option>)}
        </select>
        
        {filteredAccounts.length === 0 && <div className="text-center p-4 border border-dashed rounded-lg">
            <p className="text-muted-foreground text-sm">
              لا توجد حسابات متاحة للاختيار
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              إجمالي: {availableAccounts?.length || 0} | متاحة: {filteredAccounts.length}
            </p>
          </div>}
      </div>

      {/* Emergency Fallback */}
      {showDebug && filteredAccounts.length > 0 && <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                🚨 بديل HTML Select:
              </label>
              <select className="w-full p-2 border rounded" value={value || ''} onChange={e => {
            if (e.target.value) {
              onValueChange(e.target.value);
              console.log('✅ Selected via HTML:', e.target.value);
            }
          }}>
                <option value="">اختر حساب...</option>
                {filteredAccounts.map(account => <option key={account.id} value={account.id} style={{
              fontWeight: account.account_code === '1130201' ? 'bold' : 'normal',
              backgroundColor: account.account_code === '1130201' ? '#dcfce7' : 'white'
            }}>
                    {account.account_code} - {account.account_name}
                    {account.account_code === '1130201' ? ' 🎯' : ''}
                  </option>)}
              </select>
              {account1130201 && <p className="text-xs text-green-600">
          </p>}
            </div>
          </AlertDescription>
        </Alert>}
    </div>;
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
  const {
    data: availableAccounts,
    isLoading: loadingAvailable
  } = useAvailableCustomerAccounts(companyId);
  const {
    data: linkedAccounts,
    isLoading: loadingLinked
  } = useCustomerLinkedAccounts(customerId);
  const {
    data: settings
  } = useCompanyAccountSettings(companyId);
  const linkMutation = useLinkAccountToCustomer();
  const unlinkMutation = useUnlinkAccountFromCustomer();
  const formatCurrency = useCurrencyFormatter();
  console.log('🔍 CustomerAccountSelector Debug:', {
    customerId,
    customerName,
    availableAccounts: availableAccounts?.length || 0,
    linkedAccounts: linkedAccounts?.length || 0,
    settings
  });

  // Force refresh data
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setLastUpdate(new Date());
    queryClient.invalidateQueries({
      queryKey: ['available-customer-accounts-FROM-CHART']
    });
    queryClient.invalidateQueries({
      queryKey: ['customer-linked-accounts']
    });
    toast.success('تم تحديث البيانات');
  };

  // Handle account linking
  const handleLinkAccount = async () => {
    if (!selectedAccountId) {
      toast.error('يرجى اختيار حساب أولاً');
      return;
    }
    try {
      setIsLinking(true);
      await linkMutation.mutateAsync({
        customerId,
        accountId: selectedAccountId
      });
      setSelectedAccountId("");
      toast.success('تم ربط الحساب بنجاح');
    } catch (error) {
      console.error('Link account error:', error);
      toast.error('حدث خطأ في ربط الحساب');
    } finally {
      setIsLinking(false);
    }
  };

  // Handle account unlinking
  const handleUnlinkAccount = async (accountId: string) => {
    try {
      await unlinkMutation.mutateAsync({
        customerId,
        customerAccountId: accountId
      });
      toast.success('تم إلغاء ربط الحساب بنجاح');
    } catch (error) {
      console.error('Unlink account error:', error);
      toast.error('حدث خطأ في إلغاء ربط الحساب');
    }
  };

  // Get available accounts that are not already linked
  const getAvailableAccounts = () => {
    if (!availableAccounts) return [];
    const linkedAccountIds = linkedAccounts?.map(acc => acc.id) || [];
    return availableAccounts.filter(acc => !linkedAccountIds.includes(acc.id) && acc.is_available);
  };
  const availableAccountsList = getAvailableAccounts();
  if (loadingAvailable || loadingLinked) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            الحسابات المحاسبية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner />
        </CardContent>
      </Card>;
  }
  return <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          الحسابات المحاسبية للعميل: {customerName}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
          <Badge variant="outline" className="text-xs">
            آخر تحديث: {lastUpdate.toLocaleTimeString('ar-KW')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Settings Info */}
        {settings && <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div><strong>إعدادات الحسابات:</strong></div>
                <div>• إنشاء تلقائي: {settings.auto_create_account ? 'مفعل' : 'معطل'}</div>
                <div>• تمكين الاختيار: {settings.enable_account_selection ? 'مفعل' : 'معطل'}</div>
                <div>• نمط التسمية: {settings.account_naming_pattern}</div>
                <div>• التجميع: {settings.account_group_by}</div>
              </div>
            </AlertDescription>
          </Alert>}

        {/* Linked Accounts Section */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Building className="h-4 w-4" />
            الحسابات المربوطة ({linkedAccounts?.length || 0})
          </h4>
          
          {linkedAccounts && linkedAccounts.length > 0 ? <div className="grid gap-3">
              {linkedAccounts.map(account => <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="font-medium">
                        {account.chart_of_accounts.account_code} - {account.chart_of_accounts.account_name}
                      </div>
                      {account.chart_of_accounts.account_name_ar && <div className="text-sm text-muted-foreground">
                          {account.chart_of_accounts.account_name_ar}
                        </div>}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">محاسبي</Badge>
                        <Badge variant="secondary">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {formatCurrency.formatCurrency(account.chart_of_accounts.current_balance || 0)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {mode === 'edit' && <Button variant="destructive" size="sm" onClick={() => handleUnlinkAccount(account.id)} disabled={unlinkMutation.isPending}>
                      <Unlink className="h-4 w-4" />
                      إلغاء الربط
                    </Button>}
                </div>)}
            </div> : <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                لا توجد حسابات مربوطة حالياً بهذا العميل
              </AlertDescription>
            </Alert>}
        </div>

        {/* Add New Account Section */}
        {mode === 'edit' && <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              ربط حساب جديد
            </h4>

            {availableAccountsList.length > 0 ? <div className="flex gap-2">
                <div className="flex-1">
                  {useNativeSelect ? <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full p-2 border rounded-md">
                      <option value="">اختر حساب محاسبي...</option>
                      {availableAccountsList.map(account => <option key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </option>)}
                    </select> : <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر حساب محاسبي..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAccountsList.map(account => <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              <div>
                                <div className="font-medium">
                                  {account.account_code} - {account.account_name}
                                </div>
                                {account.account_name_ar && <div className="text-xs text-muted-foreground">
                                    {account.account_name_ar}
                                  </div>}
                              </div>
                            </div>
                          </SelectItem>)}
                      </SelectContent>
                    </Select>}
                </div>
                <Button onClick={handleLinkAccount} disabled={!selectedAccountId || isLinking} className="shrink-0">
                  {isLinking ? <>
                      <LoadingSpinner />
                      ربط...
                    </> : <>
                      <Plus className="h-4 w-4 mr-2" />
                      ربط
                    </>}
                </Button>
              </div> : <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  لا توجد حسابات متاحة للربط. جميع الحسابات المتاحة مربوطة بالفعل أو غير متاحة.
                </AlertDescription>
              </Alert>}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button variant="link" size="sm" onClick={() => setUseNativeSelect(!useNativeSelect)} className="p-0 h-auto">
                <Eye className="h-3 w-3 mr-1" />
                {useNativeSelect ? 'استخدام القائمة المتقدمة' : 'استخدام القائمة البسيطة'}
              </Button>
              <span>•</span>
              <span>الحسابات المتاحة: {availableAccountsList.length}</span>
            </div>
          </div>}

        {/* Debug Information */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">معلومات المطور</summary>
          <div className="mt-2 space-y-1">
            <div>Customer ID: {customerId}</div>
            <div>Available Accounts: {availableAccounts?.length || 0}</div>
            <div>Linked Accounts: {linkedAccounts?.length || 0}</div>
            <div>Available for Linking: {availableAccountsList.length}</div>
            <div>Refresh Key: {refreshKey}</div>
          </div>
        </details>
      </CardContent>
    </Card>;
}