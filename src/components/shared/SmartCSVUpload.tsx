
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileSpreadsheet,
  Wand2,
  Eye,
  FileText,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { 
  normalizeCSVHeaders, 
  detectFieldTypes, 
  cleanAndNormalizeData, 
  generateTemplate,
  processAccountsWithHierarchy,
  validateAccountHierarchy 
} from '@/utils/csv';

export interface SmartCSVFieldType {
  type: 'text' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'select';
  options?: string[];
  required?: boolean;
  validate?: (value: any) => boolean | string;
}

export interface SmartCSVUploadProps {
  entityType: string;
  onComplete: (data: any[]) => void;
  fieldTypes: Record<string, SmartCSVFieldType>;
  templateData?: {
    headers: string[];
    exampleRows: string[][];
  };
  maxFileSize?: number;
  allowedExtensions?: string[];
  className?: string;
}

interface ParsedData {
  headers: string[];
  rows: any[][];
  normalizedHeaders: Record<string, string>;
  detectedTypes: Record<string, string>;
  errors: Array<{ row: number; column: string; message: string; value: any }>;
  warnings: Array<{ row: number; column: string; message: string; value: any }>;
}

interface ColumnMapping {
  csvColumn: string;
  targetField: string;
  confidence: number;
  isRequired: boolean;
}

