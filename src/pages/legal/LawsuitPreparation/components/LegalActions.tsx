import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Circle, Database, Download, FileStack, FileText, FolderCheck, Gavel, ListChecks, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLawsuitPreparationContext } from '../store';

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

export function LegalActions() {
  const { state, actions } = useLawsuitPreparationContext();
  const { documents, taqadiData, ui } = state;

  const readyCount = mandatoryDocIds.filter((docId) => documents[docId].status === 'ready').length;
  const allDocumentsReady = readyCount === mandatoryDocIds.length;
  const contractReady = documents.contract.status === 'ready';
  const taqadiReady = Boolean(taqadiData?.caseTitle && taqadiData?.defendant?.fullName);
  const allReady = allDocumentsReady && contractReady && taqadiReady;
  const hasDocumentsForZip = mandatoryDocIds.some((docId) => documents[docId].status === 'ready');

  return (
    <motion.div className="lawsuit-actions-redesign" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <section className="lawsuit-section-panel">
        <div className="lawsuit-section-heading">
          <div>
            <Badge className="bg-[#EAF2F9] text-[#173A63] hover:bg-[#EAF2F9]">الإغلاق والمتابعة</Badge>
            <h2>قرار فتح القضية</h2>
            <p>تأكد من اكتمال المتطلبات ثم سجل فتح القضية أو حمل الحزمة النهائية.</p>
          </div>
          <Badge className={allReady ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
            {allReady ? 'جاهز للإغلاق' : 'قيد الإعداد'}
          </Badge>
        </div>

        <div className="lawsuit-final-grid">
          <div className="lawsuit-decision-card">
            <FolderCheck className="h-7 w-7" />
            <span>حالة الملف النهائية</span>
            <strong>{allReady ? 'يمكن فتح القضية الآن' : 'توجد متطلبات ناقصة'}</strong>
            <p>{allReady ? 'المستندات وبيانات التقاضي جاهزة للتسجيل.' : 'أكمل الحافظة وراجع بيانات التقاضي قبل تسجيل القضية.'}</p>
          </div>

          <div className="lawsuit-checklist-card">
            <div className="lawsuit-checklist-title">
              <ListChecks className="h-5 w-5" />
              <h3>قائمة التحقق</h3>
            </div>
            <ChecklistItem complete={allDocumentsReady} label="المستندات الإلزامية جاهزة" note={`${readyCount}/${mandatoryDocIds.length} مستند جاهز`} />
            <ChecklistItem complete={contractReady} label="عقد الإيجار متوفر" note="يجب وجود نسخة موقعة أو مرفوعة" />
            <ChecklistItem complete={taqadiReady} label="بيانات التقاضي مكتملة" note="العنوان، الوقائع، الطلبات، وبيانات المدعى عليه" />
          </div>
        </div>

        {!allReady && (
          <div className="lawsuit-warning-strip">
            <AlertCircle className="h-5 w-5" />
            <span>لن يتم تفعيل قرار فتح القضية بشكل آمن حتى تكتمل المتطلبات أعلاه.</span>
          </div>
        )}
      </section>

      <section className="lawsuit-section-panel">
        <div className="lawsuit-action-grid">
          <Button type="button" size="lg" onClick={actions.markCaseAsOpened} disabled={!allReady || ui.isMarkingCaseOpened} className="lawsuit-primary-command">
            {ui.isMarkingCaseOpened ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gavel className="h-5 w-5" />}
            تم فتح قضية
          </Button>
          <Button type="button" variant="outline" onClick={actions.generateAllDocuments} disabled={ui.isGeneratingAll}>
            {ui.isGeneratingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileStack className="h-4 w-4" />}
            توليد كل المستندات
          </Button>
          <Button type="button" variant="outline" onClick={actions.downloadAllAsZip} disabled={!hasDocumentsForZip || ui.isDownloadingZip}>
            {ui.isDownloadingZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            تحميل الحزمة ZIP
          </Button>
          <Button type="button" variant="outline" onClick={actions.registerCase} disabled={!allReady || ui.isRegistering}>
            {ui.isRegistering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            تسجيل القضية في النظام
          </Button>
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
