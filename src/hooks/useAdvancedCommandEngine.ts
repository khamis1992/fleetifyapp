import { useState, useCallback, useRef } from 'react';
import { useChatGPTLevelAI } from './useChatGPTLevelAI';
import { useExecutiveAISystem, ExecutiveCommand } from './useExecutiveAISystem';

// أنواع الأوامر المدعومة
export type CommandCategory = 
  | 'customer_management'
  | 'contract_management'
  | 'vehicle_management'
  | 'financial_operations'
  | 'reporting'
  | 'maintenance'
  | 'legal_actions';

// واجهة تحليل الأمر
export interface CommandAnalysis {
  category: CommandCategory;
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  requiredParameters: string[];
  missingParameters: string[];
  suggestedActions: ExecutiveCommand[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  legalImplications?: string[];
}

// واجهة السياق التنفيذي
export interface ExecutionContext {
  companyId: string;
  userId: string;
  userRole: string;
  currentSession: string;
  recentOperations: any[];
  systemState: Record<string, any>;
}

export const useAdvancedCommandEngine = (companyId: string, userId: string) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [commandHistory, setCommandHistory] = useState<CommandAnalysis[]>([]);
  const [contextMemory, setContextMemory] = useState<Record<string, any>>({});
  
  const { processQuery } = useChatGPTLevelAI(companyId, userId);
  const executiveSystem = useExecutiveAISystem(companyId, userId);
  
  const analysisCounter = useRef(0);

  // قاموس المصطلحات والمرادفات
  const synonymDictionary = {
    // مصطلحات العملاء
    'عميل': ['عميل', 'زبون', 'مستأجر', 'العميل', 'الزبون', 'المستأجر'],
    'عملاء': ['عملاء', 'زبائن', 'مستأجرين', 'العملاء', 'الزبائن', 'المستأجرين'],
    
    // مصطلحات العقود
    'عقد': ['عقد', 'اتفاقية', 'تعاقد', 'العقد', 'الاتفاقية'],
    'عقود': ['عقود', 'اتفاقيات', 'تعاقدات', 'العقود', 'الاتفاقيات'],
    
    // مصطلحات المركبات
    'مركبة': ['مركبة', 'سيارة', 'عربة', 'المركبة', 'السيارة', 'العربة'],
    'مركبات': ['مركبات', 'سيارات', 'عربات', 'المركبات', 'السيارات', 'العربات'],
    
    // مصطلحات المالية
    'فاتورة': ['فاتورة', 'حساب', 'مطالبة', 'الفاتورة', 'الحساب', 'المطالبة'],
    'دفعة': ['دفعة', 'دفع', 'سداد', 'الدفعة', 'الدفع', 'السداد'],
    'مخالفة': ['مخالفة', 'غرامة', 'جزاء', 'المخالفة', 'الغرامة', 'الجزاء'],
    
    // أفعال العمليات
    'أنشئ': ['أنشئ', 'اعمل', 'كون', 'أضف', 'سجل', 'أدخل'],
    'حديث': ['حديث', 'عدل', 'غير', 'طور', 'حسن'],
    'احذف': ['احذف', 'امسح', 'ألغ', 'أزل'],
    'ابحث': ['ابحث', 'اعثر', 'جد', 'دور', 'فتش']
  };

