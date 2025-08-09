import { useState } from "react";
import { useCSVUpload } from "@/hooks/useCSVUpload";
import { SmartCSVUpload } from "@/components/csv/SmartCSVUpload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Upload, Download, CheckCircle, XCircle, Brain, FileText } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CustomerCSVUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export function CustomerCSVUpload({ open, onOpenChange, onUploadComplete }: CustomerCSVUploadProps) {
  const [uploadMode, setUploadMode] = useState<'classic' | 'smart'>('smart');
  const [file, setFile] = useState<File | null>(null);
  const { 
    uploadCustomers, 
    smartUploadCustomers, 
    downloadTemplate, 
    isUploading, 
    progress, 
    results,
    customerFieldTypes,
    customerRequiredFields
  } = useCSVUpload();

  // عرض الرفع الذكي أو التقليدي حسب الاختيار
  if (uploadMode === 'smart') {
    return (
      <SmartCSVUpload
        open={open}
        onOpenChange={onOpenChange}
        onUploadComplete={onUploadComplete}
        entityType="customer"
        uploadFunction={smartUploadCustomers}
        downloadTemplate={downloadTemplate}
        fieldTypes={customerFieldTypes}
        requiredFields={customerRequiredFields}
      />
    );
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('يرجى اختيار ملف CSV صحيح');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف أولاً');
      return;
    }

    try {
      await uploadCustomers(file);
      toast.success('تم رفع الملف بنجاح');
      onUploadComplete();
    } catch (error) {
      toast.error('حدث خطأ أثناء رفع الملف');
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplate();
    toast.success('تم تحميل القالب');
  };

  const handleClose = () => {
    setFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            رفع ملف العملاء
          </DialogTitle>
          <DialogDescription>
            اختر طريقة الرفع المناسبة لك
          </DialogDescription>
        </DialogHeader>

        <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as 'classic' | 'smart')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="smart" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              الرفع الذكي
              <Badge variant="secondary" className="ml-1">جديد</Badge>
            </TabsTrigger>
            <TabsTrigger value="classic">الرفع التقليدي</TabsTrigger>
          </TabsList>

          <TabsContent value="smart" className="mt-4">
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">الرفع الذكي</h3>
              <p className="text-muted-foreground mb-4">
                يقوم بإصلاح الأخطاء تلقائياً ويوفر معاينة تفاعلية
              </p>
              <Button onClick={() => setUploadMode('smart')}>
                استخدام الرفع الذكي
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="classic" className="mt-4">
            <div className="space-y-6">
              {/* تحميل القالب */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-blue-900">قالب CSV</h4>
                      <p className="text-sm text-blue-700">
                        حمل القالب لمعرفة التنسيق المطلوب
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    تحميل القالب
                  </Button>
                </div>
              </div>

              {/* اختيار الملف */}
              <div className="space-y-2">
                <label className="text-sm font-medium">اختر ملف CSV</label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                {file && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    تم اختيار الملف: {file.name}
                  </div>
                )}
              </div>

              {/* شريط التقدم */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>جاري المعالجة...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {/* النتائج */}
              {results && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{results.successful}</div>
                      <div className="text-sm text-green-700">تم بنجاح</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                      <div className="text-sm text-red-700">فشل</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                      <div className="text-sm text-blue-700">المجموع</div>
                    </div>
                  </div>

                  {/* أخطاء مفصلة */}
                  {results.errors && results.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-900">الأخطاء:</h4>
                      <ScrollArea className="h-32 w-full border rounded-md p-2">
                        <div className="space-y-1">
                          {results.errors.map((error, index) => (
                            <div key={index} className="text-sm">
                              <Badge variant="destructive" className="text-xs">
                                السطر {error.row}
                              </Badge>
                              <span className="ml-2 text-red-600">{error.message}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}

              {/* أزرار العمل */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                  إلغاء
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || isUploading}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <>جاري الرفع...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      رفع الملف
                    </>
                  )}
                </Button>
              </div>

              {/* تعليمات */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>ملاحظات مهمة:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
                    <li>يجب أن يكون الملف بصيغة CSV</li>
                    <li>استخدم القالب المحدد لضمان التنسيق الصحيح</li>
                    <li>رقم الهاتف مطلوب لكل عميل</li>
                    <li>سيتم تخطي الصفوف التي تحتوي على أخطاء</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}