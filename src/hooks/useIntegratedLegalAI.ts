import { useState, useCallback, useMemo } from 'react';
import { useAdvancedContextEngine, ContextAnalysis, ContextEnrichment } from './useAdvancedContextEngine';
import { useUniversalDataReader, CustomerData, ContractData } from './useUniversalDataReader';

// أنواع البيانات للذكاء القانوني المتكامل
export interface LegalAIResponse {
  responseType: 'advice' | 'document' | 'analysis' | 'data' | 'recommendation' | 'clarification_request';
  title: string;
  summary: string;
  content: string; // يمكن أن يكون نص، HTML، أو Markdown
  recommendations?: string[];
  warnings?: string[];
  nextSteps?: string[];
  generatedDocument?: {
    type: 'legal_notice' | 'payment_demand' | 'contract_termination';
    format: 'pdf' | 'docx';
    content: string; // محتوى الوثيقة
    downloadUrl?: string;
  };
  dataSummary?: {
    customers?: Partial<CustomerData>[];
    contracts?: Partial<ContractData>[];
    insights: string[];
  };
  confidence: number;
  processingTime: number; // بالمللي ثانية
  sources: Array<{ type: 'database' | 'legal_knowledge' | 'ai_model'; description: string }>;
}

export interface LegalAIRequest {
  query: string;
  companyId: string;
  userId: string;
  context?: Partial<ContextAnalysis>;
  attachments?: File[];
}

export const useIntegratedLegalAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { analyzeContext, enrichContext, businessIntelligence } = useAdvancedContextEngine();
  const { readCustomerData, readContractData, smartSearch, analyzeRelationships } = useUniversalDataReader();

  // إنشاء إنذار قانوني مخصص
  const generateLegalNotice = useCallback((customer: CustomerData, contract: ContractData, reasons: string[]): string => {
    return `
      <h2>إنذار قانوني</h2>
      <p><strong>إلى السيد/</strong> ${customer.first_name_ar} ${customer.last_name_ar}</p>
      <p><strong>رقم الهوية:</strong> ${customer.national_id}</p>
      <p><strong>بخصوص العقد رقم:</strong> ${contract.contract_number}</p>
      <p>نود إعلامكم بوجود مخالفات لشروط العقد الموقع معكم، وتتلخص في الآتي:</p>
      <ul>
        ${reasons.map(reason => `<li>${reason}</li>`).join('')}
      </ul>
      <p>لذا، نرجو منكم معالجة هذه المخالفات خلال <strong>7 أيام</strong> من تاريخه، وإلا سنضطر لاتخاذ الإجراءات القانونية اللازمة.</p>
      <p><strong>وتفضلوا بقبول فائق الاحترام،</strong></p>
      <p>الإدارة القانونية - شركة ${customer.company_id}</p>
    `;
  }, []);

  // معالجة الطلبات الرئيسية
  const processRequest = useCallback(async (request: LegalAIRequest): Promise<LegalAIResponse> => {
    setIsProcessing(true);
    setError(null);
    const startTime = Date.now();

    try {
      // 1. تحليل السياق المتقدم
      const contextAnalysis = await analyzeContext(request.query, request.companyId);
      const sources: LegalAIResponse['sources'] = [{ type: 'ai_model', description: 'تحليل السياق الأولي' }];

      // 2. إثراء السياق بالبيانات
      const contextEnrichment = await enrichContext(contextAnalysis, request.companyId);
      sources.push({ type: 'database', description: 'إثراء السياق ببيانات النظام' });

      let response: Partial<LegalAIResponse> = {
        confidence: contextAnalysis.confidence,
        title: contextAnalysis.intent.primary,
        summary: `تحليل لـ: ${request.query}`
      };

      // 3. تنفيذ استراتيجية المعالجة
      switch (contextAnalysis.processingStrategy) {
        case 'data_enriched':
        case 'comprehensive_analysis':
          // التعامل مع الاستفسارات التي تتطلب بيانات
          if (contextAnalysis.entities.customers?.length) {
            const customerName = contextAnalysis.entities.customers[0];
            const searchResults = await smartSearch(request.companyId, customerName, ['customers']);
            const customer = searchResults.customers[0];

            if (customer) {
              const customerDetails = await readCustomerData(request.companyId, customer.id);
              response.dataSummary = {
                customers: [customerDetails[0]],
                insights: [`العميل لديه ${customerDetails[0].totalContracts} عقد، منها ${customerDetails[0].activeContracts} نشط.`]
              };
              sources.push({ type: 'database', description: 'جلب بيانات العميل التفصيلية' });

              // حالة خاصة: إنشاء إنذار قانوني
              if (contextAnalysis.queryType === 'document_generation' && request.query.includes('إنذار')) {
                const contracts = await readContractData(request.companyId, undefined);
                const customerContracts = contracts.filter(c => c.customer_id === customer.id && c.status === 'active');
                
                if (customerContracts.length > 0) {
                  const contract = customerContracts[0];
                  const reasons = ['تأخير في سداد الدفعات المستحقة', 'مخالفة شروط الاستخدام']; // أسباب افتراضية
                  const documentContent = generateLegalNotice(customer, contract, reasons);
                  
                  response.responseType = 'document';
                  response.content = `تم إنشاء إنذار قانوني للعميل ${customer.first_name_ar}.`;
                  response.generatedDocument = {
                    type: 'legal_notice',
                    format: 'pdf',
                    content: documentContent
                  };
                  sources.push({ type: 'legal_knowledge', description: 'استخدام قالب الإنذار القانوني' });
                } else {
                  response.responseType = 'clarification_request';
                  response.content = `لا يوجد عقود نشطة للعميل ${customer.first_name_ar} لإنشاء إنذار.`;
                }
              } else {
                response.responseType = 'data';
                response.content = `تم العثور على بيانات العميل ${customer.first_name_ar}.`;
              }
            } else {
              response.responseType = 'clarification_request';
              response.content = `لم يتم العثور على العميل: ${customerName}. يرجى التأكد من الاسم.`;
            }
          } else {
            response.responseType = 'advice';
            response.content = 'هذا استفسار عام، يمكنني تقديم استشارة قانونية عامة.';
            response.recommendations = businessIntelligence.industryContext.bestPractices;
            sources.push({ type: 'legal_knowledge', description: 'استخدام المعرفة القانونية العامة' });
          }
          break;

        case 'direct_response':
          response.responseType = 'advice';
          response.content = 'هذا استفسار مباشر. بناءً على معرفتي القانونية العامة، إليك بعض النصائح:';
          response.recommendations = ['نصائح قانونية عامة', 'مراجعة الوثائق', 'التواصل مع الخبراء'];
          sources.push({ type: 'legal_knowledge', description: 'استخدام المعرفة القانونية العامة' });
          break;

        case 'expert_consultation':
          response.responseType = 'recommendation';
          response.content = 'هذا الاستفسار معقد ويتطلب استشارة خبير قانوني بشري. أنصح بالتواصل مع القسم القانوني.';
          response.warnings = ['تحليل الذكاء الاصطناعي قد لا يكون كافياً لهذه الحالة.'];
          break;
      }

      const endTime = Date.now();
      response.processingTime = endTime - startTime;
      response.sources = sources;

      return response as LegalAIResponse;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [analyzeContext, enrichContext, smartSearch, readCustomerData, readContractData, generateLegalNotice, businessIntelligence]);

  return {
    processRequest,
    isProcessing,
    error
  };
};

