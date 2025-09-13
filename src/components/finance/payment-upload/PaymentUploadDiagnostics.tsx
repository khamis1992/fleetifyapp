/**
 * مكون التشخيص لمعالجة مشاكل رفع المدفوعات
 * يعرض معلومات مفيدة عند تعليق العملية أو حدوث أخطاء
 */

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  RefreshCw, 
  SkipForward, 
  Info,
  Clock,
  Activity
} from 'lucide-react';

interface PaymentUploadDiagnosticsProps {
  isVisible: boolean;
  onRetry: () => void;
  onSkipAnalysis: () => void;
  onCancel: () => void;
  currentStep?: string;
  rowsProcessed?: number;
  totalRows?: number;
  timeElapsed?: number;
}

export const PaymentUploadDiagnostics: React.FC<PaymentUploadDiagnosticsProps> = ({
  isVisible,
  onRetry,
  onSkipAnalysis,
  onCancel,
  currentStep = 'تحليل البيانات',
  rowsProcessed = 0,
  totalRows = 0,
  timeElapsed = 0
}) => {
  if (!isVisible) return null;

  const progress = totalRows > 0 ? Math.round((rowsProcessed / totalRows) * 100) : 0;
  const isStuck = timeElapsed > 15000; // اعتبار العملية معلقة إذا تجاوزت 15 ثانية

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            تشخيص عملية رفع المدفوعات
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* معلومات الحالة الحالية */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">الحالة الحالية:</span>
              <span className="text-sm text-muted-foreground">{currentStep}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">التقدم:</span>
              <span className="text-sm text-muted-foreground">
                {rowsProcessed} من {totalRows} ({progress}%)
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">الوقت المنقضي:</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.round(timeElapsed / 1000)} ثانية
              </span>
            </div>
          </div>

          {/* تحذير إذا كانت العملية معلقة */}
          {isStuck && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                العملية تستغرق وقتاً أطول من المعتاد. قد يكون هناك مشكلة في:
                <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                  <li>البحث عن العقود في قاعدة البيانات</li>
                  <li>تحليل البيانات المعقدة</li>
                  <li>اتصال الشبكة</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* معلومات مفيدة */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">ماذا يحدث الآن:</p>
                <ul className="text-sm space-y-1">
                  <li>• النظام يبحث عن العقود المطابقة لكل دفعة</li>
                  <li>• يتم التحقق من صحة البيانات</li>
                  <li>• يجري حساب مستوى الثقة للربط</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* خيارات الإجراء */}
          <div className="flex flex-col gap-2">
            <Button 
              onClick={onSkipAnalysis}
              variant="outline" 
              className="w-full"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              تخطي التحليل الذكي والمتابعة
            </Button>
            
            <Button 
              onClick={onRetry}
              variant="outline" 
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              إعادة المحاولة
            </Button>
            
            <Button 
              onClick={onCancel}
              variant="ghost" 
              className="w-full"
            >
              إلغاء العملية
            </Button>
          </div>

          {/* نصائح للمستخدم */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            <p className="font-medium mb-1">نصائح لتحسين الأداء:</p>
            <ul className="space-y-1">
              <li>• تأكد من وجود أرقام العقود في الملف</li>
              <li>• استخدم ملفات أصغر (أقل من 100 صف)</li>
              <li>• تحقق من اتصال الإنترنت</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};