  // أنماط الأوامر المعقدة
  const commandPatterns = [
    // أنماط إدارة العملاء
    {
      pattern: /(?:أضف|سجل|أنشئ)\s+(?:عميل|زبون)\s+(?:جديد\s+)?(?:اسمه|يسمى|باسم)?\s*([^\s]+(?:\s+[^\s]+)*)/i,
      category: 'customer_management' as CommandCategory,
      intent: 'create_customer',
      extractEntities: (match: RegExpMatchArray) => ({
        customerName: match[1],
        action: 'create'
      })
    },
    
    // أنماط إدارة العقود
    {
      pattern: /(?:افتح|أنشئ|اعمل)\s+عقد\s+(?:تأجير\s+)?(?:جديد\s+)?(?:للعميل|للسيد|للسيدة)\s+([^\s]+)(?:\s+لمدة\s+(\d+)\s*(يوم|أسبوع|شهر|سنة))?/i,
      category: 'contract_management' as CommandCategory,
      intent: 'create_contract',
      extractEntities: (match: RegExpMatchArray) => ({
        customerName: match[1],
        duration: match[2] ? parseInt(match[2]) : null,
        durationUnit: match[3] || null,
        action: 'create'
      })
    },
    
    // أنماط المخالفات المرورية
    {
      pattern: /(?:سجل|أضف|اكتب)\s+مخالفة\s+(?:مرورية\s+)?(?:على|للعميل|للسيد)\s+([^\s]+)(?:\s+(?:بمبلغ|قيمة|غرامة)\s+(\d+))?/i,
      category: 'legal_actions' as CommandCategory,
      intent: 'register_violation',
      extractEntities: (match: RegExpMatchArray) => ({
        customerName: match[1],
        fineAmount: match[2] ? parseInt(match[2]) : null,
        violationType: 'مخالفة مرورية',
        action: 'register'
      })
    },
    
    // أنماط إدارة المركبات
    {
      pattern: /(?:أضف|سجل)\s+(?:مركبة|سيارة)\s+(?:جديدة\s+)?(?:برقم|لوحة|رقم لوحة)\s+([^\s]+)(?:\s+(?:نوع|ماركة)\s+([^\s]+))?/i,
      category: 'vehicle_management' as CommandCategory,
      intent: 'create_vehicle',
      extractEntities: (match: RegExpMatchArray) => ({
        plateNumber: match[1],
        make: match[2] || null,
        action: 'create'
      })
    },
    
    // أنماط العمليات المالية
    {
      pattern: /(?:أنشئ|اعمل)\s+فاتورة\s+(?:جديدة\s+)?(?:للعميل|للسيد)\s+([^\s]+)(?:\s+(?:بمبلغ|قيمة)\s+(\d+))?/i,
      category: 'financial_operations' as CommandCategory,
      intent: 'create_invoice',
      extractEntities: (match: RegExpMatchArray) => ({
        customerName: match[1],
        amount: match[2] ? parseInt(match[2]) : null,
        action: 'create'
      })
    },
    
    // أنماط تسجيل المدفوعات
    {
      pattern: /(?:سجل|أضف)\s+(?:دفعة|دفع|سداد)\s+(?:من العميل|من السيد)\s+([^\s]+)\s+(?:بمبلغ|قيمة)\s+(\d+)/i,
      category: 'financial_operations' as CommandCategory,
      intent: 'record_payment',
      extractEntities: (match: RegExpMatchArray) => ({
        customerName: match[1],
        amount: parseInt(match[2]),
        action: 'record'
      })
    },
    
    // أنماط التقارير
    {
      pattern: /(?:أنشئ|اعمل|اعرض)\s+تقرير\s+(?:عن\s+)?([^\s]+)(?:\s+(?:من|للفترة)\s+([^\s]+)(?:\s+(?:إلى|حتى)\s+([^\s]+))?)?/i,
      category: 'reporting' as CommandCategory,
      intent: 'generate_report',
      extractEntities: (match: RegExpMatchArray) => ({
        reportType: match[1],
        startDate: match[2] || null,
        endDate: match[3] || null,
        action: 'generate'
      })
    }
  ];

