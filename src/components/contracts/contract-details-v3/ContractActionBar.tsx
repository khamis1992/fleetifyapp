/**
 * ContractActionBarV3 — one sticky, context-aware action strip (light theme).
 * The primary recommendation comes first with a tone-colored chip; risky
 * operations sit in the overflow menu; destructive ones are quarantined
 * under a clearly labeled danger zone.
 */

import { motion } from 'framer-motion';
import {
  CheckCircle2,
  FileEdit,
  MoreHorizontal,
  Printer,
  RefreshCw,
  Scale,
  ShieldAlert,
  Trash2,
  XCircle,
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
import type { Contract } from '@/types/contracts';
import { cn } from '@/lib/utils';
import { canReactivateCancelledContract } from '@/services/contractReactivationService';
import {
  permanentlyDeletableContractStatusesV3,
  type ContractFinancialSnapshot,
} from './tokens';

export interface ContractActionBarProps {
  contract: Contract;
  snapshot: ContractFinancialSnapshot;
  violationsCount: number;
  daysRemaining: number | null;
  formatCurrency: (amount: number) => string;
  onEdit: () => void;
  onPrint: () => void;
  onExport: () => void;
  onRefresh: () => void;
  onRenew: () => void;
  onTerminate: () => void;
  onReactivate: () => void;
  onConvertToLegal: () => void;
  onRemoveLegal: () => void;
  onDeletePermanent: () => void;
  onCollect: () => void;
  onOpenViolations: () => void;
  onOpenDocuments: () => void;
  documentGenerationBlocker?: string | null;
}

type NextMove = {
  title: string;
  note: string;
  button: string;
  tone: 'teal' | 'amber' | 'rose' | 'indigo' | 'sky';
  onClick: () => void;
};

export function ContractActionBar({
  contract,
  snapshot,
  violationsCount,
  daysRemaining,
  formatCurrency,
  onEdit,
  onPrint,
  onExport,
  onRefresh,
  onRenew,
  onTerminate,
  onReactivate,
  onConvertToLegal,
  onRemoveLegal,
  onDeletePermanent,
  onCollect,
  onOpenViolations,
  onOpenDocuments,
  documentGenerationBlocker,
}: ContractActionBarProps) {
  const status = String(contract.status || '').toLowerCase();
  const canRenew = status === 'active';
  const canReactivate = canReactivateCancelledContract(contract.status);
  const canConvertToLegal = ['active', 'cancelled', 'canceled', 'closed', 'expired'].includes(status);
  const isLegal = status === 'under_legal_procedure';
  const canDeletePermanently = permanentlyDeletableContractStatusesV3.has(status);

  let nextMove: NextMove;
  if (isLegal) {
    nextMove = {
      title: 'متابعة الإجراء القانوني',
      note: 'العقد محوّل للشؤون القانونية — راجع المستندات قبل أي تعديل مالي.',
      button: 'المستندات',
      tone: 'indigo',
      onClick: onOpenDocuments,
    };
  } else if (snapshot.dueNowTotal > 0) {
    nextMove = {
      title: 'تحصيل المستحق',
      note: `${formatCurrency(snapshot.dueNowTotal)} مستحقة الآن على ${snapshot.openInvoicesCount} فاتورة مفتوحة.`,
      button: 'تسجيل دفعة',
      tone: 'amber',
      onClick: onCollect,
    };
  } else if (snapshot.outstandingTotal > 0) {
    nextMove = {
      title: 'متابعة الفواتير المفتوحة',
      note: `${snapshot.openInvoicesCount} فاتورة برصيد ${formatCurrency(snapshot.outstandingTotal)} بانتظار التسوية.`,
      button: 'الملف المالي',
      tone: 'amber',
      onClick: onCollect,
    };
  } else if (violationsCount > 0) {
    nextMove = {
      title: 'مراجعة المخالفات',
      note: `${violationsCount} مخالفة مرتبطة بالعقد تحتاج تحميلاً أو تحويلاً للعميل.`,
      button: 'المخالفات',
      tone: 'rose',
      onClick: onOpenViolations,
    };
  } else if (daysRemaining !== null && daysRemaining <= 30 && status === 'active') {
    nextMove = {
      title: 'الاستعداد للتجديد',
      note: daysRemaining > 0 ? `باقي ${daysRemaining} يوم على انتهاء العقد.` : 'العقد ينتهي اليوم.',
      button: 'تجديد',
      tone: 'sky',
      onClick: onRenew,
    };
  } else {
    nextMove = {
      title: 'العقد مستقر',
      note: 'لا يوجد إجراء عاجل — راقب الدفعات والمستندات من ملف العقد.',
      button: 'تحديث البيانات',
      tone: 'teal',
      onClick: onRefresh,
    };
  }

  const toneClasses: Record<NextMove['tone'], { chip: string; button: string; bar: string }> = {
    teal: {
      chip: 'bg-[#ECFDF9] text-[#0E9E7E] border-[#22C7A1]/30',
      button: 'bg-[#22C7A1] text-white hover:bg-[#0E9E7E] shadow-[0_8px_18px_-8px_rgba(34,199,161,0.6)]',
      bar: 'border-[#22C7A1]/35',
    },
    amber: {
      chip: 'bg-[#FFFBEB] text-[#B45309] border-[#F59E0B]/35',
      button: 'bg-[#F59E0B] text-white hover:bg-[#D97706] shadow-[0_8px_18px_-8px_rgba(245,158,11,0.55)]',
      bar: 'border-[#F59E0B]/40',
    },
    rose: {
      chip: 'bg-[#FFF5F6] text-[#BE123C] border-[#FB6B7A]/35',
      button: 'bg-[#FB6B7A] text-white hover:bg-[#F43F5E] shadow-[0_8px_18px_-8px_rgba(251,107,122,0.55)]',
      bar: 'border-[#FB6B7A]/40',
    },
    indigo: {
      chip: 'bg-[#EEF2FF] text-[#4F46E5] border-[#7C83F6]/35',
      button: 'bg-[#7C83F6] text-white hover:bg-[#6472F3] shadow-[0_8px_18px_-8px_rgba(124,131,246,0.55)]',
      bar: 'border-[#7C83F6]/40',
    },
    sky: {
      chip: 'bg-[#F0F9FF] text-[#0369A1] border-[#38BDF8]/35',
      button: 'bg-[#38BDF8] text-white hover:bg-[#0EA5E9] shadow-[0_8px_18px_-8px_rgba(56,189,248,0.55)]',
      bar: 'border-[#38BDF8]/40',
    },
  };

  const tone = toneClasses[nextMove.tone];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.25)]',
        tone.bar,
      )}
    >
      {/* Next move chip */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cn('shrink-0 rounded-full border px-3 py-1 text-[11px] font-black', tone.chip)}>
          الخطوة التالية
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#0F172A]">{nextMove.title}</p>
          <p className="truncate text-xs font-semibold text-slate-500">{nextMove.note}</p>
        </div>
      </div>

      {/* Contextual quick actions */}
      <div className="flex flex-wrap items-center gap-2">
        {canRenew && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRenew}
            className="h-9 gap-2 rounded-lg border-[#22C7A1]/40 bg-white text-xs font-black text-[#0E9E7E] hover:bg-[#ECFDF9]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            تجديد
          </Button>
        )}
        {canReactivate && (
          <Button
            size="sm"
            variant="outline"
            onClick={onReactivate}
            className="h-9 gap-2 rounded-lg border-[#22C7A1]/40 bg-white text-xs font-black text-[#0E9E7E] hover:bg-[#ECFDF9]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            إعادة تفعيل
          </Button>
        )}
        {isLegal && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRemoveLegal}
            className="h-9 gap-2 rounded-lg border-[#22C7A1]/40 bg-white text-xs font-black text-[#0E9E7E] hover:bg-[#ECFDF9]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            إزالة الإجراء القانوني
          </Button>
        )}

        <Button
          size="sm"
          onClick={nextMove.onClick}
          className={cn('h-9 gap-2 rounded-lg px-4 text-xs font-black', tone.button)}
        >
          {nextMove.button}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2 rounded-lg border-[#E5EAF1] bg-white text-xs font-black text-slate-700 hover:bg-[#F6F8FB]"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              إجراءات
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl border-[#E5EAF1] text-right">
            <DropdownMenuLabel className="text-[11px] font-black text-slate-400">إجراءات العقد</DropdownMenuLabel>
            <DropdownMenuItem onClick={onEdit} className="gap-2 text-xs font-bold">
              <FileEdit className="h-4 w-4 text-slate-500" />
              تعديل العقد
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onPrint}
              disabled={Boolean(documentGenerationBlocker)}
              title={documentGenerationBlocker || undefined}
              className="gap-2 text-xs font-bold"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              طباعة العقد الرسمي
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onExport}
              disabled={Boolean(documentGenerationBlocker)}
              title={documentGenerationBlocker || undefined}
              className="gap-2 text-xs font-bold"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              تصدير العقد الرسمي
            </DropdownMenuItem>
            {canConvertToLegal && (
              <DropdownMenuItem onClick={onConvertToLegal} className="gap-2 text-xs font-bold text-[#4F46E5]">
                <Scale className="h-4 w-4" />
                تحويل للشؤون القانونية
              </DropdownMenuItem>
            )}
            {status === 'active' && (
              <DropdownMenuItem onClick={onTerminate} className="gap-2 text-xs font-bold text-rose-600">
                <XCircle className="h-4 w-4" />
                إنهاء العقد
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px] font-black text-rose-500">
              <ShieldAlert className="h-3.5 w-3.5" />
              منطقة الخطر
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onDeletePermanent}
              disabled={!canDeletePermanently}
              title={canDeletePermanently ? undefined : 'يجب إنهاء العقد أو إلغاؤه قبل الحذف النهائي'}
              className="gap-2 text-xs font-bold text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
              حذف نهائي
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.section>
  );
}
