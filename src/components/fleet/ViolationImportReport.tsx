import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ViolationImportReportProps {
  violations: Array<{
    id: string;
    violationNumber: string;
    date: string;
    plateNumber: string;
    location: string;
    violationType: string;
    fineAmount: number;
    status: 'extracted' | 'matched' | 'error';
    errors: string[];
  }>;
  onExport: (format: 'pdf' | 'excel' | 'csv') => void;
}

export const ViolationImportReport: React.FC<ViolationImportReportProps> = ({ 
  violations, 
  onExport 
}) => {
  const stats = {
    total: violations.length,
    successful: violations.filter(v => v.status === 'matched').length,
    failed: violations.filter(v => v.status === 'error').length,
    totalAmount: violations.reduce((sum, v) => sum + v.fineAmount, 0)
  };

  const generateTextReport = () => {
    const reportLines = [
      '='.repeat(60),
      'تقرير استيراد المخالفات المرورية',
      '='.repeat(60),
      '',
      `تاريخ التقرير: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}`,
      '',
      '📊 ملخص النتائج:',
      '-'.repeat(30),
      `إجمالي المخالفات المستخرجة: ${stats.total}`,
      `المخالفات المطابقة للمركبات: ${stats.successful}`,
      `المخالفات غير المطابقة: ${stats.failed}`,
      `معدل النجاح: ${stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%`,
      `إجمالي مبلغ الغرامات: ${stats.totalAmount.toFixed(2)} د.ك`,
      '',
      '📋 تفاصيل المخالفات:',
      '-'.repeat(30)
    ];

    violations.forEach((violation, index) => {
      reportLines.push(`${index + 1}. رقم المخالفة: ${violation.violationNumber}`);
      reportLines.push(`   التاريخ: ${format(new Date(violation.date), 'dd/MM/yyyy', { locale: ar })}`);
      reportLines.push(`   رقم اللوحة: ${violation.plateNumber}`);
      reportLines.push(`   الموقع: ${violation.location}`);
      reportLines.push(`   نوع المخالفة: ${violation.violationType}`);
      reportLines.push(`   مبلغ الغرامة: ${violation.fineAmount.toFixed(2)} د.ك`);
      reportLines.push(`   الحالة: ${violation.status === 'matched' ? 'مطابقة' : violation.status === 'error' ? 'خطأ' : 'مستخرجة'}`);
      
      if (violation.errors.length > 0) {
        reportLines.push(`   الأخطاء: ${violation.errors.join(', ')}`);
      }
      
      reportLines.push('');
    });

    reportLines.push('='.repeat(60));
    reportLines.push('انتهى التقرير');
    reportLines.push('='.repeat(60));

    return reportLines.join('\n');
  };

  const downloadTextReport = () => {
    const reportContent = generateTextReport();
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_استيراد_المخالفات_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateCSVReport = () => {
    const headers = [
      'رقم المخالفة',
      'التاريخ',
      'رقم اللوحة',
      'الموقع',
      'نوع المخالفة',
      'مبلغ الغرامة',
      'الحالة',
      'الأخطاء'
    ];

    const csvContent = [
      headers.join(','),
      ...violations.map(violation => [
        violation.violationNumber,
        violation.date,
        violation.plateNumber,
        violation.location,
        violation.violationType,
        violation.fineAmount.toFixed(2),
        violation.status === 'matched' ? 'مطابقة' : violation.status === 'error' ? 'خطأ' : 'مستخرجة',
        violation.errors.join('; ')
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    return csvContent;
  };

  const downloadCSVReport = () => {
    const csvContent = generateCSVReport();
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_استيراد_المخالفات_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          تقرير الاستيراد
        </CardTitle>
        <CardDescription>
          ملخص نتائج استيراد المخالفات المرورية وتصدير التقارير
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* ملخص النتائج */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-sm text-blue-800">إجمالي المخالفات</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
            <p className="text-sm text-green-800">مطابقة</p>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-sm text-red-800">أخطاء</p>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <p className="text-2xl font-bold text-orange-600">{stats.totalAmount.toFixed(2)}</p>
            <p className="text-sm text-orange-800">إجمالي الغرامات (د.ك)</p>
          </div>
        </div>

        {/* معدل النجاح */}
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">معدل نجاح الاستيراد</h3>
          <div className="flex items-center justify-center gap-4">
            <Badge 
              variant={stats.total > 0 && (stats.successful / stats.total) >= 0.8 ? 'default' : 'destructive'}
              className="text-lg px-4 py-2"
            >
              {stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%
            </Badge>
            <span className="text-sm text-slate-600">
              {stats.successful} من {stats.total} مخالفة تم استيرادها بنجاح
            </span>
          </div>
        </div>

        {/* أزرار التصدير */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">تصدير التقرير</h3>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={downloadTextReport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تحميل تقرير نصي (.txt)
            </Button>
            
            <Button
              onClick={downloadCSVReport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تحميل ملف CSV (.csv)
            </Button>
            
            <Button
              onClick={() => onExport('excel')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير إلى Excel (.xlsx)
            </Button>
            
            <Button
              onClick={() => onExport('pdf')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير إلى PDF (.pdf)
            </Button>
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">ملاحظات:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>تم إنشاء هذا التقرير في {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}</li>
            <li>المخالفات المطابقة جاهزة للحفظ في النظام</li>
            <li>المخالفات غير المطابقة تحتاج إلى مراجعة يدوية</li>
            <li>يمكن تصدير التقرير بعدة صيغ للمراجعة والأرشفة</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
