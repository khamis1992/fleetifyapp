import * as React from "react";
import { useUnifiedContractUpload } from "@/hooks/useUnifiedContractUpload";
import { SmartCSVUpload } from "@/components/csv/SmartCSVUpload";
import { IntelligentContractPreview } from "@/components/contracts/IntelligentContractPreview";
import { CSVArchiveSelector } from "@/components/csv-archive/CSVArchiveSelector";
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
import { Upload, Download, FileText, AlertCircle, CheckCircle, Zap, Save, Brain } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { CompanySelector } from "@/components/navigation/CompanySelector";
import { StatCardNumber } from '@/components/ui/NumberDisplay';
import { CSVTemplateSelector } from "@/components/csv-templates/CSVTemplateSelector";
import { useCSVTemplates, type CSVTemplate } from "@/hooks/useCSVTemplates";
import { normalizeCsvHeaders } from "@/utils/csv";

interface ContractCSVUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
}

export function ContractCSVUpload({ open, onOpenChange, onUploadComplete }: ContractCSVUploadProps) {
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
        'text/plain',
        'application/pdf'
      ];
      
      const supportedExtensions = ['.csv', '.xlsx', '.xls', '.json', '.txt', '.pdf'];
      
      const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      const isValidType = supportedTypes.includes(selectedFile.type) || 
                         supportedExtensions.includes(fileExtension);
      
      if (!isValidType) {
        toast.error('نوع الملف غير مدعوم. الأنواع المدعومة: CSV, Excel, JSON, PDF, TXT');
        return;
      }
      
      console.log('🔧 Smart Upload: File detected:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        extension: fileExtension
      });
      
      setFile(selectedFile);
      
      // تفعيل المعالجة الذكية تلقائياً للملفات غير CSV
      if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
        setUseIntelligentProcessing(true);
        toast.success(`تم اكتشاف ملف ${fileExtension.toUpperCase()}. سيتم استخدام المعالجة الذكية.`);
      }
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
      onUploadComplete();
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`خطأ في الرفع: ${error.message}`);
      setCurrentStep('upload');
    }
  }

  const handleIntelligentProcess = async () => {
    if (!file) return;

    try {
      setCurrentStep('processing');
      
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      console.log('🔧 Smart Processing: Processing file type:', fileExtension);
      
      let rawData: any[] = [];
      
      // معالجة أنواع مختلفة من الملفات
      switch (fileExtension) {
        case '.csv':
          const csvText = await file.text();
          const csvParsed = Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy' });
          
          if (csvParsed.errors.length > 0) {
            toast.error('خطأ في قراءة ملف CSV');
            setCurrentStep('upload');
            return;
          }
          rawData = (csvParsed.data as any[]).filter(Boolean);
          break;
          
        case '.json':
          const jsonText = await file.text();
          try {
            const jsonData = JSON.parse(jsonText);
            rawData = Array.isArray(jsonData) ? jsonData : [jsonData];
            toast.success('تم قراءة ملف JSON بنجاح');
          } catch (jsonError) {
            toast.error('خطأ في قراءة ملف JSON');
            setCurrentStep('upload');
            return;
          }
          break;
          
        case '.xlsx':
        case '.xls':
          // استخدام مكتبة لقراءة ملفات Excel (يمكن إضافة مكتبة xlsx)
          toast.info('جاري معالجة ملف Excel...');
          try {
            // محاكاة قراءة Excel - يمكن تحسينها باستخدام مكتبة xlsx
            const excelText = await file.text();
            // تحويل مؤقت إلى CSV للمعالجة
            const excelParsed = Papa.parse(excelText, { header: true, skipEmptyLines: 'greedy' });
            rawData = (excelParsed.data as any[]).filter(Boolean);
          } catch (excelError) {
            toast.error('خطأ في قراءة ملف Excel');
            setCurrentStep('upload');
            return;
          }
          break;
          
        case '.txt':
          const txtText = await file.text();
          // محاولة تحليل النص كـ CSV أو JSON
          try {
            const txtParsed = Papa.parse(txtText, { header: true, skipEmptyLines: 'greedy' });
            rawData = (txtParsed.data as any[]).filter(Boolean);
          } catch {
            // إذا فشل، محاولة كـ JSON
            try {
              const jsonData = JSON.parse(txtText);
              rawData = Array.isArray(jsonData) ? jsonData : [jsonData];
            } catch {
              toast.error('لا يمكن قراءة محتوى الملف النصي');
              setCurrentStep('upload');
              return;
            }
          }
          break;
          
        case '.pdf':
          toast.info('معالجة ملفات PDF قيد التطوير. يرجى استخدام CSV أو Excel مؤقتاً.');
          setCurrentStep('upload');
          return;
          
        default:
          toast.error('نوع الملف غير مدعوم للمعالجة الذكية');
          setCurrentStep('upload');
          return;
      }

      if (rawData.length === 0) {
        toast.error('الملف فارغ أو لا يحتوي على بيانات صالحة');
        setCurrentStep('upload');
        return;
      }

      // تطبيع الرؤوس وإعداد البيانات
      const normalizedData = rawData.map((row, index) => {
        const normalizedRow = normalizeCsvHeaders(row);
        return {
          ...normalizedRow,
          rowNumber: index + 2 // بداية من الصف الثاني (بعد الرؤوس)
        };
      });

      console.log('🔧 Smart Processing: Normalized data:', normalizedData.length, 'records');

      // بدء المعالجة الذكية
      await processContractData(normalizedData, {
        enableAI: true,
        autoApplyFixes: true, // تفعيل الإصلاح التلقائي للملفات الذكية
        skipValidation: false
      });

      setCurrentStep('preview');
      toast.success(`تم معالجة ${normalizedData.length} سجل بنجاح`);
    } catch (error) {
      console.error('خطأ في المعالجة الذكية:', error);
      toast.error('حدث خطأ أثناء المعالجة الذكية');
      setCurrentStep('upload');
    }
  }

  const handleProceedWithProcessedData = async () => {
    try {
      const processedCSVData = getProcessedCSVData();
      
      // تحويل البيانات المعالجة إلى ملف CSV
      const csvContent = Papa.unparse(processedCSVData);
      const processedFile = new File([csvContent], `processed_${file?.name || 'contracts.csv'}`, {
        type: 'text/csv'
      });

      // رفع البيانات المعالجة
      await uploadContracts(processedFile, archiveFile);
      
      // حفظ كقالب إذا طُلب ذلك
      if (saveAsTemplate && templateName.trim()) {
        await handleSaveAsTemplate();
      }
      
      toast.success('تم رفع البيانات المعالجة بنجاح');
      onUploadComplete();
    } catch (error) {
      console.error('خطأ في رفع البيانات المعالجة:', error);
      toast.error('حدث خطأ أثناء رفع البيانات المعالجة');
    }
  }

  const handleFileFromArchive = (selectedFile: File) => {
    setFile(selectedFile);
    toast.success(`تم اختيار الملف من الأرشيف: ${selectedFile.name}`);
  }

  const handleCancel = () => {
    setCurrentStep('upload');
    clearPreview();
    setUseIntelligentProcessing(false);
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

  const handleEnhancedUpload = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف أولاً')
      return
    }
    try {
      await enhancedUpload.processContracts(file, {
        autoCreateCustomers,
        replaceDuplicates
      })
      onUploadComplete()
    } catch (error: any) {
      console.error('خطأ في الرفع المحسن:', error)
      toast.error(error.message || 'حدث خطأ أثناء الرفع المحسن')
    }
  }

  const handleClose = () => {
    setFile(null)
    setSelectedTemplate(null)
    setSaveAsTemplate(false)
    setTemplateName('')
    setCurrentStep('upload')
    setUseIntelligentProcessing(false)
    clearPreview()
    onOpenChange(false)
  }

  // عرض المعاينة الذكية إذا كانت في الخطوة المناسبة
  if (currentStep === 'preview' && preview) {
    return (
      <IntelligentContractPreview
        preview={preview}
        onApplyCorrections={applyCorrections}
        onProceedWithData={handleProceedWithProcessedData}
        onCancel={handleCancel}
      />
    );
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
        archiveFile={archiveFile}
        onArchiveChange={setArchiveFile}
      />
    );
  }

  // وضع الرفع المحسن
  if (uploadMode === 'enhanced') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              الرفع المحسن للعقود
            </DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>رفع ذكي مع إنشاء العملاء تلقائياً ومطابقة الأسماء</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setUploadMode('smart')}
                  className="flex items-center gap-1"
                >
                  <Zap className="h-3 w-3" />
                  الرفع الذكي
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setUploadMode('bulk')}
                  className="flex items-center gap-1"
                >
                  الرفع بالجملة
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
            {/* اختيار الملف */}
            <div className="space-y-2">
              <label className="text-sm font-medium">اختر ملف ذكي</label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls,.json,.txt,.pdf"
                onChange={handleFileChange}
                disabled={enhancedUpload.isUploading}
              />
                {file && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      تم اختيار الملف: {file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      الحجم: {(file.size / 1024).toFixed(2)} KB | النوع: {file.type || 'غير محدد'}
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  الأنواع المدعومة: CSV, Excel (.xlsx, .xls), JSON, TXT, PDF
                </div>
            </div>

            {/* عرض الشفافية في المعالجة */}
            {enhancedUpload.isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>جاري المعالجة...</span>
                  <span>{enhancedUpload.progress}%</span>
                </div>
                <Progress value={enhancedUpload.progress} className="w-full" />
              </div>
            )}

            {/* نتائج المعالجة */}
            {enhancedUpload.results && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <h3 className="font-medium">نتائج المعالجة</h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <StatCardNumber 
                      value={enhancedUpload.results.total} 
                      className="text-lg font-semibold text-blue-600" 
                    />
                    <p className="text-xs text-muted-foreground">إجمالي الصفوف</p>
                  </div>
                  <div className="text-center">
                    <StatCardNumber 
                      value={enhancedUpload.results.successful} 
                      className="text-lg font-semibold text-green-600" 
                    />
                    <p className="text-xs text-muted-foreground">نجح</p>
                  </div>
                  <div className="text-center">
                    <StatCardNumber 
                      value={enhancedUpload.results.failed} 
                      className="text-lg font-semibold text-red-600" 
                    />
                    <p className="text-xs text-muted-foreground">فشل</p>
                  </div>
                  <div className="text-center">
                    <StatCardNumber 
                      value={enhancedUpload.results.customersCreated || 0} 
                      className="text-lg font-semibold text-purple-600" 
                    />
                    <p className="text-xs text-muted-foreground">عملاء جدد</p>
                  </div>
                </div>

                {/* العملاء المفقودين */}
                {enhancedUpload.results.missingCustomers && enhancedUpload.results.missingCustomers.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">العملاء التالية غير موجودة:</p>
                        <ScrollArea className="h-32 w-full">
                          <div className="space-y-1">
                            {enhancedUpload.results.missingCustomers.map((missing, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium">{missing.customerName}</span>
                                <span className="text-muted-foreground ml-2">
                                  (الصفوف: {missing.rows.join('، ')})
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        <p className="text-sm text-muted-foreground">
                          فعّل "إنشاء العملاء تلقائياً" لإنشاء هؤلاء العملاء أو تأكد من صحة الأسماء في الملف.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* الأخطاء */}
                {enhancedUpload.results.errors && enhancedUpload.results.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-red-600">تفاصيل الأخطاء</h4>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownloadErrors}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        تحميل الأخطاء
                      </Button>
                    </div>
                    <ScrollArea className="h-32 w-full border rounded p-2">
                      <div className="space-y-1">
                        {enhancedUpload.results.errors.slice(0, 10).map((error, idx) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium">الصف {error.row}:</span>
                            <span className="ml-2">{error.message}</span>
                            {error.customerName && (
                              <span className="text-muted-foreground ml-2">({error.customerName})</span>
                            )}
                          </div>
                        ))}
                        {enhancedUpload.results.errors.length > 10 && (
                          <p className="text-sm text-muted-foreground">
                            و {enhancedUpload.results.errors.length - 10} أخطاء أخرى...
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}

            {/* الخيارات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoCreate">إنشاء العملاء تلقائياً</Label>
                <Switch 
                  id="autoCreate" 
                  checked={autoCreateCustomers} 
                  onCheckedChange={setAutoCreateCustomers}
                  disabled={enhancedUpload.isUploading}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="replace">استبدال العقود المكررة</Label>
                <Switch 
                  id="replace" 
                  checked={replaceDuplicates} 
                  onCheckedChange={setReplaceDuplicates}
                  disabled={enhancedUpload.isUploading}
                />
              </div>
            </div>

            {/* الأزرار */}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                disabled={enhancedUpload.isUploading}
              >
                إلغاء
              </Button>
              <Button 
                onClick={handleEnhancedUpload} 
                disabled={!file || enhancedUpload.isUploading} 
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                {enhancedUpload.isUploading ? 'جاري المعالجة...' : 'رفع محسن'}
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p><strong>الرفع المحسن يقوم بما يلي:</strong></p>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    <li>البحث عن العملاء بالاسم تلقائياً (بحث دقيق وضبابي)</li>
                    <li>إنشاء العملاء الجدد إذا لم يوجدوا (اختياري)</li>
                    <li>تحويل أرقام اللوحات إلى معرفات المركبات</li>
                    <li>معالجة ذكية للأخطاء مع تقارير مفصلة</li>
                    <li>يدعم الأسماء باللغتين العربية والانجليزية</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
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
              <label className="text-sm font-medium">اختر ملف ذكي</label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls,.json,.txt,.pdf"
                onChange={handleFileChange}
                disabled={isUploading}
              />
                {file && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      تم اختيار الملف: {file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      الحجم: {(file.size / 1024).toFixed(2)} KB | النوع: {file.type || 'غير محدد'}
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  الأنواع المدعومة: CSV, Excel (.xlsx, .xls), JSON, TXT, PDF
                </div>
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
            النظام الموحد للاستيراد الذكي
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-2">
              <p>نظام متطور مدعوم بالذكاء الاصطناعي لرفع العقود</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">تكميل تلقائي للبيانات</Badge>
                <Badge variant="outline">إنشاء عملاء جدد</Badge>
                <Badge variant="outline">قيم افتراضية ذكية</Badge>
                <Badge variant="outline">مراجعة تلقائية</Badge>
              </div>
            </div>
          </DialogDescription>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setUploadMode('enhanced')}
                className="flex items-center gap-1"
              >
                <Brain className="h-3 w-3" />
                الرفع المحسن
              </Button>
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
              <div className="space-y-4">
                <CSVTemplateSelector 
                  entityType="contracts"
                  onTemplateSelect={handleTemplateSelect}
                  selectedTemplateId={selectedTemplate?.id}
                />
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    اختيار من الأرشيف
                  </h4>
                  <CSVArchiveSelector
                    entityType="contracts"
                    onFileSelect={handleFileFromArchive}
                  />
                </div>
              </div>
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
                <label className="text-sm font-medium">اختر ملف ذكي</label>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls,.json,.txt,.pdf"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                {file && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      تم اختيار الملف: {file.name}
                    </div>
                    
                    {/* خيارات إضافية */}
                    <div className="space-y-3">
                      {/* خيار الأرشفة */}
                      <div className="p-3 border rounded-lg bg-blue-50">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Switch
                            id="archive-file"
                            checked={archiveFile}
                            onCheckedChange={setArchiveFile}
                          />
                          <Label htmlFor="archive-file" className="text-sm">
                            حفظ الملف في الأرشيف للمراجعة المستقبلية
                          </Label>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                          يمكنك الوصول للملفات المحفوظة لاحقاً من صفحة إدارة الأرشيف
                        </p>
                      </div>
                      
                      {/* خيار حفظ كقالب */}
                      <div className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-2 space-x-reverse mb-2">
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