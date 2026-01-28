/**
 * Quick Action Buttons Component
 * أزرار الإجراءات السريعة
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, DollarSign, FileText, Calendar, Car, Edit } from 'lucide-react';

export const QuickActionButtons: React.FC = () => {
  const actions = [
    { icon: Phone, label: 'تسجيل مكالمة', color: 'bg-blue-600 hover:bg-blue-700' },
    { icon: DollarSign, label: 'تسجيل دفعة', color: 'bg-green-600 hover:bg-green-700' },
    { icon: Edit, label: 'إضافة ملاحظة', color: 'bg-purple-600 hover:bg-purple-700' },
    { icon: Calendar, label: 'جدولة متابعة', color: 'bg-orange-600 hover:bg-orange-700' },
    { icon: Car, label: 'تسجيل مخالفة', color: 'bg-red-600 hover:bg-red-700' },
    { icon: FileText, label: 'طلب تجديد', color: 'bg-indigo-600 hover:bg-indigo-700' },
  ];

  return (
    <div className="mt-6 p-4 bg-white rounded-lg shadow-sm border">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">⚡ إجراءات سريعة</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              variant="default"
              className={`${action.color} text-white`}
              size="sm"
            >
              <Icon className="ml-2 h-4 w-4" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
