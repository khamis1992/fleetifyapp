/**
 * نمط المعالجة السريعة
 * للملفات الكبيرة مع أولوية السرعة على الدقة
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Zap, 
  Download, 
  Upload, 
  Settings,
  Timer,
  Database,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { SmartCSVUpload } from '@/components/csv/SmartCSVUpload';
import { useBulkPaymentOperations } from '@/hooks/useBulkPaymentOperations';
import { toast } from 'sonner';

interface FastProcessingModeProps {
  onUploadComplete: (data: any[]) => Promise<any>;
  downloadTemplate: () => void;
  fieldTypes: Record<string, any>;
  requiredFields: string[];
}

export function FastProcessingMode({
  onUploadComplete,
  downloadTemplate,
  fieldTypes,
  requiredFields
}: FastProcessingModeProps) {
  const [processingSettings, setProcessingSettings] = useState({
    batchSize: 100,
    skipValidation: false,
    autoCreateCustomers: true,
    parallelProcessing: true,
    ignoreDuplicates: false
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStats, setProcessingStats] = useState<{
    total: number;
    processed: number;
    successful: number;
    failed: number;
    speed: number; // records per second
  } | null>(null);

  const { bulkUploadPayments, isProcessing: isBulkProcessing, progress } = useBulkPaymentOperations();

  // معالجة الملف مع النمط السريع
  const handleFastUpload = useCallback(async (data: any[]) => {
    setIsProcessing(true);
    const startTime = Date.now();
    
    try {
      console.log(`🚀 بدء المعالجة السريعة لـ ${data.length} سجل`);
      
      // تقدير السرعة
      setProcessingStats({
        total: data.length,
        processed: 0,
        successful: 0,
        failed: 0,
        speed: 0
      });
      
      // استخدام العمليات المجمعة المحسنة
      const result = await bulkUploadPayments(data, {
        batchSize: processingSettings.batchSize,
        autoCreateCustomers: processingSettings.autoCreateCustomers,
        skipValidation: processingSettings.skipValidation
      });
      
      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000; // بالثواني
      const speed = result.successful / processingTime;
      
      setProcessingStats({
        total: result.total,
        processed: result.total,
        successful: result.successful,
        failed: result.failed,
        speed: Math.round(speed)
      });
      
      // عرض النتائج
      if (result.successful > 0) {
        toast.success(`⚡ تم معالجة ${result.successful} مدفوعة في ${processingTime.toFixed(1)} ثانية (${Math.round(speed)} سجل/ثانية)`);
      }
      
      if (result.failed > 0) {
        toast.error(`❌ فشل في معالجة ${result.failed} سجل`);
        console.log('الأخطاء:', result.errors);
      }
      
      // إشعار المكون الرئيسي
      onUploadComplete(data);
      
    } catch (error: any) {
      console.error('❌ خطأ في المعالجة السريعة:', error);
      toast.error(`خطأ في المعالجة: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [processingSettings, bulkUploadPayments, onUploadComplete]);

  // تحديث إعدادات المعالجة
  const updateSetting = (key: string, value: any) => {
    setProcessingSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* معلومات النمط */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-600" />
            المعالجة السريعة - للملفات الكبيرة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Timer className="h-4 w-4" />
            <AlertDescription>
              هذا النمط مصمم للملفات الكبيرة (أكثر من 1000 سجل) مع التركيز على السرعة. 
              يستخدم معالجة مجمعة وتحسينات خاصة لتحقيق أقصى سرعة ممكنة.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="font-semibold text-green-700">السرعة</div>
              <div className="text-sm text-green-600">500+ سجل/ثانية</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-700">المعالجة</div>
              <div className="text-sm text-blue-600">مجمعة ومتوازية</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="font-semibold text-purple-700">الحد الأقصى</div>
              <div className="text-sm text-purple-600">50,000 سجل</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="font-semibold text-orange-700">التحقق</div>
              <div className="text-sm text-orange-600">مبسط/اختياري</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إعدادات المعالجة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إعدادات التحسين
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchSize">حجم المجموعة</Label>
              <Input
                id="batchSize"
                type="number"
                min="50"
                max="500"
                value={processingSettings.batchSize}
                onChange={(e) => updateSetting('batchSize', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                عدد السجلات في كل مجموعة (50-500)
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="skipValidation"
                  checked={processingSettings.skipValidation}
                  onCheckedChange={(checked) => updateSetting('skipValidation', checked)}
                />
                <Label htmlFor="skipValidation">تخطي التحقق التفصيلي</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="autoCreateCustomers"
                  checked={processingSettings.autoCreateCustomers}
                  onCheckedChange={(checked) => updateSetting('autoCreateCustomers', checked)}
                />
                <Label htmlFor="autoCreateCustomers">إنشاء عملاء تلقائياً</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ignoreDuplicates"
                  checked={processingSettings.ignoreDuplicates}
                  onCheckedChange={(checked) => updateSetting('ignoreDuplicates', checked)}
                />
                <Label htmlFor="ignoreDuplicates">تجاهل المكررات</Label>
              </div>
            </div>
          </div>

          {processingSettings.skipValidation && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                تحذير: تخطي التحقق قد يؤدي إلى إدراج بيانات غير صحيحة
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* إحصائيات المعالجة */}
      {processingStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              إحصائيات المعالجة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{processingStats.total}</div>
                <div className="text-sm text-muted-foreground">إجمالي</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{processingStats.successful}</div>
                <div className="text-sm text-muted-foreground">نجح</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{processingStats.failed}</div>
                <div className="text-sm text-muted-foreground">فشل</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{processingStats.processed}</div>
                <div className="text-sm text-muted-foreground">معالج</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{processingStats.speed}</div>
                <div className="text-sm text-muted-foreground">سجل/ثانية</div>
              </div>
            </div>
            
            {isProcessing && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>جاري المعالجة...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* تحميل القالب */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            تحميل القالب
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            تحميل قالب المعالجة السريعة
          </Button>
        </CardContent>
      </Card>

      {/* رفع الملف */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            رفع الملف للمعالجة السريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isProcessing && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span>جاري المعالجة السريعة...</span>
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
            uploadFunction={handleFastUpload}
            downloadTemplate={downloadTemplate}
            fieldTypes={fieldTypes}
            requiredFields={requiredFields}
          />
        </CardContent>
      </Card>
    </div>
  );
}