import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Save,
  X,
  Car,
  MapPin,
  Calendar,
  DollarSign,
  Hash,
  Eye,
  User,
  Copy,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  FileUp,
  Zap,
  Shield,
  Target,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Layers,
  Clock,
  TrendingUp,
  BarChart3,
  CircleCheck,
  CircleX,
  CircleDot,
  FileSearch,
  Database,
  Link2,
  CreditCard,
  Wallet,
  Building2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { PDFViewer } from './PDFViewer';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ExtractedViolation,
  MatchedViolation,
  ImportProcessingResult,
  PDFHeaderData,
  MATCH_CONFIDENCE_LABELS,
  MATCH_CONFIDENCE_COLORS
} from '@/types/violations';
import { useViolationMatching, useViolationSave } from '@/hooks/useViolationMatching';
import { useViolationNotifications, NotificationSettings, ViolationNotificationData } from '@/hooks/useViolationNotifications';
import { ViolationNotificationSettings } from './ViolationNotificationSettings';
import { cn } from '@/lib/utils';
import { 
  detectPaidViolations, 
  markViolationsAsPaidByCompanyBatch,
  AutoPaymentResult,
  PaidViolation 
} from '@/services/autoPaymentDetection';

// ============================================================================
// Types & Constants
// ============================================================================

type ImportStep = 'upload' | 'process' | 'review' | 'complete';

interface StepConfig {
  id: ImportStep;
  title: string;
  titleAr: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
  {
    id: 'upload',
    title: 'Upload',
    titleAr: 'رفع الملفات',
    description: 'قم برفع ملفات PDF أو صور المخالفات',
    icon: <FileUp className="h-5 w-5" />
  },
  {
    id: 'process',
    title: 'Process',
    titleAr: 'المعالجة',
    description: 'استخراج البيانات ومطابقتها',
    icon: <Zap className="h-5 w-5" />
  },
  {
    id: 'review',
    title: 'Review',
    titleAr: 'المراجعة',
    description: 'مراجعة واختيار المخالفات للحفظ',
    icon: <Target className="h-5 w-5" />
  },
  {
    id: 'complete',
    title: 'Complete',
    titleAr: 'اكتمال',
    description: 'تم حفظ المخالفات بنجاح',
    icon: <Shield className="h-5 w-5" />
  }
];

// ============================================================================
// Sub-Components
// ============================================================================

// Step Indicator Component
const StepIndicator: React.FC<{
  steps: StepConfig[];
  currentStep: ImportStep;
  completedSteps: Set<ImportStep>;
}> = ({ steps, currentStep, completedSteps }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="relative">
      {/* Progress Line */}
      <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700" />
      <div 
        className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
        style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
      />

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = step.id === currentStep;
          const isPending = index > currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30",
                  isCurrent && "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 ring-4 ring-amber-200",
                  isPending && "bg-slate-100 dark:bg-slate-800 text-slate-400 border-2 border-slate-200 dark:border-slate-700"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </motion.div>
              
              <div className="mt-3 text-center">
                <p className={cn(
                  "font-semibold text-sm transition-colors",
                  (isCompleted || isCurrent) ? "text-slate-900 dark:text-white" : "text-slate-400"
                )}>
                  {step.titleAr}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 max-w-[100px]">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Processing Status Component
const ProcessingStatus: React.FC<{
  status: string;
  progress: number;
  details?: string;
}> = ({ status, progress, details }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center space-y-6 py-12"
  >
    <div className="relative">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-24 h-24 mx-auto"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 opacity-20 blur-xl" />
        <div className="relative w-full h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 p-1">
          <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
            <Zap className="h-10 w-10 text-teal-500" />
          </div>
        </div>
      </motion.div>
    </div>

    <div className="space-y-2">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{status}</h3>
      {details && (
        <p className="text-sm text-slate-500">{details}</p>
      )}
    </div>

    <div className="max-w-md mx-auto space-y-2">
      <Progress value={progress} className="h-2" />
      <p className="text-sm text-slate-500">{progress}%</p>
    </div>
  </motion.div>
);

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  trend?: { value: number; label: string };
}> = ({ icon, value, label, color, trend }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500 shadow-blue-500/20',
    green: 'from-emerald-500 to-teal-500 shadow-emerald-500/20',
    orange: 'from-amber-500 to-orange-500 shadow-amber-500/20',
    red: 'from-red-500 to-rose-500 shadow-red-500/20',
    purple: 'from-purple-500 to-indigo-500 shadow-purple-500/20'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-5",
        "bg-gradient-to-br",
        colorClasses[color],
        "shadow-xl"
      )}
    >
      <div className="absolute top-0 right-0 w-20 h-20 opacity-20">
        <div className="absolute inset-0 bg-white rounded-full blur-2xl transform translate-x-5 -translate-y-5" />
      </div>
      
      <div className="relative text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
            {icon}
          </div>
          {trend && (
            <Badge className="bg-white/20 text-white border-0">
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend.value}%
            </Badge>
          )}
        </div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm text-white/80 mt-1">{label}</p>
      </div>
    </motion.div>
  );
};

