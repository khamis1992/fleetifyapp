/**
 * Hook for intelligent invoice scanning and fuzzy matching
 * Integrates with the scan-invoice Edge Function and fuzzy matching utilities
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { performFuzzyMatching, detectLanguage, extractKeyInformation } from '@/utils/fuzzyMatching';

export interface ScanResult {
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
    context_clues?: {
      car_numbers: string[];
      months: string[];
      amounts: string[];
      agreement_numbers: string[];
    };
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
    all_matches: any[];
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

export interface UseInvoiceScannerOptions {
  ocrEngine?: 'gemini' | 'google-vision' | 'hybrid';
  language?: 'auto' | 'arabic' | 'english';
  autoAssignThreshold?: number;
  reviewThreshold?: number;
}

export const useInvoiceScanner = (options: UseInvoiceScannerOptions = {}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  
  const { toast } = useToast();
  
  const {
    ocrEngine = 'gemini',
    language = 'auto',
    autoAssignThreshold = 85,
    reviewThreshold = 70
  } = options;

  const scanInvoice = useCallback(async (
    imageFile: File | string, 
    fileName?: string
  ): Promise<ScanResult | null> => {
    setIsScanning(true);
    setProgress(0);

    try {
      let imageBase64: string;
      
      // Convert file to base64 if needed
      if (typeof imageFile === 'string') {
        imageBase64 = imageFile;
      } else {
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      try {
        // Call OCR Edge Function
        const { data, error } = await supabase.functions.invoke('scan-invoice', {
          body: {
            imageBase64,
            fileName: fileName || (typeof imageFile !== 'string' ? imageFile.name : 'unknown'),
            ocrEngine,
            language
          }
        });

        clearInterval(progressInterval);
        setProgress(100);

        if (error) {
          throw new Error(error.message || 'OCR processing failed');
        }

        if (!data.success) {
          throw new Error('Failed to process invoice');
        }

        // Create scan result
        const scanResult: ScanResult = {
          id: Date.now().toString(),
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

        // Add to scan history
        setScanHistory(prev => [scanResult, ...prev.slice(0, 99)]); // Keep last 100

        // Show appropriate notification
        if (scanResult.matching.total_confidence >= autoAssignThreshold) {
          toast({
            title: \"تم التطابق التلقائي ✅\",
            description: `تم تعيين الفاتورة تلقائياً للعميل: ${scanResult.matching.best_match?.name}`,
            variant: \"default\"
          });
        } else if (scanResult.matching.total_confidence >= reviewThreshold) {
          toast({
            title: \"يحتاج مراجعة ⚠️\",
            description: \"تم إيجاد تطابقات محتملة، يرجى المراجعة\",
            variant: \"default\"
          });
        } else {
          toast({
            title: \"مراجعة يدوية مطلوبة ❌\",
            description: \"لم يتم إيجاد تطابق موثوق، يرجى المراجعة اليدوية\",
            variant: \"destructive\"
          });
        }

        return scanResult;

      } catch (error) {
        clearInterval(progressInterval);
        console.error('Error in OCR processing:', error);
        
        toast({
          title: \"خطأ في المسح\",
          description: error instanceof Error ? error.message : \"فشل في معالجة الصورة\",
          variant: \"destructive\"
        });
        
        return null;
      }

    } catch (error) {
      console.error('Error preparing image:', error);
      toast({
        title: \"خطأ\",
        description: \"فشل في تحضير الصورة للمعالجة\",
        variant: \"destructive\"
      });
      return null;
    } finally {
      setIsScanning(false);
      setProgress(0);
    }
  }, [ocrEngine, language, autoAssignThreshold, reviewThreshold, toast]);

  const reprocessWithFuzzyMatching = useCallback(async (
    scanResult: ScanResult,
    companyId: string
  ): Promise<ScanResult | null> => {
    try {
      // Perform local fuzzy matching using our advanced utilities
      const enhancedMatching = await performFuzzyMatching(
        scanResult.data,
        scanResult.data.raw_text || '',
        companyId,
        scanResult.processing_info.ocr_confidence
      );

      const updatedResult: ScanResult = {
        ...scanResult,
        matching: enhancedMatching
      };

      // Update scan history
      setScanHistory(prev => 
        prev.map(scan => scan.id === scanResult.id ? updatedResult : scan)
      );

      toast({
        title: \"تم إعادة المعالجة\",
        description: `ثقة جديدة: ${Math.round(enhancedMatching.total_confidence)}%`,
        variant: \"default\"
      });

      return updatedResult;

    } catch (error) {
      console.error('Error in reprocessing:', error);
      toast({
        title: \"خطأ في إعادة المعالجة\",
        description: error instanceof Error ? error.message : \"فشل في إعادة المعالجة\",
        variant: \"destructive\"
      });
      return null;
    }
  }, [toast]);

  const confirmMatch = useCallback(async (
    scanId: string,
    customerId: string,
    feedback?: string
  ): Promise<boolean> => {
    try {
      // Record feedback for machine learning
      const { error } = await supabase.rpc('record_matching_feedback', {
        scan_id: scanId,
        actual_customer_id: customerId,
        user_feedback: feedback
      });

      if (error) throw error;

      // Update local scan history
      setScanHistory(prev => 
        prev.map(scan => {
          if (scan.id === scanId) {
            return {
              ...scan,
              matching: {
                ...scan.matching,
                confirmed: true,
                confirmed_customer_id: customerId
              }
            };
          }
          return scan;
        })
      );

      toast({
        title: \"تم تأكيد التطابق\",
        description: \"شكراً لك، سيساعد هذا في تحسين دقة النظام\",
        variant: \"default\"
      });

      return true;

    } catch (error) {
      console.error('Error confirming match:', error);
      toast({
        title: \"خطأ في التأكيد\",
        description: \"فشل في تسجيل التأكيد\",
        variant: \"destructive\"
      });
      return false;
    }
  }, [toast]);

  const analyzeText = useCallback((text: string) => {
    if (!text) return null;
    
    const language = detectLanguage(text);
    const keyInfo = extractKeyInformation(text);
    
    return {
      language,
      ...keyInfo
    };
  }, []);

  const getStatistics = useCallback(() => {
    const total = scanHistory.length;
    const autoAssigned = scanHistory.filter(s => s.matching.total_confidence >= autoAssignThreshold).length;
    const needsReview = scanHistory.filter(s => 
      s.matching.total_confidence >= reviewThreshold && 
      s.matching.total_confidence < autoAssignThreshold
    ).length;
    const manualReview = scanHistory.filter(s => s.matching.total_confidence < reviewThreshold).length;
    
    const avgOcrConfidence = total > 0 ? 
      Math.round(scanHistory.reduce((sum, s) => sum + s.processing_info.ocr_confidence, 0) / total) : 0;
    
    const avgMatchConfidence = total > 0 ? 
      Math.round(scanHistory.reduce((sum, s) => sum + s.matching.total_confidence, 0) / total) : 0;

    return {
      total,
      autoAssigned,
      needsReview,
      manualReview,
      avgOcrConfidence,
      avgMatchConfidence,
      successRate: total > 0 ? Math.round((autoAssigned / total) * 100) : 0
    };
  }, [scanHistory, autoAssignThreshold, reviewThreshold]);

  const clearHistory = useCallback(() => {
    setScanHistory([]);
    toast({
      title: \"تم مسح السجل\",
      description: \"تم مسح جميع عمليات المسح السابقة\",
      variant: \"default\"
    });
  }, [toast]);

  return {
    // State
    isScanning,
    progress,
    scanHistory,
    
    // Actions
    scanInvoice,
    reprocessWithFuzzyMatching,
    confirmMatch,
    analyzeText,
    clearHistory,
    
    // Utils
    getStatistics,
    
    // Config
    options: {
      ocrEngine,
      language,
      autoAssignThreshold,
      reviewThreshold
    }
  };
};