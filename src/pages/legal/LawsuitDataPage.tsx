import { LegalPageHeader } from '@/components/legal/workspace/LegalPageHeader';
/**
 * صفحة بيانات التقاضي - عرض وإدارة بيانات القضايا
 * @component LawsuitDataPage
 */

import React, { useState, useRef } from 'react';
import { collectLegalPages } from '@/services/legalCaseQueries';
import { generatePackageDocument, recordedPackageDocuments, renderLawsuitPackageManifest, type PackageDocument } from '@/components/legal/workspace/lawsuitPackageManifest';
import { parseLegalClaimAmount } from '@/components/legal/workspace/legalCaseExport';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
import {
  FileText,
  Download,
  Eye,
  Trash2,
  Plus,
  ArrowLeft,
  RefreshCw,
  Search,
  FileSpreadsheet,
  AlertCircle,
  FolderDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  buildClaimsStatementData,
  getMemoDocumentDataForGeneration,
  loadCanonicalLawsuitState,
} from './LawsuitPreparation/utils/documentGenerators';
import { generateLegalComplaintHTML } from '@/utils/legal-document-generator';
import {
  generateClaimsStatementHtml,
} from '@/utils/official-letter-generator';
import '@/styles/legal-system.css';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { decodeDisplayText } from '@/utils/arabicDisplayText';

interface LawsuitTemplate {
  id: number;
  company_id: string;
  contract_id?: string;
  case_title: string;
  facts: string;
  requests: string;
  claim_amount: number;
  claim_amount_words: string;
  defendant_first_name: string;
  defendant_middle_name: string;
  defendant_last_name: string;
  defendant_nationality: string;
  defendant_id_number: string;
  defendant_address: string;
  defendant_phone: string;
  defendant_email: string;
  created_at: string;
  // بيانات العقد
  contract_number?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  monthly_rent?: number;
  total_contract_amount?: number;
  // بيانات المركبة
  vehicle_plate_number?: string;
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  // من المذكرة الشارحة
  months_unpaid?: number;
  overdue_amount?: number;
  late_penalty?: number;
  days_overdue?: number;
  compensation_amount?: number;
  // من كشف المطالبات المالية
  invoices_count?: number;
  total_invoices_amount?: number;
  total_penalties?: number;
  // من كشف المخالفات المرورية
  violations_count?: number;
  violations_amount?: number;
  // تتبع الإنشاء التلقائي
  auto_created?: boolean;
  verification_task_id?: string;
  deleted_at?: string | null;
}

