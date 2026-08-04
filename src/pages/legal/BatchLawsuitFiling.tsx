/**
 * Batch Lawsuit Filing — صفحة الرفع الجماعي للدعاوى
 *
 * تحديد متعدد للعقود المتعثرة، تجهيز تسلسلي (مستندات + حزمة تقاضي)،
 * وإدخال طابور الرفع مهمة-بمهمة، مع متابعة لحظية عبر Realtime.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  CircleStop,
  ExternalLink,
  FileText,
  Gavel,
  Loader2,
  Play,
  SkipForward,
  User,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';
import {
  listBatchCandidates,
  runBatchFiling,
  type BatchCandidate,
  type BatchFilingItemResult,
} from './LawsuitPreparation/utils/batchFiling';
import {
  getLatestTaqadiFilingJob,
  getActiveTaqadiWorker,
  TAQADI_STATUS_LABELS,
} from './LawsuitPreparation/utils/taqadiAutomation';
import { TaqadiAgentStartButton } from '@/components/legal/TaqadiAgentStartButton';

type RowPhase =
  | { kind: 'idle' }
  | { kind: 'processing'; stage: string }
  | { kind: 'done'; result: BatchFilingItemResult };

const STAGE_LABELS: Record<string, string> = {
  loading: 'تحميل البيانات',
  generating: 'توليد المستندات',
  registering: 'تسجيل القضية',
  enqueuing: 'إدخال الطابور',
};

function formatQar(amount: number) {
  return new Intl.NumberFormat('ar-QA', {
    style: 'currency',
    currency: 'QAR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** بطاقة متابعة لحظية لمهمة رفع واحدة */
function JobStatusBadge({ companyId, legalCaseId }: { companyId: string; legalCaseId: string }) {
  const jobQuery = useQuery({
    queryKey: ['taqadi-filing-job', companyId, legalCaseId],
    queryFn: () => getLatestTaqadiFilingJob(companyId, legalCaseId),
    refetchInterval: 15_000,
  });
  const job = jobQuery.data;
  if (!job) return null;
  return (
    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
      {TAQADI_STATUS_LABELS[job.status]} {job.progress > 0 && job.status !== 'filed' ? `(${job.progress}%)` : ''}
    </Badge>
  );
}

