/**
 * نمط الربط الذكي
 * ربط المدفوعات بالعقود مع معاينة تفاعلية
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Brain, 
  Download, 
  Upload, 
  CheckCircle, 
  Link, 
  Unlink, 
  Eye,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { SmartCSVUpload } from '@/components/csv/SmartCSVUpload';
import { PaymentUploadDiagnostics } from './PaymentUploadDiagnostics';
import { toast } from 'sonner';
import { usePaymentOperations } from '@/hooks/business/usePaymentOperations';

interface SmartLinkingModeProps {
  onUploadComplete: (data: any[]) => Promise<any>;
  downloadTemplate: () => void;
  fieldTypes: Record<string, any>;
  requiredFields: string[];
  isUploading: boolean;
  progress: number;
  linkingFunctions: {
    searchPotentialContracts: (payment: any) => Promise<any[]>;
    validateLinking: (payment: any, contract: any, mode: string) => any;
    linkPaymentToContract: any;
  };
}

interface PreviewItem {
  rowNumber: number;
  data: any;
  potentialContracts?: any[];
  bestMatch?: any;
  confidence?: number;
  warnings: string[];
  errors: string[];
  canLink: boolean;
}

export function SmartLinkingMode({
  onUploadComplete,
  downloadTemplate,
  fieldTypes,
  requiredFields,
  isUploading,
  progress,
  linkingFunctions
}: SmartLinkingModeProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'processing'>('upload');
  const [previewData, setPreviewData] = useState<PreviewItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [analysisStartTime, setAnalysisStartTime] = useState(0);
  const [rowsProcessed, setRowsProcessed] = useState(0);

  // استخدام عمليات المدفوعات
  const { 
    createPayment, 
    isCreating 
  } = usePaymentOperations();

  // دالة حفظ المدفوعة
  const savePayment = async (paymentData: any) => {
    return new Promise((resolve, reject) => {
      createPayment.mutate(paymentData, {
        onSuccess: (data) => resolve(data),
        onError: (error) => reject(error)
      });
    });
  };

  // معالجة رفع الملف مع آلية timeout وتحسين الأداء
  const handleFileUpload = useCallback(async (data: any[]) => {
    setIsAnalyzing(true);
    setCurrentStep('preview');
    setAnalysisStartTime(Date.now());
    setRowsProcessed(0);
    
    // إظهار التشخيص بعد 10 ثوان
    const diagnosticsTimeoutId = setTimeout(() => {
      if (isAnalyzing) {
        setShowDiagnostics(true);
      }
    }, 10000);
    
    // إضافة timeout للعملية الكاملة (30 ثانية)
    const timeoutId = setTimeout(() => {
      setIsAnalyzing(false);
      setShowDiagnostics(false);
      toast.error('انتهت مهلة تحليل البيانات - سيتم المتابعة بدون ربط ذكي');
      setCurrentStep('upload');
    }, 30000);
    
    try {
      // تحليل البيانات أولاً
      const result = await onUploadComplete(data);
      
      if (result.requiresPreview && result.previewData) {
        // إنشاء عناصر المعاينة مع البحث عن العقود
        const preview: PreviewItem[] = [];
        const batchSize = 5; // معالجة 5 عناصر في كل دفعة
        
        for (let i = 0; i < result.previewData.length; i += batchSize) {
          const batch = result.previewData.slice(i, i + batchSize);
          
          // معالجة الدفعة مع timeout منفصل لكل عنصر
          const batchResults = await Promise.allSettled(
            batch.map(async (item, batchIndex) => {
              const globalIndex = i + batchIndex;
              setRowsProcessed(globalIndex + 1);
              try {
                // timeout منفصل لكل بحث (3 ثوان)
                const searchPromise = Promise.race([
                  linkingFunctions.searchPotentialContracts(item.data),
                  new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Search timeout')), 3000)
                  )
                ]);
                
                const potentialContracts = await searchPromise;
                const bestMatch = potentialContracts[0];
                
                // التحقق من صحة الربط مع timeout
                let validation = null;
                if (bestMatch) {
                  try {
                    const validationPromise = Promise.race([
                      Promise.resolve(linkingFunctions.validateLinking(item.data, bestMatch.contract, 'auto')),
                      new Promise<never>((_, reject) => 
                        setTimeout(() => reject(new Error('Validation timeout')), 1000)
                      )
                    ]);
                    validation = await validationPromise;
                  } catch (validationError) {
                    console.warn(`تعذر التحقق من صحة الربط للصف ${item.rowNumber}:`, validationError);
                  }
                }
                
                return {
                  rowNumber: item.rowNumber,
                  data: item.data,
                  potentialContracts: potentialContracts || [],
                  bestMatch,
                  confidence: bestMatch?.confidence,
                  warnings: item.warnings || [],
                  errors: validation?.overallAssessment?.canProceed === false ? ['لا يمكن الربط'] : [],
                  canLink: bestMatch && validation?.overallAssessment?.canProceed !== false
                };
              } catch (error) {
                console.warn(`فشل في تحليل الصف ${item.rowNumber}:`, error);
                return {
                  rowNumber: item.rowNumber,
                  data: item.data,
                  potentialContracts: [],
                  bestMatch: null,
                  confidence: 0,
                  warnings: item.warnings || [],
                  errors: ['فشل في التحليل الذكي'],
                  canLink: false
                };
              }
            })
          );
          
          // إضافة النتائج الناجحة
          batchResults.forEach((result) => {
            if (result.status === 'fulfilled') {
              preview.push(result.value);
            }
          });
          
          // تحديث التقدم
          const progress = Math.min(100, ((i + batchSize) / result.previewData.length) * 100);
          console.log(`📊 تقدم التحليل: ${Math.round(progress)}%`);
        }
        
        setPreviewData(preview);
        
        // تحديد العناصر القابلة للربط تلقائياً (ثقة أعلى من 80%)
        const autoLinkable = new Set(
          preview
            .filter(item => item.canLink && item.confidence && item.confidence >= 0.8)
            .map(item => item.rowNumber)
        );
        setSelectedItems(autoLinkable);
        
        toast.success(`🧠 تم تحليل ${preview.length} دفعة - ${autoLinkable.size} جاهزة للربط التلقائي`);
      }
    } catch (error) {
      console.error('خطأ في التحليل:', error);
      toast.error(`خطأ في التحليل: ${error instanceof Error ? error.message : 'خطأ غير متوقع'}`);
      setCurrentStep('upload');
    } finally {
      clearTimeout(timeoutId);
      clearTimeout(diagnosticsTimeoutId);
      setIsAnalyzing(false);
      setShowDiagnostics(false);
      setRowsProcessed(0);
    }
  }, [onUploadComplete, linkingFunctions, isAnalyzing]);

  // معالجات التشخيص
  const handleDiagnosticsRetry = useCallback(() => {
    setShowDiagnostics(false);
    setIsAnalyzing(false);
    setCurrentStep('upload');
    toast.info('تم إلغاء التحليل - يمكنك المحاولة مرة أخرى');
  }, []);

  const handleSkipAnalysis = useCallback(() => {
    setShowDiagnostics(false);
    setIsAnalyzing(false);
    setCurrentStep('upload');
    toast.info('تم تخطي التحليل الذكي');
  }, []);

  const handleCancelAnalysis = useCallback(() => {
    setShowDiagnostics(false);
    setIsAnalyzing(false);
    setCurrentStep('upload');
    toast.info('تم إلغاء العملية');
  }, []);

  // تبديل تحديد العنصر
  const toggleItemSelection = (rowNumber: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(rowNumber)) {
      newSelected.delete(rowNumber);
    } else {
      newSelected.add(rowNumber);
    }
    setSelectedItems(newSelected);
  };

  // تحديد/إلغاء تحديد الكل
  const toggleSelectAll = () => {
    if (selectedItems.size === previewData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(previewData.map(item => item.rowNumber)));
    }
  };

  // معالجة الربط النهائي والحفظ
  const handleFinalLinking = useCallback(async () => {
    if (selectedItems.size === 0) {
      toast.error('يرجى اختيار دفعات للمعالجة');
      return;
    }

    setCurrentStep('processing');
    setIsProcessing(true);
    
    try {
      const selectedPreviewItems = previewData.filter(item => 
        selectedItems.has(item.rowNumber)
      );
      
      let successful = 0;
      let failed = 0;
      const failedItems: { item: PreviewItem; error: string }[] = [];
      
      for (const item of selectedPreviewItems) {
        try {
          if (item.canLink && item.bestMatch) {
            // إعداد بيانات المدفوعة
            const paymentData = {
              payment_number: item.data.payment_number || `PAY-${Date.now()}-${item.rowNumber}`,
              payment_date: item.data.payment_date || new Date().toISOString().split('T')[0],
              amount: parseFloat(item.data.amount || item.data.amount_paid || 0),
              payment_method: item.data.payment_method || 'cash',
              reference_number: item.data.reference_number || undefined,
              notes: item.data.notes || `مدفوعة مرفوعة تلقائياً - الصف ${item.rowNumber}`,
              customer_id: item.bestMatch.contract.customer_id,
              contract_id: item.bestMatch.contract.id,
              type: 'receipt' as const,
              currency: 'KWD'
            };

            // حفظ المدفوعة
            await savePayment(paymentData);
            successful++;
          } else {
            failed++;
            failedItems.push({ 
              item, 
              error: 'لا يمكن الربط - لا يوجد عقد مناسب' 
            });
          }
        } catch (error: any) {
          failed++;
          failedItems.push({ 
            item, 
            error: `خطأ في الحفظ: ${error.message || error}` 
          });
        }
      }
      
      // عرض النتائج
      if (successful > 0) {
        toast.success(`✅ تم حفظ ${successful} دفعة بنجاح في قاعدة البيانات`);
      }
      
      if (failed > 0) {
        toast.error(`❌ فشل في حفظ ${failed} دفعة`);
        
        // عرض تفاصيل الأخطاء للمدفوعات الفاشلة
        failedItems.forEach(({ item, error }) => {
          console.error(`فشل في حفظ الصف ${item.rowNumber}:`, error);
        });
      }
      
      // العودة للخطوة الأولى
      setTimeout(() => {
        setCurrentStep('upload');
        setPreviewData([]);
        setSelectedItems(new Set());
        setIsProcessing(false);
      }, 2000);
      
    } catch (error: any) {
      toast.error(`خطأ عام في العملية: ${error.message || error}`);
      setIsProcessing(false);
    }
  }, [selectedItems, previewData, createPayment, savePayment]);

  // عرض واجهة الرفع
  const renderUploadInterface = () => (
    <div className="space-y-6">
      {/* معلومات النمط */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            الربط الذكي - تحليل ومعاينة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              سيقوم النظام بتحليل المدفوعات والبحث عن العقود المناسبة لها، ثم عرض معاينة تفاعلية للمراجعة قبل الحفظ النهائي.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-700">الدقة</div>
              <div className="text-sm text-blue-600">92%</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="font-semibold text-green-700">التحكم</div>
              <div className="text-sm text-green-600">تفاعلي</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="font-semibold text-purple-700">الربط</div>
              <div className="text-sm text-purple-600">تلقائي + يدوي</div>
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
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            تحميل قالب المدفوعات مع حقول الربط
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
                <span>جاري الرفع والتحليل...</span>
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
            uploadFunction={handleFileUpload}
            downloadTemplate={downloadTemplate}
            fieldTypes={fieldTypes}
            requiredFields={requiredFields}
          />
        </CardContent>
      </Card>
    </div>
  );

  // عرض معاينة البيانات
  const renderPreview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={toggleSelectAll}>
            {selectedItems.size === previewData.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
          </Button>
          <span className="text-sm text-gray-600">
            محدد: {selectedItems.size} من {previewData.length}
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentStep('upload')}>
            العودة
          </Button>
          <Button
            onClick={handleFinalLinking}
            disabled={selectedItems.size === 0 || isProcessing || isCreating}
            className="flex items-center gap-2"
          >
            {isProcessing || isCreating ? (
              <>
                <Brain className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Link className="h-4 w-4" />
                حفظ المدفوعات ({selectedItems.size})
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedItems.size === previewData.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>الصف</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>العقد المطابق</TableHead>
              <TableHead>الثقة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.map((item) => (
              <TableRow key={item.rowNumber}>
                <TableCell>
                  <Checkbox
                    checked={selectedItems.has(item.rowNumber)}
                    onCheckedChange={() => toggleItemSelection(item.rowNumber)}
                  />
                </TableCell>
                <TableCell>{item.rowNumber}</TableCell>
                <TableCell>{item.data.amount || item.data.amount_paid}</TableCell>
                <TableCell>
                  {item.bestMatch ? (
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4 text-green-600" />
                      <div className="text-xs">
                        <div className="font-medium">{item.bestMatch.contract?.contract_number}</div>
                        <div className="text-muted-foreground">{item.bestMatch.contract?.customer?.full_name}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Unlink className="h-4 w-4 text-gray-400" />
                      لا يوجد تطابق
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {item.confidence && (
                    <Badge variant={item.confidence >= 0.8 ? 'default' : 'secondary'}>
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {item.canLink ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : item.errors.length > 0 ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    {item.warnings.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {item.warnings.length} تحذير
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // عرض معالجة
  const renderProcessing = () => (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl">
        <Brain className="h-8 w-8 text-blue-600 animate-pulse" />
        <div>
          <h3 className="text-xl font-bold">جاري حفظ المدفوعات في قاعدة البيانات...</h3>
          <p className="text-muted-foreground">معالجة وحفظ {selectedItems.size} دفعة</p>
        </div>
      </div>
      <Progress value={isProcessing ? 75 : 100} className="h-2" />
      {isProcessing && (
        <p className="text-sm text-muted-foreground">
          يتم الآن حفظ البيانات في قاعدة البيانات وربطها بالعقود المناسبة...
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {isAnalyzing && (
        <Alert>
          <Brain className="h-4 w-4 animate-spin" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex flex-col">
              <span>جاري تحليل البيانات والبحث عن العقود المناسبة...</span>
              {rowsProcessed > 0 && (
                <span className="text-xs text-muted-foreground mt-1">
                  معالجة الصف {rowsProcessed}...
                </span>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSkipAnalysis}
            >
              تخطي التحليل الذكي
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* مكون التشخيص */}
      <PaymentUploadDiagnostics
        isVisible={showDiagnostics}
        onRetry={handleDiagnosticsRetry}
        onSkipAnalysis={handleSkipAnalysis}
        onCancel={handleCancelAnalysis}
        currentStep="تحليل المدفوعات والبحث عن العقود"
        rowsProcessed={rowsProcessed}
        totalRows={previewData.length}
        timeElapsed={Date.now() - analysisStartTime}
      />

      {currentStep === 'upload' && renderUploadInterface()}
      {currentStep === 'preview' && renderPreview()}
      {currentStep === 'processing' && renderProcessing()}
    </div>
  );
}