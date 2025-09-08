import React, { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Brain, 
  Zap, 
  Receipt,
  TrendingUp,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SmartCSVUpload } from '@/components/common/SmartCSVUpload';
import { useAdvancedPaymentAnalyzer } from '@/hooks/useAdvancedPaymentAnalyzer';
import { useAutomaticInvoiceGenerator } from '@/hooks/useAutomaticInvoiceGenerator';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface SuperIntelligentPaymentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
}

export function SuperIntelligentPaymentUpload({ 
  open, 
  onOpenChange, 
  onUploadComplete 
}: SuperIntelligentPaymentUploadProps) {
  
  // 🎯 Hooks
  const { formatCurrency } = useCurrencyFormatter();
  const { 
    isAnalyzing, 
    analysisResults, 
    processAdvancedPaymentFile 
  } = useAdvancedPaymentAnalyzer();
  
  const { 
    isGenerating, 
    generateAutomaticInvoices,
    getGenerationStatistics 
  } = useAutomaticInvoiceGenerator();

  // 🎛️ State Management
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyzing' | 'preview' | 'processing' | 'results'>('upload');
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [finalResults, setFinalResults] = useState<any>(null);

  // 🧠 معالجة الملف المرفوع
  const handleFileUpload = useCallback(async (data: any[]) => {
    setUploadedData(data);
    setCurrentStep('analyzing');
    
    toast.success(`🧠 بدء التحليل الذكي لـ ${data.length} دفعة`);
    
    try {
      const results = await processAdvancedPaymentFile(data);
      setCurrentStep('preview');
      
      // تحديد العناصر عالية الثقة تلقائياً
      const highConfidenceItems = new Set(
        results
          .map((result, index) => ({ result, index }))
          .filter(({ result }) => 
            result.bestMatch && 
            result.bestMatch.suggestedAction === 'auto_link'
          )
          .map(({ index }) => index)
      );
      
      setSelectedItems(highConfidenceItems);
      
      toast.success(`🎯 تم تحليل ${results.length} دفعة - ${highConfidenceItems.size} جاهزة للربط التلقائي`);
      
    } catch (error: any) {
      toast.error(`خطأ في التحليل: ${error.message}`);
      setCurrentStep('upload');
    }
  }, [processAdvancedPaymentFile]);

  // ⚡ معالجة الدفعات المحددة
  const handleProcessSelected = useCallback(async () => {
    if (selectedItems.size === 0) {
      toast.error('يرجى اختيار دفعات للمعالجة');
      return;
    }

    setCurrentStep('processing');
    
    // إعداد خطوات المعالجة
    const steps: ProcessingStep[] = [
      {
        id: 'prepare',
        title: 'تحضير البيانات',
        description: 'إعداد الدفعات والعقود للمعالجة',
        status: 'processing',
        progress: 0
      },
      {
        id: 'link',
        title: 'ربط المدفوعات',
        description: 'ربط المدفوعات بالعقود المناسبة',
        status: 'pending',
        progress: 0
      },
      {
        id: 'invoices',
        title: 'إنشاء الفواتير',
        description: 'إنشاء فواتير الدفع وغرامات التأخير',
        status: 'pending',
        progress: 0
      },
      {
        id: 'finalize',
        title: 'اللمسة الأخيرة',
        description: 'حفظ البيانات وإنشاء التقارير',
        status: 'pending',
        progress: 0
      }
    ];
    
    setProcessingSteps(steps);

    try {
      // الخطوة 1: تحضير البيانات
      updateStepStatus('prepare', 'processing', 25);
      
      const selectedResults = Array.from(selectedItems).map(index => analysisResults[index]);
      const invoiceRequests = selectedResults
        .filter(result => result.bestMatch)
        .map(result => ({
          payment: result.originalPayment,
          contract: result.bestMatch.contract,
          customer: result.bestMatch.contract.customer,
          lateFineCalculation: result.lateFineCalculation,
          invoiceType: result.lateFineCalculation?.isApplicable ? 'combined' : 'payment_received'
        }));

      updateStepStatus('prepare', 'completed', 100);
      
      // الخطوة 2: ربط المدفوعات
      updateStepStatus('link', 'processing', 0);
      
      // محاكاة التقدم
      for (let i = 0; i <= 100; i += 10) {
        updateStepStatus('link', 'processing', i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      updateStepStatus('link', 'completed', 100);
      
      // الخطوة 3: إنشاء الفواتير
      updateStepStatus('invoices', 'processing', 0);
      
      const generationResults = await generateAutomaticInvoices(invoiceRequests);
      
      updateStepStatus('invoices', 'completed', 100);
      
      // الخطوة 4: اللمسة الأخيرة
      updateStepStatus('finalize', 'processing', 50);
      
      const statistics = getGenerationStatistics();
      setFinalResults({
        generationResults,
        statistics,
        processedCount: selectedItems.size,
        successCount: generationResults.filter(r => r.success).length
      });
      
      updateStepStatus('finalize', 'completed', 100);
      
      setCurrentStep('results');
      
      toast.success(`🎉 تمت معالجة ${statistics.successful} دفعة بنجاح!`);
      
    } catch (error: any) {
      toast.error(`خطأ في المعالجة: ${error.message}`);
      updateStepStatus(processingSteps.find(s => s.status === 'processing')?.id || 'prepare', 'error', 0);
    }
  }, [selectedItems, analysisResults, generateAutomaticInvoices, getGenerationStatistics]);

  // 🔄 تحديث حالة الخطوة
  const updateStepStatus = useCallback((stepId: string, status: ProcessingStep['status'], progress: number) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, progress } : step
    ));
  }, []);

  // 📊 إحصائيات المعاينة
  const previewStats = useMemo(() => {
    if (!analysisResults.length) return null;

    const autoLinkable = analysisResults.filter(r => 
      r.bestMatch?.suggestedAction === 'auto_link'
    ).length;
    
    const needsReview = analysisResults.filter(r => 
      r.bestMatch?.suggestedAction === 'manual_review'
    ).length;
    
    const withLateFines = analysisResults.filter(r => 
      r.lateFineCalculation?.isApplicable
    ).length;
    
    const totalAmount = analysisResults.reduce((sum, r) => 
      sum + (r.originalPayment.amount || 0), 0
    );
    
    const totalFines = analysisResults.reduce((sum, r) => 
      sum + (r.lateFineCalculation?.cappedFine || 0), 0
    );

    return {
      total: analysisResults.length,
      autoLinkable,
      needsReview,
      withLateFines,
      totalAmount,
      totalFines
    };
  }, [analysisResults]);

  // 🎨 رندر خطوات المعالجة
  const renderProcessingSteps = () => (
    <div className="space-y-4">
      {processingSteps.map((step) => (
        <div key={step.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step.status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : step.status === 'processing' ? (
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              ) : step.status === 'error' ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              <div>
                <h4 className="font-medium">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
            <Badge variant={
              step.status === 'completed' ? 'default' :
              step.status === 'processing' ? 'secondary' :
              step.status === 'error' ? 'destructive' : 'outline'
            }>
              {step.status === 'completed' ? 'مكتمل' :
               step.status === 'processing' ? 'جاري المعالجة' :
               step.status === 'error' ? 'خطأ' : 'في الانتظار'}
            </Badge>
          </div>
          {step.status === 'processing' && (
            <Progress value={step.progress} className="h-2" />
          )}
        </div>
      ))}
    </div>
  );

  // 🎨 رندر جدول المعاينة
  const renderPreviewTable = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedItems.size === analysisResults.length}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedItems(new Set(analysisResults.map((_, index) => index)));
              } else {
                setSelectedItems(new Set());
              }
            }}
          />
          <span className="text-sm font-medium">
            تحديد الكل ({selectedItems.size}/{analysisResults.length})
          </span>
        </div>
        
        <Button
          onClick={handleProcessSelected}
          disabled={selectedItems.size === 0 || isGenerating}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isGenerating ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              معالجة {selectedItems.size} دفعة
            </>
          )}
        </Button>
      </div>

      <div className="max-h-96 overflow-y-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-right">اختيار</th>
              <th className="p-2 text-right">الوصف</th>
              <th className="p-2 text-right">العقد المقترح</th>
              <th className="p-2 text-right">الثقة</th>
              <th className="p-2 text-right">المبلغ</th>
              <th className="p-2 text-right">الغرامة</th>
              <th className="p-2 text-right">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {analysisResults.map((result, index) => (
              <tr key={index} className="border-b hover:bg-muted/50">
                <td className="p-2">
                  <Checkbox
                    checked={selectedItems.has(index)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedItems);
                      if (checked) {
                        newSelected.add(index);
                      } else {
                        newSelected.delete(index);
                      }
                      setSelectedItems(newSelected);
                    }}
                  />
                </td>
                <td className="p-2 max-w-xs truncate">
                  {result.originalPayment.description}
                </td>
                <td className="p-2">
                  {result.bestMatch ? (
                    <div className="text-xs">
                      <div className="font-medium">
                        {result.bestMatch.contract.contract_number}
                      </div>
                      <div className="text-muted-foreground">
                        {result.bestMatch.contract.customer?.full_name}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">غير محدد</span>
                  )}
                </td>
                <td className="p-2">
                  {result.bestMatch && (
                    <Badge variant={
                      result.bestMatch.suggestedAction === 'auto_link' ? 'default' :
                      result.bestMatch.suggestedAction === 'high_confidence' ? 'secondary' :
                      'outline'
                    }>
                      {result.bestMatch.totalScore}%
                    </Badge>
                  )}
                </td>
                <td className="p-2 font-medium">
                  {formatCurrency(result.originalPayment.amount || 0)}
                </td>
                <td className="p-2">
                  {result.lateFineCalculation?.isApplicable ? (
                    <span className="text-red-600 font-medium">
                      {formatCurrency(result.lateFineCalculation.cappedFine)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-2">
                  {result.bestMatch?.suggestedAction === 'auto_link' ? (
                    <Badge className="bg-green-100 text-green-800">تلقائي</Badge>
                  ) : result.bestMatch?.suggestedAction === 'manual_review' ? (
                    <Badge variant="outline">مراجعة</Badge>
                  ) : (
                    <Badge variant="destructive">رفض</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            النظام الذكي الفائق لربط المدفوعات بالعقود
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              رفع الملف
            </TabsTrigger>
            <TabsTrigger value="analyzing" disabled={!isAnalyzing && currentStep !== 'analyzing'}>
              <Brain className="h-4 w-4" />
              التحليل الذكي
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={currentStep !== 'preview'}>
              <Eye className="h-4 w-4" />
              المعاينة
            </TabsTrigger>
            <TabsTrigger value="processing" disabled={currentStep !== 'processing'}>
              <Zap className="h-4 w-4" />
              المعالجة
            </TabsTrigger>
            <TabsTrigger value="results" disabled={currentStep !== 'results'}>
              <TrendingUp className="h-4 w-4" />
              النتائج
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                النظام الذكي الفائق سيحلل ملف المدفوعات ويربطها تلقائياً بالعقود المناسبة مع إنشاء الفواتير والغرامات
              </AlertDescription>
            </Alert>
            
            <SmartCSVUpload
              onUpload={handleFileUpload}
              acceptedFileTypes={['.csv', '.xlsx', '.xls']}
              maxFileSize={10 * 1024 * 1024}
              expectedFields={[
                'amount', 'payment_date', 'description', 'due_date', 
                'agreement_number', 'late_fine_amount'
              ]}
            />
          </TabsContent>

          <TabsContent value="analyzing" className="space-y-4">
            <div className="text-center py-12">
              <Brain className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold mb-2">جاري التحليل الذكي...</h3>
              <p className="text-muted-foreground mb-4">
                النظام يحلل {uploadedData.length} دفعة ويطابقها مع العقود المتاحة
              </p>
              <LoadingSpinner size="lg" />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {previewStats && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{previewStats.total}</div>
                    <div className="text-xs text-muted-foreground">إجمالي الدفعات</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{previewStats.autoLinkable}</div>
                    <div className="text-xs text-muted-foreground">ربط تلقائي</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">{previewStats.needsReview}</div>
                    <div className="text-xs text-muted-foreground">تحتاج مراجعة</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{previewStats.withLateFines}</div>
                    <div className="text-xs text-muted-foreground">بها غرامات</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(previewStats.totalAmount, { minimumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-muted-foreground">إجمالي المبالغ</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(previewStats.totalFines, { minimumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-muted-foreground">إجمالي الغرامات</div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {renderPreviewTable()}
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <div className="text-center mb-6">
              <Zap className="h-16 w-16 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">جاري معالجة الدفعات...</h3>
              <p className="text-muted-foreground">
                يتم الآن ربط المدفوعات بالعقود وإنشاء الفواتير التلقائية
              </p>
            </div>
            
            {renderProcessingSteps()}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {finalResults && (
              <>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    تمت معالجة {finalResults.statistics.successful} من {finalResults.processedCount} دفعة بنجاح!
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {finalResults.statistics.paymentInvoices}
                      </div>
                      <div className="text-xs text-muted-foreground">فاتورة دفع</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-red-600">
                        {finalResults.statistics.lateFineInvoices}
                      </div>
                      <div className="text-xs text-muted-foreground">فاتورة غرامة</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(finalResults.statistics.totalAmount, { minimumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-muted-foreground">إجمالي المبالغ</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {finalResults.statistics.successful}/{finalResults.statistics.total}
                      </div>
                      <div className="text-xs text-muted-foreground">معدل النجاح</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-2">
                  <Button onClick={onUploadComplete} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    إنهاء والعودة للقائمة
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Download className="h-4 w-4 mr-2" />
                    طباعة التقرير
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
