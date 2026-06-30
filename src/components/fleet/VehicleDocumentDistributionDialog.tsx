/**
 * مكون توزيع المستندات على المركبات
 * يقوم بقراءة رقم اللوحة من صور الاستمارات وتوزيعها على المركبات المناسبة
 * مع معالجة متزامنة محسّنة وإمكانية الاستئناف
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Car,
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
  Pause,
  Play,
  SkipForward,
  RotateCcw,
  Download,
  MoreHorizontal,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Tesseract from 'tesseract.js';

import type {
  ExtractedVehicleData,
  MatchCandidate,
  UploadedFile,
  ProcessingState,
  ProcessingStatus,
} from './vehicle-document-distribution';
import {
  extractWithVehicleOCR,
  ProcessingQueueManager,
  saveProcessingState,
  loadProcessingState,
  clearProcessingState,
} from './vehicle-document-distribution';

interface VehicleDocumentDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

enum ProcessingError {
  OCR_FAILED = 'ocr_failed',
  NO_ID_FOUND = 'no_id_found',
  VEHICLE_NOT_FOUND = 'not_found',
  UPLOAD_FAILED = 'upload_failed',
  UPDATE_FAILED = 'update_failed',
  NETWORK_ERROR = 'network_error',
}

const AUTO_MATCH_MIN_CONFIDENCE = 80;
const DATA_UPDATE_MIN_CONFIDENCE = 90;

// ==================== Helper Functions ====================
const normalizeVehicleNumber = (number: string): string => {
  const digitsOnly = number.replace(/\D/g, '');
  const normalized = digitsOnly.replace(/^0+/, '');
  return normalized || '0';
};

const addMatchCandidate = (
  candidates: Map<string, MatchCandidate>,
  number: string | undefined,
  confidence: number,
  source: MatchCandidate['source'],
  reason: string
): void => {
  if (!number) return;

  const digits = number.replace(/\D/g, '');
  if (digits.length < 3 || digits.length > 8) return;

  const normalizedNumber = normalizeVehicleNumber(digits);
  const existing = candidates.get(normalizedNumber);
  if (!existing || confidence > existing.confidence) {
    candidates.set(normalizedNumber, {
      number: digits,
      normalizedNumber,
      confidence,
      source,
      reason,
    });
  }
};

const buildMatchCandidates = (
  text: string,
  serverData: ExtractedVehicleData,
  localData: ExtractedVehicleData,
  extractedNumbers: string[]
): MatchCandidate[] => {
  const candidates = new Map<string, MatchCandidate>();
  const cleanText = text.replace(/[â€â€Ž]/g, '').replace(/\s+/g, ' ').trim();

  addMatchCandidate(candidates, serverData.plateNumber, 96, 'server', 'تم استخراج رقم اللوحة من OCR الخادم');
  addMatchCandidate(candidates, localData.plateNumber, 90, 'labeled_text', 'تم العثور على رقم بجانب تسمية اللوحة');

  const labeledPatterns = [
    /vehicle\s*n[o0]\.?\s*[:\.]?\s*(\d{3,8})/gi,
    /veh(?:icle)?\s*n[o0]\.?\s*(\d{3,8})/gi,
    /vehicle[^0-9]*(\d{4,8})/gi,
    /رقم\s*اللوح[ةه]\s*[:\.]?\s*(\d{3,8})/g,
    /اللوح[ةه]\s*[:\.]?\s*(\d{3,8})/g,
  ];
  for (const pattern of labeledPatterns) {
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      addMatchCandidate(candidates, match[1], 88, 'labeled_text', 'رقم مرتبط بتسمية اللوحة في النص');
    }
  }

  const barcodePatterns = [/\*\s*([\d\s]{5,20})\s*\*/g, /\*\s*(\d[\d\s]*\d)\s*\*/g];
  for (const pattern of barcodePatterns) {
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      addMatchCandidate(candidates, match[1].replace(/\s/g, ''), 84, 'barcode', 'رقم مستخرج من نمط باركود الاستمارة');
    }
  }

  const spacedDigitsPattern = /(\d\s+\d\s+\d\s+\d(?:\s+\d)*)/g;
  let spacedMatch;
  while ((spacedMatch = spacedDigitsPattern.exec(cleanText)) !== null) {
    addMatchCandidate(candidates, spacedMatch[1].replace(/\s/g, ''), 72, 'spaced_digits', 'رقم متباعد قد يكون لوحة');
  }

  for (const number of extractedNumbers) {
    addMatchCandidate(candidates, number, 55, 'general_number', 'رقم عام مستخرج من النص ويحتاج تأكيد');
  }

  return Array.from(candidates.values()).sort((a, b) => b.confidence - a.confidence);
};

