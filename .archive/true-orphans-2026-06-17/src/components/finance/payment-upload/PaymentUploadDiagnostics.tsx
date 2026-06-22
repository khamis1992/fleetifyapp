/**
 * مكون تشخيص رفع المدفوعات
 * يساعد في تحديد سبب فشل رفع الملفات
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info,
  FileText
} from 'lucide-react';

interface DiagnosticItem {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  suggestion?: string;
}

interface PaymentUploadDiagnosticsProps {
  data?: any[];
  errors?: Array<{ row: number; message: string }>;
  onRetry?: () => void;
}

export function PaymentUploadDiagnostics({ 
  data = [], 
  errors = [],
  onRetry 
}: PaymentUploadDiagnosticsProps) {
  const [showDetails, setShowDetails] = useState(false);

  // تحليل البيانات والأخطاء
  const diagnostics: DiagnosticItem[] = [];

  // فحص هيكل البيانات
  if (data.length === 0) {
    diagnostics.push({
      type: 'error',
      title: 'ملف فارغ',
      message: 'الملف المرفوع لا يحتوي على أي بيانات',
      suggestion: 'تأكد من أن الملف يحتوي على بيانات صحيحة'
    });
  } else {
    const sampleRow = data[0];
    const columns = Object.keys(sampleRow);
    
    // فحص الحقول المطلوبة
    const requiredFields = ['payment_date', 'amount'];
    const missingFields = requiredFields.filter(field => 
      !columns.some(col => col.toLowerCase().includes(field.replace('_', '')))
    );
    
    if (missingFields.length > 0) {
      diagnostics.push({
        type: 'error',
        title: 'حقول مطلوبة مفقودة',
        message: `الحقول التالية مطلوبة ولكنها غير موجودة: ${missingFields.join(', ')}`,
        suggestion: 'تأكد من وجود أعمدة تاريخ الدفع ومبلغ الدفع في الملف'
      });
    } else {
      diagnostics.push({
        type: 'success',
        title: 'هيكل البيانات صحيح',
        message: `تم العثور على ${columns.length} عمود في الملف`
      });
    }

    // فحص جودة البيانات
    const emptyRows = data.filter(row => 
      !row.payment_date || !row.amount || 
      String(row.payment_date).trim() === '' || 
      (typeof row.amount === 'string' && row.amount.trim() === '')
    ).length;

    if (emptyRows > 0) {
      diagnostics.push({
        type: 'warning',
        title: 'صفوف فارغة',
        message: `تم العثور على ${emptyRows} صف يحتوي على بيانات فارغة`,
        suggestion: 'تنظيف البيانات الفارغة سيحسن من معدل النجاح'
      });
    }

    // فحص طرق الدفع
    const invalidMethods = data.filter(row => {
      const method = row.payment_method || row.payment_type || row.method;
      return method && !['cash', 'check', 'bank_transfer', 'credit_card', 'debit_card'].includes(method.toLowerCase());
    }).length;

    if (invalidMethods > 0) {
      diagnostics.push({
        type: 'warning',
        title: 'طرق دفع غير معروفة',
        message: `${invalidMethods} صف يحتوي على طريقة دفع غير معروفة`,
        suggestion: 'سيتم تحويل طرق الدفع غير المعروفة إلى "نقدي" تلقائياً'
      });
    }
  }

  // تحليل الأخطاء
  if (errors.length > 0) {
    const errorTypes = errors.reduce((acc, error) => {
      const type = error.message.includes('payment_method') ? 'payment_method' :
                   error.message.includes('amount') ? 'amount' :
                   error.message.includes('date') ? 'date' : 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(errorTypes).forEach(([type, count]) => {
      let title = '';
      let suggestion = '';
      
      switch (type) {
        case 'payment_method':
          title = 'مشكلة في طرق الدفع';
          suggestion = 'تأكد من استخدام طرق دفع صحيحة: نقد، شيك، حوالة بنكية، بطاقة ائتمان، بطاقة خصم';
          break;
        case 'amount':
          title = 'مشكلة في المبالغ';
          suggestion = 'تأكد من أن جميع المبالغ أرقام صحيحة وأكبر من صفر';
          break;
        case 'date':
          title = 'مشكلة في التواريخ';
          suggestion = 'تأكد من تنسيق التواريخ (YYYY-MM-DD أو DD/MM/YYYY)';
          break;
        default:
          title = 'أخطاء متنوعة';
          suggestion = 'راجع تفاصيل الأخطاء أدناه';
      }

      diagnostics.push({
        type: 'error',
        title,
        message: `${count} خطأ من هذا النوع`,
        suggestion
      });
    });
  }

  const getIcon = (type: DiagnosticItem['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'info': return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getBadgeVariant = (type: DiagnosticItem['type']) => {
    switch (type) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      case 'info': return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          تشخيص مشكلة رفع المدفوعات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ملخص سريع */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{data.length}</div>
            <div className="text-sm text-blue-600">إجمالي الصفوف</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{errors.length}</div>
            <div className="text-sm text-red-600">الأخطاء</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{data.length - errors.length}</div>
            <div className="text-sm text-green-600">الصحيح</div>
          </div>
        </div>

        {/* التشخيصات */}
        <div className="space-y-3">
          {diagnostics.map((diagnostic, index) => (
            <Alert key={index} className={`border-l-4 ${
              diagnostic.type === 'error' ? 'border-l-red-500' :
              diagnostic.type === 'warning' ? 'border-l-yellow-500' :
              diagnostic.type === 'success' ? 'border-l-green-500' :
              'border-l-blue-500'
            }`}>
              <div className="flex items-start gap-3">
                {getIcon(diagnostic.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{diagnostic.title}</span>
                    <Badge variant={getBadgeVariant(diagnostic.type)} className="text-xs">
                      {diagnostic.type}
                    </Badge>
                  </div>
                  <AlertDescription className="text-sm mb-2">
                    {diagnostic.message}
                  </AlertDescription>
                  {diagnostic.suggestion && (
                    <div className="text-xs text-muted-foreground bg-slate-50 p-2 rounded">
                      💡 {diagnostic.suggestion}
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          ))}
        </div>

        {/* تفاصيل الأخطاء */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'إخفاء' : 'عرض'} تفاصيل الأخطاء ({errors.length})
            </Button>
            
            {showDetails && (
              <div className="max-h-60 overflow-y-auto bg-slate-50 p-3 rounded text-sm">
                {errors.slice(0, 20).map((error, index) => (
                  <div key={index} className="mb-2 pb-2 border-b border-slate-200 last:border-b-0">
                    <span className="font-medium text-red-600">السطر {error.row}:</span>
                    <span className="ml-2">{error.message}</span>
                  </div>
                ))}
                {errors.length > 20 && (
                  <div className="text-center text-muted-foreground mt-2">
                    ... و{errors.length - 20} خطأ إضافي
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* أزرار العمل */}
        <div className="flex gap-2 pt-4 border-t">
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              إعادة المحاولة
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => {
              const tips = `
نصائح لحل مشاكل رفع المدفوعات:

1. تنسيق الملف:
   - استخدم ملف CSV أو Excel صحيح
   - تأكد من وجود عنوان للأعمدة في السطر الأول

2. الحقول المطلوبة:
   - تاريخ الدفع (payment_date)
   - مبلغ الدفع (amount أو amount_paid)
   - طريقة الدفع (payment_method)

3. تنسيق البيانات:
   - التواريخ: YYYY-MM-DD أو DD/MM/YYYY
   - المبالغ: أرقام فقط بدون رموز عملة
   - طرق الدفع: نقد، شيك، حوالة بنكية، بطاقة ائتمان، بطاقة خصم

4. تنظيف البيانات:
   - احذف الصفوف الفارغة
   - تأكد من عدم وجود مسافات إضافية
   - استخدم نص عادي بدون تنسيق خاص
              `;
              alert(tips);
            }}
          >
            نصائح الإصلاح
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}