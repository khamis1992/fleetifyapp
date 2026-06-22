import React from 'react';
import { CustomerAccountSettings } from '@/components/settings/CustomerAccountSettings';
import { CreditCard } from 'lucide-react';

export default function CustomerAccountSettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 container mx-auto py-6 px-4 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500 rounded-xl shadow-sm">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">إعدادات الحسابات المحاسبية للعملاء</h1>
            <p className="text-slate-600">إدارة كيفية إنشاء وربط الحسابات المحاسبية للعملاء</p>
          </div>
        </div>

        <CustomerAccountSettings />
      </div>
    </div>
  );
}