/**
 * Employee Activity Log Component
 * سجل نشاط الموظف
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Loader2 } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLog';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const getActivityIcon = (action: string): string => {
  switch (action) {
    case 'CREATE': return '✅';
    case 'UPDATE': return '✏️';
    case 'DELETE': return '🗑️';
    case 'APPROVE': return '✓';
    case 'REJECT': return '✗';
    case 'EXPORT': return '📥';
    case 'IMPORT': return '📤';
    default: return '📋';
  }
};

const getActivityTitle = (log: any): string => {
  const resourceMap: Record<string, string> = {
    contract: 'عقد',
    customer: 'عميل',
    vehicle: 'مركبة',
    payment: 'دفعة',
    invoice: 'فاتورة',
    user: 'مستخدم',
    report: 'تقرير',
  };
  
  const resource = resourceMap[log.resource_type] || log.resource_type;
  const actionMap: Record<string, string> = {
    CREATE: 'إنشاء',
    UPDATE: 'تحديث',
    DELETE: 'حذف',
    APPROVE: 'موافقة',
    REJECT: 'رفض',
    EXPORT: 'تصدير',
    IMPORT: 'استيراد',
  };
  
  const action = actionMap[log.action] || log.action;
  return `${action} ${resource}${log.entity_name ? `: ${log.entity_name}` : ''}`;
};

export const EmployeeActivityLog: React.FC = () => {
  const { user } = useAuth();
  
  const { data: logs, isLoading } = useAuditLogs(
    {
      user_id: user?.id,
      date_from: new Date().toISOString().split('T')[0],
    },
    !!user?.id
  );

  const activities = logs?.slice(0, 10) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          📜 سجل نشاطي اليوم
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            لا يوجد نشاط اليوم
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                <span className="text-2xl">{getActivityIcon(log.action)}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {getActivityTitle(log)}
                  </p>
                  {log.changes_summary && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {log.changes_summary}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ar })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
