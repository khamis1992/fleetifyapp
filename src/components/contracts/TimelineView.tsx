/**
 * مكون الجدول الزمني التفاعلي
 * عرض المحطات الرئيسية للعقد بشكل بصري
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  RefreshCw,
  Flag,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Contract } from '@/types/contracts';

interface TimelineEvent {
  date: Date;
  title: string;
  description: string;
  type: 'start' | 'event' | 'payment' | 'violation' | 'end' | 'renewal';
  icon: React.ReactNode;
  status: 'completed' | 'pending' | 'warning';
}

interface TimelineViewProps {
  contract: Contract;
  trafficViolationsCount?: number;
  formatCurrency: (amount: number) => string;
}

export const TimelineView = ({
  contract,
  trafficViolationsCount = 0,
  formatCurrency,
}: TimelineViewProps) => {
  const events = useMemo(() => {
    const timelineEvents: TimelineEvent[] = [];

    // حدث البداية
    if (contract.start_date) {
      timelineEvents.push({
        date: new Date(contract.start_date),
        title: 'بداية العقد',
        description: `بدء العقد رقم ${contract.contract_number}`,
        type: 'start',
        icon: <Flag className="w-5 h-5" />,
        status: 'completed',
      });
    }

    // حدث المخالفات المرورية
    if (trafficViolationsCount > 0) {
      timelineEvents.push({
        date: new Date(),
        title: 'مخالفات مرورية',
        description: `${trafficViolationsCount} مخالفة مرورية مسجلة`,
        type: 'violation',
        icon: <AlertCircle className="w-5 h-5" />,
        status: 'warning',
      });
    }

    // حدث الدفعات
    if (contract.total_paid && contract.total_paid > 0) {
      timelineEvents.push({
        date: new Date(),
        title: 'الدفعات المكتملة',
        description: `تم دفع ${formatCurrency(contract.total_paid)}`,
        type: 'payment',
        icon: <DollarSign className="w-5 h-5" />,
        status: 'completed',
      });
    }

    // حدث النهاية
    if (contract.end_date) {
      timelineEvents.push({
        date: new Date(contract.end_date),
        title: 'نهاية العقد',
        description: `انتهاء العقد`,
        type: 'end',
        icon: <Flag className="w-5 h-5" />,
        status: new Date(contract.end_date) > new Date() ? 'pending' : 'completed',
      });
    }

    // ترتيب الأحداث حسب التاريخ
    return timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [contract, trafficViolationsCount, formatCurrency]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'pending':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'warning':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getIconColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-blue-600';
      case 'warning':
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-600" />
          الجدول الزمني للعقد
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={index} className="flex gap-4">
              {/* العمود الأيسر - الخط الزمني */}
              <div className="flex flex-col items-center">
                {/* الدائرة */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${getStatusColor(
                    event.status
                  )}`}
                >
                  <div className={getIconColor(event.status)}>{event.icon}</div>
                </div>
                {/* الخط الرابط */}
                {index < events.length - 1 && (
                  <div className="w-1 h-16 bg-gray-300 mt-2" />
                )}
              </div>

              {/* العمود الأيمن - المحتوى */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-gray-900">{event.title}</h4>
                  <Badge
                    variant={
                      event.status === 'completed'
                        ? 'secondary'
                        : event.status === 'warning'
                          ? 'destructive'
                          : 'outline'
                    }
                    className="text-xs"
                  >
                    {event.status === 'completed'
                      ? 'مكتمل'
                      : event.status === 'pending'
                        ? 'قادم'
                        : 'تحذير'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mb-2">{event.description}</p>
                <time className="text-xs text-gray-500">
                  {format(event.date, 'dd MMMM yyyy', { locale: ar })}
                </time>
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">لا توجد أحداث في الجدول الزمني</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
