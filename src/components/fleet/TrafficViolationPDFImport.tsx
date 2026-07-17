import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable'
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
  Building,
  Eye,
  User,
  Copy,
  ArrowRight,
  Database,
  Edit3,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { PDFViewer } from './PDFViewer';
import { TrafficViolationStats } from './TrafficViolationStats';
import { ViolationImportReport } from './ViolationImportReport';
import { format } from 'date-fns';
import {
  ExtractedViolation,
  MatchedViolation,
  ImportProcessingResult,
  PDFHeaderData,
  ImportSource,
  MATCH_CONFIDENCE_LABELS,
  MATCH_CONFIDENCE_COLORS
} from '@/types/violations';
import { useViolationMatching, useViolationSave, useViolationEnrichment, EnrichableViolation } from '@/hooks/useViolationMatching';
import { loadPDFWorker } from '@/lib/pdfWorker';
import { joinPDFTextItems } from '@/utils/pdfTextExtraction';
import { formatViolationDate, normalizeViolationDate } from '@/utils/violationDate';
import { attachTrafficViolationSourceDocuments } from '@/services/trafficViolationDocumentService';
import {
  clearTrafficViolationImportSession,
  loadTrafficViolationImportSession,
  saveTrafficViolationImportFiles,
  saveTrafficViolationImportState,
  type TrafficViolationImportTab,
  type TrafficViolationReviewFilter,
} from '@/utils/trafficViolationImportSession';

import { useFleetifyTranslation } from "@/hooks/useTranslation";

type ReviewFilter = TrafficViolationReviewFilter;

const matchesReviewFilter = (violation: MatchedViolation, filter: ReviewFilter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'matched') return violation.status === 'matched' && !violation.is_duplicate;
  if (filter === 'duplicates') return Boolean(violation.is_duplicate);
  if (filter === 'partial') return violation.status === 'partial' && !violation.is_duplicate;
  return violation.status === 'error' && !violation.is_duplicate;
};

