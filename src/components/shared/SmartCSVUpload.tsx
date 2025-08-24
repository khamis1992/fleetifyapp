import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Wand2,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { normalizeCsvHeaders } from '@/utils/csv';

interface SmartCSVUploadProps {
  entityType: 'customer' | 'vehicle' | 'contract' | 'payment' | 'chart_account';
  onComplete: (data: any[]) => void;
  fieldTypes: Record<string, 'text' | 'number' | 'date' | 'email' | 'phone' | 'select' | 'boolean'>;
  templateData?: {
    headers: string[];
    exampleRows: string[][];
  };
}

export const SmartCSVUpload: React.FC<SmartCSVUploadProps> = ({
  entityType,
  onComplete,
  fieldTypes,
  templateData
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping' | 'validation' | 'complete'>('upload');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Array<{ row: number; field: string; message: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const downloadTemplate = () => {
    if (!templateData) return;
    
    const csvContent = [
      templateData.headers.join(','),
      ...templateData.exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${entityType}_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(header => 
      header.replace(/"/g, '').trim()
    );
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(value => 
        value.replace(/"/g, '').trim()
      );
      
      const row: any = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      
      row._rowNumber = index + 2;
      return row;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);
    
    try {
      const text = await uploadedFile.text();
      const parsedData = parseCSV(text);
      
      if (parsedData.length === 0) {
        throw new Error('لا توجد بيانات في الملف');
      }

      // تطبيق تطبيع العناوين
      const normalizedData = parsedData.map(row => 
        normalizeCsvHeaders(row, entityType)
      );

      setData(normalizedData);
      
      // إنشاء خريطة تلقائية للحقول
      const autoMapping: Record<string, string> = {};
      const availableFields = Object.keys(fieldTypes);
      const csvHeaders = Object.keys(normalizedData[0] || {}).filter(h => h !== '_rowNumber');
      
      csvHeaders.forEach(header => {
        const matchingField = availableFields.find(field => 
          field === header || 
          field.toLowerCase() === header.toLowerCase() ||
          header.toLowerCase().includes(field.toLowerCase())
        );
        if (matchingField) {
          autoMapping[header] = matchingField;
        }
      });
      
      setMapping(autoMapping);
      setStep('preview');
      toast.success(`تم تحميل ${parsedData.length} صف من البيانات`);
      
    } catch (error: any) {
      toast.error(`خطأ في تحميل الملف: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const validateData = () => {
    setIsProcessing(true);
    setProgress(0);
    const validationErrors: Array<{ row: number; field: string; message: string }> = [];
    
    data.forEach((row, index) => {
      Object.entries(mapping).forEach(([csvField, dbField]) => {
        const value = row[csvField];
        const fieldType = fieldTypes[dbField];
        const rowNumber = row._rowNumber || index + 2;
        
        if (!value && ['account_code', 'account_name', 'account_type', 'balance_type'].includes(dbField)) {
          validationErrors.push({
            row: rowNumber,
            field: dbField,
            message: `الحقل ${dbField} مطلوب`
          });
        }
        
        if (value && fieldType === 'number' && isNaN(Number(value))) {
          validationErrors.push({
            row: rowNumber,
            field: dbField,
            message: `${dbField} يجب أن يكون رقماً`
          });
        }
        
        if (value && fieldType === 'email' && !value.includes('@')) {
          validationErrors.push({
            row: rowNumber,
            field: dbField,
            message: `${dbField} غير صحيح`
          });
        }
      });
      
      setProgress(((index + 1) / data.length) * 100);
    });
    
    setErrors(validationErrors);
    setStep('validation');
    setIsProcessing(false);
  };

  const fixDataAutomatically = () => {
    const fixedData = data.map(row => {
      const fixedRow: any = {};
      
      Object.entries(mapping).forEach(([csvField, dbField]) => {
        let value = row[csvField];
        const fieldType = fieldTypes[dbField];
        
        // إصلاح البيانات تلقائياً
        if (fieldType === 'boolean' && typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (['true', '1', 'نعم', 'yes'].includes(lowerValue)) {
            value = true;
          } else if (['false', '0', 'لا', 'no'].includes(lowerValue)) {
            value = false;
          }
        }
        
        if (fieldType === 'number' && value && !isNaN(Number(value))) {
          value = Number(value);
        }
        
        if (fieldType === 'text' && value) {
          value = value.toString().trim();
        }
        
        if (value) {
          fixedRow[dbField] = value;
        }
      });
      
      return fixedRow;
    }).filter(row => Object.keys(row).length > 0);
    
    onComplete(fixedData);
    setStep('complete');
    toast.success(`تم إصلاح ومعالجة ${fixedData.length} صف من البيانات`);
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      {templateData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              تحميل القالب
            </CardTitle>
            <CardDescription>
              قم بتحميل قالب CSV لتعبئة البيانات بالتنسيق الصحيح
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={downloadTemplate}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تحميل القالب
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            رفع الملف
          </CardTitle>
          <CardDescription>
            اختر ملف CSV يحتوي على البيانات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
              disabled={isProcessing}
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                {isProcessing ? 'جاري تحميل الملف...' : 'اضغط لاختيار ملف CSV'}
              </p>
              <p className="text-sm text-muted-foreground">
                أو اسحب الملف هنا
              </p>
            </label>
          </div>
          
          {isProcessing && (
            <div className="mt-4">
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            معاينة البيانات
          </CardTitle>
          <CardDescription>
            تحقق من البيانات المحملة وخريطة الحقول
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {data.length} صف من البيانات
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'إخفاء المعاينة' : 'عرض المعاينة'}
            </Button>
          </div>

          {showPreview && (
            <div className="max-h-64 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(data[0] || {}).filter(k => k !== '_rowNumber').map(header => (
                      <TableHead key={header} className="text-right">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      {Object.keys(row).filter(k => k !== '_rowNumber').map(key => (
                        <TableCell key={key} className="text-right">
                          {row[key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-medium">خريطة الحقول</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(data[0] || {}).filter(k => k !== '_rowNumber').map(csvField => (
                <div key={csvField} className="flex items-center gap-2">
                  <span className="text-sm font-medium min-w-[100px]">
                    {csvField}:
                  </span>
                  <Select
                    value={mapping[csvField] || ''}
                    onValueChange={(value) => setMapping(prev => ({ ...prev, [csvField]: value }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="اختر الحقل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- لا شيء --</SelectItem>
                      {Object.keys(fieldTypes).map(field => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setStep('upload')} variant="outline">
              رجوع
            </Button>
            <Button onClick={validateData} disabled={Object.keys(mapping).length === 0}>
              التحقق من البيانات
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderValidationStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            نتائج التحقق
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {data.length - errors.length}
              </div>
              <div className="text-sm text-green-700">صفوف صحيحة</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {errors.length}
              </div>
              <div className="text-sm text-red-700">أخطاء</div>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                الأخطاء الموجودة
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {errors.slice(0, 10).map((error, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>صف {error.row}:</strong> {error.message} ({error.field})
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={() => setStep('preview')} variant="outline">
              رجوع
            </Button>
            <Button 
              onClick={fixDataAutomatically}
              className="flex items-center gap-2"
            >
              <Wand2 className="h-4 w-4" />
              إصلاح تلقائي ومتابعة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCompleteStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          تم الانتهاء بنجاح
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground">
          تم رفع ومعالجة البيانات بنجاح
        </p>
      </CardContent>
    </Card>
  );

  if (step === 'upload') return renderUploadStep();
  if (step === 'preview') return renderPreviewStep();
  if (step === 'validation') return renderValidationStep();
  if (step === 'complete') return renderCompleteStep();

  return null;
};