import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Upload, Download, CheckCircle, FileText, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { CSVAutoFix, CSVRowFix } from "@/utils/csvAutoFix";
import { CSVFixPreview } from "./CSVFixPreview";
import { CSVTableEditor } from "./CSVTableEditor";
import { DateFormatSelector } from "./DateFormatSelector";
import { DateFormatOption } from "@/utils/dateDetection";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { CompanySelector } from "@/components/navigation/CompanySelector";
import { Checkbox } from "@/components/ui/checkbox";
import { normalizeCsvHeaders } from "@/utils/csv";
import { CSVArchiveSelector } from "./CSVArchiveSelector";
import { CSVArchiveEntry } from "@/hooks/useCSVArchive";
interface SmartCSVUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
  entityType: 'customer' | 'vehicle' | 'contract' | 'payment';
  uploadFunction: (data: any[], options?: { upsert?: boolean; targetCompanyId?: string; autoCreateCustomers?: boolean; autoCompleteDates?: boolean; autoCompleteType?: boolean; autoCompleteAmounts?: boolean; dryRun?: boolean; archiveFile?: boolean; originalFile?: File }) => Promise<any>;
  downloadTemplate: () => void;
  fieldTypes: Record<string, 'text' | 'number' | 'date' | 'email' | 'phone' | 'boolean'>;
  requiredFields: string[];
  archiveFile?: boolean;
  onArchiveChange?: (archive: boolean) => void;
}

