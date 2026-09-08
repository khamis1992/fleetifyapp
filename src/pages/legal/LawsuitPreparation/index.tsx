import { LegalPageHeader } from '@/components/legal/workspace/LegalPageHeader';
import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileText,
  Gavel,
  Loader2,
  Lock,
  MoreVertical,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCustomerName } from '@/utils/formatCustomerName';
import {
  LawsuitPreparationProvider,
  useLawsuitPreparationContext,
  type LawsuitPreparationState,
} from './store';
import { LegalHeader } from './components/LegalHeader';
import { LegalOverview } from './components/LegalOverview';
import { LegalEvidence } from './components/LegalEvidence';
import { LegalDocuments } from './components/LegalDocuments';
import { LegalTaqadi } from './components/LegalTaqadi';
import { LegalActions } from './components/LegalActions';
import { getFilingReadiness } from './utils/filingReadiness';
import { getFilingIssues, type FilingIssue, type PreparationTab } from './utils/filingIssues';
import { FilingIssuesPanel } from './components/FilingIssuesPanel';
import { NationalityCompletionDialog } from './components/NationalityCompletionDialog';
import '@/styles/legal-system.css';
import './LegalTheme.css';
import './ReadinessIssues.css';

type TabId = PreparationTab;

type LawsuitTab = {
  id: TabId;
  label: string;
  description: string;
  icon: ElementType;
};

const TABS: LawsuitTab[] = [
  {
    id: 'overview',
    label: 'لوحة القضية',
    description: 'العميل والعقد والمبالغ',
    icon: Activity,
  },
  {
    id: 'evidence',
    label: 'الوقائع والأدلة',
    description: 'المسار القانوني والمستندات',
    icon: ShieldCheck,
  },
  {
    id: 'documents',
    label: 'حافظة المستندات',
    description: 'توليد ورفع وتحميل الملفات',
    icon: FileText,
  },
  {
    id: 'taqadi',
    label: 'بيانات التقاضي',
    description: 'حقول النسخ والنقل للمحكمة',
    icon: Gavel,
  },
  {
    id: 'actions',
    label: 'الإغلاق والمتابعة',
    description: 'التسجيل وتأكيد فتح القضية',
    icon: ClipboardCheck,
  },
];

const TAB_INDEX: Record<TabId, number> = {
  overview: 0,
  evidence: 1,
  documents: 2,
  taqadi: 3,
  actions: 4,
};

interface StepStatus {
  /** ما الذي يجعل هذه الخطوة "مكتملة" */
  done: boolean;
  /** عدد المشاكل/النواقص في هذه الخطوة */
  issues: number;
  /** تلميح نصي قصير يعرض على الزر */
  hint: string;
}

function getStepStatuses(state: LawsuitPreparationState): Record<TabId, StepStatus> {
  const readiness = getFilingReadiness(state);
  const total = readiness.documents.total || 1;
  const missing = readiness.documents.missing;
  const evidenceIssues = readiness.legalStatus.issues.length;
  const overviewDone = Boolean(
    state.contract && state.customer && state.vehicle,
  );

  return {
    overview: {
      done: overviewDone,
      issues: overviewDone ? 0 : 1,
      hint: overviewDone ? 'اكتملت البيانات الأساسية' : 'بيانات العقد غير مكتملة',
    },
    evidence: {
      done: evidenceIssues === 0,
      issues: evidenceIssues,
      hint:
        evidenceIssues === 0
          ? 'الوقائع القانونية مكتملة'
          : `${evidenceIssues} ${evidenceIssues === 1 ? 'مسألة قانونية تحتاج معالجة' : 'مسائل قانونية تحتاج معالجة'}`,
    },
    documents: {
      done: readiness.documents.isComplete,
      issues: missing,
      hint:
        missing === 0
          ? `${readiness.documents.ready}/${total} مستنداً جاهزاً`
          : `${missing} من ${total} مستندات تحتاج استكمالًا أو مراجعة`,
    },
    taqadi: {
      done: readiness.taqadiComplete,
      issues: readiness.taqadiIssues.length,
      hint: readiness.taqadiComplete ? 'بيانات المحكمة مكتملة' : readiness.taqadiIssues[0]?.field === 'nationality' ? 'جنسية العميل تحتاج استكمالًا' : 'بيانات المحكمة ناقصة',
    },
    actions: {
      done: readiness.canStartFiling,
      issues: readiness.missingReasons.length,
      hint: readiness.canStartFiling ? 'جاهز للتقديم' : state.legalCase?.id ? 'متابعة العملية واستكمال النواقص' : 'يتطلب إكمال الخطوات السابقة',
    },
  };
}

