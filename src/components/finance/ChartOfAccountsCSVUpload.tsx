import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Undo,
  FileText,
  Layers,
  Eye,
  Save
} from 'lucide-react';
import { useEnhancedChartOfAccountsCSVUpload } from '@/hooks/useEnhancedChartOfAccountsCSVUpload';
import { CSVDragDropUpload } from './csv-import/CSVDragDropUpload';
import { AccountsPreviewTable } from './csv-import/AccountsPreviewTable';
import { AccountsTreeView } from './csv-import/AccountsTreeView';

interface ChartOfAccountsCSVUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export const ChartOfAccountsCSVUpload: React.FC<ChartOfAccountsCSVUploadProps> = ({
  open,
  onOpenChange,
  onUploadComplete
}) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState<string>('');
  
  const {
    processCSVFile,
    processCSVData,
    uploadAccounts,
    downloadTemplate,
    isUploading,
    progress,
    results,
    processedData,
    hierarchyErrors
  } = useEnhancedChartOfAccountsCSVUpload();

  // معالجة رفع الملف
  const handleFileProcessed = async (data: any[], fileName: string) => {
    try {
      setUploadError('');
      setCsvData(data);
      setFileName(fileName);
      
      // معالجة البيانات وإنشاء التسلسل الهرمي
      processCSVData(data);
      
      // الانتقال إلى تبويب المعاينة
      setActiveTab('preview');
    } catch (error: any) {
      setUploadError(error.message);
    }
  };

  const handleFileError = (error: string) => {
    setUploadError(error);
    setCsvData([]);
    setFileName('');
  };

  const handleSaveAccounts = async () => {
    if (processedData.length === 0) {
      setUploadError('لا توجد بيانات للحفظ');
      return;
    }

    await uploadAccounts();
    if (results && (results.successful > 0 || results.updated > 0)) {
      onUploadComplete();
    }
  };

  const resetUpload = () => {
    setCsvData([]);
    setFileName('');
    setUploadError('');
    setActiveTab('upload');
  };

  // الانتقال إلى تبويب النتائج عند اكتمال الرفع
  useEffect(() => {
    if (results && !isUploading) {
      setActiveTab('results');
    }
  }, [results, isUploading]);

  const downloadErrorReport = () => {
    if (!results?.errors.length && !results?.hierarchyErrors.length) return;

    const headers = ['نوع الخطأ', 'رقم الصف', 'رقم الحساب', 'رسالة الخطأ'];
    const csvContent = [
      headers.join(','),
      ...(results?.errors.map(error => 
        ['خطأ في البيانات', error.row, error.account_code || '', error.message].map(cell => `"${cell}"`).join(',')
      ) || []),
      ...(results?.hierarchyErrors.map(error => 
        ['خطأ في التسلسل الهرمي', error.rowNumber, error.accountCode, error.message].map(cell => `"${cell}"`).join(',')
      ) || [])
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'chart_accounts_errors.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            استيراد شجرة الحسابات (CSV)
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger 
              value="upload" 
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              رفع الملف
            </TabsTrigger>
            <TabsTrigger 
              value="preview"
              className="flex items-center gap-2"
              disabled={csvData.length === 0}
            >
              <Eye className="h-4 w-4" />
              معاينة البيانات
            </TabsTrigger>
            <TabsTrigger 
              value="tree"
              className="flex items-center gap-2"
              disabled={processedData.length === 0}
            >
              <Layers className="h-4 w-4" />
              شجرة الحسابات
            </TabsTrigger>
            <TabsTrigger 
              value="results"
              className="flex items-center gap-2"
              disabled={!results}
            >
              <CheckCircle className="h-4 w-4" />
              النتائج
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {/* Template Download */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  تحميل القالب
                </CardTitle>
                <CardDescription>
                  قم بتحميل قالب CSV لتعبئة بيانات شجرة الحسابات
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={downloadTemplate}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  تحميل قالب CSV
                </Button>
              </CardContent>
            </Card>

            {/* File Upload */}
            <CSVDragDropUpload
              onFileProcessed={handleFileProcessed}
              onError={handleFileError}
            />

            {/* Upload Error */}
            {uploadError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  تعليمات الاستيراد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-2">
                  <p className="font-medium">الأعمدة المطلوبة:</p>
                  <ul className="space-y-1 mr-4">
                    <li>• <strong>المستوى:</strong> مستوى الحساب في الشجرة (1-6)</li>
                    <li>• <strong>رقم الحساب:</strong> رقم الحساب الفريد</li>
                    <li>• <strong>الوصف:</strong> اسم الحساب بالعربية</li>
                    <li>• <strong>الوصف بالإنجليزي:</strong> اسم الحساب بالإنجليزية</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium">قواعد التسلسل الهرمي:</p>
                  <ul className="space-y-1 mr-4">
                    <li>• كل حساب يعرف أبوه بالاعتماد على رقم الحساب</li>
                    <li>• مثال: 1110101 ابن للحساب 11101، وهذا ابن للحساب 111</li>
                    <li>• يجب أن يكون الحساب الأب موجوداً قبل الحساب الفرعي</li>
                    <li>• إذا لم يتم العثور على الأب → سيظهر الحساب باللون الأحمر</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-medium">ميزات النظام:</p>
                  <ul className="space-y-1 mr-4">
                    <li>• تحديد نوع الحساب تلقائياً بناءً على الرقم</li>
                    <li>• إنشاء التسلسل الهرمي تلقائياً</li>
                    <li>• التحقق من صحة العلاقات الهرمية</li>
                    <li>• معاينة البيانات قبل الحفظ</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  ملف: {fileName}
                </Badge>
                <Badge variant="secondary">
                  {csvData.length} سجل
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetUpload}>
                  <Undo className="h-4 w-4 ml-2" />
                  إعادة تحميل
                </Button>
                <Button 
                  onClick={() => setActiveTab('tree')}
                  disabled={processedData.length === 0}
                >
                  <Layers className="h-4 w-4 ml-2" />
                  عرض الشجرة
                </Button>
              </div>
            </div>

            <AccountsPreviewTable 
              data={csvData}
              hierarchyErrors={hierarchyErrors}
            />
          </TabsContent>

          {/* Tree Tab */}
          <TabsContent value="tree" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {processedData.length} حساب
                </Badge>
                {hierarchyErrors.length > 0 && (
                  <Badge variant="destructive">
                    {hierarchyErrors.length} خطأ هرمي
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setActiveTab('preview')}>
                  <Eye className="h-4 w-4 ml-2" />
                  عودة للمعاينة
                </Button>
                <Button 
                  onClick={handleSaveAccounts}
                  disabled={isUploading || processedData.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 ml-2" />
                  {isUploading ? 'جاري الحفظ...' : 'حفظ الحسابات'}
                </Button>
              </div>
            </div>

            <AccountsTreeView 
              data={csvData}
              hierarchyErrors={hierarchyErrors}
            />
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {/* Upload Progress */}
            {isUploading && (
              <Card>
                <CardHeader>
                  <CardTitle>جاري حفظ الحسابات...</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {progress.toFixed(1)}% مكتمل
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Upload Results */}
            {results && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    نتائج الاستيراد
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {results.successful}
                      </div>
                      <div className="text-sm text-green-700">تم إنشاؤها</div>
                    </div>
                    
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {results.updated}
                      </div>
                      <div className="text-sm text-blue-700">تم تحديثها</div>
                    </div>
                    
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {results.skipped}
                      </div>
                      <div className="text-sm text-yellow-700">تم تخطيها</div>
                    </div>
                    
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {results.failed + results.hierarchyErrors.length}
                      </div>
                      <div className="text-sm text-red-700">فشلت</div>
                    </div>
                  </div>

                  {/* Success Message */}
                  {(results.successful > 0 || results.updated > 0) && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        ✅ تم استيراد شجرة الحسابات بنجاح - {results.successful + results.updated} حساب
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Hierarchy Errors */}
                  {results.hierarchyErrors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-700 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        أخطاء التسلسل الهرمي ({results.hierarchyErrors.length})
                      </h4>
                      
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {results.hierarchyErrors.slice(0, 10).map((error, index) => (
                          <Alert key={index} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>صف {error.rowNumber}:</strong> حساب {error.accountCode} - {error.message}
                            </AlertDescription>
                          </Alert>
                        ))}
                        
                        {results.hierarchyErrors.length > 10 && (
                          <p className="text-sm text-muted-foreground">
                            وأخطاء أخرى... ({results.hierarchyErrors.length - 10} إضافية)
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Data Errors */}
                  {results.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-700 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        أخطاء البيانات ({results.errors.length})
                      </h4>
                      
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {results.errors.slice(0, 10).map((error, index) => (
                          <Alert key={index} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>صف {error.row}:</strong> {error.message}
                              {error.account_code && ` (حساب: ${error.account_code})`}
                            </AlertDescription>
                          </Alert>
                        ))}
                        
                        {results.errors.length > 10 && (
                          <p className="text-sm text-muted-foreground">
                            وأخطاء أخرى... ({results.errors.length - 10} إضافية)
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Download Error Report */}
                  {(results.errors.length > 0 || results.hierarchyErrors.length > 0) && (
                    <Button 
                      onClick={downloadErrorReport}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      تحميل تقرير الأخطاء
                    </Button>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button onClick={resetUpload} variant="outline">
                      <Upload className="h-4 w-4 ml-2" />
                      استيراد ملف جديد
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>
                      إغلاق
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};