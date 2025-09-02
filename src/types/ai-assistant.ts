/**
 * أنواع البيانات الأساسية للمساعد الذكي
 * AI Assistant Types and Interfaces
 */

// الـ 6 Primitives الأساسية من دليل OpenAI
export type AIUseCasePrimitive = 
  | 'content_creation'    // إنشاء المحتوى
  | 'research'           // البحث والتحليل
  | 'data_analysis'      // تحليل البيانات
  | 'automation'         // الأتمتة
  | 'coding'            // البرمجة والتطوير
  | 'ideation_strategy'; // الأفكار والاستراتيجية

// وحدات النظام المختلفة
export type SystemModule = 
  | 'legal'       // النظام القانوني
  | 'contracts'   // إدارة العقود
  | 'finance'     // النظام المالي
  | 'fleet'       // إدارة الأسطول
  | 'hr'          // الموارد البشرية
  | 'customers'   // إدارة العملاء
  | 'reports'     // التقارير
  | 'dashboard';  // لوحة التحكم

// أنواع المهام المختلفة
export type TaskType = 
  | 'generate_document'     // توليد وثيقة
  | 'analyze_data'         // تحليل البيانات
  | 'create_report'        // إنشاء تقرير
  | 'suggest_action'       // اقتراح إجراء
  | 'automate_process'     // أتمتة عملية
  | 'research_topic'       // بحث موضوع
  | 'optimize_workflow'    // تحسين سير العمل
  | 'predict_outcome';     // توقع النتائج

// مستوى الأولوية حسب Impact/Effort Framework
export type PriorityLevel = 
  | 'quick_win'           // مكاسب سريعة
  | 'self_service'        // خدمة ذاتية
  | 'high_value'          // عالي القيمة
  | 'deprioritize';       // منخفض الأولوية

// واجهة تكوين المساعد الذكي
export interface AIAssistantConfig {
  module: SystemModule;
  primitives: AIUseCasePrimitive[];
  context: Record<string, any>;
  priority: PriorityLevel;
  enabledFeatures: AIFeature[];
}

// الميزات المتاحة للمساعد الذكي
export interface AIFeature {
  id: string;
  name: string;
  description: string;
  primitive: AIUseCasePrimitive;
  taskType: TaskType;
  enabled: boolean;
  icon?: string;
}

// رسالة المحادثة مع المساعد الذكي
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    taskType?: TaskType;
    primitive?: AIUseCasePrimitive;
    confidence?: number;
    sources?: string[];
    attachments?: AIAttachment[];
  };
}

// المرفقات والملفات
export interface AIAttachment {
  id: string;
  name: string;
  type: 'document' | 'image' | 'data' | 'template';
  url?: string;
  content?: string;
  metadata?: Record<string, any>;
}

// استجابة المساعد الذكي
export interface AIResponse {
  success: boolean;
  message: string;
  data?: any;
  suggestions?: AISuggestion[];
  actions?: AIAction[];
  confidence?: number;
  processingTime?: number;
}

// اقتراحات المساعد الذكي
export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  confidence: number;
  primitive: AIUseCasePrimitive;
  metadata?: Record<string, any>;
}

// الإجراءات المقترحة
export interface AIAction {
  id: string;
  title: string;
  description: string;
  type: 'button' | 'link' | 'form' | 'download';
  handler: string | (() => void);
  icon?: string;
  variant?: 'primary' | 'secondary' | 'destructive';
}

// حالة المساعد الذكي
export interface AIAssistantState {
  isActive: boolean;
  isLoading: boolean;
  currentTask?: TaskType;
  messages: AIMessage[];
  suggestions: AISuggestion[];
  context: Record<string, any>;
  error?: string;
}

// إعدادات المساعد الذكي للمستخدم
export interface AIUserPreferences {
  userId: string;
  enabledModules: SystemModule[];
  preferredPrimitives: AIUseCasePrimitive[];
  autoSuggestions: boolean;
  notificationsEnabled: boolean;
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

// إحصائيات استخدام المساعد الذكي
export interface AIUsageStats {
  totalInteractions: number;
  successfulTasks: number;
  averageResponseTime: number;
  mostUsedPrimitive: AIUseCasePrimitive;
  mostUsedModule: SystemModule;
  userSatisfactionScore: number;
  timesSaved: number; // بالدقائق
}

// قالب المهام المحددة مسبقاً
export interface AITaskTemplate {
  id: string;
  name: string;
  description: string;
  module: SystemModule;
  primitive: AIUseCasePrimitive;
  taskType: TaskType;
  prompt: string;
  requiredContext: string[];
  expectedOutput: string;
  estimatedTime: number; // بالثواني
}

// نتيجة تحليل البيانات
export interface AIDataAnalysisResult {
  summary: string;
  insights: string[];
  recommendations: string[];
  charts?: {
    type: 'line' | 'bar' | 'pie' | 'radar';
    data: any[];
    config: Record<string, any>;
  }[];
  confidence: number;
  dataQuality: number;
}

// نتيجة إنشاء المحتوى
export interface AIContentCreationResult {
  content: string;
  type: 'document' | 'email' | 'report' | 'contract' | 'letter';
  format: 'html' | 'markdown' | 'pdf' | 'docx';
  metadata: {
    wordCount: number;
    readingTime: number;
    tone: string;
    language: string;
  };
  alternatives?: string[];
}

// نتيجة البحث والتحليل
export interface AIResearchResult {
  query: string;
  results: {
    title: string;
    summary: string;
    source: string;
    relevance: number;
    date?: Date;
  }[];
  synthesis: string;
  recommendations: string[];
  confidence: number;
}
