import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useCustomerAccounts } from '@/hooks/useEnhancedCustomerAccounts';

interface CustomerAccountStatusProps {
  customerId: string;
  customerName: string;
  inline?: boolean;
}

export const CustomerAccountStatus: React.FC<CustomerAccountStatusProps> = ({ 
  customerId, 
  customerName, 
  inline = false 
}) => {
  const { data: accounts = [], isLoading } = useCustomerAccounts(customerId);
  
  if (isLoading) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        <AlertCircle className="h-3 w-3 ml-1" />
        جارٍ التحقق...
      </Badge>
    );
  }

  const hasAccounts = accounts.length > 0;
  const defaultAccount = accounts.find(acc => acc.is_default);

  if (inline) {
    return hasAccounts ? (
      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle2 className="h-3 w-3 ml-1" />
        {accounts.length} حساب محاسبي
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 ml-1" />
        لا يوجد حساب محاسبي
      </Badge>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">{customerName}</h4>
            <p className="text-sm text-muted-foreground">حالة الحساب المحاسبي</p>
          </div>
          <div className="text-right">
            {hasAccounts ? (
              <div className="space-y-1">
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle2 className="h-3 w-3 ml-1" />
                  {accounts.length} حساب
                </Badge>
                {defaultAccount && (
                  <div className="text-xs text-muted-foreground">
                    افتراضي: {defaultAccount.account?.account_code}
                  </div>
                )}
              </div>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 ml-1" />
                لا يوجد حساب
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};