export const SmartCSVUpload: React.FC<SmartCSVUploadProps> = ({
  entityType,
  onComplete,
  fieldTypes,
  templateData,
  maxFileSize = 100 * 1024 * 1024, // 100MB
  allowedExtensions = ['.csv', '.xlsx', '.xls'],
  className = ''
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');

  // Generate intelligent column mappings
  const generateColumnMappings = useCallback((headers: string[], normalizedHeaders: Record<string, string>) => {
    const mappings: ColumnMapping[] = [];
    const availableFields = Object.keys(fieldTypes);
    
    headers.forEach(header => {
      const normalizedHeader = normalizedHeaders[header] || header.toLowerCase();
      let bestMatch = '';
      let confidence = 0;

      // Find best matching target field
      for (const field of availableFields) {
        const fieldLower = field.toLowerCase();
        const similarity = calculateSimilarity(normalizedHeader, fieldLower);
        
        if (similarity > confidence) {
          confidence = similarity;
          bestMatch = field;
        }
      }

      mappings.push({
        csvColumn: header,
        targetField: bestMatch || '', // Use empty string if no match found
        confidence,
        isRequired: fieldTypes[bestMatch]?.required || false
      });
    });

    return mappings;
  }, [fieldTypes]);

  // Calculate text similarity
  const calculateSimilarity = (text1: string, text2: string): number => {
    if (!text1 || !text2) return 0;
    
    const normalize = (text: string) => text.toLowerCase().trim()
      .replace(/[_\-\s]+/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/[ة]/g, 'ه')
      .replace(/[ى]/g, 'ي');
    
    const str1 = normalize(text1);
    const str2 = normalize(text2);
    
    if (str1 === str2) return 1.0;
    if (str1.includes(str2) || str2.includes(str1)) return 0.8;
    
    // Jaccard similarity
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > maxFileSize) {
      alert(`حجم الملف كبير جداً. الحد الأقصى ${maxFileSize / 1024 / 1024}MB`);
      return;
    }

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      alert(`نوع الملف غير مدعوم. الأنواع المدعومة: ${allowedExtensions.join(', ')}`);
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    setUploadProgress(0);

    try {
      // Parse file
      setUploadProgress(25);
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('الملف فارغ');
      }

      setUploadProgress(50);
      
      // Parse CSV
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const rows = lines.slice(1).map(line => 
        line.split(',').map(cell => cell.replace(/"/g, '').trim())
      );

      setUploadProgress(75);

      // Normalize and analyze
      const normalizedHeaders = normalizeCSVHeaders(headers);
      const detectedTypes = detectFieldTypes(rows, headers);
      const cleanedData = cleanAndNormalizeData(rows, headers, fieldTypes);

      setUploadProgress(90);

      const parsed: ParsedData = {
        headers,
        rows: cleanedData.data,
        normalizedHeaders,
        detectedTypes,
        errors: cleanedData.errors,
        warnings: cleanedData.warnings
      };

      setParsedData(parsed);
      
      // Generate mappings
      const mappings = generateColumnMappings(headers, normalizedHeaders);
      setColumnMappings(mappings);
      
      setUploadProgress(100);
      setCurrentStep('mapping');
      
    } catch (error) {
      console.error('Error parsing file:', error);
      alert(`خطأ في معالجة الملف: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [maxFileSize, allowedExtensions, fieldTypes, generateColumnMappings]);

  // Update column mapping
  const updateColumnMapping = useCallback((csvColumn: string, targetField: string) => {
    setColumnMappings(prev => prev.map(mapping => 
      mapping.csvColumn === csvColumn 
        ? { ...mapping, targetField }
        : mapping
    ));
  }, []);

  // Auto-map columns using AI suggestions
  const autoMapColumns = useCallback(() => {
    if (!parsedData) return;
    
    const newMappings = generateColumnMappings(parsedData.headers, parsedData.normalizedHeaders);
    setColumnMappings(newMappings);
  }, [parsedData, generateColumnMappings]);

  // Preview mapped data
  const previewData = useMemo(() => {
    if (!parsedData) return [];
    
    return parsedData.rows.slice(0, 5).map(row => {
      const mappedRow: Record<string, any> = {};
      
      columnMappings.forEach(mapping => {
        if (mapping.targetField) { // Only process non-empty target fields
          const columnIndex = parsedData.headers.indexOf(mapping.csvColumn);
          if (columnIndex >= 0) {
            mappedRow[mapping.targetField] = row[columnIndex];
          }
        }
      });
      
      return mappedRow;
    });
  }, [parsedData, columnMappings]);

  // Process and complete upload
  const completeUpload = useCallback(() => {
    if (!parsedData) return;
    
    let finalData = parsedData.rows.map(row => {
      const mappedRow: Record<string, any> = {};
      
      columnMappings.forEach(mapping => {
        if (mapping.targetField) { // Only process non-empty target fields
          const columnIndex = parsedData.headers.indexOf(mapping.csvColumn);
          if (columnIndex >= 0) {
            mappedRow[mapping.targetField] = row[columnIndex];
          }
        }
      });
      
      return mappedRow;
    });

    // Apply chart of accounts specific processing
    if (entityType === 'chart_account') {
      finalData = processAccountsWithHierarchy(finalData);
    }

    onComplete(finalData);
    setCurrentStep('complete');
  }, [parsedData, columnMappings, onComplete, entityType]);

  // Download template
  const downloadTemplate = useCallback(() => {
    if (!templateData) return;
    
    const template = generateTemplate(templateData.headers, templateData.exampleRows);
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${entityType}_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [entityType, templateData]);

  // Reset upload
  const resetUpload = useCallback(() => {
    setSelectedFile(null);
    setParsedData(null);
    setColumnMappings([]);
    setCurrentStep('upload');
    setUploadProgress(0);
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Steps indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 space-x-reverse">
          {['upload', 'mapping', 'preview', 'complete'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep === step ? 'bg-primary text-primary-foreground' :
                ['upload', 'mapping', 'preview'].indexOf(currentStep) > index ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {['upload', 'mapping', 'preview'].indexOf(currentStep) > index ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {index < 3 && (
                <div className={`w-8 h-0.5 ${
                  ['upload', 'mapping', 'preview'].indexOf(currentStep) > index ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        {currentStep !== 'upload' && (
          <Button variant="outline" size="sm" onClick={resetUpload}>
            <RotateCcw className="w-4 h-4 mr-2" />
            إعادة تعيين
          </Button>
        )}
      </div>

      <Tabs value={currentStep} className="w-full">
        {/* Upload Step */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                رفع الملف الذكي
              </CardTitle>
              <CardDescription>
                قم برفع ملف CSV أو Excel وسيتم تحليله وإصلاحه تلقائياً
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templateData && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    تحميل القالب
                  </Button>
                </div>
              )}
              
              <div>
                <Label htmlFor="file-upload">اختر الملف</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept={allowedExtensions.join(',')}
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
              </div>

              {selectedFile && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{selectedFile.name}</span>
                  <Badge variant="secondary">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
              )}

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>معالجة الملف...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mapping Step */}
        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                ربط الأعمدة
              </CardTitle>
              <CardDescription>
                قم بربط أعمدة ملف CSV بالحقول المطلوبة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={autoMapColumns} variant="outline">
                  <Wand2 className="w-4 h-4 mr-2" />
                  ربط تلقائي ذكي
                </Button>
              </div>

              <div className="space-y-3">
                {columnMappings.map((mapping) => (
                  <div key={mapping.csvColumn} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{mapping.csvColumn}</div>
                      <div className="text-sm text-muted-foreground">
                        عمود CSV
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <Select
                        value={mapping.targetField || "none"}
                        onValueChange={(value) => updateColumnMapping(mapping.csvColumn, value === "none" ? "" : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحقل المطلوب" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- لا يوجد ربط --</SelectItem>
                          {Object.keys(fieldTypes).map((field) => (
                            <SelectItem key={field} value={field}>
                              {field}
                              {fieldTypes[field].required && (
                                <Badge variant="destructive" className="mr-2">مطلوب</Badge>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="text-center">
                      <Badge variant={mapping.confidence > 0.7 ? "default" : mapping.confidence > 0.4 ? "secondary" : "outline"}>
                        {Math.round(mapping.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setCurrentStep('preview')} disabled={!columnMappings.some(m => m.targetField)}>
                  <Eye className="w-4 h-4 mr-2" />
                  معاينة البيانات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Step */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                معاينة البيانات
              </CardTitle>
              <CardDescription>
                تأكد من صحة البيانات قبل الحفظ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {parsedData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {parsedData.rows.length}
                      </div>
                      <div className="text-sm text-blue-700">إجمالي الصفوف</div>
                    </div>
                    
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {parsedData.warnings.length}
                      </div>
                      <div className="text-sm text-yellow-700">تحذيرات</div>
                    </div>
                    
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {parsedData.errors.length}
                      </div>
                      <div className="text-sm text-red-700">أخطاء</div>
                    </div>
                  </div>

                  <ScrollArea className="h-64 border rounded-lg">
                    <div className="p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {columnMappings.filter(m => m.targetField).map(mapping => (
                              <th key={mapping.targetField} className="text-right p-2 font-medium">
                                {mapping.targetField}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, index) => (
                            <tr key={index} className="border-b">
                              {columnMappings.filter(m => m.targetField).map(mapping => (
                                <td key={mapping.targetField} className="p-2">
                                  {row[mapping.targetField] || '--'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>

                  {parsedData.errors.length > 0 && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        يوجد {parsedData.errors.length} أخطاء في البيانات. سيتم تخطي الصفوف التي تحتوي على أخطاء.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={() => setCurrentStep('mapping')} variant="outline">
                      السابق
                    </Button>
                    <Button onClick={completeUpload}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      إتمام الرفع
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Complete Step */}
        <TabsContent value="complete" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                تم الرفع بنجاح
              </CardTitle>
              <CardDescription>
                تم رفع البيانات ومعالجتها بنجاح
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">تمت العملية بنجاح!</h3>
                <p className="text-muted-foreground mb-4">
                  تم رفع ومعالجة البيانات بنجاح
                </p>
                <Button onClick={resetUpload}>
                  رفع ملف جديد
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
