/**
 * InvoiceJournalEntryLinker Component
 * مكون ربط الفواتير بالقيود المحاسبية
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Link2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  FileText,
  TrendingUp
} from 'lucide-react';
import { useLinkExistingInvoices } from '@/hooks/useInvoiceJournalEntry';

interface InvoiceJournalEntryLinkerProps {
  companyId: string;
  onComplete?: () => void;
}

export function InvoiceJournalEntryLinker({ 
  companyId, 
  onComplete 
}: InvoiceJournalEntryLinkerProps) {
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    skipped: number;
    total: number;
  } | null>(null);

  const linkMutation = useLinkExistingInvoices();

  const handleLink = async () => {
    setShowResults(false);
    setResults(null);

    linkMutation.mutate(companyId, {
      onSuccess: (data) => {
        setResults(data);
        setShowResults(true);
        if (onComplete) {
          onComplete();
        }
      }
    });
  };

  const successRate = results 
    ? Math.round((results.success / results.total) * 100) 
    : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              ربط الفواتير بالقيود المحاسبية
            </CardTitle>
            <CardDescription>
              ربط تلقائي لجميع الفواتير الموجودة مع القيود المحاسبية المناسبة
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <FileText className="h-3 w-3" />
            تلقائي
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* معلومات النظام */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <div className="space-y-2">
              <p className="font-medium">كيف يعمل النظام:</p>
              <ul className="list-disc list-inside space-y-1 mr-4 text-muted-foreground">
                <li>البحث عن جميع الفواتير بدون قيود محاسبية</li>
                <li>إنشاء قيد تلقائي لكل فاتورة (مدين: العملاء 11301 / دائن: إيرادات 41101)</li>
                <li>ربط كل فاتورة بقيدها المحاسبي</li>
                <li>ترحيل القيود تلقائياً لتظهر في التقارير</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* زر التنفيذ */}
        {!showResults && (
          <Button
            onClick={handleLink}
            disabled={linkMutation.isPending}
            className="w-full"
            size="lg"
          >
            {linkMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                جاري الربط...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                ربط جميع الفواتير الآن
              </>
            )}
          </Button>
        )}

        {/* شريط التقدم */}
        {linkMutation.isPending && (
          <div className="space-y-2">
            <Progress value={50} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">
              جاري معالجة الفواتير... يرجى الانتظار
            </p>
          </div>
        )}

        {/* نتائج العملية */}
        {showResults && results && (
          <div className="space-y-4">
            {/* ملخص النتائج */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{results.total}</div>
                  <div className="text-xs text-muted-foreground">الإجمالي</div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">{results.success}</div>
                  <div className="text-xs text-green-700">نجح</div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 text-center">
                  <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-xs text-red-700">فشل</div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-600">{successRate}%</div>
                  <div className="text-xs text-blue-700">نسبة النجاح</div>
                </CardContent>
              </Card>
            </div>

            {/* رسالة النتيجة */}
            {results.success > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <p className="font-medium">تم الربط بنجاح! 🎉</p>
                  <p className="text-sm mt-1">
                    تم ربط {results.success} فاتورة بقيودها المحاسبية. يمكنك الآن مشاهدة التقارير المالية المحدثة.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {results.failed > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">بعض الفواتير فشلت في الربط</p>
                  <p className="text-sm mt-1">
                    {results.failed} فاتورة لم يتم ربطها. يرجى التحقق من السجلات أو التواصل مع الدعم الفني.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {results.total === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">لا توجد فواتير لربطها</p>
                  <p className="text-sm mt-1">
                    جميع الفواتير مربوطة بالفعل بقيودها المحاسبية.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* زر إعادة المحاولة */}
            {results.failed > 0 && (
              <Button
                onClick={handleLink}
                variant="outline"
                className="w-full"
              >
                إعادة المحاولة للفواتير الفاشلة
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

