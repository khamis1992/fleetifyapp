import React, { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import {
  AlertCircle,
  Archive,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileSignature,
  FileText,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import {
  CompanyLegalDocument,
  DOCUMENT_TYPE_NAMES,
  FIXED_DOCUMENTS,
  LegalDocumentType,
  lawsuitService,
} from '@/services/LawsuitService';

const legalColors = {
  text: '#020617',
  muted: '#94A3B8',
  surface: '#F6F8FB',
  success: '#22C7A1',
  info: '#38BDF8',
  focus: '#7C83F6',
  danger: '#FB6B7A',
};

const DOCUMENT_TYPE_ICONS: Record<LegalDocumentType, React.ReactNode> = {
  commercial_register: <Building2 className="h-5 w-5" />,
  establishment_record: <Landmark className="h-5 w-5" />,
  iban_certificate: <CreditCard className="h-5 w-5" />,
  representative_id: <UserCheck className="h-5 w-5" />,
  authorization_letter: <FileSignature className="h-5 w-5" />,
  explanatory_memo: <FileText className="h-5 w-5" />,
  contract_copy: <FileText className="h-5 w-5" />,
  documents_list: <FileText className="h-5 w-5" />,
};

const REQUIRED_DOCUMENTS = FIXED_DOCUMENTS;

type DocumentFilter = 'all' | 'missing' | 'uploaded' | 'attention';

export default function CompanyLegalDocuments() {
  const queryClient = useQueryClient();
  const { companyId, isLoading: companyLoading } = useUnifiedCompanyAccess();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<LegalDocumentType | ''>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<DocumentFilter>('all');

  const { data: documents = [], isLoading: docsLoading, refetch } = useQuery({
    queryKey: ['company-legal-documents', companyId],
    queryFn: () => lawsuitService.getCompanyLegalDocuments(companyId!),
    enabled: !!companyId,
  });

  const resetUploadForm = useCallback(() => {
    setUploadDialogOpen(false);
    setSelectedDocType('');
    setSelectedFiles([]);
    setExpiryDate('');
    setNotes('');
  }, []);

  const getDocumentByType = useCallback(
    (type: LegalDocumentType): CompanyLegalDocument | undefined =>
      documents.find((doc) => doc.document_type === type),
    [documents],
  );

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const targetDate = new Date(date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return targetDate <= thirtyDaysFromNow && targetDate > new Date();
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !selectedDocType || selectedFiles.length === 0) {
        throw new Error('بيانات غير مكتملة');
      }

      let fileToUpload = selectedFiles[0];

      if (selectedDocType === 'commercial_register' && selectedFiles.length > 0) {
        const isImages = selectedFiles.every((file) => file.type.startsWith('image/'));

        if (isImages) {
          try {
            const pdf = new jsPDF();

            for (let i = 0; i < selectedFiles.length; i += 1) {
              const file = selectedFiles[i];
              if (i > 0) pdf.addPage();

              const imgData = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });

              const imgProps = pdf.getImageProperties(imgData);
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

              pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            const pdfBlob = pdf.output('blob');
            fileToUpload = new File([pdfBlob], 'commercial_register.pdf', { type: 'application/pdf' });
          } catch (error) {
            console.error('Error creating PDF:', error);
            throw new Error('فشل دمج الصور في ملف PDF');
          }
        }
      }

      return lawsuitService.uploadLegalDocument(
        companyId,
        selectedDocType,
        fileToUpload,
        expiryDate || undefined,
        notes || undefined,
      );
    },
    onSuccess: () => {
      toast.success('تم رفع المستند بنجاح');
      queryClient.invalidateQueries({ queryKey: ['company-legal-documents'] });
      resetUploadForm();
    },
    onError: (error: any) => {
      toast.error(`فشل رفع المستند: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => lawsuitService.deleteLegalDocument(documentId),
    onSuccess: () => {
      toast.success('تم حذف المستند');
      queryClient.invalidateQueries({ queryKey: ['company-legal-documents'] });
    },
    onError: (error: any) => {
      toast.error(`فشل حذف المستند: ${error.message}`);
    },
  });

  const completionStatus = useMemo(
    () =>
      REQUIRED_DOCUMENTS.map((type) => {
        const document = getDocumentByType(type);
        const expired = isExpired(document?.expiry_date);
        const expiringSoon = isExpiringSoon(document?.expiry_date);

        return {
          type,
          document,
          exists: !!document,
          needsAttention: !!document && (expired || expiringSoon),
          expired,
          expiringSoon,
        };
      }),
    [getDocumentByType],
  );

  const completedCount = completionStatus.filter((status) => status.exists).length;
  const missingCount = completionStatus.length - completedCount;
  const attentionCount = completionStatus.filter((status) => status.needsAttention).length;
  const completionPercentage = Math.round((completedCount / REQUIRED_DOCUMENTS.length) * 100);

  const filteredStatus = completionStatus.filter((status) => {
    const query = searchTerm.trim().toLowerCase();
    const name = DOCUMENT_TYPE_NAMES[status.type]?.toLowerCase() || '';
    const fileName = status.document?.document_name?.toLowerCase() || '';
    const matchesSearch = !query || name.includes(query) || fileName.includes(query);

    if (!matchesSearch) return false;
    if (filter === 'missing') return !status.exists;
    if (filter === 'uploaded') return status.exists;
    if (filter === 'attention') return status.needsAttention;
    return true;
  });

  const latestDocuments = [...documents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const openUploadDialog = (type?: LegalDocumentType) => {
    setSelectedDocType(type || '');
    setUploadDialogOpen(true);
  };

  if (companyLoading || docsLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center bg-[#F6F8FB]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F8FB] px-4 py-5 text-[#020617]" dir="rtl">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#22C7A1]/10 text-[#22C7A1]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#22C7A1]">المستندات القانونية</p>
                <h1 className="mt-1 text-2xl font-bold tracking-normal text-[#020617]">
                  مستندات الشركة القانونية
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#94A3B8]">
                  مركز موحد لرفع ومتابعة المستندات الثابتة المطلوبة قبل تجهيز ملفات الدعاوى والتكامل مع تقاضي.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="min-h-[42px] border-slate-200 bg-white text-[#020617] hover:bg-[#F6F8FB]"
              >
                <RefreshCw className="ml-2 h-4 w-4" />
                تحديث
              </Button>
              <Button
                onClick={() => openUploadDialog()}
                className="min-h-[42px] bg-[#22C7A1] text-white shadow-sm hover:bg-[#1fb391]"
              >
                <Plus className="ml-2 h-4 w-4" />
                رفع مستند
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <StatusTile
              icon={<Archive className="h-5 w-5" />}
              label="المطلوب"
              value={REQUIRED_DOCUMENTS.length}
              color={legalColors.focus}
            />
            <StatusTile
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="مرفوع"
              value={completedCount}
              color={legalColors.success}
            />
            <StatusTile
              icon={<AlertCircle className="h-5 w-5" />}
              label="ناقص"
              value={missingCount}
              color={legalColors.danger}
            />
            <StatusTile
              icon={<Clock3 className="h-5 w-5" />}
              label="يحتاج متابعة"
              value={attentionCount}
              color={legalColors.info}
            />
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-[#F6F8FB] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#020617]">جاهزية الملف القانوني</p>
                <p className="mt-1 text-xs text-[#94A3B8]">
                  {completedCount} من {REQUIRED_DOCUMENTS.length} مستند مكتمل
                </p>
              </div>
              <span className="text-2xl font-bold text-[#22C7A1]">{completionPercentage}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full bg-[#22C7A1]"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#020617]">قائمة المستندات المطلوبة</h2>
              <p className="mt-1 text-sm text-[#94A3B8]">راجع النواقص وارفع المستند مباشرة من البطاقة المناسبة.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-[280px]">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ابحث باسم المستند أو الملف..."
                  className="h-11 rounded-xl border-slate-200 bg-[#F6F8FB] pr-10 text-[#020617]"
                />
              </div>
              <Select value={filter} onValueChange={(value) => setFilter(value as DocumentFilter)}>
                <SelectTrigger className="h-11 min-w-[170px] rounded-xl border-slate-200 bg-[#F6F8FB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المستندات</SelectItem>
                  <SelectItem value="missing">النواقص فقط</SelectItem>
                  <SelectItem value="uploaded">المرفوعة فقط</SelectItem>
                  <SelectItem value="attention">تحتاج متابعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {filteredStatus.map((status) => (
              <DocumentRequirementCard
                key={status.type}
                status={status}
                onPreview={(url) => setViewUrl(url)}
                onUpload={() => openUploadDialog(status.type)}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>

          {filteredStatus.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-[#F6F8FB] p-8 text-center">
              <Search className="mx-auto h-8 w-8 text-[#94A3B8]" />
              <p className="mt-3 font-semibold text-[#020617]">لا توجد نتائج مطابقة</p>
              <p className="mt-1 text-sm text-[#94A3B8]">غيّر البحث أو الفلتر لعرض المستندات.</p>
            </div>
          )}
        </section>

        {latestDocuments.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#020617]">سجل المستندات</h2>
                <p className="mt-1 text-sm text-[#94A3B8]">آخر الملفات المرفوعة مع تواريخ الصلاحية والإجراءات السريعة.</p>
              </div>
              <Badge className="bg-[#38BDF8]/10 text-[#0284C7] hover:bg-[#38BDF8]/10">
                {latestDocuments.length} ملف
              </Badge>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              {latestDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="grid gap-3 border-b border-slate-100 bg-white p-3 last:border-b-0 md:grid-cols-[1.3fr_1fr_.8fr_auto] md:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6F8FB] text-[#7C83F6]">
                      {DOCUMENT_TYPE_ICONS[doc.document_type as LegalDocumentType]}
                    </div>
                    <div>
                      <p className="font-semibold text-[#020617]">
                        {DOCUMENT_TYPE_NAMES[doc.document_type as LegalDocumentType]}
                      </p>
                      <p className="mt-1 text-xs text-[#94A3B8]">{doc.document_name}</p>
                    </div>
                  </div>

                  <ExpiryBadge
                    date={doc.expiry_date}
                    expired={isExpired(doc.expiry_date)}
                    expiringSoon={isExpiringSoon(doc.expiry_date)}
                  />

                  <div className="text-sm text-[#94A3B8]">
                    رفع في {new Date(doc.created_at).toLocaleDateString('ar-QA')}
                  </div>

                  <div className="flex gap-1 justify-self-start md:justify-self-end">
                    <Button variant="ghost" size="icon" onClick={() => setViewUrl(doc.file_url)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => window.open(doc.file_url, '_blank')}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(doc.id)}>
                      <Trash2 className="h-4 w-4 text-[#FB6B7A]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#020617]">رفع مستند قانوني</DialogTitle>
            <DialogDescription>
              اختر نوع المستند وارفع الملف. يمكن رفع صور السجل التجاري وسيتم دمجها تلقائيًا في PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>نوع المستند</Label>
              <Select
                value={selectedDocType}
                onValueChange={(value) => setSelectedDocType(value as LegalDocumentType)}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-[#F6F8FB]">
                  <SelectValue placeholder="اختر نوع المستند" />
                </SelectTrigger>
                <SelectContent>
                  {REQUIRED_DOCUMENTS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOCUMENT_TYPE_NAMES[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{selectedDocType === 'commercial_register' ? 'الملفات (صور أو PDF)' : 'الملف (PDF)'}</Label>
              <Input
                type="file"
                accept={selectedDocType === 'commercial_register' ? 'image/*,.pdf' : '.pdf'}
                multiple={selectedDocType === 'commercial_register'}
                className="h-11 rounded-xl border-slate-200 bg-[#F6F8FB]"
                onChange={(event) => {
                  if (event.target.files) {
                    setSelectedFiles(Array.from(event.target.files));
                  }
                }}
              />
              {selectedFiles.length > 0 && (
                <div className="rounded-xl bg-[#38BDF8]/10 px-3 py-2 text-xs text-[#0284C7]">
                  تم اختيار {selectedFiles.length} ملف
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>تاريخ الانتهاء (اختياري)</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-[#F6F8FB]"
                />
              </div>
              <div className="space-y-2">
                <Label>حالة الرفع</Label>
                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-[#F6F8FB] px-3 text-sm text-[#94A3B8]">
                  {selectedDocType ? DOCUMENT_TYPE_NAMES[selectedDocType] : 'بانتظار اختيار النوع'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="أي ملاحظات إضافية..."
                className="min-h-[96px] rounded-xl border-slate-200 bg-[#F6F8FB]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button variant="outline" onClick={resetUploadForm}>
              إلغاء
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!selectedDocType || selectedFiles.length === 0 || uploadMutation.isPending}
              className="bg-[#22C7A1] text-white hover:bg-[#1fb391]"
            >
              {uploadMutation.isPending ? (
                <>
                  <LoadingSpinner className="ml-2 h-4 w-4" />
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="ml-2 h-4 w-4" />
                  رفع المستند
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewUrl} onOpenChange={() => setViewUrl(null)}>
        <DialogContent className="h-[82vh] max-w-5xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>معاينة المستند</DialogTitle>
          </DialogHeader>
          {viewUrl && <iframe src={viewUrl} className="h-full w-full rounded-xl border border-slate-200" title="Document Preview" />}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function StatusTile({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[#F6F8FB] p-3">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1A`, color }}>
          {icon}
        </div>
        <span className="text-2xl font-bold text-[#020617]">{value}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-[#94A3B8]">{label}</p>
    </div>
  );
}

