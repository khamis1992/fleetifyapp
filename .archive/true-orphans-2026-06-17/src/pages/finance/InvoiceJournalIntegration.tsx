/**
 * Invoice-Journal Integration Management Page
 * صفحة إدارة ربط الفواتير بالقيود المحاسبية
 */

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { InvoiceJournalEntryLinker } from '@/components/finance/InvoiceJournalEntryLinker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Link2, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen,
  ArrowRight,
  FileText
} from 'lucide-react';

export default function InvoiceJournalIntegration() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  if (!companyId) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            لا يمكن الوصول لهذه الصفحة. يرجى التأكد من تسجيل الدخول.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* العنوان الرئيسي */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Link2 className="h-8 w-8 text-primary" />
          ربط الفواتير بالقيود المحاسبية
        </h1>
        <p className="text-muted-foreground mt-2">
          نظام تلقائي لربط الفواتير بالقيود المحاسبية وتحديث الميزانية العمومية
        </p>
      </div>

      {/* بطاقات توضيحية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <Badge variant="secondary">تلقائي</Badge>
            </div>
            <h3 className="font-semibold text-green-900 mb-2">ربط تلقائي</h3>
            <p className="text-sm text-green-700">
              إنشاء قيود محاسبية تلقائياً لكل فاتورة بدون تدخل يدوي
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <FileText className="h-10 w-10 text-blue-600" />
              <Badge variant="secondary">مُرحّل</Badge>
            </div>
            <h3 className="font-semibold text-blue-900 mb-2">ترحيل فوري</h3>
            <p className="text-sm text-blue-700">
              القيود تُرحّل تلقائياً وتظهر مباشرة في التقارير المالية
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="h-10 w-10 text-purple-600" />
              <Badge variant="secondary">دقيق</Badge>
            </div>
            <h3 className="font-semibold text-purple-900 mb-2">دقة محاسبية</h3>
            <p className="text-sm text-purple-700">
              المعادلة المحاسبية متوازنة: الأصول = الخصوم + حقوق الملكية
            </p>
          </CardContent>
        </Card>
      </div>

      {/* كيف يعمل النظام */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            كيف يعمل النظام؟
          </CardTitle>
          <CardDescription>
            عملية تلقائية من 4 خطوات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">البحث عن الفواتير</h4>
                <p className="text-sm text-muted-foreground">
                  جلب جميع الفواتير التي لا تحتوي على قيد محاسبي مرتبط
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">إنشاء القيود</h4>
                <p className="text-sm text-muted-foreground">
                  لكل فاتورة، إنشاء قيد محاسبي: مدين العملاء (11301) / دائن إيرادات التأجير (41101)
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">الربط والترحيل</h4>
                <p className="text-sm text-muted-foreground">
                  ربط كل فاتورة بقيدها وترحيل القيد ليظهر في الميزانية العمومية
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold mb-1">تحديث التقارير</h4>
                <p className="text-sm text-muted-foreground">
                  التقارير المالية تتحدث تلقائياً وتعكس الأرصدة الصحيحة
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* المكون الرئيسي للربط */}
      <InvoiceJournalEntryLinker 
        companyId={companyId}
        onComplete={() => {
          console.log('✅ Linking completed successfully');
        }}
      />

      {/* ملاحظات مهمة */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-2">ملاحظات مهمة:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>العملية آمنة ولا تؤثر على البيانات الموجودة</li>
            <li>القيود المُنشأة تكون بحالة "مُرحّل" مباشرة</li>
            <li>يمكنك إعادة تشغيل العملية بدون مشاكل (لن تُنشأ قيود مكررة)</li>
            <li>لمراجعة القيود، انتقل إلى: المالية → دفتر الأستاذ</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

