/**
 * Hook for intelligent invoice scanning and fuzzy matching
 * Integrates with the scan-invoice Edge Function and fuzzy matching utilities
 */

import { useState, useCallback } from 'react';
import * as Sentry from "@sentry/react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
            title: "Auto Match Success",
            description: `Invoice automatically assigned to customer: ${scanResult.matching.best_match?.name}`,
            variant: "default"
          });
        } else if (scanResult.matching.total_confidence >= reviewThreshold) {
          toast({
            title: "Review Required",
            description: "Potential matches found, please review",
            variant: "default"
          });
        } else {
          toast({
            title: "Manual Review Required",
            description: "No reliable match found, manual review needed",
            variant: "destructive"
          });
        }

        return scanResult;

      } catch (error) {
        clearInterval(progressInterval);
        console.error('Error in OCR processing:', error);
        
        toast({
          title: "Scanning Error",
          description: error instanceof Error ? error.message : "Failed to process image",
          variant: "destructive"
        });
        
        return null;
      }

    } catch (error) {
      console.error('Error preparing image:', error);
      toast({
        title: "Error",
        description: "Failed to prepare image for processing",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsScanning(false);
      setProgress(0);
    }
  }, [ocrEngine, language, autoAssignThreshold, reviewThreshold, toast]);

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

      if (error) { Sentry.captureException(error, { tags: { feature: "invoicescanner" } }); throw error; }

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
        title: "Match Confirmed",
        description: "Thank you, this will help improve system accuracy",
        variant: "default"
      });

      return true;

    } catch (error) {
      console.error('Error confirming match:', error);
      toast({
        title: "Confirmation Error",
        description: "Failed to record confirmation",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

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
      title: "History Cleared",
      description: "All previous scans have been cleared",
      variant: "default"
    });
  }, [toast]);

  const analyzeText = useCallback((text: string) => {
    if (!text) return null;
    
    // Simple language detection
    const arabicRegex = /[\u0600-\u06FF]/g;
    const englishRegex = /[a-zA-Z]/g;
    
    const arabicMatches = text.match(arabicRegex);
    const englishMatches = text.match(englishRegex);
    
    const arabicCount = arabicMatches ? arabicMatches.length : 0;
    const englishCount = englishMatches ? englishMatches.length : 0;
    
    let language = 'mixed';
    if (arabicCount > 0 && englishCount === 0) language = 'arabic';
    else if (englishCount > 0 && arabicCount === 0) language = 'english';
    
    return {
      language,
      text_length: text.length,
      has_arabic: arabicCount > 0,
      has_english: englishCount > 0,
      car_numbers: [],
      months: [],
      potential_amounts: [],
      agreement_numbers: []
    };
  }, []);

  return {
    // State
    isScanning,
    progress,
    scanHistory,
    
    // Actions
    scanInvoice,
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