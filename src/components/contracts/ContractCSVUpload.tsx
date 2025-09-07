import * as React from "react";
import { useContractCSVUpload } from "@/hooks/useContractCSVUpload";
import { SmartCSVUpload } from "@/components/csv/SmartCSVUpload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download, FileText, AlertCircle, CheckCircle, Zap, Save } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { CompanySelector } from "@/components/navigation/CompanySelector";
import { StatCardNumber } from '@/components/ui/NumberDisplay';
import { CSVTemplateSelector } from "@/components/csv-templates/CSVTemplateSelector";
import { useCSVTemplates, type CSVTemplate } from "@/hooks/useCSVTemplates";

interface ContractCSVUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
}

export function ContractCSVUpload({ open, onOpenChange, onUploadComplete }: ContractCSVUploadProps) {
  const [uploadMode, setUploadMode] = React.useState<'classic' | 'smart' | 'bulk'>('smart');
  const [file, setFile] = React.useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = React.useState<CSVTemplate | null>(null);
  const [saveAsTemplate, setSaveAsTemplate] = React.useState(false);
  const [templateName, setTemplateName] = React.useState('');
  const { 
    uploadContracts, 
    smartUploadContracts,
    isUploading, 
    progress, 
    results, 
    downloadTemplate,
    contractFieldTypes,
    contractRequiredFields
  } = useContractCSVUpload();
  const { createTemplate } = useCSVTemplates('contracts');
  const { user, companyId, browsedCompany, isBrowsingMode } = useUnifiedCompanyAccess();
  const [dryRun, setDryRun] = React.useState(true);
  const [upsertDuplicates, setUpsertDuplicates] = React.useState(true);
  const isSuperAdmin = !!user?.roles?.includes('super_admin');
  const targetCompanyName = (
    isBrowsingMode && browsedCompany
      ? (browsedCompany.name_ar || browsedCompany.name)
      : (user?.company?.name_ar || user?.company?.name)
  ) || 'غير محدد';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('يرجى اختيار ملف CSV صحيح')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف أولاً')
      return
    }

    try {
      await uploadContracts(file)
      
      // حفظ كقالب إذا طُلب ذلك
      if (saveAsTemplate && templateName.trim()) {
        await handleSaveAsTemplate()
      }
      
      toast.success('تم رفع الملف بنجاح')
      onUploadComplete()
    } catch (error) {
      toast.error('حدث خطأ أثناء رفع الملف')
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!file || !templateName.trim()) return;

    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true });
      
      if (parsed.errors.length > 0) {
        toast.error('خطأ في قراءة الملف');
        return;
      }

      const headers = parsed.meta.fields || [];
      const sampleData = (parsed.data as any[]).slice(0, 3).filter(row => 
        Object.values(row).some(val => val !== null && val !== undefined && val !== '')
      );

      await createTemplate.mutateAsync({
        template_name: templateName,
        template_name_ar: templateName,
        entity_type: 'contracts',
        description: `قالب تم إنشاؤه من رفع ملف ${file.name}`,
        headers,
        sample_data: sampleData,
        field_mappings: {},
        validation_rules: {}
      });

      setSaveAsTemplate(false);
      setTemplateName('');
      toast.success('تم حفظ القالب بنجاح');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('فشل في حفظ القالب');
    }
  }

  const handleTemplateSelect = (template: CSVTemplate) => {
    setSelectedTemplate(template);
  }

  const handleDownloadTemplate = () => {
    downloadTemplate()
    toast.success('تم تحميل القالب')
  }

  const handleDownloadErrors = () => {
    if (!results?.errors?.length) return;
    const headers = ['الصف', 'اسم العميل', 'رسالة الخطأ'];
    const rows = results.errors.map(e => [
      e.row.toString(),
      e.customerName || 'غير محدد',
      e.message
    ]);
    const csv = [
      headers.join(','),
      ...rows.map(arr => arr.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contract_upload_errors.csv';
    link.click();
  }

  const handleBulkUpload = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف أولاً')
      return
    }
    if (!companyId) {
      toast.error('لا يوجد معرف شركة محدد')
      return
    }
    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: 'greedy' });
      const rows = (parsed.data as any[]).filter(Boolean).map((r, idx) => ({ ...r, rowNumber: idx + 2 }));
      const { data, error } = await supabase.functions.invoke('contracts-bulk-import', {
        body: { companyId, rows, dryRun, upsertDuplicates }
      });
      if (error) throw error;
      toast.success('تمت المعالجة على الخادم');
      onUploadComplete();
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ أثناء الرفع بالجملة');
    }
  }

  const handleClose = () => {
    setFile(null)
    setSelectedTemplate(null)
    setSaveAsTemplate(false)
    setTemplateName('')
    onOpenChange(false)
  }

  // عرض الرفع الذكي أو التقليدي حسب الاختيار
  if (uploadMode === 'smart') {
    return (
      <SmartCSVUpload
        open={open}
        onOpenChange={onOpenChange}
        onUploadComplete={onUploadComplete}
        entityType="contract"
        uploadFunction={smartUploadContracts}
        downloadTemplate={downloadTemplate}
        fieldTypes={contractFieldTypes}
        requiredFields={contractRequiredFields}
      />
    );
  }

  // وضع الرفع بالجملة عبر دالة الحافة
  if (uploadMode === 'bulk') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              رفع العقود بالجملة (خادم)
            </DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>رفع سريع عبر الخادم مع وضع تجريبي وتحديث التكرارات</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setUploadMode('classic')}
                className="flex items-center gap-1"
              >
                الرجوع للوضع التقليدي
              </Button>
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between mt-2 px-1">
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

          <div className="space-y-6">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label htmlFor="dryRun">تشغيل تجريبي (بدون إدخال فعلي)</Label>
                <Switch id="dryRun" checked={dryRun} onCheckedChange={setDryRun} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="upsert">تحديث العقود المكررة بالرقم</Label>
                <Switch id="upsert" checked={upsertDuplicates} onCheckedChange={setUpsertDuplicates} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>إلغاء</Button>
              <Button onClick={handleBulkUpload} disabled={!file || isUploading} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {isUploading ? 'جاري المعالجة...' : 'رفع بالجملة'}
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                للوضع بالجملة: يُفضّل أن يحتوي الملف على customer_id و vehicle_id و cost_center_id مباشرة لتسريع الإدخال. إذا كانت لديك أسماء/أرقام لوحات، فاستخدم الرفع الذكي لتحويلها تلقائياً.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            رفع العقود من ملف CSV
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>الطريقة التقليدية لرفع ملفات CSV</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setUploadMode('smart')}
                className="flex items-center gap-1"
              >
                <Zap className="h-3 w-3" />
                التبديل للرفع الذكي
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setUploadMode('bulk')}
                className="flex items-center gap-1"
              >
                الرفع بالجملة (خادم)
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-between mt-2 px-1">
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

        <div className="space-y-6">
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">رفع الملف</TabsTrigger>
              <TabsTrigger value="templates">القوالب المحفوظة</TabsTrigger>
            </TabsList>
            
            <TabsContent value="templates" className="space-y-4">
              <CSVTemplateSelector 
                entityType="contracts"
                onTemplateSelect={handleTemplateSelect}
                selectedTemplateId={selectedTemplate?.id}
              />
            </TabsContent>
            
            <TabsContent value="upload" className="space-y-6">
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
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      تم اختيار الملف: {file.name}
                    </div>
                    
                    {/* خيار حفظ كقالب */}
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-2 mb-2">
                        <Switch
                          id="save-template"
                          checked={saveAsTemplate}
                          onCheckedChange={setSaveAsTemplate}
                        />
                        <Label htmlFor="save-template" className="text-sm">
                          حفظ كقالب قابل لإعادة الاستخدام
                        </Label>
                      </div>
                      {saveAsTemplate && (
                        <Input
                          placeholder="اسم القالب..."
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>
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

              {/* النتائج المحسنة */}
              {results && (
                <div className="space-y-4">
                  {/* إحصائيات رئيسية */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <StatCardNumber value={results.contractsCreated || results.successful} className="text-green-600 text-xl font-bold" />
                      <div className="text-xs text-green-700">عقود مُنشأة</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <StatCardNumber value={results.customersCreated || 0} className="text-blue-600 text-xl font-bold" />
                      <div className="text-xs text-blue-700">عملاء جدد</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <StatCardNumber value={results.failed} className="text-red-600 text-xl font-bold" />
                      <div className="text-xs text-red-700">أخطاء</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <StatCardNumber value={results.total} className="text-gray-600 text-xl font-bold" />
                      <div className="text-xs text-gray-700">إجمالي الصفوف</div>
                    </div>
                  </div>

                  {/* رسائل النجاح */}
                  {(results.contractsCreated || 0) > 0 && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>تم بنجاح!</strong> تم إنشاء {results.contractsCreated} عقد
                        {(results.customersCreated || 0) > 0 && ` مع إنشاء ${results.customersCreated} عميل جديد`}.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* تحذيرات */}
                  {results.warnings && results.warnings.length > 0 && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <strong>تحذيرات ({results.warnings.length}):</strong>
                        <ScrollArea className="h-20 mt-2">
                          <div className="space-y-1">
                            {results.warnings.slice(0, 3).map((warning, index) => (
                              <div key={index} className="text-sm">
                                <Badge variant="outline" className="text-xs border-yellow-300">
                                  الصف {warning.row}
                                </Badge>
                                <span className="ml-2">{warning.message}</span>
                              </div>
                            ))}
                            {results.warnings.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                و{results.warnings.length - 3} تحذيرات إضافية...
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* أخطاء مفصلة */}
                  {results.errors && results.errors.length > 0 && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <div className="flex items-center justify-between mb-2">
                          <strong>أخطاء ({results.errors.length}):</strong>
                          <Button size="sm" variant="outline" onClick={handleDownloadErrors} className="text-xs">
                            تنزيل تقرير الأخطاء
                          </Button>
                        </div>
                        <ScrollArea className="h-32 w-full">
                          <div className="space-y-2">
                            {results.errors.slice(0, 5).map((error, index) => (
                              <div key={index} className="text-sm p-2 bg-white rounded border border-red-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="destructive" className="text-xs">
                                    الصف {error.row}
                                  </Badge>
                                  {error.customerName && (
                                    <Badge variant="outline" className="text-xs border-red-300">
                                      {error.customerName}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-red-700">{error.message}</div>
                              </div>
                            ))}
                            {results.errors.length > 5 && (
                              <div className="text-xs text-muted-foreground text-center mt-2 p-2 bg-white rounded">
                                و{results.errors.length - 5} أخطاء إضافية...
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* أزرار التشغيل */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                  إلغاء
                </Button>
                <Button onClick={handleUpload} disabled={!file || isUploading} className="flex items-center gap-2">
                  {saveAsTemplate && templateName ? <Save className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                  {isUploading ? 'جاري الرفع...' : saveAsTemplate && templateName ? 'رفع وحفظ كقالب' : 'رفع الملف'}
                </Button>
              </div>

              {/* ملاحظات هامة */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>ملاحظات هامة:</strong>
                  <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                    <li>استخدم القالب المحدث للحصول على أمثلة من بياناتك</li>
                    <li>العقود التي تحتوي على "cancelled" في الوصف ستُسجل كملغية</li>
                    <li>يمكن ترك حقول المركبة ومركز التكلفة فارغة للتعيين التلقائي</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}