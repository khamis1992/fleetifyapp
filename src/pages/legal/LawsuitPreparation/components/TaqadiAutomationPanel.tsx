import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  CircleStop,
  Clock3,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useLawsuitPreparationContext } from '../store';
import { getCurrentLegalCase } from '../utils/taqadiFiling';
import {
  cancelTaqadiFilingJob,
  getActiveTaqadiWorker,
  getLatestTaqadiFilingJob,
  getTaqadiFilingJobEvents,
  retryTaqadiFilingJob,
  TAQADI_STATUS_LABELS,
  type TaqadiFilingStatus,
} from '../utils/taqadiAutomation';

const activeStatuses = new Set<TaqadiFilingStatus>([
  'queued',
  'validating',
  'waiting_login',
  'filling_case',
  'validating_parties',
  'uploading_documents',
  'reviewing',
  'submitting',
]);

const retryableStatuses = new Set<TaqadiFilingStatus>([
  'failed',
  'needs_human',
  'cancelled',
]);

const statusTone: Record<TaqadiFilingStatus, string> = {
  queued: 'border-sky-200 bg-sky-50 text-sky-800',
  validating: 'border-sky-200 bg-sky-50 text-sky-800',
  waiting_login: 'border-amber-200 bg-amber-50 text-amber-800',
  filling_case: 'border-sky-200 bg-sky-50 text-sky-800',
  validating_parties: 'border-sky-200 bg-sky-50 text-sky-800',
  uploading_documents: 'border-sky-200 bg-sky-50 text-sky-800',
  reviewing: 'border-violet-200 bg-violet-50 text-violet-800',
  submitting: 'border-amber-200 bg-amber-50 text-amber-800',
  filed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  needs_human: 'border-amber-200 bg-amber-50 text-amber-800',
  failed: 'border-red-200 bg-red-50 text-red-800',
  cancelled: 'border-slate-200 bg-slate-50 text-slate-700',
};

