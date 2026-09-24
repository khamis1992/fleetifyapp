/**
 * Intelligent Invoice Scanner Component
 * Advanced OCR with Arabic/English handwriting support and fuzzy matching
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { preprocessImage } from '@/utils/imagePreprocessing';
import { LazyImage } from '@/components/common/LazyImage';
import EnhancedMobileCamera from './EnhancedMobileCamera';
import { useBackgroundQueue } from '@/utils/backgroundProcessingQueue';
import { useFleetifyTranslation } from '@/hooks/useTranslation';
import {
  Camera,
  Upload,
  Files,
  ScanLine,
  ChevronDown,
  Check,
  AlertTriangle,
  User,
  Car,
  Calendar,
  Banknote,
  Languages,
  Sparkles,
  RefreshCw,
  Users,
  RotateCcw
} from 'lucide-react';

interface ScanResult {
  id: string;
  data: {
    invoice_number?: string;
    invoice_date?: string;
    customer_name?: string;
    contract_number?: string;
    car_number?: string;
    total_amount?: number;
    payment_period?: string;
    notes?: string;
    language_detected?: string;
    raw_text?: string;
  };
  matching: {
    best_match?: {
      id: string;
      name: string;
      phone?: string;
      car_number?: string;
      confidence: number;
      match_reasons: string[];
    };
    all_matches: Array<{
    id?: string;
    name?: string;
    confidence?: number;
  }>;
    total_confidence: number;
    name_similarity: number;
    car_match_score: number;
    context_match_score: number;
  };
  processing_info: {
    ocr_engine: string;
    language_detected: string;
    ocr_confidence: number;
  };
}

interface InvoiceScannerProps {
  onScanComplete?: (result: ScanResult) => void;
  className?: string;
}

type OcrEngine = 'gemini' | 'google-vision' | 'hybrid';
type ProcessingLanguage = 'auto' | 'arabic' | 'english';
type CaptureMode = 'upload' | 'bulk' | 'camera';

const isOcrEngine = (value: unknown): value is OcrEngine =>
  typeof value === 'string' && ['gemini', 'google-vision', 'hybrid'].includes(value);

const isProcessingLanguage = (value: unknown): value is ProcessingLanguage =>
  typeof value === 'string' && ['auto', 'arabic', 'english'].includes(value);

const MAX_BULK_FILES = 10;

const bulkCountLabel = (count: number) => `${count} ${count === 1 ? 'فاتورة' : 'فواتير'}`;

const CONFIDENCE_TIERS = {
  auto: { min: 85 },
  review: { min: 70 },
} as const;

const getMatchTier = (confidence: number): 'auto' | 'review' | 'manual' => {
  if (confidence >= CONFIDENCE_TIERS.auto.min) return 'auto';
  if (confidence >= CONFIDENCE_TIERS.review.min) return 'review';
  return 'manual';
};

const confidenceTone = (confidence: number): string => {
  if (confidence >= CONFIDENCE_TIERS.auto.min) return 'text-emerald-600';
  if (confidence >= CONFIDENCE_TIERS.review.min) return 'text-amber-600';
  return 'text-red-600';
};

const confidenceBadge = (confidence: number): string => {
  if (confidence >= CONFIDENCE_TIERS.auto.min) return 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50';
  if (confidence >= CONFIDENCE_TIERS.review.min) return 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50';
  return 'border-red-200 bg-red-50 text-red-700 hover:bg-red-50';
};

const tierMeta: Record<'auto' | 'review' | 'manual', { label: string; hint: string }> = {
  auto: { label: 'مطابقة تلقائية', hint: 'يمكن تأكيد التطابق بضغطة واحدة.' },
  review: { label: 'يحتاج مراجعة', hint: 'راجع التطابق المقترح قبل التأكيد.' },
  manual: { label: 'مراجعة يدوية', hint: 'لم يُعثر على تطابق موثوق — اربط الفاتورة يدوياً.' },
};

const IntelligentInvoiceScanner: React.FC<InvoiceScannerProps> = ({
  onScanComplete,
  className = ''
}) => {
  const { t } = useFleetifyTranslation('ui');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ocrEngine, setOcrEngine] = useState<OcrEngine>('gemini');
  const [language, setLanguage] = useState<ProcessingLanguage>('auto');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('upload');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<'idle' | 'confirmed'>('idle');
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [enablePreprocessing, setEnablePreprocessing] = useState(true);
  const [preprocessingOptions, setPreprocessingOptions] = useState({
    enhanceContrast: true,
    reduceNoise: true,
    sharpenText: true,
    normalizeSize: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { addJob, getJob } = useBackgroundQueue();

  useEffect(() => {
    if (scanResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scanResult]);

  const runOcr = useCallback(async (base64: string, fileName: string) => {
    const { data, error } = await supabase.functions.invoke('scan-invoice', {
      body: { imageBase64: base64, fileName, ocrEngine, language }
    });

    if (error) {
      throw new Error(error.message || 'OCR processing failed');
    }
    if (!data.success) {
      throw new Error('Failed to process invoice');
    }

    const result: ScanResult = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      data: data.data,
      matching: data.matching || {
        all_matches: [],
        total_confidence: 0,
        name_similarity: 0,
        car_match_score: 0,
        context_match_score: 0
      },
      processing_info: data.data.processing_info || {
        ocr_engine: ocrEngine,
        language_detected: language,
        ocr_confidence: 0
      }
    };
    return result;
  }, [ocrEngine, language]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'خطأ في نوع الملف',
        description: 'يرجى اختيار ملف صورة صالح',
        variant: 'destructive'
      });
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setConfirmState('idle');
    setShowAllMatches(false);
    setProgress(8);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 6, 90));
    }, 600);

    try {
      let processedFile = file;

      if (enablePreprocessing) {
        try {
          const result = await preprocessImage(file, preprocessingOptions);
          processedFile = result.processedFile;
        } catch (error) {
          console.warn('Image preprocessing failed, using original:', error);
        }
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(processedFile);
      });

      setSelectedImage(base64);

      const result = await runOcr(base64, file.name);

      setProgress(100);
      setScanResult(result);
      onScanComplete?.(result);

      const tier = getMatchTier(result.matching.total_confidence);
      if (tier === 'auto') {
        toast({
          title: 'تم التطابق التلقائي',
          description: `تم تعيين الفاتورة تلقائياً للعميل: ${result.matching.best_match?.name ?? 'غير معروف'}`,
          variant: 'default'
        });
      } else if (tier === 'review') {
        toast({
          title: 'يحتاج مراجعة',
          description: 'تم إيجاد تطابقات محتملة، يرجى المراجعة',
          variant: 'default'
        });
      } else {
        toast({
          title: 'مراجعة يدوية مطلوبة',
          description: 'لم يتم إيجاد تطابق موثوق، يرجى المراجعة اليدوية',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error scanning invoice:', error);
      toast({
        title: 'خطأ في المسح',
        description: error instanceof Error ? error.message : 'فشل في معالجة الصورة',
        variant: 'destructive'
      });
    } finally {
      clearInterval(progressInterval);
      setIsScanning(false);
    }
  }, [enablePreprocessing, preprocessingOptions, runOcr, onScanComplete, toast]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    e.target.value = '';
  };

  const handleBulkUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const limitedFiles = files.slice(0, MAX_BULK_FILES);

    toast({
      title: t('bulkProcessingStarted'),
      description: `تمت إضافة ${bulkCountLabel(limitedFiles.length)} إلى قائمة المعالجة في الخلفية`,
      variant: 'default'
    });

    try {
      const processedFiles = await Promise.all(limitedFiles.map((file) =>
        new Promise<{ name: string; base64: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({ name: file.name, base64: e.target?.result as string });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
      ));

      const jobId = addJob('batch_scan', {
        files: processedFiles,
        options: { ocrEngine, language }
      }, 'high');

      const monitorInterval = setInterval(() => {
        const job = getJob(jobId);
        if (!job) return;
        if (job.status === 'completed') {
          clearInterval(monitorInterval);
          toast({
            title: 'اكتملت المعالجة المتعددة',
            description: `تمت معالجة ${jobId ? '' : ''}الدفعة بنجاح`,
            variant: 'default'
          });
        } else if (job.status === 'failed') {
          clearInterval(monitorInterval);
          toast({
            title: t('batchProcessingFailed'),
            description: job.error || 'حدث خطأ غير معروف',
            variant: 'destructive'
          });
        }
      }, 2000);

      setTimeout(() => clearInterval(monitorInterval), 10 * 60 * 1000);
    } catch (error) {
      toast({
        title: t('errorProcessingFiles'),
        description: error instanceof Error ? error.message : 'Failed to process files',
        variant: 'destructive'
      });
    }
  }, [ocrEngine, language, addJob, getJob, toast, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const resetScanner = () => {
    setScanResult(null);
    setSelectedImage(null);
    setConfirmState('idle');
    setShowAllMatches(false);
    setProgress(0);
  };

  const modeTabs: { id: CaptureMode; label: string; icon: typeof Upload; hint: string }[] = [
    { id: 'upload', label: 'رفع صورة', icon: Upload, hint: 'اسحب الصورة هنا أو انقر للاختيار' },
    { id: 'bulk', label: 'رفع متعدد', icon: Files, hint: 'حتى 10 فواتير تُعالج في الخلفية' },
    { id: 'camera', label: 'كاميرا', icon: Camera, hint: 'التقاط مباشر مع تحسين تلقائي' },
  ];

  const progressSteps = [
    { threshold: 25, label: 'تحليل الصورة وتحسينها' },
    { threshold: 50, label: 'استخراج النص بالذكاء الاصطناعي' },
    { threshold: 75, label: 'مطابقة العملاء' },
    { threshold: 100, label: 'إنهاء المعالجة' },
  ];
  const currentStepLabel = progressSteps.find((step) => progress < step.threshold)?.label ?? progressSteps[progressSteps.length - 1].label;

  const resultTier = scanResult ? getMatchTier(scanResult.matching.total_confidence) : 'manual';

  const extractedFields = scanResult
    ? [
        { icon: User, label: 'اسم العميل', value: scanResult.data.customer_name },
        { icon: Car, label: 'رقم المركبة', value: scanResult.data.car_number },
        { icon: Banknote, label: 'المبلغ', value: scanResult.data.total_amount ? `${scanResult.data.total_amount} ر.ق` : undefined },
        { icon: Calendar, label: 'تاريخ الفاتورة', value: scanResult.data.invoice_date },
        { icon: ScanLine, label: 'رقم الفاتورة', value: scanResult.data.invoice_number },
        { icon: Languages, label: 'اللغة', value: scanResult.data.language_detected },
      ].filter((field): field is { icon: typeof User; label: string; value: string } => Boolean(field.value))
    : [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Capture */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-wrap gap-2 border-b border-[var(--finance-border)] p-4">
            {modeTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setCaptureMode(id)}
                aria-pressed={captureMode === id}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  captureMode === id
                    ? 'bg-[#14675e] text-white'
                    : 'border border-[var(--finance-border)] bg-[var(--finance-paper)] text-[var(--finance-muted)] hover:bg-[var(--finance-wash)]'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          {captureMode === 'upload' && (
            <div
              className="flex cursor-pointer flex-col items-center gap-3 px-6 py-12 text-center transition-colors hover:bg-[var(--finance-wash)]"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--finance-wash)] text-[var(--finance-accent)]">
                <Upload className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <p className="text-base font-semibold">اسحب صورة الفاتورة وأفلتها هنا</p>
                <p className="mt-1 text-sm text-[var(--finance-muted)]">أو انقر لاختيار ملف — PNG أو JPG أو JPEG</p>
              </div>
              <Button variant="outline" className="pointer-events-none">
                اختيار صورة
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="اختيار صورة فاتورة"
              />
            </div>
          )}

          {captureMode === 'bulk' && (
            <div className="space-y-4 p-6">
              <div
                className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--finance-border)] px-6 py-10 text-center transition-colors hover:bg-[var(--finance-wash)]"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) {
                      handleBulkUpload(Array.from(files));
                    }
                  };
                  input.click();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    (e.currentTarget as HTMLElement).click();
                  }
                }}
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--finance-wash)] text-[var(--finance-accent)]">
                  <Files className="h-7 w-7" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-base font-semibold">رفع عدة فواتير معاً</p>
                  <p className="mt-1 text-sm text-[var(--finance-muted)]">حتى {MAX_BULK_FILES} صور تُعالج في الخلفية دفعة واحدة</p>
                </div>
                <Button variant="outline" className="pointer-events-none">
                  اختيار عدة صور
                </Button>
              </div>
              <ul className="grid gap-2 text-sm text-[var(--finance-muted)] sm:grid-cols-2">
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--finance-accent)]" aria-hidden="true" /> معالجة خلفية دون تعطيل الصفحة</li>
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--finance-accent)]" aria-hidden="true" /> إشعار فوري عند اكتمال الدفعة</li>
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--finance-accent)]" aria-hidden="true" /> تجميع النتائج في تقرير واحد</li>
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--finance-accent)]" aria-hidden="true" /> حفظ تلقائي للفواتير عالية الثقة</li>
              </ul>
            </div>
          )}

          {captureMode === 'camera' && (
            <div className="p-6">
              <EnhancedMobileCamera
                onImageCapture={handleImageUpload}
                isProcessing={isScanning}
                enablePreprocessing={enablePreprocessing}
                preprocessingOptions={preprocessingOptions}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {isScanning && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-[var(--finance-accent)]" aria-hidden="true" />
                <span className="text-sm font-semibold">جاري معالجة الصورة…</span>
              </div>
              <span className="text-sm font-bold tabular-nums text-[var(--finance-accent)]">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" aria-label="تقدم المعالجة" />
            <p className="text-center text-xs text-[var(--finance-muted)]">{currentStepLabel}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {scanResult && (
        <div ref={resultRef} className="space-y-4">
          {/* Confidence summary */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-5">
              <div className="flex-1 min-w-40">
                <p className="text-xs text-[var(--finance-muted)]">دقة التعرف الضوئي (OCR)</p>
                <p className={`text-2xl font-bold tabular-nums ${confidenceTone(scanResult.processing_info.ocr_confidence)}`}>
                  {scanResult.processing_info.ocr_confidence}%
                </p>
              </div>
              <div className="h-10 w-px bg-[var(--finance-border)]" aria-hidden="true" />
              <div className="flex-1 min-w-40">
                <p className="text-xs text-[var(--finance-muted)]">دقة التطابق مع العميل</p>
                <p className={`text-2xl font-bold tabular-nums ${confidenceTone(scanResult.matching.total_confidence)}`}>
                  {Math.round(scanResult.matching.total_confidence)}%
                </p>
              </div>
              <div className="ms-auto">
                <Badge className={`gap-1 ${confidenceBadge(scanResult.matching.total_confidence)}`}>
                  {resultTier === 'auto' && <Check className="h-3 w-3" aria-hidden="true" />}
                  {resultTier === 'review' && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                  {tierMeta[resultTier].label}
                </Badge>
                <p className="mt-1 max-w-56 text-xs text-[var(--finance-muted)]">{tierMeta[resultTier].hint}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Extracted data */}
            <Card>
              <CardContent className="space-y-4 p-5">
                <h3 className="text-sm font-bold">البيانات المستخرجة</h3>
                {extractedFields.length === 0 ? (
                  <p className="text-sm text-[var(--finance-muted)]">لم يتم استخراج حقول قابلة للعرض من هذه الصورة.</p>
                ) : (
                  <dl className="grid gap-3">
                    {extractedFields.map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--finance-wash)] text-[var(--finance-accent)]">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <dt className="text-xs text-[var(--finance-muted)]">{label}</dt>
                          <dd className="truncate text-sm font-semibold">{value}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                )}
                {scanResult.data.notes && (
                  <div>
                    <Label className="text-xs text-[var(--finance-muted)]">ملاحظات</Label>
                    <p className="mt-1 rounded-lg bg-[var(--finance-wash)] p-3 text-sm leading-6">{scanResult.data.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Best match + image preview */}
            <Card>
              <CardContent className="space-y-4 p-5">
                <h3 className="text-sm font-bold">التطابق المقترح</h3>
                {scanResult.matching.best_match ? (
                  <div className="rounded-xl border border-[var(--finance-border)] bg-[var(--finance-wash)] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">{scanResult.matching.best_match.name}</p>
                      <Badge className={confidenceBadge(scanResult.matching.best_match.confidence)}>
                        {Math.round(scanResult.matching.best_match.confidence)}% ثقة
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-[var(--finance-muted)]">
                      {scanResult.matching.best_match.phone && (
                        <p>الهاتف: {scanResult.matching.best_match.phone}</p>
                      )}
                      {scanResult.matching.best_match.car_number && (
                        <p>رقم المركبة: {scanResult.matching.best_match.car_number}</p>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {scanResult.matching.best_match.match_reasons.map((reason, index) => (
                        <Badge key={index} variant="outline" className="text-xs font-normal">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--finance-muted)]">لا يوجد تطابق مقترح لهذه الفاتورة.</p>
                )}

                {scanResult.matching.all_matches.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAllMatches((prev) => !prev)}
                      className="inline-flex items-center gap-2 text-sm font-medium text-[var(--finance-accent)] hover:underline"
                      aria-expanded={showAllMatches}
                    >
                      <Users className="h-4 w-4" aria-hidden="true" />
                      {showAllMatches ? 'إخفاء' : 'عرض'} جميع التطابقات ({scanResult.matching.all_matches.length})
                    </button>
                    {showAllMatches && (
                      <ul className="mt-3 space-y-2">
                        {scanResult.matching.all_matches.map((match, index) => (
                          <li key={match.id ?? index} className="flex items-center justify-between rounded-lg border border-[var(--finance-border)] px-3 py-2 text-sm">
                            <span className="truncate">{match.name}</span>
                            <Badge variant="outline" className="text-xs font-normal tabular-nums">
                              {Math.round(match.confidence ?? 0)}%
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {selectedImage && (
                  <div className="flex justify-center">
                    <LazyImage
                      src={selectedImage}
                      alt="معاينة الفاتورة"
                      className="max-h-72 w-full rounded-lg object-contain"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-5">
              {resultTier === 'auto' ? (
                confirmState === 'confirmed' ? (
                  <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    تم تأكيد التطابق
                  </Badge>
                ) : (
                  <Button onClick={() => setConfirmState('confirmed')} className="gap-2">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    تأكيد التطابق التلقائي
                  </Button>
                )
              ) : (
                <Badge variant="outline" className="gap-1 text-[var(--finance-muted)]">
                  <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  مراجعة يدوية مطلوبة — راجع التطابق المقترح أعلاه
                </Badge>
              )}
              <Button variant="outline" onClick={resetScanner} className="gap-2">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                مسح فاتورة جديدة
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Card>
          <CollapsibleTrigger className="flex w-full items-center justify-between p-4">
            <span className="text-sm font-bold">إعدادات المسح</span>
            <ChevronDown
              className={`h-4 w-4 text-[var(--finance-muted)] transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-5 border-t border-[var(--finance-border)] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>محرك التعرف الضوئي</Label>
                  <Select
                    value={ocrEngine}
                    onValueChange={(value: unknown) => {
                      if (isOcrEngine(value)) setOcrEngine(value);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">جيميني فلاش 2.5 (للقراءة اليدوية)</SelectItem>
                      <SelectItem value="google-vision">{t('googleVisionApi')}</SelectItem>
                      <SelectItem value="hybrid">هجين (أعلى دقة)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>لغة المعالجة</Label>
                  <Select
                    value={language}
                    onValueChange={(value: unknown) => {
                      if (isProcessingLanguage(value)) setLanguage(value);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">تلقائي</SelectItem>
                      <SelectItem value="arabic">العربية</SelectItem>
                      <SelectItem value="english">الإنجليزية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--finance-border)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>تحسين جودة الصورة تلقائياً</Label>
                    <p className="mt-0.5 text-xs text-[var(--finance-muted)]">يزيد التباين ويوضح النص قبل القراءة لتحسين الدقة.</p>
                  </div>
                  <Switch checked={enablePreprocessing} onCheckedChange={setEnablePreprocessing} aria-label="تفعيل التحسين التلقائي" />
                </div>

                {enablePreprocessing && (
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    {([
                      { key: 'enhanceContrast', label: 'تحسين التباين' },
                      { key: 'sharpenText', label: 'توضيح النص' },
                      { key: 'reduceNoise', label: 'إزالة التشويش' },
                      { key: 'normalizeSize', label: 'تطبيع الحجم' },
                    ] as const).map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={preprocessingOptions[key]}
                          onChange={(e) => setPreprocessingOptions((prev) => ({ ...prev, [key]: e.target.checked }))}
                          className="rounded"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default IntelligentInvoiceScanner;