  // تحليل الأمر المتقدم
  const analyzeCommand = useCallback(async (input: string): Promise<CommandAnalysis> => {
    setIsAnalyzing(true);
    
    try {
      const analysisId = ++analysisCounter.current;
      let bestMatch: CommandAnalysis | null = null;
      let highestConfidence = 0;

      // تطبيق الأنماط المحددة مسبقاً
      for (const pattern of commandPatterns) {
        const match = input.match(pattern.pattern);
        if (match) {
          const entities = pattern.extractEntities(match);
          const confidence = calculatePatternConfidence(match, input);
          
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = {
              category: pattern.category,
              intent: pattern.intent,
              entities,
              confidence,
              requiredParameters: getRequiredParameters(pattern.intent),
              missingParameters: [],
              suggestedActions: [],
              riskLevel: assessRiskLevel(pattern.intent, entities)
            };
          }
        }
      }

      // إذا لم نجد تطابق مباشر، استخدم الذكاء الاصطناعي للتحليل
      if (!bestMatch || bestMatch.confidence < 0.7) {
        bestMatch = await analyzeWithAI(input);
      }

      // تحديد المعاملات المفقودة
      if (bestMatch) {
        bestMatch.missingParameters = bestMatch.requiredParameters.filter(
          param => !bestMatch!.entities[param] || bestMatch!.entities[param] === null
        );

        // توليد الأوامر التنفيذية المقترحة
        bestMatch.suggestedActions = await generateExecutiveCommands(bestMatch);

        // تحليل التداعيات القانونية
        bestMatch.legalImplications = await analyzeLegalImplications(bestMatch);
      }

      // حفظ في التاريخ
      if (bestMatch) {
        setCommandHistory(prev => [bestMatch!, ...prev.slice(0, 49)]); // الاحتفاظ بآخر 50 تحليل
      }

      return bestMatch || {
        category: 'customer_management',
        intent: 'unknown',
        entities: {},
        confidence: 0,
        requiredParameters: [],
        missingParameters: [],
        suggestedActions: [],
        riskLevel: 'low'
      };

    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // حساب ثقة النمط
  const calculatePatternConfidence = (match: RegExpMatchArray, input: string): number => {
    let confidence = 0.8; // ثقة أساسية للتطابق

    // زيادة الثقة بناءً على اكتمال المعلومات
    const matchLength = match[0].length;
    const inputLength = input.length;
    const coverageRatio = matchLength / inputLength;
    confidence += coverageRatio * 0.2;

    // تقليل الثقة إذا كان هناك نص إضافي غير مفهوم
    const unmatchedText = input.replace(match[0], '').trim();
    if (unmatchedText.length > 10) {
      confidence -= 0.1;
    }

    return Math.min(confidence, 1.0);
  };

  // تحليل باستخدام الذكاء الاصطناعي
  const analyzeWithAI = async (input: string): Promise<CommandAnalysis> => {
    try {
      const analysisPrompt = `
      حلل الأمر التالي واستخرج المعلومات المطلوبة:
      
      الأمر: "${input}"
      
      يرجى تحديد:
      1. فئة الأمر (customer_management, contract_management, vehicle_management, financial_operations, reporting, maintenance, legal_actions)
      2. النية (create, update, delete, search, register, generate)
      3. الكيانات المذكورة (أسماء، أرقام، تواريخ، إلخ)
      4. مستوى الثقة (0-1)
      5. مستوى المخاطر (low, medium, high, critical)
      
      أجب بصيغة JSON فقط.
      `;

      const aiResponse = await processQuery(analysisPrompt);
      
      // محاولة استخراج JSON من الاستجابة
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          category: parsed.category || 'customer_management',
          intent: parsed.intent || 'unknown',
          entities: parsed.entities || {},
          confidence: parsed.confidence || 0.5,
          requiredParameters: getRequiredParameters(parsed.intent),
          missingParameters: [],
          suggestedActions: [],
          riskLevel: parsed.riskLevel || 'medium'
        };
      }
    } catch (error) {
      console.error('خطأ في التحليل بالذكاء الاصطناعي:', error);
    }

    // إرجاع تحليل افتراضي في حالة الفشل
    return {
      category: 'customer_management',
      intent: 'unknown',
      entities: {},
      confidence: 0.3,
      requiredParameters: [],
      missingParameters: [],
      suggestedActions: [],
      riskLevel: 'medium'
    };
  };

  // الحصول على المعاملات المطلوبة
  const getRequiredParameters = (intent: string): string[] => {
    const parameterMap: Record<string, string[]> = {
      'create_customer': ['customerName'],
      'create_contract': ['customerName', 'duration', 'durationUnit'],
      'register_violation': ['customerName', 'violationType'],
      'create_vehicle': ['plateNumber'],
      'create_invoice': ['customerName', 'amount'],
      'record_payment': ['customerName', 'amount'],
      'generate_report': ['reportType']
    };

    return parameterMap[intent] || [];
  };

  // تقييم مستوى المخاطر
  const assessRiskLevel = (intent: string, entities: Record<string, any>): 'low' | 'medium' | 'high' | 'critical' => {
    const highRiskOperations = ['delete', 'terminate', 'blacklist'];
    const mediumRiskOperations = ['create_contract', 'register_violation', 'update'];
    const lowRiskOperations = ['search', 'generate_report', 'create_customer'];

    if (highRiskOperations.some(op => intent.includes(op))) {
      return 'high';
    }

    if (mediumRiskOperations.some(op => intent.includes(op))) {
      return 'medium';
    }

    // تحقق من المبالغ المالية الكبيرة
    if (entities.amount && entities.amount > 10000) {
      return 'high';
    }

    if (entities.amount && entities.amount > 1000) {
      return 'medium';
    }

    return 'low';
  };

