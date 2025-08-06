import { useState, useCallback } from 'react';

export interface ArabicLinguisticAnalysis {
  original_text: string;
  normalized_text: string;
  root_analysis: Array<{
    word: string;
    root: string;
    pattern: string;
    meaning_category: string;
  }>;
  semantic_analysis: {
    primary_meaning: string;
    alternative_meanings: string[];
    context_dependent_meanings: Array<{
      context: string;
      meaning: string;
      confidence: number;
    }>;
  };
  grammatical_analysis: {
    sentence_type: 'statement' | 'question' | 'command' | 'exclamation';
    verb_forms: Array<{
      verb: string;
      tense: 'past' | 'present' | 'future' | 'imperative';
      person: 'first' | 'second' | 'third';
      number: 'singular' | 'dual' | 'plural';
    }>;
    noun_analysis: Array<{
      noun: string;
      case: 'nominative' | 'accusative' | 'genitive';
      definiteness: 'definite' | 'indefinite';
      number: 'singular' | 'dual' | 'plural';
    }>;
  };
  intent_classification: {
    primary_intent: string;
    confidence: number;
    sub_intents: string[];
    urgency_level: 'low' | 'medium' | 'high' | 'urgent';
  };
  emotional_tone: {
    sentiment: 'positive' | 'negative' | 'neutral';
    emotions: Array<{
      emotion: string;
      intensity: number;
    }>;
    formality_level: 'very_formal' | 'formal' | 'neutral' | 'informal' | 'very_informal';
  };
}

export interface QueryIntent {
  type: 'data_query' | 'legal_advice' | 'procedural_question' | 'clarification' | 'complaint';
  specificity: 'specific' | 'general' | 'vague';
  data_requirements: {
    requires_database_query: boolean;
    required_tables: string[];
    filter_conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
  response_type: 'factual' | 'analytical' | 'advisory' | 'interactive';
}

export const useArabicNLP = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  // تطبيع النص العربي المحسن
  const normalizeArabicText = useCallback((text: string): string => {
    let normalized = text;

    // تطبيع الأحرف العربية
    const charNormalizations = {
      // الألف
      'إ|أ|آ|ا': 'ا',
      // الياء
      'ي|ی|ى': 'ي',
      // التاء المربوطة
      'ة': 'ه',
      // الهاء
      'ه|ھ': 'ه',
      // الكاف
      'ك|ک': 'ك',
      // الواو
      'و|ؤ': 'و'
    };

    Object.entries(charNormalizations).forEach(([pattern, replacement]) => {
      const regex = new RegExp(`[${pattern}]`, 'g');
      normalized = normalized.replace(regex, replacement);
    });

    // إزالة التشكيل
    normalized = normalized.replace(/[\u064B-\u0652]/g, '');

    // تطبيع المسافات
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }, []);

  // تحليل الجذور العربية
  const analyzeRoots = useCallback((text: string): ArabicLinguisticAnalysis['root_analysis'] => {
    const words = text.split(' ');
    const rootAnalysis: ArabicLinguisticAnalysis['root_analysis'] = [];

    // قاموس الجذور الشائعة في المجال القانوني
    const legalRoots = {
      'ع-م-ل': { pattern: 'فعل', category: 'work_action' },
      'د-ف-ع': { pattern: 'فعل', category: 'payment' },
      'ق-ض-ي': { pattern: 'فعيل', category: 'legal_matter' },
      'ح-ك-م': { pattern: 'فعل', category: 'judgment' },
      'ع-ق-د': { pattern: 'فعل', category: 'contract' },
      'س-د-د': { pattern: 'فعل', category: 'payment' },
      'و-ث-ق': { pattern: 'فعيل', category: 'document' },
      'ح-ق-ق': { pattern: 'فعل', category: 'rights' },
      'و-ج-ب': { pattern: 'فعل', category: 'obligation' },
      'م-س-ؤ': { pattern: 'فعول', category: 'responsibility' }
    };

    words.forEach(word => {
      // تحليل مبسط للجذور (يمكن تحسينه بخوارزميات أكثر تقدماً)
      let foundRoot = false;
      
      Object.entries(legalRoots).forEach(([root, data]) => {
        const rootLetters = root.split('-');
        if (rootLetters.every(letter => word.includes(letter))) {
          rootAnalysis.push({
            word,
            root,
            pattern: data.pattern,
            meaning_category: data.category
          });
          foundRoot = true;
        }
      });

      if (!foundRoot && word.length > 2) {
        // تحليل تلقائي مبسط
        rootAnalysis.push({
          word,
          root: 'غير محدد',
          pattern: 'غير محدد',
          meaning_category: 'general'
        });
      }
    });

    return rootAnalysis;
  }, []);

