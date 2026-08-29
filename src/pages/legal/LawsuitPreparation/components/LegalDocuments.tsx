import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileText,
  FileType,
  FolderDown,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  Shield,
  ShieldAlert,
  Upload,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFleetifyTranslation } from '@/hooks/useTranslation';
import { useLawsuitPreparationContext, type DocumentState, type DocumentsState } from '../store';
import {
  getLegalDocumentUploadRoute,
  isUploadableDocumentId,
} from '../utils/documentUploadRouting';
import { getCriminalComplaintEligibility } from '../utils/legalCaseWorkflow';
import { printHtmlDocumentAsPdf } from '../utils/printHtmlDocument';

const baseMandatoryDocIds: (keyof DocumentsState)[] = [
  'memo',
  'claims',
  'docsList',
  'contract',
  'commercialRegister',
  'ibanCertificate',
  'representativeId',
];

const supportingDocIds: (keyof DocumentsState)[] = ['violations', 'criminalComplaint', 'violationsTransfer'];

const docIcons: Record<string, ReactNode> = {
  memo: <FileText className="h-4 w-4" />,
  claims: <FileCheck className="h-4 w-4" />,
  docsList: <Package className="h-4 w-4" />,
  contract: <Shield className="h-4 w-4" />,
  commercialRegister: <Building2 className="h-4 w-4" />,
  ibanCertificate: <FileText className="h-4 w-4" />,
  representativeId: <User className="h-4 w-4" />,
  violations: <AlertCircle className="h-4 w-4" />,
  violationsEvidence: <Shield className="h-4 w-4" />,
  criminalComplaint: <ShieldAlert className="h-4 w-4" />,
  violationsTransfer: <ArrowRightLeft className="h-4 w-4" />,
};

function statusLabel(status: DocumentState['status']) {
  if (status === 'ready') return 'جاهز';
  if (status === 'generating') return 'قيد التوليد';
  if (status === 'missing') return 'ناقص';
  if (status === 'error') return 'خطأ';
  return 'بانتظار الإجراء';
}

function downloadDocument(document: DocumentState) {
  if (document.htmlContent) {
    printHtmlDocumentAsPdf(document.htmlContent, document.name);
    return;
  }

  if (!document.url) return;
  if (document.url.startsWith('blob:')) {
    throw new Error('لا تتوفر نسخة PDF قابلة للتنزيل لهذا المستند');
  }
  window.open(document.url, '_blank');
}

