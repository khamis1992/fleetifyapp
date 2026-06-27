import { useMemo, useState, type ElementType } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  FileText,
  FolderOpen,
  Gavel,
  Loader2,
  Scale,
  Sparkles,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCustomerName } from '@/utils/formatCustomerName';
import {
  LawsuitPreparationProvider,
  useLawsuitPreparationContext,
  type DocumentsState,
  type DocumentState,
} from './store';
import { LegalHeader } from './components/LegalHeader';
import { LegalOverview } from './components/LegalOverview';
import { LegalDocuments } from './components/LegalDocuments';
import { LegalTaqadi } from './components/LegalTaqadi';
import { LegalActions } from './components/LegalActions';
import '@/styles/legal-system.css';
import './LegalTheme.css';

type TabId = 'overview' | 'documents' | 'taqadi' | 'actions';

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
    icon: FolderOpen,
  },
];

function formatQar(amount?: number | null) {
  return new Intl.NumberFormat('ar-QA', {
    style: 'currency',
    currency: 'QAR',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function getDocumentMetrics(documents: DocumentsState) {
  const mandatoryDocs: DocumentState[] = [
    documents.memo,
    documents.claims,
    documents.docsList,
    documents.contract,
    documents.commercialRegister,
    documents.ibanCertificate,
    documents.representativeId,
  ];

  const ready = mandatoryDocs.filter((doc) => doc.status === 'ready').length;
  const missing = mandatoryDocs.filter((doc) => doc.status === 'missing' || doc.status === 'error' || doc.uploadError).length;
  const generating = mandatoryDocs.filter((doc) => doc.status === 'generating' || doc.isUploading).length;

  return {
    total: mandatoryDocs.length,
    ready,
    missing,
    generating,
    percentage: mandatoryDocs.length ? Math.round((ready / mandatoryDocs.length) * 100) : 0,
    isComplete: ready === mandatoryDocs.length,
  };
}

function LegalStageTabs({
  activeTab,
  onTabChange,
  readiness,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  readiness: ReturnType<typeof getDocumentMetrics>;
}) {
  return (
    <nav className="lawsuit-stage-nav" aria-label="مراحل تجهيز الدعوى">
      {TABS.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isDone =
          (tab.id === 'overview' && readiness.ready > 0) ||
          (tab.id === 'documents' && readiness.isComplete) ||
          (tab.id === 'taqadi' && readiness.ready >= 3);

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`lawsuit-stage-button ${isActive ? 'is-active' : ''}`}
          >
            <span className="lawsuit-stage-number">{index + 1}</span>
            <span className="lawsuit-stage-icon">
              {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </span>
            <span className="min-w-0 text-right">
              <span className="block truncate text-sm font-black">{tab.label}</span>
              <span className="block truncate text-xs font-semibold opacity-70">{tab.description}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function LawsuitCommandPanel({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const { state, actions } = useLawsuitPreparationContext();
  const { calculations, contract, customer, documents, overdueInvoices, taqadiData, trafficViolations, ui, vehicle } = state;
  const readiness = useMemo(() => getDocumentMetrics(documents), [documents]);
  const customerName = customer ? formatCustomerName(customer) : 'عميل غير محدد';
  const vehicleName = vehicle ? [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') : 'مركبة غير محددة';

  const nextAction =
    !readiness.isComplete
      ? {
          title: 'استكمال حافظة المستندات',
          note: `${readiness.missing} مستند مطلوب قبل جاهزية الملف.`,
          button: 'فتح الحافظة',
          tab: 'documents' as TabId,
          icon: Archive,
        }
      : !taqadiData
        ? {
            title: 'مراجعة بيانات التقاضي',
            note: 'راجع بيانات النسخ قبل الانتقال إلى نظام التقاضي.',
            button: 'فتح بيانات التقاضي',
            tab: 'taqadi' as TabId,
            icon: Database,
          }
        : {
            title: 'جاهز للإغلاق والمتابعة',
            note: 'يمكن تسجيل فتح القضية أو تحميل الحزمة النهائية.',
            button: 'فتح الإجراءات',
            tab: 'actions' as TabId,
            icon: ClipboardCheck,
          };

  const NextIcon = nextAction.icon;

  return (
    <aside className="lawsuit-command-panel">
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

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="lawsuit-mini-stat">
            <strong>{readiness.ready}</strong>
            <span>جاهز</span>
          </div>
          <div className="lawsuit-mini-stat">
            <strong>{readiness.missing}</strong>
            <span>نواقص</span>
          </div>
          <div className="lawsuit-mini-stat">
            <strong>{readiness.generating}</strong>
            <span>قيد العمل</span>
          </div>
        </div>
      </section>

      <section className="lawsuit-command-card is-next">
        <div className="flex items-start gap-3">
          <span className="lawsuit-next-icon">
            <NextIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black text-[#66758A]">الإجراء التالي</p>
            <h3>{nextAction.title}</h3>
            <span>{nextAction.note}</span>
          </div>
        </div>
        <Button type="button" onClick={() => onTabChange(nextAction.tab)} className="mt-4 w-full bg-[#173A63] text-white hover:bg-[#102C4D]">
          {nextAction.button}
        </Button>
      </section>

      <section className="lawsuit-command-card">
        <p className="text-xs font-black text-[#66758A]">الملف المرتبط</p>
        <div className="mt-3 space-y-3">
          <button type="button" onClick={() => onTabChange('overview')} className="lawsuit-linked-row">
            <span>العميل</span>
            <strong>{customerName}</strong>
          </button>
          <button type="button" onClick={() => onTabChange('overview')} className="lawsuit-linked-row">
            <span>العقد</span>
            <strong dir="ltr">{contract?.contract_number || '-'}</strong>
          </button>
          <button type="button" onClick={() => onTabChange('overview')} className="lawsuit-linked-row">
            <span>المركبة</span>
            <strong>{vehicleName || '-'}</strong>
          </button>
        </div>
      </section>

      <section className="lawsuit-command-card">
        <div className="grid grid-cols-2 gap-2">
          <div className="lawsuit-metric-box">
            <span>المطالبة</span>
            <strong>{formatQar(calculations?.total)}</strong>
          </div>
          <div className="lawsuit-metric-box">
            <span>الفواتير</span>
            <strong>{overdueInvoices.length}</strong>
          </div>
          <div className="lawsuit-metric-box">
            <span>المخالفات</span>
            <strong>{trafficViolations.length}</strong>
          </div>
          <div className="lawsuit-metric-box">
            <span>التبويب</span>
            <strong>{TABS.find((tab) => tab.id === activeTab)?.label}</strong>
          </div>
        </div>
      </section>

      <section className="lawsuit-command-card">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#173A63]" />
          <p className="text-sm font-black text-[#142033]">اختصارات التشغيل</p>
        </div>
        <div className="mt-3 grid gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={actions.generateAllDocuments}
            disabled={ui.isGeneratingAll}
            className="justify-center gap-2"
          >
            {ui.isGeneratingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            توليد المستندات
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={actions.downloadAllAsZip}
            disabled={ui.isDownloadingZip || readiness.ready === 0}
            className="justify-center gap-2"
          >
            {ui.isDownloadingZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            تحميل الحزمة
          </Button>
        </div>
      </section>
    </aside>
  );
}

function LawsuitTabContent({ activeTab }: { activeTab: TabId }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.22 }}
        className="lawsuit-tab-content"
      >
        {activeTab === 'overview' && <LegalOverview />}
        {activeTab === 'documents' && <LegalDocuments />}
        {activeTab === 'taqadi' && <LegalTaqadi />}
        {activeTab === 'actions' && <LegalActions />}
      </motion.div>
    </AnimatePresence>
  );
}

function LawsuitPreparationContent() {
  const { state } = useLawsuitPreparationContext();
  const { contract, documents, ui } = state;
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const readiness = useMemo(() => getDocumentMetrics(documents), [documents]);

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
      <section className="lawsuit-redesign-hero">
        <div className="lawsuit-hero-title">
          <Badge className="bg-[#EAF2F9] text-[#173A63] hover:bg-[#EAF2F9]">
            <Scale className="ml-1 h-3.5 w-3.5" />
            مركز تجهيز الدعوى
          </Badge>
          <h1>تجهيز الدعوى القانونية</h1>
          <p>مسار عمل موحد لمراجعة القضية، تجهيز الحافظة، نقل بيانات التقاضي، ثم الإغلاق والمتابعة.</p>
        </div>

        <div className="lawsuit-hero-status">
          <span>{readiness.percentage}% جاهزية</span>
          <strong>{readiness.isComplete ? 'جاهز للتقديم' : 'قيد التجهيز'}</strong>
        </div>
      </section>

      <LegalHeader />

      <LegalStageTabs activeTab={activeTab} onTabChange={setActiveTab} readiness={readiness} />

      <div className="lawsuit-redesign-grid">
        <LawsuitCommandPanel activeTab={activeTab} onTabChange={setActiveTab} />
        <section className="lawsuit-workbench">
          <LawsuitTabContent activeTab={activeTab} />
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
    <LawsuitPreparationProvider contractId={contractId}>
      <div className="min-h-screen bg-[#F4F7FA]">
        <LawsuitPreparationContent />
      </div>
    </LawsuitPreparationProvider>
  );
}

export { LawsuitPreparationPage };
