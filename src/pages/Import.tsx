import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileText,
  Users,
  Car,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

interface ImportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  fields: string[];
  sampleData: Record<string, any>[];
  validation: Record<string, any>;
}

const ImportInner: React.FC = () => {
  const { user } = useAuth();
  const { companyId, hasCompanyAdminAccess } = useUnifiedCompanyAccess();
  
  const [activeTab, setActiveTab] = useState('customers');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // قوالب الاستيراد
  const importTemplates: ImportTemplate[] = [
    {
      id: 'customers',
      name: 'العملاء',
      description: 'استيراد بيانات العملاء من ملف CSV',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      fields: ['first_name', 'last_name', 'email', 'phone', 'customer_type', 'company_name'],
      sampleData: [
        { first_name: 'أحمد', last_name: 'محمد', email: 'ahmed@example.com', phone: '0501234567', customer_type: 'individual' },
        { company_name: 'شركة المثال', email: 'info@example.com', phone: '0501234568', customer_type: 'corporate' }
      ],
      validation: {
        required: ['first_name', 'phone'],
        email: 'email',
        phone: 'phone'
      }
    },
    {
      id: 'vehicles',
      name: 'المركبات',
      description: 'استيراد بيانات المركبات من ملف CSV',
      icon: Car,
      color: 'from-green-500 to-green-600',
      fields: ['make', 'model', 'year', 'plate_number', 'vin', 'color', 'fuel_type'],
      sampleData: [
        { make: 'تويوتا', model: 'كامري', year: 2023, plate_number: 'أ ب ج 1234', vin: '1234567890', color: 'أبيض', fuel_type: 'بنزين' }
      ],
      validation: {
        required: ['make', 'model', 'plate_number'],
        year: 'number'
      }
    },
    {
      id: 'contracts',
      name: 'العقود',
      description: 'استيراد بيانات العقود من ملف CSV',
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      fields: ['contract_number', 'customer_id', 'vehicle_id', 'start_date', 'end_date', 'monthly_amount'],
      sampleData: [
        { contract_number: 'C-2024-001', customer_id: 'customer-id', vehicle_id: 'vehicle-id', start_date: '2024-01-01', end_date: '2024-12-31', monthly_amount: 1500 }
      ],
      validation: {
        required: ['contract_number', 'customer_id', 'vehicle_id', 'start_date'],
        monthly_amount: 'number'
      }
    },
    {
      id: 'payments',
      name: 'المدفوعات',
      description: 'استيراد بيانات المدفوعات من ملف CSV',
      icon: DollarSign,
      color: 'from-yellow-500 to-yellow-600',
      fields: ['payment_date', 'amount', 'payment_method', 'reference_number', 'customer_id', 'contract_id'],
      sampleData: [
        { payment_date: '2024-01-15', amount: 1500, payment_method: 'تحويل بنكي', reference_number: 'REF123', customer_id: 'customer-id' }
      ],
      validation: {
        required: ['payment_date', 'amount', 'customer_id'],
        amount: 'number'
      }
    }
  ];

  const currentTemplate = importTemplates.find(t => t.id === activeTab);

  // معالج رفع الملفات
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFiles = acceptedFiles.filter(file => 
      file.type === 'text/csv' || file.name.endsWith('.csv')
    );
    
    if (csvFiles.length === 0) {
      toast.error('يرجى رفع ملفات CSV فقط');
      return;
    }

    setUploadedFiles(csvFiles);
    previewFile(csvFiles[0]);
    toast.success(`تم رفع ${csvFiles.length} ملف`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 5
  });

  // معاينة الملف
  const previewFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = lines.slice(1, 6).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    setPreviewData(data);
  };

  // معالجة الاستيراد
  const processImport = async () => {
    if (!uploadedFiles.length || !companyId || !currentTemplate) {
      toast.error('يرجى رفع ملف أولاً');
      return;
    }

    if (!hasCompanyAdminAccess) {
      toast.error('ليس لديك صلاحية للاستيراد');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults(null);

    try {
      const file = uploadedFiles[0];
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      const warnings: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = { company_id: companyId };
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // التحقق من الحقول المطلوبة
        const missingFields = currentTemplate.validation.required?.filter(
          (field: string) => !row[field]
        ) || [];

        if (missingFields.length > 0) {
          errors.push(`السطر ${i}: حقول مطلوبة مفقودة: ${missingFields.join(', ')}`);
          failedCount++;
          continue;
        }

        try {
          // استيراد حسب النوع
          let result;
          switch (activeTab) {
            case 'customers':
              result = await supabase
                .from('customers')
                .insert([row]);
              break;
            case 'vehicles':
              result = await supabase
                .from('vehicles')
                .insert([row]);
              break;
            case 'contracts':
              result = await supabase
                .from('contracts')
                .insert([row]);
              break;
            case 'payments':
              // معالجة خاصة للمدفوعات
              const normalizePaymentType = (type: string) => {
                const arabicToEnglish: Record<string, string> = {
                  'نقدي': 'cash',
                  'شيك': 'check', 
                  'تحويل بنكي': 'bank_transfer',
                  'بطاقة ائتمان': 'credit_card',
                  'بطاقة خصم': 'debit_card'
                };
                return arabicToEnglish[type] || type;
              };

              const processedPayment = {
                ...row,
                company_id: companyId,
                payment_number: row.payment_number || `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                payment_type: normalizePaymentType(row.payment_type || row.payment_method || 'cash'),
                payment_method: normalizePaymentType(row.payment_method || row.payment_type || 'cash'),
                amount: typeof row.amount === 'string' 
                  ? parseFloat(row.amount.replace(/[^\d.-]/g, '')) 
                  : parseFloat(row.amount) || 0,
                payment_status: row.payment_status || 'completed',
                transaction_type: row.transaction_type || (row.customer_id ? 'customer_payment' : 'vendor_payment'),
                currency: row.currency || 'KWD'
              };

              if (processedPayment.amount <= 0) {
                throw new Error(`مبلغ غير صحيح: ${row.amount}`);
              }

              result = await supabase
                .from('payments')
                .insert([processedPayment]);
              break;
            default:
              throw new Error('نوع غير مدعوم');
          }

          if (result.error) {
            errors.push(`السطر ${i}: ${result.error.message}`);
            failedCount++;
          } else {
            successCount++;
          }
        } catch (error: unknown) {
          errors.push(`السطر ${i}: ${error.message}`);
          failedCount++;
        }

        // تحديث التقدم
        setProgress(Math.round((i / (lines.length - 1)) * 100));
        
        // توقف قصير لتجنب إرهاق الخادم
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setResults({
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 10), // أول 10 أخطاء فقط
        warnings
      });

      if (successCount > 0) {
        toast.success(`تم استيراد ${successCount} سجل بنجاح`);
      }
      
      if (failedCount > 0) {
        toast.error(`فشل في استيراد ${failedCount} سجل`);
      }

    } catch (error: unknown) {
      toast.error(`خطأ في الاستيراد: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // تنزيل قالب
  const downloadTemplate = () => {
    if (!currentTemplate) return;

    const headers = currentTemplate.fields.join(',');
    const sampleRows = currentTemplate.sampleData.map(row => 
      currentTemplate.fields.map(field => row[field] || '').join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${sampleRows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `template-${currentTemplate.id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('تم تنزيل القالب');
  };

  // مسح الملفات
  const clearFiles = () => {
    setUploadedFiles([]);
    setPreviewData([]);
    setResults(null);
    setProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="p-3 rounded-lg bg-indigo-100 text-indigo-700"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Upload size={24} />
                </motion.div>
                <div>
                  <CardTitle className="text-2xl">استيراد البيانات</CardTitle>
                  <p className="text-muted-foreground">استيراد بيانات من ملفات CSV</p>
                </div>
              </div>
              {!hasCompanyAdminAccess && (
                <Badge variant="destructive">
                  <AlertTriangle size={14} className="ml-1" />
                  صلاحية محدودة
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* تحذير الصلاحيات */}
      {!hasCompanyAdminAccess && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            تحتاج إلى صلاحيات إدارية لاستيراد البيانات. يرجى التواصل مع المدير.
          </AlertDescription>
        </Alert>
      )}

      {/* أنواع الاستيراد */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            {importTemplates.map(template => {
              const Icon = template.icon;
              return (
                <TabsTrigger key={template.id} value={template.id} className="flex items-center gap-2">
                  <Icon size={16} />
                  {template.name}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {importTemplates.map(template => (
            <TabsContent key={template.id} value={template.id} className="space-y-6">
              {/* معلومات القالب */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${template.color} text-white`}>
                        <template.icon size={24} />
                      </div>
                      <div>
                        <CardTitle>{template.name}</CardTitle>
                        <p className="text-muted-foreground">{template.description}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={downloadTemplate}>
                      <Download size={16} className="ml-2" />
                      تنزيل القالب
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">الحقول المطلوبة:</h4>
                      <div className="flex flex-wrap gap-2">
                        {template.fields.map(field => (
                          <Badge 
                            key={field} 
                            variant={template.validation.required?.includes(field) ? "default" : "outline"}
                          >
                            {field}
                            {template.validation.required?.includes(field) && ' *'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* منطقة رفع الملفات */}
              <Card>
                <CardHeader>
                  <CardTitle>رفع الملفات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                  >
                    <input {...getInputProps()} disabled={!hasCompanyAdminAccess} />
                    <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
                    {isDragActive ? (
                      <p className="text-primary">اسحب الملفات هنا...</p>
                    ) : (
                      <div>
                        <p className="text-lg font-semibold mb-2">
                          اسحب ملفات CSV هنا أو انقر للاختيار
                        </p>
                        <p className="text-muted-foreground">
                          يدعم ملفات CSV فقط، حد أقصى 5 ملفات
                        </p>
                      </div>
                    )}
                  </div>

                  {/* الملفات المرفوعة */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">الملفات المرفوعة:</h4>
                        <Button variant="outline" size="sm" onClick={clearFiles}>
                          <Trash2 size={14} className="ml-1" />
                          مسح
                        </Button>
                      </div>
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <FileText size={16} />
                          <span className="flex-1">{file.name}</span>
                          <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* معاينة البيانات */}
                  {previewData.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Eye size={16} />
                        معاينة البيانات (أول 5 صفوف):
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border border-border rounded-lg">
                          <thead>
                            <tr className="bg-muted/50">
                              {Object.keys(previewData[0] || {}).map(key => (
                                <th key={key} className="p-2 text-right border-b border-border">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.map((row, index) => (
                              <tr key={index} className="border-b border-border">
                                {Object.values(row).map((value: unknown, cellIndex) => (
                                  <td key={cellIndex} className="p-2 text-right">
                                    {value}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* أزرار العمل */}
                  {uploadedFiles.length > 0 && hasCompanyAdminAccess && (
                    <div className="mt-6 flex gap-3">
                      <Button 
                        onClick={processImport} 
                        disabled={isProcessing}
                        className="flex-1"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw size={16} className="ml-2 animate-spin" />
                            جاري الاستيراد...
                          </>
                        ) : (
                          <>
                            <Upload size={16} className="ml-2" />
                            بدء الاستيراد
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* شريط التقدم */}
                  {isProcessing && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">تقدم الاستيراد</span>
                        <span className="text-sm text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {/* النتائج */}
                  {results && (
                    <div className="mt-6 space-y-4">
                      <h4 className="font-semibold">نتائج الاستيراد:</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <CheckCircle size={24} className="mx-auto mb-2 text-green-600" />
                          <p className="text-lg font-bold text-green-700">{results.success}</p>
                          <p className="text-sm text-green-600">نجح</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <AlertTriangle size={24} className="mx-auto mb-2 text-red-600" />
                          <p className="text-lg font-bold text-red-700">{results.failed}</p>
                          <p className="text-sm text-red-600">فشل</p>
                        </div>
                      </div>

                      {/* الأخطاء */}
                      {results.errors.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-red-700 mb-2">الأخطاء:</h5>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {results.errors.map((error, index) => (
                              <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                                {error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* التحذيرات */}
                      {results.warnings.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-yellow-700 mb-2">التحذيرات:</h5>
                          <div className="space-y-1">
                            {results.warnings.map((warning, index) => (
                              <div key={index} className="text-sm text-yellow-600 p-2 bg-yellow-50 rounded">
                                {warning}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>
    </div>
  );
};

const Import: React.FC = () => {
  return (
    <ErrorBoundary>
      <ImportInner />
    </ErrorBoundary>
  )
};

export default Import;