const extractVehicleNumbers = (text: string): string[] => {
  const numbers: string[] = [];
  let match;

  const cleanText = text
    .replace(/[‏‎]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const vehicleNoPatterns = [
    /vehicle\s*no\.?\s*[:\.]?\s*(\d{3,8})/gi,
    /vehicle\s*n[o0]\.?\s*[:\.]?\s*(\d{3,8})/gi,
    /veh(?:icle)?\s*n[o0]\.?\s*(\d{3,8})/gi,
    /vehicle[^0-9]*(\d{4,8})/gi,
  ];

  for (const pattern of vehicleNoPatterns) {
    while ((match = pattern.exec(cleanText)) !== null) {
      if (!numbers.includes(match[1])) {
        numbers.push(match[1]);
      }
    }
  }

  const arabicPatterns = [
    /رقم\s*اللوح[ةه]\s*[:\.]?\s*(\d{3,8})/g,
    /اللوح[ةه]\s*[:\.]?\s*(\d{3,8})/g,
  ];

  for (const pattern of arabicPatterns) {
    while ((match = pattern.exec(cleanText)) !== null) {
      if (!numbers.includes(match[1])) {
        numbers.push(match[1]);
      }
    }
  }

  const barcodePatterns = [
    /\*\s*([\d\s]{5,20})\s*\*/g,
    /\*\s*(\d[\d\s]*\d)\s*\*/g,
  ];
  for (const pattern of barcodePatterns) {
    while ((match = pattern.exec(cleanText)) !== null) {
      const digits = match[1].replace(/\s/g, '');
      if (digits.length >= 4 && digits.length <= 8 && !numbers.includes(digits)) {
        numbers.push(digits);
      }
    }
  }

  const spacedDigitsPattern = /(\d\s+\d\s+\d\s+\d(?:\s+\d)*)/g;
  while ((match = spacedDigitsPattern.exec(cleanText)) !== null) {
    const digits = match[1].replace(/\s/g, '');
    if (digits.length >= 4 && digits.length <= 8 && !numbers.includes(digits)) {
      numbers.push(digits);
    }
  }

  const qatarPlatePattern = /\b(0{1,3}\d{3,6})\b/g;
  while ((match = qatarPlatePattern.exec(cleanText)) !== null) {
    const num = match[1];
    if (!numbers.includes(num) && num.length >= 4 && num.length <= 8) {
      numbers.push(num);
    }
  }

  const generalNumberPattern = /(?<!\d)(\d{5,8})(?!\d)/g;
  while ((match = generalNumberPattern.exec(cleanText)) !== null) {
    const num = match[1];
    const isYear = /^(19|20)\d{2}$/.test(num);
    const isDate = /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(num);
    if (!numbers.includes(num) && !isYear && !isDate) {
      numbers.push(num);
    }
  }

  const afterVehiclePattern = /vehicle[^\d]*?(\d+)/gi;
  while ((match = afterVehiclePattern.exec(cleanText)) !== null) {
    const num = match[1];
    if (!numbers.includes(num) && num.length >= 4 && num.length <= 8) {
      numbers.push(num);
    }
  }

  return numbers;
};

const extractAllVehicleData = (text: string): ExtractedVehicleData => {
  const data: ExtractedVehicleData = {};
  const cleanText = text.replace(/\s+/g, ' ').trim();

  const platePatterns = [
    /vehicle\s*n[o0]\.?\s*[:\.]?\s*(\d{3,8})/i,
    /veh(?:icle)?\s*n[o0]\.?\s*(\d{3,8})/i,
    /رقم\s*اللوح[ةه]\s*[:\.]?\s*(\d{3,8})/,
    /\*\s*([\d\s]{5,15})\s*\*/,
  ];
  for (const pattern of platePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const plateNum = match[1].replace(/\s/g, '');
      if (plateNum.length >= 4) {
        data.plateNumber = plateNum;
        data.normalizedPlateNumber = normalizeVehicleNumber(plateNum);
        break;
      }
    }
  }

  const vinPatterns = [
    /chassis\s*n[o0]\.?\s*[:\.]?\s*([A-Z0-9]{15,17})/i,
    /رقم\s*القاعد[ةه]\s*[:\.]?\s*([A-Z0-9]{15,17})/i,
    /vin\s*[:\.]?\s*([A-Z0-9]{15,17})/i,
    /([A-Z][A-Z0-9]{15,16})/i,
  ];
  for (const pattern of vinPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const vin = match[1].replace(/\s/g, '').toUpperCase();
      if (vin.length >= 15 && /[A-Z]/.test(vin) && /\d/.test(vin)) {
        data.vin = vin;
        break;
      }
    }
  }

  const enginePatterns = [
    /engine\s*n[o0]\.?\s*[:\.]?\s*([A-Z0-9]{4,15})/i,
    /رقم\s*المحرك\s*[:\.]?\s*([A-Z0-9]{4,15})/i,
    /(?:engine|محرك)[:\s]+([A-Z]?\d{4,10})/i,
  ];
  for (const pattern of enginePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.engineNumber = match[1].replace(/\s/g, '').toUpperCase();
      break;
    }
  }

  const yearPatterns = [
    /سن[ةه]\s*الصنع\s*[:\.]?\s*(\d{4})/,
    /year\s*[:\.]?\s*(\d{4})/i,
    /model\s*year\s*[:\.]?\s*(\d{4})/i,
    /(\d{4})\s*سن[ةه]\s*الصنع/,
  ];
  for (const pattern of yearPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const year = parseInt(match[1]);
      if (year >= 1990 && year <= new Date().getFullYear() + 1) {
        data.year = year;
        break;
      }
    }
  }

  const modelPatterns = [
    /الطراز\s*[:\.]?\s*([A-Z0-9\-]+)/i,
    /model\s*[:\.]?\s*([A-Z0-9\-]+)/i,
    /([A-Z]{2,3}\d{1,2})/i,
  ];
  for (const pattern of modelPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const model = match[1].trim().toUpperCase();
      if (model.length >= 2 && model.length <= 20) {
        data.model = model;
        break;
      }
    }
  }

  const knownMakes = [
    'تويوتا', 'نيسان', 'هوندا', 'مازدا', 'ميتسوبيشي', 'سوزوكي', 'لكزس', 'إنفينيتي',
    'هيونداي', 'كيا', 'جينيسيس', 'فورد', 'شيفروليه', 'جي ام سي', 'دودج', 'جيب', 'كرايسلر',
    'مرسيدس', 'بي ام دبليو', 'أودي', 'فولكس واجن', 'بورش', 'لاند روفر', 'جاكوار', 'رينج روفر',
    'جي ايه سي', 'جيلي', 'شيري', 'ام جي', 'بي واي دي', 'جريت وول', 'هافال', 'چانجان',
    'TOYOTA', 'NISSAN', 'HONDA', 'MAZDA', 'MITSUBISHI', 'SUZUKI', 'LEXUS', 'INFINITI',
    'HYUNDAI', 'KIA', 'GENESIS', 'FORD', 'CHEVROLET', 'GMC', 'DODGE', 'JEEP', 'CHRYSLER',
    'MERCEDES', 'BMW', 'AUDI', 'VOLKSWAGEN', 'PORSCHE', 'LAND ROVER', 'JAGUAR', 'RANGE ROVER',
    'GAC', 'GEELY', 'CHERY', 'MG', 'BYD', 'GREAT WALL', 'HAVAL', 'CHANGAN',
    'جي ايه سي موتور', 'GAC MOTOR'
  ];

  for (const make of knownMakes) {
    if (cleanText.includes(make)) {
      data.make = make;
      break;
    }
  }

  const arabicColors: Record<string, string> = {
    'بني': 'بني', 'brown': 'بني',
    'ابيض': 'أبيض', 'أبيض': 'أبيض', 'white': 'أبيض',
    'اسود': 'أسود', 'أسود': 'أسود', 'black': 'أسود',
    'فضي': 'فضي', 'silver': 'فضي',
    'رمادي': 'رمادي', 'grey': 'رمادي', 'gray': 'رمادي',
    'احمر': 'أحمر', 'أحمر': 'أحمر', 'red': 'أحمر',
    'ازرق': 'أزرق', 'أزرق': 'أزرق', 'blue': 'أزرق',
    'اخضر': 'أخضر', 'أخضر': 'أخضر', 'green': 'أخضر',
    'ذهبي': 'ذهبي', 'gold': 'ذهبي',
    'برتقالي': 'برتقالي', 'orange': 'برتقالي',
    'بيج': 'بيج', 'beige': 'بيج',
  };

  for (const [key, value] of Object.entries(arabicColors)) {
    if (cleanText.toLowerCase().includes(key.toLowerCase())) {
      data.color = value;
      break;
    }
  }

  const seatsPatterns = [
    /المقاعد\s*[:\.]?\s*0*(\d{1,2})/,
    /seats?\s*[:\.]?\s*0*(\d{1,2})/i,
    /seating\s*(?:capacity)?\s*[:\.]?\s*0*(\d{1,2})/i,
    /0{0,2}(\d{1,2})\s*مقاعد/,
  ];
  for (const pattern of seatsPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const seats = parseInt(match[1]);
      if (seats >= 2 && seats <= 50) {
        data.seatingCapacity = seats;
        break;
      }
    }
  }

  const datePattern = /(\d{4})[-/](\d{2})[-/](\d{2})/g;
  const dates: string[] = [];
  let dateMatch;
  while ((dateMatch = datePattern.exec(cleanText)) !== null) {
    dates.push(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
  }

  if (cleanText.includes('انتهاء') || cleanText.includes('Exp')) {
    const expiryMatch = cleanText.match(/(?:exp\.?\s*date|انتهاء\s*الترخيص)[:\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i);
    if (expiryMatch) {
      data.registrationExpiry = parseDate(expiryMatch[1]);
    }
  }

  if (cleanText.includes('Reg') || cleanText.includes('تسجيل')) {
    const regMatch = cleanText.match(/(?:reg\.?\s*date|تاريخ\s*(?:أول\s*)?تسجيل)[:\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i);
    if (regMatch) {
      data.registrationDate = parseDate(regMatch[1]);
    }
  }

  if (cleanText.includes('انتهاء التأمين') || cleanText.includes('insurance')) {
    const insMatch = cleanText.match(/(?:انتهاء\s*التأمين|insurance\s*expiry)[:\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i);
    if (insMatch) {
      data.insuranceExpiry = parseDate(insMatch[1]);
    }
  }

  if (dates.length > 0 && !data.registrationExpiry) {
    data.registrationExpiry = dates[dates.length - 1];
  }

  return data;
};

const parseDate = (dateStr: string): string | undefined => {
  try {
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return undefined;

    let year: number, month: number, day: number;

    if (parts[0].length === 4) {
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
    } else {
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

// ==================== Components ====================
const ExtractedDataPreview: React.FC<{ data: ExtractedVehicleData; dataUpdated?: boolean }> = ({ data, dataUpdated }) => {
  const fields = [
    { label: 'رقم الهيكل', value: data.vin },
    { label: 'رقم المحرك', value: data.engineNumber },
    { label: 'الشركة', value: data.make },
    { label: 'الطراز', value: data.model },
    { label: 'السنة', value: data.year?.toString() },
    { label: 'اللون', value: data.color },
    { label: 'المقاعد', value: data.seatingCapacity?.toString() },
    { label: 'انتهاء الترخيص', value: data.registrationExpiry },
    { label: 'انتهاء التأمين', value: data.insuranceExpiry },
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex items-center gap-1">
            <span className="text-slate-500">{label}:</span>
            <span className="font-medium text-slate-700 truncate" title={value}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}ثانية`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}د ${secs}ث`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}س ${minutes}د`;
  }
};

// ==================== Main Dialog Component ====================
const VehicleDocumentDistributionDialog: React.FC<VehicleDocumentDistributionDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const dialogId = useRef(`dialog-${Date.now()}`);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [showDebugText, setShowDebugText] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [manualPlateNumber, setManualPlateNumber] = useState('');
  const [queueManager] = useState(() => new ProcessingQueueManager());
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [hasResumeState, setHasResumeState] = useState(false);
  const [showRetryFailed, setShowRetryFailed] = useState(false);
  const [visibleFileCount, setVisibleFileCount] = useState(50);
  const [activeTab, setActiveTab] = useState<'all' | 'matched' | 'failed'>('all');

  // جلب جميع المركبات
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-for-matching', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model')
        .eq('company_id', companyId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!companyId,
  });

  // خريطة المركبات للمطابقة السريعة
  const vehicleMap = React.useMemo(() => {
    const map = new Map<string, typeof vehicles[0]>();
    vehicles.forEach(vehicle => {
      if (vehicle.plate_number) {
        map.set(vehicle.plate_number, vehicle);
        const normalized = normalizeVehicleNumber(vehicle.plate_number);
        map.set(normalized, vehicle);
      }
    });
    return map;
  }, [vehicles]);

  // التحقق من حالة الاستئناف عند فتح الحوار
  useEffect(() => {
    if (open) {
      const savedState = loadProcessingState(dialogId.current);
      if (savedState && savedState.completedFileIds.length > 0) {
        setHasResumeState(true);
        console.log('📂 Found resume state:', savedState);
      }
    }
  }, [open]);

  // مطابقة المركبة
  const findMatchingVehicle = useCallback((candidates: MatchCandidate[]) => {
    for (const candidate of candidates) {
      const num = candidate.number;
      const normalized = candidate.normalizedNumber;

      if (vehicleMap.has(num)) {
        return { vehicle: vehicleMap.get(num)!, candidate };
      }

      if (vehicleMap.has(normalized)) {
        return { vehicle: vehicleMap.get(normalized)!, candidate };
      }

      for (const vehicle of vehicles) {
        if (vehicle.plate_number) {
          const vehicleNormalized = normalizeVehicleNumber(vehicle.plate_number);
          if (vehicleNormalized === normalized) {
            return { vehicle, candidate };
          }
        }
      }
    }
    return null;
  }, [vehicleMap, vehicles]);

  // معالجة صورة واحدة
  const processImage = useCallback(async (uploadedFile: UploadedFile, signal?: AbortSignal): Promise<UploadedFile> => {
    try {
      setFiles(prev => prev.map(f =>
        f.id === uploadedFile.id ? { ...f, status: 'scanning' as const, progress: 0 } : f
      ));

      let extractedText = '';
      let extractedNumbers: string[] = [];
      let ocrMethod = 'tesseract';
      let serverExtractedData: ExtractedVehicleData = {};

      const updateProgress = (progress: number) => {
        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id ? { ...f, progress } : f
        ));
      };

      // Method 1: Google Cloud Vision (30s timeout, then fallback)
      try {
        console.log('🔍 Trying Google Cloud Vision (30s timeout)...');
        updateProgress(20);

        const ocrResult = await extractWithVehicleOCR(uploadedFile.file, signal);

        if (ocrResult.success && ocrResult.rawText) {
          extractedText = ocrResult.rawText;
          serverExtractedData = ocrResult.extractedData;
          ocrMethod = 'google-vision';

          console.log('✅ Google Vision result:', extractedText.substring(0, 300));

          if (serverExtractedData.plateNumber) {
            extractedNumbers = [serverExtractedData.plateNumber];
          } else {
            extractedNumbers = extractVehicleNumbers(extractedText);
          }

          updateProgress(90);
        } else {
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
          console.warn('⚠️ Google Cloud Vision failed:', error.message);
        }

        // Method 2: Tesseract.js (immediate fallback)
        console.log('📝 Using Tesseract.js fallback...');
        ocrMethod = 'tesseract';
        updateProgress(40);

        const result = await Tesseract.recognize(uploadedFile.file, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              updateProgress(40 + Math.round(m.progress * 50));
            }
          },
        });

        extractedText = result.data.text;
        extractedNumbers = extractVehicleNumbers(extractedText);
        console.log('📝 Tesseract result:', extractedText.substring(0, 200));
      }

      updateProgress(100);

      const fullText = extractedText;
      const localExtractedData = extractAllVehicleData(fullText);
      const extractedData: ExtractedVehicleData = {
        ...localExtractedData,
        ...serverExtractedData,
      };

      if (!extractedData.plateNumber && extractedNumbers.length > 0) {
        extractedData.plateNumber = extractedNumbers[0];
        extractedData.normalizedPlateNumber = normalizeVehicleNumber(extractedNumbers[0]);
      }

      if (!extractedData.plateNumber && extractedNumbers.length === 0) {
        const anyNumber = fullText.match(/\d{4,8}/);
        if (anyNumber) {
          extractedData.plateNumber = anyNumber[0];
          extractedData.normalizedPlateNumber = normalizeVehicleNumber(anyNumber[0]);
          extractedNumbers.push(anyNumber[0]);
        }
      }

      if (!extractedData.plateNumber && extractedNumbers.length === 0) {
        const textPreview = fullText.substring(0, 500).replace(/\s+/g, ' ');
        return {
          ...uploadedFile,
          status: 'not_found',
          extractedData,
          extractedText: textPreview,
          error: `لم يتم العثور على رقم لوحة تلقائياً. يرجى إدخال الرقم يدوياً.`,
        };
      }

      const candidates = buildMatchCandidates(fullText, serverExtractedData, localExtractedData, extractedNumbers);
      const bestCandidate = candidates[0];
      const match = findMatchingVehicle(candidates);

      if (match && match.candidate.confidence >= AUTO_MATCH_MIN_CONFIDENCE) {
        return {
          ...uploadedFile,
          status: 'matched',
          extractedNumber: match.candidate.number,
          normalizedNumber: match.candidate.normalizedNumber,
          matchConfidence: match.candidate.confidence,
          matchReason: match.candidate.reason,
          matchCandidates: candidates,
          extractedData,
          extractedText: fullText.substring(0, 500),
          matchedVehicle: match.vehicle,
        };
      } else {
        return {
          ...uploadedFile,
          status: 'not_found',
          extractedNumber: bestCandidate?.number || extractedData.plateNumber || extractedNumbers[0],
          normalizedNumber: bestCandidate?.normalizedNumber || extractedData.normalizedPlateNumber || (extractedNumbers[0] ? normalizeVehicleNumber(extractedNumbers[0]) : undefined),
          matchConfidence: bestCandidate?.confidence,
          matchReason: match
            ? `مطابقة محتملة بثقة ${match.candidate.confidence}%: ${match.candidate.reason}`
            : bestCandidate?.reason,
          matchCandidates: candidates,
          extractedData,
          extractedText: fullText.substring(0, 500),
          error: match
            ? `تم العثور على مركبة محتملة للرقم ${match.candidate.number} لكن الثقة ${match.candidate.confidence}% وتحتاج مراجعة يدوية.`
            : `لم يتم العثور على مركبة بالرقم: ${bestCandidate?.number || extractedData.plateNumber || extractedNumbers[0]}`,
        };
      }
    } catch (error: any) {
      return {
        ...uploadedFile,
        status: 'error',
        error: error.message || 'فشل في قراءة الصورة',
      };
    }
  }, [findMatchingVehicle]);

  // تحديث بيانات المركبة
  const updateVehicleData = async (vehicleId: string, data: ExtractedVehicleData): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};

      const { data: currentVehicle, error: currentVehicleError } = await supabase
        .from('vehicles')
        .select('vin, engine_number, make, model, year, color, seating_capacity')
        .eq('id', vehicleId)
        .maybeSingle();

      if (currentVehicleError) throw currentVehicleError;

      const isBlank = (value: unknown) => value === null || value === undefined || value === '';

      if (data.vin && isBlank(currentVehicle?.vin)) updateData.vin = data.vin;
      if (data.engineNumber && isBlank(currentVehicle?.engine_number)) updateData.engine_number = data.engineNumber;
      if (data.make && isBlank(currentVehicle?.make)) updateData.make = data.make;
      if (data.model && isBlank(currentVehicle?.model)) updateData.model = data.model;
      if (data.year && isBlank(currentVehicle?.year)) updateData.year = data.year;
      if (data.color && isBlank(currentVehicle?.color)) updateData.color = data.color;
      if (data.seatingCapacity && isBlank(currentVehicle?.seating_capacity)) updateData.seating_capacity = data.seatingCapacity;
      if (data.registrationDate) updateData.registration_date = data.registrationDate;
      if (data.registrationExpiry) updateData.registration_expiry = data.registrationExpiry;
      if (data.insuranceExpiry) updateData.insurance_expiry = data.insuranceExpiry;

      if (Object.keys(updateData).length === 0) {
        return false;
      }

      const { error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', vehicleId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['vehicle-details', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      return true;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      return false;
    }
  };

  // رفع الملفات المطابقة
  const uploadMatchedFiles = async () => {
    setIsUploading(true);
    const matchedFiles = files.filter(f => f.status === 'matched' && f.matchedVehicle);
    let successCount = 0;
    let errorCount = 0;
    let dataUpdatedCount = 0;
    const updatedVehicleIds = new Set<string>();

    for (const file of matchedFiles) {
      try {
        // 2. Upload to storage with unique name to prevent overwrites
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const fileExt = file.file.name.split('.').pop();
        const fileName = `vehicle-documents/${file.matchedVehicle!.id}/${timestamp}_${randomId}_registration.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // 3. Insert to database with unique document name
        const uniqueDocumentName = `استمارة المركبة - ${file.matchedVehicle!.plate_number} - ${timestamp}`;
        const { error: deactivateError } = await supabase
          .from('vehicle_documents')
          .update({ is_active: false })
          .eq('vehicle_id', file.matchedVehicle!.id)
          .eq('document_type', 'registration')
          .eq('is_active', true);

        if (deactivateError) throw deactivateError;

        const { error: dbError } = await supabase
          .from('vehicle_documents')
          .insert({
            vehicle_id: file.matchedVehicle!.id,
            document_type: 'registration',
            document_name: uniqueDocumentName,
            document_url: fileName,
            is_active: true,
          });

        if (dbError) throw dbError;

        let dataUpdated = false;
        if (file.extractedData && (file.matchConfidence || 0) >= DATA_UPDATE_MIN_CONFIDENCE) {
          dataUpdated = await updateVehicleData(file.matchedVehicle!.id, file.extractedData);
          if (dataUpdated) dataUpdatedCount++;
        }

        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'uploaded' as const, dataUpdated } : f
        ));

        successCount++;
        updatedVehicleIds.add(file.matchedVehicle!.id);
      } catch (error: any) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'error' as const, error: error.message } : f
        ));
        errorCount++;
      }
    }

    // Batch invalidate all queries at the end to avoid race conditions
    for (const vehicleId of updatedVehicleIds) {
      queryClient.invalidateQueries({
        queryKey: ['vehicle-document-files', vehicleId]
      });
    }
    // Also invalidate the general vehicles list
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });

    setIsUploading(false);

    if (successCount > 0) {
      const msg = dataUpdatedCount > 0
        ? `تم رفع ${successCount} استمارة وتحديث بيانات ${dataUpdatedCount} مركبة`
        : `تم رفع ${successCount} استمارة بنجاح`;
      toast.success(msg);
    }
    if (errorCount > 0) {
      toast.error(`فشل رفع ${errorCount} استمارة`);
    }
  };

  // بدء معالجة جميع الملفات
  const processAllFiles = async () => {
    const savedState = loadProcessingState(dialogId.current);
    queueManager.loadResumeState(savedState);
    queueManager.setFiles(files);

    // إعداد callbacks
    queueManager.options = {
      onProgress: (completed, total) => {
        setOverallProgress(Math.round((completed / total) * 100));
      },
      onFileComplete: (file) => {
        setFiles(prev => prev.map(f => f.id === file.id ? file : f));
      },
      onFileError: (file, error) => {
        setFiles(prev => prev.map(f => f.id === file.id ? file : f));
      },
      onChunkComplete: (chunkIndex, completed, total) => {
        console.log(`📦 Chunk ${chunkIndex} completed: ${completed}/${total}`);
        // تحديث الوقت المتبقي
        setEstimatedTime(queueManager.getEstimatedTimeRemaining());
      },
      onSaveState: (state) => {
        saveProcessingState(dialogId.current, state);
      },
    };

    setProcessingStatus('processing');
    setHasResumeState(false);

    try {
      await queueManager.start(processImage);

      // الانتهاء من المعالجة
      const stats = queueManager.getStats();
      console.log('📊 Final stats:', stats);

      toast.success(
        `اكتملت المعالجة: ${stats.completed} نجح، ${stats.failed} فشل، ${stats.skipped} تم تخطيهم`
      );

      // مسح الحالة المحفوظة
      clearProcessingState(dialogId.current);

    } catch (error: any) {
      console.error('Processing error:', error);
      toast.error(`خطأ في المعالجة: ${error.message}`);
    }

    setProcessingStatus('completed');
    setEstimatedTime(0);
  };

  // إيقاف مؤقت
  const pauseProcessing = () => {
    queueManager.pause();
    setProcessingStatus('paused');
    toast.info('تم إيقاف المعالجة مؤقتاً');
  };

  // استئناف
  const resumeProcessing = () => {
    queueManager.resume();
    setProcessingStatus('processing');
    toast.info('تم استئناف المعالجة');
  };

  // إلغاء
  const cancelProcessing = () => {
    queueManager.cancel();
    setProcessingStatus('cancelled');
    setOverallProgress(0);
    setEstimatedTime(0);
    toast.info('تم إلغاء المعالجة');
  };

  // تخطي ملف
  const skipFile = (fileId: string) => {
    queueManager.skipFile(fileId);
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'skipped' as const } : f
    ));
    toast.info('تم تخطي الملف');
  };

  // إعادة معالجة الفاشلة
  const retryFailedFiles = () => {
    queueManager.retryFailed();
    setShowRetryFailed(false);

    // إعادة تعيين حالات الملفات
    setFiles(prev => prev.map(f => {
      if (f.status === 'error') {
        return { ...f, status: 'pending' as const, error: undefined, retryCount: 0 };
      }
      return f;
    }));

    toast.info('تمت إضافة الملفات الفاشلة إلى الطابور');
  };

  // استئناف من حالة محفوظة
  const resumeFromSavedState = () => {
    const savedState = loadProcessingState(dialogId.current);
    if (savedState) {
      queueManager.loadResumeState(savedState);
      queueManager.setFiles(files);

      // تحديث الملفات بناءً على الحالة المحفوظة
      setFiles(prev => prev.map(f => {
        if (savedState.completedFileIds.includes(f.id)) {
          return { ...f, status: 'matched' as const };
        }
        return f;
      }));

      setHasResumeState(false);
      toast.info(`تم استعادة الحالة: ${savedState.completedFileIds.length} ملف مكتمل`);
    }
  };

  // Export error report as CSV
  const exportErrorReport = () => {
    const failedFiles = files.filter(f => f.status === 'error' || f.status === 'not_found');

    if (failedFiles.length === 0) {
      toast.info('لا توجد أخطاء لتصديرها');
      return;
    }

    const headers = ['File Name', 'Status', 'Error', 'Extracted Plate', 'Retries'];
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
    link.download = `vehicle-ocr-errors-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success('تم تصدير تقرير الأخطاء بنجاح');
  };

  // السحب والإفلات
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff']
    },
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  // الإدخال اليدوي
  const handleManualPlateEntry = (fileId: string) => {
    if (!manualPlateNumber.trim()) return;

    const normalized = normalizeVehicleNumber(manualPlateNumber);
    const manualCandidate: MatchCandidate = {
      number: manualPlateNumber.replace(/\D/g, ''),
      normalizedNumber: normalized,
      confidence: 100,
      source: 'manual',
      reason: 'تم إدخال رقم اللوحة يدوياً',
    };
    const match = findMatchingVehicle([manualCandidate]);

    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;

      if (match) {
        return {
          ...f,
          status: 'matched' as const,
          extractedNumber: manualPlateNumber,
          normalizedNumber: normalized,
          matchConfidence: manualCandidate.confidence,
          matchReason: manualCandidate.reason,
          matchCandidates: [manualCandidate],
          matchedVehicle: match.vehicle,
          error: undefined,
        };
      } else {
        return {
          ...f,
          status: 'not_found' as const,
          extractedNumber: manualPlateNumber,
          normalizedNumber: normalized,
          error: `لم يتم العثور على مركبة بالرقم: ${manualPlateNumber}`,
        };
      }
    }));

    setEditingFileId(null);
    setManualPlateNumber('');

    if (match) {
      toast.success(`تم مطابقة المركبة: ${match.vehicle.plate_number}`);
    } else {
      toast.error(`لم يتم العثور على مركبة بالرقم: ${manualPlateNumber}`);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const clearAllFiles = () => {
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    clearProcessingState(dialogId.current);
    setHasResumeState(false);
  };

  const handleClose = () => {
    if (processingStatus === 'processing') {
      if (!confirm('المعالجة جارية. هل تريد الإلغاء والإغلاق؟')) {
        return;
      }
      cancelProcessing();
    }
    clearAllFiles();
    onOpenChange(false);
  };

  // الإحصائيات
  const stats = React.useMemo(() => {
    const matchedFiles = files.filter(f => f.status === 'matched');
    const withExtractedData = matchedFiles.filter(f =>
      f.extractedData && Object.keys(f.extractedData).filter(k =>
        k !== 'plateNumber' && k !== 'normalizedPlateNumber' && (f.extractedData as any)[k]
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
      skipped: files.filter(f => f.status === 'skipped').length,
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
      case 'skipped':
        return <Badge variant="outline" className="bg-slate-100 text-slate-600">تم التخطي</Badge>;
    }
  };

  // تصفية الملفات حسب التبويب النشط
  const filteredFiles = React.useMemo(() => {
    switch (activeTab) {
      case 'matched':
        return files.filter(f => f.status === 'matched' || f.status === 'uploaded');
      case 'failed':
        return files.filter(f => f.status === 'error' || f.status === 'not_found');
      default:
        return files;
    }
  }, [files, activeTab]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-[1120px]">
        {/* Header مبسط وأنيق */}
        <div className="border-b border-slate-200 bg-white px-6 py-5 text-slate-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#0F766E] text-white shadow-sm">
                <ScanSearch className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">توزيع استمارات المركبات</h2>
                <p className="mt-1 text-sm text-slate-500">ارفع صور الاستمارات، امسح رقم اللوحة، ثم وزعها على المركبات المطابقة.</p>
              </div>
            </div>
            {files.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                  <FileImage className="w-4 h-4" />
                  <span>{stats.total} ملف</span>
                </div>
                {stats.matched > 0 && (
                  <div className="flex items-center gap-2 bg-green-500/30 px-3 py-1.5 rounded-lg">
                    <Check className="w-4 h-4" />
                    <span>{stats.matched} مطابق</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              { label: 'رفع الصور', active: files.length > 0, icon: Upload },
              { label: 'المسح والمطابقة', active: stats.matched > 0 || processingStatus !== 'idle', icon: ScanSearch },
              { label: 'رفع للمركبات', active: stats.uploaded > 0, icon: FileCheck },
            ].map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.label}
                  className={cn(
                    "flex items-center gap-3 rounded-[8px] border px-3 py-2",
                    step.active ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-slate-50"
                  )}
                >
                  <span className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[8px] text-xs font-black",
                    step.active ? "bg-teal-600 text-white" : "bg-white text-slate-500"
                  )}>
                    {index + 1}
                  </span>
                  <StepIcon className={cn("h-4 w-4", step.active ? "text-teal-700" : "text-slate-400")} />
                  <span className={cn("text-sm font-bold", step.active ? "text-teal-900" : "text-slate-500")}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="max-h-[calc(92vh-210px)] space-y-5 overflow-y-auto bg-[#F8FAFC] p-5">
          {/* منطقة السحب والإفلات - تصميم محسن */}
          <div
            {...getRootProps()}
            className={cn(
              "relative overflow-hidden rounded-[8px] border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300",
              isDragActive
                ? "border-teal-500 bg-teal-50 scale-[1.01] shadow-lg shadow-teal-500/20"
                : "border-slate-300 bg-white hover:border-teal-500 hover:shadow-md"
            )}
          >
            <input {...getInputProps()} />
            <motion.div
              animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex flex-col items-center"
            >
              <div className={cn(
                "mb-4 flex h-16 w-16 items-center justify-center rounded-[8px] transition-colors",
                isDragActive ? "bg-teal-600 text-white" : "bg-teal-50 text-teal-700"
              )}>
                <Upload className="w-8 h-8" />
              </div>
              {isDragActive ? (
                <p className="text-lg font-medium text-teal-700">أفلت الملفات هنا...</p>
              ) : (
                <>
                  <p className="text-base font-medium text-slate-700">اسحب وأفلت صور الاستمارات</p>
                  <p className="text-sm text-slate-400 mt-1">أو اضغط لاختيار الملفات</p>
                  <div className="mt-5 grid w-full max-w-md grid-cols-3 gap-2 text-xs text-slate-500">
                    <Badge variant="outline" className="bg-white">PNG</Badge>
                    <Badge variant="outline" className="bg-white">JPG</Badge>
                    <Badge variant="outline" className="bg-white">WebP</Badge>
                  </div>
                </>
              )}
            </motion.div>
          </div>

          {/* شريط التقدم والتحكم - تصميم محسن */}
          {files.length > 0 && (
            <div className="space-y-4">
              {/* شريط التقدم */}
              {(processingStatus === 'processing' || processingStatus === 'paused' || processingStatus === 'completed') && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {processingStatus === 'processing' && (
                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                        </div>
                      )}
                      {processingStatus === 'paused' && (
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Pause className="w-4 h-4 text-amber-600" />
                        </div>
                      )}
                      {processingStatus === 'completed' && (
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                      <div>
                          <p className="font-bold text-slate-900">
                          {processingStatus === 'processing' && 'جاري المعالجة...'}
                          {processingStatus === 'paused' && 'متوقف مؤقتاً'}
                          {processingStatus === 'completed' && 'اكتملت المعالجة'}
                        </p>
                        {estimatedTime > 0 && (
                          <p className="text-xs text-slate-500">الوقت المتبقي: {formatTime(estimatedTime)}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-3xl font-black text-teal-700">{overallProgress}%</div>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </motion.div>
              )}

              {/* أزرار التحكم - تصميم محسن */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  {hasResumeState && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resumeFromSavedState}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl"
                    >
                      <RotateCcw className="w-4 h-4 ml-2" />
                      استئناف من آخر حالة
                    </Button>
                  )}

                  {processingStatus === 'idle' && stats.pending > 0 && (
                    <Button
                      onClick={processAllFiles}
                      className="bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg shadow-blue-500/25"
                    >
                      <ScanSearch className="w-4 h-4 ml-2" />
                      بدء المسح ({stats.pending})
                    </Button>
                  )}

                  {processingStatus === 'processing' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={pauseProcessing} className="rounded-xl text-amber-600 border-amber-200">
                        <Pause className="w-4 h-4 ml-1" />
                        إيقاف
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelProcessing} className="rounded-xl text-red-600 border-red-200">
                        <X className="w-4 h-4 ml-1" />
                        إلغاء
                      </Button>
                    </div>
                  )}

                  {processingStatus === 'paused' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={resumeProcessing} className="rounded-xl bg-green-600 hover:bg-green-700">
                        <Play className="w-4 h-4 ml-1" />
                        استئناف
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelProcessing} className="rounded-xl text-red-600 border-red-200">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {processingStatus === 'completed' && stats.error > 0 && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={retryFailedFiles} className="rounded-xl text-blue-600 border-blue-200">
                        <RefreshCw className="w-4 h-4 ml-1" />
                        إعادة ({stats.error})
                      </Button>
                      <Button size="sm" variant="ghost" onClick={exportErrorReport} className="rounded-xl">
                        <Download className="w-4 h-4 ml-1" />
                        تصدير
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={clearAllFiles} className="text-slate-400 hover:text-red-500 rounded-xl">
                    <Trash2 className="w-4 h-4 ml-1" />
                    مسح
                  </Button>
                  {stats.matched > 0 && (
                    <Button
                      onClick={uploadMatchedFiles}
                      disabled={processingStatus === 'processing' || isUploading}
                      className="bg-gradient-to-l from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-teal-500/25"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin ml-2" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 ml-2" />
                          رفع ({stats.matched})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* تبويبات تصفية الملفات */}
          {files.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-slate-200 bg-white p-2 shadow-sm">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  "rounded-[8px] px-4 py-2 text-sm font-bold transition-colors",
                  activeTab === 'all' 
                    ? "bg-slate-100 text-slate-800" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                الكل ({stats.total})
              </button>
              <button
                onClick={() => setActiveTab('matched')}
                className={cn(
                  "flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-bold transition-colors",
                  activeTab === 'matched' 
                    ? "bg-green-100 text-green-800" 
                    : "text-slate-500 hover:text-green-700 hover:bg-green-50"
                )}
              >
                <Check className="w-3.5 h-3.5" />
                مطابق ({stats.matched + stats.uploaded})
              </button>
              <button
                onClick={() => setActiveTab('failed')}
                className={cn(
                  "flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-bold transition-colors",
                  activeTab === 'failed' 
                    ? "bg-red-100 text-red-800" 
                    : "text-slate-500 hover:text-red-700 hover:bg-red-50"
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                يحتاج مراجعة ({stats.error + stats.notFound})
              </button>
            </div>
          )}

          {/* قائمة الملفات - تصميم محسن */}
          {files.length > 0 && (
            <ScrollArea className="h-[340px] rounded-[8px] border border-slate-200 bg-white shadow-sm">
              <div className="space-y-2 p-3">
                <AnimatePresence mode="popLayout">
                  {filteredFiles.slice(0, visibleFileCount).map((file, index) => (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "flex items-start gap-3 rounded-[8px] border bg-white p-3 transition-all hover:shadow-sm",
                        file.status === 'matched' && "border-green-200",
                        file.status === 'uploaded' && "border-emerald-200",
                        file.status === 'not_found' && "border-amber-200",
                        file.status === 'error' && "border-red-200",
                        file.status === 'scanning' && "border-blue-200",
                        file.status === 'skipped' && "border-slate-200",
                        file.status === 'pending' && "border-slate-200"
                      )}
                    >
                      {/* معاينة الصورة */}
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[8px] border border-slate-200 bg-slate-100">
                        <img src={file.preview} alt="" className="w-full h-full object-cover" />
                      </div>

                      {/* معلومات الملف */}
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">{file.file.name}</p>
                          {getStatusBadge(file)}
                          {typeof file.matchConfidence === 'number' && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                file.matchConfidence >= AUTO_MATCH_MIN_CONFIDENCE
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              )}
                            >
                              ثقة {file.matchConfidence}%
                            </Badge>
                          )}
                        </div>
                        
                        {file.matchedVehicle && (
                          <div className="flex items-center gap-2 text-xs">
                            <Car className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-green-700 font-medium">
                              {file.matchedVehicle.plate_number} • {file.matchedVehicle.make} {file.matchedVehicle.model}
                            </span>
                            {file.dataUpdated && (
                              <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                                <Database className="w-2.5 h-2.5 ml-0.5" />
                                تم تحديث البيانات
                              </Badge>
                            )}
                          </div>
                        )}

                        {file.extractedNumber && !file.matchedVehicle && (
                          <p className="text-xs text-amber-600">رقم مستخرج: {file.extractedNumber}</p>
                        )}

                        {file.error && !file.matchedVehicle && (
                          <p className="text-xs text-red-500">{file.error}</p>
                        )}

                        {file.matchReason && (
                          <p className="mt-1 text-xs text-slate-500">{file.matchReason}</p>
                        )}

                        {/* إدخال يدوي مبسط */}
                        {(file.status === 'not_found' || file.status === 'error') && (
                          <div className="mt-2 flex items-center gap-2">
                            <Input
                              type="text"
                              placeholder="أدخل رقم اللوحة..."
                              value={editingFileId === file.id ? manualPlateNumber : ''}
                              onChange={(e) => { setEditingFileId(file.id); setManualPlateNumber(e.target.value); }}
                              onFocus={() => { setEditingFileId(file.id); if (!manualPlateNumber) setManualPlateNumber(file.extractedNumber || ''); }}
                              className="h-8 text-xs flex-1 max-w-[180px] rounded-lg"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleManualPlateEntry(file.id); }}
                            />
                            <Button size="sm" onClick={() => handleManualPlateEntry(file.id)} disabled={editingFileId !== file.id || !manualPlateNumber.trim()} className="h-8 text-xs rounded-lg bg-teal-600">
                              مطابقة
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => skipFile(file.id)} className="h-8 text-xs text-slate-400">
                              تخطي
                            </Button>
                          </div>
                        )}

                        {/* Debug */}
                        {showDebugText === file.id && file.extractedText && (
                          <div className="mt-2 p-2 bg-slate-800 text-slate-100 rounded-lg text-[10px] font-mono max-h-24 overflow-y-auto">
                            <pre className="whitespace-pre-wrap">{file.extractedText}</pre>
                          </div>
                        )}
                      </div>

                      {/* أزرار الإجراءات */}
                      <div className="flex items-center gap-1">
                        {file.extractedText && (
                          <Button variant="ghost" size="icon" onClick={() => setShowDebugText(showDebugText === file.id ? null : file.id)} className="h-7 w-7 text-slate-400">
                            {showDebugText === file.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        {file.status !== 'uploaded' && file.status !== 'scanning' && (
                          <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)} className="h-7 w-7 text-slate-400 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {filteredFiles.length > visibleFileCount && (
                  <Button variant="ghost" onClick={() => setVisibleFileCount(prev => prev + 50)} className="w-full text-teal-600 hover:text-teal-700 mt-2">
                    <MoreHorizontal className="w-4 h-4 ml-2" />
                    عرض المزيد ({filteredFiles.length - visibleFileCount} ملف)
                  </Button>
                )}
              </div>
            </ScrollArea>
          )}

          {/* رسالة عدم وجود ملفات */}
          {files.length === 0 && (
            <div className="rounded-[8px] border border-slate-200 bg-white py-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[8px] bg-slate-100">
                <FileImage className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-slate-500">لم يتم رفع أي ملفات بعد</p>
              <p className="text-slate-400 text-sm mt-1">اسحب الصور أو اضغط للاختيار</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Database className="w-3.5 h-3.5" />
            <span>OCR: Google Vision + Tesseract</span>
          </div>
          <Button variant="outline" onClick={handleClose} className="rounded-[8px]">
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDocumentDistributionDialog;
