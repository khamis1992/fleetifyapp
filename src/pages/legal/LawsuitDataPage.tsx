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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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
}

export default function LawsuitDataPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

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
      const exportData = filteredLawsuits.map((lawsuit, index) => ({
        '#': index + 1,
        'عنوان الدعوى': lawsuit.case_title,
        'اسم المدعى عليه الأول': lawsuit.defendant_first_name,
        'اسم المدعى عليه الثاني': lawsuit.defendant_middle_name || '-',
        'اسم المدعى عليه الأخير': lawsuit.defendant_last_name,
        'رقم هوية المدعى عليه': lawsuit.defendant_id_number,
        'جنسية المدعى عليه': lawsuit.defendant_nationality || '-',
        'عنوان المدعى عليه': lawsuit.defendant_address || '-',
        'هاتف المدعى عليه': lawsuit.defendant_phone || '-',
        'بريد المدعى عليه': lawsuit.defendant_email || '-',
        'قيمة المطالبة': Math.floor(Number(lawsuit.claim_amount)),
        'قيمة المطالبة كتابتاً': lawsuit.claim_amount_words || '-',
        'الوقائع': lawsuit.facts || '-',
        'الطلبات': lawsuit.requests || '-',
        'تاريخ الإنشاء': format(new Date(lawsuit.created_at), 'dd/MM/yyyy HH:mm', { locale: ar }),
      }));

      // إنشاء workbook و worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'بيانات التقاضي');

      // تعيين عرض الأعمدة
      const colWidths = [
        { wch: 5 },  // #
        { wch: 40 }, // عنوان الدعوى
        { wch: 20 }, // اسم الأول
        { wch: 20 }, // اسم الثاني
        { wch: 20 }, // اسم الأخير
        { wch: 15 }, // رقم الهوية
        { wch: 15 }, // الجنسية
        { wch: 30 }, // العنوان
        { wch: 15 }, // الهاتف
        { wch: 25 }, // البريد
        { wch: 15 }, // قيمة المطالبة
        { wch: 40 }, // قيمة المطالبة كتابة
        { wch: 50 }, // الوقائع
        { wch: 50 }, // الطلبات
        { wch: 20 }, // تاريخ الإنشاء
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <p className="text-sm text-muted-foreground">آخر تحديث</p>
              <p className="text-lg font-bold text-amber-700 mt-1">
                {lawsuits && lawsuits.length > 0
                  ? format(new Date(lawsuits[0].created_at), 'dd MMM yyyy', {
                      locale: ar,
                    })
                  : 'لا يوجد'}
              </p>
            </div>
            <RefreshCw className="h-12 w-12 text-amber-600 opacity-20" />
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
                <TableHead className="text-right font-bold">#</TableHead>
                <TableHead className="text-right font-bold">عنوان الدعوى</TableHead>
                <TableHead className="text-right font-bold">اسم المدعى عليه الأول</TableHead>
                <TableHead className="text-right font-bold">اسم المدعى عليه الثالث</TableHead>
                <TableHead className="text-right font-bold">اسم المدعى عليه الأخير</TableHead>
                <TableHead className="text-right font-bold">رقم هوية المدعى عليه</TableHead>
                <TableHead className="text-right font-bold">قيمة المطالبة</TableHead>
                <TableHead className="text-right font-bold">قيمة المطالبة كتابتاً</TableHead>
                <TableHead className="text-right font-bold">جنسية المدعى عليه</TableHead>
                <TableHead className="text-right font-bold">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLawsuits && filteredLawsuits.length > 0 ? (
                filteredLawsuits.map((lawsuit, index) => (
                  <TableRow key={lawsuit.id} className="hover:bg-teal-50/50">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={lawsuit.case_title}>
                        {lawsuit.case_title}
                      </div>
                    </TableCell>
                    <TableCell>{lawsuit.defendant_first_name}</TableCell>
                    <TableCell>{lawsuit.defendant_middle_name || '-'}</TableCell>
                    <TableCell>{lawsuit.defendant_last_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lawsuit.defendant_id_number}</Badge>
                    </TableCell>
                    <TableCell className="font-bold text-teal-700">
                      {Math.floor(Number(lawsuit.claim_amount))}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={lawsuit.claim_amount_words || ''}>
                        {lawsuit.claim_amount_words || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{lawsuit.defendant_nationality || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // TODO: فتح dialog لعرض التفاصيل
                            toast.info('سيتم فتح تفاصيل القضية قريباً');
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
                  <TableCell colSpan={10} className="text-center py-12">
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
