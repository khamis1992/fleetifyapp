/**
 * مكون توزيع صور البطاقات الشخصية على العملاء
 * يقوم بقراءة رقم البطاقة الشخصية من الصور وتوزيعها على العملاء المناسبين
 * مع تحديث بيانات العميل بناءً على البيانات المستخرجة
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  FileImage,
  User,
  Check,
  X,
  AlertTriangle,
  Loader2,
  ScanSearch,
  FileCheck,
  Trash2,
  RefreshCw,
  Database,
  Settings,
  Eye,
  EyeOff,
  Edit3,
  IdCard,
  Pause,
  Play,
  Square,
  Download,
  MoreHorizontal,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Tesseract from 'tesseract.js';

// استخدام Customer OCR عبر Supabase Edge Function (Google Cloud Vision)
interface CustomerOCRResult {
  success: boolean;
  rawText: string;
  extractedData: ExtractedCustomerData;
  confidence: number;
  error?: string;
}

const extractWithCustomerOCR = async (file: File, signal?: AbortSignal): Promise<CustomerOCRResult> => {
  // تحويل الملف إلى base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result); // نرسل data URL الكامل
    };
    reader.onerror = reject;
    if (signal) {
      signal.addEventListener('abort', () => reject(new Error('Aborted')));
    }
    reader.readAsDataURL(file);
  });

  // الحصول على session للتوثيق
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  // إرسال الطلب إلى Edge Function مع timeout أقصر (30s بدلاً من 60s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for faster fallback

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await supabase.functions.invoke('customer-id-ocr', {
      body: { imageBase64: base64 },
    });

    if (response.error) {
      throw new Error(response.error.message || 'OCR failed');
    }

    return response.data as CustomerOCRResult;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Check if it was a timeout or function not found
    if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('Aborted')) {
      console.warn('⏰ Google Cloud Vision timeout (30s), falling back to Tesseract');
      throw new Error('TIMEOUT_FALLBACK_TO_TESSERACT');
    }

    // If function doesn't exist or other error, also fall back
    console.warn('⚠️ Google Cloud Vision unavailable, falling back to Tesseract:', error.message);
    throw new Error('FALLBACK_TO_TESSERACT');
  } finally {
    clearTimeout(timeoutId);
  }
};

// البيانات المستخرجة من البطاقة الشخصية
interface ExtractedCustomerData {
  nationalId?: string;
  name?: string;
  nameArabic?: string;
  firstName?: string;
  lastName?: string;
  firstNameArabic?: string;
  lastNameArabic?: string;
  dateOfBirth?: string;
  idExpiry?: string;
  nationality?: string;
  nationalityArabic?: string;
  passportNumber?: string;
  occupation?: string;
  occupationArabic?: string;
  confidence?: number;
}

enum ProcessingError {
  OCR_FAILED = 'ocr_failed',
  NO_ID_FOUND = 'no_id_found',
  CUSTOMER_NOT_FOUND = 'not_found',
  UPLOAD_FAILED = 'upload_failed',
  UPDATE_FAILED = 'update_failed',
  NETWORK_ERROR = 'network_error',
}

interface BatchProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  inProgress: number;
  pending: number;
  currentChunk: number;
  totalChunks: number;
  isPaused: boolean;
  stopped: boolean;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'scanning' | 'matched' | 'not_found' | 'uploaded' | 'error';
  extractedNumber?: string;
  extractedData?: ExtractedCustomerData;
  extractedText?: string;
  matchedCustomer?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    national_id?: string;
  };
  dataUpdated?: boolean;
  error?: string;
  progress?: number;
  retryCount?: number;
  lastError?: ProcessingError;
  canSkip?: boolean;
}

interface CustomerDocumentDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// استخراج البيانات من نص البطاقة الشخصية مع دعم العربية والأنماط القطرية
const extractCustomerData = (text: string): ExtractedCustomerData => {
  const data: ExtractedCustomerData = {};
  const cleanText = text.replace(/\s+/g, ' ').trim();
  console.log('Full OCR text for ID:', cleanText);

  // 1. رقم البطاقة الشخصية - ID No / ID Number / QID / رقم الهوية
  // يدعم: ID No, ID No., ID Number, QID, رقم الهوية, مع أو بدون نقطتين
  const idPatterns = [
    // أنماط الإنجليزية
    /(?:ID\s*\.\s*(?:No\s*\.\s*?|Number\s*?)?|QID)\s*[:\.]?\s*(\d{11})/i,
    /ID\s*No\s*[:\.]?\s*(\d{11})/i,
    /ID\s*Number\s*[:\.]?\s*(\d{11})/i,
    /(?:ID\s*\.?\s*No\s*\.?|رقم\s*الهوية)\s*[:\.]?\s*(\d{11})/i,
    // أنماط العربية
    /(?:رقم\s*(?:البطاقة|الهوية|الID)|QID)\s*[:\.]?\s*(\d{11})/i,
    // أي رقم 11 خانة (كخيار أخير)
    /\b(\d{11})\b/,
  ];

  for (const pattern of idPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.nationalId = match[1];
      break;
    }
  }

  // 2. تاريخ الميلاد - D.O.B / Date of Birth / تاريخ الميلاد
  // يدعم: D.O.B, DOB, Date of Birth, تاريخ الميلاد
  const dobPatterns = [
    /(?:D\.?O\.?B\.?|Date\s+of\s+Birth|تاريخ\s+الميلاد)\s*[:\.]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
    /(?:D\.?O\.?B\.?|DOB|تاريخ\s+الميلاد)\s*[:\.]?\s*(\d{4}[-/]\d{2}[-/]\d{2})/i,
    // نمط مرن مع مسافات اختيارية
    /(?:D\s*\.?\s*O\s*\.?\s*B|تاريخ\s+الميلاد)\s*[:\.]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
  ];

  for (const pattern of dobPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.dateOfBirth = parseDate(match[1]);
      if (data.dateOfBirth) break;
    }
  }

  // 3. تاريخ انتهاء البطاقة - Expiry / Exp Date / تاريخ الانتهاء
  // يدعم: Expiry, Exp Date, تاريخ الانتهاء
  const expiryPatterns = [
    /(?:Exp(?:iry|\.?)?(?:\s+Date)?|انتهاء\s+البطاقة|تاريخ\s+الانتهاء)\s*[:\.]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
    /(?:Exp(?:iry|\.?)?(?:\s+Date)?|انتهاء\s+البطاقة|تاريخ\s+الانتهاء)\s*[:\.]?\s*(\d{4}[-/]\d{2}[-/]\d{2})/i,
  ];

  for (const pattern of expiryPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.idExpiry = parseDate(match[1]);
      if (data.idExpiry) break;
    }
  }

  // 4. الجنسية - Nationality / الجنسية (بالإنجليزي والعربي)
  // يدعم: Nationality, الجنسية
  const nationalityPatterns = [
    // الإنجليزية
    /Nationality\s*[:\.]?\s*([A-Z][A-Z\s]+)/i,
    // العربية
    /الجنسية\s*[:\.]?\s*([A-Za-z\u0600-\u06FF\s]+)/i,
  ];

  for (const pattern of nationalityPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const nationality = match[1].trim();
      // تحديد ما إذا كانت عربية أو إنجليزية
      const hasArabic = /[\u0600-\u06FF]/.test(nationality);
      if (hasArabic) {
        data.nationalityArabic = nationality;
      } else {
        data.nationality = nationality;
      }
      break;
    }
  }

  // 5. الاسم الكامل - Name / الاسم (بالإنجليزي والعربي)
  // يدعم: Name, الاسم, الاسم بالعربي
  const namePatterns = [
    // الإنجليزية
    /Name\s*[:\.]?\s*([A-Z][A-Z\s]+)/i,
    // العربية - الاسم
    /(?:الاسم\s*[:\.]?\s*|الاسم\s+بالإنجليزي\s*[:\.]?\s*)([A-Za-z\s]+)/i,
    // العربية - الاسم بالعربي
    /(?:الاسم\s+بالعربي|الاسم\s*\([^)]*\))\s*[:\.]?\s*([\u0600-\u06FF\s]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const fullName = match[1].trim();
      const hasArabic = /[\u0600-\u06FF]/.test(fullName);

      if (hasArabic) {
        data.nameArabic = fullName;
        // محاولة تقسيم الاسم العربي
        const nameParts = fullName.split(/\s+/).filter(n => n.length > 0);
        if (nameParts.length >= 2) {
          data.firstNameArabic = nameParts[0];
          data.lastNameArabic = nameParts.slice(1).join(' ');
        } else if (nameParts.length === 1) {
          data.firstNameArabic = nameParts[0];
        }
      } else {
        data.name = fullName;
        // محاولة تقسيم الاسم الإنجليزي
        const nameParts = fullName.split(/\s+/).filter(n => n.length > 0);
        if (nameParts.length >= 2) {
          data.firstName = nameParts[0];
          data.lastName = nameParts.slice(1).join(' ');
        } else if (nameParts.length === 1) {
          data.firstName = nameParts[0];
        }
      }
    }
  }

  // 6. المهنة - Occupation / المهنة (بالإنجليزي والعربي)
  const occupationPatterns = [
    /Occupation\s*[:\.]?\s*([A-Za-z\s]+)/i,
    /المهنة\s*[:\.]?\s*([A-Za-z\u0600-\u06FF\s]+)/i,
  ];

  for (const pattern of occupationPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const occupation = match[1].trim();
      const hasArabic = /[\u0600-\u06FF]/.test(occupation);
      if (hasArabic) {
        data.occupationArabic = occupation;
      } else {
        data.occupation = occupation;
      }
      break;
    }
  }

  // 7. رقم جواز السفر - Passport No
  const passportPatterns = [
    /Passport\s*No\s*[:\.]?\s*([A-Z0-9]{6,12})/i,
    /رقم\s*جواز\s*السفر\s*[:\.]?\s*([A-Z0-9]{6,12})/i,
  ];

  for (const pattern of passportPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.passportNumber = match[1].trim();
      break;
    }
  }

  console.log('Extracted customer data:', data);
  return data;
};

// تحويل التاريخ إلى صيغة YYYY-MM-DD
const parseDate = (dateStr: string): string | undefined => {
  try {
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return undefined;

    let year: number, month: number, day: number;

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
    } else {
      // DD-MM-YYYY or DD/MM/YYYY
      day = parseInt(parts[0]);
      month = parseInt(parts[1]);
      year = parseInt(parts[2]);
    }

    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return undefined;
    }

    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  } catch {
    return undefined;
  }
};

// مكون عرض البيانات المستخرجة (يدعم الإنجليزية والعربية)
const ExtractedDataPreview: React.FC<{ data: ExtractedCustomerData; dataUpdated?: boolean }> = ({ data, dataUpdated }) => {
  const fields = [
    { label: 'رقم البطاقة', value: data.nationalId },
    { label: 'الاسم (EN)', value: data.name },
    { label: 'الاسم (AR)', value: data.nameArabic },
    { label: 'الاسم الأول (EN)', value: data.firstName },
    { label: 'الاسم الأول (AR)', value: data.firstNameArabic },
    { label: 'اسم العائلة (EN)', value: data.lastName },
    { label: 'اسم العائلة (AR)', value: data.lastNameArabic },
    { label: 'تاريخ الميلاد', value: data.dateOfBirth },
    { label: 'انتهاء البطاقة', value: data.idExpiry },
    { label: 'الجنسية (EN)', value: data.nationality },
    { label: 'الجنسية (AR)', value: data.nationalityArabic },
    { label: 'المهنة (EN)', value: data.occupation },
    { label: 'المهنة (AR)', value: data.occupationArabic },
    { label: 'رقم الجواز', value: data.passportNumber },
    { label: 'الثقة', value: data.confidence ? `${Math.round(data.confidence * 100)}%` : undefined },
  ].filter(f => f.value);

  if (fields.length === 0) return null;

  return (
    <div className={cn(
      "mt-2 p-2 rounded-lg text-xs",
      dataUpdated ? "bg-emerald-50 border border-emerald-200" : "bg-slate-100 border border-slate-200"
    )}>
      {dataUpdated && (
        <div className="flex items-center gap-1 text-emerald-600 font-medium mb-1">
          <Check className="w-3 h-3" />
          تم تحديث البيانات
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex items-center gap-1">
            <span className="text-slate-500">{label}:</span>
            <span
              className={cn(
                "font-medium truncate",
              value?.match(/[\u0600-\u06FF]/) ? "text-slate-800" : "text-slate-700"
              )}
              dir={value?.match(/[\u0600-\u06FF]/) ? "rtl" : "ltr"}
              title={value}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface SavedState {
  files: UploadedFile[];
  progress: BatchProgress;
  timestamp: number;
}

// Constants for batch processing
const CHUNK_SIZE = 10;
const DELAY_BETWEEN_CHUNKS = 2000;
const DELAY_BETWEEN_FILES = 500;
const MAX_RETRIES = 2;
const MAX_CONCURRENT = 2; // Reduced from 3 to 2 for better timeout handling
const LOCAL_STORAGE_KEY = 'ocr-processing-state';

const CustomerDocumentDistributionDialog: React.FC<CustomerDocumentDistributionDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [showDebugText, setShowDebugText] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [manualNationalId, setManualNationalId] = useState('');
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    inProgress: 0,
    pending: 0,
    currentChunk: 0,
    totalChunks: 0,
    isPaused: false,
    stopped: false,
  });
  const [processingCompleted, setProcessingCompleted] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [visibleFileCount, setVisibleFileCount] = useState(50);

  const processingAbortRef = useRef<boolean>(false);
  const processingPromiseRef = useRef<any>(null);

  // معالجة الملفات المسحوبة
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
      retryCount: 0,
      canSkip: true,
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setProcessingCompleted(false);
  }, []);

  // Utility functions for batch processing
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  // Save progress to localStorage
  const saveProgressToLocalStorage = useCallback(() => {
    try {
      const state: SavedState = {
        files: files.map(f => ({
          ...f,
          preview: '', // Don't save blob URLs
        })),
        progress: batchProgress,
        timestamp: Date.now(),
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save progress to localStorage:', error);
    }
  }, [files, batchProgress]);

  // Load progress from localStorage
  const loadProgressFromLocalStorage = useCallback((): SavedState | null => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load progress from localStorage:', error);
    }
    return null;
  }, []);

  // Clear localStorage
  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }, []);

  // Check for saved state on mount
  useEffect(() => {
    if (open && files.length === 0) {
      const savedState = loadProgressFromLocalStorage();
      if (savedState && savedState.files.length > 0) {
        const timeDiff = Date.now() - savedState.timestamp;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // Only show resume prompt if less than 24 hours old
        if (hoursDiff < 24 && savedState.progress.processed < savedState.progress.total) {
          setShowResumePrompt(true);
        }
      }
    }
  }, [open, files.length, loadProgressFromLocalStorage]);

  // Resume previous processing
  const handleResumePrevious = useCallback(() => {
    const savedState = loadProgressFromLocalStorage();
    if (savedState) {
      // Restore blob URLs
      const restoredFiles = savedState.files.map(f => ({
        ...f,
        preview: f.file ? URL.createObjectURL(f.file) : '',
      }));
      setFiles(restoredFiles);
      setBatchProgress(savedState.progress);
      setShowResumePrompt(false);
      toast.success('تم استعادة المعالجة السابقة');
    }
  }, [loadProgressFromLocalStorage]);

  // Reject resume and clear
  const handleRejectResume = useCallback(() => {
    clearLocalStorage();
    setShowResumePrompt(false);
  }, [clearLocalStorage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: true,
  });

  // جلب جميع العملاء للمطابقة
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-for-matching', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone, national_id')
        .eq('company_id', companyId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!companyId,
  });

  // إنشاء خريطة للمطابقة السريعة
  const customerMap = React.useMemo(() => {
    const map = new Map<string, typeof customers[0]>();
    customers.forEach(customer => {
      if (customer.national_id) {
        map.set(customer.national_id, customer);
      }
    });
    return map;
  }, [customers]);

  // مطابقة رقم البطاقة مع العملاء
  const findMatchingCustomer = (nationalId: string) => {
    if (customerMap.has(nationalId)) {
      return customerMap.get(nationalId)!;
    }
    return null;
  };

  // معالجة الصورة باستخدام OCR مع استراتيجية احتياطية محسّنة
  const processImage = async (uploadedFile: UploadedFile, signal?: AbortSignal): Promise<UploadedFile> => {
    try {
      setFiles(prev => prev.map(f =>
        f.id === uploadedFile.id ? { ...f, status: 'scanning' as const, progress: 0 } : f
      ));

      const updateProgress = (progress: number) => {
        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id ? { ...f, progress } : f
        ));
      };

      let extractedText = '';
      let extractedData: ExtractedCustomerData = {};
      let ocrMethod = 'tesseract';
      let serverExtractedData: ExtractedCustomerData = {};

      // Method 1: Google Cloud Vision (30s timeout, then fallback)
      try {
        console.log('🔍 Trying Google Cloud Vision (30s timeout)...');
        updateProgress(20);

        const ocrResult = await extractWithCustomerOCR(uploadedFile.file, signal);

        if (ocrResult.success && ocrResult.rawText) {
          extractedText = ocrResult.rawText;
          serverExtractedData = ocrResult.extractedData;
          ocrMethod = 'google-vision';

          console.log('✅ Google Vision result:', extractedText.substring(0, 300));
          console.log('✅ Server extracted data:', serverExtractedData);

          updateProgress(90);
        } else {
          console.warn('⚠️ Customer OCR failed:', ocrResult.error);
          throw new Error(ocrResult.error || 'OCR failed');
        }
      } catch (error: any) {
        // Check if it's a timeout or fallback signal
        if (error.message === 'TIMEOUT_FALLBACK_TO_TESSERACT' ||
            error.message === 'FALLBACK_TO_TESSERACT') {
          console.warn('⚠️ Falling back to Tesseract due to timeout/unavailability');
          // Update UI to show fallback
          setFiles(prev => prev.map(f =>
            f.id === uploadedFile.id ? {
              ...f,
              status: 'scanning' as const,
              extractedData: { ...f.extractedData, note: 'Using fallback OCR method...' }
            } : f
          ));
        } else {
          console.warn('⚠️ Google Cloud Vision failed, trying Tesseract with Arabic...', error);
        }

        // Method 2: Tesseract.js كخيار احتياطي (مع دعم العربية والإنجليزية)
        ocrMethod = 'tesseract-arabic';
        updateProgress(40);

        try {
          const result = await Tesseract.recognize(uploadedFile.file, 'eng+ara', {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                updateProgress(40 + Math.round(m.progress * 50));
              }
            },
          });

          extractedText = result.data.text;
          console.log('📝 Tesseract (eng+ara) result:', extractedText.substring(0, 200));
        } catch (tesseractError) {
          console.warn('⚠️ Tesseract with Arabic failed, trying English only...', tesseractError);

          // Method 3: Tesseract بالإنجليزية فقط
          ocrMethod = 'tesseract-english';
          updateProgress(60);

          const result = await Tesseract.recognize(uploadedFile.file, 'eng', {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                updateProgress(60 + Math.round(m.progress * 30));
              }
            },
          });

          extractedText = result.data.text;
          console.log('📝 Tesseract (eng only) result:', extractedText.substring(0, 200));
        }
      }

      console.log(`📊 OCR Method: ${ocrMethod}`);
      updateProgress(100);

      // استخراج البيانات من النص (دمج البيانات من الخادم مع الاستخراج المحلي)
      const localExtractedData = extractCustomerData(extractedText);
      extractedData = {
        ...localExtractedData,
        ...serverExtractedData, // البيانات من الخادم لها الأولوية
        confidence: serverExtractedData.confidence || localExtractedData.confidence,
      };

      if (!extractedData.nationalId) {
        return {
          ...uploadedFile,
          status: 'not_found',
          extractedData,
          extractedText: extractedText.substring(0, 500),
          error: 'لم يتم العثور على رقم بطاقة شخصية. يرجى إدخال الرقم يدوياً.',
        };
      }

      const matchedCustomer = findMatchingCustomer(extractedData.nationalId);

      if (matchedCustomer) {
        return {
          ...uploadedFile,
          status: 'matched',
          extractedNumber: extractedData.nationalId,
          extractedData,
          extractedText: extractedText.substring(0, 500),
          matchedCustomer,
        };
      } else {
        return {
          ...uploadedFile,
          status: 'not_found',
          extractedNumber: extractedData.nationalId,
          extractedData,
          extractedText: extractedText.substring(0, 500),
          error: `لم يتم العثور على عميل برقم البطاقة: ${extractedData.nationalId}`,
        };
      }
    } catch (error: any) {
      console.error('OCR Error:', error);
      return {
        ...uploadedFile,
        status: 'error',
        error: error.message || 'فشل في قراءة الصورة',
      };
    }
  };

  // تحديث بيانات العميل مع دعم الحقول العربية
  const updateCustomerData = async (customerId: string, data: ExtractedCustomerData): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};

      // الحقول الإنجليزية
      if (data.nationalId) updateData.national_id = data.nationalId;
      if (data.firstName) updateData.first_name = data.firstName;
      if (data.lastName) updateData.last_name = data.lastName;
      if (data.dateOfBirth) updateData.date_of_birth = data.dateOfBirth;
      if (data.idExpiry) updateData.national_id_expiry = data.idExpiry;
      if (data.passportNumber) updateData.passport_number = data.passportNumber;

      // الحقول العربية - تُحدث فقط إذا كانت موجودة في قاعدة البيانات
      // هذه الحقول موجودة في جدول customers حسب DATABASE_REFERENCE.md
      if (data.firstNameArabic) updateData.first_name_ar = data.firstNameArabic;
      if (data.lastNameArabic) updateData.last_name_ar = data.lastNameArabic;
      // ملاحظة: nationality_arabic و occupation_arabic غير موجودين في جدول customers حالياً
      // يمكن إضافتهما لاحقاً كتحسين للنظام

      if (Object.keys(updateData).length === 0) {
        return false;
      }

      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customerId);

      if (error) {
        // التعامل مع خطأ العمود غير الموجود (للحقول العربية الجديدة)
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.warn('Some Arabic fields not found in database, updating only supported fields:', error);
          // إعادة المحاولة بدون الحقول العربية
          const englishData: Record<string, unknown> = {};
          if (data.nationalId) englishData.national_id = data.nationalId;
          if (data.firstName) englishData.first_name = data.firstName;
          if (data.lastName) englishData.last_name = data.lastName;
          if (data.dateOfBirth) englishData.date_of_birth = data.dateOfBirth;
          if (data.idExpiry) englishData.national_id_expiry = data.idExpiry;
          if (data.passportNumber) englishData.passport_number = data.passportNumber;

          const { error: retryError } = await supabase
            .from('customers')
            .update(englishData)
            .eq('id', customerId);

          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['customer-details', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });

      return true;
    } catch (error) {
      console.error('Error updating customer:', error);
      return false;
    }
  };

  // معالجة جميع الملفات - Enhanced Batch Processing
  const processSingleFileWithErrorHandling = async (file: UploadedFile): Promise<{ file: UploadedFile; success: boolean }> => {
    try {
      const processedFile = await processImage(file);

      // Clean up memory
      if (file.preview && file.preview !== processedFile.preview) {
        URL.revokeObjectURL(file.preview);
      }

      return {
        file: processedFile,
        success: processedFile.status === 'matched' || processedFile.status === 'not_found',
      };
    } catch (error: any) {
      console.error(`Failed to process ${file.file.name}:`, error);
      return {
        file: {
          ...file,
          status: 'error' as const,
          error: error.message || 'فشل في قراءة الصورة',
          lastError: ProcessingError.OCR_FAILED,
          retryCount: (file.retryCount || 0) + 1,
        },
        success: false,
      };
    }
  };

  const processChunkWithConcurrency = async (filesToProcess: UploadedFile[]): Promise<UploadedFile[]> => {
    const results: UploadedFile[] = [];

    // Process in batches of MAX_CONCURRENT
    for (let i = 0; i < filesToProcess.length; i += MAX_CONCURRENT) {
      const batch = filesToProcess.slice(i, i + MAX_CONCURRENT);

      const batchResults = await Promise.allSettled(
        batch.map(file => processSingleFileWithErrorHandling(file))
      );

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value.file);
        } else {
          // Should not happen with error handling, but just in case
          results.push({
            ...batch[0],
            status: 'error' as const,
            error: 'Unknown error occurred',
          });
        }
      });

      // Update UI after each batch
      setFiles(prev => {
        const updated = [...prev];
        batchResults.forEach((result, idx) => {
          const originalFile = batch[idx];
          const index = updated.findIndex(f => f.id === originalFile.id);
          if (index !== -1) {
            updated[index] = result.status === 'fulfilled' ? result.value.file : updated[index];
          }
        });
        return updated;
      });

      // Delay between concurrent batches
      if (i + MAX_CONCURRENT < filesToProcess.length) {
        await sleep(DELAY_BETWEEN_FILES);
      }
    }

    return results;
  };

  const processAllFilesInChunks = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');

    if (pendingFiles.length === 0) {
      toast.info('لا توجد ملفات في الانتظار للمعالجة');
      return;
    }

    setIsProcessing(true);
    setIsStopped(false);
    setIsPaused(false);
    setProcessingCompleted(false);
    processingAbortRef.current = false;

    const chunks = chunkArray(pendingFiles, CHUNK_SIZE);
    const totalChunks = chunks.length;

    // Initialize batch progress
    const initialProgress: BatchProgress = {
      total: pendingFiles.length,
      processed: 0,
      successful: 0,
      failed: 0,
      inProgress: 0,
      pending: pendingFiles.length,
      currentChunk: 0,
      totalChunks,
      isPaused: false,
      stopped: false,
    };
    setBatchProgress(initialProgress);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      // Check if stopped
      if (processingAbortRef.current) {
        console.log('Processing stopped by user');
        break;
      }

      // Wait while paused
      while (isPaused && !processingAbortRef.current) {
        await sleep(500);
      }

      if (processingAbortRef.current) break;

      const chunk = chunks[chunkIndex];

      // Update current chunk
      setBatchProgress(prev => ({
        ...prev,
        currentChunk: chunkIndex + 1,
        inProgress: chunk.length,
      }));

      // Process the chunk
      const processedResults = await processChunkWithConcurrency(chunk);

      // Update progress stats
      setBatchProgress(prev => {
        const successful = processedResults.filter(f => f.status === 'matched').length;
        const failed = processedResults.filter(f => f.status === 'error' || f.status === 'not_found').length;
        const newProcessed = prev.processed + chunk.length;

        return {
          ...prev,
          processed: newProcessed,
          successful: prev.successful + successful,
          failed: prev.failed + failed,
          inProgress: 0,
          pending: prev.total - newProcessed,
        };
      });

      // Update overall progress percentage
      setOverallProgress(Math.round(((chunkIndex + 1) / chunks.length) * 100));

      // Save progress to localStorage after each chunk
      await saveProgressToLocalStorage();

      // Memory cleanup: Clean up processed files from memory if needed
      // (Browsers handle this automatically with object URLs)

      // Delay between chunks (rate limiting)
      if (chunkIndex < chunks.length - 1) {
        await sleep(DELAY_BETWEEN_CHUNKS);
      }
    }

    setIsProcessing(false);
    setProcessingCompleted(true);
    clearLocalStorage();
  };

  // Pause processing
  const pauseProcessing = () => {
    setIsPaused(true);
    setBatchProgress(prev => ({ ...prev, isPaused: true }));
    toast.info('تم إيقاف المعالجة مؤقتاً');
  };

  // Resume processing
  const resumeProcessing = () => {
    setIsPaused(false);
    setBatchProgress(prev => ({ ...prev, isPaused: false }));
    toast.info('تم استئناف المعالجة');
  };

  // Stop processing
  const stopProcessing = () => {
    processingAbortRef.current = true;
    setIsStopped(true);
    setBatchProgress(prev => ({ ...prev, stopped: true }));
    toast.warning('تم إيقاف المعالجة');
  };

  // Retry failed files
  const retryFailedFiles = async () => {
    const failedFiles = files.filter(f =>
      f.status === 'error' ||
      (f.status === 'not_found' && (f.retryCount || 0) < MAX_RETRIES)
    );

    if (failedFiles.length === 0) {
      toast.info('لا توجد ملفات فاشلة لإعادة المحاولة');
      return;
    }

    // Reset failed files to pending
    setFiles(prev => prev.map(f => {
      if (failedFiles.find(ff => ff.id === f.id)) {
        return {
          ...f,
          status: 'pending' as const,
          error: undefined,
        };
      }
      return f;
    }));

    toast.info(`جاري إعادة معالجة ${failedFiles.length} ملف فاشل...`);

    // Start processing
    await processAllFilesInChunks();
  };

  // Export error report as CSV
  const exportErrorReport = () => {
    const failedFiles = files.filter(f => f.status === 'error' || f.status === 'not_found');

    if (failedFiles.length === 0) {
      toast.info('لا توجد أخطاء لتصديرها');
      return;
    }

    const headers = ['File Name', 'Status', 'Error', 'Extracted ID', 'Retries'];
    const rows = failedFiles.map(f => [
      f.file.name,
      f.status,
      f.error || 'Unknown error',
      f.extractedNumber || 'N/A',
      (f.retryCount || 0).toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ocr-errors-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success('تم تصدير تقرير الأخطاء بنجاح');
  };

  // رفع الملفات المطابقة وتحديث بيانات العملاء
  const uploadMatchedFiles = async () => {
    setIsUploading(true);
    const matchedFiles = files.filter(f => f.status === 'matched' && f.matchedCustomer);
    let successCount = 0;
    let errorCount = 0;
    let dataUpdatedCount = 0;

    for (const file of matchedFiles) {
      try {
        // رفع الملف إلى Storage
        const fileExt = file.file.name.split('.').pop();
        const fileName = `customer-documents/${file.matchedCustomer!.id}/${Date.now()}_id_card.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // إنشاء سجل في قاعدة البيانات
        const { error: dbError } = await supabase
          .from('customer_documents')
          .insert({
            customer_id: file.matchedCustomer!.id,
            company_id: companyId!,
            document_type: 'national_id',
            document_name: `البطاقة الشخصية - ${file.matchedCustomer!.first_name} ${file.matchedCustomer!.last_name}`,
            file_path: fileName,
            mime_type: file.file.type,
            file_size: file.file.size,
          });

        if (dbError) throw dbError;

        // تحديث بيانات العميل
        let dataUpdated = false;
        if (file.extractedData) {
          dataUpdated = await updateCustomerData(file.matchedCustomer!.id, file.extractedData);
          if (dataUpdated) dataUpdatedCount++;
        }

        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'uploaded' as const, dataUpdated } : f
        ));

        successCount++;

        queryClient.invalidateQueries({
          queryKey: ['customer-documents', file.matchedCustomer!.id]
        });
      } catch (error: any) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'error' as const, error: error.message } : f
        ));
        errorCount++;
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      const msg = dataUpdatedCount > 0
        ? `تم رفع ${successCount} بطاقة وتحديث بيانات ${dataUpdatedCount} عميل`
        : `تم رفع ${successCount} بطاقة بنجاح`;
      toast.success(msg);
    }
    if (errorCount > 0) {
      toast.error(`فشل رفع ${errorCount} بطاقة`);
    }
  };

  // إدخال رقم البطاقة يدوياً
  const handleManualIdEntry = (fileId: string) => {
    if (!manualNationalId.trim()) return;

    const matchedCustomer = findMatchingCustomer(manualNationalId);

    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;

      if (matchedCustomer) {
        return {
          ...f,
          status: 'matched' as const,
          extractedNumber: manualNationalId,
          matchedCustomer,
          error: undefined,
        };
      } else {
        return {
          ...f,
          status: 'not_found' as const,
          extractedNumber: manualNationalId,
          error: `لم يتم العثور على عميل برقم البطاقة: ${manualNationalId}`,
        };
      }
    }));

    setEditingFileId(null);
    setManualNationalId('');

    if (matchedCustomer) {
      toast.success(`تم مطابقة العميل: ${matchedCustomer.first_name} ${matchedCustomer.last_name}`);
    } else {
      toast.error(`لم يتم العثور على عميل برقم البطاقة: ${manualNationalId}`);
    }
  };

  // حذف ملف
  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  // مسح جميع الملفات
  const clearAllFiles = () => {
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    clearLocalStorage();
    setProcessingCompleted(false);
    setBatchProgress({
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      inProgress: 0,
      pending: 0,
      currentChunk: 0,
      totalChunks: 0,
      isPaused: false,
      stopped: false,
    });
  };

  const handleClose = () => {
    if (isProcessing) {
      // Ask for confirmation
      if (!confirm('المعالجة جارية. هل تريد حقاً الإغلاق؟')) {
        return;
      }
      stopProcessing();
    }
    clearAllFiles();
    onOpenChange(false);
  };

  const stats = React.useMemo(() => {
    const matchedFiles = files.filter(f => f.status === 'matched');
    const withExtractedData = matchedFiles.filter(f =>
      f.extractedData && Object.keys(f.extractedData).filter(k =>
        k !== 'nationalId' && (f.extractedData as any)[k]
      ).length > 0
    );

    return {
      total: files.length,
      pending: files.filter(f => f.status === 'pending').length,
      scanning: files.filter(f => f.status === 'scanning').length,
      matched: matchedFiles.length,
      withData: withExtractedData.length,
      notFound: files.filter(f => f.status === 'not_found').length,
      uploaded: files.filter(f => f.status === 'uploaded').length,
      dataUpdated: files.filter(f => f.dataUpdated).length,
      error: files.filter(f => f.status === 'error').length,
    };
  }, [files]);

  const getStatusBadge = (file: UploadedFile) => {
    switch (file.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-slate-50">في الانتظار</Badge>;
      case 'scanning':
        return <Badge className="bg-blue-100 text-blue-700">جاري المسح... {file.progress}%</Badge>;
      case 'matched':
        return <Badge className="bg-green-100 text-green-700">تم المطابقة</Badge>;
      case 'not_found':
        return <Badge className="bg-amber-100 text-amber-700">لم يتم العثور</Badge>;
      case 'uploaded':
        return <Badge className="bg-emerald-100 text-emerald-700">تم الرفع</Badge>;
      case 'error':
        return <Badge variant="destructive">خطأ</Badge>;
    }
  };

  return (
    <>
      {/* Resume Prompt Dialog */}
      <Dialog open={showResumePrompt} onOpenChange={setShowResumePrompt}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>استئناف المعالجة السابقة؟</DialogTitle>
            <DialogDescription>
              تم العثور على معالجة سابقة غير مكتملة ({loadProgressFromLocalStorage()?.progress.total || 0} ملف).
              هل تريد استئناف المعالجة من حيث توقفت؟
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={handleRejectResume}>
              بدء جديد
            </Button>
            <Button onClick={handleResumePrevious} className="bg-teal-600 hover:bg-teal-700">
              استئناف المعالجة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Dialog */}
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <IdCard className="w-5 h-5 text-teal-600" />
            توزيع صور البطاقات الشخصية
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground space-y-1">
            <span>قم برفع صور البطاقات الشخصية للعملاء:</span>
            <ul className="list-disc list-inside text-xs space-y-0.5 mt-1 mr-2">
              <li>يستخدم النظام OCR متقدم مع دعم للصور غير الواضحة</li>
              <li>إذا استغرت المعالجة وقتاً طويلاً، سيتم التحويل التلقائي لطريقة بديلة</li>
              <li>يتم معالجة صورتين في كل مرة لضمان الجودة</li>
              <li>يدعم القراءة باللغتين العربية والإنجليزية</li>
              <li>سيتم استخراج: رقم البطاقة، الاسم (EN/AR)، الجنسية، تاريخ الميلاد، انتهاء البطاقة</li>
              <li>سيتم حفظ صورة البطاقة في ملفات العميل</li>
            </ul>
            <div className="flex items-center gap-1 text-blue-600 mt-2">
              <Database className="w-3 h-3" />
              <span className="text-xs font-medium">OCR عبر Supabase Edge Function + Tesseract Fallback</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* منطقة السحب والإفلات */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
              isDragActive
                ? "border-teal-500 bg-teal-50 scale-[1.02] shadow-lg"
                : "border-slate-200 bg-slate-50/50 hover:border-teal-400 hover:bg-teal-50/50"
            )}
          >
            <input {...getInputProps()} />
            <motion.div
              animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Upload className={cn(
                "w-10 h-10 mx-auto mb-3 transition-colors",
                isDragActive ? "text-teal-600" : "text-slate-400"
              )} />
            </motion.div>
            {isDragActive ? (
              <p className="text-sm font-medium text-teal-700">
                أفلت الملفات هنا...
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">
                  اسحب وأفلت صور البطاقات الشخصية هنا
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  أو اضغط لاختيار الملفات (PNG, JPG, JPEG)
                </p>
              </>
            )}
          </div>

          {/* شريط الإحصائيات */}
          {files.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 md:gap-4 p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium">{stats.total} ملف</span>
              </div>
              {stats.matched > 0 && (
                <Badge className="bg-green-100 text-green-700">
                  <Check className="w-3 h-3 ml-1" />
                  {stats.matched} مطابق
                </Badge>
              )}
              {stats.withData > 0 && (
                <Badge className="bg-blue-100 text-blue-700">
                  <Database className="w-3 h-3 ml-1" />
                  {stats.withData} بيانات
                </Badge>
              )}
              {stats.notFound > 0 && (
                <Badge className="bg-amber-100 text-amber-700">
                  <AlertTriangle className="w-3 h-3 ml-1" />
                  {stats.notFound} غير موجود
                </Badge>
              )}
              {stats.uploaded > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  <FileCheck className="w-3 h-3 ml-1" />
                  {stats.uploaded} تم رفعه
                </Badge>
              )}
              {stats.dataUpdated > 0 && (
                <Badge className="bg-purple-100 text-purple-700">
                  <Settings className="w-3 h-3 ml-1" />
                  {stats.dataUpdated} تم تحديثه
                </Badge>
              )}
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFiles}
                className="text-slate-500 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4 ml-1" />
                مسح الكل
              </Button>
            </div>
          )}

          {/* Enhanced Batch Progress Section */}
          {(isProcessing || processingCompleted || batchProgress.total > 0) && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              {/* Main Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">
                    {isProcessing && isPaused ? 'تم الإيقاف المؤقت' : isProcessing ? 'جاري المعالجة...' : processingCompleted ? 'اكتملت المعالجة' : 'التقدم'}
                  </span>
                  <span className="text-teal-600 font-bold">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>

              {/* Batch Statistics */}
              {batchProgress.total > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-2 rounded-lg border">
                    <div className="text-lg font-bold text-slate-700">{batchProgress.processed}/{batchProgress.total}</div>
                    <div className="text-xs text-slate-500">تمت المعالجة</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                    <div className="text-lg font-bold text-green-600">{batchProgress.successful}</div>
                    <div className="text-xs text-green-700">ناجح</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                    <div className="text-lg font-bold text-red-600">{batchProgress.failed}</div>
                    <div className="text-xs text-red-700">فاشل</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                    <div className="text-lg font-bold text-blue-600">{batchProgress.pending}</div>
                    <div className="text-xs text-blue-700">في الانتظار</div>
                  </div>
                </div>
              )}

              {/* Current Chunk Info */}
              {isProcessing && batchProgress.totalChunks > 0 && (
                <div className="text-center text-sm text-slate-600 bg-blue-50 py-2 px-4 rounded-lg">
                  معالجة المجموعة {batchProgress.currentChunk} من {batchProgress.totalChunks}
                  ({batchProgress.inProgress > 0 ? `${batchProgress.inProgress} ملف جاري المعالجة` : 'انتظار...'})
                </div>
              )}

              {/* Control Buttons */}
              {isProcessing && (
                <div className="flex items-center justify-center gap-2">
                  {!isPaused ? (
                    <>
                      <Button
                        onClick={pauseProcessing}
                        disabled={isPaused || isStopped}
                        variant="outline"
                        className="gap-2"
                      >
                        <Pause className="w-4 h-4" />
                        إيقاف مؤقت
                      </Button>
                      <Button
                        onClick={stopProcessing}
                        variant="destructive"
                        className="gap-2"
                      >
                        <Square className="w-4 h-4" />
                        إيقاف
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={resumeProcessing}
                        className="bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <Play className="w-4 h-4" />
                        استئناف
                      </Button>
                      <Button
                        onClick={stopProcessing}
                        variant="destructive"
                        className="gap-2"
                      >
                        <Square className="w-4 h-4" />
                        إيقاف
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Processing Complete Summary */}
              {processingCompleted && !isProcessing && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-bold text-green-800 mb-2 text-center text-lg">اكتملت المعالجة!</h3>
                  <div className="grid grid-cols-2 gap-3 text-center mb-3">
                    <div className="bg-white p-2 rounded">
                      <div className="text-2xl font-bold text-green-600">{batchProgress.successful}</div>
                      <div className="text-xs text-green-700">ملف ناجح</div>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <div className="text-2xl font-bold text-red-600">{batchProgress.failed}</div>
                      <div className="text-xs text-red-700">ملف فاشل</div>
                    </div>
                  </div>
                  {batchProgress.failed > 0 && (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={retryFailedFiles}
                        className="bg-amber-600 hover:bg-amber-700 gap-2 w-full"
                      >
                        <RefreshCw className="w-4 h-4" />
                        إعادة المحاولة للملفات الفاشلة ({batchProgress.failed})
                      </Button>
                      <Button
                        onClick={exportErrorReport}
                        variant="outline"
                        className="gap-2 w-full"
                      >
                        <Download className="w-4 h-4" />
                        تصدير تقرير الأخطاء
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* قائمة الملفات */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-600 px-1">
                <span>عرض {Math.min(visibleFileCount, files.length)} من {files.length} ملف</span>
                {files.length > visibleFileCount && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleFileCount(prev => prev + 50)}
                    className="text-teal-600 hover:text-teal-700"
                  >
                    <MoreHorizontal className="w-4 h-4 ml-1" />
                    عرض المزيد
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[300px] rounded-xl border border-slate-200">
                <div className="p-3 space-y-2">
                  <AnimatePresence>
                    {files.slice(0, visibleFileCount).map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        file.status === 'matched' && "bg-green-50 border-green-200",
                        file.status === 'uploaded' && "bg-emerald-50 border-emerald-200",
                        file.status === 'not_found' && "bg-amber-50 border-amber-200",
                        file.status === 'error' && "bg-red-50 border-red-200",
                        file.status === 'scanning' && "bg-blue-50 border-blue-200",
                        file.status === 'pending' && "bg-white border-slate-200"
                      )}
                    >
                      {/* معاينة الصورة */}
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                        <img
                          src={file.preview}
                          alt="معاينة"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* معلومات الملف */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {file.file.name}
                        </p>
                        {file.matchedCustomer ? (
                          <div className="space-y-1 mt-1">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-700 font-medium">
                                {file.matchedCustomer.first_name} {file.matchedCustomer.last_name}
                              </span>
                              <span className="text-xs text-slate-500">
                                ({file.matchedCustomer.phone})
                              </span>
                            </div>
                            {file.extractedData && (
                              <ExtractedDataPreview data={file.extractedData} dataUpdated={file.dataUpdated} />
                            )}
                          </div>
                        ) : file.extractedNumber ? (
                          <div className="space-y-1 mt-1">
                            <p className="text-xs text-amber-600">
                              رقم مستخرج: {file.extractedNumber}
                            </p>
                            {file.extractedData && (
                              <ExtractedDataPreview data={file.extractedData} />
                            )}
                          </div>
                        ) : file.error ? (
                          <p className="text-xs text-red-600 mt-1">{file.error}</p>
                        ) : null}

                        {/* إدخال رقم البطاقة يدوياً */}
                        {(file.status === 'not_found' || file.status === 'error') && (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs text-amber-700 mb-2 flex items-center gap-1">
                              <Edit3 className="w-3 h-3" />
                              أدخل رقم البطاقة يدوياً للمطابقة:
                            </p>
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                placeholder="مثال: 29078801030"
                                value={editingFileId === file.id ? manualNationalId : ''}
                                onChange={(e) => {
                                  setEditingFileId(file.id);
                                  setManualNationalId(e.target.value);
                                }}
                                onFocus={() => {
                                  setEditingFileId(file.id);
                                  if (!manualNationalId) {
                                    setManualNationalId(file.extractedNumber || '');
                                  }
                                }}
                                className="h-8 text-sm flex-1 bg-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleManualIdEntry(file.id);
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleManualIdEntry(file.id)}
                                disabled={editingFileId !== file.id || !manualNationalId.trim()}
                                className="h-8 bg-teal-600 hover:bg-teal-700"
                              >
                                <Check className="w-4 h-4 ml-1" />
                                مطابقة
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* عرض النص المستخرج */}
                        {showDebugText === file.id && file.extractedText && (
                          <div className="mt-2 p-2 bg-slate-800 text-slate-100 rounded text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                            <div className="text-slate-400 mb-1">النص المستخرج من OCR:</div>
                            <pre className="whitespace-pre-wrap break-words">{file.extractedText}</pre>
                          </div>
                        )}
                      </div>

                      {/* الحالة والإجراءات */}
                      <div className="flex items-center gap-1">
                        {getStatusBadge(file)}

                        {file.extractedText && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDebugText(
                              showDebugText === file.id ? null : file.id
                            )}
                            className="h-8 w-8 text-slate-400 hover:text-blue-500"
                            title="عرض النص المستخرج"
                          >
                            {showDebugText === file.id ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        )}

                        {file.status !== 'uploaded' && file.status !== 'scanning' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(file.id)}
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
            </div>
          )}

          {/* رسالة عدم وجود ملفات */}
          {files.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <IdCard className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">لم يتم رفع أي ملفات بعد</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={handleClose}>
            إغلاق
          </Button>

          {stats.pending > 0 && !isProcessing && (
            <Button
              onClick={processAllFilesInChunks}
              disabled={isProcessing || isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <ScanSearch className="w-4 h-4" />
              بدء المعالجة ({stats.pending})
            </Button>
          )}

          {stats.matched > 0 && (
            <Button
              onClick={uploadMatchedFiles}
              disabled={isProcessing || isUploading}
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الرفع والتحديث...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  رفع وتحديث ({stats.matched})
                  {stats.withData > 0 && (
                    <span className="text-xs opacity-80">
                      + {stats.withData} بيانات
                    </span>
                  )}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default CustomerDocumentDistributionDialog;
