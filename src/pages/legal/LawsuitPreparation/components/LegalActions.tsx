import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Database,
  Download,
  FileStack,
  FileText,
  FolderCheck,
  Gavel,
  ListChecks,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLawsuitPreparationContext } from '../store';
import { LawsuitCaseWorkflowCard } from './LawsuitCaseWorkflowCard';
import { TaqadiAutomationPanel } from './TaqadiAutomationPanel';
import { useSignedLeaseValidation } from '@/hooks/legal/useSignedLeaseValidation';
import { getFilingReadiness } from '../utils/filingReadiness';

const mandatoryDocIds = ['memo', 'claims', 'docsList', 'contract', 'commercialRegister', 'ibanCertificate', 'representativeId'] as const;

function ChecklistItem({ complete, label, note }: { complete: boolean; label: string; note: string }) {
  return (
    <div className={`lawsuit-check-row ${complete ? 'is-complete' : ''}`}>
      <span>{complete ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</span>
      <div>
        <strong>{label}</strong>
        <small>{note}</small>
      </div>
    </div>
  );
}

function StationHeader({
  number,
  title,
  subtitle,
  state,
}: {
  number: number;
  title: string;
  subtitle: string;
  state: 'done' | 'current' | 'upcoming';
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
          state === 'done'
            ? 'bg-emerald-100 text-emerald-700'
            : state === 'current'
              ? 'bg-[#173A63] text-white'
              : 'bg-slate-100 text-slate-400'
        }`}
      >
        {state === 'done' ? <CheckCircle2 className="h-4.5 w-4.5" /> : number}
      </span>
      <div>
        <h2 className="text-lg font-black text-[#142033]">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

export function LegalActions() {
  const { state, actions } = useLawsuitPreparationContext();
  const { documents, taqadiData, ui, contract, companyId } = state;

  // Check for signed lease verification
  const { hasSignedLease, hasIdentityMatch, canConvertToLegal, blockingReason } = useSignedLeaseValidation(
    contract?.id,
    companyId
  );

  const readiness = getFilingReadiness(state);
  const readyCount = readiness.documents.ready;
  const allDocumentsReady = readiness.documents.isComplete;
  const contractReady = documents.contract.status === 'ready';
  const taqadiReady = readiness.taqadiComplete;
  const preparationReady = readiness.canStartFiling;
  // HARD GATE: Must have signed lease and identity match to proceed
  const allReady = preparationReady && canConvertToLegal;
  const hasDocumentsForZip = mandatoryDocIds.some((docId) => documents[docId].status === 'ready');

  return (
    <motion.div className="lawsuit-actions-redesign space-y-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <LawsuitCaseWorkflowCard />

      {/* المحطة ① — الجاهزية */}
      <section className="lawsuit-section-panel">
        <div className="lawsuit-section-heading">
          <StationHeader
            number={1}
            title="الجاهزية"
            subtitle="تحقق واحد شامل قبل أي إجراء — مستندات وبيانات"
            state={preparationReady ? 'done' : 'current'}
          />
          <Badge className={preparationReady ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
            {preparationReady ? 'جاهز لبدء الإجراءات' : 'قيد الإعداد'}
          </Badge>
        </div>

        <div className="lawsuit-final-grid">
          <div className="lawsuit-decision-card">
            <FolderCheck className="h-7 w-7" />
            <span>حالة الملف النهائية</span>
            <strong>{preparationReady ? 'يمكن بدء إجراءات رفع الدعوى الآن' : 'توجد متطلبات ناقصة'}</strong>
            <p>{preparationReady ? 'الحافظة مكتملة؛ سيتولى الوكيل مراجعتها واعتمادها أثناء الرفع.' : 'أكمل الحافظة وراجع بيانات التقاضي قبل بدء الإجراءات.'}</p>
          </div>

          <div className="lawsuit-checklist-card">
            <div className="lawsuit-checklist-title">
              <ListChecks className="h-5 w-5" />
              <h3>قائمة التحقق</h3>
            </div>
            <ChecklistItem complete={allDocumentsReady} label="المستندات الإلزامية جاهزة" note={`${readyCount}/${readiness.documents.total} مستند جاهز`} />
            <ChecklistItem complete={contractReady} label="عقد الإيجار متوفر" note="يجب وجود نسخة موقعة أو مرفوعة" />
            <ChecklistItem complete={hasSignedLease} label="عقد موقّع مطابق" note="نسخة العقد الموقع (signed_contract) مرفوعة ومطابقة" />
            <ChecklistItem complete={hasIdentityMatch} label="تطابق الهوية" note="التحقق من هوية العميل مكتمل" />
            <ChecklistItem complete={taqadiReady} label="بيانات التقاضي مكتملة" note="العنوان، الوقائع، الطلبات، وبيانات المدعى عليه" />
            <ChecklistItem
              complete={readiness.profileApproved && readiness.snapshotApprovedAndCurrent}
              label="مراجعة الوكيل واعتماده"
              note={readiness.profileApproved && readiness.snapshotApprovedAndCurrent
                ? 'اعتمد الوكيل النسخة الحديثة المطابقة'
                : 'تبدأ تلقائياً بعد بدء إجراءات الرفع'}
            />
          </div>
        </div>

        {!preparationReady && (
          <div className="lawsuit-warning-strip">
            <AlertCircle className="h-5 w-5" />
            <span>{readiness.missingReasons[0] || 'لن يتم تفعيل قرار فتح القضية حتى تكتمل المتطلبات.'}</span>
          </div>
        )}
        
        {!canConvertToLegal && blockingReason && (
          <div className="lawsuit-warning-strip" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
            <AlertCircle className="h-5 w-5" style={{ color: '#f59e0b' }} />
            <span>
              <strong>⛔ حظر التحويل للقانوني:</strong> {blockingReason}. 
              يجب رفع نسخة العقد الموقع والتحقق من الهوية قبل إعادة الرفع أو التحديث.
            </span>
          </div>
        )}
      </section>

      {/* المحطة ② — الرفع الآلي (لوحة وكيل تقاضي بتصميمها الجديد) */}
      <TaqadiAutomationPanel 
        canConvertToLegal={canConvertToLegal}
        blockingReason={blockingReason}
      />

      {/* المحطة ③ — الإغلاق والتسجيل */}
      <section className="lawsuit-section-panel">
        <div className="lawsuit-section-heading">
          <StationHeader
            number={3}
            title="الإغلاق والتسجيل"
            subtitle="تأكيد فتح القضية في النظام بعد اكتمال الرفع"
            state={allReady ? 'current' : 'upcoming'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="lg"
            onClick={actions.markCaseAsOpened}
            disabled={!allReady || ui.isMarkingCaseOpened}
            className="lawsuit-primary-command"
          >
            {ui.isMarkingCaseOpened ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gavel className="h-5 w-5" />}
            تأكيد فتح القضية
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline">
                إجراءات إضافية
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-lg border-[#E5EAF1]">
              <DropdownMenuItem
                disabled={!allReady || ui.isRegistering}
                onSelect={() => { void actions.registerCase(); }}
              >
                {ui.isRegistering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                تسجيل القضية في النظام
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={ui.isGeneratingAll}
                onSelect={() => { void actions.generateAllDocuments(); }}
              >
                {ui.isGeneratingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileStack className="h-4 w-4" />}
                توليد كل المستندات
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!hasDocumentsForZip || ui.isDownloadingZip}
                onSelect={() => { void actions.downloadAllAsZip(); }}
              >
                {ui.isDownloadingZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                تحميل الحزمة ZIP
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="lawsuit-followup-note">
          <FileText className="h-5 w-5" />
          <div>
            <strong>بعد التسجيل</strong>
            <span>سيتم تحويل العقد إلى إجراء قانوني ويمكن متابعة القضية من سجل القضايا.</span>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

export default LegalActions;
