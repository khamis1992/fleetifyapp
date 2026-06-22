/**
 * Employee Today Tasks Component
 * مهام اليوم للموظف
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Phone, User, CheckCircle } from 'lucide-react';
import { EmployeeTask } from '@/types/employee-workspace.types';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface EmployeeTodayTasksProps {
  tasks: EmployeeTask[];
  isLoading: boolean;
  showAll?: boolean;
}

export const EmployeeTodayTasks: React.FC<EmployeeTodayTasksProps> = ({
  tasks,
  isLoading,
  showAll = false
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayTasks = showAll ? tasks : tasks.slice(0, 8);

  const statusColors = {
    pending: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  const priorityColors = {
    low: 'border-blue-200',
    normal: 'border-gray-200',
    high: 'border-orange-200',
    urgent: 'border-red-200'
  };

  const typeIcons = {
    call: '📞',
    payment_collection: '💰',
    violation_check: '🚗',
    contract_renewal: '📄',
    customer_contact: '👤'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          📅 مهام اليوم ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>لا توجد مهام لليوم</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-lg border-2 ${priorityColors[task.priority]} hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.status === 'completed'}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {typeIcons[task.type as keyof typeof typeIcons] || '📋'}
                      </span>
                      {task.scheduled_time && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="ml-1 h-3 w-3" />
                          {task.scheduled_time}
                        </Badge>
                      )}
                      <Badge className={`text-xs ${statusColors[task.status]}`}>
                        {task.status === 'pending' && 'قيد الانتظار'}
                        {task.status === 'in_progress' && 'جاري التنفيذ'}
                        {task.status === 'completed' && 'مكتمل'}
                        {task.status === 'overdue' && 'متأخر'}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {task.title_ar || task.title}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.customer_name}
                      </span>
                      {task.contract_number && (
                        <span>عقد #{task.contract_number}</span>
                      )}
                      {task.customer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {task.customer_phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {task.status === 'pending' && (
                      <>
                        <Button size="sm" variant="default">
                          ✅ بدء المهمة
                        </Button>
                        <Button size="sm" variant="outline">
                          ⏰ تأجيل
                        </Button>
                      </>
                    )}
                    {task.status === 'completed' && (
                      <span className="text-green-600 text-sm">
                        ✓ تم بنجاح
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
