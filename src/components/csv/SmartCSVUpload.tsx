import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Upload, Download, CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { CSVAutoFix, CSVRowFix } from "@/utils/csvAutoFix";
import { CSVFixPreview } from "./CSVFixPreview";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { CompanySelector } from "@/components/navigation/CompanySelector";
import { Checkbox } from "@/components/ui/checkbox";
interface SmartCSVUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
  entityType: 'customer' | 'vehicle' | 'contract';
  uploadFunction: (data: any[], options?: { upsert?: boolean; targetCompanyId?: string }) => Promise<any>;
  downloadTemplate: () => void;
  fieldTypes: Record<string, 'text' | 'number' | 'date' | 'email' | 'phone' | 'boolean'>;
  requiredFields: string[];
}

export function SmartCSVUpload({
  open,
  onOpenChange,
  onUploadComplete,
  entityType,
  uploadFunction,
  downloadTemplate,
  fieldTypes,
  requiredFields
}: SmartCSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fixes, setFixes] = useState<CSVRowFix[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [enableUpsert, setEnableUpsert] = useState(false);

  const entityLabels = {
    customer: 'العملاء',
    vehicle: 'المركبات', 
    contract: 'العقود'
  };

  const { user, companyId, browsedCompany, isBrowsingMode } = useUnifiedCompanyAccess();
  const isSuperAdmin = !!user?.roles?.includes('super_admin');
  const targetCompanyName = (
    isBrowsingMode && browsedCompany
      ? (browsedCompany.name_ar || browsedCompany.name)
      : (user?.company?.name_ar || user?.company?.name)
  ) || 'غير محدد';
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setFixes([]);
      setShowPreview(false);
    } else {
      toast.error("يرجى اختيار ملف CSV صحيح");
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = { rowNumber: index + 2 };
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });
  };

  const analyzeFile = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const text = await file.text();
      const csvData = parseCSV(text);
      
      if (csvData.length === 0) {
        toast.error("الملف فارغ أو غير صحيح");
        return;
      }

      const fixResults = CSVAutoFix.fixCSVData(csvData, fieldTypes, requiredFields, 'qatar');
      setFixes(fixResults);
      setShowPreview(true);

      const totalFixes = fixResults.reduce((sum, row) => sum + row.fixes.length, 0);
      const errorRows = fixResults.filter(row => row.hasErrors).length;
      
      toast.success(`تم تحليل الملف: ${totalFixes} إصلاح محتمل، ${errorRows} صف يحتوي على أخطاء`);
    } catch (error) {
      console.error('Error analyzing file:', error);
      toast.error("خطأ في تحليل الملف");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApproveFixes = async (approvedFixes: CSVRowFix[]) => {
    console.log('Handle approve fixes called with:', approvedFixes);
    
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const dataToUpload = approvedFixes
        .filter(fix => !fix.hasErrors)
        .map(fix => fix.fixedData);

      console.log('Data to upload:', dataToUpload);

      if (dataToUpload.length === 0) {
        toast.error("لا توجد بيانات صحيحة للرفع");
        return;
      }

      // محاكاة تقدم الرفع
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      console.log('Calling upload function with companyId:', companyId);
      const result = await uploadFunction(dataToUpload);
      console.log('Upload function result:', result);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      const successful = Number(result?.successful ?? 0);
      const failed = Number(result?.failed ?? 0);
      const total = Number(result?.total ?? dataToUpload.length);

      if (successful > 0 && failed === 0) {
        toast.success(`تم رفع جميع السجلات بنجاح (${successful}/${total})`);
        onUploadComplete();
        handleClose();
      } else if (successful > 0 && failed > 0) {
        toast.success(`تم رفع ${successful} سجل، وفشل ${failed} سجل. راجع الأخطاء ثم أعد المحاولة.`);
        onUploadComplete();
        // اترك الحوار مفتوحًا ليستعرض المستخدم الأخطاء في المعاينة
      } else if (successful === 0) {
        toast.error(`فشل رفع جميع السجلات (${failed}/${total}). تأكد من اختيار الشركة الصحيحة ومن صحة البيانات.`);
        if (isSuperAdmin) {
          toast.message('تلميح', {
            description: 'يمكنك تغيير الشركة من أداة اختيار الشركة بالأعلى.',
          });
        }
      } else {
        toast.error('لم يتم رفع أي سجل. يرجى التحقق من تنسيق الملف.');
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      toast.error(`خطأ في رفع البيانات: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setFile(null);
    setFixes([]);
    setShowPreview(false);
    setIsAnalyzing(false);
    setIsUploading(false);
    setUploadProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            رفع ملف {entityLabels[entityType]} الذكي
          </DialogTitle>
          <DialogDescription>
            نظام رفع ذكي يقوم بإصلاح الأخطاء تلقائياً
          </DialogDescription>
          <div className="flex items-center justify-between mt-2">
            <div className="text-sm">
              <span className="text-muted-foreground">سيتم الرفع إلى:</span>
              <Badge variant="outline" className="ml-2">{targetCompanyName}</Badge>
            </div>
            {isSuperAdmin && (
              <div className="shrink-0">
                <CompanySelector />
              </div>
            )}
          </div>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الخطوة 1: تحميل القالب</CardTitle>
                <CardDescription>
                  حمل القالب للتأكد من التنسيق الصحيح
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={downloadTemplate} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  تحميل قالب CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الخطوة 2: اختيار الملف</CardTitle>
                <CardDescription>
                  اختر ملف CSV الخاص بك
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                />
                
                {file && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">{file.name}</span>
                    <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الخطوة 3: تحليل وإصلاح</CardTitle>
                <CardDescription>
                  سيقوم النظام بتحليل الملف وإصلاح الأخطاء تلقائياً
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={analyzeFile} 
                  disabled={!file || isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      جاري التحليل...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      تحليل وإصلاح الملف
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-900">الإصلاحات التلقائية تشمل:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• تنسيق التواريخ إلى الصيغة الصحيحة</li>
                    <li>• إصلاح أرقام الهواتف القطرية</li>
                    <li>• تصحيح عناوين البريد الإلكتروني</li>
                    <li>• تنظيف النصوص وإزالة المسافات الإضافية</li>
                    <li>• تحويل القيم المنطقية والأرقام</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isUploading && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>جاري الرفع...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            <CSVFixPreview
              fixes={fixes}
              onApprove={handleApproveFixes}
              onCancel={() => setShowPreview(false)}
              isProcessing={isUploading}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}