/**
 * واجهة الرفع الذكية مع التحليل المسبق والإصلاح التلقائي
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  Zap,
  Eye,
  Settings,
  Download,
  Upload,
  Loader2,
  FileText,
  TrendingUp
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

import { analyzeFileIntelligently, type FileAnalysisResult } from '@/utils/smartFileAnalyzer';
import { useSmartValidation, type ValidationResult } from '@/hooks/useSmartValidation';
import { useBulkPaymentOperations } from '@/hooks/useBulkPaymentOperations';
import { useToast } from '@/hooks/use-toast';

interface SmartUploadInterfaceProps {
  onUploadComplete?: (result: any) => void;
  downloadTemplate?: () => void;
}

export const SmartUploadInterface: React.FC<SmartUploadInterfaceProps> = ({
  onUploadComplete,
  downloadTemplate
}) => {
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysisResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyze' | 'validate' | 'review' | 'process'>('upload');
  
  // إعدادات الذكاء الاصطناعي
  const [aiSettings, setAiSettings] = useState({
    autoFix: true,
    strictMode: false,
    learnFromErrors: true,
    smartSuggestions: true
  });

  const { validateData } = useSmartValidation();
  const { bulkUploadPayments, isProcessing, progress } = useBulkPaymentOperations();
  const { toast } = useToast();

  /**
   * معالجة رفع الملف والتحليل
   */
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setIsAnalyzing(true);
    setCurrentStep('analyze');
    
    try {
      // 1. تحليل الملف
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            // تحليل ذكي للملف
            const analysis = await analyzeFileIntelligently(file, results.data);
            setFileAnalysis(analysis);
            setParsedData(results.data);
            
            if (analysis.confidence > 70) {
              // المتابعة للتحقق الذكي
              setCurrentStep('validate');
              await performSmartValidation(results.data, analysis);
            } else {
              toast({
                title: "تحذير",
                description: `مستوى الثقة في الملف منخفض (${analysis.confidence}%). يرجى مراجعة المشاكل المكتشفة.`,
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error('Error in file analysis:', error);
            toast({
              title: "خطأ في التحليل",
              description: "حدث خطأ أثناء تحليل الملف",
              variant: "destructive",
            });
          } finally {
            setIsAnalyzing(false);
          }
        },
        error: (error) => {
          console.error('Parse error:', error);
          toast({
            title: "خطأ في قراءة الملف",
            description: "تعذر قراءة الملف. تأكد من أنه ملف CSV صحيح.",
            variant: "destructive",
          });
          setIsAnalyzing(false);
        }
      });
    } catch (error) {
      console.error('File processing error:', error);
      setIsAnalyzing(false);
    }
  }, [toast]);

  /**
   * تنفيذ التحقق الذكي
   */
  const performSmartValidation = async (data: any[], analysis: FileAnalysisResult) => {
    try {
      const validation = await validateData(data, {
        autoFix: aiSettings.autoFix,
        strictMode: aiSettings.strictMode,
        requiredFields: ['amount', 'payment_date']
      });
      
      setValidationResult(validation);
      setCurrentStep('review');
      
      if (validation.isValid && validation.confidence > 80) {
        toast({
          title: "التحقق مكتمل",
          description: `البيانات صحيحة. تم إصلاح ${validation.autoFixedItems.length} عنصر تلقائياً.`,
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "خطأ في التحقق",
        description: "حدث خطأ أثناء التحقق من البيانات",
        variant: "destructive",
      });
    }
  };

  /**
   * تنفيذ الرفع الذكي
   */
  const handleSmartUpload = async () => {
    if (!parsedData.length || !validationResult) return;
    
    setIsUploading(true);
    setCurrentStep('process');
    
    try {
      const result = await bulkUploadPayments(parsedData, {
        autoCreateCustomers: true,
        skipValidation: false,
        batchSize: 50
      });
      
      toast({
        title: "تم الرفع بنجاح",
        description: `تم رفع ${result.successful} دفعة بنجاح`,
      });
      
      onUploadComplete?.(result);
      
      // إعادة تعيين المكونات
      resetInterface();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "خطأ في الرفع",
        description: "حدث خطأ أثناء رفع البيانات",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * إعادة تعيين الواجهة
   */
  const resetInterface = () => {
    setFileAnalysis(null);
    setValidationResult(null);
    setParsedData([]);
    setCurrentStep('upload');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  return (
    <div className="space-y-6">
      {/* شريط التقدم */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            نظام الرفع الذكي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            {['upload', 'analyze', 'validate', 'review', 'process'].map((step, index) => (
              <div
                key={step}
                className={`flex items-center ${
                  currentStep === step ? 'text-primary' : 
                  ['upload', 'analyze', 'validate', 'review', 'process'].indexOf(currentStep) > index ? 'text-green-600' : 'text-muted-foreground'
                }`}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                  currentStep === step ? 'border-primary bg-primary text-primary-foreground' :
                  ['upload', 'analyze', 'validate', 'review', 'process'].indexOf(currentStep) > index ? 'border-green-600 bg-green-600 text-white' : 'border-muted-foreground'
                }`}>
                  {['upload', 'analyze', 'validate', 'review', 'process'].indexOf(currentStep) > index ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 4 && <div className="w-12 h-0.5 bg-muted-foreground mx-2" />}
              </div>
            ))}
          </div>
          <Progress value={(['upload', 'analyze', 'validate', 'review', 'process'].indexOf(currentStep) + 1) * 20} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* قسم الرفع والإعدادات */}
        <div className="lg:col-span-1 space-y-4">
          {/* منطقة رفع الملف */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                رفع الملف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground'
                }`}
              >
                <input {...getInputProps()} />
                {isAnalyzing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>جاري التحليل الذكي...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <p>اسحب ملف CSV هنا أو انقر للاختيار</p>
                    <p className="text-sm text-muted-foreground">
                      يدعم CSV, Excel (.xls, .xlsx)
                    </p>
                  </div>
                )}
              </div>
              
              {downloadTemplate && (
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="w-full mt-4"
                >
                  <Download className="h-4 w-4 mr-2" />
                  تحميل النموذج
                </Button>
              )}
            </CardContent>
          </Card>

          {/* إعدادات الذكاء الاصطناعي */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                إعدادات الذكاء الاصطناعي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-fix">الإصلاح التلقائي</Label>
                <Switch
                  id="auto-fix"
                  checked={aiSettings.autoFix}
                  onCheckedChange={(checked) => 
                    setAiSettings(prev => ({ ...prev, autoFix: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="strict-mode">الوضع الصارم</Label>
                <Switch
                  id="strict-mode"
                  checked={aiSettings.strictMode}
                  onCheckedChange={(checked) => 
                    setAiSettings(prev => ({ ...prev, strictMode: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="learn-errors">التعلم من الأخطاء</Label>
                <Switch
                  id="learn-errors"
                  checked={aiSettings.learnFromErrors}
                  onCheckedChange={(checked) => 
                    setAiSettings(prev => ({ ...prev, learnFromErrors: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="smart-suggestions">الاقتراحات الذكية</Label>
                <Switch
                  id="smart-suggestions"
                  checked={aiSettings.smartSuggestions}
                  onCheckedChange={(checked) => 
                    setAiSettings(prev => ({ ...prev, smartSuggestions: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* قسم النتائج والتحليل */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="analysis">تحليل الملف</TabsTrigger>
              <TabsTrigger value="validation">نتائج التحقق</TabsTrigger>
              <TabsTrigger value="preview">معاينة البيانات</TabsTrigger>
              <TabsTrigger value="actions">الإجراءات</TabsTrigger>
            </TabsList>

            {/* تحليل الملف */}
            <TabsContent value="analysis">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    تحليل الملف الذكي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {fileAnalysis ? (
                    <div className="space-y-4">
                      {/* مؤشرات الثقة */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {fileAnalysis.confidence}%
                          </div>
                          <div className="text-sm text-muted-foreground">مستوى الثقة</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {fileAnalysis.rowCount}
                          </div>
                          <div className="text-sm text-muted-foreground">صف</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {fileAnalysis.columnCount}
                          </div>
                          <div className="text-sm text-muted-foreground">عمود</div>
                        </div>
                      </div>

                      <Separator />

                      {/* المشاكل المكتشفة */}
                      {fileAnalysis.potentialIssues.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">المشاكل المكتشفة</h4>
                          <ScrollArea className="h-40">
                            <div className="space-y-2">
                              {fileAnalysis.potentialIssues.map((issue, index) => (
                                <Alert key={index} variant={issue.severity === 'critical' ? 'destructive' : 'default'}>
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>
                                    <div className="flex items-center justify-between">
                                      <span>{issue.messageAr}</span>
                                      <Badge variant={issue.autoFixable ? 'default' : 'destructive'}>
                                        {issue.autoFixable ? 'قابل للإصلاح' : 'يحتاج تدخل يدوي'}
                                      </Badge>
                                    </div>
                                  </AlertDescription>
                                </Alert>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* الاقتراحات */}
                      {fileAnalysis.suggestions.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">الاقتراحات</h4>
                          <ul className="space-y-1">
                            {fileAnalysis.suggestions.map((suggestion, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                                <CheckCircle className="h-3 w-3" />
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      قم برفع ملف لبدء التحليل الذكي
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* نتائج التحقق */}
            <TabsContent value="validation">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    نتائج التحقق الذكي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {validationResult ? (
                    <div className="space-y-4">
                      {/* مؤشرات النتائج */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${validationResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                            {validationResult.isValid ? <CheckCircle className="h-8 w-8 mx-auto" /> : <XCircle className="h-8 w-8 mx-auto" />}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {validationResult.isValid ? 'صحيح' : 'يحتاج إصلاح'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {validationResult.errors.length}
                          </div>
                          <div className="text-sm text-muted-foreground">أخطاء</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {validationResult.warnings.length}
                          </div>
                          <div className="text-sm text-muted-foreground">تحذيرات</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {validationResult.autoFixedItems.length}
                          </div>
                          <div className="text-sm text-muted-foreground">إصلاحات تلقائية</div>
                        </div>
                      </div>

                      <Separator />

                      {/* الأخطاء */}
                      {validationResult.errors.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">الأخطاء</h4>
                          <ScrollArea className="h-40">
                            <div className="space-y-2">
                              {validationResult.errors.map((error) => (
                                <Alert key={error.id} variant="destructive">
                                  <XCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    <div className="flex items-center justify-between">
                                      <span>صف {error.row}: {error.messageAr}</span>
                                      <Badge variant={error.canAutoFix ? 'default' : 'destructive'}>
                                        {error.canAutoFix ? 'قابل للإصلاح' : 'يدوي'}
                                      </Badge>
                                    </div>
                                  </AlertDescription>
                                </Alert>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* الإصلاحات التلقائية */}
                      {validationResult.autoFixedItems.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">الإصلاحات التلقائية</h4>
                          <ScrollArea className="h-32">
                            <div className="space-y-2">
                              {validationResult.autoFixedItems.map((fix) => (
                                <div key={fix.id} className="text-sm p-2 bg-green-50 rounded border">
                                  <div className="flex items-center justify-between">
                                    <span>صف {fix.row}, {fix.field}</span>
                                    <Badge variant="outline">{Math.round(fix.confidence * 100)}% ثقة</Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {String(fix.originalValue)} → {String(fix.fixedValue)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      لم يتم التحقق من البيانات بعد
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* معاينة البيانات */}
            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    معاينة البيانات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {parsedData.length > 0 ? (
                    <ScrollArea className="h-96">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              {Object.keys(parsedData[0] || {}).map((header) => (
                                <th key={header} className="text-left p-2 font-medium">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsedData.slice(0, 10).map((row, index) => (
                              <tr key={index} className="border-b">
                                {Object.values(row).map((value, cellIndex) => (
                                  <td key={cellIndex} className="p-2">
                                    {String(value || '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {parsedData.length > 10 && (
                        <div className="text-center text-sm text-muted-foreground mt-4">
                          عرض 10 من {parsedData.length} صف
                        </div>
                      )}
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      لا توجد بيانات للمعاينة
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* الإجراءات */}
            <TabsContent value="actions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    الإجراءات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentStep === 'process' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>جاري المعالجة...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSmartUpload}
                      disabled={!validationResult?.isValid || isUploading || isProcessing}
                      className="flex-1"
                    >
                      {isUploading || isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          رفع ذكي
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={resetInterface}
                      disabled={isUploading || isProcessing}
                    >
                      إعادة تعيين
                    </Button>
                  </div>
                  
                  {validationResult?.suggestions && validationResult.suggestions.length > 0 && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-2">اقتراحات ذكية</h4>
                      <ul className="space-y-1 text-sm">
                        {validationResult.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-blue-600" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};