export function SmartCSVUpload({
  open,
  onOpenChange,
  onUploadComplete,
  entityType,
  uploadFunction,
  downloadTemplate,
  fieldTypes,
  requiredFields,
  archiveFile = false,
  onArchiveChange
}: SmartCSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fixes, setFixes] = useState<CSVRowFix[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [enableUpsert, setEnableUpsert] = useState(false);
  const [createMissingCustomers, setCreateMissingCustomers] = useState(false);
  const [autoCompleteDates, setAutoCompleteDates] = useState(true);
  const [autoCompleteType, setAutoCompleteType] = useState(true);
  const [autoCompleteAmounts, setAutoCompleteAmounts] = useState(true);
  const [enableDryRun, setEnableDryRun] = useState(false);
  const [archiveFileLocal, setArchiveFileLocal] = useState(false);
  const [lastResult, setLastResult] = useState<any | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [editedRows, setEditedRows] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'preview' | 'table'>('preview');
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [pendingData, setPendingData] = useState<any[]>([]);
  const [showArchiveSelector, setShowArchiveSelector] = useState(false);
  const [selectedArchiveEntry, setSelectedArchiveEntry] = useState<CSVArchiveEntry | null>(null);

  const { user, companyId, browsedCompany, isBrowsingMode } = useUnifiedCompanyAccess();
  
  const entityLabels = {
    customer: 'العملاء',
    vehicle: 'المركبات',
    contract: 'العقود',
    payment: 'المدفوعات'
  };
  const isSuperAdmin = !!user?.roles?.includes('super_admin');
  const targetCompanyName = (
    isBrowsingMode && browsedCompany
      ? (browsedCompany.name_ar || browsedCompany.name)
      : (user?.company?.name_ar || user?.company?.name)
  ) || 'غير محدد';

  const downloadErrorReport = () => {
    if (!lastResult?.errors?.length) return;
    const headers = ['row', 'message'];
    const rows = lastResult.errors.map((e: any) => [e.row, e.message]);
    const csv = [
      headers.join(','),
      ...rows.map(arr => arr.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${entityLabels[entityType]}_upload_errors.csv`.replace(/\s+/g, '_');
    link.click();
  };

  const effectiveRequiredFields = (entityType === 'contract' && createMissingCustomers)
    ? Array.from(new Set([...requiredFields, 'customer_phone']))
    : requiredFields;

  const handleFileFromArchive = (selectedFile: File, archiveEntry: CSVArchiveEntry) => {
    setFile(selectedFile);
    setSelectedArchiveEntry(archiveEntry);
    setShowArchiveSelector(false);
    setFixes([]);
    setShowPreview(false);
    setRawHeaders([]);
    setEditedRows([]);
    setActiveView('table');
    setShowDateSelector(false);
    setPendingData([]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    const name = selectedFile?.name?.toLowerCase() || '';
    const isCsv = selectedFile && (selectedFile.type === 'text/csv' || name.endsWith('.csv'));
    const isXlsx = selectedFile && (name.endsWith('.xlsx') || name.endsWith('.xls'));
    if (selectedFile && (isCsv || isXlsx)) {
      setFile(selectedFile);
      setSelectedArchiveEntry(null);
      setFixes([]);
      setShowPreview(false);
      setRawHeaders([]);
      setEditedRows([]);
      setActiveView('table');
      setShowDateSelector(false);
      setPendingData([]);
    } else {
      toast.error("يرجى اختيار ملف CSV أو XLSX صحيح");
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy' });
    
    console.log('🔍 [CSV DEBUG] Raw headers before normalization:', parsed.meta?.fields);
    console.log('🔍 [CSV DEBUG] Entity type:', entityType);
    
    const rows = (parsed.data as any[]).filter(Boolean).map((row, idx) => {
      const originalRow = row;
      const normalizedRow = normalizeCsvHeaders(row, entityType);
      
      // Log first few rows for debugging
      if (idx < 3) {
        console.log(`🔍 [CSV DEBUG] Row ${idx + 1} original keys:`, Object.keys(originalRow));
        console.log(`🔍 [CSV DEBUG] Row ${idx + 1} original:`, originalRow);
        console.log(`🔍 [CSV DEBUG] Row ${idx + 1} normalized keys:`, Object.keys(normalizedRow));
        console.log(`🔍 [CSV DEBUG] Row ${idx + 1} normalized:`, normalizedRow);
        console.log(`🔍 [CSV DEBUG] Row ${idx + 1} phone field:`, normalizedRow.phone);
      }
      
      return normalizedRow;
    });
    
    return rows.map((row, index) => ({ ...row, rowNumber: index + 2 }));
  };

  const analyzeFile = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const name = file.name.toLowerCase();
      const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
      let rawRows: any[] = [];
      let headers: string[] = [];

      if (isExcel) {
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[];
        if (!rows || rows.length === 0) {
          toast.error("الملف فارغ أو غير صحيح");
          return;
        }
        headers = (rows[0] as any[]).map((h) => String(h ?? '').trim());
        rawRows = rows.slice(1)
          .map((r) => {
            const obj: any = {};
            headers.forEach((h, i) => { obj[h] = (r as any[])[i]; });
            return obj;
          })
          .filter((row) => row && Object.values(row).some((v) => (v ?? '').toString().trim() !== ''));
      } else {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: 'greedy' }) as any;
        rawRows = (parsed.data as any[]).filter((row) => row && Object.values(row).some((v) => (v ?? '').toString().trim() !== ''));
        headers = (parsed.meta?.fields as string[]) || Object.keys(rawRows[0] || {});
      }

      if (rawRows.length === 0) {
        toast.error("الملف فارغ أو غير صحيح");
        return;
      }

      setRawHeaders(headers);
      setEditedRows(rawRows.map((row, index) => ({ ...row, rowNumber: index + 2 })));

      const csvData = rawRows.map((row, index) => {
        const normalized = normalizeCsvHeaders(row, entityType);
        console.log(`🔍 [ANALYZE] Row ${index + 1} normalization:`, { 
          original: row, 
          normalized, 
          phone: normalized.phone,
          hasPhone: !!normalized.phone 
        });
        return { ...normalized, rowNumber: index + 2 };
      });
      
      // Check required fields in normalized data
      console.log('🔍 [ANALYZE] Required fields:', effectiveRequiredFields);
      console.log('🔍 [ANALYZE] Sample normalized data (first 3 rows):', csvData.slice(0, 3));
      
      // إظهار محدد تنسيق التواريخ أولاً
      setPendingData(csvData);
      setShowDateSelector(true);
    } catch (error) {
      console.error('Error analyzing file:', error);
      toast.error("خطأ في تحليل الملف");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDateFormatsConfirmed = (processedData: any[], columnFormats: { [column: string]: DateFormatOption }) => {
    setShowDateSelector(false);
    
    // تطبيق إصلاحات CSV التقليدية على البيانات المعالجة
    console.log('🔍 [DATE] Processed data before fix:', processedData.slice(0, 3));
    console.log('🔍 [DATE] Field types:', fieldTypes);
    console.log('🔍 [DATE] Required fields:', effectiveRequiredFields);
    
    const fixResults = CSVAutoFix.fixCSVData(processedData, fieldTypes, effectiveRequiredFields, 'qatar');
    
    console.log('🔍 [FIX] Fix results preview (first 3):', fixResults.slice(0, 3).map(f => ({
      hasErrors: f.hasErrors,
      fixes: f.fixes,
      phoneField: f.originalData?.phone,
      fixedPhoneField: f.fixedData?.phone
    })));
    
    setFixes(fixResults);
    setShowPreview(true);
    setActiveView('preview');

    const totalFixes = fixResults.reduce((sum, row) => sum + row.fixes.length, 0);
    const errorRows = fixResults.filter(row => row.hasErrors).length;
    const dateColumns = Object.keys(columnFormats).length;
    
    toast.success(`تم تحليل الملف: ${totalFixes} إصلاح محتمل، ${errorRows} صف يحتوي على أخطاء، ${dateColumns} عمود تاريخ محول`);
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

      // إضافة timeout للعملية لمنع التعليق
      const uploadTimeout = setTimeout(() => {
        clearInterval(progressInterval);
        if (setUploadProgress) {
          console.warn('⚠️ Upload timeout - forcing completion');
          toast.warning('العملية تستغرق وقتاً أطول من المتوقع، يرجى التحقق من النتائج');
        }
      }, 30000); // 30 seconds timeout

      console.log('🚀 [UPLOAD] Starting upload with companyId:', companyId);
      
      let result;
      try {
        result = await uploadFunction(dataToUpload, { 
          upsert: enableUpsert, 
          targetCompanyId: companyId, 
          autoCreateCustomers: createMissingCustomers,
          autoCompleteDates,
          autoCompleteType, 
          autoCompleteAmounts,
          dryRun: enableDryRun,
          archiveFile: archiveFile,
          originalFile: file
        });
        console.log('✅ [UPLOAD] Upload function completed:', result);
      } catch (error) {
        console.error('❌ [UPLOAD] Upload function failed:', error);
        throw error;
      } finally {
        clearTimeout(uploadTimeout);
        clearInterval(progressInterval);
        setUploadProgress(100);
      }
      
      setLastResult(result);

      const successful = Number(result?.successful ?? 0);
      const failed = Number(result?.failed ?? 0);
      const total = Number(result?.total ?? dataToUpload.length);
      const skipped = Number(result?.skipped ?? 0);

      if (enableDryRun) {
        if (successful > 0 && failed === 0) {
          const msg = skipped > 0 
            ? `تمت المحاكاة: سيتم رفع ${successful} سجل وتخطي ${skipped} مكرر من أصل ${total}`
            : `تمت المحاكاة: سيتم رفع جميع السجلات (${successful}/${total})`;
          toast.success(msg);
        } else if (successful > 0 && (failed > 0 || skipped > 0)) {
          toast.success(`تمت المحاكاة: سيتم رفع ${successful} سجل، سيتم تخطي ${skipped}، وفشل التحقق في ${failed}. راجع الأخطاء.`);
        } else if (successful === 0 && skipped > 0 && failed === 0) {
          toast.message('محاكاة: لا توجد سجلات جديدة', { description: `سيتم تخطي جميع السجلات لأنها مكررة (${skipped}/${total})` });
        } else if (successful === 0) {
          toast.error(`محاكاة: فشل التحقق لجميع السجلات (${failed}/${total}). تأكد من الشركة والبيانات.`);
        } else {
          toast.error('محاكاة: لم يتم التحقق من أي سجل.');
        }
      } else {
        if (successful > 0 && failed === 0) {
          const msg = skipped > 0 
            ? `تم رفع ${successful} سجل وتخطي ${skipped} مكرر من أصل ${total}`
            : `تم رفع جميع السجلات بنجاح (${successful}/${total})`;
          toast.success(msg);
          onUploadComplete();
          handleClose();
        } else if (successful > 0 && (failed > 0 || skipped > 0)) {
          toast.success(`تم رفع ${successful} سجل، تم تخطي ${skipped}، وفشل ${failed}. راجع الأخطاء ثم أعد المحاولة.`);
          onUploadComplete();
        } else if (successful === 0 && skipped > 0 && failed === 0) {
          toast.message('لا توجد سجلات جديدة', { description: `تم تخطي جميع السجلات لأنها مكررة (${skipped}/${total})` });
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
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      toast.error(`خطأ في رفع البيانات: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleTableUpload = async () => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const normalized = editedRows.map((row, idx) => ({
        ...normalizeCsvHeaders(row, entityType),
        rowNumber: row?.rowNumber ?? idx + 2,
      }));

      console.log('🔍 [TABLE] Normalized data preview (first 3):', normalized.slice(0, 3));
      console.log('🔍 [TABLE] Required fields:', effectiveRequiredFields);
      
      const dataToUpload = normalized.filter((r, index) => {
        const missingFields = effectiveRequiredFields.filter(f => {
          const v = r[f];
          const isEmpty = v === undefined || v === null || String(v).trim() === '';
          if (isEmpty && index < 3) {
            console.log(`🔍 [TABLE] Row ${index + 1} missing field '${f}':`, v);
          }
          return isEmpty;
        });
        
        if (missingFields.length > 0 && index < 3) {
          console.log(`🔍 [TABLE] Row ${index + 1} excluded due to missing:`, missingFields);
          console.log(`🔍 [TABLE] Row ${index + 1} data:`, r);
        }
        
        return missingFields.length === 0;
      });

      if (dataToUpload.length === 0) {
        toast.error("لا توجد صفوف مكتملة ال بيانات للرفع");
        return;
      }

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // إضافة timeout للعملية لمنع التعليق
      const uploadTimeout = setTimeout(() => {
        clearInterval(progressInterval);
        console.warn('⚠️ Table upload timeout - forcing completion');
        toast.warning('العملية تستغرق وقتاً أطول من المتوقع، يرجى التحقق من النتائج');
      }, 30000); // 30 seconds timeout

      let result;
      try {
        result = await uploadFunction(dataToUpload, { 
          upsert: enableUpsert, 
          targetCompanyId: companyId, 
          autoCreateCustomers: createMissingCustomers,
          autoCompleteDates,
          autoCompleteType,
          autoCompleteAmounts,
          dryRun: enableDryRun,
          archiveFile: archiveFile,
          originalFile: file
        });
        console.log('✅ [TABLE] Upload completed:', result);
      } catch (error) {
        console.error('❌ [TABLE] Upload failed:', error);
        throw error;
      } finally {
        clearTimeout(uploadTimeout);
        clearInterval(progressInterval);
        setUploadProgress(100);
      }
      
      setLastResult(result);

      const successful = Number(result?.successful ?? 0);
      const failed = Number(result?.failed ?? 0);
      const total = Number(result?.total ?? dataToUpload.length);
      const skipped = Number(result?.skipped ?? 0);

      if (enableDryRun) {
        if (successful > 0 && failed === 0) {
          const msg = skipped > 0 
            ? `تمت المحاكاة: سيتم رفع ${successful} سجل وتخطي ${skipped} مكرر من أصل ${total}`
            : `تمت المحاكاة: سيتم رفع جميع السجلات (${successful}/${total})`;
          toast.success(msg);
        } else if (successful > 0 && (failed > 0 || skipped > 0)) {
          toast.success(`تمت المحاكاة: سيتم رفع ${successful} سجل، سيتم تخطي ${skipped}، وفشل التحقق في ${failed}.`);
        } else if (successful === 0 && skipped > 0 && failed === 0) {
          toast.message('محاكاة: لا توجد سجلات جديدة', { description: `سيتم تخطي جميع السجلات لأنها مكررة (${skipped}/${total})` });
        } else if (successful === 0) {
          toast.error(`محاكاة: فشل التحقق لجميع السجلات (${failed}/${total}).`);
        } else {
          toast.error('محاكاة: لم يتم التحقق من أي سجل.');
        }
      } else {
        if (successful > 0 && failed === 0) {
          const msg = skipped > 0 
            ? `تم رفع ${successful} سجل وتخطي ${skipped} مكرر من أصل ${total}`
            : `تم رفع جميع السجلات بنجاح (${successful}/${total})`;
          toast.success(msg);
          onUploadComplete();
          handleClose();
        } else if (successful > 0 && (failed > 0 || skipped > 0)) {
          toast.success(`تم رفع ${successful} سجل، تم تخطي ${skipped}، وفشل ${failed}. راجع الأخطاء ثم أعد المحاولة.`);
          onUploadComplete();
        } else if (successful === 0 && skipped > 0 && failed === 0) {
          toast.message('لا توجد سجلات جديدة', { description: `تم تخطي جميع السجلات لأنها مكررة (${skipped}/${total})` });
        } else if (successful === 0) {
          toast.error(`فشل رفع جميع السجلات (${failed}/${total}). تأكد من اختيار الشركة الصحيحة ومن صحة البيانات.`);
        } else {
          toast.error('لم يتم رفع أي سجل. يرجى التحقق من تنسيق الملف.');
        }
      }
    } catch (error: any) {
      console.error('Error uploading data (table):', error);
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
    setShowDateSelector(false);
    setPendingData([]);
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
                  تحميل قالب CSV/XLSX
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الخطوة 2: اختيار الملف</CardTitle>
                <CardDescription>
                  اختر ملف CSV أو XLSX الخاص بك
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => setShowArchiveSelector(true)}
                    className="px-3"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    من الأرشيف
                  </Button>
                </div>

                {selectedArchiveEntry && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800">
                        تم اختيار من الأرشيف: {selectedArchiveEntry.original_file_name}
                      </span>
                    </div>
                  </div>
                )}
                
                {file && !selectedArchiveEntry && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">{file.name}</span>
                    <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
                  </div>
                )}
            </CardContent>
            </Card>

            {entityType === 'vehicle' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">خيارات الرفع</CardTitle>
                  <CardDescription>تحكم في كيفية التعامل مع السجلات المكررة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <Checkbox id="enableUpsert" checked={enableUpsert} onCheckedChange={(v) => setEnableUpsert(Boolean(v))} />
                    <label htmlFor="enableUpsert" className="text-sm">
                      عند وجود رقم لوحة موجود، قم بتحديث السجل بدلاً من تخطيه (Upsert)
                      <div className="text-xs text-muted-foreground mt-1">سيتم التحديث داخل نفس الشركة فقط</div>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {entityType === 'contract' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">خيارات الإكمال التلقائي</CardTitle>
                  <CardDescription>تحكم في ميزات الإكمال الذكي للعقود</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox id="autoCompleteDates" checked={autoCompleteDates} onCheckedChange={(v) => setAutoCompleteDates(Boolean(v))} />
                    <label htmlFor="autoCompleteDates" className="text-sm">
                      إكمال التواريخ الناقصة تلقائياً
                      <div className="text-xs text-muted-foreground mt-1">سيتم حساب end_date من start_date حسب نوع العقد</div>
                    </label>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Checkbox id="autoCompleteType" checked={autoCompleteType} onCheckedChange={(v) => setAutoCompleteType(Boolean(v))} />
                    <label htmlFor="autoCompleteType" className="text-sm">
                      تقدير نوع العقد عند عدم تحديده
                      <div className="text-xs text-muted-foreground mt-1">سيتم افتراض "إيجار شهري" كنوع افتراضي</div>
                    </label>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Checkbox id="autoCompleteAmounts" checked={autoCompleteAmounts} onCheckedChange={(v) => setAutoCompleteAmounts(Boolean(v))} />
                    <label htmlFor="autoCompleteAmounts" className="text-sm">
                      حساب المبالغ المفقودة من المدة
                      <div className="text-xs text-muted-foreground mt-1">سيتم حساب contract_amount أو monthly_amount بناءً على المدة</div>
                    </label>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Checkbox id="enableDryRun" checked={enableDryRun} onCheckedChange={(v) => setEnableDryRun(Boolean(v))} />
                    <label htmlFor="enableDryRun" className="text-sm">
                      تجربة بدون إدراج (Dry-run)
                      <div className="text-xs text-muted-foreground mt-1">سيتم تنفيذ جميع الفحوصات بدون حفظ أي بيانات في قاعدة البيانات</div>
                    </label>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id="archiveFile" 
                      checked={archiveFile} 
                      onCheckedChange={(v) => onArchiveChange?.(Boolean(v))}
                    />
                    <label htmlFor="archiveFile" className="text-sm">
                      حفظ الملف في الأرشيف
                      <div className="text-xs text-muted-foreground mt-1">سيتم حفظ نسخة من الملف للمراجعة المستقبلية</div>
                    </label>
                  </div>
                  
                  {isSuperAdmin && (
                    <div className="flex items-start gap-3">
                      <Checkbox id="autoCreateCustomers" checked={createMissingCustomers} onCheckedChange={(v) => setCreateMissingCustomers(Boolean(v))} />
                      <label htmlFor="autoCreateCustomers" className="text-sm">
                        إنشاء العملاء المفقودين تلقائياً
                        <div className="text-xs text-muted-foreground mt-1">عند التفعيل يصبح customer_phone حقلاً مطلوباً</div>
                      </label>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {entityType === 'payment' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">معالجة غرامات التأخير</CardTitle>
                  <CardDescription>فهم خيارات معالجة الغرامات في ملف المدفوعات</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                
                </CardContent>
              </Card>
            )}

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
                {entityType === 'contract' && createMissingCustomers && (
                  <div className="text-xs text-red-600 mt-2">ملاحظة: يجب توفير customer_phone لكل صف ليتم الإنشاء التلقائي للعميل.</div>
                )}
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

            <div className="flex items-center gap-2">
              <Button
                variant={activeView === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('table')}
              >
                تحرير كجدول
              </Button>
              <Button
                variant={activeView === 'preview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('preview')}
              >
                المعاينة الذكية
              </Button>
            </div>

            {enableDryRun && (
              <div className="p-3 rounded-md border border-blue-200 bg-blue-50 text-blue-800 text-sm">
                وضع المحاكاة مفعّل: لن يتم حفظ أي تغييرات. استخدمه للتحقق قبل الرفع الحقيقي.
              </div>
            )}

            {lastResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">نتائج الرفع</CardTitle>
                  <CardDescription>ملخص العملية</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-lg bg-green-50">
                      <div className="text-xl font-bold text-green-700">{Number(lastResult.successful || 0)}</div>
                      <div className="text-xs text-green-800">تم بنجاح</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-50">
                      <div className="text-xl font-bold text-red-700">{Number(lastResult.failed || 0)}</div>
                      <div className="text-xs text-red-800">فشل</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-50">
                      <div className="text-xl font-bold text-blue-700">{Number(lastResult.total || 0)}</div>
                      <div className="text-xs text-blue-800">المجموع</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-amber-50">
                      <div className="text-xl font-bold text-amber-700">{Number(lastResult.skipped || 0)}</div>
                      <div className="text-xs text-amber-800">تم التخطي</div>
                    </div>
                  </div>

                  {Array.isArray(lastResult.errors) && lastResult.errors.length > 0 && (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm text-red-700">
                        توجد {lastResult.errors.length} أخطاء. يمكنك تنزيل تقرير الأخطاء للاطلاع على التفاصيل.
                      </div>
                      <Button size="sm" variant="outline" onClick={downloadErrorReport}>
                        تنزيل تقرير الأخطاء
                      </Button>
                    </div>
                  )}

                  {Array.isArray(lastResult.errors) && lastResult.errors.some((e: any) => String(e.message || '').toLowerCase().includes('rls') || String(e.message || '').includes('صلاحيات')) && (
                    <div className="mt-2 text-xs text-amber-700">
                      تلميح: ظهرت أخطاء صلاحيات (RLS). تأكد من اختيار الشركة الصحيحة أو من صلاحياتك الحالية.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeView === 'table' ? (
              <>
                <CSVTableEditor
                  headers={rawHeaders}
                  rows={editedRows}
                  onChange={setEditedRows}
                  requiredFields={effectiveRequiredFields}
                  fieldTypes={fieldTypes}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowPreview(false)} disabled={isUploading}>
                    رجوع
                  </Button>
                  <Button onClick={handleTableUpload} disabled={isUploading}>
                    {isUploading ? 'جاري الرفع...' : 'رفع البيانات'}
                  </Button>
                </div>
              </>
            ) : (
              <CSVFixPreview
                fixes={fixes}
                onApprove={handleApproveFixes}
                onCancel={() => setShowPreview(false)}
                isProcessing={isUploading}
              />
            )}
          </div>
        )}

        {/* محدد تنسيق التواريخ */}
        <DateFormatSelector
          open={showDateSelector}
          onOpenChange={setShowDateSelector}
          data={pendingData}
          onConfirm={handleDateFormatsConfirmed}
        />
      </DialogContent>

      <CSVArchiveSelector
        open={showArchiveSelector}
        onOpenChange={setShowArchiveSelector}
        onFileSelected={handleFileFromArchive}
        uploadType={entityType === 'contract' ? 'contracts' : entityType === 'customer' ? 'customers' : entityType === 'vehicle' ? 'vehicles' : 'payments'}
      />
    </Dialog>
  );
}