export const TrafficViolationPDFImport: React.FC = () => {
  const { t } = useFleetifyTranslation("ui");
  const [activeTab, setActiveTab] = useState<TrafficViolationImportTab>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ImportProcessingResult | null>(null);
  const [selectedViolations, setSelectedViolations] = useState<Set<string>>(new Set());
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeImportSource, setActiveImportSource] = useState<ImportSource>('moi_pdf');
  
  // Enrichment state - لإكمال البيانات الناقصة
  const [enrichableViolations, setEnrichableViolations] = useState<EnrichableViolation[]>([]);
  const [selectedEnrichments, setSelectedEnrichments] = useState<Set<string>>(new Set());
  const [isSessionReady, setIsSessionReady] = useState(false);
  const restoredCompanyRef = useRef<string | null>(null);

  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  const { processViolations, isProcessing: isMatching } = useViolationMatching({
    companyId: companyId || '',
    autoLink: true,
    checkDuplicates: true
  });
  const { saveViolations, isSaving } = useViolationSave();
  const { findEnrichableViolations, enrichViolations, isSearching, isEnriching } = useViolationEnrichment();

  useEffect(() => {
    if (!companyId) {
      restoredCompanyRef.current = null;
      setIsSessionReady(false);
      return;
    }

    let cancelled = false;
    restoredCompanyRef.current = null;
    setIsSessionReady(false);

    void loadTrafficViolationImportSession(companyId)
      .then(async ({ state, files, requiresRematch }) => {
        if (cancelled) return;

        setUploadedFiles(files);
        let restoredResult = state?.processingResult || null;
        let restoredSelection = state?.selectedViolationIds || [];

        if (requiresRematch && restoredResult) {
          setIsProcessing(true);
          try {
            const rematchedResult = await processViolations(restoredResult.violations);
            rematchedResult.header = restoredResult.header;
            restoredResult = rematchedResult;
            restoredSelection = rematchedResult.violations
              .filter(violation => violation.status === 'matched' && !violation.is_duplicate)
              .map(violation => violation.id);
          } catch (error) {
            console.error('[TrafficViolationPDFImport] Failed to refresh restored matches:', error);
            restoredResult = null;
            restoredSelection = [];
          } finally {
            setIsProcessing(false);
          }
        }

        if (cancelled) return;

        setProcessingResult(restoredResult);
        setSelectedViolations(new Set(restoredSelection));
        setReviewFilter(state?.reviewFilter || 'all');
        setActiveImportSource(state?.activeImportSource || 'moi_pdf');
        setEnrichableViolations(state?.enrichableViolations || []);
        setSelectedEnrichments(new Set(state?.selectedEnrichmentIds || []));

        if (restoredResult) {
          setActiveTab(state?.activeTab || 'review');
        } else if (files.length > 0) {
          setActiveTab('process');
        } else {
          setActiveTab('upload');
        }
      })
      .catch(error => {
        console.error('[TrafficViolationPDFImport] Failed to restore import session:', error);
      })
      .finally(() => {
        if (cancelled) return;
        restoredCompanyRef.current = companyId;
        setIsSessionReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, processViolations]);

  useEffect(() => {
    if (!companyId || !isSessionReady || restoredCompanyRef.current !== companyId) return;

    void saveTrafficViolationImportFiles(companyId, uploadedFiles).catch(error => {
      console.error('[TrafficViolationPDFImport] Failed to save imported files:', error);
    });
  }, [companyId, isSessionReady, uploadedFiles]);

  useEffect(() => {
    if (!companyId || !isSessionReady || restoredCompanyRef.current !== companyId) return;

    void saveTrafficViolationImportState(companyId, {
      activeTab,
      processingResult,
      selectedViolationIds: [...selectedViolations],
      reviewFilter,
      activeImportSource,
      enrichableViolations,
      selectedEnrichmentIds: [...selectedEnrichments],
    }).catch(error => {
      console.error('[TrafficViolationPDFImport] Failed to save import session:', error);
    });
  }, [
    activeImportSource,
    activeTab,
    companyId,
    enrichableViolations,
    isSessionReady,
    processingResult,
    reviewFilter,
    selectedEnrichments,
    selectedViolations,
  ]);

  // Extract text from PDF using pdf.js
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const pdfjsLib = await loadPDFWorker();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    console.log(`📄 Extracting text from PDF: ${pdf.numPages} pages`);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = joinPDFTextItems(textContent.items);
      fullText += pageText + '\n\n';
    }

    return fullText.trim();
  };

  // Convert PDF to images (fallback if text extraction fails)
  const convertPDFToImages = async (file: File): Promise<File[]> => {
    const pdfjsLib = await loadPDFWorker();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: File[] = [];

    console.log(`📄 Converting PDF to images: ${pdf.numPages} pages`);

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

  // Extract data from PDF file using regex parser (fast, reliable)
  const extractDataFromPDF = async (file: File): Promise<{
    header?: PDFHeaderData;
    violations: ExtractedViolation[];
  }> => {
    try {
      // If PDF file
      if (file.type === 'application/pdf') {
        toast({
          title: '📄 Reading PDF file...',
          description: t("extractingTextFromFile"),
        });

        // Extract text from PDF
        let pdfText = '';
        try {
          pdfText = await extractTextFromPDF(file);
          console.log(`📝 Extracted ${pdfText.length} characters from PDF`);
        } catch (textError) {
          console.error('Error extracting text from PDF:', textError);
        }

        // If we have enough text, use regex parser (fast, no batching needed)
        if (pdfText.length > 50) {
          toast({
            title: '✅ Text extracted',
            description: `Processing ${pdfText.length} characters with regex parser...`,
          });

          // Use the new regex endpoint - processes entire PDF in milliseconds
          console.log('📤 Using regex parser for extraction...');
          const { data, error } = await supabase.functions.invoke('extract-traffic-violations/extract-regex', {
            body: {
              pdf_text: pdfText
            }
          });

          if (error) {
            console.error('Error from regex parser:', error);
            throw new Error('FALLBACK_TO_IMAGES');
          }

          if (!data?.success) {
            console.warn('Regex parser failed, falling back to images:', data?.error);
            throw new Error('FALLBACK_TO_IMAGES');
          }

          const regexViolations: ExtractedViolation[] = data.violations || [];
          const completeViolations = regexViolations.filter((violation) =>
            Boolean(
              violation.violation_number &&
              violation.plate_number &&
              violation.date &&
              violation.violation_type &&
              Number.isFinite(Number(violation.fine_amount)) &&
              Number(violation.fine_amount) >= 0
            )
          );
          const completenessRatio = regexViolations.length > 0
            ? completeViolations.length / regexViolations.length
            : 0;

          if (completenessRatio < 0.95) {
            console.warn('Regex parser returned incomplete violation data; falling back to images', {
              extracted: regexViolations.length,
              complete: completeViolations.length,
              completenessRatio,
            });
            throw new Error('FALLBACK_TO_IMAGES');
          }

          console.log(`✅ Regex parser extracted ${regexViolations.length} violations`);
          return {
            header: data.header,
            violations: regexViolations
          };
        } else {
          // Not enough text, use images
          console.log('⚠️ Not enough text, converting to images...');
          throw new Error('FALLBACK_TO_IMAGES');
        }

      } else {
        // Image file - send directly
        const formData = new FormData();
        formData.append('file', file);

        const { data, error } = await supabase.functions.invoke('extract-traffic-violations', {
          body: formData
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.details || 'Failed to extract data');

        return {
          header: data.header,
          violations: data.violations
        };
      }

    } catch (err: any) {
      // Fallback: convert PDF to images if text extraction failed
      if (err.message === 'FALLBACK_TO_IMAGES' && file.type === 'application/pdf') {
        toast({
          title: '📸 Converting PDF to images...',
          description: t("convertingFileToImages"),
        });

        const images = await convertPDFToImages(file);
        toast({
          title: '✅ Conversion complete',
          description: `Converted ${images.length} pages`,
        });

        let allViolations: ExtractedViolation[] = [];
        let header: PDFHeaderData | undefined;

        for (const imageFile of images) {
          const formData = new FormData();
          formData.append('file', imageFile);

          const { data, error } = await supabase.functions.invoke('extract-traffic-violations', {
            body: formData
          });

          if (error || !data?.success) {
            console.warn('Error processing image:', error || data?.details);
            continue;
          }

          // Merge violations from all pages
          if (!header && data.header) {
            header = data.header;
          }
          allViolations = [...allViolations, ...data.violations];
        }

        return { header, violations: allViolations };
      }

      throw err;
    }
  };

  const isExcelFile = (file: File) => {
    const name = file.name.toLowerCase();
    return (
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
  };

  const normalizeHeader = (value: unknown) =>
    String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizePlate = (value: unknown) => {
    const raw = String(value ?? '').trim();
    return raw ? raw.padStart(Math.min(Math.max(raw.length, 6), 6), '0') : '';
  };

  const normalizeExcelDate = (value: unknown): string => {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return format(value, 'yyyy-MM-dd');
    }

    if (typeof value === 'number') {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      epoch.setUTCDate(epoch.getUTCDate() + value);
      return format(epoch, 'yyyy-MM-dd');
    }

    const raw = String(value).trim();
    if (!raw) return '';
    return normalizeViolationDate(raw) || raw;
  };

  const extractDataFromExcel = async (file: File): Promise<{
    header?: PDFHeaderData;
    violations: ExtractedViolation[];
  }> => {
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    const targetSheetName =
      workbook.SheetNames.find((name) => name.trim() === 'جميع المخالفات') ||
      workbook.SheetNames.find((name) => {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, defval: '' });
        const header = (rows[0] || []).map(normalizeHeader);
        return header.includes('رقم المركبة') && header.includes('رقم المخالفة') && header.includes('التاريخ');
      });

    if (!targetSheetName) {
      throw new Error('لم يتم العثور على صفحة "جميع المخالفات" أو صفحة تحتوي الأعمدة المطلوبة.');
    }

    const worksheet = workbook.Sheets[targetSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });
    const violations: ExtractedViolation[] = [];
    const seenNumbers = new Set<string>();

    for (const row of rows) {
      const plate = normalizePlate(row['رقم المركبة']);
      const violationNumber = String(row['رقم المخالفة'] ?? '').trim();
      const date = normalizeExcelDate(row['التاريخ']);
      const amount = Number(String(row['قيمة الغرامة'] ?? '0').replace(/[^\d.-]/g, '')) || 0;
      const points = String(row['النقاط'] ?? '').trim();

      if (!plate || !violationNumber || !date || amount <= 0) continue;
      if (seenNumbers.has(violationNumber)) continue;
      seenNumbers.add(violationNumber);

      violations.push({
        violation_number: violationNumber,
        reference_number: violationNumber,
        date,
        plate_number: plate,
        violation_type: 'مخالفة مرورية',
        violation_description: points ? `مخالفة مرورية - النقاط: ${points}` : 'مخالفة مرورية',
        fine_amount: amount,
        total_amount: amount,
        issuing_authority: 'تقرير Excel',
      });
    }

    return {
      header: {
        file_number: file.name,
        total_violations: violations.length,
        total_amount: violations.reduce((sum, violation) => sum + violation.fine_amount, 0),
      },
      violations,
    };
  };

  // Process uploaded files
  const processFiles = async () => {
    if (!companyId) {
      toast({ title: t("error"), description: 'تعذر تحديد الشركة', variant: 'destructive' });
      return;
    }
    if (uploadedFiles.length === 0) {
      toast({
        title: t("error"),
        description: t("pleaseUploadAFile"),
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      let allViolations: ExtractedViolation[] = [];
      let header: PDFHeaderData | undefined;
      let detectedImportSource: ImportSource = 'moi_pdf';

      // Extract data from all files
      for (const [fileIndex, file] of uploadedFiles.entries()) {
        try {
          const extracted = isExcelFile(file)
            ? await extractDataFromExcel(file)
            : await extractDataFromPDF(file);
          if (isExcelFile(file)) {
            detectedImportSource = 'bulk_import';
          }
          if (extracted.header) {
            header = extracted.header;
          }
          const sourceFileKey = `${fileIndex}:${file.name}:${file.size}:${file.lastModified}`;
          allViolations = [
            ...allViolations,
            ...extracted.violations.map(violation => ({
              ...violation,
              date: normalizeViolationDate(violation.date) || violation.date,
              source_file_key: sourceFileKey,
              source_file_name: file.name,
            })),
          ];
        } catch (error: unknown) {
          console.error(`Failed to process file ${file.name}:`, error);
          toast({
            title: t("warning"),
            description: `Failed to process file ${file.name}: ${error instanceof Error ? error.message : String(error)}`,
            variant: "destructive"
          });
        }
      }

      if (allViolations.length === 0) {
        throw new Error('No violations found in the uploaded files');
      }

      const uniqueViolations = Array.from(
        new Map(allViolations.map((violation) => [violation.violation_number, violation])).values()
      );
      setActiveImportSource(detectedImportSource);

      // Process violations: match and check duplicates
      const result = await processViolations(uniqueViolations);

      // Add header data to result
      result.header = header;

      setProcessingResult(result);
      setReviewFilter('all');
      setSelectedViolations(new Set(
        result.violations
          .filter(v => v.status === 'matched' && !v.is_duplicate)
          .map(v => v.id)
      ));
      setActiveTab('review');
      toast({
        title: 'تم استخراج البيانات بنجاح',
        description: `تم استخراج ${result.total_extracted} مخالفة: ${result.successful_matches} جاهزة، ${result.duplicates_found} مكررة، ${result.partial_matches + result.errors} تحتاج مراجعة.`,
      });

      // البحث عن المخالفات الموجودة التي يمكن إكمال بياناتها
      if (companyId && uniqueViolations.length > 0) {
        const enrichmentResult = await findEnrichableViolations(uniqueViolations, companyId);
        if (enrichmentResult.enrichable_count > 0) {
          setEnrichableViolations(enrichmentResult.enrichable_violations);
          setSelectedEnrichments(new Set(enrichmentResult.enrichable_violations.map(v => v.existingViolation.id)));
          toast({
            title: "تم العثور على بيانات ناقصة",
            description: `يمكن إكمال ${enrichmentResult.enrichable_count} مخالفة موجودة بالبيانات من الملف`,
          });
        }
      }

    } catch (error: unknown) {
      toast({
        title: t("processingError"),
        description: `Failed to process files: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // حفظ البيانات الناقصة للمخالفات الموجودة
  const saveEnrichments = async () => {
    if (selectedEnrichments.size === 0) {
      toast({
        title: "خطأ",
        description: "الرجاء تحديد المخالفات المراد تحديثها",
        variant: "destructive"
      });
      return;
    }

    const violationsToEnrich = enrichableViolations.filter(v =>
      selectedEnrichments.has(v.existingViolation.id)
    );

    const result = await enrichViolations(violationsToEnrich);

    toast({
      title: "تم التحديث بنجاح",
      description: `تم تحديث ${result.success} مخالفة${result.failed > 0 ? ` (فشل ${result.failed})` : ''}`,
    });

    if (result.success > 0) {
      // إزالة المخالفات المحدثة من القائمة
      setEnrichableViolations(prev => 
        prev.filter(v => !selectedEnrichments.has(v.existingViolation.id))
      );
      setSelectedEnrichments(new Set());
    }
  };

  // Toggle enrichment selection
  const toggleEnrichmentSelection = (violationId: string) => {
    setSelectedEnrichments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(violationId)) {
        newSet.delete(violationId);
      } else {
        newSet.add(violationId);
      }
      return newSet;
    });
  };

  // Select/deselect all enrichments
  const toggleSelectAllEnrichments = () => {
    if (selectedEnrichments.size === enrichableViolations.length) {
      setSelectedEnrichments(new Set());
    } else {
      setSelectedEnrichments(new Set(enrichableViolations.map(v => v.existingViolation.id)));
    }
  };

  // Save selected violations
  const saveSelectedViolations = async () => {
    if (!companyId) {
      toast({ title: t("error"), description: 'تعذر تحديد الشركة', variant: 'destructive' });
      return;
    }
    if (!processingResult) {
      toast({
        title: t("error"),
        description: t("pleaseSelectViolationsTo"),
        variant: "destructive"
      });
      return;
    }

    const violationsToSave = processingResult.violations.filter(v =>
      selectedViolations.has(v.id) && v.status === 'matched' && !v.is_duplicate
    );
    const violationsForDocuments = processingResult.violations.filter(v =>
      Boolean(v.contract_id) && v.status !== 'error' &&
      (Boolean(v.is_duplicate) || selectedViolations.has(v.id))
    );

    if (violationsToSave.length === 0 && violationsForDocuments.length === 0) {
      toast({
        title: t("error"),
        description: 'لا توجد مخالفات مرتبطة بعقود لحفظها أو إرفاق التقرير بها.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await attachTrafficViolationSourceDocuments({
        companyId,
        files: uploadedFiles,
        violations: violationsForDocuments,
        fileNumber: processingResult.header?.file_number,
      });
    } catch (error) {
      console.error('[TrafficViolationPDFImport] Failed to attach MOI reports:', error);
      toast({
        title: 'تعذر إرفاق تقرير وزارة الداخلية',
        description: 'لم يتم حفظ المخالفات حتى لا يبقى العقد دون نسخة من التقرير. حاول مرة أخرى.',
        variant: 'destructive',
      });
      return;
    }

    if (violationsToSave.length === 0) {
      await clearTrafficViolationImportSession(companyId);
      setProcessingResult(null);
      setUploadedFiles([]);
      setSelectedViolations(new Set());
      setReviewFilter('all');
      setActiveTab('upload');
      setEnrichableViolations([]);
      setSelectedEnrichments(new Set());
      toast({
        title: 'تم ربط تقرير وزارة الداخلية',
        description: 'أُرفقت نسخة التقرير بالعقود المطابقة دون إنشاء مخالفات مكررة.',
      });
      return;
    }

    const result = await saveViolations(
      violationsToSave,
      companyId,
      activeImportSource,
      processingResult.header?.file_number
    );

    toast({
      title: t("savedSuccessfully"),
      description: `Saved ${result.success} violations to the system${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
    });

    if (result.success > 0) {
      await clearTrafficViolationImportSession(companyId).catch(error => {
        console.error('[TrafficViolationPDFImport] Failed to clear completed import session:', error);
      });

      // Reset data
      setProcessingResult(null);
      setUploadedFiles([]);
      setSelectedViolations(new Set());
      setReviewFilter('all');
      setActiveTab('upload');
      setEnrichableViolations([]);
      setSelectedEnrichments(new Set());
    }
  };

  // Setup drag and drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const supportedFiles = acceptedFiles.filter(file =>
      file.type === 'application/pdf' ||
      file.type.startsWith('image/') ||
      isExcelFile(file)
    );

    if (supportedFiles.length !== acceptedFiles.length) {
      toast({
        title: t("warning"),
        description: t("onlyPdfAndImage"),
        variant: "destructive"
      });
    }

    setUploadedFiles(prev => [...prev, ...supportedFiles]);
    if (supportedFiles.length > 0) {
      setActiveTab('process');
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  });

  // Remove file
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle violation selection
  const toggleViolationSelection = (violationId: string) => {
    setSelectedViolations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(violationId)) {
        newSet.delete(violationId);
      } else {
        newSet.add(violationId);
      }
      return newSet;
    });
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (!processingResult) return;

    const matchableViolations = processingResult.violations.filter((violation) => {
      return matchesReviewFilter(violation, reviewFilter) &&
        violation.status === 'matched' &&
        !violation.is_duplicate;
    });

    const allVisibleSelected = matchableViolations.length > 0 && matchableViolations.every(
      v => selectedViolations.has(v.id)
    );

    setSelectedViolations((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        matchableViolations.forEach(v => next.delete(v.id));
      } else {
        matchableViolations.forEach(v => next.add(v.id));
      }
      return next;
    });
  };

  const filteredViolations = processingResult?.violations.filter(
    violation => matchesReviewFilter(violation, reviewFilter)
  ) || [];

  const visibleMatchableViolations = filteredViolations.filter(
      v => v.status === 'matched' && !v.is_duplicate
    );
  const allVisibleMatchableSelected = visibleMatchableViolations.length > 0 &&
    visibleMatchableViolations.every(v => selectedViolations.has(v.id));
  const canAttachUploadedReport = uploadedFiles.some(file =>
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  ) && Boolean(processingResult?.violations.some(violation =>
    Boolean(violation.contract_id) && violation.status !== 'error' &&
    (Boolean(violation.is_duplicate) || selectedViolations.has(violation.id))
  ));

  const filterCardClass = (filter: ReviewFilter) =>
    `h-full w-full cursor-pointer rounded-[inherit] text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
      reviewFilter === filter ? 'bg-primary/5' : 'hover:bg-muted/50'
    }`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6" />
            استيراد المخالفات المرورية
          </CardTitle>
          <CardDescription>
            ارفع ملف المخالفات بصيغة Excel أو PDF أو صورة، ثم راجع النتائج قبل الحفظ.
            <br />
            <span className="text-green-600 text-sm font-medium">
              عند رفع Excel سيتم قراءة صفحة "جميع المخالفات" فقط لمنع تكرار البيانات.
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="upload">رفع الملفات</TabsTrigger>
              <TabsTrigger value="process" disabled={uploadedFiles.length === 0}>
                معالجة البيانات
              </TabsTrigger>
              <TabsTrigger value="enrich" disabled={enrichableViolations.length === 0}>
                <Database className="h-4 w-4 ml-1" />
                إكمال البيانات ({enrichableViolations.length})
              </TabsTrigger>
              <TabsTrigger value="review" disabled={!processingResult}>المراجعة والحفظ</TabsTrigger>
              <TabsTrigger value="stats" disabled={!processingResult}>الإحصائيات</TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input {...getInputProps()} />
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                {isDragActive ? (
                  <p className="text-blue-600">{t("dragFilesHere")}</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">اسحب ملف المخالفات هنا أو اضغط للاختيار</p>
                    <p className="text-sm text-slate-500">يدعم Excel وPDF والصور</p>
                    <p className="mt-1 text-sm font-medium text-emerald-600">
                      يدعم أيضاً Excel: سيتم قراءة صفحة "جميع المخالفات" فقط.
                    </p>
                  </div>
                )}
              </div>

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">{t("uploadedFilesUploadedfileslength")}</h4>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {isExcelFile(file) ? (
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium">{file.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPreviewFile(file);
                            setIsPreviewOpen(true);
                          }}
                          className="h-6 w-6 p-0"
                          title="Preview file"
                          disabled={isExcelFile(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                          title="Delete file"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Process Tab */}
            <TabsContent value="process" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  سيتم استخراج بيانات المخالفات من الملف ثم ربطها تلقائياً بالمركبات والعقود والعملاء في النظام.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  onClick={processFiles}
                  disabled={isProcessing || isMatching || uploadedFiles.length === 0}
                  className="flex items-center gap-2"
                >
                  {(isProcessing || isMatching) ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {(isProcessing || isMatching) ? 'جاري المعالجة...' : 'بدء معالجة الملف'}
                </Button>
              </div>

              {(isProcessing || isMatching) && (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-lg font-medium">{t("extractingDataFromFiles")}</p>
                  <p className="text-sm text-slate-500 mt-2">{t("pleaseWaitThisMay")}</p>
                </div>
              )}
            </TabsContent>

            {/* Review & Save Tab */}
            <TabsContent value="review" className="space-y-4">
              {processingResult && (
                <>
                  {/* Header info */}
                  {processingResult.header && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{t("documentInformation")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">File Number:</span>
                            <p className="font-medium">{processingResult.header.file_number || '-'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Vehicle Plate:</span>
                            <p className="font-medium">{processingResult.header.vehicle_plate || '-'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Owner:</span>
                            <p className="font-medium">{processingResult.header.owner_name || '-'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Total Violations:</span>
                            <p className="font-medium">{processingResult.header.total_violations || '-'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Statistics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <Card className={reviewFilter === 'all' ? 'border-primary ring-1 ring-primary' : ''}>
                      <button
                        type="button"
                        className={filterCardClass('all')}
                        onClick={() => setReviewFilter('all')}
                        aria-pressed={reviewFilter === 'all'}
                      >
                        <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.total_extracted}</p>
                            <p className="text-sm text-slate-600">{t("total")}</p>
                          </div>
                        </div>
                        </CardContent>
                      </button>
                    </Card>

                    <Card className={reviewFilter === 'matched' ? 'border-primary ring-1 ring-primary' : ''}>
                      <button
                        type="button"
                        className={filterCardClass('matched')}
                        onClick={() => setReviewFilter('matched')}
                        aria-pressed={reviewFilter === 'matched'}
                      >
                        <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.successful_matches}</p>
                            <p className="text-sm text-slate-600">{t("matched")}</p>
                          </div>
                        </div>
                        </CardContent>
                      </button>
                    </Card>

                    <Card className={reviewFilter === 'duplicates' ? 'border-primary ring-1 ring-primary' : ''}>
                      <button
                        type="button"
                        className={filterCardClass('duplicates')}
                        onClick={() => setReviewFilter('duplicates')}
                        aria-pressed={reviewFilter === 'duplicates'}
                      >
                        <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Copy className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.duplicates_found}</p>
                            <p className="text-sm text-slate-600">{t("duplicates")}</p>
                          </div>
                        </div>
                        </CardContent>
                      </button>
                    </Card>

                    <Card className={reviewFilter === 'partial' ? 'border-primary ring-1 ring-primary' : ''}>
                      <button
                        type="button"
                        className={filterCardClass('partial')}
                        onClick={() => setReviewFilter('partial')}
                        aria-pressed={reviewFilter === 'partial'}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-600" />
                            <div>
                              <p className="text-2xl font-bold">{processingResult.partial_matches}</p>
                              <p className="text-sm text-slate-600">تحتاج مراجعة</p>
                            </div>
                          </div>
                        </CardContent>
                      </button>
                    </Card>

                    <Card className={reviewFilter === 'errors' ? 'border-primary ring-1 ring-primary' : ''}>
                      <button
                        type="button"
                        className={filterCardClass('errors')}
                        onClick={() => setReviewFilter('errors')}
                        aria-pressed={reviewFilter === 'errors'}
                      >
                        <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.errors}</p>
                            <p className="text-sm text-slate-600">{t("errors")}</p>
                          </div>
                        </div>
                        </CardContent>
                      </button>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="text-2xl font-bold">{processingResult.total_amount.toFixed(2)}</p>
                            <p className="text-sm text-slate-600">{t("totalQr")}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAll}
                        disabled={visibleMatchableViolations.length === 0}
                      >
                        {allVisibleMatchableSelected
                          ? 'Deselect All'
                          : 'Select All'
                        }
                      </Button>
                      <span className="text-sm text-slate-600">
                        Selected: {selectedViolations.size} of {processingResult.successful_matches}
                      </span>
                      <span className="text-sm text-slate-500">
                        عرض {filteredViolations.length} من {processingResult.total_extracted}
                      </span>
                    </div>

                    <Button
                      onClick={saveSelectedViolations}
                      disabled={isSaving || (selectedViolations.size === 0 && !canAttachUploadedReport)}
                      className="flex items-center gap-2"
                    >
                      {isSaving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {selectedViolations.size > 0
                        ? `حفظ المحدد وربط التقرير (${selectedViolations.size})`
                        : 'ربط التقرير بالعقود'}
                    </Button>
                  </div>

                  {/* Violations table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("extractedViolations")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">{t("select")}</TableHead>
                              <TableHead>Ref#</TableHead>
                              <TableHead>{t("dateTime")}</TableHead>
                              <TableHead>{t("plate")}</TableHead>
                              <TableHead>{t("location")}</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>{t("customer")}</TableHead>
                              <TableHead>{t("contract")}</TableHead>
                              <TableHead>{t("confidence")}</TableHead>
                              <TableHead>{t("amount")}</TableHead>
                              <TableHead>{t("status")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredViolations.map((violation) => (
                              <TableRow key={violation.id}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedViolations.has(violation.id)}
                                    onChange={() => toggleViolationSelection(violation.id)}
                                    disabled={violation.status !== 'matched' || violation.is_duplicate}
                                    className="rounded"
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  <div className="flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {violation.reference_number || violation.violation_number}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {formatViolationDate(violation.date)}
                                    </div>
                                    {violation.time && (
                                      <span className="text-xs text-slate-500">{violation.time}</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Car className="h-3 w-3" />
                                    <span className="font-mono text-sm">{violation.plate_number}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="text-sm">{violation.location}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {violation.violation_type}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {violation.customer_name ? (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span className="text-sm">{violation.customer_name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {violation.contract_number ? (
                                    <span className="text-sm font-mono">{violation.contract_number}</span>
                                  ) : (
                                    <span className="text-slate-400 text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className={`text-xs font-medium ${MATCH_CONFIDENCE_COLORS[violation.match_confidence]}`}>
                                    {MATCH_CONFIDENCE_LABELS[violation.match_confidence]}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span className="font-medium">{violation.fine_amount.toFixed(2)} QR</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <Badge
                                      variant={
                                        violation.status === 'matched' ? 'default' :
                                          violation.status === 'error' ? 'destructive' : 'secondary'
                                      }
                                    >
                                      {violation.status === 'matched' ? 'Matched' :
                                        violation.status === 'error' ? 'Error' : 'Extracted'}
                                    </Badge>
                                    {violation.is_duplicate && (
                                      <Badge variant="outline" className="text-xs">{t("duplicate")}</Badge>
                                    )}
                                    {violation.warnings.length > 0 && (
                                      <div className="max-w-64 text-xs leading-5 text-amber-700">
                                        {violation.warnings.join('، ')}
                                      </div>
                                    )}
                                    {violation.errors.length > 0 && (
                                      <div className="text-xs text-red-600">
                                        {violation.errors.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {filteredViolations.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={11} className="h-24 text-center text-slate-500">
                                  لا توجد سجلات ضمن هذا الفلتر
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Enrichment Tab - إكمال البيانات الناقصة */}
            <TabsContent value="enrich" className="space-y-4">
              {enrichableViolations.length > 0 ? (
                <>
                  <Alert className="border-blue-200 bg-blue-50">
                    <Database className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      تم العثور على <strong>{enrichableViolations.length}</strong> مخالفة موجودة في النظام يمكن إكمال بياناتها الناقصة من ملف PDF.
                      حدد المخالفات التي تريد تحديثها ثم اضغط "تحديث البيانات".
                    </AlertDescription>
                  </Alert>

                  {/* Control buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAllEnrichments}
                      >
                        {selectedEnrichments.size === enrichableViolations.length
                          ? 'إلغاء تحديد الكل'
                          : 'تحديد الكل'
                        }
                      </Button>
                      <span className="text-sm text-slate-600">
                        محدد: {selectedEnrichments.size} من {enrichableViolations.length}
                      </span>
                    </div>

                    <Button
                      onClick={saveEnrichments}
                      disabled={isEnriching || selectedEnrichments.size === 0}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      {isEnriching ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Edit3 className="h-4 w-4" />
                      )}
                      تحديث البيانات ({selectedEnrichments.size})
                    </Button>
                  </div>

                  {/* Enrichable violations table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">المخالفات التي يمكن إكمال بياناتها</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">تحديد</TableHead>
                              <TableHead>رقم المخالفة</TableHead>
                              <TableHead>التاريخ</TableHead>
                              <TableHead>البيانات الناقصة</TableHead>
                              <TableHead>القيم الجديدة من PDF</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {enrichableViolations.map((item) => (
                              <TableRow key={item.existingViolation.id}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedEnrichments.has(item.existingViolation.id)}
                                    onChange={() => toggleEnrichmentSelection(item.existingViolation.id)}
                                    className="rounded"
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  <div className="flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {item.existingViolation.reference_number || item.existingViolation.violation_number}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatViolationDate(item.existingViolation.violation_date)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {item.missingFields.map((field, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                        {field.label}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1 text-sm">
                                    {item.missingFields.map((field, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <span className="text-slate-500">{field.label}:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-slate-400 line-through">فارغ</span>
                                          <ArrowRight className="h-3 w-3 text-green-500" />
                                          <span className="text-green-700 font-medium truncate max-w-[200px]">
                                            {field.field === 'violation_time' && <Clock className="h-3 w-3 inline ml-1" />}
                                            {field.field === 'location' && <MapPin className="h-3 w-3 inline ml-1" />}
                                            {field.field === 'issuing_authority' && <Building className="h-3 w-3 inline ml-1" />}
                                            {field.newValue}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium text-slate-600 mb-2">لا توجد بيانات ناقصة للإكمال</p>
                  <p className="text-sm text-slate-500">
                    قم برفع ملف PDF ومعالجته للبحث عن المخالفات الموجودة التي تحتاج لإكمال بياناتها
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="stats" className="space-y-6">
              {processingResult && (
                <>
                  <TrafficViolationStats violations={processingResult.violations} />
                  <ViolationImportReport
                    violations={processingResult.violations}
                    onExport={(format) => {
                      toast({
                        title: t("exportReport"),
                        description: `Report will be exported in ${format} format soon`,
                      });
                    }}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* PDF Viewer Component */}
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