export function TaqadiAutomationPanel() {
  const { state, actions } = useLawsuitPreparationContext();
  const queryClient = useQueryClient();
  const { companyId, contractId, documents, trafficViolations, ui } = state;

  const requiredReady = useMemo(() => {
    const required = [
      documents.memo,
      documents.claims,
      documents.docsList,
      documents.contract,
      documents.commercialRegister,
      documents.ibanCertificate,
      documents.representativeId,
    ];
    if (trafficViolations.length > 0) {
      required.push(documents.violations, documents.violationsEvidence);
    }
    return required.every((document) => document.status === 'ready');
  }, [documents, trafficViolations.length]);

  const legalCaseQuery = useQuery({
    queryKey: ['lawsuit-legal-case', companyId, contractId],
    enabled: Boolean(companyId && contractId),
    queryFn: async () => {
      if (!companyId || !contractId) return null;
      return getCurrentLegalCase(companyId, contractId);
    },
  });
  const legalCase = legalCaseQuery.data;

  const jobQuery = useQuery({
    queryKey: ['taqadi-filing-job', companyId, legalCase?.id],
    enabled: Boolean(companyId && legalCase?.id),
    queryFn: async () => {
      if (!companyId || !legalCase?.id) return null;
      return getLatestTaqadiFilingJob(companyId, legalCase.id);
    },
    refetchInterval: 3_000,
  });
  const job = jobQuery.data;

  const eventsQuery = useQuery({
    queryKey: ['taqadi-filing-job-events', companyId, job?.id],
    enabled: Boolean(companyId && job?.id),
    queryFn: async () => {
      if (!companyId || !job?.id) return [];
      return getTaqadiFilingJobEvents(companyId, job.id);
    },
    refetchInterval: job && activeStatuses.has(job.status) ? 3_000 : false,
  });

  const workerQuery = useQuery({
    queryKey: ['taqadi-automation-worker'],
    queryFn: getActiveTaqadiWorker,
    refetchInterval: 10_000,
  });
  const worker = workerQuery.data;
  const workerOnline = Boolean(
    worker
    && Date.now() - new Date(worker.heartbeat_at).getTime() < 45_000
    && worker.status !== 'offline',
  );

  useEffect(() => {
    if (job?.status !== 'filed') return;
    void queryClient.invalidateQueries({
      queryKey: ['lawsuit-legal-case', companyId, contractId],
    });
    void queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
  }, [companyId, contractId, job?.status, queryClient]);

  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !job) throw new Error('تعذر تحديد عملية الرفع');
      return retryTaqadiFilingJob(companyId, job.id);
    },
    onSuccess: async () => {
      toast.success('تمت إعادة الدعوى إلى طابور الرفع');
      await jobQuery.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !job) throw new Error('تعذر تحديد عملية الرفع');
      return cancelTaqadiFilingJob(
        companyId,
        job.id,
        'إلغاء من صفحة تجهيز الدعوى',
      );
    },
    onSuccess: async () => {
      toast.success('تم إلغاء عملية الرفع');
      await jobQuery.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isActive = Boolean(job && activeStatuses.has(job.status));
  const requiresSubmissionVerification = job?.error_code === 'SUBMISSION_UNCERTAIN';
  const canStart = Boolean(
    (!legalCase || legalCase.workflow_stage === 'preparation')
    && requiredReady
    && !isActive
    && !job,
  );
  const recentEvents = (eventsQuery.data ?? []).slice(-5).reverse();

  return (
    <section className="lawsuit-section-panel">
      <div className="lawsuit-section-heading">
        <div>
          <Badge className="bg-[#EAF2F9] text-[#173A63] hover:bg-[#EAF2F9]">
            <Bot className="ml-1 h-3.5 w-3.5" />
            وكيل تقاضي
          </Badge>
          <h2>رفع الدعوى تلقائيًا</h2>
          <p>
            تُرسل الحزمة إلى طابور آمن، ثم يتولى الوكيل تعبئة تقاضي ورفع
            المستندات والاعتماد النهائي.
          </p>
        </div>
        <Badge
          variant="outline"
          className={workerOnline
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-600'}
        >
          {workerOnline
            ? <Wifi className="ml-1 h-3.5 w-3.5" />
            : <WifiOff className="ml-1 h-3.5 w-3.5" />}
          {workerOnline ? 'الوكيل متصل' : 'الوكيل غير متصل'}
        </Badge>
      </div>

      {job && (
        <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {activeStatuses.has(job.status)
                ? <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                : job.status === 'filed'
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  : <AlertCircle className="h-5 w-5 text-amber-600" />}
              <div>
                <strong className="block text-sm text-slate-950">
                  {TAQADI_STATUS_LABELS[job.status]}
                </strong>
                <span className="text-xs text-slate-500">{job.current_step}</span>
              </div>
            </div>
            <Badge variant="outline" className={statusTone[job.status]}>
              المحاولة {job.attempt_count}/{job.max_attempts}
            </Badge>
          </div>

          <div className="space-y-2">
            <Progress value={job.progress} className="h-2" />
            <div className="flex justify-between text-xs text-slate-500">
              <span>{TAQADI_STATUS_LABELS[job.status]}</span>
              <span>{job.progress}%</span>
            </div>
          </div>

          {job.status === 'waiting_login' && (
            <Alert className="border-amber-200 bg-amber-50">
              <Clock3 className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-950">
                افتح نافذة Chrome التي شغّلها الوكيل وسجّل الدخول كمتقاضٍ فرد؛
                ستكمل العملية تلقائيًا بعد نجاح الدخول.
              </AlertDescription>
            </Alert>
          )}

          {(job.error_message || job.status === 'needs_human') && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-700" />
              <AlertDescription className="text-red-950">
                {job.error_message || 'توقفت العملية لحاجتها إلى مراجعة بشرية.'}
              </AlertDescription>
            </Alert>
          )}

          {requiresSubmissionVerification && (
            <Alert className="border-amber-300 bg-amber-50">
              <ShieldCheck className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-950">
                لا تُعد المحاولة قبل مراجعة طلبات تقاضي والتأكد من عدم إنشاء الدعوى؛
                أُوقف زر الإعادة لمنع تسجيل الدعوى مرتين.
              </AlertDescription>
            </Alert>
          )}

          {recentEvents.length > 0 && (
            <div className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 px-3 py-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div className="min-w-0">
                    <span className="block text-sm text-slate-800">
                      {event.message || event.step || event.event_type}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(event.created_at).toLocaleString('ar-QA')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!requiredReady && (
        <Alert className="mt-4 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-950">
            أكمل جميع المستندات الإلزامية قبل إضافة الدعوى إلى الطابور.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={async () => {
            await actions.startTaqadiAutomation();
            await Promise.all([legalCaseQuery.refetch(), jobQuery.refetch()]);
          }}
          disabled={!canStart || ui.isTaqadiAutomating}
          className="bg-[#173A63] text-white hover:bg-[#102C4D]"
        >
          {ui.isTaqadiAutomating
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Play className="h-4 w-4" />}
          إضافة إلى طابور الرفع
        </Button>

        {job && retryableStatuses.has(job.status) && !requiresSubmissionVerification && (
          <Button
            type="button"
            variant="outline"
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending}
          >
            {retryMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
            {job.status === 'cancelled'
              ? 'إعادة تشغيل العملية'
              : 'إعادة المحاولة'}
          </Button>
        )}

        {job && ['queued', 'waiting_login', 'needs_human', 'failed'].includes(job.status) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            <CircleStop className="h-4 w-4" />
            إلغاء العملية
          </Button>
        )}

        {job?.status === 'filed' && (
          <Button type="button" variant="outline" asChild>
            <a
              href="https://taqadi.sjc.gov.qa/itc/login"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              فتح تقاضي
            </a>
          </Button>
        )}
      </div>

      {ui.taqadiAutomationStatus && (
        <p className="mt-3 text-xs text-slate-500">{ui.taqadiAutomationStatus}</p>
      )}
    </section>
  );
}
