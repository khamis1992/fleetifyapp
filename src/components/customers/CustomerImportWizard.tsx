/**
 * Customer Import Wizard
 * Step-by-step CSV import with field mapping, preview, and duplicate handling
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  Upload,
  Wand2,
  XCircle,
  ChevronRight,
  FileUp,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCSVUpload } from '@/hooks/useCSVUpload';

interface ColumnMapping {
  csvColumn: string;
  targetField: string;
  confidence: number;
  isRequired: boolean;
}

interface DuplicateRecord {
  rowIndex: number;
  phone: string;
  name: string;
  action: 'skip' | 'merge' | 'overwrite';
}

interface ImportResult {
  totalRows: number;
  successfulImports: number;
  duplicatesFound: number;
  failedImports: number;
}

interface CustomerImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const CUSTOMER_FIELDS = {
  customer_type: 'نوع العميل',
  first_name: 'الاسم الأول',
  last_name: 'اسم العائلة',
  email: 'البريد الإلكتروني',
  phone: 'رقم الهاتف',
  company_name: 'اسم الشركة',
  address: 'العنوان',
  city: 'المدينة',
  country: 'البلد',
  credit_limit: 'حد الائتمان',
  notes: 'ملاحظات',
};

export const CustomerImportWizard: React.FC<CustomerImportWizardProps> = ({
  open,
  onOpenChange,
  onComplete,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'duplicates' | 'complete'>('upload');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duplicates, setDuplicates] = useState<DuplicateRecord[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(false);

  const { smartUploadCustomers, downloadTemplate, customerFieldTypes, customerRequiredFields } = useCSVUpload();

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً');
      return;
    }

    try {
      setIsProcessing(true);
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast.error('الملف يجب أن يحتوي على رؤوس وبيانات');
        return;
      }

      const headers = lines[0]
        .split(',')
        .map(h => h.trim().replace(/^"|"$/g, ''));

      const data = lines.slice(1).map((line, idx) => {
        const values = line
          .split(',')
          .map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });

      setCsvFile(file);
      setCsvHeaders(headers);
      setCsvData(data);
      setMappings(generateMappings(headers));
      toast.success(`تم تحميل ${data.length} سجل`);
      setStep('mapping');
    } catch (error) {
      toast.error('فشل في تحليل الملف');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const generateMappings = useCallback((headers: string[]): ColumnMapping[] => {
    return headers.map(header => {
      const headerLower = header.toLowerCase();
      let bestMatch = '';
      let confidence = 0;

      for (const [field, label] of Object.entries(CUSTOMER_FIELDS)) {
        const fieldLower = field.toLowerCase();
        if (headerLower === fieldLower || headerLower.includes(fieldLower)) {
          bestMatch = field;
          confidence = 1.0;
          break;
        }
        if (headerLower.includes(label.split(' ')[0]?.toLowerCase() || '')) {
          if (confidence < 0.8) {
            bestMatch = field;
            confidence = 0.8;
          }
        }
      }

      return {
        csvColumn: header,
        targetField: bestMatch,
        confidence,
        isRequired: ['phone', 'customer_type'].includes(bestMatch),
      };
    });
  }, []);

  const updateMapping = useCallback((csvColumn: string, targetField: string) => {
    setMappings(prev =>
      prev.map(m =>
        m.csvColumn === csvColumn
          ? { ...m, targetField }
          : m
      )
    );
  }, []);

  const previewData = useMemo(() => {
    return csvData.slice(0, 5).map(row => {
      const mapped: Record<string, any> = {};
      mappings.forEach(m => {
        if (m.targetField) {
          mapped[m.targetField] = row[m.csvColumn] || '';
        }
      });
      return mapped;
    });
  }, [csvData, mappings]);

  const validateMappings = useCallback(() => {
    const unmapped = mappings.filter(m => m.isRequired && !m.targetField);
    if (unmapped.length > 0) {
      toast.error('يجب ربط جميع الحقول المطلوبة');
      return false;
    }
    return true;
  }, [mappings]);

  const processImport = useCallback(async () => {
    if (!validateMappings()) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const mappedData = csvData.map(row => {
        const mapped: Record<string, any> = {};
        mappings.forEach(m => {
          if (m.targetField) {
            mapped[m.targetField] = row[m.csvColumn] || null;
          }
        });
        return mapped;
      });

      setProgress(40);

      // Check duplicates
      const found: DuplicateRecord[] = [];
      const phones = new Set<string>();
      mappedData.forEach((record, idx) => {
        const phone = record.phone;
        if (phones.has(phone)) {
          found.push({
            rowIndex: idx,
            phone,
            name: `${record.first_name} ${record.last_name}`,
            action: 'skip',
          });
        }
        phones.add(phone);
      });

      if (found.length > 0 && !skipDuplicates) {
        setDuplicates(found);
        setStep('duplicates');
        setIsProcessing(false);
        return;
      }

      setProgress(70);

      const filtered = mappedData.filter(
        (_, idx) => !found.find(d => d.rowIndex === idx && d.action === 'skip')
      );

      const result = await smartUploadCustomers(filtered);

      setImportResult({
        totalRows: csvData.length,
        successfulImports: result.successful || filtered.length,
        duplicatesFound: found.length,
        failedImports: result.failed || 0,
      });

      setProgress(100);
      setStep('complete');
      toast.success('تم الاستيراد بنجاح');
    } catch (error) {
      toast.error('فشل الاستيراد');
    } finally {
      setIsProcessing(false);
    }
  }, [validateMappings, csvData, mappings, skipDuplicates, smartUploadCustomers]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('upload');
      setCsvFile(null);
      setCsvData([]);
      setMappings([]);
      setDuplicates([]);
      setImportResult(null);
      setSkipDuplicates(false);
    }, 300);
  };

  // Upload step
  if (step === 'upload') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              استيراد العملاء - الخطوة 1: رفع الملف
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Steps indicator */}
            <div className="flex gap-2 items-end">
              {['upload', 'mapping', 'preview', 'duplicates', 'complete'].map((s, i) => (
                <div key={s} className="flex-1">
                  <div className={`h-2 rounded-full ${s === 'upload' ? 'bg-blue-500' : 'bg-slate-200'}`} />
                </div>
              ))}
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  تحميل القالب
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => downloadTemplate()} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  تحميل قالب CSV
                </Button>
              </CardContent>
            </Card>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="hidden"
                id="csv-file"
              />
              <label htmlFor="csv-file" className="cursor-pointer block">
                <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p className="font-medium">اختر ملف CSV</p>
                <p className="text-sm text-slate-500">الحد الأقصى 100MB</p>
              </label>
            </div>

            {csvFile && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">{csvFile.name}</p>
                  <p className="text-sm text-slate-600">{csvData.length} صف</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>إلغاء</Button>
              <Button onClick={() => setStep('mapping')} disabled={!csvFile}>
                التالي <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Mapping step
  if (step === 'mapping') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              الخطوة 2: ربط الحقول
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={() => setMappings(generateMappings(csvHeaders))} variant="outline" className="w-full">
              <Wand2 className="h-4 w-4 mr-2" />
              ربط تلقائي ذكي
            </Button>

            <ScrollArea className="h-80 border rounded-lg p-4">
              <div className="space-y-3">
                {mappings.map(m => (
                  <div key={m.csvColumn} className="flex items-center gap-2 p-3 border rounded">
                    <div className="flex-1 text-sm font-medium">{m.csvColumn}</div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                    <Select value={m.targetField} onValueChange={v => updateMapping(m.csvColumn, v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر الحقل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- لا يوجد --</SelectItem>
                        {Object.entries(CUSTOMER_FIELDS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {m.confidence > 0 && (
                      <Badge variant={m.confidence > 0.8 ? 'default' : 'secondary'}>
                        {Math.round(m.confidence * 100)}%
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>رجوع</Button>
              <Button onClick={() => validateMappings() && setStep('preview')}>
                التالي <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Preview step
  if (step === 'preview') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              الخطوة 3: معاينة البيانات
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold text-blue-600">{csvData.length}</p>
                  <p className="text-sm text-slate-600">إجمالي الصفوف</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold text-green-600">{mappings.filter(m => m.targetField).length}</p>
                  <p className="text-sm text-slate-600">أعمدة مربوطة</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold text-orange-600">{mappings.filter(m => !m.targetField).length}</p>
                  <p className="text-sm text-slate-600">أعمدة مهملة</p>
                </CardContent>
              </Card>
            </div>

            <ScrollArea className="h-64 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {mappings.filter(m => m.targetField).map(m => (
                      <th key={m.targetField} className="px-4 py-2 text-right font-medium border-b">
                        {CUSTOMER_FIELDS[m.targetField as keyof typeof CUSTOMER_FIELDS]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="px-4 py-2">{String(val || '-').substring(0, 20)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep('mapping')}>رجوع</Button>
              <Button onClick={() => processImport()} disabled={isProcessing}>
                {isProcessing ? 'جاري...' : 'ابدأ الاستيراد'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Duplicates step
  if (step === 'duplicates') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              الخطوة 4: معالجة التكرارات
            </DialogTitle>
            <DialogDescription>تم العثور على {duplicates.length} سجل مكرر</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 border rounded-lg bg-orange-50">
              <Checkbox
                checked={skipDuplicates}
                onCheckedChange={(v) => setSkipDuplicates(v as boolean)}
              />
              <label className="text-sm cursor-pointer">تخطي جميع التكرارات</label>
            </div>

            {!skipDuplicates && (
              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-3">
                  {duplicates.map((dup, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium">الصف {dup.rowIndex}</p>
                        <p className="text-sm text-slate-600">{dup.name} - {dup.phone}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep('preview')}>رجوع</Button>
              <Button onClick={() => processImport()} disabled={isProcessing}>
                {isProcessing ? 'جاري...' : 'متابعة الاستيراد'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Complete step
  if (step === 'complete' && importResult) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              تم الاستيراد بنجاح
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold text-green-600">{importResult.successfulImports}</p>
                  <p className="text-sm text-slate-600">تم بنجاح</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold text-red-600">{importResult.failedImports}</p>
                  <p className="text-sm text-slate-600">فشل</p>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                تم استيراد {importResult.successfulImports} عميل من {importResult.totalRows} إجمالي
              </AlertDescription>
            </Alert>

            <Button onClick={handleClose} className="w-full">إغلاق</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
};

export default CustomerImportWizard;
