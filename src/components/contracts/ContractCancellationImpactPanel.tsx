import { AlertTriangle, Building2, Loader2, ShieldAlert } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { ContractCancellationImpact } from '@/hooks/useContractRenewal';

interface ContractCancellationImpactPanelProps {
  impact?: ContractCancellationImpact;
  isLoading: boolean;
  error?: unknown;
  transferToCompany: boolean;
  onTransferToCompanyChange: (checked: boolean) => void;
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
  transferToCompany,
  onTransferToCompanyChange,
  disabled = false,
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

  if (!impact?.requiresCompanyTransfer) return null;

  if (impact.blockedPenaltyCount > 0) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-900">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-1 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">لا يمكن تحويل كل المخالفات إلى الشركة الآن.</p>
            <p>
              توجد {impact.blockedPenaltyCount} مخالفة مرتبطة بفاتورة عليها دفعة عميل. يجب إلغاء الدفعة أو إعادة تخصيصها أولًا حتى لا تضيع الحقوق المالية.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!impact.authorizedToTransfer) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-1 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">يتطلب التحويل صلاحية إلغاء الفواتير المالية.</p>
            <p>اطلب من مدير الشركة أو المحاسب المخوّل تنفيذ إلغاء العقد وتحويل المخالفات.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <div className="flex items-start gap-2 text-sm leading-6">
        <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
        <div>
          <p className="font-bold">يوجد {impact.openPenaltyCount} مخالفة مرورية مفتوحة</p>
          <p>الإجمالي: <strong>{formatQar(impact.openPenaltyAmount)} ر.ق</strong></p>
        </div>
      </div>

      <div className="rounded-md border border-amber-300 bg-white/80 p-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="transfer-traffic-penalties-to-company"
            checked={transferToCompany}
            onCheckedChange={(checked) => onTransferToCompanyChange(checked === true)}
            disabled={disabled}
            className="mt-1"
          />
          <Label
            htmlFor="transfer-traffic-penalties-to-company"
            className="cursor-pointer text-sm font-bold leading-6"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              تحويل المخالفات غير المسددة إلى مسؤولية الشركة
            </span>
          </Label>
        </div>
        <p className="mr-7 mt-2 text-xs leading-5 text-amber-800">
          سيُلغي النظام فواتير المخالفات غير المدفوعة بعكس محاسبي، ويحفظ اسم العميل ورقم العقد الأصليين للتدقيق، ثم ينقل المخالفات إلى سجل الشركة.
        </p>
      </div>
    </div>
  );
};