  // تحليل دلالي متقدم
  const performSemanticAnalysis = useCallback((text: string): ArabicLinguisticAnalysis['semantic_analysis'] => {
    const normalizedText = normalizeArabicText(text);

    // قواميس دلالية متخصصة
    const semanticDictionary = {
      payment_related: {
        primary: ['دفع', 'سداد', 'أداء', 'تسديد', 'سد', 'دفعة'],
        meanings: ['تسديد مالي', 'دفع مستحقات', 'أداء التزام مالي']
      },
      client_related: {
        primary: ['عميل', 'زبون', 'عملاء', 'زبائن', 'طرف'],
        meanings: ['عميل تجاري', 'طرف في العقد', 'متعامل']
      },
      quantity_inquiry: {
        primary: ['كم', 'عدد', 'مقدار', 'كمية'],
        meanings: ['استفسار عن العدد', 'طلب إحصائية', 'سؤال كمي']
      },
      legal_process: {
        primary: ['قضية', 'دعوى', 'محكمة', 'حكم', 'قانون'],
        meanings: ['إجراء قانوني', 'عملية قضائية', 'أمر قانوني']
      }
    };

    let primary_meaning = 'استفسار عام';
    const alternative_meanings: string[] = [];
    const context_dependent_meanings: Array<{
      context: string;
      meaning: string;
      confidence: number;
    }> = [];

    // تحديد المعنى الأساسي
    Object.entries(semanticDictionary).forEach(([category, data]) => {
      const matchedWords = data.primary.filter(word => 
        normalizedText.includes(normalizeArabicText(word))
      );

      if (matchedWords.length > 0) {
        primary_meaning = data.meanings[0];
        alternative_meanings.push(...data.meanings.slice(1));

        // إضافة معاني حسب السياق
        if (category === 'payment_related' && normalizedText.includes('عميل')) {
          context_dependent_meanings.push({
            context: 'مالية العملاء',
            meaning: 'استفسار عن المدفوعات المستحقة من العملاء',
            confidence: 0.9
          });
        }

        if (category === 'quantity_inquiry' && normalizedText.includes('لم')) {
          context_dependent_meanings.push({
            context: 'استفسار نفي',
            meaning: 'سؤال عن العناصر التي لم تحقق شرطاً معيناً',
            confidence: 0.85
          });
        }
      }
    });

    return {
      primary_meaning,
      alternative_meanings,
      context_dependent_meanings
    };
  }, [normalizeArabicText]);

  // تحليل نحوي مبسط
  const performGrammaticalAnalysis = useCallback((text: string): ArabicLinguisticAnalysis['grammatical_analysis'] => {
    const words = text.split(' ');

    // تحديد نوع الجملة
    let sentence_type: ArabicLinguisticAnalysis['grammatical_analysis']['sentence_type'] = 'statement';
    
    if (text.includes('؟') || text.startsWith('كم') || text.startsWith('ماذا') || text.startsWith('هل')) {
      sentence_type = 'question';
    } else if (text.includes('!') || text.startsWith('يا')) {
      sentence_type = 'exclamation';
    } else if (text.match(/^(افعل|قم|لا تفعل)/)) {
      sentence_type = 'command';
    }

    // تحليل الأفعال (مبسط)
    const verbPatterns = {
      past: /^(فعل|كان|قال|ذهب|جاء|دفع|سدد)/,
      present: /^(يفعل|يكون|يقول|يذهب|يأتي|يدفع|يسدد)/,
      future: /^(سيفعل|سوف)/,
      imperative: /^(افعل|قل|اذهب|ادفع|سدد)/
    };

    const verb_forms: ArabicLinguisticAnalysis['grammatical_analysis']['verb_forms'] = [];
    
    words.forEach(word => {
      Object.entries(verbPatterns).forEach(([tense, pattern]) => {
        if (pattern.test(word)) {
          verb_forms.push({
            verb: word,
            tense: tense as any,
            person: 'third', // تحليل مبسط
            number: 'singular'
          });
        }
      });
    });

    // تحليل الأسماء (مبسط)
    const noun_analysis: ArabicLinguisticAnalysis['grammatical_analysis']['noun_analysis'] = [];
    
    words.forEach(word => {
      if (!verbPatterns.past.test(word) && !verbPatterns.present.test(word)) {
        noun_analysis.push({
          noun: word,
          case: 'nominative', // افتراضي
          definiteness: word.startsWith('ال') ? 'definite' : 'indefinite',
          number: word.endsWith('ون') || word.endsWith('ين') ? 'plural' : 'singular'
        });
      }
    });

    return {
      sentence_type,
      verb_forms,
      noun_analysis
    };
  }, []);

