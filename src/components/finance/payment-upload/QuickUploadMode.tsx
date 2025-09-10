/**
 * نمط الرفع السريع
 * رفع مباشر للمدفوعات بدون معالجة إضافية
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Zap, Download, Upload, CheckCircle } from 'lucide-react';
import { SmartCSVUpload } from '@/components/csv/SmartCSVUpload';

interface QuickUploadModeProps {
  onUploadComplete: (data: any[]) => Promise<any>;
  downloadTemplate: () => void;
  fieldTypes: Record<string, any>;
  requiredFields: string[];
  isUploading: boolean;
  progress: number;
}

export function QuickUploadMode({
  onUploadComplete,
  downloadTemplate,
  fieldTypes,
  requiredFields,
  isUploading,
  progress
}: QuickUploadModeProps) {
  return (
    <div className="space-y-6">
      {/* معلومات النمط */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-600" />
            الرفع السريع - بدون معالجة إضافية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              سيتم رفع المدفوعات مباشرة إلى النظام بدون ربط تلقائي بالعقود. 
              هذا النمط مناسب للمستخدمين المتقدمين الذين يفضلون الربط اليدوي لاحقاً.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="font-semibold text-green-700">السرعة</div>
              <div className="text-sm text-green-600">سريع جداً</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-700">المعالجة</div>
              <div className="text-sm text-blue-600">أساسية</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="font-semibold text-purple-700">التحكم</div>
              <div className="text-sm text-purple-600">يدوي</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* تحميل القالب */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            تحميل القالب
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            قم بتحميل قالب CSV ليساعدك في تنسيق البيانات بالشكل الصحيح
          </p>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            تحميل قالب المدفوعات
          </Button>
        </CardContent>
      </Card>

      {/* رفع الملف */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            رفع ملف المدفوعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isUploading && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span>جاري الرفع...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <SmartCSVUpload
            open={true}
            onOpenChange={() => {}}
            onUploadComplete={() => {}}
            entityType="payment"
            uploadFunction={onUploadComplete}
            downloadTemplate={downloadTemplate}
            fieldTypes={fieldTypes}
            requiredFields={requiredFields}
          />
        </CardContent>
      </Card>

      {/* نصائح للرفع السريع */}
      <Card>
        <CardHeader>
          <CardTitle>نصائح للرفع السريع</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              تأكد من صحة تنسيق التواريخ (YYYY-MM-DD)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              تحقق من صحة المبالغ (أرقام صحيحة بدون عملة)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              استخدم ترميز UTF-8 للملفات العربية
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              يمكن ربط المدفوعات بالعقود لاحقاً من صفحة إدارة المدفوعات
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}