/**
 * ContractHeroV3 — light identity band using the app's color language.
 * One glance answers: who, what car, how much, how much left, how long.
 * White card on the app canvas with a teal ribbon accent, clickable
 * customer/vehicle/employee chips, and dual progress meters.
 */

import { motion } from 'framer-motion';
import { Calendar, Car, ChevronLeft, User, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Contract } from '@/types/contracts';
import { cn } from '@/lib/utils';
import {
  formatAssignedEmployeeNameV3,
  getContractStatusMetaV3,
  type ContractFinancialSnapshot,
} from './tokens';

export interface ContractHeroProps {
  contract: Contract;
  customerName: string;
  vehicleName: string;
  plateNumber?: string;
  totalAmount: number;
  monthlyAmount: number;
  paidAmount: number;
  paidPayments: number;
  totalPayments: number;
  daysRemaining: number | null;
  progressPercentage: number;
  snapshot: ContractFinancialSnapshot;
  formatCurrency: (amount: number) => string;
  onBack: () => void;
  onEdit: () => void;
  onStatusClick: () => void;
  onCustomerClick: () => void;
  onVehicleClick: () => void;
}

const heroFade = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const StatTile = ({
  label,
  value,
  tone,
  dir,
}: {
  label: string;
  value: string;
  tone: 'teal' | 'amber' | 'rose' | 'ink';
  dir?: 'ltr' | 'rtl';
}) => (
  <div
    className={cn(
      'min-w-0 rounded-xl border px-3.5 py-2.5',
      tone === 'teal' && 'border-[#22C7A1]/25 bg-[#ECFDF9]',
      tone === 'amber' && 'border-[#F59E0B]/25 bg-[#FFFBEB]',
      tone === 'rose' && 'border-[#FB6B7A]/25 bg-[#FFF5F6]',
      tone === 'ink' && 'border-[#E5EAF1] bg-[#F6F8FB]',
    )}
  >
    <p className="text-[11px] font-bold text-slate-500">{label}</p>
    <p
      dir={dir}
      className={cn(
        'mt-0.5 truncate text-base font-black',
        tone === 'teal' && 'text-[#0E9E7E]',
        tone === 'amber' && 'text-[#B45309]',
        tone === 'rose' && 'text-[#BE123C]',
        tone === 'ink' && 'text-[#0F172A]',
      )}
    >
      {value}
    </p>
  </div>
);