  // تصنيف النية المحسن
  const classifyIntent = useCallback((text: string, semanticAnalysis: ArabicLinguisticAnalysis['semantic_analysis']): ArabicLinguisticAnalysis['intent_classification'] => {
    const normalizedText = normalizeArabicText(text);
    
    // أنماط تصنيف النية
    const intentPatterns = {
      data_query: {
        patterns: [/كم/, /عدد/, /مقدار/, /كمية/, /إحصائية/, /قائمة/],
        confidence_boost: 0.3
      },
      legal_advice: {
        patterns: [/استشارة/, /رأي/, /حكم/, /قانون/, /حق/, /واجب/],
        confidence_boost: 0.2
      },
      procedural_question: {
        patterns: [/كيف/, /طريقة/, /إجراء/, /خطوات/, /عملية/],
        confidence_boost: 0.25
      },
      clarification: {
        patterns: [/وضح/, /اشرح/, /فسر/, /مقصود/, /يعني/],
        confidence_boost: 0.15
      },
      complaint: {
        patterns: [/شكوى/, /مشكلة/, /خطأ/, /لا يعمل/, /فشل/],
        confidence_boost: 0.4
      }
    };

    let primary_intent = 'data_query';
    let base_confidence = 0.5;
    const sub_intents: string[] = [];

    // تحديد النية الأساسية
    Object.entries(intentPatterns).forEach(([intent, data]) => {
      const matchCount = data.patterns.filter(pattern => 
        pattern.test(normalizedText)
      ).length;

      if (matchCount > 0) {
        const intent_confidence = base_confidence + (matchCount * data.confidence_boost);
        if (intent_confidence > base_confidence) {
          primary_intent = intent;
          base_confidence = intent_confidence;
        }
        sub_intents.push(intent);
      }
    });

    // تحديد مستوى الإلحاح
    let urgency_level: ArabicLinguisticAnalysis['intent_classification']['urgency_level'] = 'medium';
    
    if (normalizedText.includes('عاجل') || normalizedText.includes('فوري') || normalizedText.includes('سريع')) {
      urgency_level = 'urgent';
    } else if (normalizedText.includes('مهم') || normalizedText.includes('ضروري')) {
      urgency_level = 'high';
    } else if (normalizedText.includes('وقت فراغ') || normalizedText.includes('عادي')) {
      urgency_level = 'low';
    }

    return {
      primary_intent,
      confidence: Math.min(base_confidence, 1.0),
      sub_intents,
      urgency_level
    };
  }, [normalizeArabicText]);

  // تحليل النبرة العاطفية
  const analyzeEmotionalTone = useCallback((text: string): ArabicLinguisticAnalysis['emotional_tone'] => {
    const normalizedText = normalizeArabicText(text);

    // معجم المشاعر العربي
    const emotionLexicon = {
      positive: {
        words: ['شكرا', 'ممتاز', 'جيد', 'راض', 'سعيد', 'مفيد', 'فعال'],
        intensity: { weak: 0.3, medium: 0.6, strong: 0.9 }
      },
      negative: {
        words: ['مشكلة', 'سيء', 'غاضب', 'محبط', 'فاشل', 'خطأ', 'معقد'],
        intensity: { weak: 0.3, medium: 0.6, strong: 0.9 }
      },
      neutral: {
        words: ['عادي', 'طبيعي', 'معتاد', 'موضوعي'],
        intensity: { weak: 0.2, medium: 0.5, strong: 0.8 }
      }
    };

    let sentiment: ArabicLinguisticAnalysis['emotional_tone']['sentiment'] = 'neutral';
    const emotions: Array<{ emotion: string; intensity: number }> = [];

    // تحليل المشاعر
    Object.entries(emotionLexicon).forEach(([emotion, data]) => {
      const matchedWords = data.words.filter(word => normalizedText.includes(word));
      if (matchedWords.length > 0) {
        sentiment = emotion as any;
        emotions.push({
          emotion,
          intensity: matchedWords.length > 2 ? data.intensity.strong : 
                   matchedWords.length > 1 ? data.intensity.medium : data.intensity.weak
        });
      }
    });

    // تحديد مستوى الرسمية
    let formality_level: ArabicLinguisticAnalysis['emotional_tone']['formality_level'] = 'neutral';
    
    const formalIndicators = ['حضرتكم', 'سيادتكم', 'المحترم', 'تفضلوا', 'يرجى'];
    const informalIndicators = ['شلونك', 'كيفك', 'وين', 'شنو', 'ايش'];

    if (formalIndicators.some(indicator => normalizedText.includes(indicator))) {
      formality_level = 'very_formal';
    } else if (informalIndicators.some(indicator => normalizedText.includes(indicator))) {
      formality_level = 'informal';
    } else if (normalizedText.includes('سيد') || normalizedText.includes('أستاذ')) {
      formality_level = 'formal';
    }

    return {
      sentiment,
      emotions,
      formality_level
    };
  }, [normalizeArabicText]);

