/**
 * Employee Priority Contracts Component
 * العقود التي تحتاج متابعة عاجلة
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Phone, 
  MessageSquare, 
  FileText, 
  AlertCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { PriorityContract, getPriorityColor } from '@/types/employee-workspace.types';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface EmployeePriorityContractsProps {
  priorityContracts: PriorityContract[];
  isLoading: boolean;
}

export const EmployeePriorityContracts: React.FC<EmployeePriorityContractsProps> = ({
  priorityContracts,
  isLoading
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (priorityContracts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-green-600" />
            🎉 لا توجد عقود تحتاج متابعة عاجلة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-8">
            رائع! جميع عقودك في حالة جيدة
          </p>
        </CardContent>
      </Card>
    );
  }

  const priorityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const priorityIcons = {
    overdue_payment: '💰',
    new_violation: '🚗',
    contract_expiring: '📄',
    no_contact: '📞',
    payment_due_today: '⏰'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          🚨 يحتاج إجراء فوري ({priorityContracts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {priorityContracts.slice(0, 5).map((contract) => (
            <div
              key={contract.id}
              className={`p-4 rounded-lg border-2 ${priorityColors[contract.priority]} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">
                      {priorityIcons[contract.priority_reason as keyof typeof priorityIcons] || '⚠️'}
                    </span>
                    <h3 className="font-semibold text-gray-900">
                      عقد #{contract.contract_number}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {contract.priority_reason_ar}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {contract.customer_name}
                  </p>
                  {contract.vehicle_plate && (
                    <p className="text-xs text-gray-600">
                      🚗 {contract.vehicle_plate}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                {contract.balance_due > 0 && (
                  <div className="flex items-center gap-1 text-red-600">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-semibold">
                      {formatCurrency(contract.balance_due)} متأخر
                    </span>
                  </div>
                )}
                {contract.days_overdue && (
                  <div className="flex items-center gap-1 text-orange-600">
                    <Clock className="h-4 w-4" />
                    <span>{contract.days_overdue} يوم تأخير</span>
                  </div>
                )}
                {contract.last_contact_date && (
                  <div className="text-xs text-gray-600">
                    آخر تواصل: {format(parseISO(contract.last_contact_date), 'dd MMM', { locale: ar })}
                  </div>
                )}
                {contract.due_date && (
                  <div className="text-xs text-gray-600">
                    الموعد: {format(parseISO(contract.due_date), 'dd MMM', { locale: ar })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                <Button size="sm" className="flex-1">
                  <Phone className="ml-2 h-4 w-4" />
                  اتصال الآن
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <MessageSquare className="ml-2 h-4 w-4" />
                  واتساب
                </Button>
                <Button size="sm" variant="ghost">
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {priorityContracts.length > 5 && (
            <Button variant="outline" className="w-full">
              عرض جميع العقود ({priorityContracts.length})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
