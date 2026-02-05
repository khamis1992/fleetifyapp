/**
 * Legal Documents Component
 * مكون المستندات القانونية
 * 
 * A comprehensive document management interface with legal professional aesthetic
 * Dark slate theme with amber/gold accents for generated documents
 */


import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Scale,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Circle,
  AlertCircle,
  FolderDown,
  Sparkles,
  RefreshCw,
  Upload,
  Download,
  Eye,
  File,
  FileType,
  Package,
  Building2,
  CreditCard,
  User,
  Gavel,
  FileCheck,
  List,
  Car,
  ShieldAlert,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  useLawsuitPreparationContext, 
  type DocumentsState, 
  type DocumentState 
} from '../store';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" as const }
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const }
  },
};

// Document icon mapping
const documentIcons: Record<string, React.ReactNode> = {
  memo: <FileText className="h-4 w-4" />,
  claims: <Scale className="h-4 w-4" />,
  docsList: <List className="h-4 w-4" />,
  contract: <FileCheck className="h-4 w-4" />,
  commercialRegister: <Building2 className="h-4 w-4" />,
  ibanCertificate: <CreditCard className="h-4 w-4" />,
  representativeId: <User className="h-4 w-4" />,
  violations: <Car className="h-4 w-4" />,
  criminalComplaint: <ShieldAlert className="h-4 w-4" />,
  violationsTransfer: <ArrowRightLeft className="h-4 w-4" />,
};

// Status configurations with colors
const statusConfig = {
  ready: {
    icon: CheckCircle2,
    label: 'جاهز',
    bgClass: 'bg-emerald-500/10 border-emerald-500/30',
    textClass: 'text-emerald-400',
    glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
  },
  generating: {
    icon: LoadingSpinner,
    label: 'جاري التوليد',
    bgClass: 'bg-teal-600/10 border-teal-600/30',
    textClass: 'text-teal-500',
    glowClass: 'shadow-[0_0_15px_rgba(13,148,136,0.3)]',
  },
  pending: {
    icon: Circle,
    label: 'في الانتظار',
    bgClass: 'bg-slate-500/10 border-slate-500/30',
    textClass: 'text-slate-400',
    glowClass: '',
  },
  missing: {
    icon: AlertCircle,
    label: 'غير متوفر',
    bgClass: 'bg-red-500/10 border-red-500/30',
    textClass: 'text-red-400',
    glowClass: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
  },
  error: {
    icon: AlertTriangle,
    label: 'خطأ',
    bgClass: 'bg-red-500/10 border-red-500/30',
    textClass: 'text-red-400',
    glowClass: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
  },
};

// Document Item Component
interface LegalDocumentItemProps {
  document: DocumentState;
  onGenerate?: () => void;
  onUpload?: (file: File) => void;
  onDownloadPdf?: () => void;
  onDownloadDocx?: () => void;
  index: number;
}

