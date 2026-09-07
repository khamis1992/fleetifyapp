import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';

import type { ContractCancellationImpact } from '@/hooks/useContractRenewal';

interface ContractCancellationImpactPanelProps {
  impact?: ContractCancellationImpact;
  isLoading: boolean;
  error?: unknown;
  disabled?: boolean;
}

const formatQar = (value: number) => new Intl.NumberFormat('ar-QA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'تعذر فحص المخالفات');
  }
  return 'تعذر فحص المخالفات المرتبطة بالعقد';
};

export const ContractCancellationImpactPanel = ({
  impact,
  isLoading,
  error,
}: ContractCancellationImpactPanelProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        جاري فحص المخالفات وفواتيرها قبل الإلغاء...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-1 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">تعذر التحقق من المخالفات؛ لن يسمح النظام بالإلغاء حتى يكتمل الفحص.</p>
            <p className="mt-1 text-xs">{getErrorMessage(error)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!impact?.openPenaltyCount) return null;

  return (
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <div className="flex items-start gap-2 text-sm leading-6">
        <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
        <div>
          <p className="font-bold">يوجد {impact.openPenaltyCount} مخالفة مرورية مفتوحة</p>
          <p>الإجمالي: <strong>{formatQar(impact.openPenaltyAmount)} ر.ق</strong></p>
        </div>
      </div>

      <p className="rounded-md border border-amber-300 bg-white/80 p-3 text-sm leading-6">
        تبقى المخالفات المرورية على مسؤولية العميل بعد إلغاء العقد، وتبقى فواتيرها ودفعاتها وروابطها بالعميل والعقد محفوظة للتحصيل والمتابعة.
      </p>
    </div>
  );
};
