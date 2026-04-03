import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageCustomizer } from '@/components/PageCustomizer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useSignedAgreementUpload } from '@/hooks/contracts/useSignedAgreementUpload';
import { useToast } from '@/hooks/use-toast-mock';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

// Configuration for batch processing - معالجة متوازية
// 10 ملفات في وقت واحد (بدون AI الآن)
const BATCH_SIZE = 10;
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  User,
  Car,
  File,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'matched' | 'unmatched' | 'error';
  progress: number;
  error?: string;
  matchData?: {
    contractId?: string;
    contractNumber?: string;
    customerId?: string;
    customerName?: string;
    vehicleId?: string;
    vehiclePlate?: string;
    confidence?: number;
  };
  documentId?: string;
}

/**
 * Signed Agreement Upload Page
 *
 * Features:
 * - Drag-and-drop PDF upload
 * - AI-powered matching to contracts/customers/vehicles
 * - Real-time upload progress
 * - Manual re-matching capability
 * - Delete uploaded files
 *
 * Route: /contracts/signed-agreements
 */
export default function SignedAgreementsUpload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [existingFileNames, setExistingFileNames] = useState<Set<string>>(new Set());
  
  // Queue management for batch processing
  const processingQueueRef = useRef<UploadedFile[]>([]);
  const isProcessingRef = useRef(false);

  const {
    uploadSignedAgreement,
    matchAgreement,
    isUploading,
    isMatching,
    deleteAgreement,
  } = useSignedAgreementUpload();

  // جلب أسماء الملفات المرفوعة سابقاً
  useEffect(() => {
    const fetchExistingFiles = async () => {
      if (!companyId) return;
      
      const { data } = await supabase
        .from('contract_documents')
        .select('document_name')
        .eq('company_id', companyId)
        .eq('document_type', 'signed_contract');

      if (data) {
        const names = new Set(data.map(d => d.document_name?.toLowerCase() || ''));
        setExistingFileNames(names);
        console.log(`📁 تم جلب ${names.size} ملف مرفوع سابقاً`);
      }
    };

    fetchExistingFiles();
  }, [companyId]);

  /**
   * Process a single file: upload -> match
   */
  const processFile = useCallback(async (uploadedFile: UploadedFile) => {
    try {
      // Step 1: Upload file
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        )
      );

      const uploadResult = await uploadSignedAgreement(uploadedFile.file, (progress) => {
        // Progress from hook is already 5-60%
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === uploadedFile.id
              ? { ...f, progress }
              : f
          )
        );
      });

      if (!uploadResult.success || !uploadResult.documentId) {
        throw new Error(uploadResult.error || 'فشل في رفع الملف');
      }

      // Step 2: Match agreement using AI (with timeout)
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, status: 'processing', progress: 60, documentId: uploadResult.documentId }
            : f
        )
      );

      // إضافة timeout للمطابقة (45 ثانية)
      const matchPromise = matchAgreement(uploadResult.documentId, uploadedFile.file.name, (progress) => {
        // Progress from hook is 10-100%, map to 60-100%
        const matchProgress = 60 + (progress / 100) * 40;
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === uploadedFile.id
              ? { ...f, progress: Math.round(matchProgress) }
              : f
          )
        );
      });

      const timeoutPromise = new Promise<{ success: boolean; error: string }>((resolve) => {
        setTimeout(() => {
          resolve({ success: true, error: '' }); // اعتبره ناجح بدون مطابقة
        }, 45000);
      });

      const matchResult = await Promise.race([matchPromise, timeoutPromise]);

      // Step 3: Update final status
      setUploadedFiles(prev =>
        prev.map(f => {
          if (f.id === uploadedFile.id) {
            if (matchResult.success && matchResult.matchData) {
              return {
                ...f,
                status: 'matched',
                progress: 100,
                matchData: matchResult.matchData,
              };
            } else if (matchResult.success) {
              return {
                ...f,
                status: 'unmatched',
                progress: 100,
              };
            } else {
              return {
                ...f,
                status: 'error',
                progress: 100,
                error: matchResult.error || 'فشل في مطابقة العقد',
              };
            }
          }
          return f;
        })
      );

    } catch (error) {
      console.error('Error processing file:', error);
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
              }
            : f
        )
      );
    }
  }, [uploadSignedAgreement, matchAgreement]);

  /**
   * Process files from queue in batches
   */
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    while (processingQueueRef.current.length > 0) {
      // Get next batch of files
      const batch = processingQueueRef.current.splice(0, BATCH_SIZE);
      
      // Process batch concurrently
      await Promise.all(batch.map(file => processFile(file)));
    }

    isProcessingRef.current = false;
  }, [processFile]);

  /**
   * Handle file selection from input
   */
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    // تصفية الملفات: PDF فقط
    const pdfFiles = Array.from(files).filter(file => {
      if (file.type !== 'application/pdf') {
        return false;
      }
      return true;
    });

    if (pdfFiles.length === 0) {
      toast({
        title: 'خطأ',
        description: 'يُرجى رفع ملفات PDF فقط.',
      });
      return;
    }

    // فصل الملفات: جديدة vs مرفوعة سابقاً
    const newFiles: File[] = [];
    const skippedFiles: string[] = [];

    for (const file of pdfFiles) {
      if (existingFileNames.has(file.name.toLowerCase())) {
        skippedFiles.push(file.name);
      } else {
        newFiles.push(file);
      }
    }

    // إظهار رسالة للملفات المتخطاة
    if (skippedFiles.length > 0) {
      toast({
        title: `⏭️ تم تخطي ${skippedFiles.length} ملف`,
        description: skippedFiles.length <= 3 
          ? `الملفات المرفوعة سابقاً: ${skippedFiles.join('، ')}`
          : `${skippedFiles.slice(0, 3).join('، ')} و${skippedFiles.length - 3} ملفات أخرى`,
      });
    }

    if (newFiles.length === 0) {
      toast({
        title: 'لا توجد ملفات جديدة',
        description: 'جميع الملفات المختارة مرفوعة سابقاً',
      });
      return;
    }

    // رسالة بدء الرفع
    toast({
      title: `🚀 جاري رفع ${newFiles.length} ملف`,
      description: `سيتم معالجة ${Math.min(newFiles.length, BATCH_SIZE)} ملف في وقت واحد`,
    });

    // إضافة الملفات الجديدة للقائمة
    const uploadFiles: UploadedFile[] = newFiles.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'uploading' as const,
      progress: 0,
    }));

    setUploadedFiles(prev => [...prev, ...uploadFiles]);

    // تحديث قائمة الملفات المرفوعة لتجنب التكرار في نفس الجلسة
    setExistingFileNames(prev => {
      const updated = new Set(prev);
      newFiles.forEach(f => updated.add(f.name.toLowerCase()));
      return updated;
    });

    // إضافة للطابور والبدء في المعالجة
    processingQueueRef.current.push(...uploadFiles);
    processQueue();
  }, [toast, processQueue, existingFileNames]);

  /**
   * Handle drag and drop events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  /**
   * Retry matching for unmatched files
   */
  const handleRetryMatch = useCallback(async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file || !file.documentId) return;

    setUploadedFiles(prev =>
      prev.map(f =>
        f.id === fileId
          ? { ...f, status: 'processing', progress: 60 }
          : f
      )
    );

    try {
      const matchResult = await matchAgreement(file.documentId, file.file.name, (progress) => {
        // Progress from hook is 10-100%, map to 60-100%
        const matchProgress = 60 + (progress / 100) * 40;
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? { ...f, progress: Math.round(matchProgress) }
              : f
          )
        );
      });

      setUploadedFiles(prev =>
        prev.map(f => {
          if (f.id === fileId) {
            if (matchResult.success && matchResult.matchData) {
              return {
                ...f,
                status: 'matched',
                progress: 100,
                matchData: matchResult.matchData,
              };
            } else if (matchResult.success) {
              return {
                ...f,
                status: 'unmatched',
                progress: 100,
              };
            } else {
              return {
                ...f,
                status: 'error',
                progress: 100,
                error: matchResult.error || 'فشل في مطابقة العقد',
              };
            }
          }
          return f;
        })
      );

    } catch (error) {
      console.error('Error retrying match:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إعادة محاولة المطابقة',
      });
    }
  }, [uploadedFiles, matchAgreement, toast]);

  /**
   * Delete uploaded file
   */
  const handleDelete = useCallback(async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) return;

    if (file.documentId) {
      await deleteAgreement(file.documentId);
    }

    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    toast({
      title: 'تم الحذف',
      description: 'تم حذف الملف بنجاح',
    });
  }, [uploadedFiles, deleteAgreement, toast]);

  /**
   * Navigate to contract details
   */
  const handleViewContract = useCallback((contractNumber: string) => {
    navigate(`/contracts/${contractNumber}`);
  }, [navigate]);

  /**
   * Navigate to customer details
   */
  const handleViewCustomer = useCallback((customerId: string) => {
    navigate(`/customers/${customerId}`);
  }, [navigate]);

  /**
   * Navigate to vehicle details
   */
  const handleViewVehicle = useCallback((vehicleId: string) => {
    navigate(`/fleet/vehicles/${vehicleId}`);
  }, [navigate]);

  /**
   * Get status badge component
   */
  const getStatusBadge = (status: UploadedFile['status']) => {
    const statusConfig = {
      uploading: {
        icon: Upload,
        text: 'جاري الرفع',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      processing: {
        icon: RefreshCw,
        text: 'جاري المعالجة',
        className: 'bg-purple-50 text-purple-700 border-purple-200',
      },
      matched: {
        icon: CheckCircle,
        text: 'تمت المطابقة',
        className: 'bg-green-50 text-green-700 border-green-200',
      },
      unmatched: {
        icon: Search,
        text: 'غير مطابق',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      },
      error: {
        icon: XCircle,
        text: 'خطأ',
        className: 'bg-red-50 text-red-700 border-red-200',
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={cn('gap-1.5', config.className)}>
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  return (
    <PageCustomizer pageId="signed-agreements-upload" title="" titleAr="">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              رفع العقود الموقعة
            </h1>
            <p className="text-sm text-slate-600">
              ارفع عقود PDF الموقعة وسنقوم بمطابقتها تلقائياً مع العقود والعملاء والمركبات
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        <Card
          className={cn(
            'border-2 border-dashed transition-all duration-200',
            isDragging
              ? 'border-green-500 bg-green-50'
              : 'border-slate-300 hover:border-green-400 hover:bg-slate-50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  اسحب وأفلت ملفات PDF هنا
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  أو انقر لاختيار ملفات من جهازك
                </p>
                <input
                  type="file"
                  multiple
                  accept="application/pdf"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload">
                  <Button
                    asChild
                    disabled={isUploading}
                    className="cursor-pointer"
                  >
                    <span>
                      <Upload className="w-4 h-4 ml-2" />
                      اختيار ملفات PDF
                    </span>
                  </Button>
                </label>
              </div>
              <p className="text-xs text-slate-500">
                يدعم رفع ملفات PDF فقط بحد أقصى 500 ملف في المرة الواحدة
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <File className="w-5 h-5" />
                  الملفات المرفوعة ({uploadedFiles.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="border rounded-xl p-4 space-y-4 hover:shadow-md transition-shadow"
                  >
                    {/* File Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 truncate">
                            {file.file.name}
                          </h4>
                          <p className="text-sm text-slate-500">
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(file.status)}
                        {(file.status === 'unmatched' || file.status === 'error') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryMatch(file.id)}
                            disabled={isMatching}
                            className="h-8"
                          >
                            <RefreshCw className="w-4 h-4 ml-1" />
                            إعادة المحاولة
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(file.id)}
                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Upload Progress */}
                    {(file.status === 'uploading' || file.status === 'processing') && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">
                            {file.status === 'uploading' ? 'جاري الرفع...' : 'جاري المعالجة ومطابقة العقد...'}
                          </span>
                          <span className="font-medium text-slate-900">{file.progress}%</span>
                        </div>
                        <Progress value={file.progress} className="h-2" />
                      </div>
                    )}

                    {/* Matched Data */}
                    {file.status === 'matched' && file.matchData && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                          <CheckCircle className="w-4 h-4" />
                          تمت المطابقة بنجاح (الثقة: {Math.round((file.matchData.confidence || 0) * 100)}%)
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Contract */}
                          {file.matchData.contractId && (
                            <div className="bg-white rounded-lg p-3 border border-green-200">
                              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                <FileText className="w-3 h-3" />
                                العقد
                              </div>
                              <button
                                onClick={() => file.matchData?.contractNumber && handleViewContract(file.matchData.contractNumber)}
                                className="text-sm font-medium text-green-700 hover:text-green-800 flex items-center gap-1"
                              >
                                {file.matchData.contractNumber}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Customer */}
                          {file.matchData.customerId && (
                            <div className="bg-white rounded-lg p-3 border border-green-200">
                              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                <User className="w-3 h-3" />
                                العميل
                              </div>
                              <button
                                onClick={() => file.matchData?.customerId && handleViewCustomer(file.matchData.customerId)}
                                className="text-sm font-medium text-green-700 hover:text-green-800 flex items-center gap-1"
                              >
                                {file.matchData.customerName}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Vehicle */}
                          {file.matchData.vehicleId && (
                            <div className="bg-white rounded-lg p-3 border border-green-200">
                              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                <Car className="w-3 h-3" />
                                المركبة
                              </div>
                              <button
                                onClick={() => file.matchData?.vehicleId && handleViewVehicle(file.matchData.vehicleId)}
                                className="text-sm font-medium text-green-700 hover:text-green-800 flex items-center gap-1"
                              >
                                {file.matchData.vehiclePlate}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {file.status === 'error' && file.error && (
                      <div className="bg-red-50 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{file.error}</span>
                      </div>
                    )}

                    {/* Unmatched Message */}
                    {file.status === 'unmatched' && (
                      <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2 text-sm text-amber-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">لم يتم العثور على تطابق</p>
                          <p className="text-xs mt-1">
                            لم نتمكن من مطابقة هذا الملف مع أي عقد أو عميل أو مركبة. يمكنك إعادة المحاولة أو ربط الملف يدوياً.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-1">مطابقة ذكية</h4>
                  <p className="text-xs text-slate-600">
                    يستخدم الذكاء الاصطناعي لمطابقة أسماء الملفات مع أرقام العقود وأسماء العملاء وأرقام اللوحات
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-1">بحث تلقائي</h4>
                  <p className="text-xs text-slate-600">
                    يبحث في قاعدة البيانات عن العقود والعملاء والمركبات المرتبطة
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ExternalLink className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-1">روابط سريعة</h4>
                  <p className="text-xs text-slate-600">
                    انتقل مباشرة إلى صفحات العقد والعميل والمركبة بنقرة واحدة
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageCustomizer>
  );
}
