import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ConversationContext {
  session_id: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: {
      query_type?: string;
      entities?: string[];
      intent?: string;
      confidence?: number;
    };
  }>;
  entities: Map<string, {
    type: 'client' | 'case' | 'document' | 'amount' | 'date';
    value: unknown;
    confidence: number;
    last_mentioned: Date;
  }>;
  implicit_context: {
    current_focus?: 'clients' | 'cases' | 'finances' | 'documents';
    active_entities: string[];
    conversation_flow: string[];
  };
  user_preferences: {
    language_style: 'formal' | 'casual';
    detail_level: 'brief' | 'detailed' | 'comprehensive';
    preferred_examples: string[];
  };
}

export interface ContextAnalysis {
  entities_mentioned: Array<{
    entity: string;
    type: string;
    confidence: number;
  }>;
  implicit_references: Array<{
    reference: string;
    likely_target: string;
    confidence: number;
  }>;
  conversation_intent: {
    primary: string;
    secondary: string[];
    confidence: number;
  };
  context_continuity: {
    relates_to_previous: boolean;
    continuation_type: 'follow_up' | 'clarification' | 'new_topic';
    relevant_history: string[];
  };
}

export const useContextualMemory = () => {
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const sessionRef = useRef<string>();

  // تهيئة جلسة المحادثة
  const initializeSession = useCallback(async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionRef.current = sessionId;

    const newContext: ConversationContext = {
      session_id: sessionId,
      messages: [],
      entities: new Map(),
      implicit_context: {
        active_entities: [],
        conversation_flow: []
      },
      user_preferences: {
        language_style: 'formal',
        detail_level: 'detailed',
        preferred_examples: []
      }
    };

    setContext(newContext);
    setIsInitialized(true);
  }, []);

  // تحليل النص لاستخراج الكيانات والسياق
  const analyzeMessage = useCallback((message: string): ContextAnalysis => {
    // قاموس الكيانات العربية المحسن
    const entityPatterns = {
      client: [
        /عمي?ل/g, /زبو?ن/g, /طرف/g, /شخص/g, /شركة/g,
        /عملاء/g, /زبائن/g, /أطراف/g, /أشخاص/g, /شركات/g
      ],
      payment: [
        /دف[عۥ]/g, /سد[دذ]/g, /أدا?ء/g, /تسدي[دذ]/g, /مبلغ/g,
        /مالي?ة/g, /فلو?س/g, /نقو?د/g, /أموال/g, /مدفوعات/g
      ],
      case: [
        /قضي?ة/g, /دعو[ىی]/g, /نزا?ع/g, /خصو?مة/g, /محاكمة/g,
        /قضايا/g, /دعاو[ىی]/g, /منازعات/g, /خصومات/g
      ],
      document: [
        /وثيقة/g, /مستند/g, /عق[دذ]/g, /ملف/g, /تقرير/g,
        /وثائق/g, /مستندات/g, /عقود/g, /ملفات/g, /تقارير/g
      ],
      amount: [
        /\d+(?:[،,]\d{3})*(?:[.,]\d+)?/g, // أرقام بالفواصل
        /مليو?ن/g, /ألف/g, /مئة/g, /دينار/g, /ريال/g, /درهم/g
      ]
    };

    // استخراج الكيانات
    const entities_mentioned: ContextAnalysis['entities_mentioned'] = [];
    
    Object.entries(entityPatterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        const matches = message.match(pattern);
        if (matches) {
          matches.forEach(match => {
            entities_mentioned.push({
              entity: match,
              type,
              confidence: 0.8
            });
          });
        }
      });
    });

    // تحليل المراجع الضمنية
    const implicit_references: ContextAnalysis['implicit_references'] = [];
    
    // أنماط المراجع الضمنية في العربية
    const implicitPatterns = [
      { pattern: /كم\s+(\w+)/g, type: 'count_query' },
      { pattern: /هذا|هذه|تلك|ذلك/g, type: 'demonstrative' },
      { pattern: /المذكور|المشار|السابق/g, type: 'previous_reference' },
      { pattern: /نفس|ذات/g, type: 'same_reference' }
    ];

    implicitPatterns.forEach(({ pattern, type }) => {
      const matches = message.match(pattern);
      if (matches && context?.messages.length) {
        matches.forEach(match => {
          implicit_references.push({
            reference: match,
            likely_target: context.implicit_context.active_entities[0] || 'previous_topic',
            confidence: 0.7
          });
        });
      }
    });

    // تحديد نية المحادثة
    const conversation_intent = {
      primary: 'information_request',
      secondary: [] as string[],
      confidence: 0.8
    };

    // تحليل أنماط الاستفسار
    if (/كم|عدد|مقدار/.test(message)) {
      conversation_intent.primary = 'count_query';
      conversation_intent.confidence = 0.9;
    } else if (/لماذا|سبب|علة/.test(message)) {
      conversation_intent.primary = 'explanation_request';
    } else if (/كيف|طريقة|إجراء/.test(message)) {
      conversation_intent.primary = 'procedure_inquiry';
    }

    // تحليل استمرارية السياق
    const context_continuity = {
      relates_to_previous: false,
      continuation_type: 'new_topic' as 'follow_up' | 'clarification' | 'new_topic',
      relevant_history: [] as string[]
    };

    if (context?.messages.length) {
      const lastMessage = context.messages[context.messages.length - 1];
      const timeDiff = Date.now() - lastMessage.timestamp.getTime();
      
      // إذا كان الوقت أقل من 5 دقائق واحتوى على مراجع ضمنية
      if (timeDiff < 300000 && implicit_references.length > 0) {
        context_continuity.relates_to_previous = true;
        context_continuity.continuation_type = 'follow_up';
        context_continuity.relevant_history = [lastMessage.content];
      }
    }

    return {
      entities_mentioned,
      implicit_references,
      conversation_intent,
      context_continuity
    };
  }, [context]);

  // إضافة رسالة للسياق
  const addMessage = useCallback((role: 'user' | 'assistant', content: string, metadata?: any) => {
    if (!context) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const analysis = role === 'user' ? analyzeMessage(content) : null;

    const newMessage = {
      id: messageId,
      role,
      content,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        ...(analysis && {
          query_type: analysis.conversation_intent.primary,
          entities: analysis.entities_mentioned.map(e => e.entity),
          intent: analysis.conversation_intent.primary,
          confidence: analysis.conversation_intent.confidence
        })
      }
    };

    setContext(prev => {
      if (!prev) return prev;

      const updatedContext = { ...prev };
      updatedContext.messages = [...prev.messages, newMessage];

      // تحديث الكيانات المستخرجة
      if (analysis) {
        analysis.entities_mentioned.forEach(({ entity, type, confidence }) => {
          updatedContext.entities.set(entity, {
            type: type as any,
            value: entity,
            confidence,
            last_mentioned: new Date()
          });
        });

        // تحديث السياق الضمني
        updatedContext.implicit_context.active_entities = 
          analysis.entities_mentioned.map(e => e.entity).slice(0, 3);
        
        updatedContext.implicit_context.conversation_flow.push(
          analysis.conversation_intent.primary
        );

        // الاحتفاظ بآخر 10 عناصر فقط
        if (updatedContext.implicit_context.conversation_flow.length > 10) {
          updatedContext.implicit_context.conversation_flow = 
            updatedContext.implicit_context.conversation_flow.slice(-10);
        }
      }

      return updatedContext;
    });
  }, [context, analyzeMessage]);

  // الحصول على السياق ذي الصلة لاستفسار معين
  const getRelevantContext = useCallback((query: string): {
    related_messages: typeof context.messages;
    active_entities: Array<{ entity: string; type: string; confidence: number }>;
    suggested_clarifications: string[];
  } => {
    if (!context) {
      return { related_messages: [], active_entities: [], suggested_clarifications: [] };
    }

    const analysis = analyzeMessage(query);
    
    // البحث عن الرسائل ذات الصلة
    const related_messages = context.messages.filter(msg => {
      const msgEntities = msg.metadata?.entities || [];
      const queryEntities = analysis.entities_mentioned.map(e => e.entity);
      
      return msgEntities.some(entity => 
        queryEntities.some(qEntity => 
          entity.includes(qEntity) || qEntity.includes(entity)
        )
      );
    }).slice(-5); // آخر 5 رسائل ذات صلة

    // الحصول على الكيانات النشطة
    const active_entities = Array.from(context.entities.entries())
      .filter(([_, data]) => {
        const timeDiff = Date.now() - data.last_mentioned.getTime();
        return timeDiff < 1800000; // آخر 30 دقيقة
      })
      .map(([entity, data]) => ({
        entity,
        type: data.type,
        confidence: data.confidence
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    // اقتراح توضيحات
    const suggested_clarifications: string[] = [];
    
    if (analysis.implicit_references.length > 0) {
      suggested_clarifications.push('هل تقصد الموضوع الذي ذكرناه سابقاً؟');
    }

    if (analysis.entities_mentioned.length === 0 && context.implicit_context.active_entities.length > 0) {
      suggested_clarifications.push(`هل تقصد ${context.implicit_context.active_entities[0]}؟`);
    }

    if (analysis.conversation_intent.confidence < 0.7) {
      suggested_clarifications.push('هل يمكنك توضيح استفسارك أكثر؟');
    }

    return {
      related_messages,
      active_entities,
      suggested_clarifications
    };
  }, [context, analyzeMessage]);

  // تحديث تفضيلات المستخدم
  const updateUserPreferences = useCallback((preferences: Partial<ConversationContext['user_preferences']>) => {
    setContext(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        user_preferences: {
          ...prev.user_preferences,
          ...preferences
        }
      };
    });
  }, []);

  // تنظيف السياق القديم
  const cleanupOldContext = useCallback(() => {
    setContext(prev => {
      if (!prev) return prev;

      const now = Date.now();
      const oneHourAgo = now - 3600000;

      // إزالة الكيانات القديمة
      const updatedEntities = new Map();
      prev.entities.forEach((data, entity) => {
        if (data.last_mentioned.getTime() > oneHourAgo) {
          updatedEntities.set(entity, data);
        }
      });

      // الاحتفاظ بآخر 20 رسالة فقط
      const recentMessages = prev.messages.slice(-20);

      return {
        ...prev,
        messages: recentMessages,
        entities: updatedEntities
      };
    });
  }, []);

  // تنظيف دوري كل 30 دقيقة
  useEffect(() => {
    const interval = setInterval(cleanupOldContext, 1800000);
    return () => clearInterval(interval);
  }, [cleanupOldContext]);

  return {
    context,
    isInitialized,
    initializeSession,
    addMessage,
    analyzeMessage,
    getRelevantContext,
    updateUserPreferences,
    cleanupOldContext
  };
};