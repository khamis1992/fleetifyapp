import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle,
  X,
  FileText
} from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

interface CSVDragDropUploadProps {
  onFileProcessed: (data: any[], fileName: string) => void;
  onError: (error: string) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

export const CSVDragDropUpload: React.FC<CSVDragDropUploadProps> = ({
  onFileProcessed,
  onError,
  acceptedFileTypes = ['.csv', '.xlsx', '.xls'],
  maxFileSize = 100 * 1024 * 1024 // 100MB
}) => {
  const [uploadedFile, setUploadedFile] = useState<FileInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processCSVFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      
      // Parse CSV using Papa Parse
      const parseResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim()
      });

      if (parseResult.errors.length > 0) {
        console.warn('CSV Parse warnings:', parseResult.errors);
      }

      if (!parseResult.data || parseResult.data.length === 0) {
        throw new Error('الملف فارغ أو لا يحتوي على بيانات صالحة');
      }

      // Add row numbers for tracking
      const dataWithRowNumbers = parseResult.data.map((row: any, index: number) => ({
        ...row,
        _rowNumber: index + 2 // Account for header row
      }));

      // Filter out completely empty rows
      const validData = dataWithRowNumbers.filter((row: any) => {
        const values = Object.values(row).filter(val => val !== '' && val !== null && val !== undefined);
        return values.length > 1; // At least one non-empty value besides row number
      });

      if (validData.length === 0) {
        throw new Error('لم يتم العثور على بيانات صالحة في الملف');
      }

      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type
      });

      onFileProcessed(validData, file.name);
      toast.success(`تم تحميل الملف بنجاح - ${validData.length} صف`);

    } catch (error: any) {
      console.error('File processing error:', error);
      const errorMessage = error.message || 'خطأ في معالجة الملف';
      onError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [onFileProcessed, onError]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];

    // Validate file size
    if (file.size > maxFileSize) {
      const errorMessage = `حجم الملف كبير جداً. الحد الأقصى ${(maxFileSize / 1024 / 1024).toFixed(1)} ميجابايت`;
      onError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      const errorMessage = `نوع الملف غير مدعوم. الأنواع المدعومة: ${acceptedFileTypes.join(', ')}`;
      onError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    await processCSVFile(file);
  }, [acceptedFileTypes, maxFileSize, onError, processCSVFile]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    maxSize: maxFileSize
  });

  const removeFile = () => {
    setUploadedFile(null);
    onFileProcessed([], '');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          رفع ملف CSV
        </CardTitle>
        <CardDescription>
          اسحب وأفلت ملف CSV هنا أو انقر لاختيار ملف
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploadedFile ? (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive && !isDragReject ? 'border-blue-500 bg-blue-50' : ''}
              ${isDragReject ? 'border-red-500 bg-red-50' : ''}
              ${!isDragActive ? 'border-gray-300 hover:border-gray-400' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center gap-4">
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="text-lg font-medium">جاري معالجة الملف...</p>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-12 w-12 text-gray-400" />
                  {isDragActive ? (
                    <p className="text-lg font-medium text-blue-600">
                      أفلت الملف هنا...
                    </p>
                  ) : (
                    <>
                      <p className="text-lg font-medium">
                        اسحب وأفلت ملف CSV هنا
                      </p>
                      <p className="text-sm text-gray-500">
                        أو انقر لاختيار ملف من جهازك
                      </p>
                    </>
                  )}
                </>
              )}
            </div>

            {isDragReject && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  نوع الملف غير مدعوم. يرجى اختيار ملف CSV أو Excel.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{uploadedFile.name}</p>
                  <p className="text-sm text-green-600">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="text-green-700 hover:text-green-900"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* File Requirements */}
        <div className="space-y-2 text-sm text-gray-600">
          <p className="font-medium">متطلبات الملف:</p>
          <ul className="space-y-1 mr-4">
            <li>• الأعمدة المطلوبة: المستوى، رقم الحساب، الوصف، الوصف بالإنجليزي</li>
            <li>• أنواع الملفات المدعومة: {acceptedFileTypes.join(', ')}</li>
            <li>• الحد الأقصى لحجم الملف: {(maxFileSize / 1024 / 1024).toFixed(1)} ميجابايت</li>
            <li>• يجب أن يحتوي الصف الأول على أسماء الأعمدة</li>
          </ul>
        </div>

        {/* Sample Format */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>مثال على تنسيق الملف:</strong>
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
              المستوى,رقم الحساب,الوصف,الوصف بالإنجليزي<br/>
              1,1,الأصول,Assets<br/>
              2,11,الأصول المتداولة,Current Assets<br/>
              3,111,النقدية وما يعادلها,Cash and Cash Equivalents
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