export default function BatchLawsuitFiling() {
  const { companyId } = useUnifiedCompanyAccess();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phases, setPhases] = useState<Record<string, RowPhase>>({});
  const [running, setRunning] = useState(false);
  const stopRequested = useRef(false);

  const candidatesQuery = useQuery({
    queryKey: ['batch-filing-candidates', companyId],
    enabled: Boolean(companyId),
    queryFn: () => listBatchCandidates(companyId!),
  });
  const candidates = useMemo(() => candidatesQuery.data ?? [], [candidatesQuery.data]);

  const workerQuery = useQuery({
    queryKey: ['taqadi-automation-worker'],
    queryFn: getActiveTaqadiWorker,
    refetchInterval: 30_000,
  });
  const worker = workerQuery.data;
  const workerOnline = Boolean(
    worker && Date.now() - new Date(worker.heartbeat_at).getTime() < 120_000
    && worker.status !== 'offline',
  );

  // متابعة لحظية لكل مهام الشركة أثناء تشغيل الدفعة
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('batch-filing-jobs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'taqadi_filing_jobs', filter: `company_id=eq.${companyId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['taqadi-filing-job', companyId] });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [companyId, queryClient]);

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(candidates.map((c) => c.contractId)) : new Set());
  };

  const toggleOne = (contractId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(contractId);
      else next.delete(contractId);
      return next;
    });
  };

  const results = useMemo(
    () => Object.values(phases)
      .filter((phase): phase is { kind: 'done'; result: BatchFilingItemResult } => phase.kind === 'done')
      .map((phase) => phase.result),
    [phases],
  );
  const doneCount = results.length;
  const totalSelected = selected.size;
  const progressPct = totalSelected > 0 ? Math.round((doneCount / totalSelected) * 100) : 0;

  const startBatch = async () => {
    if (!companyId || !user?.id || selected.size === 0) return;
    setRunning(true);
    stopRequested.current = false;

    const initialPhases: Record<string, RowPhase> = {};
    for (const contractId of selected) initialPhases[contractId] = { kind: 'idle' };
    setPhases(initialPhases);

    await runBatchFiling({
      companyId,
      contractIds: [...selected],
      userId: user.id,
      sourceUrl: window.location.href,
      shouldStop: () => stopRequested.current,
      onItemStart: (contractId) => {
        setPhases((prev) => ({ ...prev, [contractId]: { kind: 'processing', stage: 'loading' } }));
      },
      onProgress: ({ contractId, stage }) => {
        setPhases((prev) => ({ ...prev, [contractId]: { kind: 'processing', stage } }));
      },
      onItemDone: (result) => {
        setPhases((prev) => ({ ...prev, [result.contractId]: { kind: 'done', result } }));
      },
    });

    setRunning(false);
    void queryClient.invalidateQueries({ queryKey: ['taqadi-filing-job', companyId] });
    toast.success('انتهت الدفعة — راجع النتائج والمتابعة اللحظية أدناه');
  };

  const renderPhase = (candidate: BatchCandidate) => {
    const phase = phases[candidate.contractId];
    if (!phase || phase.kind === 'idle') return <span className="text-slate-400">—</span>;
    if (phase.kind === 'processing') {
      return (
        <span className="inline-flex items-center gap-2 text-sky-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          {STAGE_LABELS[phase.stage] ?? phase.stage}
        </span>
      );
    }
    const { result } = phase;
    if (result.status === 'enqueued') {
      return (
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> في الطابور
          </span>
          {companyId && result.legalCaseId && (
            <JobStatusBadge companyId={companyId} legalCaseId={result.legalCaseId} />
          )}
        </span>
      );
    }
    if (result.status === 'skipped') {
      return (
        <span className="inline-flex items-center gap-1 text-amber-700" title={result.reason ?? ''}>
          <SkipForward className="h-4 w-4" /> {result.reason}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-red-700" title={result.reason ?? ''}>
        <AlertCircle className="h-4 w-4" /> {result.reason}
      </span>
    );
  };

  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-[#142033]">
            <Gavel className="h-6 w-6 text-[#173A63]" />
            الرفع الجماعي للدعاوى
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            تجهيز وإدخال طابور تقاضي لعدة عقود — تُرفع واحدة تلو الأخرى تلقائيًا عبر وكيل الأتمتة.
          </p>
        </div>
        <Badge
          variant="outline"
          className={workerOnline
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'}
        >
          {workerOnline ? 'الوكيل متصل' : 'الوكيل غير متصل — ستنتظر المهام في الطابور'}
        </Badge>
      </header>

      {!workerOnline && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3 text-amber-900">
            <span>
              وكيل الأتمتة غير متصل حاليًا. يمكنك إدخال المهام في الطابور الآن وسيبدأ تنفيذها فور تشغيل الوكيل.
            </span>
            <TaqadiAgentStartButton />
          </AlertDescription>
        </Alert>
      )}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={candidates.length > 0 && selected.size === candidates.length}
              onCheckedChange={(checked) => toggleAll(checked === true)}
              disabled={running}
              aria-label="تحديد الكل"
            />
            <span className="text-sm font-bold text-slate-600">
              {selected.size > 0 ? `محدد ${selected.size} من ${candidates.length}` : `${candidates.length} عقدًا متعثرًا`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {running && (
              <Button
                type="button"
                variant="outline"
                onClick={() => { stopRequested.current = true; }}
                className="gap-2"
              >
                <CircleStop className="h-4 w-4" />
                إيقاف بعد الحالية
              </Button>
            )}
            <Button
              type="button"
              onClick={startBatch}
              disabled={running || selected.size === 0 || !user?.id}
              className="gap-2 bg-[#173A63] text-white hover:bg-[#102C4D]"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? `جاري التنفيذ (${doneCount}/${totalSelected})` : `تجهيز ورفع المحدد (${selected.size})`}
            </Button>
          </div>
        </div>

        {running && (
          <div className="border-b border-slate-100 px-4 py-3">
            <Progress value={progressPct} className="h-2" />
          </div>
        )}

        {candidatesQuery.isLoading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-slate-500">
            <LoadingSpinner className="h-6 w-6" /> جاري تحميل العقود المتعثرة...
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-slate-500">
            <FileText className="h-8 w-8" />
            <p className="font-bold">لا توجد عقود متعثرة بفواتير متأخرة غير مسددة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-black text-slate-500">
                  <th className="p-3 w-10" />
                  <th className="p-3">العقد</th>
                  <th className="p-3">العميل</th>
                  <th className="p-3">المديونية</th>
                  <th className="p-3">فواتير</th>
                  <th className="p-3">مؤشرات الجاهزية</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.contractId} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="p-3">
                      <Checkbox
                        checked={selected.has(candidate.contractId)}
                        onCheckedChange={(checked) => toggleOne(candidate.contractId, checked === true)}
                        disabled={running}
                        aria-label={`تحديد العقد ${candidate.contractNumber}`}
                      />
                    </td>
                    <td className="p-3 font-bold" dir="ltr">{candidate.contractNumber}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {candidate.customerName}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-[#173A63]">{formatQar(candidate.totalRemaining)}</td>
                    <td className="p-3">{candidate.overdueInvoicesCount}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {candidate.hasNationalId
                          ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">هوية ✓</Badge>
                          : <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">بلا هوية</Badge>}
                        {candidate.hasSignedContract
                          ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">عقد موقع ✓</Badge>
                          : <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">بلا عقد موقع</Badge>}
                      </div>
                    </td>
                    <td className="p-3">{renderPhase(candidate)}</td>
                    <td className="p-3">
                      <Link
                        to={`/legal/lawsuit/prepare/${candidate.contractId}`}
                        className="text-slate-400 hover:text-[#173A63]"
                        title="فتح صفحة تجهيز الدعوى"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {results.length > 0 && (
        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <strong className="text-2xl font-black text-emerald-800">
              {results.filter((r) => r.status === 'enqueued').length}
            </strong>
            <p className="text-sm font-bold text-emerald-700">أُدخلت الطابور</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <strong className="text-2xl font-black text-amber-800">
              {results.filter((r) => r.status === 'skipped').length}
            </strong>
            <p className="text-sm font-bold text-amber-700">تُخطيت</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <strong className="text-2xl font-black text-red-800">
              {results.filter((r) => r.status === 'failed').length}
            </strong>
            <p className="text-sm font-bold text-red-700">فشلت</p>
          </div>
        </section>
      )}
    </main>
  );
}
