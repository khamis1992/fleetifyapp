/**
 * مساعد الكتب الرسمية الذكي
 * Smart Official Document Generator
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  FileText, 
  Printer,
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  CheckCircle2,
  Building2,
  Car,
  User,
  FileEdit,
  Bot,
  ChevronLeft,
  Download,
  Eye
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

import {
  DOCUMENT_TEMPLATES,
  DOCUMENT_CATEGORIES,
  generateOfficialDocument,
  DocumentTemplate,
  Question,
} from '@/services/ai/ZhipuAIService';

// أنواع الرسائل
interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'system';
  content: string;
  timestamp: Date;
  questionId?: string;
  options?: string[];
}

// خطوات المحادثة
type ConversationStep = 'welcome' | 'category' | 'template' | 'questions' | 'generating' | 'preview';

const categoryIcons: Record<string, any> = {
  insurance: Building2,
  traffic: Car,
  customer: User,
  general: FileEdit,
};

export default function SmartDocumentGenerator() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // الحالات
  const [step, setStep] = useState<ConversationStep>('welcome');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // التمرير التلقائي للرسائل
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // رسالة الترحيب
  useEffect(() => {
    if (messages.length === 0) {
      addBotMessage(
        'مرحباً بك في مساعد الكتب الرسمية الذكي! 👋\n\nأنا هنا لمساعدتك في إنشاء الكتب الرسمية بسهولة وسرعة.\n\nاختر نوع الكتاب الذي تريد إنشاءه:'
      );
      setStep('category');
    }
  }, []);

  // إضافة رسالة من البوت
  const addBotMessage = (content: string, options?: string[], questionId?: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date(),
      options,
      questionId,
    };
    setMessages(prev => [...prev, message]);
  };

  // إضافة رسالة من المستخدم
  const addUserMessage = (content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  // اختيار الفئة
  const handleCategorySelect = (categoryId: string) => {
    const category = DOCUMENT_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    addUserMessage(`${category.icon} ${category.name}`);
    setSelectedCategory(categoryId);
    
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const templates = DOCUMENT_TEMPLATES.filter(t => t.category === categoryId);
      const templatesList = templates.map(t => `• ${t.name}`).join('\n');
      addBotMessage(
        `ممتاز! اخترت قسم ${category.name}.\n\nالكتب المتاحة:\n${templatesList}\n\nاختر الكتاب الذي تريد إنشاءه:`
      );
      setStep('template');
    }, 500);
  };

  // اختيار القالب
  const handleTemplateSelect = (templateId: string) => {
    const template = DOCUMENT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    addUserMessage(template.name);
    setSelectedTemplate(template);
    setCurrentQuestionIndex(0);
    setAnswers({});
    
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addBotMessage(
        `رائع! سأساعدك في إنشاء "${template.name}".\n\nسأطرح عليك بعض الأسئلة لجمع المعلومات المطلوبة. 📝`
      );
      
      setTimeout(() => {
        askQuestion(template.questions[0]);
        setStep('questions');
      }, 800);
    }, 500);
  };

  // طرح سؤال
  const askQuestion = (question: Question) => {
    const questionText = question.required 
      ? `${question.question} *` 
      : question.question;
    
    addBotMessage(
      questionText,
      question.type === 'select' ? question.options : undefined,
      question.id
    );
  };

  // الإجابة على السؤال
  const handleAnswer = (answer: string) => {
    if (!selectedTemplate) return;
    
    const currentQuestion = selectedTemplate.questions[currentQuestionIndex];
    addUserMessage(answer);
    
    // حفظ الإجابة
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));

    // الانتقال للسؤال التالي أو التوليد
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < selectedTemplate.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        askQuestion(selectedTemplate.questions[nextIndex]);
      }, 500);
    } else {
      // كل الأسئلة انتهت، نبدأ التوليد
      generateDocument();
    }
  };

  // إرسال الرسالة
  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    if (step === 'questions') {
      handleAnswer(inputValue.trim());
    }
    
    setInputValue('');
  };

  // توليد الكتاب
  const generateDocument = async () => {
    if (!selectedTemplate) return;
    
    setStep('generating');
    setIsGenerating(true);
    
    addBotMessage('جاري إنشاء الكتاب... ⏳\n\nيرجى الانتظار قليلاً بينما أقوم بصياغة الكتاب لك.');
    
    try {
      const result = await generateOfficialDocument(selectedTemplate, answers);
      
      if (result.success) {
        setGeneratedDocument(result.content);
        setStep('preview');
        addBotMessage('✅ تم إنشاء الكتاب بنجاح!\n\nاستخدم الأزرار أدناه لطباعة الكتاب أو إنشاء كتاب جديد.');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء إنشاء الكتاب',
        variant: 'destructive',
      });
      addBotMessage('❌ حدث خطأ أثناء إنشاء الكتاب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsGenerating(false);
    }
  };

  // نسخ الكتاب
  const handleCopy = () => {
    if (generatedDocument) {
      const textContent = generatedDocument.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ الكتاب إلى الحافظة',
      });
    }
  };

  // فتح الكتاب في نافذة جديدة للطباعة
  const handlePrint = () => {
    if (generatedDocument) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(generatedDocument);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }
  };

  // فتح الكتاب في نافذة جديدة للعرض
  const handleView = () => {
    if (generatedDocument) {
      const viewWindow = window.open('', '_blank');
      if (viewWindow) {
        viewWindow.document.write(generatedDocument);
        viewWindow.document.close();
      }
    }
  };

  // إعادة البدء
  const handleRestart = () => {
    setMessages([]);
    setStep('welcome');
    setSelectedCategory(null);
    setSelectedTemplate(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setGeneratedDocument(null);
  };

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(99, 102, 241, 0.15) 2px, transparent 0)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-lg opacity-50" />
              <div className="relative p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl">
                <Bot className="h-10 w-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                مساعد الكتب الرسمية
              </h1>
              <p className="text-indigo-300 mt-1">
                إنشاء الكتب الرسمية باستخدام الذكاء الاصطناعي
              </p>
            </div>
            {step !== 'welcome' && step !== 'category' && (
              <Button
                onClick={handleRestart}
                variant="ghost"
                className="mr-auto text-gray-400 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                بداية جديدة
              </Button>
            )}
          </div>
        </motion.div>

        {/* Progress Bar */}
        {selectedTemplate && step === 'questions' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400 font-medium">
                {selectedTemplate.name}
              </span>
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                السؤال {currentQuestionIndex + 1} من {selectedTemplate.questions.length}
              </Badge>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / selectedTemplate.questions.length) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
              />
            </div>
          </motion.div>
        )}

        {/* Main Chat Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className={cn(
                    'flex',
                    message.type === 'user' ? 'justify-start' : 'justify-end'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-5 py-4',
                      message.type === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-md'
                        : 'bg-gray-800/80 text-gray-100 rounded-bl-md border border-gray-700/50'
                    )}
                  >
                    {message.type === 'bot' && (
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700/50">
                        <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                        </div>
                        <span className="text-xs font-semibold text-indigo-400">المساعد الذكي</span>
                      </div>
                    )}
                    <p className="whitespace-pre-line text-[15px] leading-relaxed">{message.content}</p>
                    
                    {/* Options buttons */}
                    {message.options && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {message.options.map((option, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            onClick={() => handleAnswer(option)}
                            className="bg-gray-700/50 border-gray-600 text-gray-200 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white transition-all"
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl rounded-bl-md px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-2 h-2 bg-indigo-400 rounded-full"
                          animate={{ y: [0, -6, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">يكتب...</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Generating Spinner */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center py-8"
              >
                <div className="flex flex-col items-center gap-4 p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-30 animate-pulse" />
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-400 relative" />
                  </div>
                  <div className="text-center">
                    <p className="text-gray-200 font-medium">جاري إنشاء الكتاب...</p>
                    <p className="text-xs text-gray-500 mt-1">يتم الآن صياغة الكتاب باستخدام الذكاء الاصطناعي</p>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Category Selection */}
          {step === 'category' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-gray-800/30 border-t border-gray-800"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {DOCUMENT_CATEGORIES.map((category) => {
                  const Icon = categoryIcons[category.id] || FileText;
                  return (
                    <motion.button
                      key={category.id}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleCategorySelect(category.id)}
                      className="group relative p-5 bg-gray-800/50 hover:bg-gradient-to-br hover:from-indigo-600/20 hover:to-purple-600/20 border border-gray-700/50 hover:border-indigo-500/50 rounded-2xl transition-all duration-300"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
                          {category.icon}
                        </span>
                        <span className="font-medium text-gray-200 group-hover:text-white">
                          {category.name}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Template Selection */}
          {step === 'template' && selectedCategory && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-gray-800/30 border-t border-gray-800"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DOCUMENT_TEMPLATES
                  .filter(t => t.category === selectedCategory)
                  .map((template, index) => (
                    <motion.button
                      key={template.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.01, x: 5 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleTemplateSelect(template.id)}
                      className="group flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gradient-to-r hover:from-indigo-600/10 hover:to-transparent border border-gray-700/50 hover:border-indigo-500/50 rounded-xl text-right transition-all duration-300"
                    >
                      <div className="p-2.5 bg-indigo-500/10 group-hover:bg-indigo-500/20 rounded-xl transition-colors">
                        <FileText className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-gray-200 group-hover:text-white block">
                          {template.name}
                        </span>
                        <span className="text-xs text-gray-500 group-hover:text-gray-400">
                          {template.description}
                        </span>
                      </div>
                      <ChevronLeft className="h-5 w-5 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                    </motion.button>
                  ))}
              </div>
            </motion.div>
          )}

          {/* Input Area */}
          {step === 'questions' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-gray-800/30 border-t border-gray-800"
            >
              <div className="flex gap-3">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="اكتب إجابتك هنا..."
                  className="flex-1 bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl h-12"
                />
                <Button 
                  onClick={handleSend} 
                  disabled={!inputValue.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-12 px-5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Actions after generation */}
          {step === 'preview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-gray-800/30 border-t border-gray-800"
            >
              <div className="flex flex-wrap gap-3 justify-center">
                <Button 
                  onClick={handleView}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 px-6"
                >
                  <Eye className="h-4 w-4 ml-2" />
                  عرض الكتاب
                </Button>
                <Button 
                  onClick={handlePrint}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11 px-6"
                >
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة
                </Button>
                <Button 
                  onClick={handleCopy} 
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white rounded-xl h-11 px-6"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 ml-2 text-green-400" /> : <Copy className="h-4 w-4 ml-2" />}
                  {copied ? 'تم النسخ' : 'نسخ النص'}
                </Button>
                <Button 
                  onClick={handleRestart} 
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white rounded-xl h-11 px-6"
                >
                  <RefreshCw className="h-4 w-4 ml-2" />
                  كتاب جديد
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-gray-600 text-sm">
            مدعوم بالذكاء الاصطناعي • شركة العراف لتأجير السيارات
          </p>
        </motion.div>
      </div>
    </div>
  );
}