function DocumentUploadControl({
  document,
  onUpload,
  compact = false,
}: {
  document: DocumentState;
  onUpload: (file: File) => void | Promise<void>;
  compact?: boolean;
}) {
  const isReady = document.status === 'ready';
  const uploadRoute = getLegalDocumentUploadRoute(document.id as keyof DocumentsState);
  const label = isReady
    ? document.id === 'violationsEvidence' ? 'إضافة ملف' : 'تغيير الملف'
    : 'رفع الملف';

  return (
    <label
      className={`lawsuit-upload-button${compact ? ' is-compact' : ''}${document.isUploading ? ' is-disabled' : ''}`}
      title={uploadRoute?.scopeLabel}
    >
      <input
        type="file"
        accept={uploadRoute?.destination === 'company'
          ? '.pdf,application/pdf'
          : '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx'}
        aria-label={`رفع ${document.name}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = '';
          if (file) void onUpload(file);
        }}
        disabled={document.isUploading}
      />
      {document.isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      {document.isUploading ? 'جارٍ الرفع' : label}
    </label>
  );
}

function DocumentLedgerRow({
  document,
  index,
  onGenerate,
  onUpload,
  onDownloadPdf,
  onDownloadDocx,
}: {
  document: DocumentState;
  index: number;
  onGenerate?: () => void;
  onUpload?: (file: File) => void;
  onDownloadPdf?: () => void;
  onDownloadDocx?: () => void;
}) {
  const { t } = useFleetifyTranslation('ui');
  const isReady = document.status === 'ready';
  const isWorking = document.status === 'generating' || document.isUploading;
  const uploadRoute = getLegalDocumentUploadRoute(document.id as keyof DocumentsState);

  return (
    <div className={`lawsuit-document-row is-${document.status}`}>
      <div className="lawsuit-document-index">{String(index + 1).padStart(2, '0')}</div>
      <div className="lawsuit-document-icon">{docIcons[document.id] || <FileText className="h-4 w-4" />}</div>
      <div className="lawsuit-document-main">
        <strong>{document.name}</strong>
        <span>{document.description}</span>
        {uploadRoute && <small className="lawsuit-document-destination">{uploadRoute.scopeLabel}</small>}
        {(document.error || document.uploadError) && <small>{document.error?.message || document.uploadError}</small>}
      </div>
      <Badge className={`lawsuit-doc-status is-${document.status}`}>
        {isReady && <CheckCircle2 className="h-3.5 w-3.5" />}
        {isWorking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {statusLabel(document.status)}
      </Badge>
      <div className="lawsuit-document-actions">
        {isReady && document.url && (
          <Button type="button" variant="ghost" size="icon" onClick={() => window.open(document.url || '', '_blank')} aria-label="معاينة المستند">
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {document.id === 'memo' && isReady && onDownloadPdf && (
          <Button type="button" variant="outline" size="sm" onClick={onDownloadPdf}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
        )}
        {document.id === 'memo' && isReady && onDownloadDocx && (
          <Button type="button" variant="outline" size="sm" onClick={onDownloadDocx}>
            <FileType className="h-4 w-4" />
            {t('word')}
          </Button>
        )}
        {isReady && document.url && document.id !== 'memo' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                downloadDocument(document);
              } catch (error) {
                console.error('[LegalDocuments] PDF download failed:', error);
              }
            }}
          >
            {document.htmlContent ? <Printer className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {document.htmlContent ? 'حفظ PDF' : 'تحميل'}
          </Button>
        )}
        {onGenerate && (
          <Button type="button" variant={isReady ? 'outline' : 'default'} size="sm" onClick={onGenerate} disabled={isWorking}>
            {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : isReady ? <RefreshCw className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {isReady ? 'إعادة توليد' : 'توليد'}
          </Button>
        )}
        {onUpload && (
          <DocumentUploadControl document={document} onUpload={onUpload} />
        )}
      </div>
    </div>
  );
}

export function LegalDocuments() {
  const { state, actions } = useLawsuitPreparationContext();
  const { documents, overdueInvoices, ui } = state;
  const hasSupportedViolations = (state.calculations?.violationsCount || 0) > 0;
  const criminalComplaintEligibility = getCriminalComplaintEligibility(state);

  const mandatoryDocIds = hasSupportedViolations
    ? [...baseMandatoryDocIds, 'violationsEvidence' as const]
    : baseMandatoryDocIds;
  const mandatoryDocs = mandatoryDocIds.map((docId) => documents[docId]);
  const supportingDocs = supportingDocIds
    .map((docId) => documents[docId])
    .filter((doc) => {
      if (['violations', 'violationsTransfer'].includes(doc.id)) return hasSupportedViolations;
      if (doc.id === 'criminalComplaint') return criminalComplaintEligibility.eligible;
      return doc.type === 'optional';
    });

  const readyCount = mandatoryDocs.filter((doc) => doc.status === 'ready').length;
  const missingDocs = mandatoryDocs.filter((doc) => doc.status !== 'ready');
  const readiness = Math.round((readyCount / mandatoryDocs.length) * 100);
  const hasContentForZip = mandatoryDocs.some((doc) => doc.status === 'ready');

  return (
    <motion.div className="lawsuit-documents-redesign" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <section className="lawsuit-section-panel lawsuit-doc-hero">
        <div className="lawsuit-section-heading">
          <div>
            <Badge className="bg-[#EAF2F9] text-[#173A63] hover:bg-[#EAF2F9]">حافظة المستندات</Badge>
            <h2>سجل المستندات الرسمي</h2>
            <p>توليد، رفع، مراجعة، وتحميل ملفات الدعوى من مكان واحد.</p>
          </div>
          <div className="lawsuit-doc-progress">
            <span>{readiness}%</span>
            <strong>{readyCount}/{mandatoryDocs.length} جاهز</strong>
          </div>
        </div>

        <div className="lawsuit-doc-actions-bar">
          <Button type="button" onClick={actions.downloadInvoicesAsZip} disabled={overdueInvoices.length === 0 || ui.isDownloadingInvoices} variant="outline">
            {ui.isDownloadingInvoices ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            تحميل مستندات الاستحقاق ({overdueInvoices.length})
          </Button>
          <Button type="button" onClick={actions.downloadAllAsZip} disabled={!hasContentForZip || ui.isDownloadingZip}>
            {ui.isDownloadingZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderDown className="h-4 w-4" />}
            تحميل الحافظة ZIP
          </Button>
          <Button type="button" onClick={actions.generateAllDocuments} disabled={ui.isGeneratingAll} variant="outline">
            {ui.isGeneratingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            توليد كل المستندات
          </Button>
        </div>
      </section>

      <section className="lawsuit-section-panel">
        <div className="lawsuit-document-ledger">
          <div className="lawsuit-ledger-header">
            <span>المستند</span>
            <span>الحالة</span>
            <span>الإجراءات</span>
          </div>
          {mandatoryDocs.map((doc, index) => (
            <DocumentLedgerRow
              key={doc.id}
              document={doc}
              index={index}
              onGenerate={doc.category === 'generated' ? () => actions.generateDocument(doc.id as keyof DocumentsState) : undefined}
              onUpload={isUploadableDocumentId(doc.id as keyof DocumentsState)
                ? (file) => actions.uploadDocument(doc.id as keyof DocumentsState, file)
                : undefined}
              onDownloadPdf={doc.id === 'memo' ? actions.downloadMemoPdf : undefined}
              onDownloadDocx={doc.id === 'memo' ? actions.downloadMemoDocx : undefined}
            />
          ))}
        </div>
      </section>

      {missingDocs.length > 0 && (
        <section className="lawsuit-missing-panel">
          <AlertCircle className="h-5 w-5" />
          <div className="lawsuit-missing-content">
            <strong>النواقص الحالية</strong>
            <span>أكمل الملفات من هنا، وسيحفظ كل ملف تلقائيًا في الحافظة المرتبطة به.</span>
            <div className="lawsuit-missing-list">
              {missingDocs.map((doc) => {
                const uploadable = isUploadableDocumentId(doc.id as keyof DocumentsState);
                const route = getLegalDocumentUploadRoute(doc.id as keyof DocumentsState);
                return (
                  <div className="lawsuit-missing-item" key={doc.id}>
                    <div>
                      <strong>{doc.name}</strong>
                      <small>{route?.scopeLabel || 'يُنشأ تلقائيًا من بيانات القضية'}</small>
                    </div>
                    {uploadable ? (
                      <DocumentUploadControl
                        document={doc}
                        compact
                        onUpload={(file) => actions.uploadDocument(doc.id as keyof DocumentsState, file)}
                      />
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => actions.generateDocument(doc.id as keyof DocumentsState)}
                        disabled={doc.status === 'generating'}
                      >
                        {doc.status === 'generating'
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <FileText className="h-4 w-4" />}
                        توليد المستند
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {supportingDocs.length > 0 && (
        <section className="lawsuit-section-panel">
          <div className="lawsuit-section-heading compact">
            <div>
              <h2>المستندات الداعمة</h2>
              <p>تظهر حسب طبيعة القضية والمخالفات المرتبطة بالعقد.</p>
            </div>
          </div>

          <div className="lawsuit-document-ledger">
            {supportingDocs.map((doc, index) => (
              <DocumentLedgerRow
                key={doc.id}
                document={doc}
                index={index}
                onGenerate={doc.category === 'generated' || doc.category === 'violations' ? () => actions.generateDocument(doc.id as keyof DocumentsState) : undefined}
              />
            ))}
          </div>

          <div className="lawsuit-include-grid">
            <label className={documents.criminalComplaint.status === 'ready' ? '' : 'is-disabled'}>
              <input
                type="checkbox"
                checked={ui.includeCriminalComplaint}
                onChange={(event) => actions.setIncludeCriminalComplaint(event.target.checked)}
                disabled={documents.criminalComplaint.status !== 'ready'}
              />
              <span>تضمين البلاغ الجنائي بالامتناع عن رد المركبة في الحافظة</span>
            </label>
            {hasSupportedViolations && (
              <label className={documents.violationsTransfer.status === 'ready' ? '' : 'is-disabled'}>
                <input
                  type="checkbox"
                  checked={ui.includeViolationsTransfer}
                  onChange={(event) => actions.setIncludeViolationsTransfer(event.target.checked)}
                  disabled={documents.violationsTransfer.status !== 'ready'}
                />
                <span>تضمين طلب تحويل المخالفات في الحافظة</span>
              </label>
            )}
          </div>
        </section>
      )}
    </motion.div>
  );
}

export default LegalDocuments;
