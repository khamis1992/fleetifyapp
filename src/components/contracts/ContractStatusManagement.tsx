import * as React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  Scale,
  XCircle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateContractStatus } from '@/hooks/useContractRenewal';
import { cn } from '@/lib/utils';
import { revertContractLegalProcedure } from '@/services/contractLegalProcedureService';

type EditableContractStatus = 'active' | 'suspended' | 'cancelled';

const ACTIVATABLE_CONTRACT_STATUSES = new Set([
  'draft',
  'pending',
  'pending_completion',
  'suspended',
]);

interface ContractStatusManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
  onStatusUpdated?: (newStatus: string) => void;
}

const statusOptions: Array<{
  value: EditableContractStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  background: string;
}> = [
  {
    value: 'active',
    label: 'نشط',
    description: 'استئناف العقد والمعاملات المرتبطة به',
    icon: Play,
    color: 'text-emerald-700',
    background: 'bg-emerald-50',
  },
  {
    value: 'suspended',
    label: 'معلق',
    description: 'إيقاف العمليات مؤقتًا مع إبقاء العقد محفوظًا',
    icon: Pause,
    color: 'text-amber-700',
    background: 'bg-amber-50',
  },
  {
    value: 'cancelled',
    label: 'ملغي',
    description: 'إنهاء العقد وإتاحة المركبة حسب قواعد النظام',
    icon: XCircle,
    color: 'text-rose-700',
    background: 'bg-rose-50',
  },
];

const getStatusMeta = (status?: string) => {
  const editable = statusOptions.find((option) => option.value === status);
  if (editable) return editable;

  switch (status) {
    case 'under_legal_procedure':
      return {
        value: status,
        label: 'تحت الإجراء القانوني',
        description: 'العقد مرتبط بإجراء أو قضية قانونية',
        icon: Scale,
        color: 'text-violet-700',
        background: 'bg-violet-50',
      };
    case 'expired':
      return {
        value: status,
        label: 'منتهي',
        description: 'انتهت مدة العقد',
        icon: AlertTriangle,
        color: 'text-slate-700',
        background: 'bg-slate-100',
      };
    case 'renewed':
      return {
        value: status,
        label: 'مجدد',
        description: 'تم تجديد العقد بعقد لاحق',
        icon: CheckCircle2,
        color: 'text-sky-700',
        background: 'bg-sky-50',
      };
    default:
      return {
        value: status || 'unknown',
        label: status || 'غير محددة',
        description: 'حالة العقد الحالية',
        icon: AlertTriangle,
        color: 'text-slate-700',
        background: 'bg-slate-100',
      };
  }
};

