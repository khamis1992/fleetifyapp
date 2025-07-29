import React from 'react';
import { CustomerAccountSettings } from '@/components/settings/CustomerAccountSettings';

export default function CustomerAccountSettingsPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إعدادات الحسابات المحاسبية للعملاء</h1>
          <p className="text-muted-foreground">إدارة كيفية إنشاء وربط الحسابات المحاسبية للعملاء</p>
        </div>
        
        <CustomerAccountSettings />
      </div>
    </div>
  );
}