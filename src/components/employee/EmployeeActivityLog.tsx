/**
 * Employee Activity Log Component
 * سجل نشاط الموظف
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export const EmployeeActivityLog: React.FC = () => {
  // TODO: Implement actual activity log fetching
  const activities = [
    { id: 1, icon: '✅', title: 'تم تجديد عقد #1240', time: '11:25 ص', customer: 'محمد سعيد' },
    { id: 2, icon: '📞', title: 'مكالمة مع أحمد خالد', time: '10:15 ص', duration: '5 دقائق' },
    { id: 3, icon: '💰', title: 'تسجيل دفعة', time: '09:30 ص', amount: '3,000 ر.س' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          📜 سجل نشاطي اليوم
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
              <span className="text-2xl">{activity.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{activity.title}</p>
                <p className="text-sm text-gray-600">
                  {activity.customer && `العميل: ${activity.customer}`}
                  {activity.duration && ` • ${activity.duration}`}
                  {activity.amount && ` • ${activity.amount}`}
                </p>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
