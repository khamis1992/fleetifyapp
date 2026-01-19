import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateAccountsForExistingCustomers } from '@/components/customers/CreateAccountsForExistingCustomers';
import { FixCustomerAccounts } from '@/components/customers/FixCustomerAccounts';
import { FixCustomerAccountsUtility } from '@/components/customers/FixCustomerAccountsUtility';
import { Settings } from 'lucide-react';

export const CustomerAccountSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">إعدادات حسابات العملاء</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>نظام إنشاء الحسابات التلقائي</CardTitle>
          <CardDescription>
            إدارة إعدادات إنشاء الحسابات المحاسبية للعملاء تلقائياً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              يتم إنشاء الحسابات المحاسبية للعملاء الجدد تلقائياً عند إضافتهم إلى النظام.
              إذا لم يتم العثور على حساب مدينين افتراضي، سيتم إنشاؤه تلقائياً.
            </p>
            <p>
              <strong>ملاحظة:</strong> يجب أن يكون لديك دليل حسابات محاسبية مُعد بشكل صحيح لضمان عمل النظام بالشكل المطلوب.
            </p>
          </div>
        </CardContent>
      </Card>

      <FixCustomerAccountsUtility />
      
      <CreateAccountsForExistingCustomers />
      
      <FixCustomerAccounts />
    </div>
  );
};