export default function LawsuitDataPage() {
  const navigate = useNavigate();
  const { companyId } = useUnifiedCompanyAccess();
  const { lawsuitId } = useParams<{ lawsuitId: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const currentCompanyRef = useRef(companyId);
  currentCompanyRef.current = companyId;

  // جلب بيانات القضايا
  const { data: lawsuits, isLoading, error: lawsuitsError, refetch } = useQuery({
    queryKey: ['lawsuit_templates', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('تعذر تحديد الشركة');
      return collectLegalPages(async (offset, pageSize) => {
        const { data, error, count } = await supabase.from('lawsuit_templates').select('*', { count: 'exact' })
          .eq('company_id', companyId).is('deleted_at', null).order('created_at', { ascending: false }).order('id', { ascending: true }).range(offset, offset + pageSize - 1);
        if (error) throw error;
        if (data?.some(row => row.company_id !== companyId)) throw new Error('بيانات تقاضٍ خارج نطاق الشركة');
        return { data: (data || []) as unknown as LawsuitTemplate[], count };
      });
    },
    enabled: !!companyId,
  });

  // تصفية البيانات حسب البحث
  const filteredLawsuits = React.useMemo(() => {
    if (!lawsuits) return [];
    if (!searchTerm) return lawsuits;

    const term = searchTerm.toLowerCase();
    return lawsuits.filter(
      (lawsuit) =>
        (lawsuit.case_title || '').toLowerCase().includes(term) ||
        (lawsuit.defendant_first_name || '').toLowerCase().includes(term) ||
        (lawsuit.defendant_last_name || '').toLowerCase().includes(term) ||
        (lawsuit.defendant_id_number || '').toLowerCase().includes(term)
    );
  }, [lawsuits, searchTerm]);

  const selectedLawsuit = React.useMemo(
    () => lawsuits?.find((lawsuit) => String(lawsuit.id) === lawsuitId) || null,
    [lawsuitId, lawsuits]
  );

  // حذف قضية
  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه القضية؟')) return;
    if (!companyId) {
      toast.error('تعذر تحديد الشركة');
      return;
    }

    const { error } = await supabase.rpc('soft_delete_lawsuit_template_v1', {
      p_company_id: companyId,
      p_reason: 'Archived from lawsuit data page',
      p_template_id: id,
    });

    if (error) {
      toast.error('فشل حذف القضية');
      return;
    }

    toast.success('تم حذف القضية بنجاح');
    refetch();
  };

  // تحميل الصور (اللوقو، التوقيع، الختم) كـ Base64
  const loadImageAsBase64 = async (path: string): Promise<string> => {
    try {
      const response = await fetch(path);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`Failed to load image ${path}:`, error);
      return '';
    }
  };

  // تضمين جميع الصور في HTML
  const embedImagesInHtml = async (html: string, images: { logo: string; signature: string; stamp: string }): Promise<string> => {
    let result = html;
    
    if (images.logo) {
      result = result
        .replace(/src="\/receipts\/logo\.png"/g, `src="${images.logo}"`)
        .replace(/src='\/receipts\/logo\.png'/g, `src='${images.logo}'`);
    }
    
    if (images.signature) {
      result = result
        .replace(/src="\/receipts\/signature\.png"/g, `src="${images.signature}"`)
        .replace(/src='\/receipts\/signature\.png'/g, `src='${images.signature}'`);
    }
    
    if (images.stamp) {
      result = result
        .replace(/src="\/receipts\/stamp\.png"/g, `src="${images.stamp}"`)
        .replace(/src='\/receipts\/stamp\.png'/g, `src='${images.stamp}'`);
    }
    
    return result;
  };

  // Generated drafts and an honest document inventory; stored originals are not included.
  const handleGenerateAllDocuments = async () => {
    if (!companyId || lawsuitsError || !filteredLawsuits.length) {
      toast.error('تعذر تحميل بيانات التقاضي كاملة أو لا توجد نتائج للتوليد');
      return;
    }
    const exportCompany = companyId;
    const exportLawsuits = [...filteredLawsuits];
    setIsGeneratingDocs(true);
    try {
      const zip = new JSZip();
      const results: Array<{ templateId: number; title: string; documents: PackageDocument[] }> = [];
      const [logo, signature, stamp] = await Promise.all([
        loadImageAsBase64('/receipts/logo.png'), loadImageAsBase64('/receipts/signature.png'), loadImageAsBase64('/receipts/stamp.png'),
      ]);
      const images = { logo, signature, stamp };
      const companyDocuments = await collectLegalPages(async (offset, size) => {
        const result = await supabase.from('company_legal_documents').select('id,document_name,document_type,file_url,company_id', { count: 'exact' })
          .eq('company_id', exportCompany).eq('is_active', true).order('id').range(offset, offset + size - 1);
        if (result.error) throw result.error;
        if (result.data?.some(document => document.company_id !== exportCompany)) throw new Error('مستند شركة خارج النطاق');
        return { data: result.data || [], count: result.count };
      });
      for (const lawsuit of exportLawsuits) {
        const customerName = `${lawsuit.defendant_first_name || ''} ${lawsuit.defendant_last_name || ''}`.trim();
        const safeName = `${lawsuit.id}-${customerName}`.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
        const folder = zip.folder(safeName);
        if (!folder) throw new Error('تعذر إنشاء مجلد المستندات');
        let documents = recordedPackageDocuments(companyDocuments.map(document => ({ id: document.id, title: document.document_name, type: document.document_type, hasReference: Boolean(document.file_url) })), [
          { type: 'commercial_register', title: 'السجل التجاري' }, { type: 'establishment_record', title: 'قيد المنشأة' },
        ]);
        try {
          if (lawsuit.company_id !== exportCompany) throw new Error('القضية خارج نطاق الشركة');
          if (!lawsuit.contract_id) throw new Error('لا يوجد عقد مرتبط؛ لم تُولد مذكرة أو كشف مطالبات');
          const storedDocuments = await collectLegalPages(async (offset, size) => {
            const result = await supabase.from('contract_documents').select('id,company_id,contract_id,document_name,document_type,file_path', { count: 'exact' })
              .eq('company_id', exportCompany).eq('contract_id', lawsuit.contract_id!).order('id').range(offset, offset + size - 1);
            if (result.error) throw result.error;
            if (result.data?.some(document => document.company_id !== exportCompany || document.contract_id !== lawsuit.contract_id)) throw new Error('مستند خارج نطاق العقد والشركة');
            return { data: result.data || [], count: result.count };
          });
          documents.push(...recordedPackageDocuments(storedDocuments.map(document => ({ id: document.id, title: document.document_name, type: document.document_type, hasReference: Boolean(document.file_path) }))));
          if (!storedDocuments.some(document => document.document_type === 'signed_contract' || document.document_type === 'contract')) documents.push({ title: 'صورة العقد الموقع', status: 'missing', included: false, originalIncluded: false });
          const legalState = await loadCanonicalLawsuitState(exportCompany, lawsuit.contract_id);
          documents.push(await generatePackageDocument('المذكرة الشارحة', '1-المذكرة-الشارحة.html', async () => embedImagesInHtml(generateLegalComplaintHTML(getMemoDocumentDataForGeneration(legalState)), images), (name, html) => { folder.file(name, html); }));
          documents.push(await generatePackageDocument('كشف المطالبات المالية', '2-كشف-المطالبات-المالية.html', async () => embedImagesInHtml(generateClaimsStatementHtml(buildClaimsStatementData(legalState)), images), (name, html) => { folder.file(name, html); }));
        } catch (error) {
          documents.push({ title: 'تحميل بيانات القضية والمستندات', status: 'failed', included: false, originalIncluded: false, error: error instanceof Error ? error.message : 'فشل تحميل البيانات أو التوليد' });
        }
        folder.file('3-فهرس-حالة-المستندات.html', renderLawsuitPackageManifest(lawsuit.case_title, documents));
        folder.file('manifest.json', JSON.stringify({ templateId: lawsuit.id, companyId: exportCompany, originalsIncluded: false, documents }, null, 2));
        results.push({ templateId: lawsuit.id, title: lawsuit.case_title, documents });
      }
      const failed = results.flatMap(result => result.documents).filter(document => document.status === 'failed').length;
      const generated = results.flatMap(result => result.documents).filter(document => document.status === 'included_generated').length;
      zip.file('export-results.json', JSON.stringify({ companyId: exportCompany, exportedAt: new Date().toISOString(), scope: 'مواد مولدة وفهرس معلومات؛ الأصول غير مضمنة ولا توجد إفادة باكتمال الحافظة', generated, failed, results }, null, 2));
      zip.file('اقرأني.html', renderLawsuitPackageManifest('نتائج توليد جميع الملفات', results.flatMap(result => result.documents.map(document => ({ ...document, title: `${result.templateId} - ${document.title}` })))));
      const content = await zip.generateAsync({ type: 'blob' });
      if (currentCompanyRef.current !== exportCompany) throw new Error('تغيرت الشركة أثناء التصدير؛ أعد المحاولة');
      saveAs(content, `مواد-مولدة-وفهرس-تقاضي-${format(new Date(), 'yyyy-MM-dd_HH-mm')}.zip`);
      const description = `${results.length} ملف قضية، ${generated} مستند مولد، ${failed} فشل موضح بالفهرس؛ الأصول غير مضمنة`;
      if (failed) toast.warning('تم تصدير حزمة جزئية مع بيان حالات الفشل', { description });
      else toast.success('تم تصدير المواد المولدة وفهرس المستندات', { description });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل التصدير؛ لم تُنشأ حزمة');
    } finally { setIsGeneratingDocs(false); }
  };

  // تصدير البيانات إلى Excel
  const handleExportToExcel = async () => {
    if (!companyId || lawsuitsError || !filteredLawsuits || filteredLawsuits.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    try {
      // استيراد المكتبة ديناميكياً
      const XLSX = await import('xlsx');

      // تحضير البيانات للتصدير
      // تصدير متوافق مع multi_customer_sample.xlsx (24 عمود بالضبط)
      const exportData = filteredLawsuits.map((lawsuit, index) => ({
        'رقم_العقد': lawsuit.contract_number || '-',
        'اسم_العميل': `${lawsuit.defendant_first_name || ''} ${lawsuit.defendant_last_name || ''}`.trim(),
        'رقم_الهوية': lawsuit.defendant_id_number || '-',
        'رقم_الجوال': lawsuit.defendant_phone || '-',
        'الجنسية': lawsuit.defendant_nationality || '-',
        'تاريخ_العقد': lawsuit.contract_start_date ? format(new Date(lawsuit.contract_start_date), 'dd/MM/yyyy') : '-',
        'تاريخ_نهاية_العقد': lawsuit.contract_end_date ? format(new Date(lawsuit.contract_end_date), 'dd/MM/yyyy') : '-',
        'مبلغ_الايجار_الشهري': lawsuit.monthly_rent || 0,
        'اجمالي_مبلغ_العقد': lawsuit.total_contract_amount || 0,
        'رقم_اللوحة': lawsuit.vehicle_plate_number || '-',
        'نوع_المركبة': lawsuit.vehicle_type || '-',
        'موديل_المركبة': lawsuit.vehicle_model || '-',
        'سنة_الصنع': lawsuit.vehicle_year || '-',
        'الايام_المتأخرة': lawsuit.days_overdue || 0,
        'عدد_الاشهر_المتأخرة': lawsuit.months_unpaid || 0,
        'مبلغ_الايجار_المتأخر': lawsuit.overdue_amount || 0,
        'غرامات_التأخير': lawsuit.late_penalty || 0,
        'مبلغ_التعويض': lawsuit.compensation_amount || 0,
        'مبلغ_المخالفات': lawsuit.violations_amount || 0,
        'عدد_المخالفات': lawsuit.violations_count || 0,
        'المبلغ_الاجمالي': parseLegalClaimAmount(lawsuit.claim_amount),
        'المبلغ_بالكلام': lawsuit.claim_amount_words || '-',
        'الوقائع': lawsuit.facts || '-',
        'الطلبات': lawsuit.requests || '-',
      }));

      // إنشاء workbook و worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'بيانات التقاضي');

      // تعيين عرض الأعمدة (متوافق 100% مع multi_customer_sample.xlsx)
      const colWidths = [
        { wch: 20 }, // رقم_العقد
        { wch: 25 }, // اسم_العميل
        { wch: 15 }, // رقم_الهوية
        { wch: 12 }, // رقم_الجوال
        { wch: 15 }, // الجنسية
        { wch: 15 }, // تاريخ_العقد
        { wch: 15 }, // تاريخ_نهاية_العقد
        { wch: 18 }, // مبلغ_الايجار_الشهري
        { wch: 18 }, // اجمالي_مبلغ_العقد
        { wch: 12 }, // رقم_اللوحة
        { wch: 15 }, // نوع_المركبة
        { wch: 15 }, // موديل_المركبة
        { wch: 12 }, // سنة_الصنع
        { wch: 15 }, // الايام_المتأخرة
        { wch: 18 }, // عدد_الاشهر_المتأخرة
        { wch: 20 }, // مبلغ_الايجار_المتأخر
        { wch: 18 }, // غرامات_التأخير
        { wch: 18 }, // مبلغ_التعويض
        { wch: 18 }, // مبلغ_المخالفات
        { wch: 15 }, // عدد_المخالفات
        { wch: 18 }, // المبلغ_الاجمالي
        { wch: 50 }, // المبلغ_بالكلام
        { wch: 50 }, // الوقائع
        { wch: 50 }, // الطلبات
      ];
      ws['!cols'] = colWidths;

      // تحميل الملف
      const fileName = `بيانات_التقاضي_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('تم تصدير البيانات بنجاح');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات');
    }
  };

  if (isLoading) {
    return (
      <div className="legal-system flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="legal-system min-h-screen p-4 md:p-6" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
      <LegalPageHeader title="بيانات التقاضي" description="تابع بيانات الدعاوى المنشأة، وراجع ملفاتها والمستندات المرتبطة بها." actions={<><Button variant="ghost" onClick={() => navigate('/legal/delinquency')}><ArrowLeft className="h-4 w-4 ml-2" />تجهيز الدعاوى</Button><Button onClick={handleGenerateAllDocuments} disabled={isGeneratingDocs || isLoading || !!lawsuitsError}><FolderDown className="h-4 w-4 ml-2" />{isGeneratingDocs ? 'جارٍ التوليد…' : 'مواد مولدة وفهرس المستندات'}</Button><Button variant="outline" onClick={handleExportToExcel} disabled={isLoading || !!lawsuitsError}><FileSpreadsheet className="h-4 w-4 ml-2" />تصدير الجدول</Button><Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 ml-2" />تحديث</Button></>} />

      <p className="text-sm text-muted-foreground">قيمة المطالبة والتعويض المطلوب لا تمثل مبلغ حكم نهائي أو دفعة فعلية. حزمة التوليد تتضمن فهرسًا صريحًا؛ الملفات الأصلية المخزنة لا تُضم إليها.</p>
      {lawsuitsError && <Card role="alert" className="p-4 text-destructive">فشل تحميل بيانات التقاضي كاملة. أعد المحاولة قبل التصدير.</Card>}
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="legal-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي القضايا</p>
              <p className="text-3xl font-bold text-teal-700 mt-1">
                {lawsuits?.length || 0}
              </p>
            </div>
            <FileText className="h-12 w-12 text-teal-600 opacity-20" />
          </div>
        </Card>

        <Card className="legal-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المطالبات</p>
              <p className="text-3xl font-bold text-blue-700 mt-1" dir="ltr">
                {lawsuits
                  ?.reduce((sum, l) => sum + Number(l.claim_amount), 0)
                  .toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || '0.00'}{' '}
                <span className="text-sm">ر.ق</span>
              </p>
            </div>
            <Download className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="legal-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الفواتير المتأخرة</p>
              <p className="text-3xl font-bold text-amber-700 mt-1">
                {lawsuits?.reduce((sum, l) => sum + (l.invoices_count || 0), 0) || 0}
              </p>
            </div>
            <FileSpreadsheet className="h-12 w-12 text-amber-600 opacity-20" />
          </div>
        </Card>

        <Card className="legal-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المخالفات</p>
              <p className="text-3xl font-bold text-red-700 mt-1">
                {lawsuits?.reduce((sum, l) => sum + (l.violations_count || 0), 0) || 0}
              </p>
            </div>
            <AlertCircle className="h-12 w-12 text-red-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Additional Stats - Financial Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="legal-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الإيجار المتأخر</p>
              <p className="text-xl font-bold text-blue-700 mt-1" dir="ltr">
                {lawsuits
                  ?.reduce((sum, l) => sum + (l.overdue_amount || 0), 0)
                  .toLocaleString() || '0'}{' '}
                <span className="text-xs">ر.ق</span>
              </p>
            </div>
          </div>
        </Card>

        <Card className="legal-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الغرامات</p>
              <p className="text-xl font-bold text-amber-700 mt-1" dir="ltr">
                {lawsuits
                  ?.reduce((sum, l) => sum + (l.late_penalty || 0) + (l.total_penalties || 0), 0)
                  .toLocaleString() || '0'}{' '}
                <span className="text-xs">ر.ق</span>
              </p>
            </div>
          </div>
        </Card>

        <Card className="legal-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">إجمالي قيمة المخالفات</p>
              <p className="text-xl font-bold text-red-700 mt-1" dir="ltr">
                {lawsuits
                  ?.reduce((sum, l) => sum + (l.violations_amount || 0), 0)
                  .toLocaleString() || '0'}{' '}
                <span className="text-xs">ر.ق</span>
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="legal-panel p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث بالاسم، رقم الهوية، أو عنوان الدعوى..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <ResponsiveTable>
<Table>
            <TableHeader>
              <TableRow className="bg-teal-50">
                <TableHead className="text-right font-bold">رقم العقد</TableHead>
                <TableHead className="text-right font-bold">اسم العميل</TableHead>
                <TableHead className="text-right font-bold">رقم الهوية</TableHead>
                <TableHead className="text-right font-bold">رقم الجوال</TableHead>
                <TableHead className="text-right font-bold">الجنسية</TableHead>
                <TableHead className="text-right font-bold">تاريخ العقد</TableHead>
                <TableHead className="text-right font-bold">تاريخ نهاية العقد</TableHead>
                <TableHead className="text-right font-bold">مبلغ الإيجار الشهري</TableHead>
                <TableHead className="text-right font-bold">إجمالي مبلغ العقد</TableHead>
                <TableHead className="text-right font-bold">رقم اللوحة</TableHead>
                <TableHead className="text-right font-bold">نوع المركبة</TableHead>
                <TableHead className="text-right font-bold">موديل المركبة</TableHead>
                <TableHead className="text-right font-bold">سنة الصنع</TableHead>
                <TableHead className="text-right font-bold bg-blue-50">الأيام المتأخرة</TableHead>
                <TableHead className="text-right font-bold bg-blue-50">عدد الأشهر المتأخرة</TableHead>
                <TableHead className="text-right font-bold bg-blue-50">مبلغ الإيجار المتأخر</TableHead>
                <TableHead className="text-right font-bold bg-blue-50">تعويض اتفاقي موثق</TableHead>
                <TableHead className="text-right font-bold bg-amber-50">أضرار موثقة</TableHead>
                <TableHead className="text-right font-bold bg-red-50">مبلغ المخالفات</TableHead>
                <TableHead className="text-right font-bold bg-red-50">عدد المخالفات</TableHead>
                <TableHead className="text-right font-bold">المبلغ الإجمالي</TableHead>
                <TableHead className="text-right font-bold">المبلغ بالكلام</TableHead>
                <TableHead className="text-right font-bold">الوقائع</TableHead>
                <TableHead className="text-right font-bold">الطلبات</TableHead>
                <TableHead className="text-right font-bold">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLawsuits && filteredLawsuits.length > 0 ? (
                filteredLawsuits.map((lawsuit, index) => (
                  <TableRow key={lawsuit.id} className="hover:bg-teal-50/50">
                    {/* رقم العقد */}
                    <TableCell className="font-medium">{lawsuit.contract_number || '-'}</TableCell>
                    {/* اسم العميل */}
                    <TableCell className="max-w-md">
                      <div className="flex items-center gap-2">
                        <div className="truncate">
                          {`${lawsuit.defendant_first_name || ''} ${lawsuit.defendant_last_name || ''}`.trim()}
                        </div>
                        {lawsuit.auto_created && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs whitespace-nowrap">
                            🤖 تلقائي
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {/* رقم الهوية */}
                    <TableCell><Badge variant="outline">{lawsuit.defendant_id_number}</Badge></TableCell>
                    {/* رقم الجوال */}
                    <TableCell>{lawsuit.defendant_phone || '-'}</TableCell>
                    {/* الجنسية */}
                    <TableCell><Badge variant="secondary">{lawsuit.defendant_nationality || '-'}</Badge></TableCell>
                    {/* تاريخ العقد */}
                    <TableCell>{lawsuit.contract_start_date ? format(new Date(lawsuit.contract_start_date), 'dd/MM/yyyy') : '-'}</TableCell>
                    {/* تاريخ نهاية العقد */}
                    <TableCell>{lawsuit.contract_end_date ? format(new Date(lawsuit.contract_end_date), 'dd/MM/yyyy') : '-'}</TableCell>
                    {/* مبلغ الإيجار الشهري */}
                    <TableCell>{lawsuit.monthly_rent ? lawsuit.monthly_rent.toLocaleString() : '0'}</TableCell>
                    {/* إجمالي مبلغ العقد */}
                    <TableCell>{lawsuit.total_contract_amount ? lawsuit.total_contract_amount.toLocaleString() : '0'}</TableCell>
                    {/* رقم اللوحة */}
                    <TableCell><Badge variant="outline">{lawsuit.vehicle_plate_number || '-'}</Badge></TableCell>
                    {/* نوع المركبة */}
                    <TableCell>{lawsuit.vehicle_type || '-'}</TableCell>
                    {/* موديل المركبة */}
                    <TableCell>{lawsuit.vehicle_model || '-'}</TableCell>
                    {/* سنة الصنع */}
                    <TableCell>{lawsuit.vehicle_year || '-'}</TableCell>
                    {/* الأيام المتأخرة */}
                    <TableCell className="bg-blue-50/30">
                      <Badge variant="outline" className="bg-blue-100">{lawsuit.days_overdue || 0}</Badge>
                    </TableCell>
                    {/* عدد الأشهر المتأخرة */}
                    <TableCell className="bg-blue-50/30">
                      <Badge variant="outline" className="bg-blue-100">{lawsuit.months_unpaid || 0}</Badge>
                    </TableCell>
                    {/* مبلغ الإيجار المتأخر */}
                    <TableCell className="bg-blue-50/30 font-semibold text-blue-700">
                      {lawsuit.overdue_amount ? Number(lawsuit.overdue_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'}
                    </TableCell>
                    {/* التعويض الاتفاقي الموثق */}
                    <TableCell className="bg-blue-50/30 font-semibold text-blue-700">
                      {lawsuit.late_penalty ? Number(lawsuit.late_penalty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'}
                    </TableCell>
                    {/* مبلغ التعويض */}
                    <TableCell className="bg-amber-50/30 font-semibold text-amber-700">
                      {lawsuit.compensation_amount ? Number(lawsuit.compensation_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'}
                    </TableCell>
                    {/* مبلغ المخالفات */}
                    <TableCell className="bg-red-50/30 font-semibold text-red-700">
                      {lawsuit.violations_amount ? Number(lawsuit.violations_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'}
                    </TableCell>
                    {/* عدد المخالفات */}
                    <TableCell className="bg-red-50/30">
                      <Badge variant="outline" className="bg-red-100">{lawsuit.violations_count || 0}</Badge>
                    </TableCell>
                    {/* المبلغ الإجمالي */}
                    <TableCell className="font-bold text-teal-700">
                      {Number(lawsuit.claim_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    {/* المبلغ بالكلام */}
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={decodeDisplayText(lawsuit.claim_amount_words) || ''}>
                        {decodeDisplayText(lawsuit.claim_amount_words) || '-'}
                      </div>
                    </TableCell>
                    {/* الوقائع */}
                    <TableCell className="max-w-md">
                      <div className="truncate" title={decodeDisplayText(lawsuit.facts) || ''}>{decodeDisplayText(lawsuit.facts) || '-'}</div>
                    </TableCell>
                    {/* الطلبات */}
                    <TableCell className="max-w-md">
                      <div className="truncate" title={decodeDisplayText(lawsuit.requests) || ''}>{decodeDisplayText(lawsuit.requests) || '-'}</div>
                    </TableCell>
                    {/* الإجراءات */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigate(`/legal/lawsuits/${lawsuit.id}`);
                          }}
                         aria-label="عرض التفاصيل" title="عرض التفاصيل">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(lawsuit.id)}
                         aria-label="حذف السجل" title="حذف السجل">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={25} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="h-12 w-12 opacity-20" />
                      <p className="text-lg font-medium">لا توجد بيانات</p>
                      <p className="text-sm">
                        {searchTerm
                          ? 'لم يتم العثور على نتائج للبحث'
                          : 'لم يتم إنشاء أي قضايا بعد'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
</ResponsiveTable>
        </div>
      </Card>
      <Dialog
        open={Boolean(selectedLawsuit)}
        onOpenChange={(open) => !open && navigate('/legal/lawsuit-data', { replace: true })}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{decodeDisplayText(selectedLawsuit?.case_title)}</DialogTitle>
            <DialogDescription>
              بيانات المطالبة والمدعى عليه والعقد المرتبط
            </DialogDescription>
          </DialogHeader>
          {selectedLawsuit && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">المدعى عليه</p>
                <p className="mt-1 font-semibold">
                  {selectedLawsuit.defendant_first_name} {selectedLawsuit.defendant_middle_name} {selectedLawsuit.defendant_last_name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedLawsuit.defendant_id_number}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">قيمة المطالبة</p>
                <p className="mt-1 text-lg font-bold text-teal-700">
                  {Number(selectedLawsuit.claim_amount || 0).toLocaleString('ar-QA')} ر.ق
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{decodeDisplayText(selectedLawsuit.claim_amount_words) || '-'}</p>
              </div>
              <div className="rounded-lg border p-3 sm:col-span-2">
                <p className="text-xs text-muted-foreground">الوقائع</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{decodeDisplayText(selectedLawsuit.facts) || '-'}</p>
              </div>
              <div className="rounded-lg border p-3 sm:col-span-2">
                <p className="text-xs text-muted-foreground">الطلبات</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{decodeDisplayText(selectedLawsuit.requests) || '-'}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">العقد</p>
                <p className="mt-1 font-semibold" dir="ltr">{selectedLawsuit.contract_number || '-'}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">المركبة</p>
                <p className="mt-1 font-semibold" dir="ltr">{selectedLawsuit.vehicle_plate_number || '-'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