export const ContractStatusManagement: React.FC<ContractStatusManagementProps> = ({
  open,
  onOpenChange,
  contract,
  onStatusUpdated,
}) => {
  const queryClient = useQueryClient();
  const updateStatus = useUpdateContractStatus();
  const [isRevertingLegal, setIsRevertingLegal] = React.useState(false);
  const [statusData, setStatusData] = React.useState<{
    status: EditableContractStatus | '';
    reason: string;
  }>({ status: '', reason: '' });

  const isUnderLegalProcedure = contract?.status === 'under_legal_procedure';
  const isPending = updateStatus.isPending || isRevertingLegal;
  const currentStatus = getStatusMeta(contract?.status);
  const selectedStatus = statusOptions.find((option) => option.value === statusData.status);
  const availableStatuses = isUnderLegalProcedure
    ? statusOptions.filter((option) => option.value === 'active')
    : statusOptions.filter((option) => option.value !== contract?.status
      && (option.value !== 'active' || ACTIVATABLE_CONTRACT_STATUSES.has(contract?.status)));
  const reasonRequired = statusData.status === 'suspended'
    || statusData.status === 'cancelled'
    || isUnderLegalProcedure;
  const trimmedReason = statusData.reason.trim();
  const reasonIsValid = !reasonRequired || trimmedReason.length >= 5;
  const canSubmit = !!statusData.status
    && statusData.status !== contract?.status
    && reasonIsValid
    && !isPending;

  React.useEffect(() => {
    if (open) setStatusData({ status: '', reason: '' });
  }, [open, contract?.id, contract?.status]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contract || !canSubmit || !statusData.status) return;

    try {
      if (isUnderLegalProcedure && statusData.status === 'active') {
        if (!contract.company_id) throw new Error('تعذر تحديد الشركة المرتبطة بالعقد');
        setIsRevertingLegal(true);
        await revertContractLegalProcedure({
          contractId: contract.id,
          companyId: contract.company_id,
          reason: trimmedReason,
        });
        toast.success('تم إنهاء الإجراء القانوني وإعادة العقد إلى الحالة النشطة');
      } else {
        await updateStatus.mutateAsync({
          contractId: contract.id,
          status: statusData.status,
          reason: trimmedReason || undefined,
        });
      }

      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['contract-details'], type: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
        queryClient.invalidateQueries({ queryKey: ['legal-cases'] }),
        queryClient.invalidateQueries({ queryKey: ['manual-legal-delinquency-queue'] }),
      ]);

      onStatusUpdated?.(statusData.status);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating contract status:', error);
      if (isUnderLegalProcedure) {
        const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
        toast.error(`تعذر إنهاء الإجراء القانوني: ${message}`);
      }
    } finally {
      setIsRevertingLegal(false);
    }
  };

  if (!contract) return null;

  const CurrentIcon = currentStatus.icon;
  const SelectedIcon = selectedStatus?.icon;
  const actionLabel = isUnderLegalProcedure
    ? 'إنهاء الإجراء وإعادة التفعيل'
    : statusData.status === 'cancelled'
      ? 'إلغاء العقد'
      : statusData.status === 'suspended'
        ? 'تعليق العقد'
        : statusData.status === 'active'
          ? 'تفعيل العقد'
          : 'اختر الحالة الجديدة';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" dir="rtl">
        <DialogHeader className="space-y-2 pl-7 text-right">
          <DialogTitle className="text-xl">تغيير حالة العقد</DialogTitle>
          <DialogDescription className="text-right leading-6">
            العقد <strong className="text-foreground" dir="ltr">{contract.contract_number}</strong>
            {' '}· اختر الحالة الجديدة وراجع أثرها قبل الحفظ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
            <div className={cn('min-w-0 rounded-md px-3 py-3', currentStatus.background)}>
              <span className="text-xs font-medium text-muted-foreground">الحالة الحالية</span>
              <div className={cn('mt-1 flex items-center gap-2 font-bold', currentStatus.color)}>
                <CurrentIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{currentStatus.label}</span>
              </div>
            </div>

            <div className="flex items-center justify-center text-muted-foreground" aria-hidden="true">
              <ArrowLeft className="h-5 w-5" />
            </div>

            <div className={cn('min-w-0 rounded-md px-3 py-3', selectedStatus?.background || 'bg-muted/60')}>
              <span className="text-xs font-medium text-muted-foreground">الحالة الجديدة</span>
              <div className={cn('mt-1 flex items-center gap-2 font-bold', selectedStatus?.color || 'text-muted-foreground')}>
                {SelectedIcon ? <SelectedIcon className="h-4 w-4 shrink-0" /> : null}
                <span className="truncate">{selectedStatus?.label || 'لم يتم الاختيار'}</span>
              </div>
            </div>
          </div>

          {isUnderLegalProcedure && (
            <div className="rounded-md border border-violet-200 bg-violet-50 p-3 text-sm leading-6 text-violet-900">
              <div className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 shrink-0" />
                <p>
                  إنهاء الإجراء القانوني سيغلق القضايا المفتوحة المرتبطة بالعقد ويزيله من قائمة المتعثرات، ثم يعيده إلى الحالة النشطة.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contract-new-status" className="block text-right font-bold">
              اختر الحالة الجديدة
            </Label>
            <Select
              value={statusData.status}
              onValueChange={(value: EditableContractStatus) => setStatusData((current) => ({ ...current, status: value }))}
              disabled={isPending}
            >
              <SelectTrigger id="contract-new-status" className="h-12 text-right" dir="rtl">
                <SelectValue placeholder="حدد الحالة التي تريد نقل العقد إليها" />
              </SelectTrigger>
              <SelectContent dir="rtl" align="end">
                {availableStatuses.map((option) => {
                  const OptionIcon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value} className="py-3 text-right">
                      <div className="flex items-start gap-3">
                        <OptionIcon className={cn('mt-0.5 h-4 w-4 shrink-0', option.color)} />
                        <div className="text-right">
                          <div className="font-bold">{option.label}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="contract-status-reason" className="font-bold">
                سبب التغيير {reasonRequired ? <span className="text-destructive">*</span> : <span className="font-normal text-muted-foreground">(اختياري)</span>}
              </Label>
              <span className="text-xs text-muted-foreground">{statusData.reason.length}/300</span>
            </div>
            <Textarea
              id="contract-status-reason"
              value={statusData.reason}
              onChange={(event) => setStatusData((current) => ({ ...current, reason: event.target.value }))}
              placeholder={isUnderLegalProcedure
                ? 'اذكر سبب إنهاء الإجراء القانوني وإعادة تفعيل العقد'
                : statusData.status === 'cancelled'
                  ? 'اذكر سبب إلغاء العقد'
                  : statusData.status === 'suspended'
                    ? 'اذكر سبب تعليق العقد'
                    : 'أضف ملاحظة توضح سبب تغيير الحالة'}
              maxLength={300}
              rows={3}
              disabled={isPending}
              className={cn('resize-none text-right leading-6', reasonRequired && trimmedReason.length > 0 && !reasonIsValid && 'border-destructive')}
            />
            {reasonRequired && !reasonIsValid && (
              <p className="text-xs text-muted-foreground">اكتب سببًا واضحًا من 5 أحرف على الأقل لإكمال الإجراء.</p>
            )}
          </div>

          {statusData.status === 'cancelled' && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p><strong>تنبيه:</strong> إلغاء العقد إجراء مؤثر وقد يغيّر حالة المركبة والمعاملات المرتبطة.</p>
              </div>
            </div>
          )}

          {statusData.status === 'suspended' && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <Pause className="mt-0.5 h-4 w-4 shrink-0" />
                <p>سيتم إيقاف عمليات العقد مؤقتًا إلى أن تتم إعادة تفعيله.</p>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              variant={statusData.status === 'cancelled' ? 'destructive' : 'default'}
              className={cn(isUnderLegalProcedure && 'bg-violet-700 text-white hover:bg-violet-800')}
            >
              {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {isPending ? 'جاري تحديث الحالة...' : actionLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
