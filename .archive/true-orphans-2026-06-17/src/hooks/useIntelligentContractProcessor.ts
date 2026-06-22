import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';

export interface ProcessedContractData {
  customer_name?: string;
  customer_phone?: string;
  vehicle_number?: string;
  contract_number?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  contract_amount?: string | number;
  monthly_amount?: string | number;
  description?: string;
  terms?: string;
  rowNumber?: number;
}

export interface ProcessingCorrection {
  field: string;
  original_value: unknown;
  suggested_value: unknown;
  reason: string;
  confidence: number;
}

export interface ProcessingIssue {
  field: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
}

export interface AutoFix {
  field: string;
  fix_description: string;
}

export interface ProcessingResult {
  processed_data: ProcessedContractData;
  suggestions: string[];
  corrections: ProcessingCorrection[];
  validation_issues: ProcessingIssue[];
  auto_fixes_applied: AutoFix[];
}

export interface ContractPreview {
  originalData: ProcessedContractData[];
  processedData: ProcessingResult[];
  summary: {
    total_rows: number;
    errors: number;
    warnings: number;
    auto_fixes: number;
    suggestions_count: number;
  };
}

export function useIntelligentContractProcessor() {
  const { companyId } = useUnifiedCompanyAccess();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [preview, setPreview] = useState<ContractPreview | null>(null);

  const processContractData = async (
    data: ProcessedContractData[], 
    options: {
      enableAI?: boolean;
      autoApplyFixes?: boolean;
      skipValidation?: boolean;
    } = {}
  ): Promise<ContractPreview> => {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب');
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      console.log('🤖 [INTELLIGENT_PROCESSOR] Starting processing of', data.length, 'contracts');
      
      const processedResults: ProcessingResult[] = [];
      const batchSize = 5; // Process in batches to avoid overwhelming the AI
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(contractData => processeSingleContract(contractData, options))
        );
        
        processedResults.push(...batchResults);
        setProcessingProgress(Math.round(((i + batch.length) / data.length) * 100));
      }

      // Calculate summary
      const summary = {
        total_rows: data.length,
        errors: processedResults.reduce((acc, result) => 
          acc + result.validation_issues.filter(issue => issue.severity === 'error').length, 0),
        warnings: processedResults.reduce((acc, result) => 
          acc + result.validation_issues.filter(issue => issue.severity === 'warning').length, 0),
        auto_fixes: processedResults.reduce((acc, result) => acc + result.auto_fixes_applied.length, 0),
        suggestions_count: processedResults.reduce((acc, result) => acc + result.suggestions.length, 0)
      };

      const preview: ContractPreview = {
        originalData: data,
        processedData: processedResults,
        summary
      };

      setPreview(preview);
      
      toast.success(`تم معالجة ${data.length} عقد بنجاح`);
      
      return preview;

    } catch (error) {
      console.error('❌ [INTELLIGENT_PROCESSOR] Error:', error);
      toast.error('فشل في معالجة البيانات');
      throw error;
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const processeSingleContract = async (
    contractData: ProcessedContractData,
    options: any
  ): Promise<ProcessingResult> => {
    try {
      console.log('🔄 [PROCESS_SINGLE] Processing contract:', contractData.rowNumber);

      const { data, error } = await supabase.functions.invoke('intelligent-contract-processor', {
        body: {
          contract_data: contractData,
          options
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        // Return basic validation result on error
        return createBasicValidationResult(contractData);
      }

      return data || createBasicValidationResult(contractData);
    } catch (error) {
      console.error('Single contract processing error:', error);
      return createBasicValidationResult(contractData);
    }
  };

  const createBasicValidationResult = (contractData: ProcessedContractData): ProcessingResult => {
    const issues: ProcessingIssue[] = [];
    
    // Basic validation
    if (!contractData.customer_name) {
      issues.push({ field: 'customer_name', issue: 'اسم العميل مطلوب', severity: 'error' });
    }
    if (!contractData.contract_type) {
      issues.push({ field: 'contract_type', issue: 'نوع العقد مطلوب', severity: 'error' });
    }
    if (!contractData.start_date) {
      issues.push({ field: 'start_date', issue: 'تاريخ البداية مطلوب', severity: 'error' });
    }
    if (!contractData.end_date) {
      issues.push({ field: 'end_date', issue: 'تاريخ النهاية مطلوب', severity: 'error' });
    }

    return {
      processed_data: { ...contractData },
      suggestions: ['تم التحقق الأساسي فقط - الذكاء الاصطناعي غير متوفر'],
      corrections: [],
      validation_issues: issues,
      auto_fixes_applied: []
    };
  };

  const applyCorrections = (
    resultIndex: number, 
    correctionsToApply: string[]
  ): void => {
    if (!preview) return;

    const updatedResults = [...preview.processedData];
    const result = updatedResults[resultIndex];
    
    result.corrections.forEach(correction => {
      if (correctionsToApply.includes(correction.field)) {
        (result.processed_data as any)[correction.field] = correction.suggested_value;
        result.auto_fixes_applied.push({
          field: correction.field,
          fix_description: `تم تطبيق الاقتراح: ${correction.reason}`
        });
      }
    });

    // Remove applied corrections
    result.corrections = result.corrections.filter(
      correction => !correctionsToApply.includes(correction.field)
    );

    setPreview({
      ...preview,
      processedData: updatedResults
    });

    toast.success(`تم تطبيق ${correctionsToApply.length} تصحيح`);
  };

  const getProcessedCSVData = (): ProcessedContractData[] => {
    if (!preview) return [];
    
    return preview.processedData.map(result => result.processed_data);
  };

  const downloadProcessingReport = (): void => {
    if (!preview) return;

    const report = {
      معالجة_العقود: {
        إجمالي_الصفوف: preview.summary.total_rows,
        الأخطاء: preview.summary.errors,
        التحذيرات: preview.summary.warnings,
        الإصلاحات_التلقائية: preview.summary.auto_fixes,
        الاقتراحات: preview.summary.suggestions_count
      },
      تفاصيل_المعالجة: preview.processedData.map((result, index) => ({
        رقم_الصف: index + 1,
        البيانات_الأصلية: preview.originalData[index],
        البيانات_المعالجة: result.processed_data,
        الاقتراحات: result.suggestions,
        التصحيحات: result.corrections,
        مشاكل_التحقق: result.validation_issues,
        الإصلاحات_المطبقة: result.auto_fixes_applied
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contract_processing_report_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearPreview = (): void => {
    setPreview(null);
  };

  return {
    processContractData,
    applyCorrections,
    getProcessedCSVData,
    downloadProcessingReport,
    clearPreview,
    isProcessing,
    processingProgress,
    preview
  };
}