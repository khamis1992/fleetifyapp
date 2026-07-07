import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Brain, ChevronLeft, Clock, RefreshCw, ShieldAlert, Wallet } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useDailyDecisionCenter, DailyDecisionAction, DailyDecisionRisk } from '@/hooks/useDailyDecisionCenter';
import { cn } from '@/lib/utils';

const priorityStyles: Record<DailyDecisionAction['priority'], string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const severityStyles: Record<DailyDecisionRisk['severity'], string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-emerald-50 text-emerald-700',
};

const priorityLabel: Record<DailyDecisionAction['priority'], string> = {
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
};

const severityLabel: Record<DailyDecisionRisk['severity'], string> = {
  critical: 'حرج',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
};

export const DailyDecisionCenter: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data, isLoading, isFetching, refetch } = useDailyDecisionCenter();

  const actions = data?.actions || [];
  const risks = data?.risks || [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-xl border border-teal-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="border-b border-slate-200 bg-gradient-to-l from-teal-50 via-white to-white px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500 text-white shadow-md shadow-teal-500/20">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">مركز القرارات اليومي</h2>
                {data?.source && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {data.source === 'openai' ? 'OpenAI' : 'تحليل داخلي'}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600">
                {isLoading ? 'جاري تحليل بيانات اليوم...' : data?.summary || 'ملخص سريع لما يحتاج انتباهك اليوم.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            تحديث التحليل
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.5fr_0.9fr_1fr]">
        <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-l">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-600" />
            <h3 className="font-bold text-slate-900">متابعة اليوم</h3>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <DecisionSkeleton rows={3} />
            ) : (
              actions.map((action, index) => (
                <button
                  key={`${action.title}-${index}`}
                  type="button"
                  onClick={() => action.route && navigate(action.route)}
                  className="group w-full rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-right transition-colors hover:border-teal-300 hover:bg-teal-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{action.title}</span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-bold', priorityStyles[action.priority])}>
                          {priorityLabel[action.priority]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{action.reason}</p>
                    </div>
                    {action.route && (
                      <ChevronLeft className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-teal-600" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-l">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900">توقع التحصيل</h3>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">خلال 7 أيام</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatCurrency(data?.cashflow.next7Days || 0)}
              </p>
            </div>
            <div className="rounded-lg bg-teal-50 p-4">
              <p className="text-xs font-semibold text-teal-700">خلال 30 يوم</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatCurrency(data?.cashflow.next30Days || 0)}
              </p>
            </div>
            <p className="text-xs leading-6 text-slate-500">
              {data?.cashflow.note || 'يتم احتسابها من الفواتير المفتوحة وتواريخ الاستحقاق.'}
            </p>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <h3 className="font-bold text-slate-900">أهم المخاطر</h3>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <DecisionSkeleton rows={3} />
            ) : (
              risks.map((risk, index) => (
                <div key={`${risk.title}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{risk.title}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', severityStyles[risk.severity])}>
                      {severityLabel[risk.severity]}
                    </span>
                  </div>
                  <p className="flex items-start gap-2 text-sm text-slate-600">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    {risk.impact}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
};

const DecisionSkeleton: React.FC<{ rows: number }> = ({ rows }) => (
  <>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
      </div>
    ))}
  </>
);
