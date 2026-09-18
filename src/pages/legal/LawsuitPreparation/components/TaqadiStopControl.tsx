import { CircleStop, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TaqadiFilingJob } from '../utils/taqadiAutomation';

const requiresSubmissionCheck = (job: TaqadiFilingJob) =>
  Boolean(job.error_code?.startsWith('SUBMISSION_UNCERTAIN'));

export function TaqadiStopControl({ job, pending, onStop }: {
  job: TaqadiFilingJob; pending: boolean; onStop: () => void;
}) {
  if (['filed', 'cancelled'].includes(job.status) || job.current_step === 'receipt_sync_pending'
    || requiresSubmissionCheck(job) || job.result || job.error_code === 'MANUALLY_STOPPED') return null;
  const requested = job.error_code === 'MANUAL_STOP_REQUESTED';
  return (
    <div className="flex basis-full flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3" dir="rtl">
      <Button type="button" variant="outline" onClick={onStop} disabled={pending || requested}
        className="border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800">
        {pending || requested ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleStop className="h-4 w-4" />}
        {requested ? 'بانتظار توقف الوكيل' : pending ? 'جاري طلب الإيقاف…' : 'إيقاف الوكيل'}
      </Button>
      <p className="text-xs leading-6 text-amber-950" role="status">
        {requested
          ? 'سيتوقف الوكيل عند نقطة آمنة. انتظر تأكيد التوقف قبل متابعة الطلب يدويًا.'
          : job.status === 'submitting'
            ? 'بعد الإيقاف، تحقق من الطلب الموجود في تقاضي. إيقاف الوكيل لا يلغي طلبًا تم إيداعه.'
            : 'يمكنك إيقاف الوكيل مع الاحتفاظ بالمستندات والمسودة الحالية.'}
      </p>
    </div>
  );
}
