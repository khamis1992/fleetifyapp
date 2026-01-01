/**
 * مكون التنبيهات الذكية للعقد
 * عرض التنبيهات المهمة والمهام العاجلة
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Contract } from '@/types/contracts';

interface ContractAlertsProps {
  contract: Contract;
  trafficViolationsCount?: number;
  formatCurrency: (amount: number) => string;
}

export const ContractAlerts = ({
  contract,
  trafficViolationsCount = 0,
  formatCurrency,
}: ContractAlertsProps) => {
  const alerts = useMemo(() => {
    const alertsList: Array<{
      type: 'error' | 'warning' | 'info' | 'success';
      icon: React.ReactNode;
      title: string;
      description: string;
      severity: number; // 1-5, higher = more severe
    }> = [];

    // تنبيه: المخالفات المرورية
    if (trafficViolationsCount > 0) {
      alertsList.push({
        type: 'error',
        icon: <AlertTriangle className="w-4 h-4" />,
        title: 'مخالفات مرورية معلقة',
        description: `يوجد ${trafficViolationsCount} مخالفة مرورية غير مدفوعة`,
        severity: 5,
      });
    }

    // تنبيه: المتبقي من قيمة العقد
    const remaining = (contract.contract_amount || 0) - (contract.total_paid || 0);
    if (remaining > 0) {
      alertsList.push({
        type: 'warning',
        icon: <TrendingDown className="w-4 h-4" />,
        title: 'مبلغ متبقي',
        description: `المبلغ المتبقي: ${formatCurrency(remaining)}`,
        severity: 4,
      });
    }

    // تنبيه: قرب نهاية العقد
    if (contract.end_date) {
      const daysUntilEnd = differenceInDays(new Date(contract.end_date), new Date());
      if (daysUntilEnd > 0 && daysUntilEnd <= 30) {
        alertsList.push({
          type: 'warning',
          icon: <Clock className="w-4 h-4" />,
          title: 'قرب نهاية العقد',
          description: `ينتهي العقد في ${daysUntilEnd} يوم (${format(new Date(contract.end_date), 'dd MMMM yyyy', { locale: ar })})`,
          severity: 3,
        });
      } else if (daysUntilEnd <= 0) {
        alertsList.push({
          type: 'error',
          icon: <AlertTriangle className="w-4 h-4" />,
          title: 'انتهى العقد',
          description: `انتهى العقد في ${format(new Date(contract.end_date), 'dd MMMM yyyy', { locale: ar })}`,
          severity: 5,
        });
      }
    }

    // تنبيه: حالة قانونية
    if (contract.status === 'under_legal_procedure') {
      alertsList.push({
        type: 'error',
        icon: <AlertTriangle className="w-4 h-4" />,
        title: 'تحت الإجراء القانوني',
        description: 'هذا العقد قيد الإجراءات القانونية',
        severity: 5,
      });
    }

    // نجاح: جميع الدفعات مكتملة
    if (remaining <= 0 && contract.status !== 'terminated' && contract.status !== 'cancelled') {
      alertsList.push({
        type: 'success',
        icon: <CheckCircle2 className="w-4 h-4" />,
        title: 'العقد مكتمل السداد',
        description: 'تم سداد جميع دفعات العقد بنجاح',
        severity: 1,
      });
    }

    // ترتيب التنبيهات حسب الأهمية
    return alertsList.sort((a, b) => b.severity - a.severity);
  }, [contract, trafficViolationsCount, formatCurrency]);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {alerts.map((alert, index) => (
        <Alert
          key={index}
          className={`border-l-4 ${
            alert.type === 'error'
              ? 'border-l-red-500 bg-red-50'
              : alert.type === 'warning'
                ? 'border-l-amber-500 bg-amber-50'
                : alert.type === 'success'
                  ? 'border-l-green-500 bg-green-50'
                  : 'border-l-blue-500 bg-blue-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 ${
                alert.type === 'error'
                  ? 'text-red-600'
                  : alert.type === 'warning'
                    ? 'text-amber-600'
                    : alert.type === 'success'
                      ? 'text-green-600'
                      : 'text-blue-600'
              }`}
            >
              {alert.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold text-sm ${
                    alert.type === 'error'
                      ? 'text-red-700'
                      : alert.type === 'warning'
                        ? 'text-amber-700'
                        : alert.type === 'success'
                          ? 'text-green-700'
                          : 'text-blue-700'
                  }`}
                >
                  {alert.title}
                </span>
                {alert.severity >= 4 && (
                  <Badge variant="destructive" className="text-xs">
                    عاجل
                  </Badge>
                )}
              </div>
              <AlertDescription
                className={`text-xs mt-1 ${
                  alert.type === 'error'
                    ? 'text-red-600'
                    : alert.type === 'warning'
                      ? 'text-amber-600'
                      : alert.type === 'success'
                        ? 'text-green-600'
                        : 'text-blue-600'
                }`}
              >
                {alert.description}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
};
