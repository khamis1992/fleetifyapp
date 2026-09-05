/**
 * CustomerActionBarV3 — one sticky, context-aware action strip (light theme).
 * The primary recommendation ("الخطوة التالية") comes first with a tone chip;
 * dangerous operations are quarantined in the overflow danger zone.
 */

import { motion } from 'framer-motion';
import {
  CalendarClock,
  Database,
  Edit3,
  FilePlus2,
  Gavel,
  MessageSquarePlus,
  MoreHorizontal,
  PhoneOutgoing,
  Printer,
  RefreshCw,
  Share2,
  ShieldAlert,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { CustomerSnapshotV3 } from './tokens';

export interface CustomerActionBarProps {
  snapshot: CustomerSnapshotV3;
  formatCurrency: (amount: number) => string;
  onAddPayment: () => void;
  onCreateContract: () => void;
  onUploadDocument: () => void;
  onOpenCrm: () => void;
  onOpenViolations: () => void;
  onOpenFinancial: () => void;
  onOpenContracts: () => void;
  onRenewContract: (contractId: string) => void;
  onEdit: () => void;
  onPrint: () => void;
  onShare: () => void;
  onOpenLegal: () => void;
  onOpenLegalData: () => void;
  onDelete: () => void;
}

type NextMove = {
  title: string;
  note: string;
  button: string;
  tone: 'teal' | 'amber' | 'rose' | 'indigo' | 'sky';
  icon: typeof Wallet;
  onClick: () => void;
};

const TONE_STYLES = {
  teal: { chip: 'bg-[#ECFDF9] text-[#0E9E7E] border-[#22C7A1]/30', bar: 'from-[#22C7A1] to-[#38BDF8]' },
  amber: { chip: 'bg-[#FFFBEB] text-[#B45309] border-[#F59E0B]/30', bar: 'from-[#F59E0B] to-[#FB923C]' },
  rose: { chip: 'bg-[#FFF5F6] text-[#BE123C] border-[#FB6B7A]/30', bar: 'from-[#FB6B7A] to-[#F59E0B]' },
  indigo: { chip: 'bg-[#EEF0FE] text-[#4F46E5] border-[#7C83F6]/30', bar: 'from-[#7C83F6] to-[#38BDF8]' },
  sky: { chip: 'bg-[#F0F9FF] text-[#0369A1] border-[#38BDF8]/30', bar: 'from-[#38BDF8] to-[#22C7A1]' },
} as const;

export function CustomerActionBar({
  snapshot,
  formatCurrency,
  onAddPayment,
  onCreateContract,
  onUploadDocument,
  onOpenCrm,
  onOpenViolations,
  onOpenFinancial,
  onOpenContracts,
  onRenewContract,
  onEdit,
  onPrint,
  onShare,
  onOpenLegal,
  onOpenLegalData,
  onDelete,
}: CustomerActionBarProps) {
  let nextMove: NextMove;

  if (snapshot.dueNowTotal > 1) {
    nextMove = {
      title: 'تحصيل المتأخرات',
      note: `${formatCurrency(snapshot.dueNowTotal)} تجاوزت تاريخ الاستحقاق — ابدأ التحصيل الآن.`,
      button: 'تسجيل دفعة',
      tone: 'rose',
      icon: Wallet,
      onClick: onAddPayment,
    };
  } else if (snapshot.unpaidViolationsCount > 0) {
    nextMove = {
      title: 'تسوية المخالفات',
      note: `${snapshot.unpaidViolationsCount} مخالفة غير مسددة بإجمالي ${formatCurrency(snapshot.unpaidViolationsTotal)}.`,
      button: 'مراجعة المخالفات',
      tone: 'rose',
      icon: ShieldAlert,
      onClick: onOpenViolations,
    };
  } else if (snapshot.renewalOpportunities.length > 0) {
    const opportunity = snapshot.renewalOpportunities[0];
    nextMove = {
      title: 'فرصة تجديد قادمة',
      note:
        opportunity.daysRemaining >= 0
          ? `العقد ${opportunity.contractNumber} ينتهي خلال ${opportunity.daysRemaining} يوم — بادر بالتجديد قبل فقدان العميل.`
          : `العقد ${opportunity.contractNumber} انتهى منذ ${Math.abs(opportunity.daysRemaining)} يوم — جدّد أو أغلق الملف.`,
      button: 'تجديد العقد',
      tone: 'amber',
      icon: CalendarClock,
      onClick: () => onRenewContract(opportunity.contractId),
    };
  } else if (snapshot.overdueFollowups > 0) {
    nextMove = {
      title: 'متابعات متأخرة',
      note: `${snapshot.overdueFollowups} متابعة تجاوزت موعدها — أغلقها أو أعد جدولتها.`,
      button: 'فتح CRM',
      tone: 'indigo',
      icon: PhoneOutgoing,
      onClick: onOpenCrm,
    };
  } else if (snapshot.activeContracts === 0) {
    nextMove = {
      title: 'عميل بلا عقود نشطة',
      note: 'لا يوجد عقد نشط حالياً — هذه فرصة لإنشاء عقد جديد.',
      button: 'عقد جديد',
      tone: 'teal',
      icon: FilePlus2,
      onClick: onCreateContract,
    };
  } else if (snapshot.outstandingTotal > 1) {
    nextMove = {
      title: 'متابعة الفواتير المفتوحة',
      note: `${snapshot.openInvoicesCount} فاتورة برصيد ${formatCurrency(snapshot.outstandingTotal)} بانتظار التسوية.`,
      button: 'الملف المالي',
      tone: 'amber',
      icon: Wallet,
      onClick: onOpenFinancial,
    };
  } else {
    nextMove = {
      title: 'العلاقة منتظمة',
      note: 'لا توجد متأخرات — وثّق تواصلاً جديداً للحفاظ على العلاقة.',
      button: 'تسجيل تواصل',
      tone: 'sky',
      icon: MessageSquarePlus,
      onClick: onOpenCrm,
    };
  }

  const tone = TONE_STYLES[nextMove.tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border border-[#E5EAF1] bg-white shadow-[0_8px_28px_-20px_rgba(15,23,42,0.35)]"
    >
      <div className={cn('h-1 w-full bg-gradient-to-l', tone.bar)} />

      <div className="flex flex-wrap items-center gap-3 p-3.5">
        {/* Next best move */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', tone.chip)}>
            <nextMove.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-[#0F172A]">{nextMove.title}</p>
              <span className="hidden rounded-full border border-[#E5EAF1] bg-[#F6F8FB] px-2 py-0.5 text-[10px] font-black text-slate-500 sm:inline">
                الخطوة التالية
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{nextMove.note}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={nextMove.onClick}
            className={cn(
              'h-9 gap-2 rounded-xl px-4 text-xs font-black text-white shadow-sm',
              nextMove.tone === 'rose' && 'bg-[#FB6B7A] hover:bg-[#E5484F]',
              nextMove.tone === 'amber' && 'bg-[#F59E0B] hover:bg-[#D97706]',
              nextMove.tone === 'indigo' && 'bg-[#7C83F6] hover:bg-[#5F66E8]',
              nextMove.tone === 'teal' && 'bg-[#22C7A1] hover:bg-[#0E9E7E]',
              nextMove.tone === 'sky' && 'bg-[#38BDF8] hover:bg-[#0284C7]',
            )}
          >
            {nextMove.button}
          </Button>

          <div className="mx-1 hidden h-7 w-px bg-[#E5EAF1] sm:block" />

          {/* Quick actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateContract}
            className="h-9 gap-2 rounded-xl border-[#E5EAF1] px-3 text-xs font-bold text-[#0F172A] hover:border-[#22C7A1]/40 hover:bg-[#ECFDF9]"
          >
            <FilePlus2 className="h-4 w-4 text-[#0E9E7E]" />
            عقد جديد
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddPayment}
            className="h-9 gap-2 rounded-xl border-[#E5EAF1] px-3 text-xs font-bold text-[#0F172A] hover:border-[#22C7A1]/40 hover:bg-[#ECFDF9]"
          >
            <Wallet className="h-4 w-4 text-[#0E9E7E]" />
            دفعة
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onUploadDocument}
            className="h-9 gap-2 rounded-xl border-[#E5EAF1] px-3 text-xs font-bold text-[#0F172A] hover:border-[#38BDF8]/40 hover:bg-[#F0F9FF]"
          >
            <Upload className="h-4 w-4 text-[#0369A1]" />
            مستند
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 gap-0 rounded-xl border-[#E5EAF1] p-0 text-slate-600 hover:bg-[#F6F8FB]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="text-xs font-black text-slate-400">إجراءات عامة</DropdownMenuLabel>
              <DropdownMenuItem onClick={onEdit} className="gap-2">
                <Edit3 className="h-4 w-4" />
                تعديل بيانات العميل
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenCrm} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                فتح سجل CRM
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenContracts} className="gap-2">
                <CalendarClock className="h-4 w-4" />
                العقود والمركبات
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPrint} className="gap-2">
                <Printer className="h-4 w-4" />
                طباعة الصفحة
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                مشاركة الرابط
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-black text-slate-400">الشؤون القانونية</DropdownMenuLabel>
              <DropdownMenuItem onClick={onOpenLegal} className="gap-2 text-indigo-700 focus:bg-indigo-50 focus:text-indigo-700">
                <Gavel className="h-4 w-4" />
                إنشاء قضية قانونية
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenLegalData} className="gap-2 text-blue-700 focus:bg-blue-50 focus:text-blue-700">
                <Database className="h-4 w-4" />
                بيانات التقاضي
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-black text-rose-500">منطقة الخطر</DropdownMenuLabel>
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-rose-600 focus:bg-rose-50 focus:text-rose-600">
                <Trash2 className="h-4 w-4" />
                حذف العميل نهائياً
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}
