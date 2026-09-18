import { ContractMetricStrip } from './contract-details-v3/ContractSection';
/**
 * مكون الجدول الزمني التفاعلي
 * عرض المحطات الرئيسية للعقد بشكل بصري
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
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
    return timelineEvents.filter(event => !Number.isNaN(event.date.getTime())).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [auditLogs, contract]);

  return <div className="space-y-6">
    <ContractMetricStrip items={[
      { title:'المحصل حتى الآن', value:formatCurrency(paidTotal ?? Number(contract.total_paid || 0)) },
      { title:'الرصيد المتبقي', value:formatCurrency(remainingTotal ?? Number(contract.balance_due || 0)) },
      { title:'المخالفات المسجلة', value:trafficViolationsCount },
      { title:'محطات العقد', value:events.length },
    ]} />
    <section className="rounded-2xl border border-[#dce5e1] bg-white p-5 sm:p-7" aria-label="الجدول الزمني للعقد">
      <h3 className="text-lg font-semibold text-[#193731]">الجدول الزمني للعقد</h3>
      <p className="mt-2 mb-5 text-sm text-[#64756e]">محطات العقد مرتبة حسب التاريخ. الأرصدة أعلاه ملخص حالي وليست أحداث سداد.</p>
      {events.length===0 ? <p className="py-10 text-center text-sm text-slate-500">لا توجد أحداث في الجدول الزمني</p> :
        <ol className="contract-record-timeline">{events.map((event,index)=><li key={index}>
          <time dateTime={event.date.toISOString()}>{format(event.date,'dd MMM yyyy',{locale:ar})}</time>
          <article><div className="flex flex-wrap items-center justify-between gap-3"><h4>{event.title}</h4><Badge variant="secondary" className={getTone(event.status).badge}>{getStatusLabel(event.status)}</Badge></div><p>{event.description}</p></article>
        </li>)}</ol>}
    </section>
  </div>;
};