function DocumentRequirementCard({
  status,
  onPreview,
  onUpload,
  onDelete,
}: {
  status: {
    type: LegalDocumentType;
    document?: CompanyLegalDocument;
    exists: boolean;
    needsAttention: boolean;
    expired: boolean;
    expiringSoon: boolean;
  };
  onPreview: (url: string) => void;
  onUpload: () => void;
  onDelete: (id: string) => void;
}) {
  const statusColor = status.exists ? (status.needsAttention ? '#FB6B7A' : '#22C7A1') : '#94A3B8';
  const statusLabel = status.exists ? (status.needsAttention ? 'يحتاج متابعة' : 'مكتمل') : 'ناقص';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#22C7A1]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${statusColor}1A`, color: statusColor }}>
            {DOCUMENT_TYPE_ICONS[status.type]}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-[#020617]">{DOCUMENT_TYPE_NAMES[status.type]}</h3>
              <Badge className="border-0" style={{ backgroundColor: `${statusColor}1A`, color: statusColor }}>
                {statusLabel}
              </Badge>
            </div>
            {status.document ? (
              <div className="mt-2 space-y-1 text-sm text-[#94A3B8]">
                <p className="truncate">{status.document.document_name}</p>
                <ExpiryBadge date={status.document.expiry_date} expired={status.expired} expiringSoon={status.expiringSoon} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#94A3B8]">لم يتم رفع هذا المستند بعد.</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          {status.document ? (
            <>
              <Button variant="ghost" size="icon" onClick={() => onPreview(status.document!.file_url)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => window.open(status.document!.file_url, '_blank')}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onUpload}>
                <Upload className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(status.document!.id)}>
                <Trash2 className="h-4 w-4 text-[#FB6B7A]" />
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onUpload} className="border-[#22C7A1]/30 text-[#0F766E] hover:bg-[#22C7A1]/10">
              <Upload className="ml-2 h-4 w-4" />
              رفع
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ExpiryBadge({
  date,
  expired,
  expiringSoon,
}: {
  date?: string;
  expired: boolean;
  expiringSoon: boolean;
}) {
  if (!date) {
    return <span className="text-sm text-[#94A3B8]">بدون تاريخ انتهاء</span>;
  }

  const color = expired ? '#FB6B7A' : expiringSoon ? '#38BDF8' : '#22C7A1';
  const label = expired ? 'منتهي' : expiringSoon ? 'قريب الانتهاء' : 'ساري';

  return (
    <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${color}1A`, color }}>
      <Calendar className="h-3.5 w-3.5" />
      <span>{new Date(date).toLocaleDateString('ar-QA')}</span>
      <span>{label}</span>
    </div>
  );
}
