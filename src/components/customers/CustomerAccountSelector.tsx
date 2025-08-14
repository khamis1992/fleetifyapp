import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

// Advanced Account Selector Component
function AdvancedAccountSelector({
  value,
  onValueChange,
  placeholder = "اختر حساب محاسبي أو اتركه فارغاً للإنشاء التلقائي...",
  disabled = false,
  availableAccounts = []
}: {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  availableAccounts: any[];
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [autoCreate, setAutoCreate] = useState(false);

  const filteredAccounts = availableAccounts.filter(account =>
    account.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (account.account_name_ar && account.account_name_ar.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedAccount = availableAccounts.find(acc => acc.id === value);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          اختيار حساب محاسبي مخصص (اختياري)
        </label>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-auto min-h-[40px] px-3 py-2"
              disabled={disabled}
            >
              <div className="flex items-center gap-2 text-right flex-1">
                {selectedAccount ? (
                  <div className="text-right">
                    <div className="font-medium">{selectedAccount.account_code} - {selectedAccount.account_name}</div>
                    {selectedAccount.account_name_ar && (
                      <div className="text-xs text-muted-foreground">{selectedAccount.account_name_ar}</div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  {filteredAccounts.length}
                </Badge>
                <div className="w-4 h-4 opacity-50" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 z-50 bg-background border shadow-lg" align="start">
            <div className="p-3 space-y-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث في الحسابات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>

              {/* Auto-create option */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <input
                  type="checkbox"
                  id="auto-create"
                  checked={autoCreate}
                  onChange={(e) => {
                    setAutoCreate(e.target.checked);
                    if (e.target.checked) {
                      onValueChange("");
                      setOpen(false);
                    }
                  }}
                  className="h-4 w-4"
                />
                <label htmlFor="auto-create" className="text-sm font-medium cursor-pointer">
                  إنشاء حساب تلقائياً
                </label>
                <span className="text-xs text-green-600">✓</span>
              </div>

              {/* Accounts list */}
              <div className="max-h-60 overflow-auto space-y-1">
                {filteredAccounts.length > 0 ? (
                  filteredAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                        value === account.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50 border-transparent'
                      }`}
                      onClick={() => {
                        onValueChange(account.id);
                        setAutoCreate(false);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-right">
                          <div className="font-medium text-sm">
                            {account.account_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {account.account_code} | Current Assets
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    لا توجد حسابات تطابق البحث
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <LoadingSpinner />
        <span className="mr-2 text-sm text-muted-foreground">جاري تحميل الحسابات...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          حدث خطأ في تحميل الحسابات: {error.message}
          <Button variant="link" size="sm" onClick={() => refetch()} className="p-0 ml-2 text-destructive underline">
            إعادة المحاولة
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const filteredAccounts = availableAccounts?.filter(account => account.is_available) || [];

  return (
    <AdvancedAccountSelector
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
      availableAccounts={filteredAccounts}
    />
  );
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

            {availableAccountsList.length > 0 ? (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-auto min-h-[40px] px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-right flex-1">
                          {selectedAccountId ? (
                            (() => {
                              const selectedAccount = availableAccountsList.find(acc => acc.id === selectedAccountId);
                              return selectedAccount ? (
                                <div className="text-right">
                                  <div className="font-medium">{selectedAccount.account_code} - {selectedAccount.account_name}</div>
                                  {selectedAccount.account_name_ar && (
                                    <div className="text-xs text-muted-foreground">{selectedAccount.account_name_ar}</div>
                                  )}
                                </div>
                              ) : <span className="text-muted-foreground">اختر حساب محاسبي...</span>;
                            })()
                          ) : (
                            <span className="text-muted-foreground">اختر حساب محاسبي...</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {availableAccountsList.length}
                          </Badge>
                          <div className="w-4 h-4 opacity-50" />
                        </div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-50 bg-background border shadow-lg" align="start">
                      <div className="p-3 space-y-3">
                        {/* Accounts list */}
                        <div className="max-h-60 overflow-auto space-y-1">
                          {availableAccountsList.map((account) => (
                            <div
                              key={account.id}
                              className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                                selectedAccountId === account.id 
                                  ? 'bg-primary/10 border-primary' 
                                  : 'hover:bg-muted/50 border-transparent'
                              }`}
                              onClick={() => setSelectedAccountId(account.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-right">
                                  <div className="font-medium text-sm">
                                    {account.account_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {account.account_code} | Current Assets
                                  </div>
                                  {account.account_name_ar && (
                                    <div className="text-xs text-muted-foreground">
                                      {account.account_name_ar}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
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
              </div>
            ) : (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  لا توجد حسابات متاحة للربط. جميع الحسابات المتاحة مربوطة بالفعل أو غير متاحة.
                </AlertDescription>
              </Alert>
            )}

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