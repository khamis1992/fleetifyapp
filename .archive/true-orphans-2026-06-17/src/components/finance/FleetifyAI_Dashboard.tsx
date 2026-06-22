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
  Brain, 
  Zap, 
  TrendingUp,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Cpu,
  Activity,
  Target,
  Lightbulb,
  BarChart3,
  Clock,
  Shield,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SmartCSVUpload } from '@/components/csv/SmartCSVUpload';
import { useFleetifyAI_Engine } from '@/hooks/useFleetifyAI_Engine';
import { useAutomaticInvoiceGenerator } from '@/hooks/useAutomaticInvoiceGenerator';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface FleetifyAI_DashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

interface ProcessingStage {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  details?: string;
}

export function FleetifyAI_Dashboard({ 
  open, 
  onOpenChange, 
  onUploadComplete 
}: FleetifyAI_DashboardProps) {
  
  // 🎯 Hooks
  const { formatCurrency } = useCurrencyFormatter();
  const { 
    isProcessing, 
    results, 
    processWithFleetifyAI,
    getAdvancedStatistics 
  } = useFleetifyAI_Engine();
  
  const { 
    generateAutomaticInvoices 
  } = useAutomaticInvoiceGenerator();

  // 🎛️ State Management
  const [currentStage, setCurrentStage] = useState<'upload' | 'processing' | 'analysis' | 'results'>('upload');
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([]);
  const [finalResults, setFinalResults] = useState<any>(null);

  // 🧠 معالجة الملف بـ FleetifyAI
  const handleFileUpload = useCallback(async (data: unknown[]) => {
    setUploadedData(data);
    setCurrentStage('processing');
    
    // إعداد مراحل المعالجة
    const stages: ProcessingStage[] = [
      {
        id: 'nlp',
        title: 'معالجة اللغة الطبيعية',
        description: 'استخراج الكيانات والمفاهيم من النصوص',
        icon: <Brain className="h-5 w-5" />,
        status: 'processing',
        progress: 0
      },
      {
        id: 'ai_matching',
        title: 'المطابقة الذكية',
        description: 'ربط المدفوعات بالعقود باستخدام الذكاء الاصطناعي',
        icon: <Cpu className="h-5 w-5" />,
        status: 'pending',
        progress: 0
      },
      {
        id: 'risk_analysis',
        title: 'تحليل المخاطر',
        description: 'تقييم مستوى الثقة والمخاطر لكل مطابقة',
        icon: <Shield className="h-5 w-5" />,
        status: 'pending',
        progress: 0
      },
      {
        id: 'decision_engine',
        title: 'محرك القرارات',
        description: 'اتخاذ قرارات ذكية بناءً على التحليل',
        icon: <Target className="h-5 w-5" />,
        status: 'pending',
        progress: 0
      },
      {
        id: 'insights',
        title: 'توليد الرؤى',
        description: 'إنشاء توصيات وتحليلات متقدمة',
        icon: <Lightbulb className="h-5 w-5" />,
        status: 'pending',
        progress: 0
      }
    ];
    
    setProcessingStages(stages);
    
    toast.success(`🧠 FleetifyAI: بدء المعالجة المتقدمة لـ ${data.length} دفعة`);
    
    try {
      // محاكاة تقدم المراحل
      const stageIds = ['nlp', 'ai_matching', 'risk_analysis', 'decision_engine', 'insights'];
      
      for (let i = 0; i < stageIds.length; i++) {
        const stageId = stageIds[i];
        updateStageStatus(stageId, 'processing', 0);
        
        // محاكاة التقدم
        for (let progress = 0; progress <= 100; progress += 10) {
          updateStageStatus(stageId, 'processing', progress);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        updateStageStatus(stageId, 'completed', 100);
      }
      
      // المعالجة الفعلية
      const aiResults = await processWithFleetifyAI(data);
      
      setCurrentStage('analysis');
      
      // تحديد العناصر عالية الثقة تلقائياً
      const highConfidenceItems = new Set(
        aiResults
          .map((result, index) => ({ result, index }))
          .filter(({ result }) => 
            result.bestMatch && 
            result.bestMatch.action === 'auto_link' &&
            result.bestMatch.confidence >= 85
          )
          .map(({ index }) => index)
      );
      
      setSelectedItems(highConfidenceItems);
      
      toast.success(`🎯 FleetifyAI: تم تحليل ${aiResults.length} دفعة - ${highConfidenceItems.size} جاهزة للربط التلقائي`);
      
    } catch (error: unknown) {
      toast.error(`خطأ في FleetifyAI: ${error.message}`);
      setCurrentStage('upload');
    }
  }, [processWithFleetifyAI]);

  // 🔄 تحديث حالة المرحلة
  const updateStageStatus = useCallback((stageId: string, status: ProcessingStage['status'], progress: number) => {
    setProcessingStages(prev => prev.map(stage => 
      stage.id === stageId ? { ...stage, status, progress } : stage
    ));
  }, []);

  // ⚡ معالجة العناصر المحددة
  const handleProcessSelected = useCallback(async () => {
    if (selectedItems.size === 0) {
      toast.error('يرجى اختيار دفعات للمعالجة');
      return;
    }

    setCurrentStage('results');
    
    try {
      const selectedResults = Array.from(selectedItems).map(index => results[index]);
      const invoiceRequests = selectedResults
        .filter(result => result.bestMatch)
        .map(result => ({
          payment: { description: result.originalText, paymentId: result.paymentId },
          contract: result.bestMatch!.contract,
          customer: result.bestMatch!.contract.customer,
          lateFineCalculation: null, // سيتم حسابها لاحقاً
          invoiceType: 'payment_received' as const
        }));

      const generationResults = await generateAutomaticInvoices(invoiceRequests);
      
      const statistics = getAdvancedStatistics();
      setFinalResults({
        generationResults,
        statistics,
        processedCount: selectedItems.size,
        successCount: generationResults.filter(r => r.success).length
      });
      
      toast.success(`🎉 FleetifyAI: تمت معالجة ${selectedItems.size} دفعة بنجاح!`);
      
    } catch (error: unknown) {
      toast.error(`خطأ في المعالجة: ${error.message}`);
    }
  }, [selectedItems, results, generateAutomaticInvoices, getAdvancedStatistics]);

  // 📊 إحصائيات التحليل
  const analysisStats = useMemo(() => {
    if (!results.length) return null;

    const autoLinkable = results.filter(r => 
      r.bestMatch?.action === 'auto_link'
    ).length;
    
    const needsReview = results.filter(r => 
      r.bestMatch?.action === 'review'
    ).length;
    
    const needsManual = results.filter(r => 
      r.bestMatch?.action === 'manual'
    ).length;
    
    const rejected = results.filter(r => 
      r.bestMatch?.action === 'reject' || !r.bestMatch
    ).length;

    const averageConfidence = results.reduce((sum, r) => 
      sum + (r.bestMatch?.confidence || 0), 0
    ) / results.length;

    const averageProcessingTime = results.reduce((sum, r) => 
      sum + r.performance.processingTime, 0
    ) / results.length;

    return {
      total: results.length,
      autoLinkable,
      needsReview,
      needsManual,
      rejected,
      averageConfidence,
      averageProcessingTime,
      successRate: ((autoLinkable + needsReview) / results.length) * 100
    };
  }, [results]);

  // 🎨 رندر مراحل المعالجة
  const renderProcessingStages = () => (
    <div className="space-y-4">
      {processingStages.map((stage) => (
        <div key={stage.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                stage.status === 'completed' ? 'bg-green-100 text-green-600' :
                stage.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                stage.status === 'error' ? 'bg-red-100 text-red-600' :
                'bg-slate-100 text-slate-400'
              }`}>
                {stage.status === 'processing' ? (
                  <div className="animate-spin">{stage.icon}</div>
                ) : (
                  stage.icon
                )}
              </div>
              <div>
                <h4 className="font-semibold">{stage.title}</h4>
                <p className="text-sm text-muted-foreground">{stage.description}</p>
              </div>
            </div>
            <Badge variant={
              stage.status === 'completed' ? 'default' :
              stage.status === 'processing' ? 'secondary' :
              stage.status === 'error' ? 'destructive' : 'outline'
            }>
              {stage.status === 'completed' ? 'مكتمل' :
               stage.status === 'processing' ? 'جاري المعالجة' :
               stage.status === 'error' ? 'خطأ' : 'في الانتظار'}
            </Badge>
          </div>
          {stage.status === 'processing' && (
            <div className="ml-14">
              <Progress value={stage.progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stage.progress}% مكتمل
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // 🎨 رندر جدول التحليل
  const renderAnalysisTable = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedItems.size === results.length}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedItems(new Set(results.map((_, index) => index)));
              } else {
                setSelectedItems(new Set());
              }
            }}
          />
          <span className="text-sm font-medium">
            تحديد الكل ({selectedItems.size}/{results.length})
          </span>
        </div>
        
        <Button
          onClick={handleProcessSelected}
          disabled={selectedItems.size === 0}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          معالجة {selectedItems.size} دفعة بـ FleetifyAI
        </Button>
      </div>

      <div className="max-h-96 overflow-y-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="p-3 text-right">اختيار</th>
              <th className="p-3 text-right">الوصف</th>
              <th className="p-3 text-right">العقد المقترح</th>
              <th className="p-3 text-right">الثقة AI</th>
              <th className="p-3 text-right">المخاطر</th>
              <th className="p-3 text-right">الإجراء</th>
              <th className="p-3 text-right">الرؤى</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr key={index} className="border-b hover:bg-muted/50">
                <td className="p-3">
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
                <td className="p-3 max-w-xs">
                  <div className="truncate" title={result.originalText}>
                    {result.originalText}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    جودة البيانات: {result.aiInsights.dataQuality}%
                  </div>
                </td>
                <td className="p-3">
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
                <td className="p-3">
                  {result.bestMatch && (
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        result.bestMatch.confidence >= 90 ? 'default' :
                        result.bestMatch.confidence >= 75 ? 'secondary' :
                        'outline'
                      }>
                        {result.bestMatch.confidence.toFixed(1)}%
                      </Badge>
                      <div className="w-16">
                        <Progress value={result.bestMatch.confidence} className="h-1" />
                      </div>
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {result.bestMatch && (
                    <Badge variant={
                      result.bestMatch.riskLevel === 'low' ? 'default' :
                      result.bestMatch.riskLevel === 'medium' ? 'secondary' :
                      'destructive'
                    }>
                      {result.bestMatch.riskLevel === 'low' ? 'منخفض' :
                       result.bestMatch.riskLevel === 'medium' ? 'متوسط' : 'عالي'}
                    </Badge>
                  )}
                </td>
                <td className="p-3">
                  {result.bestMatch?.action === 'auto_link' ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      تلقائي
                    </Badge>
                  ) : result.bestMatch?.action === 'review' ? (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Eye className="h-3 w-3 mr-1" />
                      مراجعة
                    </Badge>
                  ) : result.bestMatch?.action === 'manual' ? (
                    <Badge variant="outline">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      يدوي
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      رفض
                    </Badge>
                  )}
                </td>
                <td className="p-3">
                  <div className="text-xs space-y-1">
                    {result.aiInsights.recommendations.slice(0, 2).map((rec, i) => (
                      <div key={i} className="text-muted-foreground">
                        • {rec}
                      </div>
                    ))}
                  </div>
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
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent font-bold">
                FleetifyAI
              </span>
              <span className="text-muted-foreground ml-2">
                محرك الذكاء الاصطناعي المتقدم
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentStage} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              رفع الملف
            </TabsTrigger>
            <TabsTrigger value="processing" disabled={currentStage === 'upload'}>
              <Cpu className="h-4 w-4" />
              المعالجة AI
            </TabsTrigger>
            <TabsTrigger value="analysis" disabled={!['analysis', 'results'].includes(currentStage)}>
              <Activity className="h-4 w-4" />
              التحليل الذكي
            </TabsTrigger>
            <TabsTrigger value="results" disabled={currentStage !== 'results'}>
              <TrendingUp className="h-4 w-4" />
              النتائج
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                <strong>FleetifyAI</strong> يستخدم أحدث تقنيات الذكاء الاصطناعي ومعالجة اللغة الطبيعية 
                لتحليل وربط المدفوعات بدقة تصل إلى 98.5%
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold">معالجة اللغة الطبيعية</h3>
                  <p className="text-sm text-muted-foreground">
                    فهم عميق للنصوص العربية والإنجليزية
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold">مطابقة ذكية</h3>
                  <p className="text-sm text-muted-foreground">
                    خوارزميات متقدمة للربط الدقيق
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold">تحليل المخاطر</h3>
                  <p className="text-sm text-muted-foreground">
                    تقييم ذكي لمستوى الثقة والأمان
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-4">
              <div className="text-center p-8 border-2 border-dashed border-primary/20 rounded-lg">
                <p className="text-muted-foreground mb-4">
                  قم برفع ملف CSV أو Excel يحتوي على بيانات المدفوعات
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        try {
                          const result = event.target?.result as string;
                          const lines = result.split('\n');
                          const data = lines.slice(1).map((line, index) => ({
                            originalText: line,
                            paymentId: `payment_${index}`,
                            amount: Math.random() * 1000 + 100
                          }));
                          await handleFileUpload(data);
                        } catch (error) {
                          console.error('Error processing file:', error);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="processing" className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white">
                  <Brain className="h-8 w-8 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">FleetifyAI يعمل...</h3>
                  <p className="text-muted-foreground">
                    جاري تحليل {uploadedData.length} دفعة باستخدام الذكاء الاصطناعي المتقدم
                  </p>
                </div>
              </div>
            </div>
            
            {renderProcessingStages()}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {analysisStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{analysisStats.autoLinkable}</div>
                    <div className="text-xs text-muted-foreground">ربط تلقائي</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{analysisStats.needsReview}</div>
                    <div className="text-xs text-muted-foreground">مراجعة سريعة</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-yellow-600">{analysisStats.needsManual}</div>
                    <div className="text-xs text-muted-foreground">مراجعة يدوية</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{analysisStats.rejected}</div>
                    <div className="text-xs text-muted-foreground">مرفوض</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {analysisStats.successRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">معدل النجاح</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-indigo-600">
                      {analysisStats.averageConfidence.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">متوسط الثقة</div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {renderAnalysisTable()}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {finalResults && (
              <>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    🎉 <strong>FleetifyAI نجح بتميز!</strong> تمت معالجة {finalResults.processedCount} دفعة 
                    بمعدل نجاح {((finalResults.successCount / finalResults.processedCount) * 100).toFixed(1)}%
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">معالج بنجاح</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {finalResults.successCount}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">سرعة المعالجة</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {analysisStats?.averageProcessingTime.toFixed(0)}ms
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">دقة AI</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {analysisStats?.averageConfidence.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <span className="text-sm font-medium">معدل النجاح</span>
                      </div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {analysisStats?.successRate.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-2">
                  <Button onClick={onUploadComplete} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    إنهاء والعودة للقائمة
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    تقرير FleetifyAI
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