  // توليد الأوامر التنفيذية
  const generateExecutiveCommands = async (analysis: CommandAnalysis): Promise<ExecutiveCommand[]> => {
    const commands: ExecutiveCommand[] = [];

    // تحويل التحليل إلى أوامر تنفيذية
    switch (analysis.intent) {
      case 'create_customer':
        commands.push({
          id: `cmd_${Date.now()}`,
          operation: 'create_customer',
          parameters: analysis.entities,
          description: `إنشاء عميل جديد: ${analysis.entities.customerName}`,
          requiresConfirmation: true,
          estimatedImpact: 'medium',
          affectedRecords: ['customers']
        });
        break;

      case 'create_contract':
        commands.push({
          id: `cmd_${Date.now()}`,
          operation: 'create_contract',
          parameters: analysis.entities,
          description: `إنشاء عقد جديد للعميل: ${analysis.entities.customerName}`,
          requiresConfirmation: true,
          estimatedImpact: 'high',
          affectedRecords: ['contracts', 'customers', 'vehicles']
        });
        break;

      case 'register_violation':
        commands.push({
          id: `cmd_${Date.now()}`,
          operation: 'register_violation',
          parameters: {
            ...analysis.entities,
            violationDate: new Date().toISOString().split('T')[0]
          },
          description: `تسجيل مخالفة للعميل: ${analysis.entities.customerName}`,
          requiresConfirmation: true,
          estimatedImpact: 'medium',
          affectedRecords: ['traffic_violations', 'customers']
        });
        break;

      // إضافة المزيد من الحالات حسب الحاجة
    }

    return commands;
  };

  // تحليل التداعيات القانونية
  const analyzeLegalImplications = async (analysis: CommandAnalysis): Promise<string[]> => {
    const implications: string[] = [];

    switch (analysis.category) {
      case 'legal_actions':
        implications.push('قد تتطلب هذه العملية إشعار العميل قانونياً');
        implications.push('يجب التأكد من صحة المعلومات قبل التسجيل');
        break;

      case 'contract_management':
        implications.push('يجب مراجعة الشروط والأحكام القانونية');
        implications.push('قد تتطلب موافقة إضافية من الإدارة');
        break;

      case 'financial_operations':
        if (analysis.entities.amount > 5000) {
          implications.push('المبلغ كبير ويتطلب مراجعة إضافية');
          implications.push('قد تحتاج لموافقة مدير مالي');
        }
        break;
    }

    return implications;
  };

  // معالجة الأمر الذكي
  const processIntelligentCommand = useCallback(async (input: string) => {
    const analysis = await analyzeCommand(input);
    
    if (analysis.confidence < 0.5) {
      return {
        success: false,
        message: 'لم أتمكن من فهم الأمر بوضوح. يرجى إعادة الصياغة.',
        analysis,
        needsClarification: true
      };
    }

    if (analysis.missingParameters.length > 0) {
      return {
        success: false,
        message: `معلومات ناقصة. يرجى تحديد: ${analysis.missingParameters.join(', ')}`,
        analysis,
        needsMoreInfo: true
      };
    }

    // تمرير الأوامر لنظام التنفيذ
    const executionResult = await executiveSystem.processNaturalLanguageCommand(input);

    return {
      success: executionResult.success,
      message: executionResult.message,
      analysis,
      executionResult,
      commands: executionResult.commands
    };
  }, [analyzeCommand, executiveSystem]);

  // اقتراح أوامر بديلة
  const suggestAlternativeCommands = useCallback((input: string): string[] => {
    const suggestions: string[] = [];
    const lowerInput = input.toLowerCase();

    // اقتراحات بناءً على الكلمات المفتاحية
    if (lowerInput.includes('عميل')) {
      suggestions.push('أضف عميل جديد اسمه أحمد محمد');
      suggestions.push('ابحث عن العميل محمد علي');
      suggestions.push('حديث بيانات العميل سارة أحمد');
    }

    if (lowerInput.includes('عقد')) {
      suggestions.push('افتح عقد تأجير للعميل أحمد لمدة شهر');
      suggestions.push('جدد عقد العميل محمد');
      suggestions.push('أنهي عقد العميل سارة');
    }

    if (lowerInput.includes('مخالفة')) {
      suggestions.push('سجل مخالفة مرورية على العميل أحمد بمبلغ 100 دينار');
      suggestions.push('اعرض مخالفات العميل محمد');
    }

    return suggestions;
  }, []);

  return {
    // الحالة
    isAnalyzing,
    commandHistory,
    contextMemory,
    
    // الوظائف الأساسية
    analyzeCommand,
    processIntelligentCommand,
    suggestAlternativeCommands,
    
    // الوظائف المساعدة
    calculatePatternConfidence,
    assessRiskLevel,
    
    // الإحصائيات
    stats: {
      totalAnalyses: commandHistory.length,
      successfulAnalyses: commandHistory.filter(cmd => cmd.confidence > 0.7).length,
      averageConfidence: commandHistory.length > 0 
        ? commandHistory.reduce((sum, cmd) => sum + cmd.confidence, 0) / commandHistory.length 
        : 0
    },
    
    // دمج مع النظام التنفيذي
    executiveSystem
  };
};

