/**
 * Intelligent Invoice Scanner Component
 * Advanced OCR with Arabic/English handwriting support and fuzzy matching
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { preprocessImage, quickPreprocess, analyzeImage } from '@/utils/imagePreprocessing';
import { LazyImage } from '@/components/common/LazyImage';
import EnhancedMobileCamera from './EnhancedMobileCamera';
import { useBackgroundQueue } from '@/utils/backgroundProcessingQueue';
import { useFleetifyTranslation } from "@/hooks/useTranslation";
import { 
  Camera, 
  Upload, 
  FileText, 
  Zap, 
  Check, 
  AlertTriangle, 
  Eye, 
  User, 
  Car, 
  Calendar,
  DollarSign,
  Brain,
  Languages,
  Target,
  Clock,
  Settings
} from 'lucide-react';

interface ScanResult {
  id: string;
  data: {
    invoice_number?: string;
    invoice_date?: string;
    customer_name?: string;
    contract_number?: string;
    car_number?: string;
    total_amount?: number;
    payment_period?: string;
    notes?: string;
    language_detected?: string;
    raw_text?: string;
  };
  matching: {
    best_match?: {
      id: string;
      name: string;
      phone?: string;
      car_number?: string;
      confidence: number;
      match_reasons: string[];
    };
    all_matches: any[];
    total_confidence: number;
    name_similarity: number;
    car_match_score: number;
    context_match_score: number;
  };
  processing_info: {
    ocr_engine: string;
    language_detected: string;
    ocr_confidence: number;
  };
}

interface InvoiceScannerProps {
  onScanComplete?: (result: ScanResult) => void;
  className?: string;
}

const IntelligentInvoiceScanner: React.FC<InvoiceScannerProps> = ({ 
  onScanComplete, 
  className = "" 
}) => {
  const { t } = useFleetifyTranslation("ui");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ocrEngine, setOcrEngine] = useState<'gemini' | 'google-vision' | 'hybrid'>('gemini');
  const [language, setLanguage] = useState<'auto' | 'arabic' | 'english'>('auto');
  const [activeTab, setActiveTab] = useState('upload');
  const [enablePreprocessing, setEnablePreprocessing] = useState(true);
  const [preprocessingOptions, setPreprocessingOptions] = useState({
    enhanceContrast: true,
    reduceNoise: true,
    sharpenText: true,
    normalizeSize: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { addJob, getJob, getJobs, getStatistics } = useBackgroundQueue();

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "خطأ في نوع الملف",
        description: "يرجى اختيار ملف صورة صالح",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setProgress(0);

    try {
      let processedFile = file;
      let improvements: string[] = [];
      
      // Apply preprocessing if enabled
      if (enablePreprocessing) {
        toast({
          title: "تحسين الصورة",
          description: "جاري تحسين جودة الصورة لدقة أفضل...",
          variant: "default"
        });
        
        try {
          const result = await preprocessImage(file, preprocessingOptions);
          processedFile = result.processedFile;
          improvements = result.improvements;
          
          console.log('Image preprocessing completed:', {
            originalSize: result.originalSize,
            processedSize: result.processedSize,
            improvements: result.improvements
          });
        } catch (error) {
          console.warn('Image preprocessing failed, using original:', error);
        }
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setSelectedImage(base64);
        
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 10, 90));
        }, 500);

        try {
          // Call OCR Edge Function
          const { data, error } = await supabase.functions.invoke('scan-invoice', {
            body: {
              imageBase64: base64,
              fileName: file.name,
              ocrEngine,
              language
            }
          });

          clearInterval(progressInterval);
          setProgress(100);

          if (error) {
            throw new Error(error.message || 'OCR processing failed');
          }

          if (data.success) {
            const result: ScanResult = {
              id: Date.now().toString(),
              data: data.data,
              matching: data.matching || {
                all_matches: [],
                total_confidence: 0,
                name_similarity: 0,
                car_match_score: 0,
                context_match_score: 0
              },
              processing_info: data.data.processing_info || {
                ocr_engine: ocrEngine,
                language_detected: language,
                ocr_confidence: 0
              }
            };

            setScanResult(result);
            onScanComplete?.(result);

            toast({
              title: "تم المسح بنجاح",
              description: `تم استخراج البيانات بثقة ${result.processing_info.ocr_confidence}%`,
              variant: "default"
            });
          } else {
            throw new Error('Failed to process invoice');
          }

        } catch (error) {
          clearInterval(progressInterval);
          console.error('Error scanning invoice:', error);
          toast({
            title: "خطأ في المسح",
            description: error instanceof Error ? error.message : "فشل في معالجة الصورة",
            variant: "destructive"
          });
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error preparing file:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحضير الصورة للمعالجة",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  }, [ocrEngine, language, toast, onScanComplete]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleBulkUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    // Limit to 10 files maximum
    const limitedFiles = files.slice(0, 10);
    
    toast({
      title: t("bulkProcessingStarted"),
      description: `Adding ${limitedFiles.length} invoices to background processing queue`,
      variant: "default"
    });

    // Convert files to base64 and add to background queue
    const filePromises = limitedFiles.map(async (file) => {
      return new Promise<{ name: string; base64: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: file.name,
            base64: e.target?.result as string
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    try {
      const processedFiles = await Promise.all(filePromises);
      
      // Add batch job to background queue
      const jobId = addJob('batch_scan', {
        files: processedFiles,
        options: {
          ocrEngine,
          language
        }
      }, 'high');

      toast({
        title: t("batchJobCreated"),
        description: `Job ID: ${jobId}. Processing in background...`,
        variant: "default"
      });

      // Set up progress monitoring
      const monitorInterval = setInterval(() => {
        const job = getJob(jobId);
        if (job) {
          if (job.status === 'completed') {
            clearInterval(monitorInterval);
            toast({
              title: "Batch Processing Complete",
              description: `Successfully processed batch job`,
              variant: "default"
            });
          } else if (job.status === 'failed') {
            clearInterval(monitorInterval);
            toast({
              title: t("batchProcessingFailed"),
              description: job.error || 'Unknown error occurred',
              variant: "destructive"
            });
          }
        }
      }, 2000);

      // Clear monitoring after 10 minutes
      setTimeout(() => clearInterval(monitorInterval), 10 * 60 * 1000);
      
    } catch (error) {
      toast({
        title: t("errorProcessingFiles"),
        description: error instanceof Error ? error.message : 'Failed to process files',
        variant: "destructive"
      });
    }
  };

  const processInvoiceFile = async (file: File) => {
    // Individual file processing logic
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setSelectedImage(base64);
        
        try {
          const { data, error } = await supabase.functions.invoke('scan-invoice', {
            body: {
              imageBase64: base64,
              fileName: file.name,
              ocrEngine,
              language
            }
          });

          if (error) {
            reject(new Error(error.message || 'OCR processing failed'));
            return;
          }

          if (data.success) {
            const result = {
              id: Date.now().toString() + Math.random(),
              data: data.data,
              matching: data.matching || {
                all_matches: [],
                total_confidence: 0,
                name_similarity: 0,
                car_match_score: 0,
                context_match_score: 0
              },
              processing_info: data.data.processing_info || {
                ocr_engine: ocrEngine,
                language_detected: language,
                ocr_confidence: 0
              }
            };
            resolve(result);
          } else {
            reject(new Error('Failed to process invoice'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-100 text-green-800';
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            ماسح الفواتير الذكي
            <Badge variant="secondary" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />{t("aipowered")}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            مسح ذكي للفواتير المكتوبة باليد أو المطبوعة بالعربية والإنجليزية مع تطابق تلقائي للعملاء
          </p>
        </CardHeader>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            إعدادات المسح
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>محرك التعرف الضوئي</Label>
              <Select value={ocrEngine} onValueChange={(value: unknown) => setOcrEngine(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini 2.5 Flash (الأفضل للخط اليدوي)</SelectItem>
                  <SelectItem value="google-vision">{t("googleVisionApi")}</SelectItem>
                  <SelectItem value="hybrid">هجين (أعلى دقة)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>لغة المعالجة</Label>
              <Select value={language} onValueChange={(value: unknown) => setLanguage(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">تلقائي</SelectItem>
                  <SelectItem value="arabic">العربية</SelectItem>
                  <SelectItem value="english">الإنجليزية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Image Preprocessing Settings */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-blue-900">📷 تحسين جودة الصورة</h4>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-preprocessing"
                  checked={enablePreprocessing}
                  onChange={(e) => setEnablePreprocessing(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="enable-preprocessing" className="text-sm font-medium">
                  تفعيل التحسين التلقائي
                </label>
              </div>
            </div>
            
            {enablePreprocessing && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preprocessingOptions.enhanceContrast}
                    onChange={(e) => setPreprocessingOptions(prev => ({ ...prev, enhanceContrast: e.target.checked }))}
                    className="rounded"
                  />
                  <span>تحسين التباين</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preprocessingOptions.sharpenText}
                    onChange={(e) => setPreprocessingOptions(prev => ({ ...prev, sharpenText: e.target.checked }))}
                    className="rounded"
                  />
                  <span>توضيح النص</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preprocessingOptions.reduceNoise}
                    onChange={(e) => setPreprocessingOptions(prev => ({ ...prev, reduceNoise: e.target.checked }))}
                    className="rounded"
                  />
                  <span>إزالة التشويش</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preprocessingOptions.normalizeSize}
                    onChange={(e) => setPreprocessingOptions(prev => ({ ...prev, normalizeSize: e.target.checked }))}
                    className="rounded"
                  />
                  <span>تطبيع الحجم</span>
                </label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            رفع صورة
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            رفع متعدد
          </TabsTrigger>
          <TabsTrigger value="camera" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            التقاط بالكاميرا
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardContent className="pt-6">
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium mb-2">اسحب وأفلت صورة الفاتورة هنا</p>
                <p className="text-sm text-muted-foreground mb-4">
                  أو انقر لاختيار ملف (PNG, JPG, JPEG)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Button variant="outline" className="mt-2">
                  اختيار صورة
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardContent className="pt-6">
              <div
                className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer bg-orange-50"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) {
                      handleBulkUpload(Array.from(files));
                    }
                  };
                  input.click();
                }}
              >
                <FileText className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                <p className="text-lg font-medium mb-2">رفع عدة فواتير معاً</p>
                <p className="text-sm text-muted-foreground mb-4">
                  اختر عدة صور لمعالجتها في دفعة واحدة
                </p>
                <Button variant="outline" className="mt-2 border-orange-500 text-orange-700 hover:bg-orange-100">
                  <FileText className="h-4 w-4 mr-2" />
                  اختيار عدة صور
                </Button>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2 text-blue-900">🚀 ميزات المعالجة المتعددة:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• معالجة حتى 10 فواتير في نفس الوقت</li>
                  <li>• عرض تقدم شريط موحد لجميع الفواتير</li>
                  <li>• تجميع النتائج وعرضها في جدول واحد</li>
                  <li>• حفظ تلقائي للفواتير عالية الثقة</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="camera">
          <Card>
            <CardContent className="pt-6">
              <EnhancedMobileCamera 
                onImageCapture={handleImageUpload}
                isProcessing={isScanning}
                enablePreprocessing={enablePreprocessing}
                preprocessingOptions={preprocessingOptions}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Processing Progress */}
      {isScanning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 animate-spin" />
                <span className="font-medium">جاري معالجة الصورة...</span>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="text-sm text-muted-foreground text-center">
                {progress < 30 && "تحليل الصورة..."}
                {progress >= 30 && progress < 60 && "استخراج النص بالذكاء الاصطناعي..."}
                {progress >= 60 && progress < 90 && "البحث عن تطابقات العملاء..."}
                {progress >= 90 && "جاري الانتهاء..."}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Image Preview */}
      {selectedImage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5" />
              معاينة الصورة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <LazyImage
                src={selectedImage}
                alt="Invoice preview"
                className="max-w-full max-h-96 rounded-lg shadow-lg"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Results */}
      {scanResult && (
        <div className="space-y-6">
          {/* Confidence Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                نتائج المسح والتطابق
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getConfidenceColor(scanResult.processing_info.ocr_confidence)}`}>
                    {scanResult.processing_info.ocr_confidence}%
                  </div>
                  <div className="text-sm text-muted-foreground">دقة التعرف الضوئي</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getConfidenceColor(scanResult.matching.total_confidence)}`}>
                    {Math.round(scanResult.matching.total_confidence)}%
                  </div>
                  <div className="text-sm text-muted-foreground">دقة التطابق</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getConfidenceColor(scanResult.matching.name_similarity)}`}>
                    {scanResult.matching.name_similarity}%
                  </div>
                  <div className="text-sm text-muted-foreground">تطابق الاسم</div>
                </div>
                <div className="text-center">
                  <Badge className={getConfidenceBadge(scanResult.matching.total_confidence)}>
                    {scanResult.matching.total_confidence >= 85 ? 'تلقائي' : 
                     scanResult.matching.total_confidence >= 70 ? 'يحتاج مراجعة' : 'مراجعة يدوية'}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">الحالة</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extracted Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                البيانات المستخرجة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scanResult.data.customer_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">اسم العميل:</span>
                    <span>{scanResult.data.customer_name}</span>
                  </div>
                )}
                {scanResult.data.car_number && (
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-green-500" />
                    <span className="font-medium">رقم المركبة:</span>
                    <span>{scanResult.data.car_number}</span>
                  </div>
                )}
                {scanResult.data.total_amount && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">المبلغ:</span>
                    <span>{scanResult.data.total_amount} د.ك</span>
                  </div>
                )}
                {scanResult.data.invoice_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">تاريخ الفاتورة:</span>
                    <span>{scanResult.data.invoice_date}</span>
                  </div>
                )}
                {scanResult.data.language_detected && (
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-red-500" />
                    <span className="font-medium">اللغة المكتشفة:</span>
                    <span>{scanResult.data.language_detected}</span>
                  </div>
                )}
              </div>

              {scanResult.data.notes && (
                <div className="mt-4">
                  <Label className="font-medium">ملاحظات:</Label>
                  <Textarea 
                    value={scanResult.data.notes} 
                    readOnly 
                    className="mt-1 resize-none h-20"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Best Match */}
          {scanResult.matching.best_match && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  أفضل تطابق مقترح
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{scanResult.matching.best_match.name}</h3>
                    <Badge className={getConfidenceBadge(scanResult.matching.best_match.confidence)}>
                      {scanResult.matching.best_match.confidence}% ثقة
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {scanResult.matching.best_match.phone && (
                      <p><span className="font-medium">الهاتف:</span> {scanResult.matching.best_match.phone}</p>
                    )}
                    {scanResult.matching.best_match.car_number && (
                      <p><span className="font-medium">رقم المركبة:</span> {scanResult.matching.best_match.car_number}</p>
                    )}
                    <div>
                      <span className="font-medium">أسباب التطابق:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {scanResult.matching.best_match.match_reasons.map((reason, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                {scanResult.matching.total_confidence >= 85 ? (
                  <Button className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    تأكيد التطابق التلقائي
                  </Button>
                ) : (
                  <Button variant="outline" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    مراجعة يدوية مطلوبة
                  </Button>
                )}
                <Button variant="outline">
                  عرض جميع التطابقات ({scanResult.matching.all_matches.length})
                </Button>
                <Button variant="secondary">
                  إعادة المسح
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default IntelligentInvoiceScanner;