export function ContractHero({
  contract,
  customerName,
  vehicleName,
  plateNumber,
  totalAmount,
  monthlyAmount,
  paidAmount,
  paidPayments,
  totalPayments,
  daysRemaining,
  progressPercentage,
  snapshot,
  formatCurrency,
  onBack,
  onEdit,
  onStatusClick,
  onCustomerClick,
  onVehicleClick,
}: ContractHeroProps) {
  const statusMeta = getContractStatusMetaV3(contract.status);
  const paymentProgress = totalAmount > 0 ? Math.min(snapshot.remainingTotal > 0 ? 99 : 100, Math.floor((paidAmount / totalAmount) * 100)) : 0;
  const dueNow = snapshot.dueNowTotal > 0
    ? snapshot.dueNowTotal
    : snapshot.outstandingTotal > 0
      ? snapshot.outstandingTotal
      : snapshot.remainingTotal;
  const dueLabel =
    snapshot.dueNowTotal > 0
      ? 'المستحق الآن'
      : snapshot.outstandingTotal > 0
        ? 'فواتير مفتوحة'
        : snapshot.hasFinancialCoverage
          ? 'المتبقي'
          : 'رصيد العقد (فواتير ناقصة)';
  const timelineProgress = Math.round(Math.max(0, Math.min(100, progressPercentage)));

  const daysLabel =
    daysRemaining === null
      ? 'المدة غير محددة'
      : daysRemaining > 0
        ? `${daysRemaining} يوم متبقي`
        : daysRemaining === 0
          ? 'ينتهي اليوم'
          : `منتهي منذ ${Math.abs(daysRemaining)} يوم`;

  const startDateLabel = contract.start_date
    ? format(new Date(contract.start_date), 'dd MMM yyyy', { locale: ar })
    : '—';
  const endDateLabel = contract.end_date ? format(new Date(contract.end_date), 'dd MMM yyyy', { locale: ar }) : '—';

  return (
    <motion.section
      variants={heroFade}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden rounded-2xl border border-[#E5EAF1] bg-white shadow-[0_10px_34px_-22px_rgba(15,23,42,0.3)]"
    >
      {/* App-color atmosphere: teal + indigo soft washes on white */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-20 -right-14 h-56 w-56 rounded-full bg-[#22C7A1]/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-56 w-64 rounded-full bg-[#7C83F6]/10 blur-3xl" />
      </div>

      {/* Teal ribbon accent along the top edge */}
      <div className="relative h-1.5 w-full bg-gradient-to-l from-[#22C7A1] via-[#38BDF8] to-[#7C83F6]" />

      <div className="relative z-10 space-y-5 p-5 sm:p-6">
        {/* Row 1: back, identity, edit */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-9 shrink-0 gap-1.5 border border-[#E5EAF1] bg-[#F6F8FB] px-3 text-xs font-bold text-slate-600 hover:bg-[#EEF5FB] hover:text-[#0F172A]"
            >
              <ChevronLeft className="h-4 w-4" />
              العقود
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onStatusClick}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black transition-transform hover:scale-[1.03]',
                    statusMeta.chip,
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', statusMeta.dot)} />
                  {statusMeta.label}
                </button>
                <span className="rounded-full border border-[#E5EAF1] bg-[#F6F8FB] px-3 py-1 text-[11px] font-bold text-slate-600">
                  عقد تأجير مركبة
                </span>
              </div>
              <h1 className="mt-2 truncate text-3xl font-black tracking-tight text-[#0F172A] sm:text-[34px]" dir="ltr">
                {contract.contract_number}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span dir="ltr">{startDateLabel}</span>
                </span>
                <span className="text-slate-300">←</span>
                <span dir="ltr">{endDateLabel}</span>
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={onEdit}
            className="h-9 gap-2 bg-[#22C7A1] px-4 text-xs font-black text-white shadow-[0_8px_20px_-8px_rgba(34,199,161,0.6)] hover:bg-[#0E9E7E]"
          >
            <User className="h-3.5 w-3.5" />
            تعديل العقد
          </Button>
        </div>

        {/* Row 2: parties + money */}
        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          {/* Parties card */}
          <div className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FB]/60 p-4">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={onCustomerClick}
                className="group flex items-center gap-3 rounded-xl border border-[#E5EAF1] bg-white p-3 text-right transition-colors hover:border-[#22C7A1]/40 hover:bg-[#ECFDF9]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#22C7A1]/10 text-[#0E9E7E]">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400">العميل</p>
                  <p className="truncate text-sm font-black text-[#0F172A] group-hover:text-[#0E9E7E]">
                    {customerName}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] font-semibold text-slate-500">
                    {contract.customer?.phone && <span dir="ltr">{contract.customer.phone}</span>}
                    {contract.customer?.national_id && <span>{contract.customer.national_id}</span>}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onVehicleClick}
                className="group flex items-center gap-3 rounded-xl border border-[#E5EAF1] bg-white p-3 text-right transition-colors hover:border-[#38BDF8]/40 hover:bg-[#F0F9FF]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#38BDF8]/10 text-[#0369A1]">
                  <Car className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400">المركبة</p>
                  <p className="truncate text-sm font-black text-[#0F172A] group-hover:text-[#0369A1]">
                    {vehicleName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-semibold text-slate-500">
                    {plateNumber && (
                      <span dir="ltr" className="rounded bg-[#F6F8FB] px-1.5 py-0.5 font-mono font-bold text-slate-700">
                        {plateNumber}
                      </span>
                    )}
                    {contract.vehicle?.year && <span>{contract.vehicle.year}</span>}
                    {contract.vehicle?.color && <span>{contract.vehicle.color}</span>}
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-3 rounded-xl border border-[#E5EAF1] bg-white p-3 sm:col-span-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#7C83F6]/10 text-[#4F46E5]">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400">الموظف المسؤول</p>
                  <p className="truncate text-sm font-black text-[#0F172A]">
                    {formatAssignedEmployeeNameV3(contract.assigned_employee)}
                  </p>
                </div>
                <span className="ms-auto rounded-full border border-[#E5EAF1] bg-[#F6F8FB] px-2.5 py-1 text-[10px] font-bold text-slate-500">
                  {contract.assigned_to_profile_id ? 'متابعة معينة' : 'بدون تعيين'}
                </span>
              </div>
            </div>
          </div>

          {/* Money card */}
          <div className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FB]/60 p-4">
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile label="إجمالي العقد" value={formatCurrency(totalAmount)} tone="ink" />
              <StatTile label="الإيجار الشهري" value={formatCurrency(monthlyAmount)} tone="teal" />
              <StatTile label="المدفوع" value={formatCurrency(paidAmount)} tone="teal" />
              <StatTile label={dueLabel} value={formatCurrency(dueNow)} tone={dueNow > 0 ? 'rose' : 'teal'} />
              <StatTile label="أقساط مسددة" value={snapshot.financialReviewRequired ? 'بانتظار المطابقة' : `${paidPayments} / ${totalPayments}`} tone="ink" />
              <StatTile
                label={snapshot.hasFinancialCoverage ? 'فواتير مفتوحة' : 'فواتير ناقصة'}
                value={String(snapshot.hasFinancialCoverage ? snapshot.openInvoicesCount : snapshot.missingInvoiceMonthsCount)}
                tone={snapshot.hasFinancialCoverage && snapshot.openInvoicesCount === 0 ? 'teal' : 'amber'}
              />
            </div>
          </div>
        </div>

        {/* Row 3: dual progress meters */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#E5EAF1] bg-white p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">المدة الزمنية</span>
              <span className="text-xs font-black text-[#0369A1]">{timelineProgress}%</span>
            </div>
            <Progress
              value={timelineProgress}
              className="mt-2.5 h-2 bg-[#E5EAF1] [&>div]:bg-gradient-to-l [&>div]:from-[#38BDF8] [&>div]:to-[#22C7A1]"
            />
            <p className="mt-2 text-[11px] font-bold text-slate-500">{daysLabel}</p>
          </div>
          <div className="rounded-xl border border-[#E5EAF1] bg-white p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">التحصيل المالي</span>
              <span className="text-xs font-black text-[#0E9E7E]">{paymentProgress}%</span>
            </div>
            <Progress
              value={paymentProgress}
              className="mt-2.5 h-2 bg-[#E5EAF1] [&>div]:bg-gradient-to-l [&>div]:from-[#22C7A1] [&>div]:to-[#A7F3D0]"
            />
            <p className="mt-2 text-[11px] font-bold text-slate-500">
              محصل {formatCurrency(paidAmount)} من {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
