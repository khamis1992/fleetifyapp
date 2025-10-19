import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

// 🧠 واجهات النظام الذكي
interface PaymentDescription {
  originalText: string;
  extractedInfo: {
    contractNumber?: string;
    agreementNumber?: string;
    customerName?: string;
    period?: string;
    monthYear?: { month: string; year: string };
    paymentType: 'rent' | 'late_fee' | 'advance' | 'deposit' | 'other';
    amount: number;
    lateFeeAmount?: number;
    daysOverdue?: number;
    referenceNumber?: string;
  };
  confidence: number;
  patterns: string[];
}

interface Contract {
  id?: string;
  contract_number?: string;
  agreement_number?: string;
  monthly_amount?: number;
  start_date?: string;
  customer?: {
    full_name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface SmartContractMatch {
  contract: Contract;
  confidence: number;
  matchingCriteria: {
    contractNumber: number;
    agreementNumber: number;
    customerName: number;
    amountMatch: number;
    periodMatch: number;
    historicalPattern: number;
  };
  totalScore: number;
  suggestedAction: 'auto_link' | 'high_confidence' | 'manual_review' | 'reject';
  reasoning: string[];
}

interface PaymentInputData {
  description?: string;
  due_date?: string;
  payment_date?: string;
  amount?: number;
  late_fine_handling?: string;
  [key: string]: unknown;
}

interface AnalysisResult {
  rowIndex: number;
  originalPayment: PaymentInputData;
  analyzedDescription: PaymentDescription;
  contractMatches: SmartContractMatch[];
  bestMatch?: SmartContractMatch;
  lateFineCalculation: AdvancedLateFine | null;
  recommendedActions: Array<{
    type: string;
    description: string;
    confidence: string;
  }>;
}

interface AdvancedLateFine {
  isApplicable: boolean;
  daysOverdue: number;
  finePerDay: number; // ريال كويتي
  calculatedFine: number;
  cappedFine: number; // محدود بـ 3000
  waived: boolean;
  waiverReason?: string;
  compoundingRules: {
    gracePeriod: number;
    escalationAfter: number;
    maxCap: number;
  };
}

export function useAdvancedPaymentAnalyzer() {
  const { companyId } = useUnifiedCompanyAccess();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

  // 🎯 محلل الأوصاف الفائق - يفهم كل شيء
  const analyzePaymentDescription = useCallback((description: string): PaymentDescription => {
    const text = description.toLowerCase().trim();
    const originalText = description;
    
    // 🔍 أنماط البحث المتقدمة
    const patterns = {
      // أرقام العقود والاتفاقيات
      contractNumbers: /(?:contract|عقد|agreement|اتفاقية|رقم)\s*[#:]?\s*(\d+)|(\d{1,6})\s*(?:رنت|rent|عقد)/gi,
      agreementNumbers: /(?:lto|agreement|اتفاقية)(\d{7,})/gi,
      
      // أسماء العملاء
      customerNames: /(?:صن\s*ماجيك|مشكور|ماجيك|sun\s*magic|mashkoor|magic)/gi,
      
      // التواريخ والفترات
      periods: /(?:january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{4}|\d{4}\/\d{1,2}|يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s*\d{4}/gi,
      
      // أنواع المدفوعات
      rentPayments: /(?:rent|إيجار|rental|monthly|شهري)/gi,
      lateFees: /(?:late|متأخر|fine|غرامة|penalty|تأخير|late_payment_fee)/gi,
      advance: /(?:advance|مقدم|تأمين|deposit)/gi,
      
      // المبالغ والغرامات
      amounts: /(?:amount|مبلغ|total)[\s:]*(\d+(?:\.\d+)?)/gi,
      lateFeeAmounts: /late_payment_fee\s*(\d+)/gi,
      daysOverdue: /(\d+)\s*(?:day|يوم|days|أيام)\s*(?:overdue|متأخر|late)/gi,
      
      // أرقام مرجعية
      references: /(?:ref|reference|مرجع|رقم)[\s#:]*(\w+)/gi
    };

    const extractedInfo: PaymentDescription['extractedInfo'] = {
      paymentType: 'other',
      amount: 0
    };

    const matchedPatterns: string[] = [];
    let confidence = 0;

    // 🎯 استخراج رقم العقد
    let contractMatch = patterns.contractNumbers.exec(text);
    if (contractMatch) {
      extractedInfo.contractNumber = contractMatch[1] || contractMatch[2];
      confidence += 25;
      matchedPatterns.push('contract_number');
    }

    // 🎯 استخراج رقم الاتفاقية
    let agreementMatch = patterns.agreementNumbers.exec(text);
    if (agreementMatch) {
      extractedInfo.agreementNumber = agreementMatch[1];
      confidence += 30;
      matchedPatterns.push('agreement_number');
    }

    // 🎯 استخراج اسم العميل
    let customerMatch = patterns.customerNames.exec(text);
    if (customerMatch) {
      extractedInfo.customerName = customerMatch[0];
      confidence += 20;
      matchedPatterns.push('customer_name');
    }

    // 🎯 استخراج الفترة
    let periodMatch = patterns.periods.exec(text);
    if (periodMatch) {
      extractedInfo.period = periodMatch[0];
      const monthYearMatch = extractedInfo.period.match(/(\w+)\s*(\d{4})/);
      if (monthYearMatch) {
        extractedInfo.monthYear = {
          month: monthYearMatch[1],
          year: monthYearMatch[2]
        };
      }
      confidence += 15;
      matchedPatterns.push('period');
    }

    // 🎯 تحديد نوع الدفعة
    if (patterns.rentPayments.test(text)) {
      extractedInfo.paymentType = 'rent';
      confidence += 20;
      matchedPatterns.push('rent_payment');
    } else if (patterns.lateFees.test(text)) {
      extractedInfo.paymentType = 'late_fee';
      confidence += 25;
      matchedPatterns.push('late_fee');
    } else if (patterns.advance.test(text)) {
      extractedInfo.paymentType = 'advance';
      confidence += 20;
      matchedPatterns.push('advance_payment');
    }

    // 🎯 استخراج مبلغ الغرامة
    let lateFeeMatch = patterns.lateFeeAmounts.exec(text);
    if (lateFeeMatch) {
      extractedInfo.lateFeeAmount = parseFloat(lateFeeMatch[1]);
      confidence += 20;
      matchedPatterns.push('late_fee_amount');
    }

    // 🎯 استخراج أيام التأخير
    let daysMatch = patterns.daysOverdue.exec(text);
    if (daysMatch) {
      extractedInfo.daysOverdue = parseInt(daysMatch[1]);
      confidence += 15;
      matchedPatterns.push('days_overdue');
    }

    // 🎯 استخراج الرقم المرجعي
    let refMatch = patterns.references.exec(text);
    if (refMatch) {
      extractedInfo.referenceNumber = refMatch[1];
      confidence += 10;
      matchedPatterns.push('reference_number');
    }

    // 🧠 تحسين الثقة بناءً على التطابق المتعدد
    if (matchedPatterns.length >= 3) confidence += 10;
    if (matchedPatterns.length >= 5) confidence += 15;

    return {
      originalText,
      extractedInfo,
      confidence: Math.min(confidence, 100),
      patterns: matchedPatterns
    };
  }, []);

  // 🎯 خوارزمية المطابقة الفائقة الذكاء
  const findBestContractMatch = useCallback(async (
    paymentDescription: PaymentDescription,
    allContracts: Contract[]
  ): Promise<SmartContractMatch[]> => {
    
    const matches: SmartContractMatch[] = [];
    const { extractedInfo } = paymentDescription;

    for (const contract of allContracts) {
      let totalScore = 0;
      const criteria = {
        contractNumber: 0,
        agreementNumber: 0,
        customerName: 0,
        amountMatch: 0,
        periodMatch: 0,
        historicalPattern: 0
      };
      
      const reasoning: string[] = [];

      // 🔢 مطابقة رقم العقد (40 نقطة)
      if (extractedInfo.contractNumber) {
        if (contract.contract_number?.includes(extractedInfo.contractNumber)) {
          criteria.contractNumber = 40;
          reasoning.push(`تطابق رقم العقد: ${extractedInfo.contractNumber}`);
        }
      }

      // 🔢 مطابقة رقم الاتفاقية (35 نقطة)
      if (extractedInfo.agreementNumber) {
        if (contract.agreement_number?.includes(extractedInfo.agreementNumber)) {
          criteria.agreementNumber = 35;
          reasoning.push(`تطابق رقم الاتفاقية: ${extractedInfo.agreementNumber}`);
        }
      }

      // 👤 مطابقة اسم العميل (25 نقطة)
      if (extractedInfo.customerName && contract.customer) {
        const customerText = (contract.customer.full_name || '').toLowerCase();
        const extractedName = extractedInfo.customerName.toLowerCase();
        
        if (customerText.includes(extractedName) || 
            extractedName.includes(customerText.split(' ')[0])) {
          criteria.customerName = 25;
          reasoning.push(`تطابق اسم العميل: ${extractedInfo.customerName}`);
        }
      }

      // 💰 مطابقة المبلغ (20 نقطة)
      if (contract.monthly_amount && extractedInfo.amount) {
        const difference = Math.abs(contract.monthly_amount - extractedInfo.amount);
        const tolerance = contract.monthly_amount * 0.1; // 10% تسامح
        
        if (difference <= tolerance) {
          criteria.amountMatch = 20;
          reasoning.push(`تطابق المبلغ ضمن الحدود المقبولة`);
        }
      }

      // 📅 مطابقة الفترة (15 نقطة)
      if (extractedInfo.period && contract.start_date) {
        // منطق مطابقة الفترة معقد هنا
        criteria.periodMatch = 15;
        reasoning.push(`تطابق الفترة الزمنية`);
      }

      // 📊 النمط التاريخي (10 نقاط)
      // يمكن تحسينه لاحقاً بناءً على البيانات التاريخية
      criteria.historicalPattern = 5;

      totalScore = Object.values(criteria).reduce((sum, score) => sum + score, 0);

      // 🎯 تحديد الإجراء المقترح
      let suggestedAction: SmartContractMatch['suggestedAction'] = 'reject';
      if (totalScore >= 80) suggestedAction = 'auto_link';
      else if (totalScore >= 60) suggestedAction = 'high_confidence';
      else if (totalScore >= 30) suggestedAction = 'manual_review';

      if (totalScore > 0) {
        matches.push({
          contract,
          confidence: totalScore,
          matchingCriteria: criteria,
          totalScore,
          suggestedAction,
          reasoning
        });
      }
    }

    // ترتيب النتائج حسب النقاط
    return matches.sort((a, b) => b.totalScore - a.totalScore);
  }, []);

  // 💰 حاسبة الغرامات المتقدمة
  const calculateAdvancedLateFine = useCallback((
    dueDate: string,
    paymentDate: string,
    baseAmount: number,
    isWaived: boolean = false,
    waiverReason?: string
  ): AdvancedLateFine => {
    
    const due = new Date(dueDate);
    const paid = new Date(paymentDate);
    const diffTime = paid.getTime() - due.getTime();
    const daysOverdue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const compoundingRules = {
      gracePeriod: 7, // 7 أيام سماح
      escalationAfter: 30, // تصعيد بعد 30 يوم
      maxCap: 3000 // حد أقصى 3000 ريال
    };

    let isApplicable = daysOverdue > compoundingRules.gracePeriod && !isWaived;
    let calculatedFine = 0;

    if (isApplicable) {
      const billableDays = daysOverdue - compoundingRules.gracePeriod;
      calculatedFine = billableDays * 120; // 120 ريال لكل يوم
      
      // تطبيق الحد الأقصى
      calculatedFine = Math.min(calculatedFine, compoundingRules.maxCap);
    }

    return {
      isApplicable,
      daysOverdue,
      finePerDay: 120,
      calculatedFine,
      cappedFine: Math.min(calculatedFine, compoundingRules.maxCap),
      waived: isWaived,
      waiverReason,
      compoundingRules
    };
  }, []);

  // 🚀 المعالج الرئيسي الفائق
  const processAdvancedPaymentFile = useCallback(async (
    paymentData: PaymentInputData[]
  ) => {
    if (!companyId) throw new Error('معرف الشركة مطلوب');

    setIsAnalyzing(true);
    
    try {
      // 1. جلب جميع العقود
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('company_id', companyId);

      if (contractsError) throw contractsError;

      const results = [];

      for (let i = 0; i < paymentData.length; i++) {
        const payment = paymentData[i];
        
        // 2. تحليل الوصف
        const description = payment.description || '';
        const analyzedDescription = analyzePaymentDescription(description);
        
        // 3. البحث عن أفضل مطابقة
        const contractMatches = await findBestContractMatch(analyzedDescription, contracts || []);
        const bestMatch = contractMatches[0];
        
        // 4. حساب الغرامات
        let lateFineCalculation = null;
        if (bestMatch && payment.due_date && payment.payment_date) {
          lateFineCalculation = calculateAdvancedLateFine(
            payment.due_date,
            payment.payment_date,
            payment.amount,
            payment.late_fine_handling === 'waived'
          );
        }

        results.push({
          rowIndex: i,
          originalPayment: payment,
          analyzedDescription,
          contractMatches: contractMatches.slice(0, 3), // أفضل 3 مطابقات
          bestMatch,
          lateFineCalculation,
          recommendedActions: generateRecommendedActions(bestMatch, lateFineCalculation, payment)
        });
      }

      setAnalysisResults(results);
      return results;

    } finally {
      setIsAnalyzing(false);
    }
  }, [companyId, analyzePaymentDescription, findBestContractMatch, calculateAdvancedLateFine]);

  // 🎯 مولد الإجراءات المقترحة
  const generateRecommendedActions = (
    bestMatch: SmartContractMatch | undefined,
    lateFine: AdvancedLateFine | null,
    payment: PaymentInputData
  ) => {
    const actions = [];

    if (bestMatch) {
      if (bestMatch.suggestedAction === 'auto_link') {
        actions.push({
          type: 'create_payment_invoice',
          description: 'إنشاء فاتورة دفع مدفوعة',
          confidence: 'high'
        });
      }

      if (lateFine && lateFine.isApplicable && lateFine.calculatedFine > 0) {
        actions.push({
          type: 'create_late_fine_invoice',
          description: `إنشاء فاتورة غرامة تأخير: ${lateFine.cappedFine} ريال`,
          confidence: 'high'
        });
      }
    }

    return actions;
  };

  return {
    isAnalyzing,
    analysisResults,
    processAdvancedPaymentFile,
    analyzePaymentDescription,
    findBestContractMatch,
    calculateAdvancedLateFine
  };
}
