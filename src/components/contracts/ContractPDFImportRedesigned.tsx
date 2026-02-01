/**
 * Contract PDF Import Dialog
 * Intelligent PDF import system for rental contracts
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { extractTextFromPDFSmart, convertPDFToImage, needsOCR } from '@/services/contractPDFExtractor';
import { extractContractFields } from '@/services/contractDataExtractor';
import { hybridOCR, HybridOCRProgress } from '@/services/hybridOCRService';
import { matchCustomer, CustomerMatch } from '@/services/contractCustomerMatcher';
import {
  Upload,
  FileText,
  FileCheck,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  User,
  Car,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Zap,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Hash,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type ImportStep = 'upload' | 'process' | 'review' | 'complete';

interface ExtractedContract {
  id: string;
  file: File;
  fields: {
    customerName?: string;
    qatariId?: string;
    phoneNumbers?: string[];
    licenseNumber?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    plateNumber?: string;
    contractDate?: string;
    startDate?: string;
    endDate?: string;
    contractAmount?: number;
    monthlyAmount?: number;
    paymentMethod?: string;
    paymentCycle?: string;
  };
  customerMatch: CustomerMatch | null;
  vehicleMatch: any | null;
  confidence: number;
  isSelected: boolean;
  isExpanded: boolean;
}

interface StepConfig {
  id: ImportStep;
  titleAr: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
  {
    id: 'upload',
    titleAr: 'رفع الملفات',
    description: 'قم برفع ملفات عقود الإيجار',
    icon: <Upload className="h-5 w-5" />
  },
  {
    id: 'process',
    titleAr: 'المعالجة',
    description: 'جاري استخراج البيانات',
    icon: <Zap className="h-5 w-5" />
  },
  {
    id: 'review',
    titleAr: 'المراجعة',
    description: 'مراجعة البيانات المستخرجة',
    icon: <FileCheck className="h-5 w-5" />
  },
  {
    id: 'complete',
    titleAr: 'اكتمال',
    description: 'تمت العملية بنجاح',
    icon: <CheckCircle className="h-5 w-5" />
  }
];

// ============================================================================
// Props
// ============================================================================

interface ContractPDFImportRedesignedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  ocrConfig?: {
    apiKey?: string;
    supabaseUrl?: string;
  };
}

// ============================================================================
// Main Component
// ============================================================================

export const ContractPDFImportRedesigned: React.FC<ContractPDFImportRedesignedProps> = ({
  open,
  onOpenChange,
  onComplete,
  ocrConfig: _ocrConfig,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();

  // State
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [completedSteps, setCompletedSteps] = useState<Set<ImportStep>>(new Set());
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [extractedContracts, setExtractedContracts] = useState<ExtractedContract[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveResult, setSaveResult] = useState<{ success: number; failed: number } | null>(null);

  // ============================================================================
  // Processing Functions
  // ============================================================================

  const processFiles = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setCurrentStep('process');

    try {
      const results: ExtractedContract[] = [];

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        setProcessingStatus(`جاري معالجة ${file.name}...`);
        setProcessingProgress(Math.round(((i) / uploadedFiles.length) * 100));

        try {
          // 🚀 Use Hybrid OCR System for maximum speed
          const stageMessages: Record<string, string> = {
            'direct_extraction': 'جاري استخراج النص المباشر...',
            'tesseract': 'جاري التعرف على النص (محلي)...',
            'preprocessing': 'جاري تحسين الصور...',
            'ocr': 'جاري معالجة OCR...',
            'deepseek': 'جاري الاستخراج بالذكاء الاصطناعي...',
            'complete': 'اكتملت المعالجة',
          };

          const ocrResult = await hybridOCR(file, {
            minConfidence: 0.5,
            maxOCRPages: 3,
            enableDeepSeek: true,
            onProgress: (progress: HybridOCRProgress) => {
              console.log(`[Hybrid OCR] Tier ${progress.tier}: ${progress.stage} (${progress.percent}%)`);
              setProcessingStatus(`${stageMessages[progress.stage] || progress.message} (${file.name})`);
              // Update progress for current file
              const fileProgress = Math.round(((i) / uploadedFiles.length) * 100);
              const stepProgress = Math.round(progress.percent * 0.8 / uploadedFiles.length);
              setProcessingProgress(fileProgress + stepProgress);
            },
          });

          const rawText = ocrResult.text;
          const method = ocrResult.method;

          console.log(`🚀 Hybrid OCR: Tier ${ocrResult.tier}, Method: ${method.toUpperCase()}`);
          console.log(`⏱️ Processing time: ${ocrResult.processingTimeMs}ms`);
          console.log(`📝 Extracted text length: ${rawText.length} characters`);
          console.log(`📊 Confidence: ${Math.round(ocrResult.confidence * 100)}%`);

          // Extract contract fields
          const fields = extractContractFields(rawText);

          // Match customer
          let customerMatch: CustomerMatch | null = null;
          if (companyId) {
            customerMatch = await matchCustomer(
              {
                qatariId: fields.qatariId,
                name: fields.customerName,
                phoneNumbers: fields.phoneNumbers,
                licenseNumber: fields.licenseNumber,
              },
              companyId
            );
          }

          results.push({
            id: `contract-${i}-${Date.now()}`,
            file,
            fields,
            customerMatch,
            vehicleMatch: null,
            confidence: fields.confidence,
            isSelected: fields.confidence > 0.5 && customerMatch !== null,
            isExpanded: false,
          });
        } catch (error: any) {
          console.error(`Failed to process ${file.name}:`, error);
          toast({
            title: 'خطأ في المعالجة',
            description: `فشلت معالجة الملف ${file.name}`,
            variant: 'destructive',
          });
        }
      }

      setExtractedContracts(results);
      setProcessingProgress(100);
      setCompletedSteps(prev => new Set([...prev, 'upload', 'process']));

      setTimeout(() => {
        setCurrentStep('review');
      }, 500);

      toast({
        title: 'تم استخراج البيانات',
        description: `تم استخراج ${results.length} عقد بنجاح`,
      });

    } catch (error: any) {
      toast({
        title: 'خطأ في المعالجة',
        description: error.message,
        variant: 'destructive',
      });
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveContracts = async () => {
    const selectedContracts = extractedContracts.filter(c => c.isSelected);

    if (selectedContracts.length === 0) {
      toast({
        title: 'لا توجد عقود محددة',
        description: 'يرجى تحديد عقود للحفظ',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let failedCount = 0;

    for (const contract of selectedContracts) {
      try {
        if (contract.customerMatch) {
          // Navigate to contract creation with pre-filled data
          const params = new URLSearchParams();
          params.set('customer', contract.customerMatch.customerId);

          if (contract.fields.plateNumber) {
            params.set('vehicle', contract.fields.plateNumber);
          }

          // Store contract data in sessionStorage for the wizard
          sessionStorage.setItem('pdfContractData', JSON.stringify({
            startDate: contract.fields.startDate,
            endDate: contract.fields.endDate,
            monthlyAmount: contract.fields.monthlyAmount,
            contractAmount: contract.fields.contractAmount,
            paymentMethod: contract.fields.paymentMethod,
            paymentCycle: contract.fields.paymentCycle,
          }));

          navigate(`/contracts?${params.toString()}`);
          onOpenChange(false);
          successCount++;
          break; // Only create one at a time for now
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error('Failed to save contract:', error);
        failedCount++;
      }
    }

    setSaveResult({ success: successCount, failed: failedCount });
    setCompletedSteps(prev => new Set([...prev, 'review', 'complete']));
    setCurrentStep('complete');
    setIsProcessing(false);

    if (onComplete) {
      onComplete();
    }

    toast({
      title: 'تم الحفظ',
      description: `تم حفظ ${successCount} عقد بنجاح`,
    });
  };

  // ============================================================================
  // Dropzone
  // ============================================================================

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    setUploadedFiles(prev => [...prev, ...pdfFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  // ============================================================================
  // Filtered Contracts
  // ============================================================================

  const filteredContracts = useMemo(() => {
    if (!searchQuery) return extractedContracts;

    return extractedContracts.filter(contract => {
      const query = searchQuery.toLowerCase();
      return (
        contract.fields.customerName?.toLowerCase().includes(query) ||
        contract.fields.qatariId?.includes(query) ||
        contract.fields.plateNumber?.includes(query) ||
        contract.fields.vehicleMake?.toLowerCase().includes(query) ||
        contract.fields.vehicleModel?.toLowerCase().includes(query)
      );
    });
  }, [extractedContracts, searchQuery]);

  const selectedCount = extractedContracts.filter(c => c.isSelected).length;

  // ============================================================================
  // Render
  // ============================================================================

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-2xl font-bold">استيراد عقود من PDF</DialogTitle>
              </div>
              <DialogDescription className="text-sm">
                استخراج بيانات العقود تلقائياً من ملفات PDF
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                currentStep === step.id
                  ? "bg-teal-500 text-white"
                  : completedSteps.has(step.id)
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              )}>
                {step.icon}
                <span className="text-sm font-medium">{step.titleAr}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5",
                  completedSteps.has(step.id) ? "bg-teal-500" : "bg-slate-200"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-1">
          <div className="min-h-[500px]">
            <AnimatePresence mode="wait">
              {/* Upload Step */}
              {currentStep === 'upload' && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Dropzone */}
                  <div
                    {...getRootProps()}
                    className={cn(
                      "relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
                      isDragActive
                        ? "border-teal-500 bg-teal-50"
                        : "border-slate-300 hover:border-teal-400 hover:bg-slate-50"
                    )}
                  >
                    <input {...getInputProps()} />

                    <motion.div
                      animate={{ y: isDragActive ? -10 : 0 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="space-y-4"
                    >
                      <div className={cn(
                        "w-20 h-20 mx-auto rounded-2xl flex items-center justify-center transition-colors",
                        isDragActive ? "bg-teal-100" : "bg-slate-100"
                      )}>
                        <Upload className={cn(
                          "h-10 w-10 transition-colors",
                          isDragActive ? "text-teal-600" : "text-slate-400"
                        )} />
                      </div>

                      {isDragActive ? (
                        <p className="text-xl font-semibold text-teal-600">
                          أفلت الملفات هنا...
                        </p>
                      ) : (
                        <>
                          <p className="text-xl font-semibold text-slate-700">
                            اسحب ملفات PDF وأفلتها هنا
                          </p>
                          <p className="text-slate-500">
                            أو انقر لاختيار الملفات
                          </p>
                        </>
                      )}

                      <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          PDF فقط
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Uploaded Files */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-700">
                          الملفات المرفوعة ({uploadedFiles.length})
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUploadedFiles([])}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 ml-1" />
                          حذف الكل
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-700 text-sm">
                                  {file.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>

                      <Button
                        onClick={processFiles}
                        disabled={uploadedFiles.length === 0}
                        className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white py-6 text-lg font-semibold rounded-xl"
                      >
                        <Zap className="h-5 w-5 ml-2" />
                        بدء المعالجة
                        <ArrowLeft className="h-5 w-5 mr-2" />
                      </Button>
                    </div>
                  )}

                  {/* Features */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        icon: <Zap className="h-5 w-5" />,
                        title: 'استخراج سريع',
                        desc: 'استخراج البيانات في ثوانٍ',
                      },
                      {
                        icon: <User className="h-5 w-5" />,
                        title: 'مطابقة العملاء',
                        desc: 'ربط تلقائي بالعملاء',
                      },
                      {
                        icon: <CheckCircle className="h-5 w-5" />,
                        title: 'مراجعة ذكية',
                        desc: 'تحقق من دقة البيانات',
                      },
                    ].map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl"
                      >
                        <div className="p-2 bg-teal-100 rounded-lg text-teal-600">
                          {feature.icon}
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">{feature.title}</p>
                          <p className="text-sm text-slate-500">{feature.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Processing Step */}
              {currentStep === 'process' && (
                <motion.div
                  key="process"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-center py-20"
                >
                  <div className="text-center space-y-6">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-24 h-24 mx-auto"
                    >
                      <div className="w-full h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 p-1">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <Zap className="h-10 w-10 text-teal-500" />
                        </div>
                      </div>
                    </motion.div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900">{processingStatus}</h3>
                      <p className="text-sm text-slate-500">جاري معالجة {uploadedFiles.length} ملف...</p>
                    </div>

                    <div className="max-w-md mx-auto space-y-2">
                      <Progress value={processingProgress} className="h-2" />
                      <p className="text-sm text-slate-500">{processingProgress}%</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Review Step */}
              {currentStep === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{extractedContracts.length}</span>
                        <FileText className="h-5 w-5" />
                      </div>
                      <p className="text-sm opacity-80">إجمالي العقود</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl p-4 text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {extractedContracts.filter(c => c.customerMatch).length}
                        </span>
                        <User className="h-5 w-5" />
                      </div>
                      <p className="text-sm opacity-80">مطابقة مع عميل</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{selectedCount}</span>
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <p className="text-sm opacity-80">محددة للحفظ</p>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="بحث بالاسم، رقم الهوية، اللوحة..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>

                  {/* Contracts List */}
                  <div className="space-y-3">
                    {filteredContracts.map((contract) => (
                      <ContractCard
                        key={contract.id}
                        contract={contract}
                        onToggle={() => {
                          setExtractedContracts(prev =>
                            prev.map(c =>
                              c.id === contract.id
                                ? { ...c, isSelected: !c.isSelected }
                                : c
                            )
                          );
                        }}
                        onExpand={() => {
                          setExtractedContracts(prev =>
                            prev.map(c =>
                              c.id === contract.id
                                ? { ...c, isExpanded: !c.isExpanded }
                                : c
                            )
                          );
                        }}
                      />
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep('upload')}
                    >
                      <ArrowRight className="h-4 w-4 ml-2" />
                      رجوع
                    </Button>

                    <Button
                      onClick={saveContracts}
                      disabled={selectedCount === 0 || isProcessing}
                      className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-8"
                    >
                      {isProcessing ? (
                        <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 ml-2" />
                      )}
                      إنشاء العقود المحددة ({selectedCount})
                      <ArrowLeft className="h-4 w-4 mr-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Complete Step */}
              {currentStep === 'complete' && saveResult && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center py-20"
                >
                  <div className="text-center space-y-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                      className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-xl"
                    >
                      <CheckCircle className="h-12 w-12 text-white" />
                    </motion.div>

                    <div className="space-y-2">
                      <h2 className="text-3xl font-bold text-slate-900">
                        تم بنجاح!
                      </h2>
                      <p className="text-lg text-slate-600">
                        تم إنشاء {saveResult.success} عقد
                        {saveResult.failed > 0 && (
                          <span className="text-red-500"> ({saveResult.failed} فشل)</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentStep('upload');
                          setUploadedFiles([]);
                          setExtractedContracts([]);
                          setSaveResult(null);
                          setCompletedSteps(new Set());
                        }}
                      >
                        <Upload className="h-4 w-4 ml-2" />
                        استيراد جديد
                      </Button>
                      <Button
                        className="bg-gradient-to-r from-teal-500 to-emerald-500"
                        onClick={() => {
                          onOpenChange(false);
                          if (onComplete) onComplete();
                        }}
                      >
                        <CheckCircle className="h-4 w-4 ml-2" />
                        إنهاء
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

interface ContractCardProps {
  contract: ExtractedContract;
  onToggle: () => void;
  onExpand: () => void;
}

const ContractCard: React.FC<ContractCardProps> = ({ contract, onToggle, onExpand }) => {
  const confidenceColor =
    contract.confidence >= 0.7 ? 'emerald' :
    contract.confidence >= 0.5 ? 'amber' : 'rose';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border rounded-xl overflow-hidden transition-all duration-200",
        contract.isSelected && "ring-2 ring-teal-500 border-teal-500"
      )}
    >
      {/* Main Row */}
      <div
        className={cn(
          "flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors",
          contract.isExpanded && "bg-slate-50"
        )}
        onClick={onExpand}
      >
        {/* Checkbox */}
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={contract.isSelected}
            onCheckedChange={onToggle}
            className="h-5 w-5"
          />
        </div>

        {/* Status Icon */}
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          contract.customerMatch ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
        )}>
          {contract.customerMatch ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">
              {contract.fields.customerName || 'غير محدد'}
            </span>
            <Badge variant="outline" className={cn(
              "text-xs",
              confidenceColor === 'emerald' && "bg-emerald-100 text-emerald-700",
              confidenceColor === 'amber' && "bg-amber-100 text-amber-700",
              confidenceColor === 'rose' && "bg-rose-100 text-rose-700",
            )}>
              {Math.round(contract.confidence * 100)}% دقة
            </Badge>
            {contract.customerMatch && (
              <Badge className="bg-emerald-100 text-emerald-700">
                <User className="h-3 w-3 ml-1" />
                {contract.customerMatch.customer.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Car className="h-3.5 w-3.5" />
              {contract.fields.vehicleMake} {contract.fields.vehicleModel} {contract.fields.vehicleYear}
            </span>
            <span className="flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" />
              {contract.fields.plateNumber || 'غير محدد'}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {contract.fields.monthlyAmount ? `${contract.fields.monthlyAmount} ر.ق` : 'غير محدد'}
            </span>
          </div>
        </div>

        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          {contract.isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {contract.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t bg-slate-50/50"
          >
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-1">اسم العميل</p>
                <p className="font-medium">{contract.fields.customerName || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">رقم الهوية</p>
                <p className="font-medium">{contract.fields.qatariId || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">رقم الرخصة</p>
                <p className="font-medium">{contract.fields.licenseNumber || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">المركبة</p>
                <p className="font-medium">
                  {contract.fields.vehicleMake} {contract.fields.vehicleModel} {contract.fields.vehicleYear}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">رقم اللوحة</p>
                <p className="font-medium">{contract.fields.plateNumber || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">القيمة الشهرية</p>
                <p className="font-medium">{contract.fields.monthlyAmount ? `${contract.fields.monthlyAmount} ر.ق` : '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">تاريخ البداية</p>
                <p className="font-medium">{contract.fields.startDate || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">تاريخ النهاية</p>
                <p className="font-medium">{contract.fields.endDate || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">طريقة الدفع</p>
                <p className="font-medium">{contract.fields.paymentMethod || '-'}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ContractPDFImportRedesigned;
