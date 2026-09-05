/**
 * CustomerPulseV3 — the always-visible right rail of the customer page.
 * Gathers everything that needs attention in one place instead of
 * scattering it across tabs:
 * صحة الملف، فرص التجديد، المتابعات مع تسجيل سريع، وآخر النشاط.
 */

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  HeartPulse,
  Loader2,
  PhoneOutgoing,
  Sparkles,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { CustomerActivity } from '@/hooks/useCustomerCRMActivity';
import {
  QUICK_CALL_STATUSES_V3,
  type CustomerSnapshotV3,
  type ProfileCompletionV3,
} from './tokens';

export interface CustomerPulseProps {
  snapshot: CustomerSnapshotV3;
  completion: ProfileCompletionV3;
  crmActivities: CustomerActivity[];
  crmStats?: {
    calls: number;
    successfulCalls: number;
    missedCalls: number;
    messages: number;
  } | null;
  quickCrmNote: string;
  callStatus: 'answered' | 'no_answer' | 'busy';
  isSavingCall: boolean;
  onCrmNoteChange: (value: string) => void;
  onCallStatusChange: (value: 'answered' | 'no_answer' | 'busy') => void;
  onSaveCall: () => void;
  onEdit: () => void;
  onUploadDocument: () => void;
  onOpenCrm: () => void;
  onRenewContract: (contractId: string) => void;
}

