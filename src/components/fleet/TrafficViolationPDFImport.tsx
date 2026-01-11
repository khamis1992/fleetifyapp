import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Save,
  X,
  Car,
  MapPin,
  Calendar,
  DollarSign,
  Hash,
  Building,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useVehicles } from '@/hooks/useVehicles';
import { PDFViewer } from './PDFViewer';
import { TrafficViolationStats } from './TrafficViolationStats';
import { ViolationImportReport } from './ViolationImportReport';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as pdfjsLib from 'pdfjs-dist';

// تهيئة PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface ExtractedViolation {
  id: string;
  violationNumber: string;
  date: string;
  time?: string;
  plateNumber: string;
  location: string;
  authority: string;
  fineAmount: number;
  points: number;
  violationType: string;
  status: 'extracted' | 'matched' | 'error';
  vehicleId?: string;
  errors: string[];
}

interface ProcessingResult {
  totalExtracted: number;
  successfulMatches: number;
  errors: number;
  violations: ExtractedViolation[];
}

export const TrafficViolationPDFImport: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [selectedViolations, setSelectedViolations] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const { data: vehicles = [] } = useVehicles();

  // استخراج النص من PDF باستخدام pdf.js
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    console.log(`📄 استخراج النص من PDF: ${pdf.numPages} صفحة`);
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
      console.log(`✅ صفحة ${pageNum}: ${pageText.length} حرف`);
    }
    
    return fullText.trim();
  };

  // تحويل PDF إلى صور (fallback إذا فشل استخراج النص)
  const convertPDFToImages = async (file: File): Promise<File[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: File[] = [];
    
    console.log(`📄 تحويل PDF إلى صور: ${pdf.numPages} صفحة`);
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const scale = 2;
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png', 0.95);
      });
      
      const imageFile = new File(
        [blob], 
        `${file.name.replace('.pdf', '')}_page_${pageNum}.png`,
        { type: 'image/png' }
      );
      images.push(imageFile);
    }
    
    return images;
  };

  // استخراج البيانات من الملف
  const extractDataFromPDF = async (file: File): Promise<ExtractedViolation[]> => {
    try {
      const allViolations: ExtractedViolation[] = [];
      
      // إذا كان الملف PDF
      if (file.type === 'application/pdf') {
        toast({
          title: '📄 قراءة ملف PDF...',
          description: 'يتم استخراج النص من الملف',
        });
        
        // محاولة استخراج النص أولاً (أسرع وأرخص)
        let pdfText = '';
        try {
          pdfText = await extractTextFromPDF(file);
          console.log(`📝 تم استخراج ${pdfText.length} حرف من PDF`);
        } catch (textError) {
          console.error('Error extracting text from PDF:', textError);
        }
        
        // إذا وجدنا نص كافٍ، نرسله مباشرة للتحليل
        if (pdfText.length > 50) {
          toast({
            title: '✅ تم قراءة النص',
            description: `تم استخراج ${pdfText.length} حرف - جاري التحليل...`,
          });
          
          console.log('📤 إرسال النص للتحليل...');
          const { data, error } = await supabase.functions.invoke('extract-traffic-violations', {
            body: { 
              text: pdfText,
              source: file.name
            }
          });
          
          if (error) {
            console.error('Error from text analysis:', error);
            // إذا فشل، نحاول الطريقة البديلة (صور)
            throw new Error('FALLBACK_TO_IMAGES');
          }
          
          if (!data?.success) {
            if (data?.error === 'PDF_NO_TEXT') {
              throw new Error('FALLBACK_TO_IMAGES');
            }
            throw new Error(data?.details || 'فشل في تحليل النص');
          }
          
          // تحويل البيانات المستخرجة
          const violations = processViolationsData(data.violations, allViolations.length);
          return matchViolationsWithVehicles(violations);
          
        } else {
          // النص غير كافٍ، نستخدم الصور
          console.log('⚠️ النص غير كافٍ، التحويل للصور...');
          throw new Error('FALLBACK_TO_IMAGES');
        }
        
      } else {
        // ملف صورة - إرسال مباشر
        const formData = new FormData();
        formData.append('file', file);

        const { data, error } = await supabase.functions.invoke('extract-traffic-violations', {
          body: formData
        });
        
        if (error) throw error;
        if (!data?.success) throw new Error(data?.details || 'فشل في استخراج البيانات');
        
        const violations = processViolationsData(data.violations, 0);
        return matchViolationsWithVehicles(violations);
      }
      
    } catch (err: any) {
      // Fallback: تحويل PDF لصور إذا فشل استخراج النص
      if (err.message === 'FALLBACK_TO_IMAGES' && file.type === 'application/pdf') {
        toast({
          title: '📸 تحويل PDF إلى صور...',
          description: 'يتم تحويل الملف لصور للتحليل البصري',
        });
        
        const images = await convertPDFToImages(file);
        toast({
          title: '✅ تم التحويل',
          description: `تم تحويل ${images.length} صفحة`,
        });
        
        const allViolations: ExtractedViolation[] = [];
        
        for (const imageFile of images) {
          const formData = new FormData();
          formData.append('file', imageFile);

          const { data, error } = await supabase.functions.invoke('extract-traffic-violations', {
            body: formData
          });
          
          if (error || !data?.success) {
            console.warn('Error processing image:', error || data?.details);
            continue;
          }
          
          const violations = processViolationsData(data.violations, allViolations.length);
          allViolations.push(...violations);
        }
        
        return matchViolationsWithVehicles(allViolations);
      }
      
      throw err;
    }
  };
  
  // تحويل بيانات المخالفات للتنسيق المطلوب
  const processViolationsData = (violations: any[], startIndex: number): ExtractedViolation[] => {
    return violations.map((violation: any, index: number) => ({
      id: `extracted_${startIndex + index + 1}`,
      violationNumber: violation.violation_number || '',
      date: violation.date || '',
      time: violation.time || '',
      plateNumber: violation.plate_number || '',
      location: violation.location || '',
      authority: violation.issuing_authority || '',
      fineAmount: violation.fine_amount || 0,
      points: 0,
      violationType: violation.violation_type || '',
      status: 'extracted' as const,
      errors: []
    }));
  };
  
  // ربط المخالفات بالمركبات
  const matchViolationsWithVehicles = (violations: ExtractedViolation[]): ExtractedViolation[] => {
    return violations.map(violation => {
      if (!violation.plateNumber) {
        return {
          ...violation,
          status: 'error' as const,
          errors: ['رقم اللوحة غير موجود']
        };
      }

      const matchedVehicle = vehicles.find(v => 
        v.plate_number?.replace(/\s/g, '').toLowerCase() === 
        violation.plateNumber.replace(/\s/g, '').toLowerCase()
      );

      if (matchedVehicle) {
        return {
          ...violation,
          vehicleId: matchedVehicle.id,
          status: 'matched' as const
        };
      }

      return {
        ...violation,
        status: 'error' as const,
        errors: ['لم يتم العثور على المركبة في النظام']
      };
    });
  };


  // معالجة الملفات المرفوعة
  const processFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى رفع ملف (صورة أو PDF) أولاً",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      let allViolations: ExtractedViolation[] = [];

      for (const file of uploadedFiles) {
        try {
          const extractedViolations = await extractDataFromPDF(file);
          allViolations = [...allViolations, ...extractedViolations];
        } catch (error: unknown) {
          // في حالة فشل استخراج بيانات ملف معين، أضف خطأ ولكن لا توقف المعالجة
          console.error(`فشل في معالجة الملف ${file.name}:`, error);
          toast({
            title: "تحذير",
            description: `فشل في معالجة الملف ${file.name}: ${error.message}`,
            variant: "destructive"
          });
        }
      }

      const result: ProcessingResult = {
        totalExtracted: allViolations.length,
        successfulMatches: allViolations.filter(v => v.status === 'matched').length,
        errors: allViolations.filter(v => v.status === 'error').length,
        violations: allViolations
      };

      setProcessingResult(result);
      setSelectedViolations(new Set(allViolations.filter(v => v.status === 'matched').map(v => v.id)));

      toast({
        title: "تم استخراج البيانات",
        description: `تم استخراج ${result.totalExtracted} مخالفة، ${result.successfulMatches} منها مطابقة للمركبات`,
      });

    } catch (error: unknown) {
      toast({
        title: "خطأ في المعالجة",
        description: `فشل في معالجة الملفات: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // حفظ المخالفات المحددة
  const saveSelectedViolations = async () => {
    if (!processingResult || selectedViolations.size === 0) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد مخالفات للحفظ",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const violationsToSave = processingResult.violations.filter(v => 
        selectedViolations.has(v.id) && v.status === 'matched'
      );

      let savedCount = 0;

      for (const violation of violationsToSave) {
        const { error } = await supabase
          .from('traffic_violations')
          .insert({
            company_id: companyId,
            vehicle_id: violation.vehicleId,
            violation_number: violation.violationNumber,
            violation_date: violation.date,
            violation_time: violation.time,
            violation_type: violation.violationType,
            violation_description: violation.authority,
            location: violation.location,
            fine_amount: violation.fineAmount,
            total_amount: violation.fineAmount,
            issuing_authority: violation.authority,
            status: 'pending'
          });

        if (error) {
          console.error(`خطأ في حفظ المخالفة ${violation.violationNumber}:`, error);
        } else {
          savedCount++;
        }
      }

      toast({
        title: "تم الحفظ بنجاح",
        description: `تم حفظ ${savedCount} مخالفة في النظام`,
      });

      // إعادة تعيين البيانات
      setProcessingResult(null);
      setUploadedFiles([]);
      setSelectedViolations(new Set());

    } catch (error: unknown) {
      toast({
        title: "خطأ في الحفظ",
        description: `فشل في حفظ المخالفات: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // إعداد منطقة السحب والإفلات
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const supportedFiles = acceptedFiles.filter(file => 
      file.type === 'application/pdf' || 
      file.type.startsWith('image/')
    );
    
    if (supportedFiles.length !== acceptedFiles.length) {
      toast({
        title: "تحذير",
        description: "تم قبول ملفات PDF والصور فقط (JPG, PNG, GIF, WEBP)",
        variant: "destructive"
      });
    }

    setUploadedFiles(prev => [...prev, ...supportedFiles]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    multiple: true
  });

  // إزالة ملف
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // تبديل تحديد المخالفة
  const toggleViolationSelection = (violationId: string) => {
    setSelectedViolations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(violationId)) {
        newSet.delete(violationId);
      } else {
        newSet.add(violationId);
      }
      return newSet;
    });
  };

  // تحديد/إلغاء تحديد الكل
  const toggleSelectAll = () => {
    if (!processingResult) return;

    const matchedViolations = processingResult.violations.filter(v => v.status === 'matched');
    if (selectedViolations.size === matchedViolations.length) {
      setSelectedViolations(new Set());
    } else {
      setSelectedViolations(new Set(matchedViolations.map(v => v.id)));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6" />
            استيراد المخالفات المرورية
          </CardTitle>
          <CardDescription>
            رفع ومعالجة ملفات الصور أو PDF للمخالفات المرورية واستخراج البيانات تلقائياً
            <br />
            <span className="text-green-600 text-sm font-medium">
              ✅ يُفضل رفع صور (JPG, PNG) للحصول على أفضل النتائج
            </span>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload">رفع الملفات</TabsTrigger>
              <TabsTrigger value="process" disabled={uploadedFiles.length === 0}>
                معالجة البيانات
              </TabsTrigger>
              <TabsTrigger value="review" disabled={!processingResult}>
                مراجعة وحفظ
              </TabsTrigger>
              <TabsTrigger value="stats" disabled={!processingResult}>
                الإحصائيات
              </TabsTrigger>
            </TabsList>

            {/* تاب رفع الملفات */}
            <TabsContent value="upload" className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input {...getInputProps()} />
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                {isDragActive ? (
                  <p className="text-blue-600">اسحب الملفات هنا...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">اسحب الملفات هنا أو اضغط للاختيار</p>
                    <p className="text-sm text-slate-500">يدعم ملفات PDF والصور (JPG, PNG, GIF, WEBP)</p>
                  </div>
                )}
              </div>

              {/* قائمة الملفات المرفوعة */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">الملفات المرفوعة ({uploadedFiles.length})</h4>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPreviewFile(file);
                            setIsPreviewOpen(true);
                          }}
                          className="h-6 w-6 p-0"
                          title="معاينة الملف"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                          title="حذف الملف"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* تاب معالجة البيانات */}
            <TabsContent value="process" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  سيتم استخراج البيانات من الملفات ومحاولة ربطها بالمركبات المسجلة في النظام.
                  يُفضل استخدام الصور (JPG, PNG) للحصول على أفضل النتائج. ملفات PDF قد لا تعمل بشكل صحيح.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button 
                  onClick={processFiles}
                  disabled={isProcessing || uploadedFiles.length === 0}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {isProcessing ? 'جاري المعالجة...' : 'بدء المعالجة'}
                </Button>
              </div>

              {isProcessing && (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-lg font-medium">جاري استخراج البيانات من الملفات...</p>
                  <p className="text-sm text-slate-500 mt-2">يرجى الانتظار، هذا قد يستغرق بضع دقائق</p>
                </div>
              )}
            </TabsContent>

            {/* تاب مراجعة وحفظ */}
            <TabsContent value="review" className="space-y-4">
              {processingResult && (
                <>
                  {/* إحصائيات النتائج */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.totalExtracted}</p>
                            <p className="text-sm text-slate-600">إجمالي المخالفات</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.successfulMatches}</p>
                            <p className="text-sm text-slate-600">مطابقة للمركبات</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.errors}</p>
                            <p className="text-sm text-slate-600">أخطاء</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="text-2xl font-bold">
                              {processingResult.violations.reduce((sum, v) => sum + v.fineAmount, 0).toFixed(2)}
                            </p>
                            <p className="text-sm text-slate-600">إجمالي الغرامات (د.ك)</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* أزرار التحكم */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAll}
                      >
                        {selectedViolations.size === processingResult.violations.filter(v => v.status === 'matched').length 
                          ? 'إلغاء تحديد الكل' 
                          : 'تحديد الكل'
                        }
                      </Button>
                      <span className="text-sm text-slate-600">
                        محدد: {selectedViolations.size} من {processingResult.successfulMatches}
                      </span>
                    </div>

                    <Button
                      onClick={saveSelectedViolations}
                      disabled={isSaving || selectedViolations.size === 0}
                      className="flex items-center gap-2"
                    >
                      {isSaving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      حفظ المخالفات المحددة ({selectedViolations.size})
                    </Button>
                  </div>

                  {/* جدول المخالفات */}
                  <Card>
                    <CardHeader>
                      <CardTitle>المخالفات المستخرجة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">تحديد</TableHead>
                              <TableHead>رقم المخالفة</TableHead>
                              <TableHead>التاريخ والوقت</TableHead>
                              <TableHead>رقم اللوحة</TableHead>
                              <TableHead>الموقع</TableHead>
                              <TableHead>نوع المخالفة</TableHead>
                              <TableHead>الغرامة</TableHead>
                              <TableHead>النقاط</TableHead>
                              <TableHead>الحالة</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {processingResult.violations.map((violation) => (
                              <TableRow key={violation.id}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedViolations.has(violation.id)}
                                    onChange={() => toggleViolationSelection(violation.id)}
                                    disabled={violation.status === 'error'}
                                    className="rounded"
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  <div className="flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {violation.violationNumber}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(new Date(violation.date), 'dd/MM/yyyy', { locale: ar })}
                                    </div>
                                    {violation.time && (
                                      <span className="text-xs text-slate-500">{violation.time}</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Car className="h-3 w-3" />
                                    <span className="font-mono text-sm">{violation.plateNumber}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="text-sm">{violation.location}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {violation.violationType}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span className="font-medium">{violation.fineAmount.toFixed(2)} د.ك</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={violation.points > 0 ? 'destructive' : 'secondary'} className="text-xs">
                                    {violation.points} نقطة
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={
                                      violation.status === 'matched' ? 'default' :
                                      violation.status === 'error' ? 'destructive' : 'secondary'
                                    }
                                  >
                                    {violation.status === 'matched' ? 'مطابقة' :
                                     violation.status === 'error' ? 'خطأ' : 'مستخرجة'}
                                  </Badge>
                                  {violation.errors.length > 0 && (
                                    <div className="text-xs text-red-600 mt-1">
                                      {violation.errors.join(', ')}
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* تاب الإحصائيات */}
            <TabsContent value="stats" className="space-y-6">
              {processingResult && (
                <>
                  <TrafficViolationStats violations={processingResult.violations} />
                  <ViolationImportReport 
                    violations={processingResult.violations}
                    onExport={(format) => {
                      toast({
                        title: "تصدير التقرير",
                        description: `سيتم تصدير التقرير بصيغة ${format} قريباً`,
                      });
                    }}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* مكون معاينة PDF */}
      {previewFile && (
        <PDFViewer
          file={previewFile}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewFile(null);
          }}
        />
      )}
    </div>
  );
};
