/**
 * نمط المعالجة السريعة
 * للملفات الكبيرة مع أولوية السرعة على الدقة
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
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
import { CSVDragDropUpload } from '@/components/finance/csv-import/CSVDragDropUpload';
import { useBulkPaymentOperations } from '@/hooks/useBulkPaymentOperations';
import { PaymentUploadDiagnostics } from './PaymentUploadDiagnostics';
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
  
  const [uploadErrors, setUploadErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [lastUploadResult, setLastUploadResult] = useState<any>(null);
  const [showAutoFixSettings, setShowAutoFixSettings] = useState(false);

  const { 
    bulkUploadPayments, 
    isProcessing: isBulkProcessing, 
    progress,
    autoFixConfig,
    setAutoFixConfig
  } = useBulkPaymentOperations();

  // معالجة الملف مع النمط السريع
  const handleFastUpload = useCallback(async (data: any[]) => {
    setIsProcessing(true);
    const startTime = Date.now();
    
    try {
      console.log(`🚀 بدء المعالجة السريعة لـ ${data.length} سجل`);
      
      // تحليل البيانات المرفوعة قبل المعالجة
      console.log('📊 تحليل عينة من البيانات المرفوعة:');
      if (data.length > 0) {
        console.log('🔍 السطر الأول:', data[0]);
        console.log('🗂️ أعمدة البيانات:', Object.keys(data[0]));
        
        // فحص الحقول المطلوبة
        const hasDate = data[0].hasOwnProperty('payment_date') || data[0].hasOwnProperty('payment_da') || data[0].hasOwnProperty('date');
        const hasAmount = data[0].hasOwnProperty('amount') || data[0].hasOwnProperty('amount_paid') || data[0].hasOwnProperty('المبلغ');
        const hasMethod = data[0].hasOwnProperty('payment_method') || data[0].hasOwnProperty('payment_') || data[0].hasOwnProperty('طريقة الدفع');
        
        console.log('✅ فحص الحقول الأساسية:', { hasDate, hasAmount, hasMethod });
        
        if (!hasDate || !hasAmount) {
          throw new Error('⚠️ ملف البيانات المرفوع لا يحتوي على الحقول المطلوبة (تاريخ الدفع ومبلغ الدفع)');
        }
      }
      
      // تقدير السرعة
      setProcessingStats({
        total: data.length,
        processed: 0,
        successful: 0,
        failed: 0,
        speed: 0
      });
      
      // حفظ البيانات للتشخيص
      setUploadedData(data);
      
      // استخدام العمليات المجمعة المحسنة مع الإصلاح التلقائي
      const result = await bulkUploadPayments(data, {
        batchSize: processingSettings.batchSize,
        autoCreateCustomers: processingSettings.autoCreateCustomers,
        skipValidation: processingSettings.skipValidation,
        useAutoFix: true
      });
      
      setLastUploadResult(result);
      
      // حفظ الأخطاء للتشخيص
      setUploadErrors(result.errors || []);
      
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
      
      // عرض النتائج المفصلة
      if (result.successful > 0) {
        toast.success(`⚡ تم معالجة ${result.successful} مدفوعة في ${processingTime.toFixed(1)} ثانية (${Math.round(speed)} سجل/ثانية)`);
        // إشعار المكون الرئيسي بنجاح العملية فقط
        await onUploadComplete(result.fixedData || data);
      }
      
      if (result.failed > 0) {
        toast.error(`❌ فشل في معالجة ${result.failed} سجل`);
        console.log('📋 تفاصيل الأخطاء:', result.errors);
        
        // عرض أول 3 أخطاء للمستخدم
        const firstErrors = result.errors.slice(0, 3);
        firstErrors.forEach((error, index) => {
          toast.error(`خطأ في السطر ${error.row}: ${error.message}`, {
            duration: 5000,
            position: 'bottom-right'
          });
        });
        
        if (result.errors.length > 3) {
          toast.warning(`وهناك ${result.errors.length - 3} أخطاء إضافية. راجع وحدة التحكم للتفاصيل.`);
        }
      }
      
    } catch (error: any) {
      console.error('❌ خطأ في المعالجة السريعة:', error);
      toast.error(`خطأ في المعالجة: ${error.message}`, {
        duration: 10000,
        description: 'تأكد من أن الملف يحتوي على الحقول المطلوبة: تاريخ الدفع، مبلغ الدفع، وطريقة الدفع'
      });
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

  const downloadCleanedCSV = () => {
    if (!lastUploadResult?.cleanedCSV) return;
    
    const blob = new Blob([lastUploadResult.cleanedCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cleaned-payments-${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              المعالجة السريعة مع الإصلاح التلقائي بالذكاء الاصطناعي. يتم تنظيف البيانات وإصلاح الأخطاء تلقائياً.
            </AlertDescription>
          </Alert>

          {/* Auto-Fix Settings */}
          <Collapsible open={showAutoFixSettings} onOpenChange={setShowAutoFixSettings}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  إعدادات الإصلاح التلقائي
                </div>
                <Badge variant="secondary">
                  {Object.values(autoFixConfig).filter(Boolean).length} مفعلة
                </Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">خيارات الإصلاح التلقائي</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoFillDates">تعبئة التواريخ المفقودة</Label>
                    <Switch
                      id="autoFillDates"
                      checked={autoFixConfig.autoFillEmptyDates}
                      onCheckedChange={(checked) => 
                        setAutoFixConfig(prev => ({ ...prev, autoFillEmptyDates: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoFillPaymentMethods">إصلاح طرق الدفع</Label>
                    <Switch
                      id="autoFillPaymentMethods"
                      checked={autoFixConfig.autoFillEmptyPaymentMethods}
                      onCheckedChange={(checked) => 
                        setAutoFixConfig(prev => ({ ...prev, autoFillEmptyPaymentMethods: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="normalizePaymentMethods">توحيد طرق الدفع</Label>
                    <Switch
                      id="normalizePaymentMethods"
                      checked={autoFixConfig.normalizePaymentMethods}
                      onCheckedChange={(checked) => 
                        setAutoFixConfig(prev => ({ ...prev, normalizePaymentMethods: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cleanNumeric">تنظيف الأرقام</Label>
                    <Switch
                      id="cleanNumeric"
                      checked={autoFixConfig.cleanNumericFields}
                      onCheckedChange={(checked) => 
                        setAutoFixConfig(prev => ({ ...prev, cleanNumericFields: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoCreateCustomers">إنشاء العملاء تلقائياً</Label>
                    <Switch
                      id="autoCreateCustomers"
                      checked={autoFixConfig.autoCreateCustomers}
                      onCheckedChange={(checked) => 
                        setAutoFixConfig(prev => ({ ...prev, autoCreateCustomers: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

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

      {/* Auto-Fix Results */}
      {lastUploadResult?.fixes && lastUploadResult.fixes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              نتائج الإصلاح التلقائي
            </CardTitle>
            <CardDescription>
              تم إصلاح {lastUploadResult.fixes.length} خطأ تلقائياً
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lastUploadResult.fixes.slice(0, 5).map((fix: any, index: number) => (
                <div key={index} className="text-sm text-muted-foreground">
                  السطر {fix.row}: {fix.reason} - {fix.field}
                </div>
              ))}
              {lastUploadResult.fixes.length > 5 && (
                <div className="text-sm text-muted-foreground">
                  و {lastUploadResult.fixes.length - 5} إصلاحات أخرى...
                </div>
              )}
            </div>
            {lastUploadResult.cleanedCSV && (
              <Button 
                onClick={downloadCleanedCSV}
                variant="outline" 
                size="sm" 
                className="mt-3"
              >
                <Download className="h-4 w-4 mr-2" />
                تحميل البيانات المصححة
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* مكون التشخيص */}
      {(uploadErrors.length > 0 || uploadedData.length > 0) && (
        <PaymentUploadDiagnostics 
          data={uploadedData}
          errors={uploadErrors}
          onRetry={() => {
            setUploadErrors([]);
            setUploadedData([]);
            setProcessingStats(null);
          }}
        />
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

          <CSVDragDropUpload
            onFileProcessed={handleFastUpload}
            onError={(error) => toast.error(`خطأ في معالجة الملف: ${error}`)}
            acceptedFileTypes={['.csv', '.xlsx', '.xls']}
            maxFileSize={50 * 1024 * 1024} // 50MB
          />
        </CardContent>
      </Card>
    </div>
  );
}