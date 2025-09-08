import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

// 🧠 FleetifyAI - محرك الذكاء الاصطناعي المتقدم
interface EntityExtractionResult {
  contractNumbers: Array<{
    value: string;
    confidence: number;
    source: 'direct' | 'contextual' | 'pattern';
    position: number;
  }>;
  agreementNumbers: Array<{
    value: string;
    confidence: number;
    format: 'LTO' | 'numeric' | 'mixed';
  }>;
  customerNames: Array<{
    value: string;
    confidence: number;
    language: 'arabic' | 'english' | 'mixed';
  }>;
  amounts: Array<{
    value: number;
    confidence: number;
    currency: string;
    context: string;
  }>;
  dates: Array<{
    value: string;
    confidence: number;
    format: string;
    parsed: Date;
  }>;
  paymentTypes: Array<{
    type: 'rent' | 'late_fee' | 'advance' | 'deposit' | 'other';
    confidence: number;
    indicators: string[];
  }>;
}

interface SimilarityScore {
  overall: number;
  contractNumber: number;
  agreementNumber: number;
  customerName: number;
  amount: number;
  temporal: number;
  contextual: number;
}

interface MatchResult {
  contract: any;
  similarity: SimilarityScore;
  confidence: number;
  reasoning: string[];
  riskLevel: 'low' | 'medium' | 'high';
  action: 'auto_link' | 'review' | 'manual' | 'reject';
  metadata: {
    processingTime: number;
    algorithmVersion: string;
    dataQuality: number;
  };
}

interface FleetifyAIResult {
  paymentId: string;
  originalText: string;
  entities: EntityExtractionResult;
  matches: MatchResult[];
  bestMatch?: MatchResult;
  aiInsights: {
    textComplexity: number;
    dataQuality: number;
    processingConfidence: number;
    recommendations: string[];
  };
  performance: {
    processingTime: number;
    memoryUsage: number;
    accuracy: number;
  };
}