const PulseCard = ({
  icon: Icon,
  title,
  meta,
  children,
  tone = 'ink',
}: {
  icon: typeof HeartPulse;
  title: string;
  meta?: string;
  children: React.ReactNode;
  tone?: 'ink' | 'teal' | 'amber' | 'rose' | 'indigo';
}) => (
  <section className="overflow-hidden rounded-2xl border border-[#E5EAF1] bg-white shadow-[0_8px_26px_-20px_rgba(15,23,42,0.35)]">
    <header className="flex items-center justify-between gap-2 border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg',
            tone === 'ink' && 'bg-slate-100 text-slate-500',
            tone === 'teal' && 'bg-[#22C7A1]/12 text-[#0E9E7E]',
            tone === 'amber' && 'bg-[#F59E0B]/12 text-[#B45309]',
            tone === 'rose' && 'bg-[#FB6B7A]/12 text-[#BE123C]',
            tone === 'indigo' && 'bg-[#7C83F6]/12 text-[#4F46E5]',
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-black text-[#0F172A]">{title}</h3>
      </div>
      {meta && (
        <span className="rounded-full border border-[#E5EAF1] bg-white px-2 py-0.5 text-[10px] font-black text-slate-500">
          {meta}
        </span>
      )}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

export function CustomerPulse({
  snapshot,
  completion,
  crmActivities,
  crmStats,
  quickCrmNote,
  callStatus,
  isSavingCall,
  onCrmNoteChange,
  onCallStatusChange,
  onSaveCall,
  onEdit,
  onUploadDocument,
  onOpenCrm,
  onRenewContract,
}: CustomerPulseProps) {
  const recentActivities = crmActivities.slice(0, 5);
  const attentionCount =
    (completion.missing.length > 0 ? 1 : 0) +
    (snapshot.renewalOpportunities.length > 0 ? 1 : 0) +
    (snapshot.overdueFollowups > 0 ? 1 : 0);

  return (
    <motion.aside
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* ===== File health ===== */}
      <PulseCard
        icon={HeartPulse}
        title="صحة الملف"
        meta={attentionCount > 0 ? `${attentionCount} تنبيه` : 'سليم'}
        tone={completion.percent >= 80 ? 'teal' : completion.percent >= 50 ? 'amber' : 'rose'}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">اكتمال البيانات</span>
          <span className="text-xs font-black text-[#0369A1]">{completion.percent}%</span>
        </div>
        <Progress
          value={completion.percent}
          className="mt-2 h-2 bg-[#E5EAF1] [&>div]:bg-gradient-to-l [&>div]:from-[#38BDF8] [&>div]:to-[#22C7A1]"
        />

        {completion.missing.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            {completion.missing.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.kind === 'document' ? onUploadDocument : onEdit}
                className="flex w-full items-center justify-between rounded-lg border border-[#F59E0B]/25 bg-[#FFFBEB] px-3 py-2 text-right transition-colors hover:border-[#F59E0B]/50"
              >
                <span className="flex items-center gap-2 text-xs font-bold text-[#B45309]">
                  <FileWarning className="h-3.5 w-3.5" />
                  {item.label}
                </span>
                <span className="text-[10px] font-black text-[#B45309]">
                  {item.kind === 'document' ? 'رفع' : 'إكمال'} ←
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-[#22C7A1]/25 bg-[#ECFDF9] px-3 py-2 text-xs font-bold text-[#0E9E7E]">
            <CheckCircle2 className="h-4 w-4" />
            ملف العميل مكتمل وجاهز لأي إجراء.
          </p>
        )}
      </PulseCard>

      {/* ===== Renewal opportunities (new service) ===== */}
      {snapshot.renewalOpportunities.length > 0 && (
        <PulseCard
          icon={Sparkles}
          title="فرص التجديد"
          meta={`${snapshot.renewalOpportunities.length} عقد`}
          tone="amber"
        >
          <div className="space-y-2">
            {snapshot.renewalOpportunities.slice(0, 3).map((opportunity) => (
              <div
                key={opportunity.contractId}
                className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FB] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-black text-[#0F172A]" dir="ltr">
                    {opportunity.contractNumber}
                  </p>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black',
                      opportunity.daysRemaining >= 0
                        ? 'bg-[#F59E0B]/12 text-[#B45309]'
                        : 'bg-[#FB6B7A]/12 text-[#BE123C]',
                    )}
                  >
                    {opportunity.daysRemaining >= 0
                      ? `${opportunity.daysRemaining} يوم`
                      : `متأخر ${Math.abs(opportunity.daysRemaining)} يوم`}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{opportunity.vehicleLabel}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400" dir="ltr">
                    {opportunity.endDate ? format(new Date(opportunity.endDate), 'dd MMM yyyy', { locale: ar }) : '—'}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => onRenewContract(opportunity.contractId)}
                    className="h-7 gap-1.5 rounded-lg bg-[#F59E0B] px-2.5 text-[10px] font-black text-white hover:bg-[#D97706]"
                  >
                    <CalendarClock className="h-3 w-3" />
                    تجديد
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </PulseCard>
      )}

      {/* ===== Follow-ups + quick CRM log ===== */}
      <PulseCard
        icon={PhoneOutgoing}
        title="التواصل والمتابعة"
        meta={snapshot.overdueFollowups > 0 ? `${snapshot.overdueFollowups} متأخرة` : 'منظمة'}
        tone={snapshot.overdueFollowups > 0 ? 'rose' : 'indigo'}
      >
        {crmStats && (
          <div className="mb-3 grid grid-cols-3 gap-1.5">
            {[
              { label: 'مكالمات', value: crmStats.calls },
              { label: 'ردّت', value: crmStats.successfulCalls },
              { label: 'لم ترد', value: crmStats.missedCalls },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] px-2 py-1.5 text-center">
                <p className="text-sm font-black text-[#0F172A]">{item.value}</p>
                <p className="text-[10px] font-bold text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FB] p-3">
          <p className="mb-2 text-[11px] font-black text-slate-600">تسجيل مكالمة سريع</p>
          <textarea
            value={quickCrmNote}
            onChange={(event) => onCrmNoteChange(event.target.value)}
            placeholder="ملخص المكالمة (اختياري)..."
            rows={2}
            className="w-full resize-none rounded-lg border border-[#E5EAF1] bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none placeholder:text-slate-400 focus:border-[#22C7A1]/50"
          />
          <div className="mt-2 flex items-center gap-1.5">
            {QUICK_CALL_STATUSES_V3.map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => onCallStatusChange(status.value)}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-[10px] font-black transition-colors',
                  callStatus === status.value
                    ? 'border-[#7C83F6]/40 bg-[#EEF0FE] text-[#4F46E5]'
                    : 'border-[#E5EAF1] bg-white text-slate-500 hover:border-slate-300',
                )}
              >
                {status.label}
              </button>
            ))}
            <Button
              size="sm"
              onClick={onSaveCall}
              disabled={isSavingCall}
              className="mr-auto h-7 gap-1.5 rounded-lg bg-[#22C7A1] px-3 text-[10px] font-black text-white hover:bg-[#0E9E7E]"
            >
              {isSavingCall ? <Loader2 className="h-3 w-3 animate-spin" /> : <ClipboardList className="h-3 w-3" />}
              حفظ
            </Button>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCrm}
          className="mt-3 h-8 w-full gap-2 rounded-lg border-[#E5EAF1] text-[11px] font-black text-[#4F46E5] hover:bg-[#EEF0FE]"
        >
          فتح سجل CRM الكامل
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
      </PulseCard>

      {/* ===== Recent activity ===== */}
      <PulseCard icon={ClipboardList} title="آخر النشاط" meta={`${crmActivities.length} حدث`} tone="teal">
        {recentActivities.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#E5EAF1] bg-[#F6F8FB] px-3 py-4 text-center text-[11px] font-bold text-slate-400">
            لا يوجد نشاط مسجل بعد — سجّل أول تواصل من الأعلى.
          </p>
        ) : (
          <ol className="relative space-y-3 border-r border-[#E5EAF1] pr-3">
            {recentActivities.map((activity) => (
              <li key={activity.id} className="relative">
                <span
                  className={cn(
                    'absolute -right-[17px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white',
                    activity.is_important ? 'bg-[#FB6B7A]' : 'bg-[#22C7A1]',
                  )}
                />
                <p className="line-clamp-2 text-[11px] font-bold leading-5 text-[#0F172A]">{activity.content}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                  {activity.created_at
                    ? formatDistanceToNow(new Date(activity.created_at), { locale: ar, addSuffix: true })
                    : '—'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </PulseCard>

      {/* ===== Attention summary ===== */}
      {snapshot.risk === 'danger' && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[#FB6B7A]/25 bg-[#FFF5F6] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]" />
          <p className="text-[11px] font-bold leading-5 text-[#BE123C]">
            هذا الملف يحتاج تحصيل {Math.round(snapshot.dueNowTotal + snapshot.unpaidViolationsTotal).toLocaleString()} ر.ق
            على الأقل. راجع الملف المالي أو ابدأ إجراءً قانونياً من قائمة الإجراءات.
          </p>
        </div>
      )}
    </motion.aside>
  );
}