  // التحليل الشامل للنص العربي
  const analyzeArabicText = useCallback(async (text: string): Promise<ArabicLinguisticAnalysis> => {
    setIsProcessing(true);

    try {
      const normalized_text = normalizeArabicText(text);
      const root_analysis = analyzeRoots(normalized_text);
      const semantic_analysis = performSemanticAnalysis(text);
      const grammatical_analysis = performGrammaticalAnalysis(text);
      const intent_classification = classifyIntent(text, semantic_analysis);
      const emotional_tone = analyzeEmotionalTone(text);

      return {
        original_text: text,
        normalized_text,
        root_analysis,
        semantic_analysis,
        grammatical_analysis,
        intent_classification,
        emotional_tone
      };
    } finally {
      setIsProcessing(false);
    }
  }, [normalizeArabicText, analyzeRoots, performSemanticAnalysis, performGrammaticalAnalysis, classifyIntent, analyzeEmotionalTone]);

  // استخراج متطلبات الاستفسار من البيانات
  const extractQueryIntent = useCallback((analysis: ArabicLinguisticAnalysis): QueryIntent => {
    const { intent_classification, semantic_analysis, root_analysis } = analysis;

    // تحديد نوع الاستفسار
    let type: QueryIntent['type'] = 'legal_advice';
    if (intent_classification.primary_intent === 'data_query') {
      type = 'data_query';
    } else if (intent_classification.primary_intent === 'procedural_question') {
      type = 'procedural_question';
    } else if (intent_classification.primary_intent === 'clarification') {
      type = 'clarification';
    } else if (intent_classification.primary_intent === 'complaint') {
      type = 'complaint';
    }

    // تحديد مستوى التخصص
    const specificity: QueryIntent['specificity'] = 
      intent_classification.confidence > 0.8 ? 'specific' :
      intent_classification.confidence > 0.6 ? 'general' : 'vague';

    // تحديد متطلبات البيانات
    const data_requirements: QueryIntent['data_requirements'] = {
      requires_database_query: type === 'data_query',
      required_tables: [],
      filter_conditions: []
    };

    // تحليل الجذور لتحديد الجداول المطلوبة
    root_analysis.forEach(({ meaning_category }) => {
      switch (meaning_category) {
        case 'work_action':
          data_requirements.required_tables.push('clients', 'projects');
          break;
        case 'payment':
          data_requirements.required_tables.push('payments', 'invoices');
          break;
        case 'legal_matter':
          data_requirements.required_tables.push('cases', 'legal_documents');
          break;
        case 'contract':
          data_requirements.required_tables.push('contracts', 'agreements');
          break;
        case 'document':
          data_requirements.required_tables.push('documents', 'files');
          break;
      }
    });

    // إزالة التكرار
    data_requirements.required_tables = [...new Set(data_requirements.required_tables)];

    // تحديد شروط التصفية
    if (analysis.original_text.includes('لم يدفع') || analysis.original_text.includes('لم يسدد')) {
      data_requirements.filter_conditions.push({
        field: 'payment_status',
        operator: '!=',
        value: 'paid'
      });
    }

    if (analysis.original_text.includes('منتهي') || analysis.original_text.includes('منقضي')) {
      data_requirements.filter_conditions.push({
        field: 'status',
        operator: '=',
        value: 'expired'
      });
    }

    // تحديد نوع الاستجابة
    const response_type: QueryIntent['response_type'] = 
      type === 'data_query' ? 'factual' :
      type === 'legal_advice' ? 'advisory' :
      type === 'clarification' ? 'interactive' : 'analytical';

    return {
      type,
      specificity,
      data_requirements,
      response_type
    };
  }, []);

  return {
    analyzeArabicText,
    extractQueryIntent,
    normalizeArabicText,
    isProcessing
  };
};