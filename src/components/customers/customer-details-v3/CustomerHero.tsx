/**
 * CustomerHeroV3 — light identity band using the app's color language.
 * One glance answers: من العميل، كيف حال العلاقة، كم له وكم عليه،
 * وكيف نصل إليه فوراً.
 */

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BadgeCheck,
  Car,
  ChevronLeft,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Star,
  Wallet,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { CustomerSnapshotV3, ProfileCompletionV3 } from './tokens';

export interface CustomerHeroProps {
  customer: any;
  customerName: string;
  initials: string;
  snapshot: CustomerSnapshotV3;
  completion: ProfileCompletionV3;
  contractsCount: number;
  formatCurrency: (amount: number) => string;
  onBack: () => void;
  onEdit: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
  onOpenContracts: () => void;
}

const heroFade = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const HeroTile = ({
  label,
  value,
  tone,
  icon: Icon,
  dir,
}: {
  label: string;
  value: string;
  tone: 'teal' | 'amber' | 'rose' | 'ink';
  icon: typeof Wallet;
  dir?: 'ltr' | 'rtl';
}) => (
  <div
    className={cn(
      'flex min-w-0 items-center gap-3 rounded-xl border px-3.5 py-3',
      tone === 'teal' && 'border-[#22C7A1]/25 bg-[#ECFDF9]',
      tone === 'amber' && 'border-[#F59E0B]/25 bg-[#FFFBEB]',
      tone === 'rose' && 'border-[#FB6B7A]/25 bg-[#FFF5F6]',
      tone === 'ink' && 'border-[#E5EAF1] bg-[#F6F8FB]',
    )}
  >
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        tone === 'teal' && 'bg-[#22C7A1]/12 text-[#0E9E7E]',
        tone === 'amber' && 'bg-[#F59E0B]/12 text-[#B45309]',
        tone === 'rose' && 'bg-[#FB6B7A]/12 text-[#BE123C]',
        tone === 'ink' && 'bg-slate-100 text-slate-500',
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p
        dir={dir}
        className={cn(
          'truncate text-base font-black',
          tone === 'teal' && 'text-[#0E9E7E]',
          tone === 'amber' && 'text-[#B45309]',
          tone === 'rose' && 'text-[#BE123C]',
          tone === 'ink' && 'text-[#0F172A]',
        )}
      >
        {value}
      </p>
    </div>
  </div>
);

