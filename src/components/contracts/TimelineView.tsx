/**
 * مكون الجدول الزمني التفاعلي
 * عرض المحطات الرئيسية للعقد بشكل بصري
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  AlertCircle,
  DollarSign,
  FileText,
  Flag,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Contract } from '@/types/contracts';
import { cn } from '@/lib/utils';

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
  paidTotal?: number;
  remainingTotal?: number;
  auditLogs?: Array<{
    action?: string | null;
    changes_summary?: string | null;
    entity_name?: string | null;
    user_name?: string | null;
    created_at?: string | null;
    severity?: string | null;
    status?: string | null;
  }>;
}

const getTone = (status: TimelineEvent['status']) => {
  switch (status) {
    case 'completed':
      return { chip: 'bg-[#ECFDF9] text-[#0E9E7E]', dot: 'bg-[#22C7A1]', badge: 'bg-[#ECFDF9] text-[#0E9E7E]' };
    case 'pending':
      return { chip: 'bg-[#F0F9FF] text-[#0369A1]', dot: 'bg-[#38BDF8]', badge: 'bg-[#F0F9FF] text-[#0369A1]' };
    case 'warning':
      return { chip: 'bg-[#FFFBEB] text-[#B45309]', dot: 'bg-[#F59E0B]', badge: 'bg-[#FFFBEB] text-[#B45309]' };
    default:
      return { chip: 'bg-[#F6F8FB] text-slate-500', dot: 'bg-slate-300', badge: 'bg-[#F6F8FB] text-slate-500' };
  }
};

const getStatusLabel = (status: TimelineEvent['status']) => {
  switch (status) {
    case 'completed':
      return 'مكتمل';
    case 'pending':
      return 'قادم';
    case 'warning':
      return 'تحذير';
    default:
      return '';
  }
};

export const TimelineView = ({
  contract,
  trafficViolationsCount = 0,
  formatCurrency,
  paidTotal,
  remainingTotal,
  auditLogs = [],
}: TimelineViewProps) => {
  const events = useMemo(() => {
    const timelineEvents: TimelineEvent[] = [];

    // حدث إنشاء العقد
    if (contract.created_at) {
      timelineEvents.push({
        date: new Date(contract.created_at),
        title: 'إنشاء العقد',
        description: `تم إنشاء ملف العقد رقم ${contract.contract_number}`,
        type: 'event',
        icon: <FileText className="h-4 w-4" />,
        status: 'completed',
      });
    }

    // حدث البداية
    if (contract.start_date) {
      timelineEvents.push({
        date: new Date(contract.start_date),
        title: 'بداية العقد',
        description: `بدء سريان عقد ${contract.contract_number}`,
        type: 'start',
        icon: <Flag className="h-4 w-4" />,
        status: 'completed',
      });
    }

    for (const log of auditLogs) {
      if (!log.created_at) continue;
      const date = new Date(log.created_at);
      if (Number.isNaN(date.getTime())) continue;

      timelineEvents.push({
        date,
        title: log.changes_summary || log.action || 'تحديث على العقد',
        description: [log.entity_name, log.user_name].filter(Boolean).join(' — ') || 'سجل تدقيق موثق',
        type: 'event',
        icon: <FileText className="h-4 w-4" />,
        status: log.severity === 'high' || log.status === 'failed' ? 'warning' : 'completed',
      });
    }

    // حدث المخالفات المرورية — بتاريخ أول مخالفة إن وجد
    if (trafficViolationsCount > 0) {
      timelineEvents.push({
        date: new Date(),
        title: 'مخالفات مرورية',
        description: `${trafficViolationsCount} مخالفة مرورية مسجلة على مركبة العقد`,
        type: 'violation',
        icon: <AlertCircle className="h-4 w-4" />,
        status: 'warning',
      });
    }

    // حدث الدفعات المكتملة — بتاريخ آخر تحديث للعقد
    const canonicalPaidTotal = paidTotal ?? Number(contract.total_paid || 0);
    const canonicalRemainingTotal = remainingTotal ?? Number(contract.balance_due || 0);
    if (canonicalPaidTotal > 0) {
      timelineEvents.push({
        date: contract.updated_at ? new Date(contract.updated_at) : new Date(),
        title: 'التحصيل المالي',
        description: `تم تحصيل ${formatCurrency(canonicalPaidTotal)} من قيمة العقد`,
        type: 'payment',
        icon: <DollarSign className="h-4 w-4" />,
        status: canonicalRemainingTotal <= 0 ? 'completed' : 'pending',
      });
    }

    // حدث النهاية
    if (contract.end_date) {
      timelineEvents.push({
        date: new Date(contract.end_date),
        title: 'نهاية العقد',
        description: 'تاريخ انتهاء مدة العقد المتعاقد عليها',
        type: 'end',
        icon: <Flag className="h-4 w-4" />,
        status: new Date(contract.end_date) > new Date() ? 'pending' : 'completed',
      });
    }

    // ترتيب الأحداث حسب التاريخ
    return timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [auditLogs, contract, formatCurrency, paidTotal, remainingTotal, trafficViolationsCount]);

  return (
    <div className="rounded-2xl border border-[#E5EAF1] bg-white shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
      {/* Panel header */}
      <div className="flex items-center gap-3 border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
          <Calendar className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Timeline</p>
          <h3 className="text-sm font-black text-[#0F172A]">الجدول الزمني للعقد</h3>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {events.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            <Calendar className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm">لا توجد أحداث في الجدول الزمني</p>
          </div>
        ) : (
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute inset-y-2 right-[19px] w-px bg-[#E5EAF1]" />

            <div className="space-y-6">
              {events.map((event, index) => {
                const tone = getTone(event.status);
                return (
                  <div key={index} className="relative flex gap-4">
                    {/* Icon chip */}
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5EAF1] bg-white shadow-sm">
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', tone.chip)}>
                        {event.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-[#0F172A]">{event.title}</h4>
                        <Badge
                          variant="secondary"
                          className={cn('h-5 rounded-full px-2 text-[10px] font-bold', tone.badge)}
                        >
                          {getStatusLabel(event.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{event.description}</p>
                    </div>

                    {/* Date badge — opposite side */}
                    <time
                      dir="ltr"
                      className="shrink-0 pt-1 text-[10px] font-bold text-slate-400"
                    >
                      {format(event.date, 'dd MMM yyyy', { locale: ar })}
                    </time>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
