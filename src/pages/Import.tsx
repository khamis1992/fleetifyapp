import React, { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  Users,
  Car,
  DollarSign,
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
import { usePaymentOperations } from '@/hooks/business/usePaymentOperations';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { calculateCanonicalBillingMonths } from '@/utils/contractCalculations';
import type { Database } from '@/integrations/supabase/types';
import { getCustomerDataIssues } from '@/utils/formatCustomerName';
import { PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

type CustomerImportRow = Database['public']['Tables']['customers']['Insert'];
type VehicleImportRow = Database['public']['Tables']['vehicles']['Insert'];
type ContractImportRow = Database['public']['Tables']['contracts']['Insert'];

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
  const { createPayment } = usePaymentOperations({
    autoCreateJournalEntry: true,
    autoUpdateBankBalance: true,
    enableNotifications: false,
  });
  
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
        required: ['contract_number', 'customer_id', 'vehicle_id', 'start_date', 'end_date', 'monthly_amount'],
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
        const row: Record<string, any> = {};
        const allowedHeaders = new Set(currentTemplate.fields);

        // A CSV column name is data, not a trusted database column. Only the
        // fields declared by the selected template may reach an insert.
        headers.forEach((header, index) => {
          if (allowedHeaders.has(header)) {
            row[header] = values[index] || '';
          }
        });

        // CSV input may not choose a tenant, creator, active lifecycle, or
        // pre-linked accounting rows. Imported contracts are reviewed and
        // activated later through the atomic billing command.
        row.company_id = companyId;
        row.created_by = user?.id;
        if (activeTab === 'contracts') {
          const monthlyAmount = Number(String(row.monthly_amount || '').replace(/[^\d.-]/g, ''));
          const billingMonths = calculateCanonicalBillingMonths(row.start_date, row.end_date);
          if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
            errors.push(`السطر ${i}: قيمة الإيجار الشهري غير صحيحة`);
            failedCount++;
            continue;
          }
          if (billingMonths <= 0) {
            errors.push(`السطر ${i}: تواريخ العقد غير صحيحة`);
            failedCount++;
            continue;
          }

          const contractAmount = Math.round(monthlyAmount * billingMonths * 100) / 100;
          row.status = 'draft';
          row.payment_status = 'pending';
          row.contract_type = 'rental';
          row.contract_date = row.start_date;
          row.monthly_amount = monthlyAmount;
          row.contract_amount = contractAmount;
          row.total_paid = 0;
          row.balance_due = contractAmount;
          row.journal_entry_id = null;
          row.created_via = 'csv_import';
        }

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
              {
                const customerDataIssues = getCustomerDataIssues(row as CustomerImportRow);
                if (customerDataIssues.length > 0) {
                  errors.push(`السطر ${i}: استكمل بيانات العميل: ${customerDataIssues.join('، ')}`);
                  failedCount++;
                  continue;
                }
              }
              result = await supabase
                .from('customers')
                .insert([row as CustomerImportRow]);
              break;
            case 'vehicles':
              result = await supabase
                .from('vehicles')
                .insert([row as VehicleImportRow]);
              break;
            case 'contracts':
              result = await supabase
                .from('contracts')
                .insert([row as ContractImportRow]);
              break;
            case 'payments': {
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

              const importedPaymentMethod = normalizePaymentType(row.payment_type || row.payment_method || 'cash');
              const normalizedPaymentMethod = importedPaymentMethod === 'debit_card' ? 'credit_card' : importedPaymentMethod;
              const importedAmount = typeof row.amount === 'string'
                ? parseFloat(row.amount.replace(/[^\d.-]/g, ''))
                : parseFloat(row.amount) || 0;

              if (importedAmount <= 0) {
                throw new Error(`مبلغ غير صحيح: ${row.amount}`);
              }

              const isReceipt = row.transaction_type === 'customer_payment' || row.transaction_type === 'receipt' || !!row.customer_id;

              await createPayment.mutateAsync({
                payment_number: row.payment_number || undefined,
                amount: importedAmount,
                payment_date: row.payment_date || new Date().toISOString().split('T')[0],
                payment_method: normalizedPaymentMethod as 'cash' | 'check' | 'bank_transfer' | 'credit_card',
                reference_number: row.reference_number || undefined,
                notes: row.notes || undefined,
                customer_id: row.customer_id || undefined,
                vendor_id: row.vendor_id || undefined,
                invoice_id: row.invoice_id || undefined,
                contract_id: row.contract_id || undefined,
                type: isReceipt ? 'receipt' : 'payment',
                transaction_type: row.invoice_id ? 'invoice_payment' : isReceipt ? 'customer_payment' : 'vendor_payment',
                payment_status: row.payment_status || 'completed',
                currency: row.currency || 'QAR',
              });

              result = { error: null };
              break;
            }
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
          errors.push(`السطر ${i}: ${error instanceof Error ? error.message : String(error)}`);
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
      toast.error(`خطأ في الاستيراد: ${error instanceof Error ? error.message : String(error)}`);
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
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> مساحة العمل <span>/</span> استيراد البيانات
            </div>
            <h1>استيراد البيانات</h1>
            <p>استيراد العملاء والمركبات والعقود والمدفوعات من ملفات CSV.</p>
          </div>
          <div className="dw-header-tools">
            {!hasCompanyAdminAccess && (
              <span className="wk-badge is-risk">
                <AlertTriangle size={11} style={{ marginInlineEnd: 4, verticalAlign: 'middle' }} />
                صلاحية محدودة
              </span>
            )}
            <button type="button" className="dw-button" onClick={downloadTemplate}>
              <Download size={17} />
              تنزيل القالب
            </button>
          </div>
        </header>

        {/* تحذير الصلاحيات */}
        {!hasCompanyAdminAccess && (
          <div className="dw-data-notice" role="alert">
            <AlertTriangle size={16} style={{ marginInlineEnd: 8, verticalAlign: 'middle' }} />
            تحتاج إلى صلاحيات إدارية لاستيراد البيانات. يرجى التواصل مع المدير.
          </div>
        )}

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title={currentTemplate ? currentTemplate.name : 'استيراد البيانات'}
            subtitle={currentTemplate ? currentTemplate.description : 'اختر نوع البيانات للاستيراد'}
            className="wk-panel-full"
            action={
              <div className="dw-filters" role="group" aria-label="أنواع الاستيراد">
                {importTemplates.map(template => (
                  <button
                    key={template.id}
                    type="button"
                    aria-pressed={activeTab === template.id}
                    onClick={() => setActiveTab(template.id)}
                  >
                    <template.icon size={15} />
                    {template.name}
                  </button>
                ))}
              </div>
            }
          >
            {/* معلومات القالب */}
            {currentTemplate && (
              <div className="wk-badges" style={{ padding: '20px 24px 0' }}>
                {currentTemplate.fields.map(field => (
                  <span
                    key={field}
                    className={`wk-badge ${currentTemplate.validation.required?.includes(field) ? 'is-ok' : 'is-neutral'}`}
                  >
                    {field}
                    {currentTemplate.validation.required?.includes(field) && ' *'}
                  </span>
                ))}
              </div>
            )}

            {/* منطقة رفع الملفات */}
            <div className="wk-panel-content" style={{ padding: 20 }}>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-[#2f7966] bg-[#eaf1e3]'
                    : 'border-[#dfe5d9] hover:border-[#9db88a]'
                }`}
              >
                <input {...getInputProps()} disabled={!hasCompanyAdminAccess} />
                <Upload size={40} className="mx-auto mb-3" style={{ color: '#8ba674' }} />
                {isDragActive ? (
                  <p style={{ color: '#2f7966' }}>اسحب الملفات هنا...</p>
                ) : (
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#405a33', marginBottom: 6 }}>
                      اسحب ملفات CSV هنا أو انقر للاختيار
                    </p>
                    <p style={{ fontSize: 11, color: '#829074' }}>
                      يدعم ملفات CSV فقط، حد أقصى 5 ملفات
                    </p>
                  </div>
                )}
              </div>

              {/* الملفات المرفوعة */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: '#405a33' }}>الملفات المرفوعة:</h4>
                    <button type="button" className="dw-button" onClick={clearFiles}>
                      <Trash2 size={14} />
                      مسح
                    </button>
                  </div>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-[#f6f8f4] rounded" style={{ fontSize: 11 }}>
                      <FileText size={15} style={{ color: '#829074' }} />
                      <span className="flex-1"><bdi>{file.name}</bdi></span>
                      <span className="wk-badge is-neutral">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              )}

              {/* معاينة البيانات */}
              {previewData.length > 0 && (
                <div className="mt-6">
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: '#405a33', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={15} />
                    معاينة البيانات (أول 5 صفوف):
                  </h4>
                  <div className="wk-table-wrap" style={{ paddingBottom: 0 }}>
                    <table>
                      <caption className="sr-only">معاينة البيانات</caption>
                      <thead>
                        <tr>
                          {Object.keys(previewData[0] || {}).map(key => (
                            <th key={key} scope="col">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value: unknown, cellIndex) => (
                              <td key={cellIndex}>{String(value ?? '')}</td>
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
                <div className="mt-6">
                  <button
                    type="button"
                    className="dw-button dw-button-primary"
                    onClick={processImport}
                    disabled={isProcessing}
                    style={{ width: '100%' }}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        جاري الاستيراد...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        بدء الاستيراد
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* شريط التقدم */}
              {isProcessing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#405a33' }}>تقدم الاستيراد</span>
                    <span style={{ fontSize: 11, color: '#829074' }}>{progress}%</span>
                  </div>
                  <div className="dw-forecast-track">
                    <i style={{ display: 'block', height: '100%', borderRadius: 5, background: 'var(--dw-green)', width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {/* النتائج */}
              {results && (
                <div className="mt-6">
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: '#405a33', marginBottom: 12 }}>نتائج الاستيراد:</h4>
                  <div className="wk-summary-grid" style={{ paddingTop: 0 }}>
                    <div className="wk-summary-tile is-ok">
                      <small>نجح</small>
                      <strong>{results.success}</strong>
                    </div>
                    <div className="wk-summary-tile is-risk">
                      <small>فشل</small>
                      <strong>{results.failed}</strong>
                    </div>
                  </div>

                  {/* الأخطاء */}
                  {results.errors.length > 0 && (
                    <div className="mt-4">
                      <h5 style={{ fontSize: 11, fontWeight: 700, color: '#b3694c', marginBottom: 6 }}>الأخطاء:</h5>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {results.errors.map((error, index) => (
                          <div key={index} className="text-sm p-2 bg-[#fdf1eb] rounded" style={{ color: '#b3694c', fontSize: 11 }}>
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* التحذيرات */}
                  {results.warnings.length > 0 && (
                    <div className="mt-4">
                      <h5 style={{ fontSize: 11, fontWeight: 700, color: '#9b7c36', marginBottom: 6 }}>التحذيرات:</h5>
                      <div className="space-y-1">
                        {results.warnings.map((warning, index) => (
                          <div key={index} className="text-sm p-2 bg-[#faf5e7] rounded" style={{ color: '#9b7c36', fontSize: 11 }}>
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="dw-panel-foot">
              <Upload size={14} />
              <span>راجع معاينة البيانات قبل بدء الاستيراد لضمان تطابق الحقول مع القالب.</span>
            </div>
          </PagePanel>
        </div>
      </div>
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
