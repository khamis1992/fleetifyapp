import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, Download, AlertTriangle, CheckCircle, Info, Users, Car, FileIcon, Zap, Save } from "lucide-react";
import { useContractCSVUpload } from "@/hooks/useContractCSVUpload";
import { useSavedCSVFiles } from "@/hooks/useSavedCSVFiles";
import { toast } from "sonner";

interface ContractSmartUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export const ContractSmartUpload: React.FC<ContractSmartUploadProps> = ({
  open,
  onOpenChange,
  onUploadComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [autoCreateCustomers, setAutoCreateCustomers] = useState(true);
  const [validateOnly, setValidateOnly] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoSaveFile, setAutoSaveFile] = useState(true);
  const [savedFileInfo, setSavedFileInfo] = useState<{name: string; id: string} | null>(null);
  
  const {
    isUploading,
    progress,
    results,
    uploadContracts,
    downloadTemplate,
    smartUploadContracts
  } = useContractCSVUpload();

  const { saveCSVFile, isLoading: isSaving } = useSavedCSVFiles();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('يرجى اختيار ملف CSV صالح');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)');
        return;
      }
      setSelectedFile(file);
      setSavedFileInfo(null); // إعادة تعيين معلومات الملف المحفوظ
      toast.success(`تم اختيار الملف: ${file.name}`);
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    
    try {
      const savedFile = await saveCSVFile.mutateAsync({
        file: selectedFile,
        fileType: 'smart_contracts',
        tags: [
          'smart_upload',
          dryRun ? 'dry_run' : 'live_upload',
          autoCreateCustomers ? 'auto_create' : 'no_auto_create',
          validateOnly ? 'validate_only' : 'full_process'
        ]
      });
      
      setSavedFileInfo({
        name: savedFile.original_file_name || savedFile.file_name,
        id: savedFile.id
      });
      
      toast.success(`تم حفظ الملف: ${savedFile.original_file_name || savedFile.file_name}`);
    } catch (error: any) {
      console.error('خطأ في حفظ الملف:', error);
      toast.error(`فشل في حفظ الملف: ${error.message}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('يرجى اختيار ملف CSV أولاً');
      return;
    }

    try {
      // حفظ الملف تلقائياً قبل المعالجة إذا كان مفعلاً
      if (autoSaveFile && !savedFileInfo) {
        await handleSaveFile();
      }

      await uploadContracts(selectedFile);
      
      // النتائج ستكون متاحة في results state
      if (results) {
        if (dryRun) {
          toast.success(`تم فحص الملف بنجاح! الصفوف: ${results.total}, صالحة: ${results.successful}, بها أخطاء: ${results.failed}`);
        } else {
          toast.success(`تم رفع ${results.successful} عقد من أصل ${results.total} بنجاح!`);
          onUploadComplete();
          
          // إذا تم إنشاء عملاء جدد
          if (results.customersCreated && results.customersCreated > 0) {
            toast.info(`تم إنشاء ${results.customersCreated} عميل جديد`, {
              duration: 5000
            });
          }
        }
      }
    } catch (error: any) {
      console.error('خطأ في رفع الملف:', error);
      toast.error(`خطأ في رفع الملف: ${error.message}`);
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplate();
    toast.success('تم تحميل قالب CSV');
  };

  const handleDownloadErrors = () => {
    if (results && results.errors.length > 0) {
      const csvContent = [
        'الصف,اسم العميل,الخطأ',
        ...results.errors.map(error => 
          `${error.row},"${error.customerName || 'غير محدد'}","${error.message}"`
        )
      ].join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'contract_upload_errors.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('تم تحميل تقرير الأخطاء');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>رفع العقود الذكي</CardTitle>
              <CardDescription>
                رفع ومعالجة ملفات CSV للعقود مع الكشف التلقائي والتحقق الذكي
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* إعدادات الرفع */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">اختيار ملف CSV</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="mt-1"
                />
                {selectedFile && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileIcon className="h-4 w-4" />
                      <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    
                    {savedFileInfo && (
                      <div className="flex items-center justify-between text-sm text-green-600">
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          <span>تم الحفظ: {savedFileInfo.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open('/saved-files', '_blank')}
                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          عرض الملفات المحفوظة
                        </Button>
                      </div>
                    )}
                    
                    {autoSaveFile && !savedFileInfo && selectedFile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveFile}
                        disabled={isSaving}
                        className="h-7 text-xs"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        {isSaving ? 'جاري الحفظ...' : 'حفظ الملف'}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="dry-run">تشغيل تجريبي (فحص فقط)</Label>
                <Switch
                  id="dry-run"
                  checked={dryRun}
                  onCheckedChange={setDryRun}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-create">إنشاء العملاء تلقائياً</Label>
                <Switch
                  id="auto-create"
                  checked={autoCreateCustomers}
                  onCheckedChange={setAutoCreateCustomers}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="validate-only">التحقق فقط (بدون رفع)</Label>
                <Switch
                  id="validate-only"
                  checked={validateOnly}
                  onCheckedChange={setValidateOnly}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-save">حفظ الملف تلقائياً</Label>
                <Switch
                  id="auto-save"
                  checked={autoSaveFile}
                  onCheckedChange={setAutoSaveFile}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-advanced">إظهار الخيارات المتقدمة</Label>
                <Switch
                  id="show-advanced"
                  checked={showAdvanced}
                  onCheckedChange={setShowAdvanced}
                />
              </div>
            </div>
          </div>

          {/* الخيارات المتقدمة */}
          {showAdvanced && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">خيارات متقدمة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs">حجم الدفعة</Label>
                    <Input type="number" defaultValue="50" min="1" max="100" className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">مهلة المعالجة (ثانية)</Label>
                    <Input type="number" defaultValue="30" min="10" max="120" className="h-8" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>المعالجة تتم على دفعات لضمان الأداء الأمثل</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* شريط التقدم */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>جاري المعالجة...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* النتائج */}
          {results && (
            <Card className="bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  نتائج المعالجة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* إحصائيات */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                    <div className="text-xs text-muted-foreground">إجمالي الصفوف</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{results.successful}</div>
                    <div className="text-xs text-muted-foreground">ناجحة</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                    <div className="text-xs text-muted-foreground">فاشلة</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{results.customersCreated || 0}</div>
                    <div className="text-xs text-muted-foreground">عملاء جدد</div>
                  </div>
                </div>

                {/* الأخطاء */}
                {results.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        الأخطاء ({results.errors.length})
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadErrors}
                        className="h-7 px-2 text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        تحميل التقرير
                      </Button>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {results.errors.slice(0, 5).map((error, index) => (
                        <div key={index} className="text-xs p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-2 border-red-200">
                          <div className="font-medium">صف {error.row}</div>
                          {error.customerName && (
                            <div className="text-muted-foreground">العميل: {error.customerName}</div>
                          )}
                          <div>{error.message}</div>
                        </div>
                      ))}
                      {results.errors.length > 5 && (
                        <div className="text-xs text-center text-muted-foreground py-2">
                          ...و {results.errors.length - 5} أخطاء أخرى
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* التحذيرات */}
                {results.warnings && results.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-yellow-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      تحذيرات ({results.warnings.length})
                    </h4>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {results.warnings.slice(0, 3).map((warning, index) => (
                        <div key={index} className="text-xs p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border-l-2 border-yellow-200">
                          <div className="font-medium">صف {warning.row}</div>
                          {warning.customerName && (
                            <div className="text-muted-foreground">العميل: {warning.customerName}</div>
                          )}
                          <div>{warning.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* أزرار التحكم */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                تحميل القالب
              </Button>
              
              {results?.errors && results.errors.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleDownloadErrors}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  تقرير الأخطاء
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUploading}
              >
                إلغاء
              </Button>
              
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'جاري المعالجة...' : 
                 dryRun ? 'فحص الملف' : 
                 validateOnly ? 'التحقق من البيانات' : 'رفع العقود'}
              </Button>
            </div>
          </div>

          {/* معلومات مفيدة */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <div className="font-medium text-blue-800 dark:text-blue-200">نصائح للنجاح:</div>
                  <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                    <li>• استخدم القالب المحدث مع أمثلة البيانات الحقيقية</li>
                    <li>• تأكد من تنسيق التواريخ (YYYY-MM-DD) والأرقام</li>
                    <li>• استخدم أسماء العملاء وأرقام المركبات الموجودة فعلياً</li>
                    <li>• فعّل "التشغيل التجريبي" لفحص البيانات قبل الرفع الفعلي</li>
                    <li>• يمكن إنشاء العملاء الجدد تلقائياً عند الحاجة</li>
                    <li>• سيتم حفظ الملف تلقائياً في "الملفات المحفوظة" للمراجعة لاحقاً</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};