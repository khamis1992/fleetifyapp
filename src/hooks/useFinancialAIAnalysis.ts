import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";

export interface AIAnalysisResult {
  analysis: string;
  confidence: number;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  urgentActions: string[];
  timestamp: string;
}

export interface FinancialAnalysisData {
  totalAccounts: number;
  chartOfAccountsScore: number;
  linkageScore: number;
  costCentersScore: number;
  operationsScore: number;
  overallScore: number;
  linkedCustomers: number;
  unlinkedCustomers: number;
  linkedVehicles: number;
  unlinkedVehicles: number;
  linkedContracts: number;
  unlinkedContracts: number;
  activeCostCenters: number;
  recentJournalEntries: number;
  issues?: Array<{
    title: string;
    description: string;
  }>;
}

export const useFinancialAIAnalysis = (analysisData?: FinancialAnalysisData) => {
  const { user } = useAuth();
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['financial-ai-analysis', analysisData?.overallScore?.toString()]),
    queryFn: async (): Promise<AIAnalysisResult> => {
      if (!user || !analysisData) {
        throw new Error('User not authenticated or analysis data missing');
      }

      console.log('[useFinancialAIAnalysis] Starting AI analysis...');

      try {
        const { data, error } = await supabase.functions.invoke('financial-analysis-ai', {
          body: {
            analysisData,
            companyType: 'Vehicle Rental/Leasing',
            language: 'ar'
          }
        });

        if (error) {
          console.error('[useFinancialAIAnalysis] Edge function error:', error);
          throw new Error(error.message || 'Failed to get AI analysis');
        }

        if (data?.error) {
          console.error('[useFinancialAIAnalysis] AI analysis error:', data.error);
          
          // Return fallback analysis if AI fails
          return {
            analysis: `تحليل أساسي للنظام المالي:

النتيجة الإجمالية: ${analysisData.overallScore}%

المجالات التي تحتاج تحسين:
${analysisData.chartOfAccountsScore < 80 ? '• دليل الحسابات يحتاج تطوير' : ''}
${analysisData.linkageScore < 80 ? '• ربط الحسابات بالكيانات يحتاج تحسين' : ''}
${analysisData.costCentersScore < 80 ? '• مراكز التكلفة تحتاج تطوير' : ''}
${analysisData.operationsScore < 80 ? '• العمليات المالية تحتاج مراجعة' : ''}

يُنصح بالتركيز على المجالات ذات النقاط الأقل لتحسين الأداء العام للنظام المالي.`,
            confidence: analysisData.overallScore,
            recommendations: [
              'تحسين ربط العملاء بالحسابات المحاسبية',
              'إنشاء مراكز تكلفة إضافية للأنشطة المختلفة',
              'مراجعة وتحديث هيكل دليل الحسابات',
              'تطوير نظام المتابعة المالية'
            ],
            riskLevel: analysisData.overallScore < 50 ? 'critical' : 
                      analysisData.overallScore < 70 ? 'high' : 'medium',
            urgentActions: [
              'مراجعة الحسابات غير المربوطة',
              'تحديث مراكز التكلفة المفقودة'
            ],
            timestamp: new Date().toISOString()
          };
        }

        console.log('[useFinancialAIAnalysis] AI analysis completed successfully');
        return data;

      } catch (error: any) {
        console.error('[useFinancialAIAnalysis] Error:', error);
        
        // Return fallback analysis on any error
        return {
          analysis: `تحليل أساسي (غير متصل بالذكاء الاصطناعي):

النتيجة الإجمالية للنظام المالي: ${analysisData.overallScore}%

هذا النظام ${analysisData.overallScore >= 70 ? 'في حالة جيدة نسبياً' : 'يحتاج إلى تحسينات مهمة'}.

المجالات الرئيسية:
• دليل الحسابات: ${analysisData.chartOfAccountsScore}%
• ربط الحسابات: ${analysisData.linkageScore}%  
• مراكز التكلفة: ${analysisData.costCentersScore}%
• العمليات المالية: ${analysisData.operationsScore}%

للحصول على تحليل متقدم بالذكاء الاصطناعي، تأكد من إعداد API keys بشكل صحيح.`,
          confidence: 60,
          recommendations: [
            'إعداد الذكاء الاصطناعي للحصول على تحليل متقدم',
            'مراجعة إعدادات النظام المحاسبي',
            'التأكد من ربط جميع الكيانات بالحسابات المناسبة'
          ],
          riskLevel: 'medium',
          urgentActions: [
            'التحقق من إعدادات API',
            'مراجعة الاتصال بالشبكة'
          ],
          timestamp: new Date().toISOString()
        };
      }
    },
    enabled: !!user && !!analysisData && !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
};