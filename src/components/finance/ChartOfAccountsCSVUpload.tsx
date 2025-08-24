import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
import { useChartOfAccountsCSVUpload } from '@/hooks/useChartOfAccountsCSVUpload';
import { SmartCSVUpload } from '@/components/shared/SmartCSVUpload';

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
  const [uploadMode, setUploadMode] = useState<'classic' | 'smart'>('classic');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const {
    uploadAccounts,
    smartUploadAccounts,
    downloadTemplate,
    isUploading,
    progress,
    results,
    fieldTypes
  } = useChartOfAccountsCSVUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    await uploadAccounts(selectedFile);
    onUploadComplete();
  };

  const handleSmartUploadComplete = (data: any[]) => {
    smartUploadAccounts(data);
    onUploadComplete();
  };

  const downloadErrorReport = () => {
    if (!results?.errors.length) return;

    const headers = ['رقم الصف', 'رقم الحساب', 'رسالة الخطأ'];
    const csvContent = [
      headers.join(','),
      ...results.errors.map(error => 
        [error.row, error.account_code || '', error.message].map(cell => `"${cell}"`).join(',')
      )
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

  if (uploadMode === 'smart') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              الرفع الذكي لدليل الحسابات
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setUploadMode('classic')}
              >
                الرفع التقليدي
              </Button>
              <Button
                variant="default"
                onClick={() => setUploadMode('smart')}
              >
                الرفع الذكي
              </Button>
            </div>

            <SmartCSVUpload
              entityType="chart_account"
              onComplete={handleSmartUploadComplete}
              fieldTypes={fieldTypes}
              templateData={{
                headers: [
                  'account_code',
                  'account_name', 
                  'account_name_ar',
                  'account_type',
                  'balance_type',
                  'parent_account_code'
                ],
                exampleRows: [
                  ['1', 'Assets', 'الأصول', 'assets', 'debit', ''],
                  ['11', 'Current Assets', 'الأصول المتداولة', 'assets', 'debit', '1'],
                  ['1101', 'Cash', 'النقدية', 'assets', 'debit', '11']
                ]
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            رفع ملف دليل الحسابات
          </DialogTitle>
        </DialogHeader>

        <Tabs value="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="upload" 
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              رفع الملف
            </TabsTrigger>
            <TabsTrigger 
              value="smart"
              onClick={() => setUploadMode('smart')}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              الرفع الذكي
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
                  قم بتحميل قالب Excel/CSV لتعبئة بيانات دليل الحسابات
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  رفع الملف
                </CardTitle>
                <CardDescription>
                  اختر ملف CSV أو Excel يحتوي على بيانات دليل الحسابات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-primary file:text-primary-foreground
                      hover:file:bg-primary/90"
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

                <Button 
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full"
                >
                  {isUploading ? 'جاري الرفع...' : 'رفع الملف'}
                </Button>
              </CardContent>
            </Card>

            {/* Upload Progress */}
            {isUploading && (
              <Card>
                <CardHeader>
                  <CardTitle>جاري معالجة الملف...</CardTitle>
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
                    نتائج الرفع
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
                        {results.failed}
                      </div>
                      <div className="text-sm text-red-700">فشلت</div>
                    </div>
                  </div>

                  {results.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        الأخطاء ({results.errors.length})
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

                      <Button 
                        onClick={downloadErrorReport}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        تحميل تقرير الأخطاء
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Important Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  ملاحظات مهمة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• تأكد من أن الملف يحتوي على الأعمدة المطلوبة: رقم الحساب، اسم الحساب، نوع الحساب، نوع الرصيد</p>
                <p>• أنواع الحسابات المدعومة: assets, liabilities, equity, revenue, expenses</p>
                <p>• أنواع الرصيد المدعومة: debit, credit</p>
                <p>• يمكن ربط الحسابات الفرعية بحساباتها الرئيسية باستخدام رقم الحساب الأب</p>
                <p>• سيتم تحديث الحسابات الموجودة إذا كان رقم الحساب مطابق</p>
                <p>• استخدم الرفع الذكي للحصول على مساعدة تلقائية في إصلاح البيانات</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};