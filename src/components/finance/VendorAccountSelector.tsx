import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building, TrendingDown, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

interface AvailableAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  parent_account_name?: string;
  is_available: boolean;
  account_type: string;
}

interface VendorAccountSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  accountType?: 'payable' | 'expense' | 'advance';
  placeholder?: string;
  disabled?: boolean;
}

const useAvailableVendorAccounts = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['available-vendor-accounts', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');

      const { data, error } = await supabase
        .rpc('get_available_vendor_accounts', {
          company_id_param: companyId
        });

      if (error) throw error;
      return data as AvailableAccount[];
    },
    enabled: !!companyId,
  });
};

const getAccountTypeIcon = (accountType: string) => {
  switch (accountType) {
    case 'liabilities':
      return <CreditCard className="h-4 w-4 text-orange-500" />;
    case 'expenses':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'assets':
      return <Building className="h-4 w-4 text-blue-500" />;
    default:
      return <Building className="h-4 w-4 text-muted-foreground" />;
  }
};

const getAccountTypeBadge = (accountType: string) => {
  switch (accountType) {
    case 'liabilities':
      return <Badge variant="secondary" className="bg-orange-100 text-orange-700">خصوم</Badge>;
    case 'expenses':
      return <Badge variant="secondary" className="bg-red-100 text-red-700">مصاريف</Badge>;
    case 'assets':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700">أصول</Badge>;
    default:
      return <Badge variant="outline">{accountType}</Badge>;
  }
};

const filterAccountsByType = (accounts: AvailableAccount[], accountType?: 'payable' | 'expense' | 'advance') => {
  if (!accountType) return accounts;

  return accounts.filter(account => {
    switch (accountType) {
      case 'payable':
        return account.account_type === 'liabilities' || 
               account.account_name.toLowerCase().includes('payable') ||
               account.account_name.includes('دائن') ||
               account.account_name.includes('موردين');
      case 'expense':
        return account.account_type === 'expenses';
      case 'advance':
        return account.account_type === 'assets' && 
               (account.account_name.toLowerCase().includes('advance') ||
                account.account_name.includes('مقدم'));
      default:
        return true;
    }
  });
};

export const VendorAccountSelector: React.FC<VendorAccountSelectorProps> = ({
  value,
  onValueChange,
  accountType,
  placeholder = "اختر الحساب المحاسبي",
  disabled = false,
}) => {
  const { data: accounts, isLoading, error } = useAvailableVendorAccounts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-destructive text-sm">حدث خطأ في تحميل الحسابات</p>
        </CardContent>
      </Card>
    );
  }

  const filteredAccounts = filterAccountsByType(accounts || [], accountType);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filteredAccounts.map((account) => (
          <SelectItem 
            key={account.id} 
            value={account.id}
            disabled={!account.is_available}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {getAccountTypeIcon(account.account_type)}
                <div className="flex flex-col items-start">
                  <span className="font-medium">
                    {account.account_code} - {account.account_name}
                  </span>
                  {account.account_name_ar && (
                    <span className="text-sm text-muted-foreground">
                      {account.account_name_ar}
                    </span>
                  )}
                  {account.parent_account_name && (
                    <span className="text-xs text-muted-foreground">
                      تحت: {account.parent_account_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getAccountTypeBadge(account.account_type)}
                {!account.is_available && (
                  <Badge variant="destructive" className="text-xs">مستخدم</Badge>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
        {filteredAccounts.length === 0 && (
          <div className="py-4 text-center text-muted-foreground">
            لا توجد حسابات متاحة
          </div>
        )}
      </SelectContent>
    </Select>
  );
};