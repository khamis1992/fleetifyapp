import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Camera, Upload, FileText, Loader2, CheckCircle, AlertCircle, Scan } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useContractOCR } from '@/hooks/useContractOCR';
import { Card, CardContent } from '@/components/ui/card';

interface ContractScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataExtracted: (data: any) => void;
}

export const ContractScannerDialog: React.FC<ContractScannerDialogProps> = ({
  open,
  onOpenChange,
  onDataExtracted
}) => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [scanMode, setScanMode] = useState<'upload' | 'camera' | null>(null);

  const {
    extractContractData,
    isProcessing,
    progress,
    extractedData,
    error,
    reset
  } = useContractOCR();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'يرجى اختيار ملف صورة',
          description: 'الصيغ المدعومة: JPG, PNG, HEIC',
          variant: 'destructive'
        });
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, [toast]);

  const handleScan = async () => {
    if (!selectedFile) {
      toast({ title: 'يرجى اختيار صورة أولاً', variant: 'destructive' });
      return;
    }

    try {
      const result = await extractContractData(selectedFile);
      
      if (result.success && result.data) {
        toast({
          title: 'تم استخراج البيانات بنجاح!',
          description: `معدل الثقة: ${result.confidence}%`
        });
        
        // Pass extracted data to parent
        onDataExtracted(result.data);
        
        // Close dialog after 1 second
        setTimeout(() => {
          onOpenChange(false);
          reset();
        }, 1000);
      } else {
        toast({
          title: 'فشل في استخراج البيانات',
          description: result.error || 'حاول مرة أخرى',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Scan error:', err);
      toast({ title: 'حدث خطأ أثناء المسح', variant: 'destructive' });
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setScanMode(null);
    reset();
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            مسح عقد الإيجار ضوئياً
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          {!scanMode && (
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setScanMode('upload')}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                  <Upload className="h-12 w-12 text-primary" />
                  <h3 className="font-semibold">رفع ملف</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    اختر صورة من جهازك
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setScanMode('camera')}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                  <Camera className="h-12 w-12 text-primary" />
                  <h3 className="font-semibold">التقاط صورة</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    استخدم الكاميرا مباشرة
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Upload Mode */}
          {scanMode === 'upload' && !selectedFile && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">اختر صورة العقد</h3>
              <p className="text-sm text-muted-foreground mb-4">
                JPG, PNG, HEIC حتى 10MB
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button asChild>
                  <span>اختيار ملف</span>
                </Button>
              </label>
            </div>
          )}

          {/* Camera Mode */}
          {scanMode === 'camera' && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">التقط صورة العقد</h3>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                id="camera-capture"
              />
              <label htmlFor="camera-capture">
                <Button asChild>
                  <span>فتح الكاميرا</span>
                </Button>
              </label>
            </div>
          )}

          {/* Preview & Process */}
          {selectedFile && (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="border rounded-lg overflow-hidden">
                <img 
                  src={previewUrl} 
                  alt="Contract preview" 
                  className="w-full max-h-96 object-contain"
                />
              </div>

              {/* Processing Progress */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>جاري المسح والاستخراج...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>قد يستغرق هذا بضع ثوان</span>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {extractedData && !isProcessing && (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    تم استخراج البيانات بنجاح! سيتم ملء النموذج تلقائياً...
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Message */}
              {error && !isProcessing && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  onClick={handleScan}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      جاري المسح...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      استخراج البيانات
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={isProcessing}
                >
                  إعادة المحاولة
                </Button>
              </div>
            </div>
          )}

          {/* Help Text */}
          {!isProcessing && !extractedData && (
            <Alert>
              <AlertDescription className="text-sm">
                <strong>نصائح للحصول على أفضل النتائج:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>تأكد من وضوح الصورة والإضاءة الجيدة</li>
                  <li>قم بتصوير العقد كاملاً في إطار واحد</li>
                  <li>تجنب الظلال والانعكاسات</li>
                  <li>تأكد من عدم وجود أجزاء مقصوصة من العقد</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
