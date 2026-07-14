import * as React from "react";
import { useUnifiedContractUpload } from "@/hooks/useUnifiedContractUpload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Brain, CheckCircle, AlertCircle, Users, FileText, Zap, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";

interface UnifiedContractUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
}

export function UnifiedContractUpload({ open, onOpenChange, onUploadComplete }: UnifiedContractUploadProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [currentStep, setCurrentStep] = React.useState<'upload' | 'processing' | 'results'>('upload');
  
  const { 
    uploadContracts,
    isUploading, 
    progress, 
    results,
    SMART_DEFAULTS
  } = useUnifiedContractUpload();
  
  const { user, companyId, browsedCompany, isBrowsingMode } = useUnifiedCompanyAccess();
  const isSuperAdmin = !!user?.roles?.includes('super_admin');
  const targetCompanyName = (
    isBrowsingMode && browsedCompany
      ? (browsedCompany.name_ar || browsedCompany.name)
      : (user?.company?.name_ar || user?.company?.name)
  ) || 'غير محدد';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      // قائمة أنواع الملفات المدعومة
      const supportedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json',
        'text/plain'
      ];
      
      const supportedExtensions = ['.csv', '.xlsx', '.xls', '.json', '.txt'];
      
      const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      const isValidType = supportedTypes.includes(selectedFile.type) || 
                         supportedExtensions.includes(fileExtension);
      
      if (!isValidType) {
        toast.error('نوع الملف غير مدعوم. الأنواع المدعومة: CSV, Excel, JSON, TXT');
        return;
      }
      
      console.log('🔧 Smart Upload: File detected:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        extension: fileExtension
      });
      
      setFile(selectedFile);
      toast.success(`تم اكتشاف ملف ${fileExtension.toUpperCase()}. جاهز للمعالجة الذكية.`);
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف أولاً')
      return
    }

    try {
      setCurrentStep('processing');
      console.log('🚀 Starting unified smart contract upload');
      
      const result = await uploadContracts(file);
      
      setCurrentStep('results');
      
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast.error(`خطأ في الرفع: ${error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}`);
      setCurrentStep('upload');
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false);
      setCurrentStep('upload');
      setFile(null);
    }
  }

  const handleFinish = () => {
    onUploadComplete();
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            النظام الموحد للاستيراد الذكي
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-3">
              <p>نظام متطور مدعوم بالذكاء الاصطناعي لرفع العقود بذكاء</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  تكميل تلقائي
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  إنشاء عملاء
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  قيم ذكية
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  مراجعة تلقائية
                </Badge>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-1">
            
            {/* Company Selection for Super Admin */}
            {isSuperAdmin && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  سيتم رفع العقود للشركة: <strong>{targetCompanyName}</strong>
                </AlertDescription>
              </Alert>
            )}

            {currentStep === 'upload' && (
              <>
                {/* Smart Features Info */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium">الميزات الذكية المفعلة</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>إيجار شهري افتراضي: {SMART_DEFAULTS.monthly_amount} ريال</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>حساب القيمة الإجمالية تلقائياً</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>إنشاء عملاء جدد تلقائياً</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>تصنيف العقود "تحت التدقيق"</span>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">اختيار الملف الذكي</label>
                    <Input
                      type="file"
                      accept=".csv,.xlsx,.xls,.json,.txt"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="mt-2"
                    />
                    {file && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span>تم اختيار الملف: {file.name}</span>
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          الحجم: {(file.size / 1024).toFixed(2)} KB | النوع: {file.type || 'غير محدد'}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      الأنواع المدعومة: CSV, Excel (.xlsx, .xls), JSON, TXT
                    </div>
                  </div>
                </div>

                {/* Upload Button */}
                <div className="flex gap-3">
                  <Button 
                    onClick={handleUpload} 
                    disabled={!file || isUploading}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    بدء الاستيراد الذكي
                  </Button>
                  <Button variant="outline" onClick={handleClose}>
                    إلغاء
                  </Button>
                </div>
              </>
            )}

            {currentStep === 'processing' && (
              <div className="space-y-4">
                <div className="text-center">
                  <Brain className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
                  <h3 className="font-medium text-lg mb-2">جاري المعالجة الذكية...</h3>
                  <p className="text-sm text-muted-foreground">
                    يتم تحليل البيانات وتكميل النواقص بالذكاء الاصطناعي
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>التقدم</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </div>
            )}

            {currentStep === 'results' && results && (
              <div className="space-y-4">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">تم الانتهاء من الاستيراد</h3>
                </div>

                {/* Results Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{results.successful}</div>
                    <div className="text-xs text-green-700">عقد ناجح</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{results.created_customers}</div>
                    <div className="text-xs text-blue-700">عميل جديد</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{results.contracts_under_review}</div>
                    <div className="text-xs text-yellow-700">تحت المراجعة</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                    <div className="text-xs text-red-700">فاشل</div>
                  </div>
                </div>

                {/* Errors and Warnings */}
                {(results.errors.length > 0 || results.warnings.length > 0) && (
                  <div className="space-y-3">
                    {/* Errors */}
                    {results.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p className="font-medium">أخطاء حدثت ({results.errors.length}):</p>
                            <ScrollArea className="max-h-32">
                              <ul className="text-sm space-y-1">
                                {results.errors.map((error, index) => (
                                  <li key={index} className="whitespace-pre-line">{error}</li>
                                ))}
                              </ul>
                            </ScrollArea>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Warnings */}
                    {results.warnings.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p className="font-medium">تحذيرات ومعلومات ({results.warnings.length}):</p>
                            <ScrollArea className="max-h-32">
                              <ul className="text-sm space-y-1">
                                {results.warnings.map((warning, index) => (
                                  <li key={index} className="whitespace-pre-line">{warning}</li>
                                ))}
                              </ul>
                            </ScrollArea>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <Button onClick={handleFinish} className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  إنهاء
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
