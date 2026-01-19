/**
 * مكون توزيع المستندات على المركبات
 * يقوم بقراءة رقم اللوحة من صور الاستمارات وتوزيعها على المركبات المناسبة
 */

import React, { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Tesseract from 'tesseract.js';

// استخدام Vehicle OCR عبر Supabase Edge Function (Google Cloud Vision)
interface VehicleOCRResult {
  success: boolean;
  rawText: string;
  extractedData: ExtractedVehicleData;
  confidence: number;
  error?: string;
}

const extractWithVehicleOCR = async (file: File): Promise<VehicleOCRResult> => {
  // تحويل الملف إلى base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result); // نرسل data URL الكامل
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // الحصول على session للتوثيق
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  // إرسال الطلب إلى Edge Function
  const response = await supabase.functions.invoke('vehicle-ocr', {
    body: { imageBase64: base64 },
  });

  if (response.error) {
    throw new Error(response.error.message || 'OCR failed');
  }

  return response.data as VehicleOCRResult;
};

interface VehicleDocumentDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// البيانات المستخرجة من استمارة المركبة
interface ExtractedVehicleData {
  plateNumber?: string;
  normalizedPlateNumber?: string;
  vin?: string; // رقم الهيكل / Chassis No.
  engineNumber?: string; // رقم المحرك
  make?: string; // نوع المركبة
  model?: string; // الطراز
  year?: number; // سنة الصنع
  color?: string; // اللون
  seatingCapacity?: number; // عدد المقاعد
  registrationDate?: string; // تاريخ التسجيل
  registrationExpiry?: string; // تاريخ انتهاء الترخيص
  insuranceExpiry?: string; // تاريخ انتهاء التأمين
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'scanning' | 'matched' | 'not_found' | 'uploaded' | 'error';
  extractedNumber?: string;
  normalizedNumber?: string;
  extractedData?: ExtractedVehicleData; // البيانات المستخرجة الكاملة
  extractedText?: string; // النص المستخرج من OCR للتشخيص
  matchedVehicle?: {
    id: string;
    plate_number: string;
    make: string;
    model: string;
  };
  dataUpdated?: boolean; // هل تم تحديث بيانات المركبة
  error?: string;
  progress?: number;
}

// تطبيع رقم اللوحة - إزالة الأصفار من البداية والمسافات والرموز
const normalizeVehicleNumber = (number: string): string => {
  // إزالة كل شيء ما عدا الأرقام
  const digitsOnly = number.replace(/\D/g, '');
  // إزالة الأصفار من البداية
  const normalized = digitsOnly.replace(/^0+/, '');
  return normalized || '0'; // إذا كان كل الأرقام أصفار، نرجع 0
};

// استخراج أرقام اللوحات المحتملة من النص
const extractVehicleNumbers = (text: string): string[] => {
  const numbers: string[] = [];
  let match;
  
  // تنظيف النص - إزالة الرموز الغريبة والمسافات الزائدة
  const cleanText = text
    .replace(/[‏‎]/g, '') // إزالة علامات الاتجاه
    .replace(/\s+/g, ' ')
    .trim();
  console.log('Clean text for extraction:', cleanText);
  
  // نمط 1: Vehicle No. متبوع برقم (مع مسافات محتملة)
  const vehicleNoPatterns = [
    /vehicle\s*no\.?\s*[:\.]?\s*(\d{3,8})/gi,
    /vehicle\s*n[o0]\.?\s*[:\.]?\s*(\d{3,8})/gi,
    /veh(?:icle)?\s*n[o0]\.?\s*(\d{3,8})/gi,
    /vehicle[^0-9]*(\d{4,8})/gi, // Vehicle متبوع بأي شيء ثم رقم
  ];
  
  for (const pattern of vehicleNoPatterns) {
    while ((match = pattern.exec(cleanText)) !== null) {
      if (!numbers.includes(match[1])) {
        numbers.push(match[1]);
      }
    }
  }
  
  // نمط 2: رقم اللوحة بالعربي
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
  
  // نمط 3: الرقم المحاط بنجوم (من الباركود) مثل * 0 0 8 2 0 5 *
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
  
  // نمط 4: أرقام متتالية مفصولة بمسافات (من الباركود)
  const spacedDigitsPattern = /(\d\s+\d\s+\d\s+\d(?:\s+\d)*)/g;
  while ((match = spacedDigitsPattern.exec(cleanText)) !== null) {
    const digits = match[1].replace(/\s/g, '');
    if (digits.length >= 4 && digits.length <= 8 && !numbers.includes(digits)) {
      numbers.push(digits);
    }
  }
  
  // نمط 5: رقم من 6 خانات يبدأ بصفر (نمط اللوحات القطرية الشائع)
  const qatarPlatePattern = /\b(0{1,3}\d{3,6})\b/g;
  while ((match = qatarPlatePattern.exec(cleanText)) !== null) {
    const num = match[1];
    if (!numbers.includes(num) && num.length >= 4 && num.length <= 8) {
      numbers.push(num);
    }
  }
  
  // نمط 6: أي رقم من 5-8 أرقام
  const generalNumberPattern = /(?<!\d)(\d{5,8})(?!\d)/g;
  while ((match = generalNumberPattern.exec(cleanText)) !== null) {
    const num = match[1];
    // تجنب السنوات والتواريخ
    const isYear = /^(19|20)\d{2}$/.test(num);
    const isDate = /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(num);
    if (!numbers.includes(num) && !isYear && !isDate) {
      numbers.push(num);
    }
  }
  
  // نمط 7: البحث عن أي تسلسل أرقام بعد كلمة Vehicle
  const afterVehiclePattern = /vehicle[^\d]*?(\d+)/gi;
  while ((match = afterVehiclePattern.exec(cleanText)) !== null) {
    const num = match[1];
    if (!numbers.includes(num) && num.length >= 4 && num.length <= 8) {
      numbers.push(num);
    }
  }
  
  console.log('Extracted numbers:', numbers);
  return numbers;
};

// استخراج جميع البيانات من نص الاستمارة
const extractAllVehicleData = (text: string): ExtractedVehicleData => {
  const data: ExtractedVehicleData = {};
  
  // تنظيف النص
  const cleanText = text.replace(/\s+/g, ' ').trim();
  console.log('Full OCR text:', cleanText);
  
  // 1. رقم اللوحة - Vehicle No.
  const platePatterns = [
    /vehicle\s*n[o0]\.?\s*[:\.]?\s*(\d{3,8})/i,
    /veh(?:icle)?\s*n[o0]\.?\s*(\d{3,8})/i,
    /رقم\s*اللوح[ةه]\s*[:\.]?\s*(\d{3,8})/,
    /\*\s*([\d\s]{5,15})\s*\*/,  // الباركود
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
  
  // 2. رقم الهيكل - Chassis No. / VIN
  const vinPatterns = [
    /chassis\s*n[o0]\.?\s*[:\.]?\s*([A-Z0-9]{15,17})/i,
    /رقم\s*القاعد[ةه]\s*[:\.]?\s*([A-Z0-9]{15,17})/i,
    /vin\s*[:\.]?\s*([A-Z0-9]{15,17})/i,
    /([A-Z][A-Z0-9]{15,16})/i, // VIN يبدأ بحرف
  ];
  for (const pattern of vinPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const vin = match[1].replace(/\s/g, '').toUpperCase();
      // التحقق من أن VIN يحتوي على أحرف وأرقام
      if (vin.length >= 15 && /[A-Z]/.test(vin) && /\d/.test(vin)) {
        data.vin = vin;
        break;
      }
    }
  }
  
  // 3. رقم المحرك - Engine No.
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
  
  // 4. سنة الصنع - Year
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
  
  // 5. الطراز - Model
  const modelPatterns = [
    /الطراز\s*[:\.]?\s*([A-Z0-9\-]+)/i,
    /model\s*[:\.]?\s*([A-Z0-9\-]+)/i,
    /([A-Z]{2,3}\d{1,2})/i, // مثل GS3
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
  
  // 6. نوع المركبة / الشركة المصنعة - Make
  const makePatterns = [
    /نوع\s*المركب[ةه]\s*[:\.]?\s*([^\n\r\d|]+?)(?=\s*الطراز|\s*بلد|\s*$)/,
    /make\s*[:\.]?\s*([A-Z\s]+?)(?=\s*model|\s*$)/i,
  ];
  // قائمة الشركات المعروفة
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
  
  if (!data.make) {
    for (const pattern of makePatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const make = match[1].trim();
        if (make.length >= 2 && make.length <= 50) {
          data.make = make;
          break;
        }
      }
    }
  }
  
  // 7. اللون - Color
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
  
  // 8. عدد المقاعد - Seating Capacity
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
  
  // 9. التواريخ - استخراج جميع التواريخ بتنسيق YYYY-MM-DD
  const datePattern = /(\d{4})[-/](\d{2})[-/](\d{2})/g;
  const dates: string[] = [];
  let dateMatch;
  while ((dateMatch = datePattern.exec(cleanText)) !== null) {
    dates.push(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
  }
  
  // تاريخ انتهاء الترخيص - عادة التاريخ الأحدث
  if (cleanText.includes('انتهاء') || cleanText.includes('Exp')) {
    const expiryMatch = cleanText.match(/(?:exp\.?\s*date|انتهاء\s*الترخيص)[:\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i);
    if (expiryMatch) {
      data.registrationExpiry = parseDate(expiryMatch[1]);
    }
  }
  
  // تاريخ التسجيل
  if (cleanText.includes('Reg') || cleanText.includes('تسجيل')) {
    const regMatch = cleanText.match(/(?:reg\.?\s*date|تاريخ\s*(?:أول\s*)?تسجيل)[:\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i);
    if (regMatch) {
      data.registrationDate = parseDate(regMatch[1]);
    }
  }
  
  // تاريخ انتهاء التأمين
  if (cleanText.includes('انتهاء التأمين') || cleanText.includes('insurance')) {
    const insMatch = cleanText.match(/(?:انتهاء\s*التأمين|insurance\s*expiry)[:\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i);
    if (insMatch) {
      data.insuranceExpiry = parseDate(insMatch[1]);
    }
  }
  
  // إذا لم نجد تواريخ محددة، نستخدم التواريخ العامة
  if (dates.length > 0 && !data.registrationExpiry) {
    // نفترض أن التاريخ الأخير هو انتهاء الترخيص
    data.registrationExpiry = dates[dates.length - 1];
  }
  
  console.log('Extracted data:', data);
  return data;
};

// معالجة الصورة مسبقاً لتحسين دقة OCR - نسخة خفيفة
const preprocessImageLight = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // تكبير الصورة قليلاً فقط
      const scale = 1.5;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // رسم الصورة بجودة عالية
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // الحصول على بيانات الصورة
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // تحويل إلى تدرج رمادي فقط مع تحسين بسيط للتباين
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // زيادة بسيطة في التباين بدون عتبة
        const contrast = 1.3;
        let newGray = ((gray / 255 - 0.5) * contrast + 0.5) * 255;
        newGray = Math.max(0, Math.min(255, newGray));
        
        data[i] = newGray;
        data[i + 1] = newGray;
        data[i + 2] = newGray;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// معالجة الصورة - نسخة قوية مع عتبة
const preprocessImageStrong = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // عتبة أعلى للحفاظ على المزيد من التفاصيل
        const threshold = 180;
        const newGray = gray > threshold ? 255 : 0;
        
        data[i] = newGray;
        data[i + 1] = newGray;
        data[i + 2] = newGray;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// تحويل التاريخ إلى صيغة موحدة
const parseDate = (dateStr: string): string | undefined => {
  try {
    // حاول تحليل التاريخ
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return undefined;
    
    let year: number, month: number, day: number;
    
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
    } else {
      // DD-MM-YYYY
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

// مكون عرض البيانات المستخرجة
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

const VehicleDocumentDistributionDialog: React.FC<VehicleDocumentDistributionDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [showDebugText, setShowDebugText] = useState<string | null>(null); // لعرض النص المستخرج
  const [editingFileId, setEditingFileId] = useState<string | null>(null); // للإدخال اليدوي
  const [manualPlateNumber, setManualPlateNumber] = useState(''); // رقم اللوحة اليدوي

  // معالجة الملفات المسحوبة أو المختارة
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  // إعداد السحب والإفلات
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff']
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: true,
  });

  // جلب جميع المركبات للمطابقة
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

  // إنشاء خريطة للمطابقة السريعة
  const vehicleMap = React.useMemo(() => {
    const map = new Map<string, typeof vehicles[0]>();
    vehicles.forEach(vehicle => {
      if (vehicle.plate_number) {
        // إضافة الرقم الأصلي
        map.set(vehicle.plate_number, vehicle);
        // إضافة الرقم المطبع
        const normalized = normalizeVehicleNumber(vehicle.plate_number);
        map.set(normalized, vehicle);
      }
    });
    return map;
  }, [vehicles]);

  // مطابقة رقم اللوحة مع المركبات
  const findMatchingVehicle = (extractedNumbers: string[]) => {
    for (const num of extractedNumbers) {
      const normalized = normalizeVehicleNumber(num);
      
      // البحث المباشر
      if (vehicleMap.has(num)) {
        return { vehicle: vehicleMap.get(num)!, extractedNumber: num, normalizedNumber: normalized };
      }
      
      // البحث بالرقم المطبع
      if (vehicleMap.has(normalized)) {
        return { vehicle: vehicleMap.get(normalized)!, extractedNumber: num, normalizedNumber: normalized };
      }
      
      // البحث التقريبي - مقارنة الأرقام المطبعة
      for (const vehicle of vehicles) {
        if (vehicle.plate_number) {
          const vehicleNormalized = normalizeVehicleNumber(vehicle.plate_number);
          if (vehicleNormalized === normalized) {
            return { vehicle, extractedNumber: num, normalizedNumber: normalized };
          }
        }
      }
    }
    return null;
  };

  // معالجة الصورة باستخدام OCR
  const processImage = async (uploadedFile: UploadedFile): Promise<UploadedFile> => {
    try {
      // تحديث الحالة إلى "جاري المسح"
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: 'scanning' as const, progress: 0 } : f
      ));

      // محاولات OCR
      let extractedText = '';
      let extractedNumbers: string[] = [];
      let ocrMethod = 'tesseract';
      let serverExtractedData: ExtractedVehicleData = {};
      
      const updateProgress = (progress: number) => {
        setFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? { ...f, progress } : f
        ));
      };

      // المحاولة 1: Vehicle OCR عبر Supabase Edge Function (Google Cloud Vision)
      try {
        console.log('🔍 Trying Vehicle OCR (Google Cloud Vision via Supabase)...');
        updateProgress(20);
        
        const ocrResult = await extractWithVehicleOCR(uploadedFile.file);
        
        if (ocrResult.success && ocrResult.rawText) {
          extractedText = ocrResult.rawText;
          serverExtractedData = ocrResult.extractedData;
          ocrMethod = 'google-vision';
          
          console.log('✅ Google Vision result:', extractedText.substring(0, 300));
          console.log('✅ Server extracted data:', serverExtractedData);
          
          // استخدام رقم اللوحة المستخرج من الخادم
          if (serverExtractedData.plateNumber) {
            extractedNumbers = [serverExtractedData.plateNumber];
          } else {
            extractedNumbers = extractVehicleNumbers(extractedText);
          }
          
          updateProgress(90);
        } else {
          console.warn('⚠️ Vehicle OCR failed:', ocrResult.error);
          throw new Error(ocrResult.error || 'OCR failed');
        }
      } catch (error) {
        console.warn('⚠️ Vehicle OCR failed, trying Tesseract...', error);
        
        // المحاولة 2: Tesseract.js كخيار احتياطي
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
        console.log('📝 Tesseract result:', extractedText.substring(0, 200));
        extractedNumbers = extractVehicleNumbers(extractedText);
      }
      
      console.log(`📊 OCR Method: ${ocrMethod}, Numbers found: ${extractedNumbers.length}`);
      updateProgress(100);

      // النص النهائي المستخرج
      const fullText = extractedText;
      console.log('📄 Full OCR text:', fullText.substring(0, 500));
      
      // استخراج جميع البيانات (دمج البيانات من الخادم مع الاستخراج المحلي)
      const localExtractedData = extractAllVehicleData(fullText);
      const extractedData: ExtractedVehicleData = {
        ...localExtractedData,
        ...serverExtractedData, // البيانات من الخادم لها الأولوية
      };
      
      // دمج رقم اللوحة المستخرج
      if (!extractedData.plateNumber && extractedNumbers.length > 0) {
        extractedData.plateNumber = extractedNumbers[0];
        extractedData.normalizedPlateNumber = normalizeVehicleNumber(extractedNumbers[0]);
      }
      
      // إذا لم نجد أي رقم، نحاول استخراج أي رقم من 4-8 خانات
      if (!extractedData.plateNumber && extractedNumbers.length === 0) {
        // محاولة أخيرة - البحث عن أي رقم طويل
        const anyNumber = fullText.match(/\d{4,8}/);
        if (anyNumber) {
          extractedData.plateNumber = anyNumber[0];
          extractedData.normalizedPlateNumber = normalizeVehicleNumber(anyNumber[0]);
          extractedNumbers.push(anyNumber[0]);
        }
      }
      
      if (!extractedData.plateNumber && extractedNumbers.length === 0) {
        // حفظ جزء من النص المستخرج للتشخيص
        const textPreview = fullText.substring(0, 500).replace(/\s+/g, ' ');
        return {
          ...uploadedFile,
          status: 'not_found',
          extractedData,
          extractedText: textPreview,
          error: `لم يتم العثور على رقم لوحة تلقائياً. يرجى إدخال الرقم يدوياً.`,
        };
      }

      const match = findMatchingVehicle(
        extractedData.plateNumber ? [extractedData.plateNumber, ...extractedNumbers] : extractedNumbers
      );
      
      if (match) {
        return {
          ...uploadedFile,
          status: 'matched',
          extractedNumber: match.extractedNumber,
          normalizedNumber: match.normalizedNumber,
          extractedData,
          extractedText: fullText.substring(0, 500),
          matchedVehicle: match.vehicle,
        };
      } else {
        return {
          ...uploadedFile,
          status: 'not_found',
          extractedNumber: extractedData.plateNumber || extractedNumbers[0],
          normalizedNumber: extractedData.normalizedPlateNumber || normalizeVehicleNumber(extractedNumbers[0]),
          extractedData,
          extractedText: fullText.substring(0, 500),
          error: `لم يتم العثور على مركبة بالرقم: ${extractedData.plateNumber || extractedNumbers[0]}`,
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

  // تحديث بيانات المركبة في قاعدة البيانات
  const updateVehicleData = async (vehicleId: string, data: ExtractedVehicleData): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      
      // تحويل البيانات المستخرجة إلى صيغة قاعدة البيانات
      if (data.vin) updateData.vin = data.vin;
      if (data.engineNumber) updateData.engine_number = data.engineNumber;
      if (data.make) updateData.make = data.make;
      if (data.model) updateData.model = data.model;
      if (data.year) updateData.year = data.year;
      if (data.color) updateData.color = data.color;
      if (data.seatingCapacity) updateData.seating_capacity = data.seatingCapacity;
      if (data.registrationDate) updateData.registration_date = data.registrationDate;
      if (data.registrationExpiry) updateData.registration_expiry = data.registrationExpiry;
      if (data.insuranceExpiry) updateData.insurance_expiry = data.insuranceExpiry;
      
      // إذا لم يكن هناك بيانات للتحديث
      if (Object.keys(updateData).length === 0) {
        return false;
      }
      
      const { error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', vehicleId);
      
      if (error) throw error;
      
      // إبطال ذاكرة التخزين المؤقت
      queryClient.invalidateQueries({ queryKey: ['vehicle-details', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      return true;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      return false;
    }
  };

  // معالجة جميع الملفات
  const processAllFiles = async () => {
    setIsProcessing(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      const processedFile = await processImage(file);
      
      setFiles(prev => prev.map(f => 
        f.id === file.id ? processedFile : f
      ));
      
      setOverallProgress(Math.round(((i + 1) / pendingFiles.length) * 100));
    }
    
    setIsProcessing(false);
    setOverallProgress(0);
  };

  // رفع الملفات المطابقة وتحديث بيانات المركبات
  const uploadMatchedFiles = async () => {
    setIsUploading(true);
    const matchedFiles = files.filter(f => f.status === 'matched' && f.matchedVehicle);
    let successCount = 0;
    let errorCount = 0;
    let dataUpdatedCount = 0;

    for (const file of matchedFiles) {
      try {
        // رفع الملف إلى Storage
        const fileExt = file.file.name.split('.').pop();
        const fileName = `vehicle-documents/${file.matchedVehicle!.id}/${Date.now()}_registration.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // إنشاء سجل في قاعدة البيانات
        const { error: dbError } = await supabase
          .from('vehicle_documents')
          .insert({
            vehicle_id: file.matchedVehicle!.id,
            document_type: 'registration',
            document_name: `استمارة المركبة - ${file.matchedVehicle!.plate_number}`,
            document_url: fileName,
            is_active: true,
          });

        if (dbError) throw dbError;

        // تحديث بيانات المركبة إذا تم استخراج بيانات
        let dataUpdated = false;
        if (file.extractedData) {
          dataUpdated = await updateVehicleData(file.matchedVehicle!.id, file.extractedData);
          if (dataUpdated) dataUpdatedCount++;
        }

        // تحديث حالة الملف
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'uploaded' as const, dataUpdated } : f
        ));
        
        successCount++;
        
        // إبطال ذاكرة التخزين المؤقت للوثائق
        queryClient.invalidateQueries({ 
          queryKey: ['vehicle-document-files', file.matchedVehicle!.id] 
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
        ? `تم رفع ${successCount} استمارة وتحديث بيانات ${dataUpdatedCount} مركبة` 
        : `تم رفع ${successCount} استمارة بنجاح`;
      toast.success(msg);
    }
    if (errorCount > 0) {
      toast.error(`فشل رفع ${errorCount} استمارة`);
    }
  };

  // إدخال رقم اللوحة يدوياً ومحاولة المطابقة
  const handleManualPlateEntry = (fileId: string) => {
    if (!manualPlateNumber.trim()) return;
    
    const normalized = normalizeVehicleNumber(manualPlateNumber);
    const match = findMatchingVehicle([manualPlateNumber, normalized]);
    
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      
      if (match) {
        return {
          ...f,
          status: 'matched' as const,
          extractedNumber: manualPlateNumber,
          normalizedNumber: normalized,
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
  };

  // إغلاق الحوار وتنظيف
  const handleClose = () => {
    clearAllFiles();
    onOpenChange(false);
  };

  // إحصائيات الملفات
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ScanSearch className="w-5 h-5 text-teal-600" />
            توزيع المستندات وتحديث البيانات
          </DialogTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <span>قم برفع صور استمارات المركبات:</span>
            <ul className="list-disc list-inside text-xs space-y-0.5 mt-1 mr-2">
              <li>يستخدم النظام <strong>Google Cloud Vision</strong> للتعرف بدقة عالية</li>
              <li>سيتم استخراج: رقم اللوحة، رقم الهيكل، المحرك، التواريخ، وغيرها</li>
              <li>إذا لم ينجح التعرف التلقائي، يمكنك إدخال الرقم يدوياً</li>
            </ul>
            <div className="flex items-center gap-1 text-blue-600 mt-2">
              <Database className="w-3 h-3" />
              <span className="text-xs font-medium">OCR عبر Supabase Edge Function</span>
            </div>
          </div>
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
                  اسحب وأفلت صور الاستمارات هنا
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  أو اضغط لاختيار الملفات (PNG, JPG, JPEG, WebP)
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

          {/* شريط التقدم */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">جاري معالجة الصور...</span>
                <span className="text-teal-600 font-medium">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          )}

          {/* قائمة الملفات */}
          {files.length > 0 && (
            <ScrollArea className="h-[300px] rounded-xl border border-slate-200">
              <div className="p-3 space-y-2">
                <AnimatePresence>
                  {files.map((file, index) => (
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
                        {file.matchedVehicle ? (
                          <div className="space-y-1 mt-1">
                            <div className="flex items-center gap-2">
                              <Car className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-700 font-medium">
                                {file.matchedVehicle.plate_number} - {file.matchedVehicle.make} {file.matchedVehicle.model}
                              </span>
                            </div>
                            {/* عرض البيانات المستخرجة */}
                            {file.extractedData && (
                              <ExtractedDataPreview data={file.extractedData} dataUpdated={file.dataUpdated} />
                            )}
                          </div>
                        ) : file.extractedNumber ? (
                          <div className="space-y-1 mt-1">
                            <p className="text-xs text-amber-600">
                              رقم مستخرج: {file.extractedNumber} (المطبع: {file.normalizedNumber})
                            </p>
                            {file.extractedData && (
                              <ExtractedDataPreview data={file.extractedData} />
                            )}
                          </div>
                        ) : file.error ? (
                          <p className="text-xs text-red-600 mt-1">{file.error}</p>
                        ) : null}
                        
                        {/* إدخال رقم اللوحة يدوياً - يظهر تلقائياً عند فشل OCR */}
                        {(file.status === 'not_found' || file.status === 'error') && (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs text-amber-700 mb-2 flex items-center gap-1">
                              <Edit3 className="w-3 h-3" />
                              أدخل رقم اللوحة يدوياً للمطابقة:
                            </p>
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                placeholder="مثال: 8205 أو 008205"
                                value={editingFileId === file.id ? manualPlateNumber : ''}
                                onChange={(e) => {
                                  setEditingFileId(file.id);
                                  setManualPlateNumber(e.target.value);
                                }}
                                onFocus={() => {
                                  setEditingFileId(file.id);
                                  if (!manualPlateNumber) {
                                    setManualPlateNumber(file.extractedNumber || '');
                                  }
                                }}
                                className="h-8 text-sm flex-1 bg-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleManualPlateEntry(file.id);
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleManualPlateEntry(file.id)}
                                disabled={editingFileId !== file.id || !manualPlateNumber.trim()}
                                className="h-8 bg-teal-600 hover:bg-teal-700"
                              >
                                <Check className="w-4 h-4 ml-1" />
                                مطابقة
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* عرض النص المستخرج للتشخيص */}
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
                        
                        {/* زر عرض النص المستخرج */}
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
          )}

          {/* رسالة عدم وجود ملفات */}
          {files.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <FileImage className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">لم يتم رفع أي ملفات بعد</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={handleClose}>
            إغلاق
          </Button>
          
          {stats.pending > 0 && (
            <Button
              onClick={processAllFiles}
              disabled={isProcessing || isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري المسح...
                </>
              ) : (
                <>
                  <ScanSearch className="w-4 h-4" />
                  مسح الصور ({stats.pending})
                </>
              )}
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
  );
};

export default VehicleDocumentDistributionDialog;