function LegalDocumentItem({
  document,
  onGenerate,
  onUpload,
  onDownloadPdf,
  onDownloadDocx,
  index,
}: LegalDocumentItemProps) {
  const status = statusConfig[document.status];
  const StatusIcon = status.icon;

  const handleDownload = () => {
    if (document.url?.startsWith('blob:')) {
      const a = window.document.createElement('a');
      a.href = document.url ?? '';
      a.download = `${document.name}.html`;
      a.style.display = 'none';
      window.document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.document.body.removeChild(a);
      }, 100);
    } else if (document.url) {
      window.open(document.url, '_blank');
    }
  };

  const isGenerated = document.category === 'generated';
  const isCompany = document.category === 'company';
  const isContract = document.category === 'contract';

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.05 }}
      className={`
        group relative overflow-hidden rounded-xl border transition-all duration-300
        backdrop-blur-sm
        ${document.status === 'ready' ? status.glowClass : ''}
        ${status.bgClass}
        hover:scale-[1.01] hover:shadow-lg
      `}
    >
      {/* Amber accent for generated documents */}
      {isGenerated && document.status === 'ready' && (
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-teal-500 to-teal-600" />
      )}

      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Status indicator */}
          <div className={`
            flex items-center justify-center w-10 h-10 rounded-full
            ${              document.status === 'ready'
              ? 'bg-emerald-500/20 text-emerald-500'
              : document.status === 'generating'
              ? 'bg-teal-600/20 text-teal-600'
              : 'bg-slate-200 text-slate-600'
            }
            transition-all duration-300
          `}>
            <StatusIcon className="h-5 w-5" />
          </div>

          {/* Document info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`
                p-1.5 rounded-md
                ${isGenerated
                  ? 'bg-teal-600/10 text-teal-500'
                  : isCompany
                  ? 'bg-teal-500/10 text-teal-400'
                  : isContract
                  ? 'bg-purple-500/10 text-purple-400'
                  : 'bg-slate-500/10 text-slate-400'
                }
              `}>
                {documentIcons[document.id] || <FileText className="h-4 w-4" />}
              </span>
              <h4 className="font-semibold text-slate-900 truncate">
                {document.name}
              </h4>
            </div>
            <p className="text-sm text-slate-600 mt-1 truncate">
              {document.description}
            </p>
            {(document.status === 'error' || document.uploadError) && (
              <p className="text-xs text-red-400 mt-1">
                {document.error?.message || document.uploadError}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 mr-2">
          <AnimatePresence>
            {/* Preview Button */}
            {document.status === 'ready' && document.url && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => document.url && window.open(document.url, '_blank')}
                  className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* PDF & DOCX for memo */}
            {document.id === 'memo' && document.status === 'ready' && (
              <>
                {onDownloadPdf && (
                  <motion.div
                    key="pdf"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDownloadPdf}
                      className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-600"
                    >
                      <File className="h-4 w-4 ml-1.5" />
                      PDF
                    </Button>
                  </motion.div>
                )}
                {onDownloadDocx && (
                  <motion.div
                    key="docx"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDownloadDocx}
                      className="text-teal-500 border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-600"
                    >
                      <FileType className="h-4 w-4 ml-1.5" />
                      Word
                    </Button>
                  </motion.div>
                )}
              </>
            )}

            {/* Regular Download */}
            {document.status === 'ready' && document.url && document.id !== 'memo' && (
              <motion.div
                key="download"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-600"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* Generate Button */}
            {onGenerate && isGenerated && (
              <motion.div
                key="generate"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  size="sm"
                  onClick={onGenerate}
                  disabled={document.status === 'generating'}
                  className={`
                    ${document.status === 'ready'
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-teal-600/20 text-teal-700 border border-teal-600/40 hover:bg-teal-600/30'
                    }
                  `}
                  variant={document.status === 'ready' ? 'outline' : 'default'}
                >
                  {document.status === 'generating' ? (
                    <LoadingSpinner className="h-4 w-4" />
                  ) : document.status === 'ready' ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 ml-1.5" />
                      توليد
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Upload Button */}
            {onUpload && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative"
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpload(file);
                  }}
                  disabled={document.isUploading}
                />
                <Button
                  size="sm"
                  disabled={document.isUploading}
                  className={`
                    ${document.status === 'ready'
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-purple-500/20 text-purple-700 border border-purple-500/40 hover:bg-purple-500/30'
                    }
                  `}
                  variant={document.status === 'ready' ? 'outline' : 'default'}
                >
                  {document.isUploading ? (
                    <LoadingSpinner className="h-4 w-4" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 ml-1.5" />
                      {document.status === 'ready' ? 'تغيير' : 'رفع'}
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Missing Badge for company docs */}
            {document.status === 'missing' && isCompany && (
              <motion.div
                key="missing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Badge variant="destructive" className="text-xs bg-red-500/20 text-red-500 border-red-500/40">
                  غير مرفوع
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// Main Component
export function LegalDocuments() {
  const { state, actions } = useLawsuitPreparationContext();
  const { documents, ui, trafficViolations } = state;

  // Filter mandatory documents
  const mandatoryDocs = [
    documents.memo,
    documents.claims,
    documents.docsList,
    documents.contract,
    documents.commercialRegister,
    documents.ibanCertificate,
    documents.representativeId,
  ].filter(doc => doc.type === 'mandatory');

  // Filter optional documents
  const optionalDocs = [
    documents.violations,
    documents.criminalComplaint,
    documents.violationsTransfer,
  ].filter(doc => {
    if (['violations', 'violationsTransfer'].includes(doc.id)) {
      return trafficViolations.length > 0;
    }
    return doc.type === 'optional';
  });

  // Check if we have content for ZIP
  const hasContentForZip = mandatoryDocs.some(d => d.status === 'ready');

  // Calculate progress
  const readyCount = mandatoryDocs.filter(d => d.status === 'ready').length;
  const totalCount = mandatoryDocs.length;
  const progressPercentage = Math.round((readyCount / totalCount) * 100);

  const handleGenerateDocument = (docId: keyof DocumentsState) => {
    actions.generateDocument(docId);
  };

  const handleUploadDocument = (docId: keyof DocumentsState, file: File) => {
    actions.uploadDocument(docId, file);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 border border-slate-200"
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(13,148,136,0.08),transparent_50%)]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-teal-600/30 to-transparent" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-teal-600/20 to-teal-700/20 border border-teal-600/30 shadow-[0_0_20px_rgba(13,148,136,0.2)]">
              <Package className="h-7 w-7 text-teal-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">المستندات القانونية</h2>
              <p className="text-slate-600 mt-1">إدارة وتوليد مستندات الدعوى القضائية</p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-4">
            <div className="text-left">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-teal-600">{readyCount}</span>
                <span className="text-slate-600">/ {totalCount}</span>
              </div>
              <p className="text-xs text-slate-600">جاهز للتقديم</p>
            </div>
            
            {/* Circular progress */}
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-300"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <motion.path
                  className="text-teal-600"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: progressPercentage / 100 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-semibold text-teal-600">{progressPercentage}%</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ZIP Download Button - Full Width */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        transition={{ delay: 0.1 }}
      >
        <Button
          onClick={actions.downloadAllAsZip}
          disabled={!hasContentForZip || ui.isDownloadingZip}
          className={`
            w-full py-6 text-lg font-semibold
            ${hasContentForZip
              ? 'bg-gradient-to-r from-teal-600/20 to-teal-700/20 text-teal-700 border border-teal-600/40 hover:from-teal-600/30 hover:to-teal-700/30'
              : 'bg-slate-100 text-slate-500 cursor-not-allowed'
            }
            transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.1)]
            hover:shadow-[0_0_30px_rgba(13,148,136,0.2)]
          `}
          variant="outline"
        >
          {ui.isDownloadingZip ? (
            <>
              <LoadingSpinner className="h-5 w-5 ml-3" />
              <span>جاري ضغط المستندات...</span>
            </>
          ) : (
            <>
              <FolderDown className="h-5 w-5 ml-3" />
              <span>تحميل جميع المستندات (ZIP)</span>
              {hasContentForZip && (
                <Badge
                  variant="secondary"
                  className="mr-3 bg-teal-600/20 text-teal-700 border border-teal-600/40"
                >
                  {readyCount} مستند
                </Badge>
              )}
            </>
          )}
        </Button>
      </motion.div>

      {/* Mandatory Documents Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        transition={{ delay: 0.2 }}
      >
        <Card className="relative overflow-hidden bg-slate-50 border-slate-200 backdrop-blur-sm">
          {/* Section accent */}
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-teal-600" />

          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-3 text-slate-900">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-600/10 border border-teal-600/30">
                  <Shield className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <span>المستندات الإلزامية</span>
                  <p className="text-sm font-normal text-slate-600 mt-0.5">مستندات أساسية مطلوبة لإكمال ملف الدعوى</p>
                </div>
              </CardTitle>

              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                >
                  {readyCount}/{totalCount} جاهز
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {mandatoryDocs.map((doc, index) => (
                <LegalDocumentItem
                  key={doc.id}
                  document={doc}
                  index={index}
                  onGenerate={doc.category === 'generated' ? () => handleGenerateDocument(doc.id as keyof DocumentsState) : undefined}
                  onUpload={doc.category === 'contract' ? (file) => handleUploadDocument(doc.id as keyof DocumentsState, file) : undefined}
                  onDownloadPdf={doc.id === 'memo' ? actions.downloadMemoPdf : undefined}
                  onDownloadDocx={doc.id === 'memo' ? actions.downloadMemoDocx : undefined}
                />
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Optional Documents Section */}
      {optionalDocs.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ delay: 0.3 }}
        >
          <Card className="relative overflow-hidden bg-slate-50 border-slate-200 border-dashed backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-3 text-slate-700">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-200 border border-slate-300">
                  <FileText className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <span>المستندات الاختيارية</span>
                  <p className="text-sm font-normal text-slate-500 mt-0.5">مستندات إضافية حسب طبيعة القضية</p>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {optionalDocs.map((doc, index) => (
                  <LegalDocumentItem
                    key={doc.id}
                    document={doc}
                    index={index}
                    onGenerate={doc.category === 'generated' ? () => handleGenerateDocument(doc.id as keyof DocumentsState) : undefined}
                  />
                ))}
              </motion.div>

              {/* Include in Portfolio Options */}
              <Separator className="my-6 bg-slate-200" />

              <div className="space-y-4">
                <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-teal-600" />
                  تضمين في حافظة المستندات
                </p>

                <div className="grid gap-3">
                  <label
                    className={`
                      flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer
                      ${documents.criminalComplaint.status === 'ready'
                        ? 'bg-slate-100 border-slate-300 hover:border-teal-600/40 hover:bg-slate-100'
                        : 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={ui.includeCriminalComplaint}
                      onChange={(e) => actions.setIncludeCriminalComplaint(e.target.checked)}
                      disabled={documents.criminalComplaint.status !== 'ready'}
                      className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-600/50 focus:ring-offset-white disabled:opacity-30"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-800 font-medium">بلاغ سرقة المركبة</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {documents.criminalComplaint.status === 'ready'
                          ? '✅ جاهز للتضمين في الحافظة'
                          : '⏳ يجب توليد المستند أولاً'
                        }
                      </p>
                    </div>
                    {ui.includeCriminalComplaint && (
                      <Badge className="bg-teal-600/20 text-teal-700 border border-teal-600/40">
                        مُدرج
                      </Badge>
                    )}
                  </label>

                  {trafficViolations.length > 0 && (
                    <label
                      className={`
                        flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer
                      ${documents.violationsTransfer.status === 'ready'
                        ? 'bg-slate-100 border-slate-300 hover:border-teal-600/40 hover:bg-slate-100'
                        : 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={ui.includeViolationsTransfer}
                      onChange={(e) => actions.setIncludeViolationsTransfer(e.target.checked)}
                      disabled={documents.violationsTransfer.status !== 'ready'}
                      className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-600/50 focus:ring-offset-white disabled:opacity-30"
                    />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="h-4 w-4 text-slate-500" />
                          <span className="text-slate-800 font-medium">طلب تحويل المخالفات</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {documents.violationsTransfer.status === 'ready'
                            ? '✅ جاهز للتضمين في الحافظة'
                            : '⏳ يجب توليد المستند أولاً'
                          }
                        </p>
                      </div>
                      {ui.includeViolationsTransfer && (
                        <Badge className="bg-teal-600/20 text-teal-700 border border-teal-600/40">
                          مُدرج
                        </Badge>
                      )}
                    </label>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Generate All Button - Bottom Action */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        transition={{ delay: 0.4 }}
        className="flex justify-center"
      >
        <Button
          size="lg"
          onClick={actions.generateAllDocuments}
          disabled={ui.isGeneratingAll}
          className="
            px-8 py-6 text-lg font-semibold
            bg-gradient-to-r from-teal-600 to-teal-700
            text-white hover:from-teal-500 hover:to-teal-600
            shadow-[0_0_30px_rgba(13,148,136,0.4)]
            hover:shadow-[0_0_40px_rgba(13,148,136,0.6)]
            transition-all duration-300
          "
        >
          {ui.isGeneratingAll ? (
            <>
              <LoadingSpinner className="h-5 w-5 ml-3" />
              <span>جاري توليد المستندات...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 ml-3" />
              <span>توليد جميع المستندات</span>
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}

export default LegalDocuments;
