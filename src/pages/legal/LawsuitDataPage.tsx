/**
 * صفحة بيانات التقاضي - عرض وإدارة بيانات القضايا
 * @component LawsuitDataPage
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateLegalComplaintHTML } from '@/utils/legal-document-generator';
import {
  generateDocumentsListHtml,
  generateClaimsStatementHtml,
} from '@/utils/official-letter-generator';

interface LawsuitTemplate {
  id: number;
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
}

export default function LawsuitDataPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);

  // جلب بيانات القضايا
  const { data: lawsuits, isLoading, refetch } = useQuery({
    queryKey: ['lawsuit_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lawsuit_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LawsuitTemplate[];
    },
  });

  // تصفية البيانات حسب البحث
  const filteredLawsuits = React.useMemo(() => {
    if (!lawsuits) return [];
    if (!searchTerm) return lawsuits;

    const term = searchTerm.toLowerCase();
    return lawsuits.filter(
      (lawsuit) =>
        lawsuit.case_title.toLowerCase().includes(term) ||
        lawsuit.defendant_first_name.toLowerCase().includes(term) ||
        lawsuit.defendant_last_name.toLowerCase().includes(term) ||
        lawsuit.defendant_id_number.toLowerCase().includes(term)
    );
  }, [lawsuits, searchTerm]);

  // حذف قضية
  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه القضية؟')) return;

    const { error } = await supabase
      .from('lawsuit_templates')
      .delete()
      .eq('id', id);

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

  // توليد المستندات القانونية لجميع القضايا
  const handleGenerateAllDocuments = async () => {
    if (!filteredLawsuits || filteredLawsuits.length === 0) {
      toast.error('لا توجد قضايا لتوليد المستندات');
      return;
    }

    setIsGeneratingDocs(true);
    
    try {
      const zip = new JSZip();
      let successCount = 0;
      let errorCount = 0;
      
      // تحميل جميع الصور مرة واحدة
      const [logoBase64, signatureBase64, stampBase64] = await Promise.all([
        loadImageAsBase64('/receipts/logo.png'),
        loadImageAsBase64('/receipts/signature.png'),
        loadImageAsBase64('/receipts/stamp.png'),
      ]);
      
      const images = { logo: logoBase64, signature: signatureBase64, stamp: stampBase64 };

      // توليد المستندات لكل عميل
      for (const lawsuit of filteredLawsuits) {
        try {
          const customerName = `${lawsuit.defendant_first_name || ''} ${lawsuit.defendant_last_name || ''}`.trim();
          const folderName = `${customerName} - ${lawsuit.contract_number}`;
          const customerFolder = zip.folder(folderName);

          if (!customerFolder) continue;

          // جلب بيانات العقد والمركبة
          const { data: contract } = await supabase
            .from('contracts')
            .select('*, vehicle:vehicles(*)')
            .eq('id', lawsuit.contract_id)
            .single();

          if (!contract) continue;

          // 1. المذكرة الشارحة
          try {
            let memoHtml = generateLegalComplaintHTML({
              customer: {
                customer_name: customerName,
                customer_code: lawsuit.defendant_id_number || '',
                id_number: lawsuit.defendant_id_number || '',
                phone: lawsuit.defendant_phone || '',
                email: lawsuit.defendant_email || '',
                contract_number: lawsuit.contract_number || '',
                contract_start_date: lawsuit.contract_start_date || '',
                vehicle_plate: lawsuit.vehicle_plate_number || '',
                monthly_rent: Number(lawsuit.monthly_rent) || 0,
                months_unpaid: lawsuit.months_unpaid || 0,
                overdue_amount: lawsuit.overdue_amount || 0,
                late_penalty: lawsuit.late_penalty || 0,
                days_overdue: lawsuit.days_overdue || 0,
                violations_count: lawsuit.violations_count || 0,
                violations_amount: lawsuit.violations_amount || 0,
                total_debt: lawsuit.claim_amount || 0,
              },
              companyInfo: {
                name_ar: 'شركة العراف لتأجير السيارات',
                name_en: 'Al-Araf Car Rental',
                address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
                cr_number: '146832',
              },
              vehicleInfo: {
                plate: lawsuit.vehicle_plate_number || '',
                make: lawsuit.vehicle_type || '',
                model: lawsuit.vehicle_model || '',
                year: lawsuit.vehicle_year || 0,
              },
              contractInfo: {
                contract_number: lawsuit.contract_number || '',
                start_date: lawsuit.contract_start_date || '',
                monthly_rent: Number(lawsuit.monthly_rent) || 0,
              },
              damages: Math.round((lawsuit.claim_amount || 0) * 0.3),
            });
            // تضمين اللوقو والتوقيع والختم في HTML
            memoHtml = await embedImagesInHtml(memoHtml, images);
            customerFolder.file('1. المذكرة الشارحة.html', memoHtml);
          } catch (error) {
            console.error('Error generating memo:', error);
          }

          // 2. كشف المطالبات المالية
          try {
            let claimsHtml = generateClaimsStatementHtml({
              customerName,
              nationalId: lawsuit.defendant_id_number || '',
              phone: lawsuit.defendant_phone || '',
              contractNumber: lawsuit.contract_number || '',
              contractStartDate: lawsuit.contract_start_date || '',
              contractEndDate: lawsuit.contract_end_date || '',
              invoices: [],
              violations: [],
              totalOverdue: lawsuit.claim_amount || 0,
              amountInWords: lawsuit.claim_amount_words || '',
              caseTitle: lawsuit.case_title,
            });
            // تضمين اللوقو والتوقيع والختم في HTML
            claimsHtml = await embedImagesInHtml(claimsHtml, images);
            customerFolder.file('2. كشف المطالبات المالية.html', claimsHtml);
          } catch (error) {
            console.error('Error generating claims:', error);
          }

          // 3. كشف المستندات المرفوعة
          try {
            let docsListHtml = generateDocumentsListHtml({
              caseTitle: lawsuit.case_title,
              customerName,
              amount: lawsuit.claim_amount || 0,
              documents: [
                { name: 'المذكرة الشارحة', status: 'مرفق' },
                { name: 'كشف المطالبات المالية', status: 'مرفق' },
                { name: 'صورة من العقد', status: 'مرفق' },
                { name: 'السجل التجاري', status: 'مرفق' },
                { name: 'قيد المنشأة', status: 'مرفق' },
              ],
            });
            // تضمين اللوقو والتوقيع والختم في HTML
            docsListHtml = await embedImagesInHtml(docsListHtml, images);
            customerFolder.file('3. كشف المستندات المرفوعة.html', docsListHtml);
          } catch (error) {
            console.error('Error generating docs list:', error);
          }

          // 4. كشف المخالفات المرورية (إذا وجدت)
          if (lawsuit.violations_count && lawsuit.violations_count > 0) {
            try {
              let violationsHtml = generateClaimsStatementHtml({
                customerName,
                nationalId: lawsuit.defendant_id_number || '',
                phone: lawsuit.defendant_phone || '',
                contractNumber: lawsuit.contract_number || '',
                contractStartDate: lawsuit.contract_start_date || '',
                contractEndDate: lawsuit.contract_end_date || '',
                invoices: [],
                violations: [],
                totalOverdue: lawsuit.violations_amount || 0,
                amountInWords: '',
                caseTitle: `كشف المخالفات المرورية - ${customerName}`,
              });
              // تضمين اللوقو والتوقيع والختم في HTML
              violationsHtml = await embedImagesInHtml(violationsHtml, images);
              customerFolder.file('4. كشف المخالفات المرورية.html', violationsHtml);
            } catch (error) {
              console.error('Error generating violations:', error);
            }
          }

          successCount++;
        } catch (error) {
          console.error(`Error processing lawsuit for ${lawsuit.defendant_first_name}:`, error);
          errorCount++;
        }
      }

      // توليد ملف ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `مستندات_التقاضي_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.zip`;
      saveAs(content, fileName);

      toast.success(`تم توليد المستندات بنجاح`, {
        description: `${successCount} عميل - ${errorCount} خطأ`,
      });
    } catch (error) {
      console.error('Error generating documents:', error);
      toast.error('حدث خطأ أثناء توليد المستندات');
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  // تصدير البيانات إلى Excel
  const handleExportToExcel = async () => {
    if (!filteredLawsuits || filteredLawsuits.length === 0) {
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
        'المبلغ_الاجمالي': Math.floor(Number(lawsuit.claim_amount)),
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
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/legal/delinquency')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-teal-700">بيانات التقاضي</h1>
            <p className="text-muted-foreground mt-1">
              إدارة وعرض بيانات القضايا المُنشأة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAllDocuments}
            disabled={isGeneratingDocs}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
          >
            {isGeneratingDocs ? (
              <>
                <LoadingSpinner className="h-4 w-4 ml-2" />
                جاري التوليد...
              </>
            ) : (
              <>
                <FolderDown className="h-4 w-4 ml-2" />
                توليد المستندات القانونية
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToExcel}
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
          >
            <FileSpreadsheet className="h-4 w-4 ml-2" />
            تصدير Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-teal-50 to-white border-teal-200">
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

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
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

        <Card className="p-6 bg-gradient-to-br from-amber-50 to-white border-amber-200">
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

        <Card className="p-6 bg-gradient-to-br from-red-50 to-white border-red-200">
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
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-200">
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

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-white border-amber-200">
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

        <Card className="p-4 bg-gradient-to-br from-red-50 to-white border-red-200">
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
      <Card className="p-4">
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
                <TableHead className="text-right font-bold bg-blue-50">غرامات التأخير</TableHead>
                <TableHead className="text-right font-bold bg-amber-50">مبلغ التعويض</TableHead>
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
                      {lawsuit.overdue_amount ? Math.floor(lawsuit.overdue_amount).toLocaleString() : '0'}
                    </TableCell>
                    {/* غرامات التأخير */}
                    <TableCell className="bg-blue-50/30 font-semibold text-blue-700">
                      {lawsuit.late_penalty ? Math.floor(lawsuit.late_penalty).toLocaleString() : '0'}
                    </TableCell>
                    {/* مبلغ التعويض */}
                    <TableCell className="bg-amber-50/30 font-semibold text-amber-700">
                      {lawsuit.compensation_amount ? Math.floor(lawsuit.compensation_amount).toLocaleString() : '0'}
                    </TableCell>
                    {/* مبلغ المخالفات */}
                    <TableCell className="bg-red-50/30 font-semibold text-red-700">
                      {lawsuit.violations_amount ? Math.floor(lawsuit.violations_amount).toLocaleString() : '0'}
                    </TableCell>
                    {/* عدد المخالفات */}
                    <TableCell className="bg-red-50/30">
                      <Badge variant="outline" className="bg-red-100">{lawsuit.violations_count || 0}</Badge>
                    </TableCell>
                    {/* المبلغ الإجمالي */}
                    <TableCell className="font-bold text-teal-700">
                      {Math.floor(Number(lawsuit.claim_amount)).toLocaleString()}
                    </TableCell>
                    {/* المبلغ بالكلام */}
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={lawsuit.claim_amount_words || ''}>
                        {lawsuit.claim_amount_words || '-'}
                      </div>
                    </TableCell>
                    {/* الوقائع */}
                    <TableCell className="max-w-md">
                      <div className="truncate" title={lawsuit.facts || ''}>{lawsuit.facts || '-'}</div>
                    </TableCell>
                    {/* الطلبات */}
                    <TableCell className="max-w-md">
                      <div className="truncate" title={lawsuit.requests || ''}>{lawsuit.requests || '-'}</div>
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
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(lawsuit.id)}
                        >
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
        </div>
      </Card>
    </div>
  );
}
