import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Customer } from '@/types/customer';
import { CustomerAccountsManager } from './CustomerAccountsManager';
import { CustomerAccountStatement } from './CustomerAccountStatement';
import { CustomerAccountBalance } from './CustomerAccountBalance';
import { useCustomerAccounts } from '@/hooks/useEnhancedCustomerAccounts';

interface CustomerAccountTabsProps {
  customer: Customer;
}

export const CustomerAccountTabs: React.FC<CustomerAccountTabsProps> = ({ customer }) => {
  const { data: accounts = [] } = useCustomerAccounts(customer.id);

  return (
    <Tabs defaultValue="manage" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="manage">إدارة الحسابات</TabsTrigger>
        <TabsTrigger value="balance">الأرصدة</TabsTrigger>
        <TabsTrigger value="statement">كشف الحساب</TabsTrigger>
      </TabsList>
      
      <TabsContent value="manage" className="space-y-4">
        <CustomerAccountsManager customer={customer} />
      </TabsContent>
      
      <TabsContent value="balance" className="space-y-4">
        <CustomerAccountBalance accounts={accounts} />
      </TabsContent>
      
      <TabsContent value="statement" className="space-y-4">
        <CustomerAccountStatement customer={customer} />
      </TabsContent>
    </Tabs>
  );
};