export function useFleetifyAI_Engine() {
  const { companyId } = useUnifiedCompanyAccess();
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<FleetifyAIResult[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  // 🧠 محرك معالجة اللغة الطبيعية المتقدم
  const extractEntitiesWithNLP = useCallback((text: string): EntityExtractionResult => {
    const startTime = performance.now();
    const normalizedText = text.toLowerCase().trim();
    
    const result: EntityExtractionResult = {
      contractNumbers: [],
      agreementNumbers: [],
      customerNames: [],
      amounts: [],
      dates: [],
      paymentTypes: []
    };

    // 🎯 استخراج أرقام العقود - خوارزمية NLP متقدمة
    const contractPatterns = [
      { pattern: /lto(\d{4,})/gi, confidence: 0.95, source: 'direct' as const },
      { pattern: /contract[#\s]*(\d+)/gi, confidence: 0.85, source: 'direct' as const },
      { pattern: /عقد\s*(\d+)/gi, confidence: 0.85, source: 'direct' as const },
      { pattern: /(\d{1,4})\s*(?:رنت|rent)/gi, confidence: 0.75, source: 'contextual' as const },
      { pattern: /(\d+)\s*(?:صن|ماجيك|مشكور)/gi, confidence: 0.70, source: 'contextual' as const },
      { pattern: /(\d{2,6})\s*(?:payment|دفع)/gi, confidence: 0.60, source: 'pattern' as const }
    ];

    contractPatterns.forEach(({ pattern, confidence, source }) => {
      const matches = [...normalizedText.matchAll(pattern)];
      matches.forEach((match, index) => {
        const value = match[1];
        if (value && parseInt(value) > 0 && parseInt(value) < 999999) {
          result.contractNumbers.push({
            value,
            confidence,
            source,
            position: match.index || 0
          });
        }
      });
    });

    // 🎯 استخراج أرقام الاتفاقيات - تحليل متقدم
    const agreementPatterns = [
      { pattern: /lto(\d{4,})/gi, confidence: 0.98, format: 'LTO' as const },
      { pattern: /اتفاقية\s*(\d+)/gi, confidence: 0.90, format: 'numeric' as const },
      { pattern: /agreement[#\s]*(\d+)/gi, confidence: 0.85, format: 'mixed' as const }
    ];

    agreementPatterns.forEach(({ pattern, confidence, format }) => {
      const matches = [...normalizedText.matchAll(pattern)];
      matches.forEach(match => {
        const value = match[1];
        if (value && parseInt(value) > 1000) {
          result.agreementNumbers.push({
            value,
            confidence,
            format
          });
        }
      });
    });

    // 🎯 استخراج أسماء العملاء - تحليل دلالي
    const customerPatterns = [
      { pattern: /(صن\s*ماجيك|sun\s*magic)/gi, confidence: 0.95, language: 'mixed' as const },
      { pattern: /(مشكور|mashkoor)/gi, confidence: 0.90, language: 'mixed' as const },
      { pattern: /(ماجيك|magic)/gi, confidence: 0.80, language: 'mixed' as const },
      { pattern: /([A-Za-z]{2,}\s+[A-Za-z]{2,})/g, confidence: 0.70, language: 'english' as const },
      { pattern: /([\u0600-\u06FF]{2,}\s+[\u0600-\u06FF]{2,})/g, confidence: 0.75, language: 'arabic' as const }
    ];

    customerPatterns.forEach(({ pattern, confidence, language }) => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        const value = match[1] || match[0];
        if (value && value.length > 2 && value.length < 50) {
          result.customerNames.push({
            value: value.trim(),
            confidence,
            language
          });
        }
      });
    });

    // 🎯 استخراج المبالغ - تحليل رقمي متقدم
    const amountPatterns = [
      { pattern: /(\d{1,6}(?:\.\d{1,3})?)\s*(?:د\.ك\.|ريال|kwd)/gi, confidence: 0.95, currency: 'KWD', context: 'explicit' },
      { pattern: /amount[:\s]*(\d{1,6}(?:\.\d{1,3})?)/gi, confidence: 0.90, currency: 'KWD', context: 'labeled' },
      { pattern: /مبلغ[:\s]*(\d{1,6}(?:\.\d{1,3})?)/gi, confidence: 0.90, currency: 'KWD', context: 'labeled' },
      { pattern: /(\d{3,6}(?:\.\d{1,3})?)/g, confidence: 0.60, currency: 'KWD', context: 'inferred' }
    ];

    amountPatterns.forEach(({ pattern, confidence, currency, context }) => {
      const matches = [...normalizedText.matchAll(pattern)];
      matches.forEach(match => {
        const value = parseFloat(match[1]);
        if (value > 0 && value < 1000000) {
          result.amounts.push({
            value,
            confidence,
            currency,
            context
          });
        }
      });
    });

    // 🎯 استخراج التواريخ - تحليل زمني متقدم
    const datePatterns = [
      { pattern: /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi, confidence: 0.95, format: 'month_year' },
      { pattern: /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, confidence: 0.90, format: 'dd/mm/yyyy' },
      { pattern: /(\d{4})-(\d{1,2})-(\d{1,2})/g, confidence: 0.95, format: 'yyyy-mm-dd' },
      { pattern: /(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s+(\d{4})/gi, confidence: 0.90, format: 'arabic_month_year' }
    ];

    datePatterns.forEach(({ pattern, confidence, format }) => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        const value = match[0];
        let parsed: Date;
        
        try {
          if (format === 'month_year') {
            parsed = new Date(`${match[1]} 1, ${match[2]}`);
          } else if (format === 'dd/mm/yyyy') {
            parsed = new Date(`${match[3]}-${match[2]}-${match[1]}`);
          } else if (format === 'yyyy-mm-dd') {
            parsed = new Date(value);
          } else {
            parsed = new Date();
          }
          
          if (!isNaN(parsed.getTime())) {
            result.dates.push({
              value,
              confidence,
              format,
              parsed
            });
          }
        } catch (error) {
          // تجاهل التواريخ غير الصالحة
        }
      });
    });

    // 🎯 تصنيف نوع الدفعة - تحليل سياقي
    const paymentTypeAnalysis = [
      {
        type: 'rent' as const,
        patterns: [/rent|إيجار|monthly|شهري/gi],
        confidence: 0.90,
        indicators: ['rent', 'monthly', 'إيجار', 'شهري']
      },
      {
        type: 'late_fee' as const,
        patterns: [/late|متأخر|fine|غرامة|auto-generated.*late|penalty/gi],
        confidence: 0.95,
        indicators: ['late', 'fine', 'غرامة', 'متأخر']
      },
      {
        type: 'advance' as const,
        patterns: [/advance|مقدم|deposit|تأمين/gi],
        confidence: 0.85,
        indicators: ['advance', 'deposit', 'مقدم', 'تأمين']
      }
    ];

    paymentTypeAnalysis.forEach(({ type, patterns, confidence, indicators }) => {
      patterns.forEach(pattern => {
        if (pattern.test(normalizedText)) {
          const matchedIndicators = indicators.filter(indicator => 
            normalizedText.includes(indicator.toLowerCase())
          );
          
          if (matchedIndicators.length > 0) {
            result.paymentTypes.push({
              type,
              confidence: confidence * (matchedIndicators.length / indicators.length),
              indicators: matchedIndicators
            });
          }
        }
      });
    });

    return result;
  }, []);

  // 🧠 خوارزمية المطابقة الذكية المتقدمة
  const calculateSimilarity = useCallback((
    entities: EntityExtractionResult,
    contract: any
  ): SimilarityScore => {
    
    const similarity: SimilarityScore = {
      overall: 0,
      contractNumber: 0,
      agreementNumber: 0,
      customerName: 0,
      amount: 0,
      temporal: 0,
      contextual: 0
    };

    // 🎯 مطابقة أرقام العقود - خوارزمية متقدمة
    const contractNum = contract.contract_number || '';
    entities.contractNumbers.forEach(extracted => {
      if (contractNum.includes(extracted.value) || extracted.value.includes(contractNum)) {
        similarity.contractNumber = Math.max(similarity.contractNumber, extracted.confidence * 100);
      } else if (contractNum.slice(-3) === extracted.value.slice(-3)) {
        similarity.contractNumber = Math.max(similarity.contractNumber, extracted.confidence * 70);
      } else if (levenshteinDistance(contractNum, extracted.value) <= 2) {
        similarity.contractNumber = Math.max(similarity.contractNumber, extracted.confidence * 50);
      }
    });

    // 🎯 مطابقة أرقام الاتفاقيات
    const agreementNum = (contract.agreement_number || '').replace(/\D/g, '');
    entities.agreementNumbers.forEach(extracted => {
      if (agreementNum.includes(extracted.value) || extracted.value.includes(agreementNum)) {
        similarity.agreementNumber = Math.max(similarity.agreementNumber, extracted.confidence * 100);
      }
    });

    // 🎯 مطابقة أسماء العملاء - تحليل دلالي
    const customerName = (contract.customer?.full_name || '').toLowerCase();
    entities.customerNames.forEach(extracted => {
      const extractedName = extracted.value.toLowerCase();
      const nameWords = customerName.split(' ');
      const extractedWords = extractedName.split(' ');
      
      let matchScore = 0;
      nameWords.forEach(word => {
        extractedWords.forEach(extractedWord => {
          if (word.includes(extractedWord) || extractedWord.includes(word)) {
            matchScore += 25;
          } else if (levenshteinDistance(word, extractedWord) <= 2) {
            matchScore += 15;
          }
        });
      });
      
      similarity.customerName = Math.max(similarity.customerName, 
        Math.min(matchScore * extracted.confidence, 100)
      );
    });

    // 🎯 مطابقة المبالغ - تحليل رقمي متقدم
    const contractAmount = contract.monthly_amount || contract.contract_amount || 0;
    entities.amounts.forEach(extracted => {
      const difference = Math.abs(contractAmount - extracted.value);
      const tolerance = contractAmount * 0.1; // 10% تسامح
      
      if (difference <= tolerance) {
        const score = (1 - (difference / contractAmount)) * extracted.confidence * 100;
        similarity.amount = Math.max(similarity.amount, score);
      }
    });

    // 🎯 التحليل الزمني
    entities.dates.forEach(extracted => {
      const contractDate = new Date(contract.start_date || contract.created_at);
      const extractedDate = extracted.parsed;
      const daysDiff = Math.abs((contractDate.getTime() - extractedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 365) { // خلال سنة
        similarity.temporal = Math.max(similarity.temporal, 
          (1 - (daysDiff / 365)) * extracted.confidence * 100
        );
      }
    });

    // 🎯 التحليل السياقي
    const contextScore = calculateContextualSimilarity(entities, contract);
    similarity.contextual = contextScore;

    // 🎯 حساب النتيجة الإجمالية - خوارزمية متقدمة
    const weights = {
      contractNumber: 0.25,
      agreementNumber: 0.25,
      customerName: 0.20,
      amount: 0.15,
      temporal: 0.10,
      contextual: 0.05
    };

    similarity.overall = Object.keys(weights).reduce((total, key) => {
      return total + (similarity[key as keyof SimilarityScore] * weights[key as keyof typeof weights]);
    }, 0);

    return similarity;
  }, []);

  // 🧠 حساب التشابه السياقي
  const calculateContextualSimilarity = useCallback((
    entities: EntityExtractionResult,
    contract: any
  ): number => {
    let contextScore = 0;
    
    // تحليل نوع العقد مقابل نوع الدفعة
    if (entities.paymentTypes.length > 0) {
      const contractType = contract.contract_type || '';
      entities.paymentTypes.forEach(paymentType => {
        if (contractType.includes('rental') && paymentType.type === 'rent') {
          contextScore += 20;
        }
        if (paymentType.type === 'late_fee' && contract.status === 'overdue') {
          contextScore += 15;
        }
      });
    }
    
    // تحليل حالة العقد
    if (contract.status === 'active') {
      contextScore += 10;
    }
    
    return Math.min(contextScore, 100);
  }, []);

  // 🧠 حساب مسافة Levenshtein للمقارنة النصية
  const levenshteinDistance = useCallback((str1: string, str2: string): number => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }, []);

  // 🧠 محرك اتخاذ القرارات المتقدم
  const makeSmartDecision = useCallback((similarity: SimilarityScore, entities: EntityExtractionResult): {
    action: MatchResult['action'];
    confidence: number;
    riskLevel: MatchResult['riskLevel'];
    reasoning: string[];
  } => {
    const reasoning: string[] = [];
    let confidence = similarity.overall;
    let riskLevel: MatchResult['riskLevel'] = 'medium';
    let action: MatchResult['action'] = 'manual';

    // تحليل المخاطر
    if (similarity.contractNumber >= 80 && similarity.agreementNumber >= 80) {
      riskLevel = 'low';
      confidence += 10;
      reasoning.push('مطابقة قوية لأرقام العقد والاتفاقية');
    }

    if (similarity.customerName >= 70) {
      confidence += 5;
      reasoning.push('مطابقة قوية لاسم العميل');
    }

    if (similarity.amount >= 80) {
      confidence += 5;
      reasoning.push('مطابقة دقيقة للمبلغ');
    }

    if (entities.contractNumbers.length === 0 && entities.agreementNumbers.length === 0) {
      riskLevel = 'high';
      confidence -= 20;
      reasoning.push('لا توجد أرقام عقود واضحة');
    }

    // اتخاذ القرار النهائي
    if (confidence >= 90 && riskLevel === 'low') {
      action = 'auto_link';
      reasoning.push('ثقة عالية جداً - ربط تلقائي');
    } else if (confidence >= 75 && riskLevel !== 'high') {
      action = 'review';
      reasoning.push('ثقة جيدة - يحتاج مراجعة سريعة');
    } else if (confidence >= 50) {
      action = 'manual';
      reasoning.push('ثقة متوسطة - يحتاج مراجعة يدوية');
    } else {
      action = 'reject';
      reasoning.push('ثقة منخفضة - رفض');
    }

    return {
      action,
      confidence: Math.min(confidence, 100),
      riskLevel,
      reasoning
    };
  }, []);

  // 🚀 المعالج الرئيسي لـ FleetifyAI
  const processWithFleetifyAI = useCallback(async (paymentData: any[]) => {
    if (!companyId) throw new Error('معرف الشركة مطلوب');

    setIsProcessing(true);
    const startTime = performance.now();
    
    try {
      console.log('🧠 FleetifyAI: بدء المعالجة المتقدمة...');
      
      // جلب العقود مع تحسين الاستعلام
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('company_id', companyId)
        .in('status', ['active', 'completed', 'overdue'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`📊 FleetifyAI: تم جلب ${contracts?.length || 0} عقد للتحليل`);

      const results: FleetifyAIResult[] = [];
      let totalProcessingTime = 0;
      let successfulMatches = 0;

      for (let i = 0; i < paymentData.length; i++) {
        const payment = paymentData[i];
        const paymentStartTime = performance.now();
        
        // 🧠 استخراج الكيانات بـ NLP
        const entities = extractEntitiesWithNLP(payment.description || '');
        
        // 🧠 العثور على أفضل المطابقات
        const matches: MatchResult[] = [];
        
        for (const contract of contracts || []) {
          const similarity = calculateSimilarity(entities, contract);
          const decision = makeSmartDecision(similarity, entities);
          
          if (similarity.overall > 20) { // فلترة النتائج الضعيفة
            matches.push({
              contract,
              similarity,
              confidence: decision.confidence,
              reasoning: decision.reasoning,
              riskLevel: decision.riskLevel,
              action: decision.action,
              metadata: {
                processingTime: performance.now() - paymentStartTime,
                algorithmVersion: '2.0.0',
                dataQuality: calculateDataQuality(entities)
              }
            });
          }
        }

        // ترتيب النتائج
        matches.sort((a, b) => b.similarity.overall - a.similarity.overall);
        const bestMatch = matches[0];
        
        if (bestMatch && bestMatch.confidence >= 75) {
          successfulMatches++;
        }

        const paymentProcessingTime = performance.now() - paymentStartTime;
        totalProcessingTime += paymentProcessingTime;

        // 🧠 تحليل البيانات وإنشاء الرؤى
        const aiInsights = {
          textComplexity: calculateTextComplexity(payment.description || ''),
          dataQuality: calculateDataQuality(entities),
          processingConfidence: bestMatch?.confidence || 0,
          recommendations: generateRecommendations(entities, bestMatch)
        };

        results.push({
          paymentId: payment.id || `payment_${i}`,
          originalText: payment.description || '',
          entities,
          matches: matches.slice(0, 5), // أفضل 5 مطابقات
          bestMatch,
          aiInsights,
          performance: {
            processingTime: paymentProcessingTime,
            memoryUsage: 0, // سيتم حسابه لاحقاً
            accuracy: bestMatch?.confidence || 0
          }
        });

        // تحديث التقدم كل 50 دفعة
        if ((i + 1) % 50 === 0) {
          console.log(`🧠 FleetifyAI: تم معالجة ${i + 1}/${paymentData.length} دفعة`);
        }
      }

      setResults(results);

      // 📊 حساب مقاييس الأداء
      const totalTime = performance.now() - startTime;
      const averageProcessingTime = totalProcessingTime / paymentData.length;
      const successRate = (successfulMatches / paymentData.length) * 100;

      const metrics = {
        totalProcessingTime: totalTime,
        averageProcessingTime,
        successfulMatches,
        totalPayments: paymentData.length,
        successRate,
        throughput: paymentData.length / (totalTime / 1000), // دفعات في الثانية
        accuracyScore: results.reduce((sum, r) => sum + (r.bestMatch?.confidence || 0), 0) / results.length
      };

      setPerformanceMetrics(metrics);

      console.log('✅ FleetifyAI: انتهت المعالجة بنجاح');
      console.log(`📊 النتائج: ${successfulMatches}/${paymentData.length} (${successRate.toFixed(1)}%)`);
      console.log(`⚡ السرعة: ${metrics.throughput.toFixed(1)} دفعة/ثانية`);
      console.log(`🎯 الدقة: ${metrics.accuracyScore.toFixed(1)}%`);

      return results;

    } finally {
      setIsProcessing(false);
    }
  }, [companyId, extractEntitiesWithNLP, calculateSimilarity, makeSmartDecision]);

  // 🧠 حساب جودة البيانات
  const calculateDataQuality = useCallback((entities: EntityExtractionResult): number => {
    let quality = 0;
    
    if (entities.contractNumbers.length > 0) quality += 25;
    if (entities.agreementNumbers.length > 0) quality += 25;
    if (entities.customerNames.length > 0) quality += 20;
    if (entities.amounts.length > 0) quality += 15;
    if (entities.dates.length > 0) quality += 10;
    if (entities.paymentTypes.length > 0) quality += 5;
    
    return Math.min(quality, 100);
  }, []);

  // 🧠 حساب تعقد النص
  const calculateTextComplexity = useCallback((text: string): number => {
    const words = text.split(/\s+/).length;
    const uniqueWords = new Set(text.toLowerCase().split(/\s+/)).size;
    const specialChars = (text.match(/[^\w\s]/g) || []).length;
    
    return Math.min((words * 2 + uniqueWords + specialChars) / 10, 100);
  }, []);

  // 🧠 توليد التوصيات
  const generateRecommendations = useCallback((
    entities: EntityExtractionResult,
    bestMatch?: MatchResult
  ): string[] => {
    const recommendations = [];
    
    if (entities.contractNumbers.length === 0) {
      recommendations.push('يُنصح بإضافة رقم العقد في وصف الدفعة');
    }
    
    if (entities.amounts.length === 0) {
      recommendations.push('يُنصح بتوضيح المبلغ في الوصف');
    }
    
    if (bestMatch && bestMatch.confidence < 80) {
      recommendations.push('يُنصح بمراجعة تفاصيل الدفعة يدوياً');
    }
    
    if (entities.paymentTypes.length === 0) {
      recommendations.push('يُنصح بتوضيح نوع الدفعة (إيجار، غرامة، إلخ)');
    }
    
    return recommendations;
  }, []);

  // 📊 إحصائيات متقدمة
  const getAdvancedStatistics = useCallback(() => {
    if (!results.length) return null;

    const autoLinkable = results.filter(r => r.bestMatch?.action === 'auto_link').length;
    const needsReview = results.filter(r => r.bestMatch?.action === 'review').length;
    const needsManual = results.filter(r => r.bestMatch?.action === 'manual').length;
    const rejected = results.filter(r => r.bestMatch?.action === 'reject' || !r.bestMatch).length;

    return {
      total: results.length,
      autoLinkable,
      needsReview,
      needsManual,
      rejected,
      successRate: ((autoLinkable + needsReview) / results.length) * 100,
      averageConfidence: results.reduce((sum, r) => sum + (r.bestMatch?.confidence || 0), 0) / results.length,
      averageProcessingTime: results.reduce((sum, r) => sum + r.performance.processingTime, 0) / results.length,
      dataQualityScore: results.reduce((sum, r) => sum + r.aiInsights.dataQuality, 0) / results.length,
      performanceMetrics
    };
  }, [results, performanceMetrics]);

  return {
    isProcessing,
    results,
    performanceMetrics,
    processWithFleetifyAI,
    extractEntitiesWithNLP,
    calculateSimilarity,
    getAdvancedStatistics
  };
}