export function CustomerHero({
  customer,
  customerName,
  initials,
  snapshot,
  completion,
  contractsCount,
  formatCurrency,
  onBack,
  onEdit,
  onCall,
  onWhatsApp,
  onOpenContracts,
}: CustomerHeroProps) {
  const customerTypeLabel =
    customer?.customer_type === 'company' ? 'عميل شركة' : customer?.customer_type === 'government' ? 'جهة حكومية' : 'عميل فرد';

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
              العملاء
            </Button>

            <Avatar className="h-14 w-14 shrink-0 rounded-xl border border-[#E5EAF1] shadow-sm">
              <AvatarFallback className="rounded-xl bg-[#22C7A1]/12 text-lg font-black text-[#0E9E7E]">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black',
                    snapshot.riskMeta.chip,
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', snapshot.riskMeta.dot)} />
                  {snapshot.riskMeta.label}
                </button>
                <span className="rounded-full border border-[#E5EAF1] bg-[#F6F8FB] px-3 py-1 text-[11px] font-bold text-slate-600">
                  {customerTypeLabel}
                </span>
                {customer?.is_blacklisted && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#F59E0B]/30 bg-[#FFFBEB] px-3 py-1 text-[11px] font-black text-[#B45309]">
                    <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
                    VIP
                  </span>
                )}
                {customer?.is_active === false && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-600">
                    موقوف
                  </span>
                )}
              </div>
              <h1 className="mt-2 truncate text-3xl font-black tracking-tight text-[#0F172A]">{customerName}</h1>
              <p className="mt-1 text-xs font-semibold text-slate-500">{snapshot.riskHelper}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {customer?.phone && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCall}
                  className="h-9 w-9 gap-0 border-[#E5EAF1] p-0 text-[#0F172A] hover:border-[#22C7A1]/40 hover:bg-[#ECFDF9] hover:text-[#0E9E7E]"
                  title="اتصال"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onWhatsApp}
                  className="h-9 w-9 gap-0 border-[#E5EAF1] p-0 text-[#0E9E7E] hover:border-[#22C7A1]/40 hover:bg-[#ECFDF9]"
                  title="واتساب"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              onClick={onEdit}
              className="h-9 gap-2 bg-[#22C7A1] px-4 text-xs font-black text-white shadow-[0_8px_20px_-8px_rgba(34,199,161,0.6)] hover:bg-[#0E9E7E]"
            >
              تعديل البيانات
            </Button>
          </div>
        </div>

        {/* Row 2: identity card + money tiles */}
        <div className="grid gap-4 xl:grid-cols-[1fr_1.6fr]">
          {/* Identity & reachability */}
          <div className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FB]/60 p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E5EAF1] bg-white px-3 py-2.5">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <BadgeCheck className="h-4 w-4 text-[#38BDF8]" />
                  رقم الهوية
                </span>
                <span className="font-mono text-sm font-black text-[#0F172A]" dir="ltr">
                  {customer?.national_id || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E5EAF1] bg-white px-3 py-2.5">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Phone className="h-4 w-4 text-[#22C7A1]" />
                  الهاتف
                </span>
                <span className="font-mono text-sm font-black text-[#0F172A]" dir="ltr">
                  {customer?.phone || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E5EAF1] bg-white px-3 py-2.5">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Mail className="h-4 w-4 text-[#7C83F6]" />
                  البريد
                </span>
                <span className="max-w-[200px] truncate text-sm font-bold text-[#0F172A]">
                  {customer?.email || '—'}
                </span>
              </div>
            </div>

            {/* Completion meter */}
            <div className="mt-3 rounded-xl border border-[#E5EAF1] bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">اكتمال الملف</span>
                <span className="text-xs font-black text-[#0369A1]">{completion.percent}%</span>
              </div>
              <Progress
                value={completion.percent}
                className="mt-2 h-2 bg-[#E5EAF1] [&>div]:bg-gradient-to-l [&>div]:from-[#38BDF8] [&>div]:to-[#22C7A1]"
              />
              {completion.missing.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500">
                  <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B]" />
                  ناقص: {completion.missing.map((item) => item.label).join('، ')}
                </p>
              )}
            </div>
          </div>

          {/* Money tiles */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <HeroTile
              label="العقود النشطة"
              value={String(snapshot.activeContracts)}
              tone="teal"
              icon={FileText}
            />
            <HeroTile
              label="المستحق"
              value={formatCurrency(snapshot.outstandingTotal)}
              tone={snapshot.outstandingTotal > 1 ? 'amber' : 'teal'}
              icon={Wallet}
            />
            <HeroTile
              label="متأخر الآن"
              value={formatCurrency(snapshot.dueNowTotal)}
              tone={snapshot.dueNowTotal > 1 ? 'rose' : 'teal'}
              icon={AlertTriangle}
            />
            <HeroTile label="إجمالي المسدد" value={formatCurrency(snapshot.paidTotal)} tone="ink" icon={BadgeCheck} />
            <HeroTile
              label="مخالفات غير مسددة"
              value={String(snapshot.unpaidViolationsCount)}
              tone={snapshot.unpaidViolationsCount > 0 ? 'rose' : 'teal'}
              icon={AlertTriangle}
            />
            <button type="button" onClick={onOpenContracts} className="min-w-0 text-right">
              <HeroTile label="كل العقود" value={String(contractsCount)} tone="ink" icon={Car} />
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
