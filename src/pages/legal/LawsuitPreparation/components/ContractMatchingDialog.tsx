import { lazy, Suspense } from 'react';
import { FileCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLawsuitPreparationContext } from '../store';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const ContractMatchingWorkspace = lazy(() => import('./ContractMatchingWorkspace')
  .then((module) => ({ default: module.ContractMatchingWorkspace })));

function ReviewLoadError() {
  return <p role="alert" className="p-6 text-sm text-red-800">
    تعذر تحميل أدوات المطابقة. أغلق هذه النافذة وافتحها مجددًا؛ تبقى بيانات تجهيز الدعوى محفوظة.
  </p>;
}

/** Reuse the authoritative matching workflow without leaving the filing workspace. */
export function ContractMatchingDialog({ onClose }: { onClose: () => void }) {
  const { state } = useLawsuitPreparationContext();
  if (!state.contractId) return null;

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent dir="rtl"
      className="flex h-[92dvh] max-h-[960px] w-[calc(100%-1rem)] max-w-6xl flex-col gap-4 overflow-hidden bg-white p-4 text-slate-900 dark:bg-white dark:text-slate-900 sm:p-6">
      <DialogHeader className="shrink-0 pe-8 text-right sm:text-right">
        <DialogTitle className="flex items-center gap-2 text-[#173A63]">
          <FileCheck className="h-5 w-5" />مراجعة العقد والمطابقة
        </DialogTitle>
        <DialogDescription>
          عقد {state.contract?.contract_number || state.contractId} · اختر النسخة أدناه لإكمال مراجعتها واعتمادها.
          تتحدث جاهزية الدعوى بعد حفظ المطابقة.
        </DialogDescription>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-slate-200">
        <ErrorBoundary fallback={ReviewLoadError}>
        <Suspense fallback={<p role="status" className="flex items-center gap-2 p-6">
          <Loader2 className="h-4 w-4 animate-spin" />جارٍ تحميل مستندات العقد وأدوات المطابقة…
        </p>}>
          <ContractMatchingWorkspace contractId={state.contractId}
            customerId={state.contract?.customer_id || state.customer?.id || undefined}
            vehicleId={state.contract?.vehicle_id || undefined} />
        </Suspense>
        </ErrorBoundary>
      </div>
      <div className="flex shrink-0 justify-end border-t pt-3">
        <Button type="button" variant="outline" onClick={onClose}>العودة إلى حافظة الدعوى</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
