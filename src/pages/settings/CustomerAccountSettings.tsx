import React from 'react';
import { CustomerAccountSettings } from '@/components/settings/CustomerAccountSettings';
import { CreditCard } from 'lucide-react';

export default function CustomerAccountSettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 container mx-auto py-6 px-4 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg shadow-teal-500/20">
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