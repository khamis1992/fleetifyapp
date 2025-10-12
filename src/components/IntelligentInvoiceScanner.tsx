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
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ocrEngine, setOcrEngine] = useState<'gemini' | 'google-vision' | 'hybrid'>('gemini');
  const [language, setLanguage] = useState<'auto' | 'arabic' | 'english'>('auto');
  const [activeTab, setActiveTab] = useState('upload');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
              <Zap className="h-3 w-3 mr-1" />
              AI-Powered
            </Badge>
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
              <Select value={ocrEngine} onValueChange={(value: any) => setOcrEngine(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini 2.5 Flash (الأفضل للخط اليدوي)</SelectItem>
                  <SelectItem value="google-vision">Google Vision API</SelectItem>
                  <SelectItem value="hybrid">هجين (أعلى دقة)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>لغة المعالجة</Label>
              <Select value={language} onValueChange={(value: any) => setLanguage(value)}>
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
        </CardContent>
      </Card>

      {/* Upload Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            رفع صورة
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
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
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

        <TabsContent value="camera">
          <Card>
            <CardContent className="pt-6">
              <Alert>
                <Camera className="h-4 w-4" />
                <AlertDescription>
                  ميزة الكاميرا ستكون متاحة قريباً. يرجى استخدام رفع الصورة حالياً.
                </AlertDescription>
              </Alert>
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
              <img
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