/**
 * الخطوات الأربع الأولى مفتوحة دائماً — لأن متطلباتها مترابطة
 * (مثلاً: ربط نسخة العقد في الحافظة يحل مشكلة في الوقائع)،
 * وقفلها التسلسلي يسبب جموداً. القفل الحقيقي الوحيد: خطوة الإغلاق
 * حتى تكتمل كل شروط canStartFiling، أو توجد قضية لمتابعة عمليتها السابقة.
 * أزرار الرفع نفسها تتحقق من الجاهزية قبل إرسال أي محاولة جديدة.
 */
function getUnlockedTabs(statuses: Record<TabId, StepStatus>, hasLegalCase: boolean): Set<TabId> {
  const order: TabId[] = ['overview', 'evidence', 'documents', 'taqadi'];
  const unlocked = new Set<TabId>(order);
  if (statuses.actions.done || hasLegalCase) {
    unlocked.add('actions');
  }
  return unlocked;
}

function formatQar(amount?: number | null) {
  return new Intl.NumberFormat('ar-QA', {
    style: 'currency',
    currency: 'QAR',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function formatLegalDate(date?: string | null) {
  if (!date) return 'غير محدد';
  return new Date(date).toLocaleDateString('ar-QA');
}

function getDocumentMetrics(state: LawsuitPreparationState) {
  const readiness = getFilingReadiness(state);
  return {
    ...readiness.documents,
    percentage: readiness.percentage,
    isComplete: readiness.canStartFiling,
    missingReasons: readiness.missingReasons,
    requiredDocumentIds: readiness.requiredDocumentIds,
    legalStatus: readiness.legalStatus,
    profileApproved: readiness.profileApproved,
    snapshotApprovedAndCurrent: readiness.snapshotApprovedAndCurrent,
    taqadiComplete: readiness.taqadiComplete,
  };
}

function buildLawsuitAIInsight(state: LawsuitPreparationState, readiness: ReturnType<typeof getDocumentMetrics>) {
  const { calculations, contract, customer, documents, overdueInvoices, taqadiData, vehicle } = state;
  const customerName = customer ? formatCustomerName(customer) : 'عميل غير محدد';
  const vehicleName = vehicle
    ? [vehicle.make, vehicle.model, vehicle.year, vehicle.plate_number ? `لوحة ${vehicle.plate_number}` : ''].filter(Boolean).join(' ')
    : contract?.license_plate
      ? `لوحة ${contract.license_plate}`
      : 'مركبة غير محددة';
  const mandatoryDocs = readiness.requiredDocumentIds.map((id) => documents[id]);
  const missingDocs = mandatoryDocs.filter((doc) => doc.status !== 'ready');
  const issues = [...readiness.missingReasons];
  const strengths = [...readiness.legalStatus.strengths];

  if (customer?.national_id) strengths.push('بيانات الهوية متوفرة.');
  if (documents.memo.status === 'ready' && documents.claims.status === 'ready') strengths.push('المذكرة وكشف المطالبات جاهزان.');
  if (taqadiData?.facts && taqadiData?.claims) strengths.push('نص الوقائع والطلبات متوفر للتقاضي.');
  if (overdueInvoices.length > 0) strengths.push(`يوجد ${overdueInvoices.length} استحقاق مالي حالّ في الكشف الموحد.`);

  const score = readiness.percentage;
  const level =
    readiness.isComplete
      ? 'جاهز للرفع'
      : score >= 60
        ? 'يحتاج مراجعة'
        : 'غير جاهز للرفع';
  const tone = score >= 85 ? 'ready' : score >= 60 ? 'review' : 'risk';
  const totalClaim = formatQar(calculations?.total);
  const summary = [
    `ملف الدعوى لعقد ${contract?.contract_number || '-'} يخص ${customerName}.`,
    `قيمة المطالبة الحالية ${totalClaim} وفق البنود المثبتة الداخلة في البيان الحسابي.`,
    `عدد الاستحقاقات الحالّة ${overdueInvoices.length}، والمخالفات المدعومة الداخلة في المطالبة ${calculations?.violationsCount || 0}.`,
    `نسبة جاهزية الرفع الفعلية ${readiness.percentage}%، والحالة: ${level}.`,
  ].join('\n');

  const suggestedFacts = taqadiData?.facts || [
    `بموجب عقد الإيجار رقم ${contract?.contract_number || '-'} المؤرخ ${formatLegalDate(contract?.start_date)}، استأجر المدعى عليه ${customerName} المركبة ${vehicleName}.`,
    `وقد ترتب في ذمته مبلغ مستحق قدره ${totalClaim} نتيجة عدم سداد الالتزامات المالية المستحقة بموجب العقد.`,
    Number(calculations?.violationsCount || 0) > 0
      ? `كما ترتبت مخالفات مرورية مثبتة على المركبة محل العقد بعدد ${calculations?.violationsCount} مخالفة.`
      : '',
    'ورغم المطالبة بالسداد، لم يتم إغلاق المديونية حتى تاريخ تجهيز هذه الدعوى.',
  ].filter(Boolean).join('\n');

  const suggestedClaims = taqadiData?.claims || [
    `إلزام المدعى عليه بسداد مبلغ ${totalClaim}.`,
    'إلزامه بالرسوم والمصاريف وأي مبالغ مترتبة على العقد حتى تاريخ السداد.',
    Number(calculations?.violationsCount || 0) > 0 ? 'إلزامه بقيمة المخالفات المرورية المثبتة المرتبطة بالمركبة محل العقد.' : '',
    'حفظ حق الشركة في المطالبة بأي تعويضات أخرى تظهر لاحقًا.',
  ].filter(Boolean).join('\n');

  const nextSteps = [
    ...issues.slice(0, 3),
    ...(issues.length === 0 ? ['الملف جاهز؛ ابدأ إجراءات رفع الدعوى وسيتولى وكيل تقاضي المراجعة والاعتماد والإرسال.'] : []),
  ];

  return {
    customerName,
    level,
    missingDocs,
    nextSteps,
    score,
    strengths,
    suggestedClaims,
    suggestedFacts,
    summary,
    tone,
  };
}

function LegalStageNav({
  activeTab,
  onTabChange,
  statuses,
  unlocked,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  statuses: Record<TabId, StepStatus>;
  unlocked: Set<TabId>;
}) {
  return (
    <nav className="lawsuit-stage-nav lawsuit-stage-nav-stepper" aria-label="مراحل تجهيز الدعوى">
      {TABS.map((tab, index) => {
        const Icon = tab.icon;
        const status = statuses[tab.id];
        const isActive = activeTab === tab.id;
        const isDone = status.done;
        const isLocked = !unlocked.has(tab.id);
        const hasIssues = status.issues > 0 && !isDone;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => !isLocked && onTabChange(tab.id)}
            disabled={isLocked}
            aria-current={isActive ? 'step' : undefined}
            aria-disabled={isLocked}
            className={`lawsuit-stage-button lawsuit-step ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''} ${isLocked ? 'is-locked' : ''} ${hasIssues ? 'has-issues' : ''}`}
            title={isLocked ? 'تُفتح بعد إكمال الخطوات السابقة' : status.hint}
          >
            <span className="lawsuit-stage-number">{index + 1}</span>
            <span className="lawsuit-stage-icon">
              {isLocked ? (
                <Lock className="h-4 w-4" />
              ) : isDone ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : hasIssues ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0 text-right">
              <span className="block truncate text-sm font-black">{tab.label}</span>
              <span className="block truncate text-xs font-semibold opacity-70">
                {isLocked ? 'مقفلة' : status.hint}
              </span>
            </span>
            {hasIssues && !isLocked && (
              <span className="lawsuit-step-issues-badge" aria-label={`${status.issues} من المشاكل`}>
                {status.issues}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function LawsuitAIAssistantCard({ readiness }: { readiness: ReturnType<typeof getDocumentMetrics> }) {
  const { state, actions, dispatch } = useLawsuitPreparationContext();
  const insight = useMemo(() => buildLawsuitAIInsight(state, readiness), [state, readiness]);
  const copied = state.ui.copiedField;
  const [inserted, setInserted] = useState<string | null>(null);

  const canInsert = Boolean(state.taqadiData);
  const insertIntoTaqadi = (field: 'facts' | 'claims') => {
    if (!state.taqadiData) return;
    const value = field === 'facts' ? insight.suggestedFacts : insight.suggestedClaims;
    dispatch({
      type: 'UPDATE_TAQADI_DATA',
      payload: { ...state.taqadiData, [field]: value },
    });
    setInserted(field);
    setTimeout(() => setInserted(null), 1600);
  };

  return (
    <section className={`lawsuit-command-card lawsuit-ai-card is-${insight.tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="lawsuit-ai-icon">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black text-[#66758A]">مسودة الدعوى الجاهزة</p>
            <h3>{insight.level}</h3>
            <span>اقتراح تلقائي للوقائع والطلبات — قابل للإدراج المباشر في بيانات التقاضي</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#DCE6F0] bg-white p-3">
        <p className="text-xs font-black text-[#66758A]">ملخص الحالة</p>
        <p className="mt-2 whitespace-pre-line text-sm font-bold leading-7 text-[#142033]">{insight.summary}</p>
      </div>

      {insight.missingDocs.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-black text-[#66758A]">مستندات تحتاج إجراء</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {insight.missingDocs.slice(0, 4).map((doc) => (
              <Badge key={doc.id} variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                {doc.name}
              </Badge>
            ))}
            {insight.missingDocs.length > 4 && (
              <Badge variant="outline">+{insight.missingDocs.length - 4}</Badge>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            onClick={() => insertIntoTaqadi('facts')}
            disabled={!canInsert}
            className="justify-center gap-2 bg-[#173A63] text-white hover:bg-[#102C4D]"
            title={canInsert ? 'إدراج نص الوقائع المقترح في بيانات التقاضي' : 'بيانات التقاضي غير جاهزة بعد'}
          >
            {inserted === 'facts' ? <CheckCircle2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            إدراج الوقائع
          </Button>
          <Button
            type="button"
            onClick={() => insertIntoTaqadi('claims')}
            disabled={!canInsert}
            className="justify-center gap-2 bg-[#173A63] text-white hover:bg-[#102C4D]"
            title={canInsert ? 'إدراج نص الطلبات المقترح في بيانات التقاضي' : 'بيانات التقاضي غير جاهزة بعد'}
          >
            {inserted === 'claims' ? <CheckCircle2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            إدراج الطلبات
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => actions.copyToClipboard(insight.summary, 'ai-lawsuit-summary')}
          className="justify-center gap-2"
        >
          {copied === 'ai-lawsuit-summary' ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
          نسخ ملخص الدعوى
        </Button>
      </div>
    </section>
  );
}

/** عنصر واحد في قائمة التحقق — قابل للنقر ويقفز للخطوة المسؤولة */
function ChecklistRow({
  done,
  pending,
  label,
  note,
  onClick,
}: {
  done: boolean;
  pending?: boolean;
  label: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`lawsuit-checklist-row ${done ? 'is-done' : ''} ${pending ? 'is-pending' : ''}`}
    >
      <span className="lawsuit-checklist-icon">
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : pending ? (
          <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
        ) : (
          <AlertCircle className="h-5 w-5 text-[#66758A]" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-right">
        <span className="block text-sm font-black text-[#142033]">{label}</span>
        <span className="block truncate text-xs text-[#66758A]">{note}</span>
      </span>
      <ChevronLeft className="h-4 w-4 shrink-0 text-[#66758A]" />
    </button>
  );
}

function LawsuitCommandPanel({
  activeTab,
  onTabChange,
  onResolveIssue,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onResolveIssue: (issue: FilingIssue) => void;
}) {
  const { state, actions } = useLawsuitPreparationContext();
  const { calculations, overdueInvoices, taqadiData, ui } = state;
  const readiness = useMemo(() => getDocumentMetrics(state), [state]);
  const statuses = useMemo(() => getStepStatuses(state), [state]);
  const firstBlocker = useMemo(() => getFilingIssues(state).find((issue) => issue.severity === 'blocking'), [state]);
  const [executing, setExecuting] = useState(false);

  /** الإجراء التنفيذي الأساسي — واحد فقط */
  const effectiveAction = useMemo(() => {
    if (firstBlocker) {
      return {
        title: firstBlocker.title,
        note: firstBlocker.description,
        button: firstBlocker.actionLabel,
        run: () => onResolveIssue(firstBlocker),
      };
    }
    if (!taqadiData) {
      return {
        title: 'مراجعة بيانات التقاضي',
        note: 'راجع بيانات النسخ قبل الانتقال إلى نظام التقاضي.',
        button: 'فتح بيانات التقاضي',
        tab: 'taqadi' as TabId,
        run: () => onTabChange('taqadi'),
      };
    }
    return {
      title: 'جاهز لبدء إجراءات رفع الدعوى',
      note: 'ستُضاف الدعوى فوراً إلى طابور وكيل تقاضي للمراجعة والاعتماد والإرسال.',
      button: 'بدء إجراءات رفع الدعوى',
      tab: 'actions' as TabId,
      run: async () => {
        await actions.startTaqadiAutomation();
        onTabChange('actions');
      },
    };
  }, [firstBlocker, taqadiData, actions, onTabChange, onResolveIssue]);

  const userTasks: { key: TabId; label: string; note: string; done: boolean; pending?: boolean }[] = [
    {
      key: 'overview',
      label: 'بيانات العقد والعميل والمركبة',
      note: statuses.overview.hint,
      done: statuses.overview.done,
    },
    {
      key: 'evidence',
      label: 'الوقائع والأدلة القانونية',
      note: statuses.evidence.hint,
      done: statuses.evidence.done,
    },
    {
      key: 'documents',
      label: 'حافظة المستندات',
      note: statuses.documents.hint,
      done: statuses.documents.done,
      pending: readiness.generating > 0,
    },
    {
      key: 'taqadi',
      label: 'بيانات التقاضي',
      note: statuses.taqadi.hint,
      done: statuses.taqadi.done,
    },
  ];

  return (
    <aside className="lawsuit-command-panel">
      {/* جاهزية الملف — المصدر الوحيد للنسبة داخل العمود */}
      <section className="lawsuit-command-card is-primary">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[#66758A]">جاهزية الملف</p>
            <h2 className="mt-1 text-2xl font-black text-[#142033]">
              {readiness.isComplete ? 'جاهز للتقديم' : 'قيد التجهيز'}
            </h2>
          </div>
          <span className={`lawsuit-readiness-ring ${readiness.isComplete ? 'is-complete' : ''}`}>
            {readiness.percentage}%
          </span>
        </div>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#E6EDF5]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${readiness.percentage}%` }}
            className="h-full rounded-full bg-[#173A63]"
          />
        </div>
      </section>

      {/* قائمة التحقق التفاعلية — ملاحة عمليات */}
      <section className="lawsuit-command-card">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-black text-[#66758A]">ما عليك إكماله</p>
          <span className="text-xs font-bold text-[#173A63]">
            {userTasks.filter((t) => t.done).length}/{userTasks.length}
          </span>
        </div>
        <div className="grid gap-1.5">
          {userTasks.map((task) => (
            <ChecklistRow
              key={task.key}
              done={task.done}
              pending={task.pending}
              label={task.label}
              note={task.note}
              onClick={() => onTabChange(task.key)}
            />
          ))}
        </div>
      </section>

      {/* الإجراء التنفيذي — زر واحد أوضح */}
      <section className="lawsuit-command-card is-next">
        <div className="flex items-start gap-3">
          <span className="lawsuit-next-icon">
            <ChevronRight className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black text-[#66758A]">الإجراء التالي</p>
            <h3>{effectiveAction.title}</h3>
            <span>{effectiveAction.note}</span>
          </div>
        </div>
        <Button
          type="button"
          size="lg"
          disabled={executing}
          onClick={async () => {
            setExecuting(true);
            try {
              await effectiveAction.run();
            } finally {
              setExecuting(false);
            }
          }}
          className="mt-4 w-full bg-[#173A63] text-white hover:bg-[#102C4D]"
        >
          {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {effectiveAction.button}
        </Button>

        {/* إجراءات ثانوية — منقولة إلى قائمة "المزيد" */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="mt-2 w-full justify-center gap-2">
              <MoreVertical className="h-4 w-4" />
              المزيد من الإجراءات
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem
              onClick={actions.generateAllDocuments}
              disabled={ui.isGeneratingAll}
              className="gap-2"
            >
              {ui.isGeneratingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              توليد جميع المستندات
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={actions.downloadAllAsZip}
              disabled={ui.isDownloadingZip || readiness.ready === 0}
              className="gap-2"
            >
              {ui.isDownloadingZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              تحميل الحزمة كاملة (ZIP)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onTabChange('overview')} className="gap-2">
              <Activity className="h-4 w-4" />
              فتح لوحة القضية
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <LawsuitAIAssistantCard readiness={readiness} />

      {/* مؤشرات مالية مختصرة */}
      <section className="lawsuit-command-card">
        <div className="grid grid-cols-2 gap-2">
          <div className="lawsuit-metric-box">
            <span>المطالبة</span>
            <strong>{formatQar(calculations?.total)}</strong>
          </div>
          <div className="lawsuit-metric-box">
            <span>الاستحقاقات الحالّة</span>
            <strong>{overdueInvoices.length}</strong>
          </div>
        </div>
      </section>

      {/* التبويب الحالي — مساعد بصري خفيف */}
      <section className="lawsuit-command-card">
        <p className="text-xs text-[#66758A]">
          أنت الآن في: <strong className="text-[#142033]">{TABS.find((t) => t.id === activeTab)?.label}</strong>
          {' '}({TAB_INDEX[activeTab] + 1} من {TABS.length})
        </p>
      </section>
    </aside>
  );
}

function LawsuitTabContent({ activeTab }: { activeTab: TabId }) {
  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.22 }}
        className="lawsuit-tab-content"
      >
        {activeTab === 'overview' && <LegalOverview />}
        {activeTab === 'evidence' && <LegalEvidence />}
        {activeTab === 'documents' && <LegalDocuments />}
        {activeTab === 'taqadi' && <LegalTaqadi />}
        {activeTab === 'actions' && <LegalActions />}
      </motion.div>
    </AnimatePresence>
  );
}

function LawsuitPrevNextNav({
  activeTab,
  statuses,
  unlocked,
  onTabChange,
}: {
  activeTab: TabId;
  statuses: Record<TabId, StepStatus>;
  unlocked: Set<TabId>;
  onTabChange: (tab: TabId) => void;
}) {
  const idx = TAB_INDEX[activeTab];
  const prevTab = idx > 0 ? TABS[idx - 1].id : null;
  const nextTab = idx < TABS.length - 1 ? TABS[idx + 1].id : null;
  const nextUnlocked = nextTab ? unlocked.has(nextTab) : false;
  const nextStatus = nextTab ? statuses[nextTab] : null;

  if (!prevTab && !nextTab) return null;

  return (
    <div className="lawsuit-stepper-footer">
      {prevTab ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => onTabChange(prevTab)}
          className="gap-2"
        >
          <ChevronRight className="h-4 w-4" />
          السابق: {TABS[idx - 1].label}
        </Button>
      ) : (
        <span />
      )}
      {nextTab && (
        <Button
          type="button"
          onClick={() => nextUnlocked && onTabChange(nextTab)}
          disabled={!nextUnlocked}
          title={nextUnlocked ? undefined : `تُفتح بعد إكمال الخطوة الحالية — ${nextStatus?.hint || ''}`}
          className="gap-2 bg-[#173A63] text-white hover:bg-[#102C4D]"
        >
          التالي: {TABS[idx + 1].label}
          {!nextUnlocked ? <Lock className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}

function LawsuitPreparationContent() {
  const { state } = useLawsuitPreparationContext();
  const navigate = useNavigate();
  const { contract, ui } = state;
  const [selectedTab, setSelectedTab] = useState<TabId>('overview');
  const [nationalityOpen, setNationalityOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ tab: TabId; anchor: string; sequence: number } | null>(null);
  const issues = useMemo(() => getFilingIssues(state), [state]);
  const readiness = useMemo(() => getDocumentMetrics(state), [state]);
  const statuses = useMemo(() => getStepStatuses(state), [state]);
  const unlocked = useMemo(() => getUnlockedTabs(statuses, Boolean(state.legalCase?.id)), [statuses, state.legalCase?.id]);

  // الخطوة الفعلية مشتقة: إذا اختار المستخدم خطوة مقفلة نعرض أول خطوة مفتوحة
  // بدل setState أثناء الـ render.
  const activeTab: TabId = unlocked.has(selectedTab) ? selectedTab : 'overview';

  const resolveIssue = useCallback((issue: FilingIssue) => {
    const target = issue.resolution;
    if (target.kind === 'nationality' && state.customer) {
      setNationalityOpen(true);
    } else if (target.kind === 'customer') {
      navigate(state.customer ? `/customers/${state.customer.id}` : '/customers');
    } else if (target.kind === 'contract' || target.kind === 'nationality') {
      navigate(`/contracts/${state.contract?.contract_number || state.contract?.id}`);
    } else if (target.kind === 'vehicle') {
      navigate(state.contract?.vehicle_id ? `/fleet/vehicles/${state.contract.vehicle_id}` : `/contracts/${state.contract?.contract_number}`);
    } else {
      setSelectedTab(target.tab);
      setFocusRequest((previous) => ({ tab: target.tab, anchor: target.anchor, sequence: (previous?.sequence || 0) + 1 }));
    }
  }, [navigate, state.customer, state.contract]);

  useEffect(() => {
    if (!focusRequest || activeTab !== focusRequest.tab || ui.isLoading) return;
    const frame = requestAnimationFrame(() => {
      const section = document.getElementById(focusRequest.anchor);
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      section?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab, focusRequest, ui.isLoading]);

  if (ui.isLoading) {
    return (
      <div className="lawsuit-redesign-loading">
        <LoadingSpinner className="h-12 w-12 text-[#173A63]" />
        <span>جاري تحميل بيانات القضية...</span>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="lawsuit-redesign-error">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-lg">لم يتم العثور على العقد</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main className="legal-system lawsuit-redesign-page" dir="rtl">
      <LegalPageHeader title="تجهيز الدعوى القانونية" icon={Scale} eyebrow="ملف الدعوى / مسار التجهيز" description="راجع القضية، أكمل الأدلة والمستندات، ثم انتقل إلى التقديم والمتابعة." aside={<div className="lw-readiness"><span>{readiness.percentage}%</span><strong>{readiness.isComplete ? 'جاهز للتقديم' : 'قيد التجهيز'}</strong></div>} />

      <LegalHeader />

      <FilingIssuesPanel issues={issues} onResolve={resolveIssue} />
      {nationalityOpen && state.customer && (
        <NationalityCompletionDialog
          key={state.customer.id}
          customerId={state.customer.id}
          customerName={formatCustomerName(state.customer)}
          nationality={state.customer.nationality}
          onClose={() => setNationalityOpen(false)}
        />
      )}

      <LegalStageNav
        activeTab={activeTab}
        onTabChange={setSelectedTab}
        statuses={statuses}
        unlocked={unlocked}
      />

      <div className="lawsuit-redesign-grid">
        <LawsuitCommandPanel activeTab={activeTab} onTabChange={setSelectedTab} onResolveIssue={resolveIssue} />
        <section className="lawsuit-workbench">
          <LawsuitTabContent activeTab={activeTab} />
          <LawsuitPrevNextNav
            activeTab={activeTab}
            statuses={statuses}
            unlocked={unlocked}
            onTabChange={setSelectedTab}
          />
        </section>
      </div>
    </main>
  );
}

export default function LawsuitPreparationPage() {
  const { contractId } = useParams<{ contractId: string }>();

  if (!contractId) {
    return (
      <div className="lawsuit-redesign-error">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-lg">معرف العقد مطلوب</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <LawsuitPreparationProvider key={contractId} contractId={contractId}>
      <div className="min-h-screen bg-[#F6F8FB]">
        <LawsuitPreparationContent />
      </div>
    </LawsuitPreparationProvider>
  );
}

export { LawsuitPreparationPage };