// Violation Row Component
const ViolationRow: React.FC<{
  violation: MatchedViolation;
  isSelected: boolean;
  onToggle: () => void;
  onPreview?: () => void;
  isExpanded: boolean;
  onExpand: () => void;
}> = ({ violation, isSelected, onToggle, onPreview, isExpanded, onExpand }) => {
  const isDisabled = violation.status === 'error' || violation.is_duplicate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border rounded-xl overflow-hidden transition-all duration-200",
        isSelected && !isDisabled && "ring-2 ring-teal-500 border-teal-500",
        isDisabled && "opacity-60 bg-slate-50 dark:bg-slate-800/50"
      )}
    >
      {/* Main Row */}
      <div
        className={cn(
          "flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
          isExpanded && "bg-slate-50 dark:bg-slate-800/50"
        )}
        onClick={onExpand}
      >
        {/* Checkbox */}
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            disabled={isDisabled}
            className="h-5 w-5"
          />
        </div>

        {/* Status Icon */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          violation.status === 'matched' && !violation.is_duplicate && "bg-emerald-100 text-emerald-600",
          violation.status === 'error' && "bg-red-100 text-red-600",
          violation.is_duplicate && "bg-amber-100 text-amber-600"
        )}>
          {violation.is_duplicate ? (
            <Copy className="h-5 w-5" />
          ) : violation.status === 'matched' ? (
            <CircleCheck className="h-5 w-5" />
          ) : (
            <CircleX className="h-5 w-5" />
          )}
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              #{violation.reference_number || violation.violation_number}
            </span>
            <Badge variant="outline" className="text-xs">
              {violation.violation_type}
            </Badge>
            {violation.is_duplicate && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                مكرر
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Car className="h-3.5 w-3.5" />
              {violation.plate_number}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(violation.date), 'dd/MM/yyyy', { locale: ar })}
            </span>
            {violation.customer_name && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {violation.customer_name}
              </span>
            )}
          </div>
        </div>

        {/* Amount & Actions */}
        <div className="flex items-center gap-4">
          <div className="text-left">
            <p className="font-bold text-lg text-slate-900 dark:text-white">
              {violation.fine_amount.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500">ر.ق</p>
          </div>
          
          <Badge className={cn(
            "text-xs",
            MATCH_CONFIDENCE_COLORS[violation.match_confidence]?.includes('green') && "bg-emerald-100 text-emerald-700",
            MATCH_CONFIDENCE_COLORS[violation.match_confidence]?.includes('yellow') && "bg-amber-100 text-amber-700",
            MATCH_CONFIDENCE_COLORS[violation.match_confidence]?.includes('orange') && "bg-orange-100 text-orange-700",
            MATCH_CONFIDENCE_COLORS[violation.match_confidence]?.includes('slate') && "bg-slate-100 text-slate-700"
          )}>
            {MATCH_CONFIDENCE_LABELS[violation.match_confidence]}
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t bg-slate-50/50 dark:bg-slate-800/30"
          >
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-1">الموقع</p>
                <p className="font-medium flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {violation.location || 'غير محدد'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">الوقت</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {violation.time || 'غير محدد'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">رقم العقد</p>
                <p className="font-medium flex items-center gap-1">
                  <Link2 className="h-4 w-4 text-slate-400" />
                  {violation.contract_number || 'غير مرتبط'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">جهة الإصدار</p>
                <p className="font-medium flex items-center gap-1">
                  <Database className="h-4 w-4 text-slate-400" />
                  {violation.issuing_authority || 'وزارة الداخلية'}
                </p>
              </div>
              {violation.errors.length > 0 && (
                <div className="col-span-full">
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {violation.errors.join(' • ')}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const TrafficViolationPDFImportRedesigned: React.FC = () => {
  // Initialize PDF.js worker
  React.useEffect(() => {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      } catch {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      }
    }
  }, []);

  // State
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [completedSteps, setCompletedSteps] = useState<Set<ImportStep>>(new Set());
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingResult, setProcessingResult] = useState<ImportProcessingResult | null>(null);
  const [selectedViolations, setSelectedViolations] = useState<Set<string>>(new Set());
  const [expandedViolation, setExpandedViolation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'matched' | 'error' | 'duplicate'>('all');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: number; failed: number } | null>(null);

  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const { processViolations, isProcessing: isMatching } = useViolationMatching({
    companyId,
    autoLink: true,
    checkDuplicates: true
  });
  const { saveViolations, isSaving } = useViolationSave();
  const { 
    sendBulkViolationNotifications, 
    generateWhatsAppLink,
    isSending: isSendingNotifications, 
    lastResult: notificationResult,
    defaultSettings: defaultNotificationSettings 
  } = useViolationNotifications();
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);

  // Auto payment detection state
  const [enableAutoPayment, setEnableAutoPayment] = useState(true);
  const [autoPaymentResult, setAutoPaymentResult] = useState<AutoPaymentResult | null>(null);
  const [selectedPaidViolations, setSelectedPaidViolations] = useState<Set<string>>(new Set());
  const [isProcessingAutoPayment, setIsProcessingAutoPayment] = useState(false);

  // Filtered violations
  const filteredViolations = useMemo(() => {
    if (!processingResult) return [];
    
    return processingResult.violations.filter(v => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          v.plate_number?.toLowerCase().includes(query) ||
          v.violation_number?.toLowerCase().includes(query) ||
          v.reference_number?.toLowerCase().includes(query) ||
          v.customer_name?.toLowerCase().includes(query) ||
          v.location?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterStatus === 'matched' && v.status !== 'matched') return false;
      if (filterStatus === 'error' && v.status !== 'error') return false;
      if (filterStatus === 'duplicate' && !v.is_duplicate) return false;

      return true;
    });
  }, [processingResult, searchQuery, filterStatus]);

  // Extract text from PDF
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    return fullText.trim();
  };

  // Convert PDF to images
  const convertPDFToImages = async (file: File): Promise<File[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: File[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const scale = 2;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png', 0.95);
      });

      const imageFile = new File(
        [blob],
        `${file.name.replace('.pdf', '')}_page_${pageNum}.png`,
        { type: 'image/png' }
      );
      images.push(imageFile);
    }

    return images;
  };

  // Extract data from PDF
  const extractDataFromPDF = async (file: File): Promise<{
    header?: PDFHeaderData;
    violations: ExtractedViolation[];
  }> => {
    if (file.type === 'application/pdf') {
      setProcessingStatus('جاري قراءة ملف PDF...');
      
      let pdfText = '';
      try {
        pdfText = await extractTextFromPDF(file);
      } catch (textError) {
        console.error('Error extracting text:', textError);
      }

      if (pdfText.length > 50) {
        setProcessingStatus('جاري استخراج البيانات...');
        
        const { data, error } = await supabase.functions.invoke('extract-traffic-violations/extract-regex', {
          body: { pdf_text: pdfText }
        });

        if (!error && data?.success) {
          return {
            header: data.header,
            violations: data.violations || []
          };
        }
      }

      // Fallback to images
      setProcessingStatus('جاري تحويل PDF إلى صور...');
      const images = await convertPDFToImages(file);
      
      let allViolations: ExtractedViolation[] = [];
      let header: PDFHeaderData | undefined;

      for (const imageFile of images) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const { data, error } = await supabase.functions.invoke('extract-traffic-violations', {
          body: formData
        });

        if (!error && data?.success) {
          if (!header && data.header) header = data.header;
          allViolations = [...allViolations, ...data.violations];
        }
      }

      return { header, violations: allViolations };
    } else {
      // Image file
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('extract-traffic-violations', {
        body: formData
      });

      if (error) throw error;
      return {
        header: data?.header,
        violations: data?.violations || []
      };
    }
  };

  // Process files
  const processFiles = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setCurrentStep('process');

    try {
      let allViolations: ExtractedViolation[] = [];
      let header: PDFHeaderData | undefined;

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        setProcessingStatus(`جاري معالجة ${file.name}...`);
        setProcessingProgress(Math.round(((i) / uploadedFiles.length) * 50));

        try {
          const extracted = await extractDataFromPDF(file);
          if (extracted.header) header = extracted.header;
          allViolations = [...allViolations, ...extracted.violations];
        } catch (error: any) {
          console.error(`Failed to process ${file.name}:`, error);
        }
      }

      if (allViolations.length === 0) {
        throw new Error('لم يتم العثور على مخالفات في الملفات');
      }

      setProcessingStatus('جاري مطابقة المخالفات مع المركبات...');
      setProcessingProgress(70);

      const result = await processViolations(allViolations);
      result.header = header;

      // كشف الدفع التلقائي
      let detectedPaidCount = 0;
      if (enableAutoPayment && companyId) {
        setProcessingStatus('جاري الكشف عن المخالفات المدفوعة...');
        setProcessingProgress(85);
        
        const paymentResult = await detectPaidViolations(allViolations, companyId);
        setAutoPaymentResult(paymentResult);
        detectedPaidCount = paymentResult.paidByCompany.length;
        
        // تحديد جميع المخالفات المدفوعة تلقائياً
        if (detectedPaidCount > 0) {
          setSelectedPaidViolations(new Set(paymentResult.paidByCompany.map(v => v.id)));
        }
      }

      setProcessingResult(result);
      setSelectedViolations(new Set(
        result.violations
          .filter(v => v.status === 'matched' && !v.is_duplicate)
          .map(v => v.id)
      ));

      setProcessingProgress(100);
      setCompletedSteps(prev => new Set([...prev, 'upload', 'process']));
      
      setTimeout(() => {
        setCurrentStep('review');
      }, 500);

      const autoPaymentInfo = detectedPaidCount > 0
        ? ` | تم اكتشاف ${detectedPaidCount} مخالفة مدفوعة`
        : '';

      toast({
        title: "تم استخراج البيانات بنجاح",
        description: `تم استخراج ${result.total_extracted} مخالفة، ${result.successful_matches} مطابقة للمركبات${autoPaymentInfo}`,
      });

    } catch (error: any) {
      toast({
        title: "خطأ في المعالجة",
        description: error.message,
        variant: "destructive"
      });
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process auto payment - mark violations as paid by company
  const processAutoPayment = async () => {
    if (!autoPaymentResult || selectedPaidViolations.size === 0) return;

    setIsProcessingAutoPayment(true);
    try {
      const violationIds = Array.from(selectedPaidViolations);
      console.log(`🔄 Processing auto payment for ${violationIds.length} violations...`);
      
      const result = await markViolationsAsPaidByCompanyBatch(violationIds);
      
      if (result.success > 0) {
        toast({
          title: "✅ تم تسجيل الدفع التلقائي",
          description: `تم تحديث ${result.success} مخالفة كمدفوعة من الشركة${result.failed > 0 ? ` (${result.failed} فشل)` : ''}`,
        });

        // إعادة تحميل بيانات المخالفات
        queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
        queryClient.invalidateQueries({ queryKey: ['traffic-violations-dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['penalties'] });
      } else {
        toast({
          title: "⚠️ فشل تسجيل الدفعات",
          description: `لم يتم تحديث أي مخالفة. تأكد من صلاحيات الوصول.`,
          variant: "destructive"
        });
      }

      return result;
    } catch (error: any) {
      console.error('Error in processAutoPayment:', error);
      toast({
        title: "خطأ في تسجيل الدفع",
        description: error.message,
        variant: "destructive"
      });
      return { success: 0, failed: selectedPaidViolations.size };
    } finally {
      setIsProcessingAutoPayment(false);
    }
  };

  // Save violations
  const saveSelectedViolations = async () => {
    if (!processingResult || selectedViolations.size === 0) return;

    const violationsToSave = processingResult.violations.filter(v =>
      selectedViolations.has(v.id) && v.status === 'matched' && !v.is_duplicate
    );

    const result = await saveViolations(
      violationsToSave,
      companyId,
      'moi_pdf',
      processingResult.header?.file_number
    );

    // معالجة الدفع التلقائي إذا كان مفعّلاً
    let autoPaymentSaveResult = null;
    if (enableAutoPayment && selectedPaidViolations.size > 0) {
      autoPaymentSaveResult = await processAutoPayment();
    }

    setSaveResult(result);
    setCompletedSteps(prev => new Set([...prev, 'review', 'complete']));
    setCurrentStep('complete');

    toast({
      title: "تم الحفظ بنجاح",
      description: `تم حفظ ${result.success} مخالفة${result.failed > 0 ? ` (${result.failed} فشل)` : ''}`,
    });

    // Send notifications if any are enabled
    const hasNotifications = notificationSettings.notifyManagers || 
      notificationSettings.notifyFleetManager || 
      notificationSettings.notifyCustomerByWhatsApp || 
      notificationSettings.notifyCustomerBySystem;

    if (hasNotifications && result.savedViolations && result.savedViolations.length > 0) {
      // Prepare notification data from saved violations
      const notificationData: ViolationNotificationData[] = result.savedViolations.map(v => ({
        violationId: v.savedId,
        violationNumber: v.violation_number,
        violationDate: v.date,
        violationType: v.violation_type,
        fineAmount: v.fine_amount,
        vehiclePlateNumber: v.plate_number,
        vehicleMake: v.vehicle_make,
        vehicleModel: v.vehicle_model,
        location: v.location,
        customerId: v.customer_id,
        customerName: v.customer_name,
        contractId: v.contract_id,
        contractNumber: v.contract_number,
      }));

      // Send notifications
      const notifyResult = await sendBulkViolationNotifications(notificationData, notificationSettings);
      
      if (notifyResult.success) {
        toast({
          title: "تم إرسال الإشعارات",
          description: `تم إرسال ${notifyResult.systemNotifications} إشعار${notifyResult.whatsappNotifications > 0 ? ` و ${notifyResult.whatsappNotifications} واتساب` : ''}`,
        });
      }
    }
  };

  // Reset
  const resetImport = () => {
    setCurrentStep('upload');
    setCompletedSteps(new Set());
    setUploadedFiles([]);
    setProcessingResult(null);
    setSelectedViolations(new Set());
    setSaveResult(null);
    setSearchQuery('');
    setFilterStatus('all');
  };

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const supportedFiles = acceptedFiles.filter(file =>
      file.type === 'application/pdf' || file.type.startsWith('image/')
    );
    setUploadedFiles(prev => [...prev, ...supportedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    multiple: true
  });

  // Toggle selection
  const toggleViolationSelection = (id: string) => {
    setSelectedViolations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!processingResult) return;
    const matchable = processingResult.violations.filter(v => v.status === 'matched' && !v.is_duplicate);
    if (selectedViolations.size === matchable.length) {
      setSelectedViolations(new Set());
    } else {
      setSelectedViolations(new Set(matchable.map(v => v.id)));
    }
  };

  // Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/20 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 dark:bg-teal-900/30 rounded-full text-teal-700 dark:text-teal-300 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            استخراج ذكي وسريع
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            استيراد المخالفات المرورية
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            قم برفع ملفات PDF من وزارة الداخلية القطرية وسيتم استخراج جميع المخالفات تلقائياً ومطابقتها مع المركبات والعقود
          </p>
        </motion.div>

        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700"
        >
          <StepIndicator
            steps={STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {/* Upload Step */}
            {currentStep === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={cn(
                    "relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
                    isDragActive 
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" 
                      : "border-slate-300 dark:border-slate-600 hover:border-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
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
                      isDragActive 
                        ? "bg-teal-100 dark:bg-teal-900/50" 
                        : "bg-slate-100 dark:bg-slate-700"
                    )}>
                      <Upload className={cn(
                        "h-10 w-10 transition-colors",
                        isDragActive ? "text-teal-600" : "text-slate-400"
                      )} />
                    </div>

                    {isDragActive ? (
                      <p className="text-xl font-semibold text-teal-600 dark:text-teal-400">
                        أفلت الملفات هنا...
                      </p>
                    ) : (
                      <>
                        <p className="text-xl font-semibold text-slate-700 dark:text-slate-200">
                          اسحب الملفات وأفلتها هنا
                        </p>
                        <p className="text-slate-500">
                          أو انقر لاختيار الملفات
                        </p>
                      </>
                    )}

                    <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        PDF
                      </span>
                      <span>•</span>
                      <span>JPG, PNG, GIF, WEBP</span>
                    </div>
                  </motion.div>
                </div>

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-700 dark:text-slate-200">
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
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              file.type === 'application/pdf' 
                                ? "bg-red-100 text-red-600" 
                                : "bg-blue-100 text-blue-600"
                            )}>
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setPreviewFile(file);
                                      setIsPreviewOpen(true);
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>معاينة</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>حذف</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Auto Payment Option */}
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="enableAutoPayment"
                          checked={enableAutoPayment}
                          onCheckedChange={(checked) => setEnableAutoPayment(checked === true)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor="enableAutoPayment" 
                            className="font-semibold text-amber-800 dark:text-amber-200 cursor-pointer flex items-center gap-2"
                          >
                            <Building2 className="h-4 w-4" />
                            الكشف عن الدفع التلقائي
                          </label>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            المخالفات الموجودة في النظام ولكن غير موجودة في ملف PDF = تم دفعها من الشركة.
                            سيتم تسجيلها كمدفوعة من الشركة مع بقاء مطالبة العميل بقيمتها.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
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
                  </div>
                )}

                {/* Features */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      icon: <Zap className="h-5 w-5" />,
                      title: 'استخراج سريع',
                      desc: 'معالجة 500+ مخالفة في ثوانٍ'
                    },
                    {
                      icon: <Target className="h-5 w-5" />,
                      title: 'مطابقة ذكية',
                      desc: 'ربط تلقائي بالمركبات والعقود'
                    },
                    {
                      icon: <Shield className="h-5 w-5" />,
                      title: 'كشف التكرار',
                      desc: 'تجنب إدخال المخالفات المكررة'
                    }
                  ].map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl"
                    >
                      <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg text-teal-600 dark:text-teal-400">
                        {feature.icon}
                      </div>
                      <div>
                        <p className="font-medium text-slate-700 dark:text-slate-200">{feature.title}</p>
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
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                <ProcessingStatus
                  status={processingStatus}
                  progress={processingProgress}
                  details={`جاري معالجة ${uploadedFiles.length} ملف...`}
                />
              </motion.div>
            )}

            {/* Review Step */}
            {currentStep === 'review' && processingResult && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8 space-y-6"
              >
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <StatCard
                    icon={<Layers className="h-5 w-5" />}
                    value={processingResult.total_extracted}
                    label="إجمالي المخالفات"
                    color="blue"
                  />
                  <StatCard
                    icon={<CircleCheck className="h-5 w-5" />}
                    value={processingResult.successful_matches}
                    label="مطابقة"
                    color="green"
                  />
                  <StatCard
                    icon={<Copy className="h-5 w-5" />}
                    value={processingResult.duplicates_found}
                    label="مكررة"
                    color="orange"
                  />
                  <StatCard
                    icon={<CircleX className="h-5 w-5" />}
                    value={processingResult.errors}
                    label="أخطاء"
                    color="red"
                  />
                  <StatCard
                    icon={<DollarSign className="h-5 w-5" />}
                    value={`${processingResult.total_amount.toFixed(0)}`}
                    label="إجمالي الغرامات (ر.ق)"
                    color="purple"
                  />
                </div>

                {/* Auto Payment Detection Results */}
                {autoPaymentResult && autoPaymentResult.paidByCompany.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                            مخالفات مدفوعة من الشركة
                          </h3>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            تم اكتشاف {autoPaymentResult.paidByCompany.length} مخالفة غير موجودة في PDF (تم دفعها)
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                          {autoPaymentResult.paidByCompany.reduce((sum, v) => sum + v.amount, 0).toLocaleString('en-US')}
                        </p>
                        <p className="text-sm text-amber-600">ر.ق إجمالي المدفوع</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={selectedPaidViolations.size === autoPaymentResult.paidByCompany.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPaidViolations(new Set(autoPaymentResult.paidByCompany.map(v => v.id)));
                            } else {
                              setSelectedPaidViolations(new Set());
                            }
                          }}
                        />
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          تحديد الكل ({selectedPaidViolations.size}/{autoPaymentResult.paidByCompany.length})
                        </span>
                      </div>
                      
                      {autoPaymentResult.paidByCompany.slice(0, 10).map(violation => (
                        <div key={violation.id} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg">
                          <Checkbox
                            checked={selectedPaidViolations.has(violation.id)}
                            onCheckedChange={(checked) => {
                              setSelectedPaidViolations(prev => {
                                const newSet = new Set(prev);
                                if (checked) newSet.add(violation.id);
                                else newSet.delete(violation.id);
                                return newSet;
                              });
                            }}
                          />
                          <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                            <span className="font-medium">{violation.penalty_number}</span>
                            <span>{violation.vehicle_plate || '-'}</span>
                            <span>{violation.customer_name || 'بدون عميل'}</span>
                            <span className="font-semibold text-amber-700">{violation.amount.toLocaleString('en-US')} ر.ق</span>
                          </div>
                        </div>
                      ))}
                      
                      {autoPaymentResult.paidByCompany.length > 10 && (
                        <p className="text-center text-sm text-amber-600 py-2">
                          و {autoPaymentResult.paidByCompany.length - 10} مخالفة أخرى...
                        </p>
                      )}
                    </div>

                    <Alert className="mt-4 bg-amber-100/50 border-amber-300">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        <strong>ملاحظة:</strong> سيتم تسجيل هذه المخالفات كمدفوعة من الشركة. 
                        العميل سيظل مطالباً بسداد قيمتها للشركة.
                      </AlertDescription>
                    </Alert>

                    {/* زر تسجيل الدفعات */}
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={async () => {
                          const result = await processAutoPayment();
                          if (result && result.success > 0) {
                            // إعادة تعيين النتائج
                            setAutoPaymentResult(null);
                            setSelectedPaidViolations(new Set());
                          }
                        }}
                        disabled={selectedPaidViolations.size === 0 || isProcessingAutoPayment}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {isProcessingAutoPayment ? (
                          <>
                            <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                            جاري التسجيل...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 ml-2" />
                            تسجيل {selectedPaidViolations.size} دفعة
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Header Info */}
                {processingResult.header && (
                  <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">
                      معلومات المستند
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">رقم الملف</p>
                        <p className="font-medium">{processingResult.header.file_number || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">رقم اللوحة</p>
                        <p className="font-medium">{processingResult.header.vehicle_plate || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">المالك</p>
                        <p className="font-medium">{processingResult.header.owner_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">عدد المخالفات</p>
                        <p className="font-medium">{processingResult.header.total_violations || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="بحث برقم اللوحة، المخالفة، العميل..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    {(['all', 'matched', 'error', 'duplicate'] as const).map(status => (
                      <Button
                        key={status}
                        size="sm"
                        variant={filterStatus === status ? 'default' : 'outline'}
                        onClick={() => setFilterStatus(status)}
                        className={cn(
                          "rounded-full",
                          filterStatus === status && "bg-teal-500 hover:bg-teal-600"
                        )}
                      >
                        {status === 'all' && 'الكل'}
                        {status === 'matched' && 'مطابقة'}
                        {status === 'error' && 'أخطاء'}
                        {status === 'duplicate' && 'مكررة'}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Selection Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                    >
                      {selectedViolations.size === processingResult.violations.filter(v => v.status === 'matched' && !v.is_duplicate).length
                        ? 'إلغاء تحديد الكل'
                        : 'تحديد الكل'
                      }
                    </Button>
                    <span className="text-sm text-slate-500">
                      محدد: {selectedViolations.size} من {processingResult.successful_matches}
                    </span>
                  </div>
                </div>

                {/* Violations List */}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pl-4">
                    {filteredViolations.map((violation, index) => (
                      <ViolationRow
                        key={violation.id}
                        violation={violation}
                        isSelected={selectedViolations.has(violation.id)}
                        onToggle={() => toggleViolationSelection(violation.id)}
                        isExpanded={expandedViolation === violation.id}
                        onExpand={() => setExpandedViolation(
                          expandedViolation === violation.id ? null : violation.id
                        )}
                      />
                    ))}
                  </div>
                </ScrollArea>

                {/* Notification Settings */}
                {selectedViolations.size > 0 && (
                  <div className="mt-4">
                    <ViolationNotificationSettings
                      settings={notificationSettings}
                      onSettingsChange={setNotificationSettings}
                      violationCount={selectedViolations.size}
                      customerCount={new Set(
                        processingResult.violations
                          .filter(v => selectedViolations.has(v.id) && v.customer_id)
                          .map(v => v.customer_id)
                      ).size}
                      isSending={isSendingNotifications}
                      lastResult={notificationResult}
                      compact={true}
                      showSendButton={false}
                    />
                  </div>
                )}

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
                    onClick={saveSelectedViolations}
                    disabled={isSaving || isSendingNotifications || selectedViolations.size === 0}
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-8"
                  >
                    {isSaving || isSendingNotifications ? (
                      <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Save className="h-4 w-4 ml-2" />
                    )}
                    حفظ المخالفات المحددة ({selectedViolations.size})
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
                className="p-12 text-center space-y-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30"
                >
                  <Check className="h-12 w-12 text-white" />
                </motion.div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    تم بنجاح!
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400">
                    تم حفظ {saveResult.success} مخالفة في النظام
                    {saveResult.failed > 0 && (
                      <span className="text-red-500"> ({saveResult.failed} فشل)</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={resetImport}
                    className="px-6"
                  >
                    <Upload className="h-4 w-4 ml-2" />
                    استيراد جديد
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6"
                    onClick={() => window.location.href = '/traffic-violations'}
                  >
                    <BarChart3 className="h-4 w-4 ml-2" />
                    عرض المخالفات
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>

      {/* PDF Viewer */}
      {previewFile && (
        <PDFViewer
          file={previewFile}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewFile(null);
          }}
        />
      )}
    </div>
  );
};

export default TrafficViolationPDFImportRedesigned;
