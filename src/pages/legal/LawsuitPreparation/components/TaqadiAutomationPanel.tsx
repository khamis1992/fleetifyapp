import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleStop,
  Clock3,
  Download,
  ExternalLink,
  Loader2,
  Paperclip,
  Play,
  RefreshCw,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useLawsuitPreparationContext } from '../store';
import { getCurrentLegalCase } from '../utils/taqadiFiling';
import {
  cancelTaqadiFilingJob,
  getActiveTaqadiWorker,
  getLatestTaqadiFilingJob,
  getTaqadiArtifactDownloadUrl,
  getTaqadiFilingJobArtifacts,
  getTaqadiFilingJobEvents,
  resumeTaqadiFilingJob,
  retryTaqadiFilingJob,
  subscribeToTaqadiJobUpdates,
  TAQADI_STATUS_LABELS,
  type TaqadiFilingJobEvent,
  type TaqadiFilingStatus,
} from '../utils/taqadiAutomation';
import { decodeDisplayText } from '@/utils/arabicDisplayText';
import { TaqadiAgentStartButton } from '@/components/legal/TaqadiAgentStartButton';

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

const resumableStatuses = new Set<TaqadiFilingStatus>([
  'failed',
  'needs_human',
  'waiting_login',
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

// خطوات قرارات الوكيل الذكية (المستوى الثاني) — تُعرض بشارات وأسباب التحقق
const AGENT_DECISION_STEPS: Record<string, { label: string; tone: string }> = {
  auto_heal_applied: {
    label: 'شفاء تلقائي مُتحقق',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  auto_heal_rejected: {
    label: 'شفاء مرفوض آليًا',
    tone: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  advisor_navigation: {
    label: 'توجيه ذكي',
    tone: 'border-violet-200 bg-violet-50 text-violet-800',
  },
  advisor_rejected: {
    label: 'توجيه مرفوض',
    tone: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  observe_portal: {
    label: 'فهم الصفحة',
    tone: 'border-sky-200 bg-sky-50 text-sky-800',
  },
};

const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  screenshot: 'لقطة شاشة',
  receipt: 'إيصال',
  submission_summary: 'ملخص التقديم',
  error_snapshot: 'لقطة الخطأ',
  trace: 'تتبع Playwright',
  heal_proposal: 'اقتراح شفاء',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/** يستخرج سطر تفسيري واحد من تفاصيل حدث قرار وكيل */
function agentDecisionReason(event: TaqadiFilingJobEvent): string | null {
  const details = event.details;
  const verification = asRecord(details?.verification);
  if (typeof verification?.reason === 'string' && verification.reason) {
    return verification.reason;
  }
  const suggestion = asRecord(details?.suggestion);
  if (typeof suggestion?.rationale === 'string' && suggestion.rationale) {
    return suggestion.rationale;
  }
  const proposal = asRecord(details?.proposal);
  if (typeof proposal?.rationale === 'string' && proposal.rationale) {
    return proposal.rationale;
  }
  return null;
}

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

  // Realtime pushes job/event changes instantly; polling stays only as a slow
  // fallback for when the websocket is not connected.
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const pollInterval = realtimeConnected ? 20_000 : 3_000;

  const jobQuery = useQuery({
    queryKey: ['taqadi-filing-job', companyId, legalCase?.id],
    enabled: Boolean(companyId && legalCase?.id),
    queryFn: async () => {
      if (!companyId || !legalCase?.id) return null;
      return getLatestTaqadiFilingJob(companyId, legalCase.id);
    },
    refetchInterval: pollInterval,
  });
  const job = jobQuery.data;

  const eventsQuery = useQuery({
    queryKey: ['taqadi-filing-job-events', companyId, job?.id],
    enabled: Boolean(companyId && job?.id),
    queryFn: async () => {
      if (!companyId || !job?.id) return [];
      return getTaqadiFilingJobEvents(companyId, job.id);
    },
    refetchInterval: job && activeStatuses.has(job.status) ? pollInterval : false,
  });

  const artifactsQuery = useQuery({
    queryKey: ['taqadi-filing-artifacts', companyId, job?.id],
    enabled: Boolean(companyId && job?.id),
    queryFn: async () => {
      if (!companyId || !job?.id) return [];
      return getTaqadiFilingJobArtifacts(companyId, job.id);
    },
  });

  useEffect(() => {
    if (!companyId || !legalCase?.id) return;
    return subscribeToTaqadiJobUpdates({
      companyId,
      legalCaseId: legalCase.id,
      onChange: () => {
        void queryClient.invalidateQueries({
          queryKey: ['taqadi-filing-job', companyId, legalCase.id],
        });
        void queryClient.invalidateQueries({
          queryKey: ['taqadi-filing-job-events', companyId],
        });
        void queryClient.invalidateQueries({
          queryKey: ['taqadi-filing-artifacts', companyId],
        });
      },
      onStatus: setRealtimeConnected,
    });
  }, [companyId, legalCase?.id, queryClient]);

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

  // Alert the operator the moment a filing stops for human input; the worker
  // may be waiting on a Chrome window nobody is watching.
  const previousStatusRef = useRef<TaqadiFilingStatus | null>(null);
  useEffect(() => {
    const previous = previousStatusRef.current;
    previousStatusRef.current = job?.status ?? null;
    if (!job || job.status === previous) return;

    if (activeStatuses.has(job.status) && 'Notification' in window
      && Notification.permission === 'default') {
      void Notification.requestPermission();
    }

    const wasActive = previous !== null && activeStatuses.has(previous);
    if (!wasActive) return;
    if (job.status === 'needs_human' || job.status === 'waiting_login') {
      const body = decodeDisplayText(job.error_message)
        || 'وكيل تقاضي متوقف بانتظار إجراء بشري.';
      toast.warning('دعوى تقاضي تحتاج تدخلك', { description: body });
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('دعوى تقاضي تحتاج تدخلك', { body });
      }
    } else if (job.status === 'filed') {
      toast.success('تم رفع الدعوى في تقاضي بنجاح');
    } else if (job.status === 'failed') {
      toast.error('فشل رفع الدعوى في تقاضي', {
        description: decodeDisplayText(job.error_message) || undefined,
      });
    }
  }, [job]);

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

  const resumeMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !job) throw new Error('تعذر تحديد عملية الرفع');
      return resumeTaqadiFilingJob(companyId, job.id);
    },
    onSuccess: async () => {
      toast.success('سيحدد الوكيل صفحة تقاضي المفتوحة ويكمل منها');
      await Promise.all([jobQuery.refetch(), eventsQuery.refetch()]);
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
  const reachedAttemptLimit = Boolean(
    job && job.attempt_count >= job.max_attempts,
  );
  const canExplicitlyRestart = job?.status === 'cancelled';
  const canStart = Boolean(
    (!legalCase || legalCase.workflow_stage === 'preparation')
    && requiredReady
    && !isActive
    && !job,
  );
  const assistanceEvent = [...(eventsQuery.data ?? [])]
    .reverse()
    .find((event) => event.details?.resumeSupported === true);
  const assistanceDetails = assistanceEvent?.details;
  const portalLabel = typeof assistanceDetails?.portalLabel === 'string'
    ? assistanceDetails.portalLabel
    : null;
  const requiredActions = Array.isArray(assistanceDetails?.requiredActions)
    ? assistanceDetails.requiredActions.filter(
      (action): action is string => typeof action === 'string' && action.length > 0,
    )
    : [];
  const healSuggestion = assistanceDetails?.healSuggestion as
    | {
      found?: boolean;
      rationale?: string;
      suggestedLabels?: string[];
      confidence?: string;
    }
    | undefined;
  const healLabels = Array.isArray(healSuggestion?.suggestedLabels)
    ? healSuggestion.suggestedLabels.filter(
      (label): label is string => typeof label === 'string' && label.length > 0,
    )
    : [];
  const recentEvents = (eventsQuery.data ?? []).slice(-12).reverse();
  const artifacts = artifactsQuery.data ?? [];

  return (
    <section className="lawsuit-section-panel">
      <div className="lawsuit-section-heading">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
              job?.status === 'filed'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-[#173A63] text-white'
            }`}
          >
            {job?.status === 'filed' ? <CheckCircle2 className="h-4.5 w-4.5" /> : 2}
          </span>
          <div>
            <h2 className="text-lg font-black text-[#142033]">الرفع الآلي إلى تقاضي</h2>
            <p className="text-sm text-slate-500">
              تُرسل الحزمة إلى طابور آمن، ويتولى الوكيل التعبئة والرفع والاعتماد
            </p>
          </div>
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

      {!workerOnline && (
        <Alert className="border-amber-200 bg-amber-50">
          <WifiOff className="h-4 w-4 text-amber-700" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3 text-amber-900">
            <span>
              وكيل الأتمتة متوقف على جهاز المكتب — ستبقى الدعوى في الطابور حتى يعمل.
              اضغط زر التشغيل من متصفح جهاز المكتب ليبدأ فورًا.
            </span>
            <TaqadiAgentStartButton />
          </AlertDescription>
        </Alert>
      )}

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
                {decodeDisplayText(job.error_message) || 'توقفت العملية لحاجتها إلى مراجعة بشرية.'}
              </AlertDescription>
            </Alert>
          )}

          {job.status === 'needs_human' && (
            <Alert className="border-sky-200 bg-sky-50">
              <ExternalLink className="h-4 w-4 text-sky-700" />
              <AlertDescription className="space-y-2 text-sky-950">
                <strong className="block">
                  {portalLabel
                    ? `الوكيل متوقف عند: ${portalLabel}`
                    : 'أكمل الحقول المطلوبة داخل نافذة تقاضي'}
                </strong>
                <p>
                  يمكنك إكمال الإجراء يدويًا، ثم الضغط على «متابعة من تقاضي».
                  سيقرأ الوكيل الصفحة المفتوحة ويكمل منها دون إنشاء دعوى جديدة.
                </p>
                {requiredActions.length > 0 && (
                  <ul className="list-inside list-disc space-y-1">
                    {requiredActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                )}
                {healSuggestion?.found && (
                  <div className="rounded-md border border-sky-200 bg-white/70 p-2 text-xs">
                    <strong className="block">
                      اقتراح المساعد الذكي (لم يجتز التحقق الآلي — للمراجعة البشرية)
                    </strong>
                    {healSuggestion.rationale && <p>{decodeDisplayText(healSuggestion.rationale)}</p>}
                    {healLabels.length > 0 && (
                      <p>
                        الحقول المقترحة في تقاضي: {healLabels.join('، ')}
                      </p>
                    )}
                    <p className="text-sky-700">
                      الاقتراحات المتحقق منها تُطبَّق تلقائيًا بشكل مؤقت وتوثَّق في
                      «سجل قرارات الوكيل». هذا الاقتراح يحتاج مراجعتك: راجع ملف
                      heal_proposal في «أدلة العملية» أدناه، وإن كان صحيحًا أضِفه
                      إلى selector-overrides.json على جهاز الوكيل.
                    </p>
                  </div>
                )}
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
            <Collapsible defaultOpen={isActive || job.status === 'needs_human'}>
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">
                <span>سجل قرارات الوكيل ({recentEvents.length})</span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <div className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
                  {recentEvents.map((event) => {
                    const decision = event.step
                      ? AGENT_DECISION_STEPS[event.step]
                      : undefined;
                    const reason = decision ? agentDecisionReason(event) : null;
                    return (
                      <div key={event.id} className="flex items-start gap-3 px-3 py-2.5">
                        {decision
                          ? <Bot className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                          : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                        <div className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
                            {decision && (
                              <Badge variant="outline" className={decision.tone}>
                                {decision.label}
                              </Badge>
                            )}
                            {decodeDisplayText(event.message || event.step || event.event_type)}
                          </span>
                          {reason && (
                            <span className="mt-0.5 block text-xs text-violet-700">
                              {reason}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {new Date(event.created_at).toLocaleString('ar-QA')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {artifacts.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">
                <span>أدلة العملية ({artifacts.length})</span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <div className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
                  {artifacts.map((artifact) => (
                    <div key={artifact.id} className="flex items-center gap-3 px-3 py-2.5">
                      <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-800">
                          {artifact.file_name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {ARTIFACT_TYPE_LABELS[artifact.artifact_type] ?? artifact.artifact_type}
                          {' — '}
                          {new Date(artifact.created_at).toLocaleString('ar-QA')}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            const url = await getTaqadiArtifactDownloadUrl(artifact.storage_path);
                            window.open(url, '_blank', 'noopener');
                          } catch {
                            toast.error('تعذر توليد رابط التحميل');
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  ملفات trace.zip تُفتح عبر: npx playwright show-trace
                </p>
              </CollapsibleContent>
            </Collapsible>
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

      {/* الزر الرئيسي الذكي — يتغير حسب حالة المهمة، والباقي في قائمة ثانوية */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!job && (
          <Button
            type="button"
            size="lg"
            onClick={async () => {
              await actions.startTaqadiAutomation();
              await Promise.all([legalCaseQuery.refetch(), jobQuery.refetch()]);
            }}
            disabled={!canStart || ui.isTaqadiAutomating}
            className="lawsuit-primary-command"
          >
            {ui.isTaqadiAutomating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Play className="h-4 w-4" />}
            إضافة إلى طابور الرفع
          </Button>
        )}

        {job && isActive && (
          <Button type="button" size="lg" disabled className="lawsuit-primary-command">
            <Loader2 className="h-4 w-4 animate-spin" />
            {TAQADI_STATUS_LABELS[job.status]}…
          </Button>
        )}

        {job && !isActive && resumableStatuses.has(job.status) && !requiresSubmissionVerification && (
          <Button
            type="button"
            size="lg"
            onClick={() => resumeMutation.mutate()}
            disabled={resumeMutation.isPending || !workerOnline}
            className="lawsuit-primary-command"
          >
            {resumeMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Play className="h-4 w-4" />}
            متابعة من تقاضي
          </Button>
        )}

        {job && requiresSubmissionVerification && (
          <Button type="button" size="lg" disabled className="lawsuit-primary-command">
            <ShieldCheck className="h-4 w-4" />
            يتطلب تحققًا يدويًا في تقاضي
          </Button>
        )}

        {job?.status === 'filed' && (
          <Button type="button" size="lg" disabled className="lawsuit-primary-command !bg-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            تم الرفع في تقاضي
          </Button>
        )}

        {job && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline">
                إجراءات إضافية
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-lg border-[#E5EAF1]">
              {retryableStatuses.has(job.status) && !requiresSubmissionVerification && (
                <DropdownMenuItem
                  disabled={
                    retryMutation.isPending
                    || (reachedAttemptLimit && !canExplicitlyRestart)
                  }
                  onSelect={() => retryMutation.mutate()}
                >
                  {retryMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <RefreshCw className="h-4 w-4" />}
                  {job.status === 'cancelled' ? 'إعادة تشغيل العملية' : 'إعادة من البداية'}
                </DropdownMenuItem>
              )}
              {job.status === 'filed' && (
                <DropdownMenuItem asChild>
                  <a href="https://taqadi.sjc.gov.qa/itc/login" target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    فتح تقاضي
                  </a>
                </DropdownMenuItem>
              )}
              {['queued', 'waiting_login', 'needs_human', 'failed'].includes(job.status) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={cancelMutation.isPending}
                    onSelect={() => cancelMutation.mutate()}
                    className="text-red-700 focus:text-red-700"
                  >
                    <CircleStop className="h-4 w-4" />
                    إلغاء العملية
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {ui.taqadiAutomationStatus && (
        <p className="mt-3 text-xs text-slate-500">{ui.taqadiAutomationStatus}</p>
      )}
    </section>
  );
}
